package com.jjcgaming.payments.security;

import java.net.http.*;
import javax.net.ssl.SSLHandshakeException;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.server.resource.introspection.BadOpaqueTokenException;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class SupabaseTokenIntrospectorTest {
    private final HttpClient http = mock(HttpClient.class);
    private final SupabaseTokenIntrospector auth = new SupabaseTokenIntrospector(
        http, JsonMapper.builder().build(), "https://example.supabase.co", "test-public-key");

    @SuppressWarnings("unchecked")
    private void response(int status, String body) throws Exception {
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(status);
        when(response.body()).thenReturn(body);
        when(http.send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<String>>any())).thenReturn(response);
    }
    @Test void validSupabaseUserIsAuthenticated() throws Exception {
        String id = "12345678-1234-1234-1234-123456789012";
        response(200, "{\"id\":\"" + id + "\",\"role\":\"authenticated\"}");
        assertEquals(id, auth.introspect("test-token").getName());
    }
    @Test void rejectedTokensRemainUnauthorized() throws Exception {
        for (int status : new int[]{401, 403}) {
            response(status, "{}");
            assertThrows(BadOpaqueTokenException.class, () -> auth.introspect("test-token"));
        }
    }
    @Test void serverFailureIsUnavailable() throws Exception {
        response(500, "{}");
        assertEquals("auth_unavailable", assertThrows(OAuth2AuthenticationException.class,
            () -> auth.introspect("test-token")).getError().getErrorCode());
    }
    @Test void tlsFailureIsUnavailable() throws Exception {
        when(http.send(any(HttpRequest.class), org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<String>>any()))
            .thenThrow(new SSLHandshakeException("test certificate failure"));
        assertEquals("auth_unavailable", assertThrows(OAuth2AuthenticationException.class,
            () -> auth.introspect("test-token")).getError().getErrorCode());
    }
}
