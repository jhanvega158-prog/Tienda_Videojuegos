package com.jjcgaming.payments.security;

import com.jjcgaming.payments.controller.HealthController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(value = HealthController.class, properties = "jjc.frontend-url=https://jjc-frontend.onrender.com")
@Import(SecurityConfig.class)
class DeploymentSecurityTest {
    @Autowired MockMvc mvc;
    @MockitoBean SupabaseTokenIntrospector auth;

    @Test void healthIsPublicAndContainsOnlyStatus() throws Exception {
        mvc.perform(get("/api/health")).andExpect(status().isOk())
            .andExpect(content().string("{\"status\":\"UP\"}"));
        verifyNoInteractions(auth);
    }

    @Test void configuredFrontendCanAccessPaymentEndpoints() throws Exception {
        mvc.perform(options("/api/paypal/orders")
            .header("Origin", "https://jjc-frontend.onrender.com")
            .header("Access-Control-Request-Method", "POST")
            .header("Access-Control-Request-Headers", "Authorization,Content-Type"))
            .andExpect(status().isOk())
            .andExpect(header().string("Access-Control-Allow-Origin", "https://jjc-frontend.onrender.com"));
    }

    @Test void productionCorsRejectsUnconfiguredOrigins() throws Exception {
        for (String origin : new String[] {"http://localhost:4200", "https://untrusted.example"}) {
            mvc.perform(options("/api/paypal/orders").header("Origin", origin)
                .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden());
        }
    }
}
