package com.jjcgaming.payments.service;

import com.jjcgaming.payments.dto.CartLine;
import com.jjcgaming.payments.exception.PaymentException;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StoreService {
    private final JdbcTemplate db;
    public StoreService(JdbcTemplate db) { this.db = db; }
    public long customer(String subject) {
        var rows = db.queryForList("select id, id_rol, activo from public.usuarios where auth_id = ?::uuid", subject);
        if (rows.size() != 1 || !Boolean.TRUE.equals(rows.getFirst().get("activo"))
            || ((Number) rows.getFirst().get("id_rol")).intValue() != 2)
            throw new PaymentException(403, "CLIENT_REQUIRED", "Se requiere una cuenta CLIENTE activa.");
        return ((Number) rows.getFirst().get("id")).longValue();
    }
    public void lockCustomer(long user) { db.queryForList("select id from public.usuarios where id=? for update", user); }
    public long cartId(long user) {
        var ids = db.queryForList("select id from public.carritos where id_usuario=? order by id", Long.class, user);
        if (ids.size() > 1) throw new PaymentException(409, "CART_REVIEW", "Tu carrito requiere revisión.");
        return ids.isEmpty() ? db.queryForObject("insert into public.carritos(id_usuario) values (?) returning id", Long.class, user) : ids.getFirst();
    }
    @Transactional public List<Map<String,Object>> cart(String subject) {
        long user = customer(subject); lockCustomer(user);
        return cartRows(cartId(user));
    }
    public List<Map<String,Object>> cartRows(long cart) {
        return db.queryForList("""
            select d.id as cart_line_id, d.cantidad, v.*, c.nombre as categoria
            from public.carrito_detalle d join public.videojuegos v on v.id=d.id_videojuego
            left join public.categorias c on c.id=v.id_categoria where d.id_carrito=? order by v.id
            """, cart).stream().map(r -> Map.<String,Object>of("game", game(r), "cantidad", r.get("cantidad"))).toList();
    }
    @Transactional public List<Map<String,Object>> changeCart(String subject, CartLine line) {
        long user = customer(subject); lockCustomer(user); long cart = cartId(user);
        if (line.quantity() == 0) {
            db.update("delete from public.carrito_detalle where id_carrito=? and id_videojuego=?", cart, line.gameId());
        } else {
            var games = db.queryForList("select stock,activo from public.videojuegos where id=?", line.gameId());
            if (games.isEmpty() || !Boolean.TRUE.equals(games.getFirst().get("activo"))
                || ((Number) games.getFirst().get("stock")).intValue() < line.quantity())
                throw new PaymentException(409, "OUT_OF_STOCK", "El videojuego no tiene stock suficiente.");
            int changed = db.update("update public.carrito_detalle set cantidad=? where id_carrito=? and id_videojuego=?",
                line.quantity(), cart, line.gameId());
            if (changed == 0) db.update("insert into public.carrito_detalle(id_carrito,id_videojuego,cantidad) values (?,?,?)",
                cart, line.gameId(), line.quantity());
        }
        return cartRows(cart);
    }
    @Transactional public void clearCart(String subject) {
        long user = customer(subject); lockCustomer(user);
        db.update("delete from public.carrito_detalle where id_carrito=?", cartId(user));
    }
    @Transactional public List<Map<String,Object>> importCart(String subject, List<CartLine> items) {
        long user=customer(subject); lockCustomer(user); long cart=cartId(user);
        int first=db.update("insert into public.paypal_cart_imports(id_usuario) values (?) on conflict do nothing",user);
        if (first==1 && cartRows(cart).isEmpty()) {
            for (var line:items) if(line.quantity()>0) changeCart(subject,line);
        }
        return cartRows(cart);
    }
    public List<Map<String,Object>> purchases(String subject) {
        long user = customer(subject);
        return db.queryForList("select * from public.ordenes where id_usuario=? order by fecha desc limit 200", user)
            .stream().map(o -> purchase(o, subject)).toList();
    }
    public Map<String,Object> purchase(String subject, String number) {
        long user = customer(subject);
        var rows = db.queryForList("select * from public.ordenes where numero_orden=? and id_usuario=?", number, user);
        if (rows.isEmpty()) throw new PaymentException(404, "NOT_FOUND", "No se encontró la compra.");
        return purchase(rows.getFirst(), subject);
    }
    private Map<String,Object> purchase(Map<String,Object> o, String subject) {
        var out = new LinkedHashMap<String,Object>();
        out.put("id", o.get("numero_orden")); out.put("fecha", o.get("fecha").toString()); out.put("usuarioId", subject);
        for (String name : List.of("subtotal", "iva", "total")) out.put(name, o.get(name));
        out.put("estado", o.get("estado"));
        var payments = db.queryForList("select metodo_pago,estado from public.pagos where id_orden=? order by id desc", o.get("id"));
        out.put("metodoPago", payments.isEmpty() ? "" : payments.getFirst().get("metodo_pago"));
        out.put("estadoPago", payments.isEmpty() ? "PENDIENTE" : payments.getFirst().get("estado"));
        var paypalIds=db.queryForList("select paypal_order_id from public.pagos where id_orden=? and proveedor='PAYPAL' order by id desc",o.get("id"));
        out.put("paypalOrderId",paypalIds.isEmpty()?null:paypalIds.getFirst().get("paypal_order_id"));
        out.put("cliente", db.queryForMap("select nombre,apellido,correo,telefono from public.usuarios where id=?", o.get("id_usuario")));
        out.put("productos", db.queryForList("""
            select v.*, c.nombre as categoria, d.cantidad, d.precio_unitario,d.nombre_videojuego as nombre_compra
            from public.orden_detalle d join public.videojuegos v on v.id=d.id_videojuego
            left join public.categorias c on c.id=v.id_categoria where d.id_orden=? order by d.id
            """, o.get("id")).stream().map(r -> {
                var g = game(r); g.put("precio", r.get("precio_unitario"));
                g.put("titulo",r.get("nombre_compra"));
                return Map.of("game", g, "cantidad", r.get("cantidad"));
            }).toList());
        return out;
    }
    public List<Map<String,Object>> library(String subject) {
        long user = customer(subject);
        return db.queryForList("""
            select distinct v.*, c.nombre as categoria from public.biblioteca b
            join public.videojuegos v on v.id=b.id_videojuego
            left join public.categorias c on c.id=v.id_categoria
            join public.ordenes o on o.id=b.id_orden
            where b.id_usuario=? and o.id_usuario=? and o.estado='PAGADA'
            order by v.id
            """, user, user).stream().map(this::game).toList();
    }
    private Map<String,Object> game(Map<String,Object> r) {
        var g = new LinkedHashMap<String,Object>();
        g.put("id", r.get("id")); g.put("titulo", r.get("nombre")); g.put("precio", r.get("precio"));
        g.put("stock", r.get("stock")); g.put("descripcion", r.get("descripcion"));
        g.put("imagen", r.get("imagen_url") == null ? "/images/game-placeholder.svg" : r.get("imagen_url"));
        g.put("categoria", r.get("categoria")); g.put("plataforma", r.get("plataforma"));
        return g;
    }
}
