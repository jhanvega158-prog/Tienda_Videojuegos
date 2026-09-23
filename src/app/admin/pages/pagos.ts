import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { AdminPagosService } from '../../core/services/admin/admin-pagos.service';
import { PagoAdmin, AuditoriaPago } from '../../models/admin.models';
import { AdminPageState } from '../admin-page-state';
@Component({
  selector: 'app-admin-pagos',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './pagos.html',
})
export class AdminPagos extends AdminPageState {
  private readonly api = inject(AdminPagosService);
  readonly rows = signal<PagoAdmin[]>([]);
  readonly selected = signal<PagoAdmin | null>(null);
  readonly audit = signal<AuditoriaPago[]>([]);
  readonly detailLoading = signal(false);
  readonly detailError = signal('');
  readonly search = signal('');
  readonly state = signal('todos');
  private sequence = 0;
  readonly filtered = computed(() =>
    this.rows().filter(
      (p) =>
        `${p.referencia ?? ''} ${p.ordenes?.numero_orden ?? p.id_orden} ${p.proveedor ?? ''}`
          .toLowerCase()
          .includes(this.search().toLowerCase()) &&
        (this.state() === 'todos' || p.estado === this.state()),
    ),
  );
  constructor() {
    super();
    void this.load();
  }
  load() {
    return this.fetch(async () => this.rows.set(await this.api.list()));
  }
  async open(row: PagoAdmin): Promise<void> {
    const seq = ++this.sequence;
    this.selected.set(row);
    this.audit.set([]);
    this.detailLoading.set(true);
    this.detailError.set('');
    try {
      const audit = await this.api.audit(row.id);
      if (seq === this.sequence)
        this.audit.set(audit.sort((a, b) => a.fecha.localeCompare(b.fecha)));
    } catch (e) {
      if (seq === this.sequence) this.detailError.set((e as Error).message);
    } finally {
      if (seq === this.sequence) this.detailLoading.set(false);
    }
  }
}
