import { PaymentApi } from './payment-api.service';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { AuthService } from './auth.service';
import { SessionAccess } from './session-access.service';
import { StorageService } from './storage.service';
import { CarritoService } from './carrito.service';
import { FavoritosLocalService } from './favoritos-local.service';
import { Game } from '../../models/store.models';
describe('Visitor cannot mutate customer state', () => {
  it('blocks direct cart and favorite service calls without a verified session', async () => {
    const storage = { get: vi.fn(), set: vi.fn() };
    const access = { ensure: vi.fn(async () => false) };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated: signal(false), user: signal(null) } },
        { provide: SessionAccess, useValue: access },
        { provide: StorageService, useValue: storage },
      ],
    });
    const cart = TestBed.inject(CarritoService),
      favorites = TestBed.inject(FavoritosLocalService);
    expect(await cart.add({ id: 1, stock: 10, precio: 20 } as Game)).toBe(false);
    await favorites.toggle(1);
    await cart.clear();
    expect(cart.count()).toBe(0);
    expect(favorites.ids()).toEqual([]);
    expect(storage.set).not.toHaveBeenCalled();
    expect(access.ensure).toHaveBeenCalledTimes(3);
  });
});

it('hides persisted cart from the previous account immediately', async () => {
  const user = signal<{ id: string } | null>({ id: 'a' }),
    authenticated = signal(true);
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: { isAuthenticated: authenticated, user } },
      { provide: SessionAccess, useValue: {} },
      {
        provide: PaymentApi,
        useValue: { request: async () => [{ game: { id: 1, precio: 5 }, cantidad: 2 }] },
      },
    ],
  });
  const cart = TestBed.inject(CarritoService);
  await cart.reload();
  expect(cart.count()).toBe(2);
  user.set({ id: 'b' });
  expect(cart.count()).toBe(0);
  authenticated.set(false);
  expect(cart.items()).toEqual([]);
});
