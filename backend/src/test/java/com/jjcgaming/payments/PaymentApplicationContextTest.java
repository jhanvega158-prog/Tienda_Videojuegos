package com.jjcgaming.payments;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import com.jjcgaming.payments.service.PayPalGateway;
import com.jjcgaming.payments.security.SupabaseTokenIntrospector;

@EnabledIfEnvironmentVariable(named="JJC_TEST_DATABASE_URL",matches="jdbc:postgresql://127\\.0\\.0\\.1:55432/jjc_payments_test")
@SpringBootTest(properties={
 "spring.datasource.url=${JJC_TEST_DATABASE_URL}","spring.datasource.username=postgres","spring.datasource.password=",
 "jjc.supabase-url=https://auth.example.test","jjc.supabase-publishable-key=test-only",
 "jjc.paypal.client-id=test-only","jjc.paypal.client-secret=test-only","jjc.paypal.mode=sandbox"
})
class PaymentApplicationContextTest {
    @org.springframework.test.context.DynamicPropertySource
    static void localSchema(org.springframework.test.context.DynamicPropertyRegistry properties) throws Exception {
        var source=new org.springframework.jdbc.datasource.DriverManagerDataSource(System.getenv("JJC_TEST_DATABASE_URL"),"postgres","");
        var db=new org.springframework.jdbc.core.JdbcTemplate(source);
        db.execute(java.nio.file.Files.readString(java.nio.file.Path.of("src/test/resources/payment-fixture.sql")));
        db.execute(java.nio.file.Files.readString(java.nio.file.Path.of("../paypal-migration.sql")));
    }
    @MockitoBean PayPalGateway paypal;
    @MockitoBean SupabaseTokenIntrospector auth;
    @org.springframework.beans.factory.annotation.Autowired com.jjcgaming.payments.service.PaymentService payments;
    @org.springframework.beans.factory.annotation.Autowired org.springframework.jdbc.core.JdbcTemplate db;
    @Test void checkoutQueryWorksWithTransactionalStoreProxy() {
        String subject="00000000-0000-0000-0000-000000000003";
        db.update("insert into usuarios(id,auth_id,id_rol,activo,nombre,apellido,correo) values (3,?::uuid,2,true,'Checkout','Test','checkout@example.test')",subject);
        org.junit.jupiter.api.Assertions.assertNull(payments.current(subject));
    }
    @Test void fullApplicationStartsAgainstMigratedLocalDatabase() {}
}
