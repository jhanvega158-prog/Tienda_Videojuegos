import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../core/services/catalog.service';
import { GameCard } from '../shared/game-card';
import { Icon } from '../shared/icon';
import { Parallax, Reveal } from '../shared/motion.directive';
@Component({
  selector: 'app-home',
  imports: [RouterLink, GameCard, Icon, Parallax, Reveal],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  readonly catalog = inject(CatalogService);
  get featured() {
    return this.catalog.games.filter((game) => game.destacado).slice(0, 4);
  }
  get heroGame() {
    return this.catalog.games.find((game) => game.titulo === 'Red Dead Redemption 2');
  }
  get categories() {
    return this.catalog.categories().map((category) => ({ name: category.nombre, icon: 'game' }));
  }
}
