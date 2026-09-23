package com.jjcgaming.payments.service;

import com.jjcgaming.payments.dto.CartLine;
import com.jjcgaming.payments.exception.PaymentException;
import java.math.BigDecimal;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.support.JdbcTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Runs against disposable PostgreSQL, not H2 and never the user's Supabase database. */
@EnabledIfEnvironmentVariable(named="JJC_TEST_DATABASE_URL",matches="jdbc:postgresql://127\\.0\\.0\\.1:55432/jjc_payments_test")
class PaymentDatabaseTest {
    static final String A="00000000-0000-0000-0000-000000000001",B="00000000-0000-0000-0000-000000000002";
    JdbcTemplate db; StoreService store; PaymentService payments; PayPalGateway gateway;
    String number;
    @BeforeEach void setup() throws Exception {
        var source=new DriverManagerDataSource(System.getenv("JJC_TEST_DATABASE_URL"),"postgres","");
        db=new JdbcTemplate(source);
        // The environment condition intentionally restricts destructive fixtures to one loopback test database.
        db.execute(Files.readString(Path.of("src/test/resources/payment-fixture.sql")));
        db.execute(Files.readString(Path.of("../paypal-migration.sql")));
        store=new StoreService(db); gateway=mock(PayPalGateway.class);
        payments=new PaymentService(store,db,new TransactionTemplate(new JdbcTransactionManager(source)),gateway,new CaptureVerifier(),JsonMapper.builder().build());
        db.update("insert into usuarios(id,auth_id,id_rol,activo,nombre,apellido,correo) values (1,?::uuid,2,true,'A','A','a@example.test'),(2,?::uuid,2,true,'B','B','b@example.test')",A,B);
        db.update("insert into categorias values(1,'Games',true)");
        db.update("insert into videojuegos(id,nombre,precio,stock,activo,id_categoria) values (1,'Game',59.99,5,true,1),(2,'Other',5,10,true,1)");
        store.changeCart(A,new CartLine(1,1));
        when(gateway.create(anyString(),anyString(),any())).thenAnswer(inv -> {
            number=inv.getArgument(1); assertEquals(new BigDecimal("68.99"),inv.getArgument(2));
            return JsonMapper.builder().build().readTree("{\"id\":\"PAYPALORDER123\",\"status\":\"CREATED\"}");
        });
    }
    Map<?,?> create() { return (Map<?,?>)payments.create(A); }
    void completed() {
        when(gateway.get("PAYPALORDER123")).thenReturn(JsonMapper.builder().build().readTree(
            MoneyAndCaptureTest.response("COMPLETED","USD","68.99",number)));
    }
    long count(String table) { return db.queryForObject("select count(*) from "+table,Long.class); }
    int stock() { return db.queryForObject("select stock from videojuegos where id=1",Integer.class); }
    @Test void createIsIdempotentAndUsesDatabasePrices() {
        var first=create(); var second=create();
        assertEquals(first.get("paypalOrderId"),second.get("paypalOrderId"));
        assertEquals(new BigDecimal("68.99"),first.get("total"));
        assertEquals(1,count("ordenes")); assertEquals(1,count("pagos"));
        assertEquals(5,stock()); assertEquals(0,count("biblioteca"));
        verify(gateway,times(1)).create(anyString(),anyString(),any());
    }
    @Test void doubleCaptureFulfillsOnlyOnceAndPreservesNewCartItems() {
        create(); completed();
        store.changeCart(A,new CartLine(1,2)); store.changeCart(A,new CartLine(2,1));
        payments.capture(A,"PAYPALORDER123"); payments.capture(A,"PAYPALORDER123");
        assertEquals(4,stock()); assertEquals(1,count("biblioteca")); assertEquals(2,count("carrito_detalle"));
        assertEquals(1,db.queryForObject("select cantidad from carrito_detalle where id_videojuego=1",Integer.class));
        assertEquals("PAGADA",db.queryForObject("select estado from ordenes",String.class));
        assertEquals("PAGADO",db.queryForObject("select estado from pagos",String.class));
        assertEquals(3,count("auditoria_pagos"));
        verify(gateway,times(1)).get("PAYPALORDER123");
    }
    @Test void forbiddenOwnershipDoesNotContactPayPal() {
        create(); clearInvocations(gateway);
        var error=assertThrows(PaymentException.class,()->payments.capture(B,"PAYPALORDER123"));
        assertEquals(403,error.status); verifyNoInteractions(gateway); assertEquals(5,stock());
    }
    @Test void mismatchedAmountRequiresReviewAndDoesNotFulfill() {
        create(); when(gateway.get(anyString())).thenReturn(JsonMapper.builder().build().readTree(MoneyAndCaptureTest.response("COMPLETED","USD","1.00",number)));
        assertThrows(PaymentException.class,()->payments.capture(A,"PAYPALORDER123"));
        assertEquals(5,stock()); assertEquals(0,count("biblioteca"));
        assertEquals("REVIEW",db.queryForObject("select status from paypal_checkouts",String.class));
        assertEquals("PENDIENTE",db.queryForObject("select estado from ordenes",String.class));
    }
    @Test void reservationPreventsSellingLastUnitTwice() throws Exception {
        db.update("update videojuegos set stock=1 where id=1");
        store.changeCart(B,new CartLine(1,1));
        var barrier=new CountDownLatch(1);
        try(var executor=Executors.newVirtualThreadPerTaskExecutor()) {
            var futures=List.of(A,B).stream().map(user->executor.submit(()->{
                barrier.await(); try{payments.create(user);return true;}catch(PaymentException e){assertEquals("OUT_OF_STOCK",e.code);return false;}
            })).toList(); barrier.countDown();
            assertNotEquals(futures.get(0).get(10,TimeUnit.SECONDS),futures.get(1).get(10,TimeUnit.SECONDS));
        }
        assertEquals(1,count("ordenes")); assertEquals(1,stock());
    }
    @Test void transientCaptureFailureReusesCommittedRequestId() {
        create();
        var approved=JsonMapper.builder().build().readTree("{\"status\":\"APPROVED\"}");
        when(gateway.get(anyString())).thenReturn(approved);
        when(gateway.capture(anyString(),anyString())).thenThrow(new PaymentException(502,"PAYPAL_UNAVAILABLE","network"));
        assertThrows(PaymentException.class,()->payments.capture(A,"PAYPALORDER123"));
        assertEquals("CAPTURING",db.queryForObject("select status from paypal_checkouts",String.class));
        assertEquals(5,stock());
        assertThrows(PaymentException.class,()->payments.capture(A,"PAYPALORDER123"));
        var captor=org.mockito.ArgumentCaptor.forClass(String.class);
        verify(gateway,times(2)).capture(eq("PAYPALORDER123"),captor.capture());
        assertEquals(captor.getAllValues().get(0),captor.getAllValues().get(1));
    }
    @Test void fulfillmentRollsBackAllWritesOnDatabaseFailure() {
        create(); completed(); db.execute("alter table biblioteca add constraint reject_fixture check(false)");
        assertThrows(Exception.class,()->payments.capture(A,"PAYPALORDER123"));
        assertEquals(5,stock()); assertEquals(0,count("biblioteca")); assertEquals(1,count("carrito_detalle"));
        assertEquals("PENDIENTE",db.queryForObject("select estado from ordenes",String.class));
    }
    @Test void removedAndReaddedCartLineIsPreserved() {
        create(); completed(); store.changeCart(A,new CartLine(1,0)); store.changeCart(A,new CartLine(1,1));
        payments.capture(A,"PAYPALORDER123"); assertEquals(1,count("carrito_detalle"));
    }
    @Test void concurrentCapturesAndWebhookStillFulfillOnce() throws Exception {
        create(); completed();
        try(var executor=Executors.newVirtualThreadPerTaskExecutor()) {
            var first=executor.submit(()->payments.capture(A,"PAYPALORDER123"));
            var second=executor.submit(()->payments.capture(A,"PAYPALORDER123"));
            first.get(10,TimeUnit.SECONDS);second.get(10,TimeUnit.SECONDS);
        }
        payments.reconcile("PAYPALORDER123");
        assertEquals(4,stock());assertEquals(1,count("biblioteca"));assertEquals(0,count("carrito_detalle"));
    }
    @Test void stockChangedAfterCheckoutPreventsCapture() {
        create();clearInvocations(gateway);db.update("update videojuegos set stock=0 where id=1");
        assertEquals("OUT_OF_STOCK",assertThrows(PaymentException.class,()->payments.capture(A,"PAYPALORDER123")).code);
        verifyNoInteractions(gateway);assertEquals(0,count("biblioteca"));
    }
    @Test void rejectedCaptureDoesNotFulfillAndReleasesReservation() {
        create();when(gateway.get(anyString())).thenReturn(JsonMapper.builder().build().readTree("{\"status\":\"APPROVED\"}"));
        when(gateway.capture(anyString(),anyString())).thenThrow(new PaymentException(409,"PAYMENT_DECLINED","declined"));
        assertEquals("RECHAZADO",((Map<?,?>)payments.capture(A,"PAYPALORDER123")).get("status"));
        assertEquals(5,stock());assertEquals(0,count("biblioteca"));
        assertEquals("DECLINED",db.queryForObject("select status from paypal_checkouts",String.class));
    }
    @Test void migrationCanBeAppliedTwiceWithoutChangingHistoricalData() throws Exception {
        create();db.execute(Files.readString(Path.of("../paypal-migration.sql")));
        assertEquals(1,count("ordenes")); assertEquals(1,count("pagos"));
    }
    @Test void migrationRejectsUnknownFulfillmentTriggers() {
        db.execute("create function unexpected() returns trigger language plpgsql as $$begin return NEW; end$$");
        db.execute("create trigger unexpected before update on ordenes for each row execute function unexpected()");
        assertThrows(Exception.class,()->db.execute(Files.readString(Path.of("../paypal-migration.sql"))));
    }
    @Test void securityDefinerCannotBypassPaymentWriteGuard() throws Exception {
        create();
        db.execute("create function forge() returns void language sql security definer as $$update public.pagos set estado='PAGADO'$$");
        db.execute("grant usage on schema public to authenticator; grant execute on function forge() to authenticator");
        try(var c=db.getDataSource().getConnection();var statement=c.createStatement()) {
            statement.execute("set session authorization authenticator");
            assertThrows(java.sql.SQLException.class,()->statement.execute("select public.forge()"));
        }
        assertEquals("PENDIENTE",db.queryForObject("select estado from pagos",String.class));
    }
}
