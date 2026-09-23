package com.jjcgaming.payments.service;

import com.jjcgaming.payments.exception.PaymentException;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.*;

@Service
public class PaymentService {
    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);
    private final JdbcTemplate db;
    private final StoreService store;
    private final TransactionTemplate tx;
    private final PayPalGateway paypal;
    private final CaptureVerifier verifier;
    private final ObjectMapper json;
    public PaymentService(StoreService store, JdbcTemplate db, TransactionTemplate tx, PayPalGateway paypal, CaptureVerifier verifier, ObjectMapper json) {
        this.store = store; this.db = db; this.tx = tx; this.paypal = paypal; this.verifier = verifier; this.json = json;
    }
    public Object create(String subject) {
        long user = store.customer(subject);
        // This transaction commits request IDs and the immutable snapshot BEFORE any remote operation.
        UUID id = tx.execute(s -> prepare(user));
        return tx.execute(s -> {
            var checkout = lock(id); assertOwner(checkout, user);
            if ("REVIEW".equals(checkout.get("status"))) throw review();
            if (checkout.get("paypal_order_id") == null) {
                var order = order(checkout);
                var remote = paypal.create(checkout.get("create_request_id").toString(), order.get("numero_orden").toString(), decimal(order, "total"));
                String paypalId = PayPalGateway.checkedId(remote.path("id").asText());
                db.update("update public.paypal_checkouts set paypal_order_id=?,status='READY' where id=?", paypalId, id);
                db.update("update public.pagos set paypal_order_id=? where id=?", paypalId, checkout.get("id_pago"));
                log.info("PayPal order created local={} paypal={}", order.get("numero_orden"), paypalId);
                checkout.put("paypal_order_id", paypalId);
            }
            return publicOrder(checkout);
        });
    }
    public Object current(String subject) {
        long user=store.customer(subject);
        var rows=db.queryForList("select * from public.paypal_checkouts where id_usuario=? and status in ('READY','CAPTURING','REVIEW') order by created_at desc limit 1",user);
        if(rows.isEmpty()) return null;
        return publicOrder(rows.getFirst());
    }
    private UUID prepare(long user) {
        store.lockCustomer(user);
        db.update("update public.paypal_checkouts set status='EXPIRED' where id_usuario=? and status in ('NEW','READY') and expires_at<now()", user);
        var existing = db.queryForList("select id from public.paypal_checkouts where id_usuario=? and status in ('NEW','READY','CAPTURING','REVIEW')", user);
        if (!existing.isEmpty()) return (UUID)existing.getFirst().get("id");
        long cart = store.cartId(user);
        var lines = db.queryForList("""
            select d.id as cart_line_id,d.id_videojuego,d.cantidad,v.nombre,v.precio,v.stock,v.activo,c.activo as categoria_activa
            from public.carrito_detalle d join public.videojuegos v on v.id=d.id_videojuego
            join public.categorias c on c.id=v.id_categoria
            where d.id_carrito=? order by v.id for update of v,d
            """, cart);
        if (lines.isEmpty()) throw new PaymentException(409, "EMPTY_CART", "El carrito está vacío.");
        BigDecimal subtotal = BigDecimal.ZERO;
        for (var line : lines) {
            int qty = ((Number)line.get("cantidad")).intValue();
            if (qty <= 0 || qty > 100 || !Boolean.TRUE.equals(line.get("activo")) || !Boolean.TRUE.equals(line.get("categoria_activa")))
                throw new PaymentException(409, "UNAVAILABLE_GAME", "Un videojuego ya no está disponible.");
            Long reserved = db.queryForObject("""
                select coalesce(sum(i.cantidad),0) from public.paypal_checkout_items i
                join public.paypal_checkouts p on p.id=i.checkout_id where i.id_videojuego=?
                and (p.status in ('CAPTURING','REVIEW') or (p.status in ('NEW','READY') and p.expires_at>now()))
                """, Long.class, line.get("id_videojuego"));
            if (((Number)line.get("stock")).longValue() - reserved < qty) throw outOfStock();
            if (decimal(line,"precio").signum() < 0) throw review();
            subtotal = subtotal.add(Money.usd(decimal(line,"precio")).multiply(BigDecimal.valueOf(qty)));
        }
        subtotal = Money.usd(subtotal);
        BigDecimal tax = Money.tax(subtotal), total = subtotal.add(tax);
        if (total.signum() <= 0) throw new PaymentException(409,"INVALID_TOTAL","El total debe ser mayor que cero.");
        UUID id = UUID.randomUUID(); String number = "JJC-" + id;
        Long orderId = db.queryForObject("""
            insert into public.ordenes(id_usuario,numero_orden,subtotal,iva,total,estado)
            values (?,?,?,?,?,'PENDIENTE') returning id
            """, Long.class, user, number, subtotal, tax, total);
        Long paymentId = db.queryForObject("""
            insert into public.pagos(id_orden,referencia,proveedor,metodo_pago,monto,estado)
            values (?,?,'PAYPAL','PAYPAL',?,'PENDIENTE') returning id
            """, Long.class, orderId, number, total);
        db.update("""
            insert into public.paypal_checkouts(id,id_usuario,id_orden,id_pago,create_request_id,capture_request_id,status,expires_at)
            values (?,?,?,?,?,?,'NEW',now()+interval '3 hours')
            """, id, user, orderId, paymentId, UUID.randomUUID(), UUID.randomUUID());
        for (var line : lines) {
            BigDecimal price = Money.usd(decimal(line,"precio"));
            db.update("insert into public.orden_detalle(id_orden,id_videojuego,nombre_videojuego,cantidad,precio_unitario,subtotal) values (?,?,?,?,?,?)",
                orderId,line.get("id_videojuego"),line.get("nombre"),line.get("cantidad"),price,price.multiply(new BigDecimal(line.get("cantidad").toString())));
            db.update("insert into public.paypal_checkout_items(checkout_id,id_videojuego,cart_line_id,cantidad) values (?,?,?,?)",
                id,line.get("id_videojuego"),line.get("cart_line_id"),line.get("cantidad"));
        }
        log.info("Local order prepared order={}", number);
        return id;
    }
    public Object capture(String subject, String paypalId) {
        long user = store.customer(subject);
        UUID id = find(paypalId);
        // Persist CAPTURING before the external request. Reservations do not expire in this state.
        tx.executeWithoutResult(s -> {
            store.lockCustomer(user);
            var c = lock(id); assertOwner(c,user);
            if ("PAID".equals(c.get("status"))) return;
            if ("REVIEW".equals(c.get("status"))) throw review();
            if (!Set.of("READY","CAPTURING").contains(c.get("status"))) throw new PaymentException(409,"ORDER_CLOSED","Esta orden no se puede capturar.");
            if ("READY".equals(c.get("status")) && ((java.sql.Timestamp)c.get("expires_at")).toInstant().isBefore(Instant.now()))
                throw new PaymentException(409,"ORDER_EXPIRED","La orden expiró. Regresa al checkout para crear otra.");
            lockStock(c);
            db.update("update public.paypal_checkouts set status='CAPTURING' where id=?", id);
            db.update("update public.pagos set estado='PROCESANDO' where id=? and estado='PENDIENTE'",c.get("id_pago"));
        });
        return settle(id, user, true);
    }
    public void reconcile(String paypalId) {
        UUID id = find(paypalId);
        settle(id, null, false);
    }
    private Object settle(UUID id, Long owner, boolean allowCapture) {
        try {
            return tx.execute(s -> {
                // Same lock ordering as cart/create; row lock also serializes duplicate webhooks/captures.
                long user = db.queryForObject("select id_usuario from public.paypal_checkouts where id=?", Long.class,id);
                store.lockCustomer(user);
                var c = lock(id); if (owner != null) assertOwner(c,owner);
                if ("PAID".equals(c.get("status"))) return publicOrder(c);
                if ("REVIEW".equals(c.get("status"))) throw review();
                String paypalId = c.get("paypal_order_id").toString();
                var remote = paypal.get(paypalId);
                if (allowCapture && "APPROVED".equals(remote.path("status").asText())) {
                    lockStock(c);
                    log.info("Capture started paypal={}",paypalId);
                    // The request ID was committed before entering this transaction, and never changes on retry.
                    paypal.capture(paypalId,c.get("capture_request_id").toString());
                    remote = paypal.get(paypalId);
                }
                String captureState = remote.path("purchase_units").path(0).path("payments").path("captures").path(0).path("status").asText();
                if ("DECLINED".equals(captureState) || "DENIED".equals(captureState)) {
                    db.update("update public.pagos set estado='RECHAZADO' where id=?",c.get("id_pago"));
                    db.update("update public.paypal_checkouts set status='DECLINED' where id=?",id);
                    return Map.of("status","RECHAZADO","message","PayPal rechazó el pago.");
                }
                if (!"COMPLETED".equals(remote.path("status").asText()) || "PENDING".equals(captureState)) {
                    return Map.of("status","PROCESANDO","message","El pago todavía no está confirmado. Reintenta la consulta de esta orden.");
                }
                var order = order(c);
                if (!"CAPTURING".equals(c.get("status"))) throw review();
                var verified = verifier.verify(remote,paypalId,order.get("numero_orden").toString(),decimal(order,"total"));
                lockStock(c);
                fulfill(c,verified);
                log.info("Capture completed paypal={} capture={}",paypalId,verified.id());
                c.put("status","PAID");
                return publicOrder(c);
            });
        } catch (PaymentException e) {
            if("PAYMENT_DECLINED".equals(e.code)) {
                return tx.execute(s -> {
                    var c=lock(id);
                    if("PAID".equals(c.get("status"))) return publicOrder(c);
                    db.update("update public.pagos set estado='RECHAZADO' where id=?",c.get("id_pago"));
                    db.update("update public.paypal_checkouts set status='DECLINED' where id=?",id);
                    return Map.of("status","RECHAZADO","message",e.getMessage());
                });
            }
            if (Set.of("PAYMENT_REVIEW","OUT_OF_STOCK").contains(e.code)) {
                tx.executeWithoutResult(s -> {
                    var c = lock(id);
                    if (!"PAID".equals(c.get("status"))) {
                        db.update("update public.paypal_checkouts set status='REVIEW',review_reason=? where id=?",e.code,id);
                        log.error("Payment requires review checkout={} reason={}", id,e.code);
                    }
                });
            }
            throw e;
        }
    }
    private void lockStock(Map<String,Object> c) {
        var rows = db.queryForList("""
            select v.id,v.stock,i.cantidad from public.paypal_checkout_items i
            join public.videojuegos v on v.id=i.id_videojuego where i.checkout_id=? order by v.id for update of v
            """,c.get("id"));
        if (rows.isEmpty()) throw review();
        for (var row : rows) if (((Number)row.get("stock")).intValue()<((Number)row.get("cantidad")).intValue()) throw outOfStock();
    }
    private void fulfill(Map<String,Object> c, CaptureVerifier.VerifiedCapture capture) {
        var order = order(c);
        if (!"PENDIENTE".equals(order.get("estado"))) throw review();
        var lines = db.queryForList("select * from public.paypal_checkout_items where checkout_id=? order by id_videojuego",c.get("id"));
        for (var line : lines) {
            if (db.update("update public.videojuegos set stock=stock-? where id=? and stock>=?",line.get("cantidad"),line.get("id_videojuego"),line.get("cantidad")) != 1) throw outOfStock();
            db.update("""
                insert into public.biblioteca(id_usuario,id_videojuego,id_orden)
                select ?,?,? where not exists(select 1 from public.biblioteca where id_usuario=? and id_videojuego=?)
                """,c.get("id_usuario"),line.get("id_videojuego"),c.get("id_orden"),c.get("id_usuario"),line.get("id_videojuego"));
            // Match snapshot row identity. A removed/re-added product has a new row ID and is preserved.
            db.update("delete from public.carrito_detalle where id=? and cantidad<=?",line.get("cart_line_id"),line.get("cantidad"));
            db.update("update public.carrito_detalle set cantidad=cantidad-? where id=? and cantidad>?",
                line.get("cantidad"),line.get("cart_line_id"),line.get("cantidad"));
        }
        db.update("update public.ordenes set estado='PAGADA' where id=?",c.get("id_orden"));
        // The migration excludes PAYPAL from the old fulfillment trigger. Java is the only fulfillment writer.
        db.update("""
            update public.pagos set estado='PAGADO',fecha_confirmacion=now(),paypal_capture_id=?,respuesta_proveedor=?::jsonb where id=?
            """,capture.id(),json.writeValueAsString(Map.of("status","COMPLETED","order_id",c.get("paypal_order_id"),
                "capture_id",capture.id(),"amount",capture.amount().toPlainString(),"currency","USD")),c.get("id_pago"));
        db.update("update public.paypal_checkouts set status='PAID' where id=?",c.get("id"));
    }
    private UUID find(String paypalId) {
        PayPalGateway.checkedId(paypalId);
        var ids = db.queryForList("select id from public.paypal_checkouts where paypal_order_id=?",UUID.class,paypalId);
        if (ids.isEmpty()) throw new PaymentException(404,"NOT_FOUND","Orden no encontrada.");
        return ids.getFirst();
    }
    private Map<String,Object> lock(UUID id) { return db.queryForMap("select * from public.paypal_checkouts where id=? for update",id); }
    private Map<String,Object> order(Map<String,Object> c) { return db.queryForMap("select * from public.ordenes where id=?",c.get("id_orden")); }
    static void assertOwner(Map<String,Object> c,long user) {
        if (((Number)c.get("id_usuario")).longValue()!=user) throw new PaymentException(403,"NOT_OWNER","Esta orden pertenece a otro cliente.");
    }
    private Map<String,Object> publicOrder(Map<String,Object> c) {
        var o=order(c);
        var subject=db.queryForObject("select auth_id::text from public.usuarios where id=?",String.class,c.get("id_usuario"));
        var purchase=store.purchase(subject,o.get("numero_orden").toString());
        return Map.of("paypalOrderId",c.get("paypal_order_id"),"numeroOrden",o.get("numero_orden"),
            "subtotal",o.get("subtotal"),"iva",o.get("iva"),"total",o.get("total"),"status",o.get("estado"),
            "processing",Set.of("CAPTURING","REVIEW").contains(c.get("status")),"productos",purchase.get("productos"));
    }
    private static BigDecimal decimal(Map<String,Object> r,String key) { return new BigDecimal(r.get(key).toString()); }
    private PaymentException outOfStock() { return new PaymentException(409,"OUT_OF_STOCK","Stock insuficiente. Si aprobaste un pago, consulta su estado antes de volver a pagar."); }
    private PaymentException review() { return new PaymentException(409,"PAYMENT_REVIEW","La orden requiere revisión. No vuelvas a pagar."); }
}
