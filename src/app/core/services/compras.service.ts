import { Injectable, computed, inject, signal } from '@angular/core';
import { Purchase, Game } from '../../models/store.models';
import { AuthService } from './auth.service';
import { PaymentApi } from './payment-api.service';
@Injectable({ providedIn: 'root' })
export class ComprasService {
  private readonly auth = inject(AuthService);
  private readonly api = inject(PaymentApi);
  private readonly records = signal<Purchase[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly purchases = computed(() =>
    this.auth.isAuthenticated()
      ? this.records().filter((p) => p.usuarioId === this.auth.user()?.id)
      : [],
  );
  async load(): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      this.records.set([]);
      return;
    }
    const owner = this.auth.user()?.id;
    this.loading.set(true);
    this.error.set('');
    try {
      const records = await this.api.request<Purchase[]>('/purchases');
      if (owner === this.auth.user()?.id) this.records.set(records);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
  detail(id: string) {
    return this.api.request<Purchase>(`/purchases/${encodeURIComponent(id)}`);
  }
  library() {
    return this.api.request<Game[]>('/library');
  }
}
