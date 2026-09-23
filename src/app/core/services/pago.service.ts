import { Injectable, inject } from '@angular/core';
import { PaymentApi } from './payment-api.service';
import { CartItem } from '../../models/store.models';
export interface PayPalOrder {
  processing?: boolean;
  productos?: CartItem[];
  paypalOrderId: string;
  numeroOrden: string;
  subtotal: number;
  iva: number;
  total: number;
  status: string;
  message?: string;
}
export interface PayPalSession {
  start(options: { presentationMode: 'popup' }, order: Promise<{ orderId: string }>): Promise<void>;
  destroy?: () => void;
}
export interface PayPalInstance {
  findEligibleMethods(options: {
    currencyCode: string;
  }): Promise<{ isEligible(method: string): boolean }>;
  createPayPalOneTimePaymentSession(options: {
    onApprove: (data: { orderId: string }) => Promise<void>;
    onCancel: () => void;
    onError: () => void;
  }): PayPalSession;
}
declare global {
  interface Window {
    paypal?: {
      createInstance(options: {
        clientId: string;
        components: string[];
        pageType: string;
      }): Promise<PayPalInstance>;
    };
  }
}
@Injectable({ providedIn: 'root' })
export class PagoService {
  private readonly api = inject(PaymentApi);
  private script?: Promise<void>;
  create() {
    return this.api.request<PayPalOrder>('/paypal/orders', 'POST');
  }
  current() {
    return this.api.request<PayPalOrder | null>('/paypal/orders/current');
  }
  capture(id: string) {
    return this.api.request<PayPalOrder>(
      `/paypal/orders/${encodeURIComponent(id)}/capture`,
      'POST',
    );
  }
  async sdk(): Promise<PayPalInstance> {
    const config = await this.api.request<{
      clientId: string;
      environment: string;
      currency: string;
    }>('/paypal/config', 'GET', undefined, false);
    if (config.environment !== 'sandbox' || config.currency !== 'USD')
      throw new Error('Solo PayPal Sandbox en USD está habilitado.');
    if (!this.script) {
      this.script = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://www.sandbox.paypal.com/web-sdk/v6/core';
        script.async = true;
        const timeout = setTimeout(() => {
          script.remove();
          reject(new Error('PayPal tardó demasiado en cargar. Reintenta.'));
        }, 20000);
        script.onload = () => {
          clearTimeout(timeout);
          resolve();
        };
        script.onerror = () => {
          clearTimeout(timeout);
          script.remove();
          reject(new Error('No se pudo cargar PayPal. Revisa tu conexión.'));
        };
        document.head.appendChild(script);
      }).catch((error) => {
        this.script = undefined;
        throw error;
      });
    }
    await this.script;
    if (!window.paypal) throw new Error('PayPal no está disponible.');
    return window.paypal.createInstance({
      clientId: config.clientId,
      components: ['paypal-payments'],
      pageType: 'checkout',
    });
  }
}
