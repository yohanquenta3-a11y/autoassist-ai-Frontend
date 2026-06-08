import { Routes } from '@angular/router';

const loadDashboardLayoutComponent = () =>
  import('@core/layout/dashboard-layout/dashboard-layout.component').then(
    c => c.DashboardLayoutComponent
  );

const loadPlaceholderRoutePageComponent = () =>
  import('@shared/ui/placeholder-route-page/placeholder-route-page.component').then(
    c => c.PlaceholderRoutePageComponent
  );

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: loadDashboardLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'tenants',
        pathMatch: 'full'
      },
      {
        path: 'tenants',
        loadComponent: () => import('./pages/tenant-isolation/tenant-isolation.page').then(m => m.TenantIsolationPage)
      },
      {
        path: 'users',
        data: {
          placeholder: {
            title: 'Administracion de Usuarios',
            description: 'Gestion de cuentas, roles y permisos de la plataforma',
            icon: '👥',
          },
        },
        loadComponent: loadPlaceholderRoutePageComponent,
      },
      {
        path: 'settings',
        data: {
          placeholder: {
            title: 'Configuracion de la Plataforma',
            description: 'Parametros generales del sistema y configuracion global',
            icon: '⚙️',
          },
        },
        loadComponent: loadPlaceholderRoutePageComponent,
      },
      {
        path: 'audit',
        data: {
          placeholder: {
            title: 'Auditoria del Sistema',
            description: 'Registro detallado de acciones y eventos criticos',
            icon: '🔍',
          },
        },
        loadComponent: loadPlaceholderRoutePageComponent,
      },
      {
        path: 'integrations',
        data: {
          placeholder: {
            title: 'Integraciones Externas',
            description: 'Gestion de conexiones con servicios y APIs de terceros',
            icon: '🔌',
          },
        },
        loadComponent: loadPlaceholderRoutePageComponent,
      },
    ],
  },
];

