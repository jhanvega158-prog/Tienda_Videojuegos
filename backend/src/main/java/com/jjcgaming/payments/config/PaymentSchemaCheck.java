package com.jjcgaming.payments.config;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Fail closed before accepting payments; never applies SQL migrations itself. */
@Component
public class PaymentSchemaCheck implements ApplicationRunner {
    private final JdbcTemplate db;
    public PaymentSchemaCheck(JdbcTemplate db) { this.db=db; }
    public void run(ApplicationArguments args) {
        try {
            String user=db.queryForObject("select session_user",String.class);
            if(!java.util.Set.of("postgres","jjc_payments").contains(user)) throw new IllegalStateException();
            if(!Boolean.TRUE.equals(db.queryForObject("select exists(select 1 from public.paypal_schema_version where version=1)",Boolean.class))) throw new IllegalStateException();
        } catch(Exception e) {
            throw new IllegalStateException("Falta aplicar/revisar paypal-migration.sql o configurar el usuario PostgreSQL del backend. No se habilitaron pagos.");
        }
    }
}
