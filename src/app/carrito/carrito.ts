import { Icon } from '../shared/icon';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { CarritoService } from '../core/services/carrito.service';
@Component({
  selector: 'app-carrito',
  imports: [Icon, RouterLink, CurrencyPipe],
  templateUrl: './carrito.html',
  styleUrl: './carrito.css',
})
export class Carrito {
  cart = inject(CarritoService);
}
