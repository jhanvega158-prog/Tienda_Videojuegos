import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoritosLocalService } from '../core/services/favoritos-local.service';
import { CatalogService } from '../core/services/catalog.service';
import { GameCard } from '../shared/game-card';
import { Icon } from '../shared/icon';
@Component({
  selector: 'app-favoritos',
  imports: [RouterLink, GameCard, Icon],
  template: `<section class="page">
    <div class="page-head">
      <span class="eyebrow">GUARDA TU PRÓXIMA AVENTURA</span>
      <h1>Mis favoritos</h1>
      <p>Los juegos que te gustaría descubrir. Guardados en este navegador.</p>
    </div>
    <div class="game-grid">
      @for (game of games(); track game.id) {
        <app-game-card [game]="game" />
      }
    </div>
    @if (!games().length) {
      <div class="empty">
        <app-icon name="heart" />
        <h2>Tu próxima obsesión está por llegar</h2>
        <p>Toca el corazón de un juego para encontrarlo aquí cuando quieras.</p>
        <a routerLink="/catalogo" class="button">Explorar catálogo</a>
      </div>
    }
  </section>`,
})
export class Favoritos {
  private favorites = inject(FavoritosLocalService);
  private catalog = inject(CatalogService);
  readonly games = computed(() => this.catalog.games.filter((g) => this.favorites.has(g.id)));
}
