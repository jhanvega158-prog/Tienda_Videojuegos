import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';
import { SessionAccess } from './session-access.service';
@Injectable({ providedIn: 'root' })
export class FavoritosLocalService {
  private readonly storage = inject(StorageService);
  private readonly auth = inject(AuthService);
  private readonly access = inject(SessionAccess);
  private readonly state = signal<number[]>([]);
  private readonly owner = signal<string | null>(null);
  readonly ids = computed(() =>
    this.auth.isAuthenticated() && this.owner() === this.auth.user()?.id ? this.state() : [],
  );
  constructor() {
    effect(() => {
      const owner = this.auth.isAuthenticated() ? (this.auth.user()?.id ?? null) : null;
      if (owner === this.owner()) return;
      this.owner.set(owner);
      const saved = owner ? this.storage.get<number[]>(`jjc-favoritos-${owner}`, []) : [];
      this.state.set(Array.isArray(saved) ? saved.filter(Number.isInteger) : []);
    });
  }
  has(id: number): boolean {
    return this.ids().includes(id);
  }
  async toggle(id: number): Promise<void> {
    if (!(await this.access.ensure())) return;
    const owner = this.auth.user()?.id;
    if (!owner) return;
    const ids = this.has(id) ? this.ids().filter((value) => value !== id) : [...this.ids(), id];
    this.state.set(ids);
    this.storage.set(`jjc-favoritos-${owner}`, ids);
  }
}

