package com.jjcgaming.payments.service;

import com.jjcgaming.payments.exception.PaymentException;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.databind.*;

@Service
public class PayPalGateway {
    private static final String BASE = "https://api-m.sandbox.paypal.com";
    private final HttpClient http;
    private final ObjectMapper json;
    private final String clientId, secret, webhookId;
    private String accessToken;
    private Instant tokenUntil = Instant.EPOCH;
    public PayPalGateway(HttpClient http, ObjectMapper json,
            @Value("${jjc.paypal.client-id}") String clientId,
            @Value("${jjc.paypal.client-secret}") String secret,
            @Value("${jjc.paypal.webhook-id}") String webhookId) {
        this.http = http; this.json = json; this.clientId = clientId; this.secret = secret; this.webhookId = webhookId;
    }
    public Map<String, String> config() {
        if (clientId.isBlank() || secret.isBlank()) throw new PaymentException(503, "NOT_CONFIGURED", "PayPal no está configurado.");
        return Map.of("clientId", clientId, "currency", "USD", "environment", "sandbox");
    }
    private synchronized String token() {
        config();
        if (Instant.now().isBefore(tokenUntil)) return accessToken;
        String basic = Base64.getEncoder().encodeToString((clientId + ":" + secret).getBytes(StandardCharsets.UTF_8));
        var response = send(HttpRequest.newBuilder(URI.create(BASE + "/v1/oauth2/token"))
            .header("Authorization", "Basic " + basic).header("Content-Type", "application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString("grant_type=client_credentials")));
        accessToken = response.path("access_token").asText();
        if (accessToken.isBlank()) throw unavailable();
        tokenUntil = Instant.now().plusSeconds(Math.max(0, response.path("expires_in").asLong() - 60));
        return accessToken;
    }
    public JsonNode create(String requestId, String reference, BigDecimal amount) {
        return request("POST", "/v2/checkout/orders", requestId, Map.of("intent", "CAPTURE",
            "purchase_units", List.of(Map.of("reference_id", reference, "custom_id", reference,
                "amount", Map.of("currency_code", "USD", "value", Money.usd(amount).toPlainString()))),
            "payment_source", Map.of("paypal", Map.of("experience_context", Map.of(
                "shipping_preference", "NO_SHIPPING", "user_action", "PAY_NOW", "brand_name", "JJC GAMING")))));
    }
    public JsonNode get(String orderId) { return request("GET", "/v2/checkout/orders/" + checkedId(orderId), null, null); }
    public JsonNode capture(String orderId, String requestId) {
        return request("POST", "/v2/checkout/orders/" + checkedId(orderId) + "/capture", requestId, Map.of());
    }
    public boolean verifyWebhook(Map<String, String> headers, JsonNode event) {
        if (webhookId.isBlank()) throw new PaymentException(503, "WEBHOOK_NOT_CONFIGURED", "Webhook no configurado.");
        var body = new HashMap<String, Object>();
        var normalized=new TreeMap<String,String>(String.CASE_INSENSITIVE_ORDER);
        normalized.putAll(headers);
        for (String name : List.of("auth-algo", "cert-url", "transmission-id", "transmission-sig", "transmission-time")) {
            var value = normalized.get("paypal-" + name);
            if (value == null || value.length() > 4096) return false;
            body.put(name.replace('-', '_'), value);
        }
        body.put("webhook_id", webhookId); body.put("webhook_event", event);
        return "SUCCESS".equals(request("POST", "/v1/notifications/verify-webhook-signature", null, body)
            .path("verification_status").asText());
    }
    private JsonNode request(String method, String path, String key, Object body) {
        var builder = HttpRequest.newBuilder(URI.create(BASE + path)).header("Authorization", "Bearer " + token())
            .header("Content-Type", "application/json").header("Prefer", "return=representation");
        if (key != null) builder.header("PayPal-Request-Id", key);
        builder.method(method, body == null ? HttpRequest.BodyPublishers.noBody()
            : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        return send(builder);
    }
    private JsonNode send(HttpRequest.Builder request) {
        try {
            var result = http.send(request.timeout(Duration.ofSeconds(25)).build(), HttpResponse.BodyHandlers.ofString());
            if (result.statusCode() < 200 || result.statusCode() >= 300) {
                if(result.statusCode()==422) {
                    var error=json.readTree(result.body());
                    for(var detail:error.path("details")) {
                        if(Set.of("INSTRUMENT_DECLINED","TRANSACTION_REFUSED","PAYMENT_DENIED").contains(detail.path("issue").asText()))
                            throw new PaymentException(409,"PAYMENT_DECLINED","PayPal rechazó el pago. Puedes intentar con otro método dentro de PayPal.");
                    }
                }
                // Preserve uncertain operations for GET reconciliation; never label a network failure as a declined payment.
                throw unavailable();
            }
            return json.readTree(result.body());
        } catch (InterruptedException e) { Thread.currentThread().interrupt(); throw unavailable();
        } catch (java.io.IOException e) { throw unavailable(); }
    }
    static String checkedId(String id) {
        if (id == null || !id.matches("[A-Z0-9]{8,40}")) throw new PaymentException(400, "INVALID_ORDER", "Orden inválida.");
        return id;
    }
    private PaymentException unavailable() {
        return new PaymentException(502, "PAYPAL_UNAVAILABLE", "PayPal no pudo confirmar la operación. Reintenta con la misma orden.");
    }
}
