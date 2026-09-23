package com.jjcgaming.payments.dto;
import jakarta.validation.constraints.*;
public record CartLine(@Positive long gameId, @Min(0) @Max(100) int quantity) {}
