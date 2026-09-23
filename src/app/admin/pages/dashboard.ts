import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { AdminDashboardService } from '../../core/services/admin/admin-dashboard.service';
import { AdminPageState } from '../admin-page-state';
import { AdminChart } from '../admin-chart';
@Component({
  selector: 'app-admin-dashboard',
  imports: [CurrencyPipe, DecimalPipe, AdminChart],
  templateUrl: './dashboard.html',
})
export class AdminDashboard extends AdminPageState {
  private readonly api = inject(AdminDashboardService);
  readonly data = signal<Awaited<ReturnType<AdminDashboardService['load']>> | null>(null);
  constructor() {
    super();
    void this.load();
  }
  load() {
    return this.fetch(async () => this.data.set(await this.api.load()));
  }
  get summary() {
    return this.data()?.resumen.data?.[0] ?? null;
  }
  get meses() {
    return (
      this.data()?.meses.data?.map((r) => ({
        label: `${r.anio} / ${r.mes}`,
        value: Number(r.total),
      })) ?? []
    );
  }
  get juegos() {
    return (
      this.data()?.juegos.data?.map((r) => ({ label: r.videojuego, value: Number(r.cantidad) })) ??
      []
    );
  }
  get metodos() {
    return (
      this.data()?.metodos.data?.map((r) => ({
        label: r.metodo ?? 'Sin método',
        value: Number(r.cantidad),
      })) ?? []
    );
  }
  get estados() {
    return (
      this.data()?.estados.data?.map((r) => ({
        label: r.estado ?? 'Sin estado',
        value: Number(r.cantidad),
      })) ?? []
    );
  }
}
