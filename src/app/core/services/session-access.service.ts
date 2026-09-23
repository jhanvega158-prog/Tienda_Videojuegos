import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
@Injectable({ providedIn: 'root' })
export class SessionAccess {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  async ensure(): Promise<boolean> {
    try {
      await this.auth.refresh();
      if (this.auth.isAuthenticated()) return true;
    } catch (error) {
      this.auth.report(error);
    }
    await this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
    return false;
  }
}
export function safeReturnUrl(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value))
    return '/';
  // Solo destinos internos de la tienda; nunca esquemas externos, login o administración.
  const path = value.split(/[?#]/)[0];
  return /^\/(?:|catalogo|nosotros|juego\/\d+|carrito|checkout|compras|biblioteca|favoritos|compra\/[^/]+)$/.test(
    path,
  )
    ? value
    : '/';
}
