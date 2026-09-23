package com.jjcgaming.payments.exception;

public class PaymentException extends RuntimeException {
    public final int status;
    public final String code;
    public PaymentException(int status, String code, String message) {
        super(message); this.status = status; this.code = code;
    }
}
