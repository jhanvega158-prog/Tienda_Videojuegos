package com.jjcgaming.payments.controller;

import com.jjcgaming.payments.dto.CartLine;
import com.jjcgaming.payments.dto.CartImport;
import com.jjcgaming.payments.service.StoreService;
import jakarta.validation.Valid;
import java.security.Principal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class StoreController {
    private final StoreService store;
    public StoreController(StoreService store) { this.store = store; }
    @GetMapping("/cart") Object cart(Principal p) { return store.cart(p.getName()); }
    @PostMapping("/cart/import") Object importCart(Principal p,@Valid @RequestBody CartImport body) { return store.importCart(p.getName(),body.items()); }
    @PutMapping("/cart/items") Object change(Principal p, @Valid @RequestBody CartLine line) { return store.changeCart(p.getName(), line); }
    @DeleteMapping("/cart") void clear(Principal p) { store.clearCart(p.getName()); }
    @GetMapping("/purchases") Object purchases(Principal p) { return store.purchases(p.getName()); }
    @GetMapping("/purchases/{number}") Object purchase(Principal p, @PathVariable String number) { return store.purchase(p.getName(), number); }
    @GetMapping("/library") Object library(Principal p) { return store.library(p.getName()); }
}
