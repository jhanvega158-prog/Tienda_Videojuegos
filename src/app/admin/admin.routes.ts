import { Routes } from '@angular/router';
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/dashboard').then((m) => m.AdminDashboard),
  },
  {
    path: 'productos',
    loadComponent: () => import('./pages/productos').then((m) => m.AdminProductos),
  },
  {
    path: 'categorias',
    loadComponent: () => import('./pages/categorias').then((m) => m.AdminCategorias),
  },
  {
    path: 'usuarios',
    loadComponent: () => import('./pages/usuarios').then((m) => m.AdminUsuarios),
  },
  { path: 'ordenes', loadComponent: () => import('./pages/ordenes').then((m) => m.AdminOrdenes) },
  { path: 'pagos', loadComponent: () => import('./pages/pagos').then((m) => m.AdminPagos) },
  {
    path: 'reportes',
    loadComponent: () => import('./pages/reportes').then((m) => m.AdminReportes),
  },
];
