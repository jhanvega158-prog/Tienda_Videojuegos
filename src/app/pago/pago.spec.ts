import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { Pago } from './pago';
import { PagoService } from '../core/services/pago.service';
import { CarritoService } from '../core/services/carrito.service';
describe('PayPal checkout boundary', () => {
  let callbacks: {
    onApprove: (d: { orderId: string }) => Promise<void>;
    onCancel: () => void;
    onError: () => void;
  };
  const capture = vi.fn(),
    create = vi.fn(),
    start = vi.fn();
  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: CarritoService,
          useValue: {
            reload: vi.fn(),
            error: signal(''),
            items: signal([]),
            subtotal: () => 0,
            iva: () => 0,
            total: () => 0,
          },
        },
        {
          provide: PagoService,
          useValue: {
            capture,
            create,
            current: async () => null,
            sdk: async () => ({
              findEligibleMethods: async () => ({ isEligible: () => true }),
              createPayPalOneTimePaymentSession: (options: typeof callbacks) => {
                callbacks = options;
                return { start };
              },
            }),
          },
        },
      ],
    });
  });
  it('does not show success for a pending capture or an SDK cancellation', async () => {
    const component = TestBed.runInInjectionContext(() => new Pago());
    await component.initialize();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    capture.mockResolvedValue({ status: 'PROCESANDO' });
    await callbacks.onApprove({ orderId: 'PAYPALORDER123' });
    expect(navigate).not.toHaveBeenCalled();
    expect(component.needsCapture()).toBe(true);
    callbacks.onCancel();
    expect(component.processing()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    expect(capture).toHaveBeenCalledTimes(1);
  });
  it('navigates only after the backend returns PAGADA', async () => {
    const component = TestBed.runInInjectionContext(() => new Pago());
    await component.initialize();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    capture.mockResolvedValue({ status: 'PAGADA', numeroOrden: 'JJC-1' });
    await callbacks.onApprove({ orderId: 'PAYPALORDER123' });
    expect(navigate).toHaveBeenCalledWith(['/pago-confirmado'], {
      queryParams: { orden: 'JJC-1' },
    });
  });
  it('ignores a second click while a payment session is active', async () => {
    const component = TestBed.runInInjectionContext(() => new Pago());
    await component.initialize();
    create.mockResolvedValue({ paypalOrderId: 'PAYPALORDER123' });
    start.mockImplementation(async (_options, promise) => {
      await promise;
    });
    await component.pay();
    await component.pay();
    expect(create).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
  });
});
