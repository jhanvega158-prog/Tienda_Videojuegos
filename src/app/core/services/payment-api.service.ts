import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
@Injectable({ providedIn: 'root' })
export class PaymentApi {
  private readonly auth = inject(AuthService);
  async request<T>(path: string, method = 'GET', body?: unknown, authenticated = true): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authenticated) {
      const session = await this.auth.getSession();
      if (!session) throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    let response: Response;
    try {
      response = await fetch(`${environment.paymentApiUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store',
        // Allow the free backend to start after inactivity without retrying payments.
        signal: AbortSignal.timeout(120000),
      });
    } catch {
      throw new Error(
        'No se pudo conectar con el servidor. Si aprobaste un pago, consulta la misma orden antes de volver a pagar.',
      );
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401) throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
      if (response.status === 403)
        throw new Error('Esta operación requiere una cuenta CLIENTE y una orden propia.');
      throw new Error(data?.message ?? 'No se pudo completar la operación. Reintenta más tarde.');
    }
    return data as T;
  }
}
