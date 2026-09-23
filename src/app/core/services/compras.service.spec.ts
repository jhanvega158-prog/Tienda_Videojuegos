import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { ComprasService } from './compras.service';
import { AuthService } from './auth.service';
import { PaymentApi } from './payment-api.service';
describe('Persisted purchases', () => {
  it('filters backend results by account and hides them on logout', async () => {
    const user = signal({ id: 'a' }),
      authenticated = signal(true);
    const request = vi.fn().mockResolvedValue([
      { id: 'order-a', usuarioId: 'a' },
      { id: 'order-b', usuarioId: 'b' },
    ]);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated: authenticated, user } },
        { provide: PaymentApi, useValue: { request } },
      ],
    });
    const service = TestBed.inject(ComprasService);
    expect(service.purchases()).toEqual([]);
    await service.load();
    expect(request).toHaveBeenCalledWith('/purchases');
    expect(service.purchases().map((p) => p.id)).toEqual(['order-a']);
    authenticated.set(false);
    expect(service.purchases()).toEqual([]);
    expect('add' in service).toBe(false);
  });
  it('does not publish a late response after switching accounts', async () => {
    const user = signal({ id: 'a' });
    let finish!: (data: unknown) => void;
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated: () => true, user } },
        {
          provide: PaymentApi,
          useValue: { request: () => new Promise((resolve) => (finish = resolve)) },
        },
      ],
    });
    const service = TestBed.inject(ComprasService),
      pending = service.load();
    user.set({ id: 'b' });
    finish([{ id: 'order-a', usuarioId: 'a' }]);
    await pending;
    expect(service.purchases()).toEqual([]);
  });
});
