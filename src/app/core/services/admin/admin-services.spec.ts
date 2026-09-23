import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { AuthService } from '../auth.service';
import { SupabaseService } from '../supabase.service';
import { AdminApi } from './admin-api.service';
import { AdminUsuariosService } from './admin-usuarios.service';
import { AdminReportesService } from './admin-reportes.service';
import { AdminOrdenesService } from './admin-ordenes.service';
describe('Administrative access and reporting', () => {
  it('rejects CLIENTE writes before contacting the database', async () => {
    const client = { from: vi.fn() };
    const auth = { refresh: vi.fn(), isAdmin: () => false };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: SupabaseService, useValue: { client } },
      ],
    });
    await expect(TestBed.inject(AdminApi).save('videojuegos', { nombre: 'Test' })).rejects.toThrow(
      'ADMIN',
    );
    expect(client.from).not.toHaveBeenCalled();
  });
  it('does not report an RLS-hidden update as successful', async () => {
    const query: any = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: null, error: { code: 'PGRST116', message: 'No rows' } })),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { refresh: vi.fn(), isAdmin: () => true } },
        { provide: SupabaseService, useValue: { client: { from: () => query } } },
      ],
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      TestBed.inject(AdminApi).save('videojuegos', { activo: false }, 9),
    ).rejects.toThrow('PGRST116');
    log.mockRestore();
  });
  it('prevents changing the current admin account state', async () => {
    const api = { authorize: vi.fn(), save: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: AdminApi, useValue: api },
        { provide: AuthService, useValue: { profile: signal({ id: 2 }) } },
      ],
    });
    await expect(TestBed.inject(AdminUsuariosService).setActive(2, false)).rejects.toThrow(
      'propia cuenta',
    );
    expect(api.save).not.toHaveBeenCalled();
  });
  it('counts all orders but sales and units only from paid orders', async () => {
    const query = { in: vi.fn() };
    const api = {
      all: vi.fn(async (_t, _c, filter) => {
        filter(query);
        return [{ cantidad: 2 }, { cantidad: 3 }];
      }),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AdminApi, useValue: api },
        {
          provide: AdminOrdenesService,
          useValue: {
            list: vi.fn(async () => [
              { id: 1, estado: 'PAGADA', total: '25.50' },
              { id: 2, estado: 'PENDIENTE', total: 100 },
              { id: 3, estado: 'CANCELADA', total: 50 },
            ]),
          },
        },
      ],
    });
    const data = await TestBed.inject(AdminReportesService).load('2026-09-01', '2026-09-22');
    expect(data.ordenes.length).toBe(3);
    expect(data.ventas).toBe(25.5);
    expect(data.unidades).toBe(5);
    expect(query.in).toHaveBeenCalledWith('id_orden', [1]);
  });
  it('rejects an inverted report range before any query', async () => {
    const orders = { list: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: AdminApi, useValue: {} },
        { provide: AdminOrdenesService, useValue: orders },
      ],
    });
    await expect(
      TestBed.inject(AdminReportesService).load('2026-09-22', '2026-09-01'),
    ).rejects.toThrow();
    expect(orders.list).not.toHaveBeenCalled();
  });
});
