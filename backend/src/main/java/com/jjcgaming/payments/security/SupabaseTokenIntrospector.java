package com.jjcgaming.payments.security;

import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.server.resource.introspection.*;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/** Supabase Auth validates the access JWT (including legacy HS256); we never decode an unverified sub. */
@Component
public class SupabaseTokenIntrospector implements OpaqueTokenIntrospector {
    private final HttpClient http;
    private final ObjectMapper json;
    private final String url, key;
    public SupabaseTokenIntrospector(HttpClient http, ObjectMapper json,
            @Value("${jjc.supabase-url}") String url,
            @Value("${jjc.supabase-publishable-key}") String key) {
        if (!url.startsWith("https://")) throw new IllegalArgumentException("Supabase requiere HTTPS");
        this.http = http; this.json = json; this.url = url; this.key = key;
    }
    @Override public OAuth2AuthenticatedPrincipal introspect(String token) {
        try {
            var response = http.send(HttpRequest.newBuilder(URI.create(url + "/auth/v1/user"))
                .timeout(Duration.ofSeconds(10)).header("apikey", key)
                .header("Authorization", "Bearer " + token).GET().build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 401 || response.statusCode() == 403)
                throw new BadOpaqueTokenException("Sesión inválida o expirada.");
            if (response.statusCode() != 200) throw unavailable();
            var user = json.readTree(response.body());
            var id = UUID.fromString(user.path("id").asText()).toString();
            if (!"authenticated".equals(user.path("role").asText())) throw new BadOpaqueTokenException("Sesión inválida.");
            return new DefaultOAuth2AuthenticatedPrincipal(id, Map.of("sub", id),
                List.of(new SimpleGrantedAuthority("ROLE_AUTHENTICATED")));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt(); throw unavailable();
        } catch (BadOpaqueTokenException e) { throw e;
        } catch (Exception e) { throw unavailable(); }
    }
    private static OAuth2AuthenticationException unavailable() {
        return new OAuth2AuthenticationException(new OAuth2Error("auth_unavailable"));
    }
}
