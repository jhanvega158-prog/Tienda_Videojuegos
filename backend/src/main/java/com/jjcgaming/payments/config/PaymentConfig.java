package com.jjcgaming.payments.config;

import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;

@Configuration
public class PaymentConfig {
    @Bean HttpClient httpClient(@Value("${jjc.paypal.mode}") String mode) {
        if (!"sandbox".equals(mode)) throw new IllegalStateException("Solo Sandbox está habilitado.");
        return HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10))
            .followRedirects(HttpClient.Redirect.NEVER).build();
    }
}
