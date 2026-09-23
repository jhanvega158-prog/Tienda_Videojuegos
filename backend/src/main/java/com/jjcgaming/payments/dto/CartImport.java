package com.jjcgaming.payments.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
public record CartImport(@NotNull @Size(max=100) List<@Valid CartLine> items) {}
