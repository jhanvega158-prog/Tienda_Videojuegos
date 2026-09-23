package com.jjcgaming.payments.service;
import java.net.http.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import tools.jackson.databind.json.JsonMapper;

class PayPalGatewayTest {
    @SuppressWarnings("unchecked")
    @Test void verifiesSignatureThroughOfficialApiAndAcceptsHeaderCaseVariants() throws Exception {
        var http=mock(HttpClient.class);
        HttpResponse<String> oauth=mock(HttpResponse.class), verified=mock(HttpResponse.class);
        when(oauth.statusCode()).thenReturn(200);when(oauth.body()).thenReturn("{\"access_token\":\"test-only-oauth\",\"expires_in\":3600}");
        when(verified.statusCode()).thenReturn(200);when(verified.body()).thenReturn("{\"verification_status\":\"SUCCESS\"}");
        when(http.send(any(HttpRequest.class),any(HttpResponse.BodyHandler.class))).thenReturn(oauth,verified);
        var gateway=new PayPalGateway(http,JsonMapper.builder().build(),"test-public","test-secret","test-webhook");
        assertTrue(gateway.verifyWebhook(Map.of("PAYPAL-AUTH-ALGO","SHA256withRSA","PAYPAL-CERT-URL","https://example.test/cert",
            "PayPal-Transmission-Id","event-1","PayPal-Transmission-Sig","test-signature","PayPal-Transmission-Time","2026-09-22T00:00:00Z"),
            JsonMapper.builder().build().readTree("{\"id\":\"event-1\"}")));
        var request=org.mockito.ArgumentCaptor.forClass(HttpRequest.class);
        verify(http,times(2)).send(request.capture(),any(HttpResponse.BodyHandler.class));
        assertEquals("https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature",request.getAllValues().get(1).uri().toString());
        assertEquals(Set.of("clientId","currency","environment"),gateway.config().keySet());
    }
    @Test void missingSignatureCannotReachProviderOrFulfillment() {
        var http=mock(HttpClient.class);
        var gateway=new PayPalGateway(http,JsonMapper.builder().build(),"test-public","test-secret","test-webhook");
        assertFalse(gateway.verifyWebhook(Map.of(),JsonMapper.builder().build().readTree("{}")));
        verifyNoInteractions(http);
    }
}
