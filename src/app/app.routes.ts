import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Nosotros } from './nosotros/nosotros';
import { Catalogo } from './catalogo/catalogo';
import { Compras } from './compras/compras';
import { DetalleJuego } from './detalle-juego/detalle-juego';
import { Carrito } from './carrito/carrito';
import { Checkout } from './checkout/checkout';
import { Pago } from './pago/pago';
import { Confirmacion } from './confirmacion/confirmacion';
import { Login } from './login/login';
import { Registro } from './registro/registro';
import { Favoritos } from './favoritos/favoritos';
import { Biblioteca } from './biblioteca/biblioteca';

import { authGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'home', redirectTo: '', pathMatch: 'full' },
  { path: 'nosotros', component: Nosotros },
  { path: 'catalogo', component: Catalogo },
  { path: 'juego/:id', component: DetalleJuego },
  { path: 'carrito', component: Carrito, canActivate: [authGuard] },
  { path: 'checkout', component: Checkout, canActivate: [authGuard] },
  { path: 'pago', component: Pago, canActivate: [authGuard] },
  { path: 'confirmacion', component: Confirmacion, canActivate: [authGuard] },
  { path: 'pago-confirmado', component: Confirmacion, canActivate: [authGuard] },
  { path: 'compras', component: Compras, canActivate: [authGuard] },
  { path: 'compra/:id', component: Confirmacion, canActivate: [authGuard] },
  { path: 'login', component: Login },
  { path: 'registro', component: Registro },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin').then((m) => m.Admin),
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  { path: 'favoritos', component: Favoritos, canActivate: [authGuard] },
  { path: 'biblioteca', component: Biblioteca, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
