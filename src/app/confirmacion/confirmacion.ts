import { Icon } from '../shared/icon';
import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ComprasService } from '../core/services/compras.service';
import { Purchase } from '../models/store.models';
import { PagoService } from '../core/services/pago.service';
@Component({
  selector: 'app-confirmacion',
  imports: [Icon, RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './confirmacion.html',
  styleUrl: './confirmacion.css',
})
export class Confirmacion {
  private readonly purchases = inject(ComprasService);
  private readonly route = inject(ActivatedRoute);
  private readonly payments = inject(PagoService);
  readonly checking = signal(false);
  readonly purchase = signal<Purchase | null>(null);
  readonly error = signal('');
  readonly loading = signal(true);
  constructor() {
    void this.load();
  }
  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    const id =
      this.route.snapshot.paramMap.get('id') ?? this.route.snapshot.queryParamMap.get('orden');
    try {
      if (id) this.purchase.set(await this.purchases.detail(id));
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
  async checkPayment(): Promise<void> {
    const id = this.purchase()?.paypalOrderId;
    if (!id || this.checking()) return;
    this.checking.set(true);
    this.error.set('');
    try {
      const result = await this.payments.capture(id);
      await this.load();
      if (result.status !== 'PAGADA')
        this.error.set(result.message ?? 'El pago todavía no está confirmado.');
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.checking.set(false);
    }
  }
}
