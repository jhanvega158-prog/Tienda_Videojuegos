package com.jjcgaming.payments.exception;

import java.util.Map;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;

@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler(PaymentException.class)
    ResponseEntity<?> payment(PaymentException e) {
        return ResponseEntity.status(e.status).body(Map.of("code", e.code, "message", e.getMessage()));
    }
    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class, IllegalArgumentException.class})
    ResponseEntity<?> invalid(Exception e) {
        return ResponseEntity.badRequest().body(Map.of("code", "INVALID_REQUEST", "message", "Solicitud inválida."));
    }
    @ExceptionHandler(Exception.class)
    ResponseEntity<?> unexpected(Exception e) {
        // Never log exception messages: HTTP/SQL exceptions can contain credentials or provider payloads.
        LoggerFactory.getLogger(ApiErrors.class).error("Payment request failed: {}", e.getClass().getSimpleName());
        // Stack locations contain no request values, unlike exception messages or causes.
        for (var frame : e.getStackTrace()) {
            if (frame.getClassName().startsWith("com.jjcgaming.") || frame.getClassName().startsWith("org.springframework.web."))
                LoggerFactory.getLogger(ApiErrors.class).error("Failure location: {}", frame);
        }
        return ResponseEntity.status(503).body(Map.of("code", "UNAVAILABLE", "message",
            "No se pudo confirmar la operación. Consulta Mis compras o reintenta; no inicies otro pago."));
    }
}
