import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CatalogService } from '../core/services/catalog.service';
import { GameCard } from '../shared/game-card';
import { Icon } from '../shared/icon';
@Component({
  selector: 'app-catalogo',
  imports: [GameCard, Icon],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class Catalogo {
  readonly catalog = inject(CatalogService);
  readonly query = signal('');
  readonly category = signal('Todas');
  get categories() {
    return ['Todas', ...this.catalog.categories().map((category) => category.nombre)];
  }
  readonly games = computed(() =>
    this.catalog.games.filter(
      (g) =>
        (this.category() === 'Todas' || g.categoria === this.category()) &&
        g.titulo.toLowerCase().includes(this.query().toLowerCase()),
    ),
  );
  constructor() {
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const category = params.get('categoria');
        this.category.set(category || 'Todas');
      });
  }
}
