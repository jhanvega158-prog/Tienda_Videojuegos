package com.jjcgaming.payments.service;

import java.math.*;
public final class Money {
    private Money() {}
    public static BigDecimal usd(BigDecimal value) { return value.setScale(2, RoundingMode.HALF_UP); }
    public static BigDecimal tax(BigDecimal subtotal) { return usd(subtotal.multiply(new BigDecimal("0.15"))); }
}
