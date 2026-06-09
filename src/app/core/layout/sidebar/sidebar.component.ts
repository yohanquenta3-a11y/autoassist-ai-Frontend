import { Component, computed, EventEmitter, inject, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  Building2,
  LayoutDashboard,
  LucideAngularModule,
  LucideIconData,
  Radar,
  User,
  Wallet,
  Wrench,
} from 'lucide-angular';

import { AuthStore } from '@features/identity/auth/state/auth.store';

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
      <div class="sidebar-brand">
        <div class="brand-logo" aria-hidden="true">
          <svg viewBox="0 0 64 64" class="brand-mark">
            <defs>
              <linearGradient id="sidebarLogo" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="var(--sm-color-copper-300)" />
                <stop offset="55%" stop-color="var(--sm-color-copper-500)" />
                <stop offset="100%" stop-color="var(--sm-color-copper-700)" />
              </linearGradient>
            </defs>
            <rect x="6" y="6" width="52" height="52" rx="16" fill="url(#sidebarLogo)"></rect>
            <path d="M20 21h9l4 8 4-8h7l-7 13 8 9h-8l-4-5-4 5h-8l8-9z" fill="white"></path>
          </svg>
        </div>

        <div class="brand-info">
          <h1 class="brand-title">AutoAssist AI</h1>
          <p class="brand-subtitle">Centro de control operativo</p>
        </div>
      </div>

      <mat-divider></mat-divider>

      <mat-nav-list class="sidebar-list">
        <a
          mat-list-item
          routerLink="/identity/home"
          routerLinkActive="active-link"
          class="nav-item"
          (click)="menuItemClicked.emit()"
        >
          <span matListItemIcon class="item-icon-wrap" aria-hidden="true">
            <lucide-icon [img]="dashboardIcon" [size]="18"></lucide-icon>
          </span>
          <span matListItemTitle>Dashboard</span>
        </a>
      </mat-nav-list>

      <mat-divider></mat-divider>

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

      @if (authStore.isAuthenticated()) {
        <div class="sidebar-user-card">
          <div class="user-avatar">{{ userInitials() }}</div>
          <div class="user-copy">
            <strong>{{ authStore.user()?.nombre }}</strong>
            <span>{{ roleLabel() }}</span>
          </div>
        </div>
      }
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
        radial-gradient(circle at -10% -10%, rgb(var(--sm-rgb-copper-500) / 0.16), transparent 38%),
        radial-gradient(circle at 100% 0%, rgb(var(--sm-rgb-copper-400) / 0.08), transparent 30%),
        linear-gradient(180deg, var(--sm-color-gunmetal-875), var(--sm-color-gunmetal-900));
      color: var(--sm-color-text-main);
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 1.35rem 1rem 1.15rem;
    }

    .brand-logo {
      width: 3.1rem;
      height: 3.1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .brand-mark {
      width: 100%;
      height: 100%;
      filter: drop-shadow(0 10px 18px rgb(var(--sm-rgb-copper-500) / 0.3));
    }

    .brand-title {
      font-family: var(--sm-font-display);
      font-size: 1.02rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      margin: 0;
      color: var(--sm-color-text-title);
    }

    .brand-subtitle {
      font-size: 0.72rem;
      letter-spacing: 0.05em;
      color: var(--sm-color-text-soft);
      margin: 0;
      text-transform: uppercase;
    }

    mat-divider {
      border-top-color: rgb(var(--sm-rgb-slate-400) / 0.18);
    }

    .sidebar-list {
      padding: 0.25rem 0;
    }

    .nav-item {
      color: var(--sm-color-text-main);
      border-radius: 1rem;
      margin: 0.3rem 0.55rem;
      transition: background 0.2s ease, color 0.2s ease;
    }

    .item-icon-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .nav-item:hover {
      background: rgb(var(--sm-rgb-copper-500) / 0.12);
    }

    .nav-item.active-link {
      background: linear-gradient(
        145deg,
        rgb(var(--sm-rgb-copper-500) / 0.2),
        rgb(var(--sm-rgb-copper-500) / 0.08)
      );
      color: var(--sm-color-text-title);
      border: 1px solid rgb(var(--sm-rgb-copper-500) / 0.26);
    }

    .sidebar-accordion {
      padding: 0.5rem 0.5rem 1rem;
    }

    .sidebar-panel {
      box-shadow: none !important;
      background: transparent;
      margin-bottom: 0.25rem;
    }

    .panel-header {
      border-radius: 0.95rem;
      min-height: 48px !important;
      transition: background 0.2s ease;
    }

    .panel-header:hover {
      background: rgb(var(--sm-rgb-copper-500) / 0.1);
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
      color: var(--sm-color-copper-300);
    }

    .sub-list {
      padding: 0;
    }

    .sub-item {
      font-size: 0.8rem !important;
      min-height: 40px !important;
      padding-left: 2.5rem !important;
      margin: 0.15rem 0.25rem;
      border-radius: 0.75rem;
      color: var(--sm-color-text-soft);
    }

    .sub-item:hover {
      background: rgb(var(--sm-rgb-copper-500) / 0.1);
      color: var(--sm-color-text-title);
    }

    .sub-item.active-link {
      color: var(--sm-color-text-title);
      font-weight: 600;
      background: rgb(var(--sm-rgb-copper-500) / 0.14);
      border: 1px solid rgb(var(--sm-rgb-copper-500) / 0.24);
    }

    .sidebar-user-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 0.75rem 0.55rem 0.95rem;
      padding: 1rem;
      border-radius: 1.15rem;
      border: 1px solid rgb(var(--sm-rgb-copper-500) / 0.16);
      background:
        linear-gradient(145deg, rgb(var(--sm-rgb-copper-500) / 0.12), rgb(var(--sm-rgb-copper-500) / 0.04));
    }

    .user-avatar {
      width: 2.4rem;
      height: 2.4rem;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgb(var(--sm-rgb-copper-500) / 0.14);
      color: var(--sm-color-orange-100);
      font-size: 0.82rem;
      font-weight: 800;
      flex-shrink: 0;
    }

    .user-copy {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .user-copy strong,
    .user-copy span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .user-copy strong {
      color: var(--sm-color-text-title);
      font-size: 0.84rem;
    }

    .user-copy span {
      color: var(--sm-color-text-soft);
      font-size: 0.72rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    @media (max-width: 960px) {
      .sidebar-brand {
        padding-top: 1rem;
        padding-bottom: 1rem;
      }
    }
  `]
})
export class SidebarComponent {
  authStore = inject(AuthStore);

  @Output() menuItemClicked = new EventEmitter<void>();

  protected readonly dashboardIcon = LayoutDashboard;

  private readonly menuAdminPlataforma: MenuItem = {
    label: 'Administracion de la Plataforma',
    icon: Building2,
    children: [
      { label: 'Gestionar tenants y aislamiento', path: '/admin/tenants' },
      { label: 'Gestionar talleres registrados', path: '/monitoring/workshops' },
      { label: 'Supervisar operaciones de la plataforma', path: '/monitoring/command-center' },
      { label: 'Consultar bitacora / historial del sistema', path: '/monitoring/audit' },
    ],
  };

  private readonly menuIdentidadSuper: MenuItem = {
    label: 'Onboarding y Gestion de Identidad',
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
    label: 'Monetizacion y Gestion Financiera',
    icon: Wallet,
    children: [
      { label: 'Gestionar comision del taller', path: '/finance/dashboard' },
      { label: 'Generar reportes', path: '/finance/reports' },
    ],
  };

  private readonly menuOperacionTaller: MenuItem = {
    label: 'Operacion de Talleres',
    icon: Wrench,
    children: [
      { label: 'Visualizar solicitudes', path: '/workshops/assignments' },
      { label: 'Gestionar tecnicos y disponibilidad', path: '/workshops/team' },
      { label: 'Gestionar Citas', path: '/workshops/calendar' },
    ],
  };

  private readonly menuMonitoreoTaller: MenuItem = {
    label: 'Monitoreo, Experiencia y Trazabilidad',
    icon: Radar,
    children: [
      { label: 'Monitor de Incidentes', path: '/emergencies/active' },
      { label: 'Consultar historial de servicios', path: '/monitoring/history' },
      { label: 'Bitacora de auditoria', path: '/monitoring/audit' },
    ],
  };

  private readonly menuFinanzasTaller: MenuItem = {
    label: 'Monetizacion y Gestion Financiera',
    icon: Wallet,
    children: [
      { label: 'Gestionar comision del taller', path: '/finance/dashboard' },
      { label: 'Generar reportes', path: '/finance/reports' },
    ],
  };

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
        children.push({ label: 'Gestionar taller', path: '/workshops/register' });
        children.push({ label: 'Gestionar talleres', path: '/workshops/branches' });
        children.push({ label: 'Configurar mi sucursal', path: '/workshops/my-branch' });
      }

      const menuIdentidadTallerSeg: MenuItem = {
        label: 'Onboarding y Gestion de Identidad',
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

  roleLabel = computed(() => {
    const user = this.authStore.user();
    const role = (user?.rol_nombre || '').toLowerCase().trim();
    const context = user?.rol_contexto || '';

    if (role === 'superadmin') return 'Superadmin';
    if (role === 'admin_taller' && context === 'owner') return 'Owner de taller';
    if (role === 'admin_taller' && context === 'admin_sucursal') return 'Admin de sucursal';
    if (role === 'admin_taller') return 'Admin de taller';
    if (role === 'tecnico') return 'Tecnico';
    if (role === 'cliente') return 'Cliente';
    return 'Usuario activo';
  });

  userInitials = computed(() => {
    const name = this.authStore.user()?.nombre?.trim() || 'AA';
    const parts = name.split(/\s+/).slice(0, 2);
    return parts.map(part => part[0]?.toUpperCase() || '').join('') || 'AA';
  });
}
