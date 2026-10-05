import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'fila',
    loadComponent: () => import('./features/fila/pages/fila-page/fila-page.component')
      .then((component) => component.FilaPageComponent),
  },
  {
    path: 'cardapio',
    loadComponent: () => import('./features/cardapio/pages/cardapio-page/cardapio-page.component')
      .then((component) => component.CardapioPageComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/pages/dashboard-page/dashboard-page.component')
      .then((component) => component.DashboardPageComponent),
  },
  {
    path: 'fechamento',
    loadComponent: () => import('./features/fechamento/pages/fechamento-page/fechamento-page.component'),
  },
  { path: '', pathMatch: 'full', redirectTo: 'fila' },
  { path: '**', redirectTo: 'fila' },
];
