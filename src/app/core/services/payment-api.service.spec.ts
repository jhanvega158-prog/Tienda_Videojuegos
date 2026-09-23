import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from './auth.service';
import { PaymentApi } from './payment-api.service';
import { environment } from '../../../environments/environment';
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
    expect(fetch.mock.calls[0][0]).toBe(`${environment.paymentApiUrl}/paypal/orders`);
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer unit-test-token');
    expect(fetch.mock.calls[0][1].body).toBeUndefined();
  });
  it('does not retry a payment or report it as rejected when the connection times out', async () => {
    const fetch = vi.fn().mockRejectedValue(new DOMException('Timed out', 'TimeoutError'));
    vi.stubGlobal('fetch', fetch);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { getSession: async () => ({ access_token: 'test-token' }) } }],
    });
    await expect(TestBed.inject(PaymentApi).request('/paypal/orders/ORDER123/capture', 'POST'))
      .rejects.toThrow('Si aprobaste un pago, consulta la misma orden antes de volver a pagar.');
    expect(fetch).toHaveBeenCalledTimes(1);
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
