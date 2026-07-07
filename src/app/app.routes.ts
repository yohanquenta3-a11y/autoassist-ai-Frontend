import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'auth/login',
    redirectTo: 'identity/auth',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    redirectTo: 'identity/auth',
    pathMatch: 'full'
  },
  {
    path: 'identity',
    loadChildren: () => import('./features/identity').then(m => m.identityRoutes)
  },
  {
    path: 'emergencies',
    loadChildren: () => import('./features/emergencies').then(m => m.emergenciesRoutes)
  },
  {
    path: 'monitoring',
    loadChildren: () => import('./features/monitoring').then(m => m.monitoringRoutes)
  },
  {
    path: 'processing',
    loadChildren: () => import('./features/processing').then(m => m.processingRoutes)
  },
  {
    path: 'workshops',
    loadChildren: () => import('./features/workshops').then(m => m.workshopsRoutes)
  },
  {
    path: 'quotations',
    loadChildren: () => import('./features/quotations').then(m => m.quotationsRoutes)
  },
  {
    path: 'transfers',
    loadChildren: () => import('./features/transfers').then(m => m.transfersRoutes)
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin').then(m => m.adminRoutes)
  },
  {
    path: 'finance',
    loadChildren: () => import('./features/finance').then(m => m.financeRoutes)
  },
  {
    path: 'billing',
    loadChildren: () => import('./features/finance').then(m => m.financeRoutes)
  },
  {
    path: '',
    loadChildren: () => import('./features/public/public.routes').then(m => m.publicRoutes)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
