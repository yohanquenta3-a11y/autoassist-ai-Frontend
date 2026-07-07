import { Routes } from '@angular/router';

const loadDashboardLayoutComponent = () =>
  import('@core/layout/dashboard-layout/dashboard-layout.component').then(
    c => c.DashboardLayoutComponent
  );

export const transfersRoutes: Routes = [
  {
    path: '',
    loadComponent: loadDashboardLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/transfer-inbox/transfer-inbox.component').then(
            m => m.TransferInboxComponent
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./pages/transfer-detail/transfer-detail.component').then(
            m => m.TransferDetailComponent
          ),
      },
    ],
  },
];
