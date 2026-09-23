package com.jjcgaming.payments.security;
import com.jjcgaming.payments.controller.PayPalController;
import com.jjcgaming.payments.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.mockito.Mockito.*;

@WebMvcTest(value=PayPalController.class,properties="jjc.frontend-url=http://localhost:4200")
@Import(SecurityConfig.class)
class PaymentSecurityTest {
    @Autowired MockMvc mvc;
    @MockitoBean SupabaseTokenIntrospector auth;
    @MockitoBean PayPalGateway gateway;
    @MockitoBean PaymentService payments;
    @Test void anonymousCannotCreateOrCapture() throws Exception {
        mvc.perform(post("/api/paypal/orders")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/paypal/orders/PAYPALORDER123/capture")).andExpect(status().isUnauthorized());
        verifyNoInteractions(payments);
    }
    @Test void publicConfigContainsOnlyPublicValues() throws Exception {
        when(gateway.config()).thenReturn(java.util.Map.of("clientId","public-id","currency","USD","environment","sandbox"));
        mvc.perform(get("/api/paypal/config")).andExpect(status().isOk())
            .andExpect(jsonPath("$.clientId").value("public-id")).andExpect(jsonPath("$.clientSecret").doesNotExist());
    }
    @Test void corsRejectsOtherOrigins() throws Exception {
        mvc.perform(options("/api/paypal/orders").header("Origin","https://untrusted.example")
            .header("Access-Control-Request-Method","POST")).andExpect(status().isForbidden());
        mvc.perform(options("/api/paypal/orders").header("Origin","http://localhost:4200")
            .header("Access-Control-Request-Method","POST")).andExpect(status().isOk())
            .andExpect(header().string("Access-Control-Allow-Origin","http://localhost:4200"));
    }
    @Test void unsignedWebhookDoesNotFulfill() throws Exception {
        mvc.perform(post("/api/paypal/webhook").contentType("application/json")
            .content("{\"event_type\":\"PAYMENT.CAPTURE.COMPLETED\"}"))
            .andExpect(status().isBadRequest());
        verifyNoInteractions(payments);
    }
    @Test void invalidOrExpiredTokenIsRejected() throws Exception {
        when(auth.introspect("expired-test-token")).thenThrow(new org.springframework.security.oauth2.server.resource.introspection.BadOpaqueTokenException("expired"));
        mvc.perform(post("/api/paypal/orders").header("Authorization","Bearer expired-test-token")).andExpect(status().isUnauthorized());
        verifyNoInteractions(payments);
    }
    @Test void authenticationOutageIsNotReportedAsExpiredSession() throws Exception {
        when(auth.introspect("outage-test-token")).thenThrow(new org.springframework.security.oauth2.core.OAuth2AuthenticationException(
            new org.springframework.security.oauth2.core.OAuth2Error("auth_unavailable")));
        mvc.perform(post("/api/paypal/orders").header("Authorization", "Bearer outage-test-token"))
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.message").value("No se pudo conectar con el servicio de autenticación. Reintenta en unos momentos."));
        verifyNoInteractions(payments);
    }
    @Test void createIgnoresClientIdentityAndPriceFields() throws Exception {
        var principal=new org.springframework.security.oauth2.core.DefaultOAuth2AuthenticatedPrincipal("authenticated-uuid",
            java.util.Map.of("sub","authenticated-uuid"),java.util.List.of());
        when(auth.introspect("valid-test-token")).thenReturn(principal);
        when(payments.create("authenticated-uuid")).thenReturn(java.util.Map.of("total",68.99));
        mvc.perform(post("/api/paypal/orders").header("Authorization","Bearer valid-test-token").contentType("application/json")
            .content("{\"total\":1,\"id_usuario\":999}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(68.99));
        verify(payments).create("authenticated-uuid");
    }
    @Test void customerWithoutPendingOrderCanOpenCheckout() throws Exception {
        var principal=new org.springframework.security.oauth2.core.DefaultOAuth2AuthenticatedPrincipal("authenticated-uuid",
            java.util.Map.of("sub","authenticated-uuid"),java.util.List.of());
        when(auth.introspect("valid-test-token")).thenReturn(principal);
        when(payments.current("authenticated-uuid")).thenReturn(null);
        mvc.perform(get("/api/paypal/orders/current").header("Authorization","Bearer valid-test-token"))
            .andExpect(status().isOk());
    }
}
