import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CarritoService } from '../core/services/carrito.service';
import { PagoService, PayPalOrder, PayPalSession } from '../core/services/pago.service';
import { Icon } from '../shared/icon';
@Component({
  selector: 'app-pago',
  imports: [CurrencyPipe, RouterLink, Icon],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './pago.html',
  styleUrl: '../checkout/checkout.css',
})
export class Pago implements OnInit, OnDestroy {
  readonly cart = inject(CarritoService);
  private readonly payments = inject(PagoService);
  private readonly router = inject(Router);
  private session?: PayPalSession;
  private destroyed = false;
  readonly processing = signal(false);
  readonly ready = signal(false);
  readonly loading = signal(true);
  readonly message = signal('');
  readonly order = signal<PayPalOrder | null>(null);
  readonly needsCapture = signal(false);
  async ngOnInit() {
    await this.initialize();
  }
  async initialize(): Promise<void> {
    this.loading.set(true);
    this.message.set('');
    try {
      await this.cart.reload();
      if (this.cart.error()) throw new Error(this.cart.error());
      const pending = await this.payments.current();
      this.order.set(pending);
      this.needsCapture.set(pending?.processing ?? false);
      const sdk = await this.payments.sdk();
      const eligible = await sdk.findEligibleMethods({ currencyCode: 'USD' });
      if (!eligible.isEligible('paypal'))
        throw new Error('PayPal no está disponible para esta cuenta o navegador.');
      if (this.destroyed) return;
      this.session?.destroy?.();
      this.session = sdk.createPayPalOneTimePaymentSession({
        onApprove: async ({ orderId }) => {
          await this.capture(orderId);
        },
        onCancel: () => {
          if (!this.destroyed) {
            this.processing.set(false);
            this.message.set(
              this.needsCapture()
                ? 'La confirmación está pendiente. Consulta el estado de esta orden antes de volver a pagar.'
                : 'El pago fue cancelado. No se realizó ningún cargo.',
            );
          }
        },
        onError: () => {
          if (!this.destroyed) {
            this.processing.set(false);
            this.message.set(
              'PayPal no pudo completar el proceso. Reintenta o consulta Mis compras.',
            );
          }
        },
      });
      this.ready.set(true);
    } catch (e) {
      this.message.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
  async pay(): Promise<void> {
    if (this.processing() || !this.session || this.destroyed) return;
    this.processing.set(true);
    this.message.set('');
    try {
      await this.session.start(
        { presentationMode: 'popup' },
        this.payments.create().then((order) => {
          this.order.set(order);
          return { orderId: order.paypalOrderId };
        }),
      );
    } catch (e) {
      this.processing.set(false);
      this.message.set(
        e instanceof Error
          ? e.message
          : 'No se pudo abrir PayPal. Permite ventanas emergentes y reintenta.',
      );
    }
  }
  async capture(id = this.order()?.paypalOrderId): Promise<void> {
    if (!id) return;
    this.processing.set(true);
    this.needsCapture.set(true);
    this.message.set('');
    try {
      const result = await this.payments.capture(id);
      if (result.status !== 'PAGADA') {
        if (result.status === 'RECHAZADO') {
          this.needsCapture.set(false);
          this.order.set(null);
        }
        this.message.set(result.message ?? 'El pago todavía no está confirmado.');
        return;
      }
      this.needsCapture.set(false);
      await this.cart.reload();
      if (!this.destroyed)
        await this.router.navigate(['/pago-confirmado'], {
          queryParams: { orden: result.numeroOrden },
        });
    } catch (e) {
      this.message.set((e as Error).message);
    } finally {
      this.processing.set(false);
    }
  }
  ngOnDestroy(): void {
    this.destroyed = true;
    this.session?.destroy?.();
  }
}
