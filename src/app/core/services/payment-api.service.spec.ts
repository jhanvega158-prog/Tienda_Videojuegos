import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from './auth.service';
import { PaymentApi } from './payment-api.service';
describe('Payment API', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('preserves service outage messages instead of claiming the session expired', async () => {
    const message = 'No se pudo conectar con el servicio de autenticación.';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 503, json: async () => ({ message }),
    }));
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { getSession: async () => ({ access_token: 'test-token' }) } }],
    });
    await expect(TestBed.inject(PaymentApi).request('/cart')).rejects.toThrow(message);
  });
  it('sends a Supabase bearer token without a client total or user id', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ paypalOrderId: 'ORDER123' }) });
    vi.stubGlobal('fetch', fetch);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { getSession: async () => ({ access_token: 'unit-test-token' }) },
        },
      ],
    });
    await TestBed.inject(PaymentApi).request('/paypal/orders', 'POST');
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer unit-test-token');
    expect(fetch.mock.calls[0][1].body).toBeUndefined();
  });
  it('does not send a payment request without a session', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { getSession: async () => null } }],
    });
    await expect(TestBed.inject(PaymentApi).request('/paypal/orders', 'POST')).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
});
