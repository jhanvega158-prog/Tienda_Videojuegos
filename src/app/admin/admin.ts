import { Component, inject, signal, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icon } from '../shared/icon';
import { AuthService } from '../core/services/auth.service';
@Component({
  selector: 'app-admin',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Icon],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
  encapsulation: ViewEncapsulation.None,
})
export class Admin {
  readonly expanded = signal(false);
  readonly error = signal('');
  readonly busy = signal(false);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly sections = [
    { name: 'Dashboard', path: '/admin', icon: 'grid' },
    { name: 'Productos', path: '/admin/productos', icon: 'game' },
    { name: 'Categorías', path: '/admin/categorias', icon: 'compass' },
    { name: 'Usuarios', path: '/admin/usuarios', icon: 'user' },
    { name: 'Órdenes', path: '/admin/ordenes', icon: 'bag' },
    { name: 'Pagos', path: '/admin/pagos', icon: 'card' },
    { name: 'Reportes', path: '/admin/reportes', icon: 'flag' },
  ];
  async logout() {
    this.busy.set(true);
    try {
      await this.auth.logout();
      await this.router.navigateByUrl('/');
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
