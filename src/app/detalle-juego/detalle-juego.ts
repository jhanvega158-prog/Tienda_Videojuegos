import { Parallax } from '../shared/motion.directive';
import { AuthService } from '../core/services/auth.service';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { CatalogService } from '../core/services/catalog.service';
import { CarritoService } from '../core/services/carrito.service';
import { FavoritosLocalService } from '../core/services/favoritos-local.service';
import { Icon } from '../shared/icon';
import { GameImage } from '../shared/game-image';
@Component({
  selector: 'app-detalle-juego',
  imports: [Parallax, RouterLink, CurrencyPipe, Icon, GameImage],
  templateUrl: './detalle-juego.html',
  styleUrl: './detalle-juego.css',
})
export class DetalleJuego {
  readonly auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  catalog = inject(CatalogService);
  cart = inject(CarritoService);
  favorites = inject(FavoritosLocalService);
  feedback = signal('');
  game = computed(() => this.catalog.find(Number(this.route.snapshot.paramMap.get('id'))));
  async add(): Promise<void> {
    const game = this.game();
    if (game)
      this.feedback.set(
        (await this.cart.add(game)) ? 'Agregado al carrito' : this.cart.error() || 'No se pudo agregar el videojuego',
      );
  }
  goBack(): void {
    this.router.navigateByUrl('/catalogo');
  }
}
