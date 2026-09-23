import { Icon } from '../shared/icon';
import { Component, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ComprasService } from '../core/services/compras.service';
@Component({
  selector: 'app-compras',
  imports: [Icon, RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './compras.html',
  styleUrl: './compras.css',
})
export class Compras {
  purchases = inject(ComprasService);
  constructor() {
    void this.purchases.load();
  }
}
