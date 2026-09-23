import { Parallax } from './shared/motion.directive';
import { afterNextRender, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './header/header';
import { Footer } from './footer/footer';
import { SupabaseService } from './core/services/supabase.service';

@Component({
  selector: 'app-root',
  imports: [Parallax, RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('front_bd2');
  private readonly supabase = inject(SupabaseService);

  constructor() {
    afterNextRender(() => {
      void this.supabase.verificarConexion();
    });
  }
}
