package com.jjcgaming.payments.service;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import tools.jackson.databind.json.JsonMapper;
import com.jjcgaming.payments.exception.PaymentException;

class MoneyAndCaptureTest {
    @Test void taxUsesExistingFifteenPercentAndExplicitRounding() {
        assertEquals(new BigDecimal("9.00"),Money.tax(new BigDecimal("59.99")));
        assertEquals(new BigDecimal("0.02"),Money.tax(new BigDecimal("0.10")));
        assertEquals(new BigDecimal("1.01"),Money.usd(new BigDecimal("1.005")));
    }
    static String response(String status,String currency,String amount,String reference) {
        return """
            {"id":"PAYPALORDER123","intent":"CAPTURE","status":"%s","purchase_units":[{
            "reference_id":"%s","custom_id":"%s","amount":{"currency_code":"%s","value":"%s"},
            "payments":{"captures":[{"id":"CAPTURE123","status":"%s","final_capture":true,
            "amount":{"currency_code":"%s","value":"%s"}}]}}]}
            """.formatted(status,reference,reference,currency,amount,status,currency,amount);
    }
    @Test void onlyAnExactCompletedUsdCaptureIsAccepted() {
        var json=JsonMapper.builder().build(); var verifier=new CaptureVerifier();
        assertEquals("CAPTURE123",verifier.verify(json.readTree(response("COMPLETED","USD","68.99","JJC-1")),"PAYPALORDER123","JJC-1",new BigDecimal("68.99")).id());
        for(var data:new String[]{response("PENDING","USD","68.99","JJC-1"),response("COMPLETED","EUR","68.99","JJC-1"),
                response("COMPLETED","USD","1.00","JJC-1"),response("COMPLETED","USD","68.99","other")}) {
            assertThrows(PaymentException.class,()->verifier.verify(json.readTree(data),"PAYPALORDER123","JJC-1",new BigDecimal("68.99")));
        }
    }
    @Test void ownershipComesFromTheAuthenticatedUser() {
        var ex=assertThrows(PaymentException.class,()->PaymentService.assertOwner(java.util.Map.of("id_usuario",1),2));
        assertEquals(403,ex.status);
    }
}
