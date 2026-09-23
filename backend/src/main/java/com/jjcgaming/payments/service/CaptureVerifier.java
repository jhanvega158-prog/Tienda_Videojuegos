package com.jjcgaming.payments.service;

import com.jjcgaming.payments.exception.PaymentException;
import java.math.BigDecimal;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

@Component
public class CaptureVerifier {
    public record VerifiedCapture(String id, BigDecimal amount, String currency) {}
    public VerifiedCapture verify(JsonNode order, String paypalId, String reference, BigDecimal total) {
        var units = order.path("purchase_units");
        if (!paypalId.equals(order.path("id").asText()) || !"CAPTURE".equals(order.path("intent").asText())
            || !"COMPLETED".equals(order.path("status").asText()) || units.size() != 1) throw mismatch();
        var unit = units.get(0);
        var captures = unit.path("payments").path("captures");
        if (!reference.equals(unit.path("reference_id").asText())
            || !reference.equals(unit.path("custom_id").asText()) || captures.size() != 1) throw mismatch();
        var capture = captures.get(0);
        if (!"COMPLETED".equals(capture.path("status").asText()) || !capture.path("final_capture").asBoolean()
            || capture.path("id").asText().isBlank()) throw mismatch();
        verifyAmount(unit.path("amount"), total);
        verifyAmount(capture.path("amount"), total);
        return new VerifiedCapture(capture.path("id").asText(), total, "USD");
    }
    private void verifyAmount(JsonNode amount, BigDecimal total) {
        try {
            if (!"USD".equals(amount.path("currency_code").asText())
                || new BigDecimal(amount.path("value").asText()).compareTo(total) != 0) throw mismatch();
        } catch (NumberFormatException e) { throw mismatch(); }
    }
    private PaymentException mismatch() {
        return new PaymentException(409, "PAYMENT_REVIEW", "El pago necesita revisión. No se entregaron productos; no vuelvas a pagar.");
    }
}
