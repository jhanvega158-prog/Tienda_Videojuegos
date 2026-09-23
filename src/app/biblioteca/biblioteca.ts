import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ComprasService } from '../core/services/compras.service';
import { Game } from '../models/store.models';
@Component({
  selector: 'app-biblioteca',
  imports: [RouterLink],
  template: `<section class="page">
    <div class="page-head">
      <span class="eyebrow">TUS MUNDOS. TU ESPACIO.</span>
      <h1>Mi biblioteca</h1>
      <p>Tus videojuegos adquiridos.</p>
    </div>
    @if (loading()) {
      <p role="status">Cargando biblioteca...</p>
    } @else if (error()) {
      <p role="alert">{{ error() }}</p>
      <button (click)="load()">Reintentar</button>
    } @else {
      <div class="library-grid">
        @for (game of games(); track game.id) {
          <article class="panel">
            <img [src]="game.imagen" [alt]="game.titulo" />
            <h2>{{ game.titulo }}</h2>
            <a [routerLink]="['/juego', game.id]">Ver videojuego</a>
          </article>
        } @empty {
          <div class="empty">
            <h2>Aún no tienes juegos en tu biblioteca</h2>
            <a routerLink="/catalogo" class="button">Explorar catálogo</a>
          </div>
        }
      </div>
    }
  </section>`,
  styles: [
    '.library-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px}.panel img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:12px}',
  ],
})
export class Biblioteca {
  private readonly purchases = inject(ComprasService);
  readonly games = signal<Game[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  constructor() {
    void this.load();
  }
  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.games.set(await this.purchases.library());
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
}
