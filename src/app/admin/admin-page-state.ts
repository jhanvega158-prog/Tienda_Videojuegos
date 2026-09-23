import { signal } from '@angular/core';
export class AdminPageState {
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly confirmation = signal<{ message: string; run: () => Promise<void> } | null>(null);
  async fetch(work: () => Promise<void>): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      await work();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.loading.set(false);
    }
  }
  async mutate(work: () => Promise<void>, message: string): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.success.set('');
    try {
      await work();
      this.success.set(message);
      this.confirmation.set(null);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : String(e));
      this.confirmation.set(null);
    } finally {
      this.saving.set(false);
    }
  }
}
