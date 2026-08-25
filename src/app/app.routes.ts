import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'fila',
    loadComponent: () => import('./features/fila/pages/fila-page/fila-page.component')
      .then((component) => component.FilaPageComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/pages/dashboard-page/dashboard-page.component')
      .then((component) => component.DashboardPageComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'fila' },
  { path: '**', redirectTo: 'fila' },
];
