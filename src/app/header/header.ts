import { ScrollSurface } from '../shared/motion.directive';
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CarritoService } from '../core/services/carrito.service';
import { AuthService } from '../core/services/auth.service';
import { Icon } from '../shared/icon';
@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, Icon, ScrollSurface],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  readonly cart = inject(CarritoService);
  readonly auth = inject(AuthService);
  readonly signingOut = signal(false);
  readonly menuOpen = signal(false);
  async logout(): Promise<void> {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    try {
      await this.auth.logout();
      this.menuOpen.set(false);
    } catch (error) {
      this.auth.report(error);
    } finally {
      this.signingOut.set(false);
    }
  }
}
