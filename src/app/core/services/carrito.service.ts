import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { CartItem, Game } from '../../models/store.models';
import { AuthService } from './auth.service';
import { SessionAccess } from './session-access.service';
import { PaymentApi } from './payment-api.service';
@Injectable({ providedIn: 'root' })
export class CarritoService {
  private readonly auth = inject(AuthService);
  private readonly access = inject(SessionAccess);
  private readonly api = inject(PaymentApi);
  private readonly state = signal<CartItem[]>([]);
  private readonly owner = signal<string | null>(null);
  private queue: Promise<unknown> = Promise.resolve();
  readonly error = signal('');
  readonly loading = signal(false);
  readonly items = computed(() =>
    this.auth.isAuthenticated() && this.owner() === this.auth.user()?.id ? this.state() : [],
  );
  readonly count = computed(() => this.items().reduce((n, i) => n + i.cantidad, 0));
  readonly subtotal = computed(
    () => Math.round(this.items().reduce((n, i) => n + i.game.precio * i.cantidad, 0) * 100) / 100,
  );
  readonly iva = computed(() => Math.round(this.subtotal() * 15) / 100);
  readonly total = computed(() => this.subtotal() + this.iva());
  constructor() {
    effect(() => {
      const owner = this.auth.isAuthenticated() ? (this.auth.user()?.id ?? null) : null;
      if (owner === this.owner()) return;
      this.owner.set(owner);
      this.state.set([]);
      if (owner) void this.reload();
    });
  }
  async reload(): Promise<void> {
    const owner = this.auth.user()?.id;
    if (!owner || !this.auth.isAuthenticated()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const legacyKey = `jjc-cart-${owner}`;
      const importedKey = `jjc-cart-imported-${owner}`;
      let legacy: CartItem[] = [];
      try {
        legacy = JSON.parse(localStorage.getItem(legacyKey) ?? '[]');
      } catch {
        /* Invalid old cache is never trusted. */
      }
      const shouldImport =
        !localStorage.getItem(importedKey) && Array.isArray(legacy) && legacy.length > 0;
      const items = shouldImport
        ? await this.api.request<CartItem[]>('/cart/import', 'POST', {
            items: legacy.map((i) => ({ gameId: i.game.id, quantity: i.cantidad })),
          })
        : await this.api.request<CartItem[]>('/cart');
      if (shouldImport) localStorage.setItem(importedKey, '1');
      if (owner === this.auth.user()?.id) {
        this.owner.set(owner);
        this.state.set(items);
      }
    } catch (e) {
      if (owner === this.auth.user()?.id) this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
  private mutate(action: () => Promise<void>): Promise<boolean> {
    const owner = this.auth.user()?.id;
    const task = this.queue.then(async () => {
      if (!(await this.access.ensure()) || owner !== this.auth.user()?.id) return false;
      this.error.set('');
      try {
        await action();
        return true;
      } catch (e) {
        this.error.set((e as Error).message);
        return false;
      }
    });
    this.queue = task;
    return task;
  }
  private async setQuantity(id: number, quantity: number): Promise<void> {
    const owner = this.auth.user()?.id;
    const items = await this.api.request<CartItem[]>('/cart/items', 'PUT', {
      gameId: id,
      quantity,
    });
    if (owner === this.auth.user()?.id) {
      this.owner.set(owner!);
      this.state.set(items);
    }
  }
  add(game: Game): Promise<boolean> {
    return this.mutate(() =>
      this.setQuantity(
        game.id,
        (this.items().find((i) => i.game.id === game.id)?.cantidad ?? 0) + 1,
      ),
    );
  }
  async change(id: number, amount: number): Promise<void> {
    await this.mutate(() =>
      this.setQuantity(
        id,
        Math.max(0, (this.items().find((i) => i.game.id === id)?.cantidad ?? 0) + amount),
      ),
    );
  }
  async remove(id: number): Promise<void> {
    await this.mutate(() => this.setQuantity(id, 0));
  }
  async clear(): Promise<void> {
    await this.mutate(async () => {
      await this.api.request('/cart', 'DELETE');
      await this.reload();
    });
  }
}
