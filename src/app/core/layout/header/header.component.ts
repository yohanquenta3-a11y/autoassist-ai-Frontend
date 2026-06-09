import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router } from '@angular/router';
import { LogOut, LucideAngularModule, Menu } from 'lucide-angular';

import { StorageService } from '@core/services/storage.service';
import { AuthStore } from '@features/identity/auth/state/auth.store';
import { WorkshopsService } from '@features/workshops/data-access/workshops.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    LucideAngularModule,
  ],
  template: `
    <mat-toolbar class="app-header">
      @if (showMenuButton) {
        <button mat-icon-button (click)="menuToggled.emit()" class="menu-toggle-btn" aria-label="Abrir navegacion">
          <lucide-icon [img]="menuIcon" [size]="20" aria-hidden="true"></lucide-icon>
        </button>
      }

      <div class="header-brand">
        <span class="brand-logo" aria-hidden="true">
          <svg viewBox="0 0 64 64" class="brand-mark">
            <defs>
              <linearGradient id="headerLogo" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="var(--sm-color-copper-300)" />
                <stop offset="55%" stop-color="var(--sm-color-copper-500)" />
                <stop offset="100%" stop-color="var(--sm-color-copper-700)" />
              </linearGradient>
            </defs>
            <rect x="6" y="6" width="52" height="52" rx="16" fill="url(#headerLogo)"></rect>
            <path d="M20 21h9l4 8 4-8h7l-7 13 8 9h-8l-4-5-4 5h-8l8-9z" fill="white"></path>
          </svg>
        </span>
        <div class="brand-text">
          <span class="brand-name">AutoAssist AI</span>
          <span class="brand-subtitle">Despacho, monitoreo y talleres</span>
        </div>
      </div>

      <span class="header-spacer"></span>

      <div class="header-actions">
        @if (isOwner()) {
          <mat-form-field appearance="outline" class="branch-select-field" subscriptSizing="dynamic">
            <mat-select [value]="selectedBranch()" (selectionChange)="onBranchChange($event.value)" placeholder="Todas las sucursales">
              <mat-option value="">Todas las sucursales</mat-option>
              @for (branch of branches(); track branch.id_sucursal) {
                <mat-option [value]="branch.id_sucursal">{{ branch.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }

        @if (authStore.isAuthenticated()) {
          <span class="role-pill">{{ roleLabel() }}</span>
          <span class="user-name">{{ authStore.user()?.nombre }}</span>
        }

        <button mat-stroked-button (click)="logout()" class="logout-btn">
          <lucide-icon [img]="logoutIcon" [size]="16" aria-hidden="true"></lucide-icon>
          <span class="logout-label">Cerrar sesion</span>
        </button>
      </div>
    </mat-toolbar>
  `,
  styles: [`
    .app-header {
      position: sticky;
      top: 0;
      z-index: 100;
      min-height: 4.5rem;
      padding: 0.8rem 1.1rem;
      border-bottom: 1px solid rgb(var(--sm-rgb-copper-500) / 0.16);
      color: var(--sm-color-text-main);
      background:
        radial-gradient(circle at 0% 0%, rgb(var(--sm-rgb-copper-500) / 0.18), transparent 24%),
        linear-gradient(145deg, rgb(var(--sm-rgb-white) / 0.92), rgb(240 250 251 / 0.94)),
        linear-gradient(145deg, var(--sm-color-gunmetal-850), var(--sm-color-gunmetal-900));
      box-shadow:
        0 10px 26px -16px rgb(var(--sm-rgb-black) / 0.18),
        inset 0 1px 0 rgb(var(--sm-rgb-white) / 0.72);
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .menu-toggle-btn {
      color: var(--sm-color-text-title);
      border: 1px solid rgb(var(--sm-rgb-copper-500) / 0.22);
      background: rgb(var(--sm-rgb-copper-500) / 0.08);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border-radius: 0.95rem;
      width: 2.75rem;
      height: 2.75rem;
      box-shadow: inset 0 1px 0 rgb(var(--sm-rgb-white) / 0.04);
    }

    .menu-toggle-btn:hover {
      background: rgb(var(--sm-rgb-copper-500) / 0.16);
      border-color: rgb(var(--sm-rgb-copper-500) / 0.34);
    }

    .header-brand {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      min-width: 0;
    }

    .brand-logo {
      width: 2.9rem;
      height: 2.9rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .brand-mark {
      width: 100%;
      height: 100%;
      filter: drop-shadow(0 14px 22px rgb(var(--sm-rgb-copper-500) / 0.25));
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      line-height: 1.18;
      min-width: 0;
    }

    .brand-name {
      font-family: var(--sm-font-display);
      font-weight: 800;
      font-size: 1rem;
      letter-spacing: 0.06em;
      color: var(--sm-color-text-title);
      text-transform: uppercase;
    }

    .brand-subtitle {
      font-size: 0.74rem;
      letter-spacing: 0.03em;
      color: var(--sm-color-text-soft);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .header-spacer {
      flex: 1;
    }

    .header-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.85rem;
      flex-wrap: wrap;
      margin-left: auto;
    }

    .user-name {
      font-size: 0.875rem;
      color: var(--sm-color-text-main);
      border-radius: 999px;
      border: 1px solid rgb(var(--sm-rgb-copper-500) / 0.18);
      background: rgb(var(--sm-rgb-copper-500) / 0.08);
      padding: 0.38rem 0.78rem;
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .role-pill {
      font-size: 0.74rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--sm-color-text-title);
      border-radius: 999px;
      border: 1px solid rgb(var(--sm-rgb-copper-500) / 0.22);
      background: linear-gradient(
        145deg,
        rgb(var(--sm-rgb-copper-500) / 0.16),
        rgb(var(--sm-rgb-copper-500) / 0.06)
      );
      padding: 0.38rem 0.7rem;
    }

    .logout-btn {
      color: var(--sm-color-text-title);
      border-color: rgb(var(--sm-rgb-copper-500) / 0.28);
      background: rgb(var(--sm-rgb-copper-500) / 0.1);
      font-size: 0.875rem;
      font-weight: 600;
      min-height: 2.5rem;
      border-radius: 999px;
    }

    .logout-btn:hover {
      background: linear-gradient(
        145deg,
        var(--sm-color-orange-500),
        var(--sm-color-orange-600)
      );
      color: var(--sm-color-white);
    }

    .branch-select-field {
      width: 220px;
      font-size: 0.8rem;
    }

    .branch-select-field ::ng-deep .mat-mdc-form-field-infix {
      padding-top: 6px !important;
      padding-bottom: 6px !important;
      min-height: 36px !important;
    }

    .branch-select-field ::ng-deep .mat-mdc-text-field-wrapper {
      background: rgb(var(--sm-rgb-white) / 0.96) !important;
      border: 1px solid rgb(var(--sm-rgb-copper-500) / 0.14) !important;
      border-radius: 999px !important;
      height: 40px !important;
    }

    .branch-select-field ::ng-deep .mat-mdc-select-value {
      color: var(--sm-color-text-main) !important;
      font-weight: 600;
    }

    .branch-select-field ::ng-deep .mat-mdc-select-arrow {
      color: var(--sm-color-text-muted) !important;
    }

    @media (max-width: 960px) {
      .app-header {
        padding: 0.8rem 0.9rem;
      }

      .branch-select-field {
        width: min(220px, 100%);
      }

      .header-actions {
        width: 100%;
        justify-content: flex-start;
        margin-left: 0;
      }
    }

    @media (max-width: 640px) {
      .brand-subtitle,
      .user-name {
        display: none;
      }

      .header-actions {
        gap: 0.65rem;
      }

      .logout-label {
        display: none;
      }

      .logout-btn {
        min-width: 2.7rem;
        padding-inline: 0.75rem;
      }

      .branch-select-field {
        width: 100%;
      }
    }
  `]
})
export class HeaderComponent implements OnInit {
  public authStore = inject(AuthStore);
  private router = inject(Router);
  private workshopsService = inject(WorkshopsService);
  private storageService = inject(StorageService);

  @Input() showMenuButton = false;
  @Output() menuToggled = new EventEmitter<void>();

  protected readonly logoutIcon = LogOut;
  protected readonly menuIcon = Menu;

  isOwner = computed(() => {
    const user = this.authStore.user();
    return (user?.rol_nombre || '').toLowerCase().trim() === 'admin_taller' && user?.rol_contexto === 'owner';
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

  branches = signal<any[]>([]);
  selectedBranch = signal<string>('');

  ngOnInit(): void {
    if (this.isOwner()) {
      this.workshopsService.getBranches().subscribe({
        next: (res) => {
          this.branches.set(res || []);
        },
        error: (err) => {
          console.error('Error fetching branches for header switcher:', err);
        }
      });

      this.selectedBranch.set(this.storageService.getItem('selected_branch') || '');
    }
  }

  onBranchChange(value: string): void {
    if (value) {
      this.storageService.setItem('selected_branch', value);
    } else {
      this.storageService.removeItem('selected_branch');
    }

    this.selectedBranch.set(value);
    window.location.reload();
  }

  logout(): void {
    this.storageService.removeItem('selected_branch');
    this.authStore.logout();
    this.router.navigate(['/identity/auth']);
  }
}
