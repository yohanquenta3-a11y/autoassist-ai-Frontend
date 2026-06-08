import { Component, signal, computed, inject, Output, EventEmitter } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '@features/identity/auth/state/auth.store';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import {
  Ambulance,
  Bot,
  Building2,
  Circle,
  Home,
  LayoutDashboard,
  LucideAngularModule,
  LucideIconData,
  Menu,
  Radar,
  Shield,
  User,
  Wallet,
  Wrench,
  X,
} from 'lucide-angular';

interface MenuItem {
  label: string;
  icon?: LucideIconData;
  path?: string;
  children?: MenuItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    MatListModule,
    MatExpansionModule,
    MatDividerModule,
    MatButtonModule,
    LucideAngularModule,
  ],
  template: `
    <nav class="sidebar-nav">
      <!-- Logo / Branding -->
      <div class="sidebar-brand">
        <div class="brand-logo">SM</div>
        <div class="brand-info">
          <h1 class="brand-title">SMART MECHANIC</h1>
          <p class="brand-subtitle">Plataforma SaaS</p>
        </div>
      </div>

      <mat-divider></mat-divider>

      <!-- Dashboard Home (sin hijos) -->
      <mat-nav-list class="sidebar-list">
        <a
          mat-list-item
          routerLink="/identity/home"
          routerLinkActive="active-link"
          class="nav-item"
        >
          <span matListItemIcon class="item-icon-wrap" aria-hidden="true">
            <lucide-icon [img]="dashboardIcon" [size]="18"></lucide-icon>
          </span>
          <span matListItemTitle>Dashboard</span>
        </a>
      </mat-nav-list>

      <mat-divider></mat-divider>

      <!-- Menú con submenús usando MatExpansionPanel -->
      <mat-accordion class="sidebar-accordion" [multi]="true">
        @for (item of menuItems(); track item.label) {
          <mat-expansion-panel class="sidebar-panel">
            <mat-expansion-panel-header class="panel-header">
              <mat-panel-title class="panel-title">
                <span class="panel-icon" aria-hidden="true">
                  <lucide-icon [img]="item.icon" [size]="17"></lucide-icon>
                </span>
                {{ item.label }}
              </mat-panel-title>
            </mat-expansion-panel-header>

            <!-- Sub-items -->
            <mat-nav-list class="sub-list">
              @for (child of item.children ?? []; track child.label) {
                <a
                  mat-list-item
                  [routerLink]="child.path"
                  routerLinkActive="active-link"
                  class="sub-item"
                  (click)="menuItemClicked.emit()"
                >
                  <span matListItemTitle>{{ child.label }}</span>
                </a>
              }
            </mat-nav-list>
          </mat-expansion-panel>
        }
      </mat-accordion>
    </nav>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .sidebar-nav {
      width: 100%;
      height: 100%;
      overflow-y: auto;
      padding: 0;
      background:
        radial-gradient(circle at -30% -20%, rgb(var(--sm-rgb-sapphire-500) / 0.2), transparent 45%),
        linear-gradient(160deg, var(--sm-color-gunmetal-850), var(--sm-color-gunmetal-900));
      color: var(--sm-color-text-main);
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1.25rem 1rem;
    }

    .brand-logo {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.7rem;
      background: linear-gradient(
        135deg,
        var(--sm-color-sapphire-500),
        var(--sm-color-sapphire-700)
      );
      color: var(--sm-color-white);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.9rem;
      flex-shrink: 0;
      box-shadow:
        0 8px 16px -10px rgb(var(--sm-rgb-sapphire-500) / 0.9),
        inset 0 1px 0 rgb(var(--sm-rgb-white) / 0.2);
    }

    .brand-title {
      font-size: 0.95rem;
      font-weight: 700;
      margin: 0;
      color: var(--sm-color-text-title);
    }

    .brand-subtitle {
      font-size: 0.7rem;
      color: var(--sm-color-text-soft);
      margin: 0;
    }

    mat-divider {
      border-top-color: rgb(var(--sm-rgb-slate-400) / 0.18);
    }

    .sidebar-list {
      padding: 0.25rem 0;
    }

    .nav-item {
      color: var(--sm-color-text-main);
      border-radius: 0.6rem;
      margin: 0.25rem 0.5rem;
      transition: background 0.2s ease, color 0.2s ease;
    }

    .item-icon-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .nav-item:hover {
      background: rgb(var(--sm-rgb-sapphire-500) / 0.12);
    }

    .nav-item.active-link {
      background: linear-gradient(
        145deg,
        rgb(var(--sm-rgb-sapphire-500) / 0.24),
        rgb(var(--sm-rgb-sapphire-450) / 0.18)
      );
      color: var(--sm-color-sapphire-100);
      border: 1px solid rgb(var(--sm-rgb-sapphire-400) / 0.35);
    }

    .sidebar-accordion {
      padding: 0.5rem 0.5rem;
    }

    .sidebar-panel {
      box-shadow: none !important;
      background: transparent;
      margin-bottom: 0.25rem;
    }

    .panel-header {
      border-radius: 0.6rem;
      min-height: 48px !important;
      transition: background 0.2s ease;
    }

    .panel-header:hover {
      background: rgb(var(--sm-rgb-sapphire-500) / 0.12);
    }

    .panel-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--sm-color-text-main);
    }

    .panel-icon {
      width: 1.5rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--sm-color-sapphire-300);
    }

    .sub-list {
      padding: 0;
    }

    .sub-item {
      font-size: 0.8rem !important;
      min-height: 40px !important;
      padding-left: 2.5rem !important;
      margin: 0.15rem 0.25rem;
      border-radius: 0.5rem;
      color: var(--sm-color-text-soft);
    }

    .sub-item:hover {
      background: rgb(var(--sm-rgb-sapphire-500) / 0.1);
      color: var(--sm-color-sapphire-100);
    }

    .sub-item.active-link {
      color: var(--sm-color-sapphire-100);
      font-weight: 600;
      background: rgb(var(--sm-rgb-sapphire-500) / 0.18);
      border: 1px solid rgb(var(--sm-rgb-sapphire-400) / 0.3);
    }

    .sub-dot {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--sm-color-text-muted);
    }

    .mobile-fab {
      display: none;
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 200;
      background: linear-gradient(
        145deg,
        var(--sm-color-sapphire-500),
        var(--sm-color-sapphire-600)
      );
      color: var(--sm-color-white);
      box-shadow: 0 10px 20px -12px rgb(var(--sm-rgb-sapphire-500) / 0.95);
    }

    @media (max-width: 960px) {
      .mobile-fab {
        display: flex;
      }
    }
  `]
})
export class SidebarComponent {
  authStore = inject(AuthStore);
  
  @Output() menuItemClicked = new EventEmitter<void>();

  protected readonly dashboardIcon = LayoutDashboard;
  protected readonly subItemIcon = Circle;

  // --- BLOQUE COMÚN ---
  private readonly menuInicio: MenuItem = {
    label: 'Inicio',
    icon: Home,
    path: '/identity/home'
  };

  // --- BLOQUES DE MENÚ PARA SUPERADMIN ---
  private readonly menuAdminPlataforma: MenuItem = {
    label: 'Administración de la Plataforma',
    icon: Building2,
    children: [
      { label: 'Gestionar tenants y aislamiento', path: '/admin/tenants' },
      { label: 'Gestionar talleres registrados', path: '/monitoring/workshops' },
      { label: 'Supervisar operaciones de la plataforma', path: '/monitoring/command-center' },
      { label: 'Consultar bitácora / historial del sistema', path: '/monitoring/audit' },
    ],
  };

  private readonly menuIdentidadSuper: MenuItem = {
    label: 'Onboarding y Gestión de Identidad',
    icon: User,
    children: [
      { label: 'Gestionar perfil (Usuarios)', path: '/identity/onboarding/users' },
    ],
  };

  private readonly menuMonitoreoSuper: MenuItem = {
    label: 'Monitoreo, Experiencia y Trazabilidad',
    icon: Radar,
    children: [
      { label: 'Monitor en Tiempo Real', path: '/emergencies/active' },
      { label: 'Consultar historial de servicios', path: '/monitoring/history' },
    ],
  };

  private readonly menuFinanzasSuper: MenuItem = {
    label: 'Monetización y Gestión Financiera',
    icon: Wallet,
    children: [
      { label: 'Gestionar comisión del taller', path: '/finance/dashboard' },
      { label: 'Generar reportes', path: '/finance/reports' },
    ],
  };

  // --- BLOQUES DE MENÚ PARA ADMIN TALLER ---
  private readonly menuOperacionTaller: MenuItem = {
    label: 'Operación de Talleres',
    icon: Wrench,
    children: [
      { label: 'Visualizar solicitudes', path: '/workshops/assignments' },
      { label: 'Gestionar técnicos y disponibilidad', path: '/workshops/team' },
      { label: 'Gestionar Citas', path: '/workshops/calendar' },
    ],
  };

  private readonly menuMonitoreoTaller: MenuItem = {
    label: 'Monitoreo, Experiencia y Trazabilidad',
    icon: Radar,
    children: [
      { label: 'Monitor de Incidentes', path: '/emergencies/active' },
      { label: 'Consultar historial de servicios', path: '/monitoring/history' },
      { label: 'Bitácora de auditoría', path: '/monitoring/audit' },
    ],
  };

  private readonly menuFinanzasTaller: MenuItem = {
    label: 'Monetización y Gestión Financiera',
    icon: Wallet,
    children: [
      { label: 'Gestionar comisión del taller', path: '/finance/dashboard' },
      { label: 'Generar reportes', path: '/finance/reports' },
    ],
  };

  // Computamos los menús basándonos en el rol del usuario
  menuItems = computed(() => {
    const user = this.authStore.user();
    const role = (user?.rol_nombre || '').toLowerCase().trim();

    if (role === 'admin_taller' || role === 'admin' || role === 'taller') {
      const isOwner = user?.rol_contexto === 'owner';
      const isBranchAdmin = user?.rol_contexto === 'admin_sucursal';

      const children: MenuItem[] = [
        { label: 'Gestionar usuarios de taller', path: '/identity/onboarding/users' }
      ];

      if (isOwner) {
        children.push({ label: 'Gestionar taller', path: '/workshops/register' });
        children.push({ label: 'Gestionar talleres', path: '/workshops/branches' });
      } else if (isBranchAdmin) {
        children.push({ label: 'Configurar mi sucursal', path: '/workshops/my-branch' });
      } else {
        // Fallback de seguridad
        children.push({ label: 'Gestionar taller', path: '/workshops/register' });
        children.push({ label: 'Gestionar talleres', path: '/workshops/branches' });
        children.push({ label: 'Configurar mi sucursal', path: '/workshops/my-branch' });
      }

      const menuIdentidadTallerSeg: MenuItem = {
        label: 'Onboarding y Gestión de Identidad',
        icon: User,
        children
      };

      return [
        menuIdentidadTallerSeg,
        this.menuOperacionTaller,
        this.menuMonitoreoTaller,
        this.menuFinanzasTaller
      ];
    }

    if (role === 'superadmin' || role === 'admin_sistema' || role === 'root') {
      return [
        this.menuAdminPlataforma,
        this.menuIdentidadSuper,
        this.menuMonitoreoSuper,
        this.menuFinanzasSuper
      ];
    }

    return [];
  });
}
