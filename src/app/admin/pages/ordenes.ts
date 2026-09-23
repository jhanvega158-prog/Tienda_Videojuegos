import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { AdminOrdenesService } from '../../core/services/admin/admin-ordenes.service';
import { AdminPagosService } from '../../core/services/admin/admin-pagos.service';
import { OrdenAdmin, OrdenDetalle, PagoAdmin } from '../../models/admin.models';
import { AdminPageState } from '../admin-page-state';
@Component({
  selector: 'app-admin-ordenes',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './ordenes.html',
})
export class AdminOrdenes extends AdminPageState {
  private readonly api = inject(AdminOrdenesService);
  private readonly paymentApi = inject(AdminPagosService);
  readonly rows = signal<OrdenAdmin[]>([]);
  readonly selected = signal<OrdenAdmin | null>(null);
  readonly details = signal<OrdenDetalle[]>([]);
  readonly payments = signal<PagoAdmin[]>([]);
  readonly detailLoading = signal(false);
  readonly detailError = signal('');
  readonly search = signal('');
  readonly state = signal('todos');
  readonly from = signal('');
  readonly to = signal('');
  readonly filtered = computed(() =>
    this.rows().filter(
      (o) =>
        `${o.numero_orden} ${o.usuarios?.nombre ?? ''} ${o.usuarios?.apellido ?? ''} ${o.usuarios?.correo ?? ''}`
          .toLowerCase()
          .includes(this.search().toLowerCase()) &&
        (this.state() === 'todos' || o.estado === this.state()),
    ),
  );
  private detailSequence = 0;
  constructor() {
    super();
    void this.load();
  }
  load() {
    if (this.from() && this.to() && this.from() > this.to()) {
      this.error.set('La fecha inicial debe ser anterior o igual a la final.');
      return Promise.resolve();
    }
    return this.fetch(async () => this.rows.set(await this.api.list(this.from(), this.to())));
  }
  async open(row: OrdenAdmin): Promise<void> {
    const seq = ++this.detailSequence;
    this.selected.set(row);
    this.details.set([]);
    this.payments.set([]);
    this.detailLoading.set(true);
    this.detailError.set('');
    try {
      const [details, payments] = await Promise.all([
        this.api.detail(row.id),
        this.paymentApi.list(row.id),
      ]);
      if (seq === this.detailSequence) {
        this.details.set(details);
        this.payments.set(payments);
      }
    } catch (e) {
      if (seq === this.detailSequence) this.detailError.set((e as Error).message);
    } finally {
      if (seq === this.detailSequence) this.detailLoading.set(false);
    }
  }
}
