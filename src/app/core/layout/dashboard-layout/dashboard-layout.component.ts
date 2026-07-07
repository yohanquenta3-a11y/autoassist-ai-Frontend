import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Router, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';

import { HeaderComponent } from '@core/layout/header/header.component';
import { SidebarComponent } from '@core/layout/sidebar/sidebar.component';
import { NotificationService } from '@core/services/notification.service';
import { StorageService } from '@core/services/storage.service';
import { AuthStore } from '@features/identity/auth/state/auth.store';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    MatSidenavModule,
    SidebarComponent,
    HeaderComponent,
  ],
  template: `
    <mat-sidenav-container class="layout-container">
      <mat-sidenav
        [mode]="sidenavMode()"
        [opened]="isSidenavOpened()"
        [disableClose]="!isMobile()"
        [fixedInViewport]="isMobile()"
        (closedStart)="handleSidenavClosed()"
        class="app-sidenav"
      >
        <app-sidebar (menuItemClicked)="handleMenuItemClick()"></app-sidebar>
      </mat-sidenav>

      <mat-sidenav-content class="layout-content">
        <app-header
          [showMenuButton]="true"
          (menuToggled)="toggleNavigation()"
        ></app-header>

        <main
          class="main-content"
          [class.main-content-sidebar-closed]="!isMobile() && !desktopSidebarOpened()"
        >
          <router-outlet></router-outlet>
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .layout-container {
      height: 100vh;
      overflow: hidden;
      background:
        radial-gradient(circle at right top, rgb(var(--sm-rgb-copper-500) / 0.15), transparent 26%),
        radial-gradient(circle at left bottom, rgb(var(--sm-rgb-cyan-500) / 0.08), transparent 28%),
        linear-gradient(180deg, var(--sm-color-carbon-930), var(--sm-color-obsidian-980));
    }

    .app-sidenav {
      width: 300px;
      border-right: 1px solid rgb(var(--sm-rgb-copper-500) / 0.14);
      background:
        radial-gradient(circle at 0% 0%, rgb(var(--sm-rgb-copper-500) / 0.12), transparent 32%),
        linear-gradient(180deg, rgb(var(--sm-rgb-white) / 0.02), rgb(var(--sm-rgb-white) / 0.01)),
        linear-gradient(160deg, var(--sm-color-gunmetal-850), var(--sm-color-gunmetal-900));
      box-shadow: 22px 0 52px -36px rgb(var(--sm-rgb-black) / 0.95);
    }

    .layout-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: transparent;
    }

    .main-content {
      flex: 1;
      overflow-y: auto;
      width: 100%;
      padding: 1.35rem 1.5rem 1.85rem;
      background:
        radial-gradient(circle at 14% 0%, rgb(var(--sm-rgb-copper-500) / 0.08), transparent 26%),
        radial-gradient(circle at 100% 0%, rgb(var(--sm-rgb-cyan-500) / 0.06), transparent 20%),
        linear-gradient(180deg, rgb(var(--sm-rgb-black) / 0.1), rgb(var(--sm-rgb-black) / 0.36));
      transition: padding 0.2s ease;
    }

    .main-content-sidebar-closed {
      padding-left: 1.1rem;
      padding-right: 1.1rem;
    }

    @media (max-width: 960px) {
      .app-sidenav {
        width: 280px;
      }

      .main-content {
        padding: 1rem;
      }
    }
  `]
})
export class DashboardLayoutComponent {
  private authStore = inject(AuthStore);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private breakpointObserver = inject(BreakpointObserver);
  private storageService = inject(StorageService);
  private readonly sidebarStorageKey = 'autoassist.sidebar.desktop.open';

  isMobile = toSignal(
    this.breakpointObserver.observe('(max-width: 960px)').pipe(
      map(result => result.matches)
    ),
    { initialValue: false }
  );

  sidenavOpened = signal(false);
  desktopSidebarOpened = signal(this.readDesktopSidebarState());
  sidenavMode = computed(() => this.isMobile() ? 'over' : 'side');
  isSidenavOpened = computed(() => this.isMobile() ? this.sidenavOpened() : this.desktopSidebarOpened());

  constructor() {
    this.authStore.init();

    effect(() => {
      if (this.isMobile()) {
        this.sidenavOpened.set(false);
      }
    }, { allowSignalWrites: true });

    if (!this.authStore.isAuthenticated()) {
      this.router.navigate(['/identity/auth'], {
        queryParams: { returnUrl: this.router.url },
      });
    }
  }

  toggleNavigation(): void {
    if (this.isMobile()) {
      this.sidenavOpened.update(open => !open);
      return;
    }

    const nextState = !this.desktopSidebarOpened();
    this.desktopSidebarOpened.set(nextState);
    this.storageService.setItem(this.sidebarStorageKey, String(nextState));
  }

  handleMenuItemClick(): void {
    if (this.isMobile()) {
      this.sidenavOpened.set(false);
    }
  }

  handleSidenavClosed(): void {
    if (this.isMobile()) {
      this.sidenavOpened.set(false);
    }
  }

  private readDesktopSidebarState(): boolean {
    const storedValue = this.storageService.getItem(this.sidebarStorageKey);
    return storedValue === null ? true : storedValue === 'true';
  }
}
