package com.jjcgaming.payments.security;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.*;

@Configuration
public class SecurityConfig {
    @Bean SecurityFilterChain security(HttpSecurity http, SupabaseTokenIntrospector auth, @Qualifier("cors") CorsConfigurationSource source) throws Exception {
        org.springframework.security.web.AuthenticationEntryPoint entryPoint = (request, response, exception) -> {
            boolean unavailable = exception instanceof org.springframework.security.oauth2.core.OAuth2AuthenticationException oauth
                && "auth_unavailable".equals(oauth.getError().getErrorCode());
            response.setStatus(unavailable ? 503 : 401);
            response.setCharacterEncoding("UTF-8");
            response.setContentType("application/json");
            if (!unavailable) response.setHeader("WWW-Authenticate", "Bearer");
            response.getWriter().write(unavailable
                ? "{\"message\":\"No se pudo conectar con el servicio de autenticación. Reintenta en unos momentos.\"}"
                : "{\"message\":\"Tu sesión expiró. Inicia sesión nuevamente.\"}");
        };
        return http.csrf(c -> c.disable()).cors(c -> c.configurationSource(source))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a.requestMatchers(HttpMethod.GET, "/api/paypal/config", "/api/health").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/paypal/webhook").permitAll()
                .anyRequest().authenticated())
            .exceptionHandling(e -> e.authenticationEntryPoint(entryPoint))
            .oauth2ResourceServer(o -> o.authenticationEntryPoint(entryPoint).opaqueToken(t -> t.introspector(auth)))
            .build();
    }
    @Bean CorsConfigurationSource cors(@Value("${jjc.frontend-url}") String frontend) {
        if (frontend.contains("*") || frontend.contains(",")) throw new IllegalArgumentException("Configura un origen concreto");
        var c = new CorsConfiguration(); c.setAllowedOrigins(List.of(frontend));
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        c.setAllowedHeaders(List.of("Authorization", "Content-Type")); c.setMaxAge(3600L);
        var source = new UrlBasedCorsConfigurationSource(); source.registerCorsConfiguration("/api/**", c);
        return source;
    }
}
