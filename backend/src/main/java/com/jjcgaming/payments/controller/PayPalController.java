package com.jjcgaming.payments.controller;

import com.jjcgaming.payments.service.*;
import com.jjcgaming.payments.exception.PaymentException;
import java.security.Principal;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/paypal")
public class PayPalController {
    private final PayPalGateway gateway;
    private final PaymentService payments;
    public PayPalController(PayPalGateway gateway, PaymentService payments) { this.gateway=gateway;this.payments=payments; }
    @GetMapping("/config") Object config() { return gateway.config(); }
    @GetMapping("/orders/current") Object current(Principal p) { return payments.current(p.getName()); }
    @PostMapping("/orders") Object create(Principal p) { return payments.create(p.getName()); }
    @PostMapping("/orders/{id}/capture") Object capture(Principal p,@PathVariable String id) { return payments.capture(p.getName(),id); }
    @PostMapping("/webhook") Object webhook(@RequestHeader Map<String,String> headers,@RequestBody JsonNode event) {
        if (!gateway.verifyWebhook(headers,event)) throw new PaymentException(400,"INVALID_SIGNATURE","Firma inválida.");
        if ("PAYMENT.CAPTURE.COMPLETED".equals(event.path("event_type").asText())) {
            String orderId=event.path("resource").path("supplementary_data").path("related_ids").path("order_id").asText();
            // Re-read Orders API with our credentials and run the same exact verifier/transaction, never trust event amounts.
            payments.reconcile(orderId);
        }
        return Map.of("received",true);
    }
}
