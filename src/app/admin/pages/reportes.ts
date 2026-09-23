import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { AdminReportesService } from '../../core/services/admin/admin-reportes.service';
import { AdminPageState } from '../admin-page-state';
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
@Component({
  selector: 'app-admin-reportes',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './reportes.html',
})
export class AdminReportes extends AdminPageState {
  private readonly api = inject(AdminReportesService);
  readonly from = signal(today().slice(0, 8) + '01');
  readonly to = signal(today());
  readonly range = signal('');
  readonly data = signal<Awaited<ReturnType<AdminReportesService['load']>> | null>(null);
  constructor() {
    super();
    void this.load();
  }
  load() {
    const from = this.from(),
      to = this.to();
    this.data.set(null);
    return this.fetch(async () => {
      this.data.set(await this.api.load(from, to));
      this.range.set(`${from} → ${to}`);
    });
  }
}
