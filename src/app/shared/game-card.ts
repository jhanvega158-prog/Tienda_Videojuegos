import { Parallax } from './motion.directive';
import { AuthService } from '../core/services/auth.service';
import { Component, inject, input, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Game } from '../models/store.models';
import { CarritoService } from '../core/services/carrito.service';
import { FavoritosLocalService } from '../core/services/favoritos-local.service';
import { Icon } from './icon';
import { GameImage } from './game-image';

@Component({
  selector: 'app-game-card',
  imports: [Parallax, RouterLink, CurrencyPipe, Icon, GameImage],
  template: ` <article class="game-card">
    <div class="game-image parallax-media" appParallax [parallaxSpeed]="0.06" [parallaxRange]="10">
      <a [routerLink]="['/juego', game().id]"
        ><img
          appGameImage
          [src]="game().imagen"
          [alt]="game().titulo"
          loading="lazy"
          decoding="async"
          width="460"
          height="259"
      /></a>
      <span class="platform-badge">{{ game().plataforma }}</span>
      @if (auth.isAuthenticated()) {
        <button
          class="favorite-button"
          [class.selected]="favorites.has(game().id)"
          (click)="favorites.toggle(game().id)"
          [attr.aria-pressed]="favorites.has(game().id)"
          [attr.aria-label]="
            (favorites.has(game().id) ? 'Quitar de favoritos: ' : 'Agregar a favoritos: ') +
            game().titulo
          "
        >
          <app-icon name="heart" />
        </button>
      }
    </div>
    <div class="card-body">
      <div class="card-labels">
        <span class="tag">{{ game().categoria }}</span>
        @if (game().calificacion) {
          <span class="rating">★ {{ game().calificacion }}</span>
        }
      </div>
      <h3>
        <a [routerLink]="['/juego', game().id]">{{ game().titulo }}</a>
      </h3>
      <div class="price-line">
        <strong>{{ game().precio | currency: 'USD' }}</strong
        ><span class="availability">{{ game().stock ? 'Disponible' : 'Sin stock' }}</span>
      </div>
      <div class="card-actions">
        <a class="button ghost" [routerLink]="['/juego', game().id]"
          >Ver juego <app-icon name="arrow"
        /></a>
        @if (auth.isAuthenticated()) {
          <button
            class="icon-button card-add"
            (click)="add()"
            [disabled]="!game().stock"
            [attr.aria-label]="'Agregar al carrito: ' + game().titulo"
            title="Agregar al carrito"
          >
            <app-icon name="cart" />Agregar
          </button>
        }
      </div>
      <span class="card-feedback" aria-live="polite">{{ feedback() }}</span>
    </div>
  </article>`,
})
export class GameCard {
  readonly auth = inject(AuthService);
  readonly game = input.required<Game>();
  readonly favorites = inject(FavoritosLocalService);
  private readonly cart = inject(CarritoService);
  readonly feedback = signal('');
  async add(): Promise<void> {
    this.feedback.set(
      (await this.cart.add(this.game()))
        ? 'Agregado al carrito'
        : this.cart.error() || 'No se pudo agregar el videojuego',
    );
  }
}
