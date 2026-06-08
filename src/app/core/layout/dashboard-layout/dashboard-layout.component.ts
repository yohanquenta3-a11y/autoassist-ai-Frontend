import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { SidebarComponent } from '@core/layout/sidebar/sidebar.component';
import { HeaderComponent } from '@core/layout/header/header.component';
import { AuthStore } from '@features/identity/auth/state/auth.store';
import { NotificationService } from '@core/services/notification.service';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

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
      <!-- Sidebar (sidenav) -->
      <mat-sidenav
        #sidenav
        [mode]="isMobile() ? 'over' : 'side'"
        [opened]="isMobile() ? sidenavOpened() : true"
        (closedStart)="sidenavOpened.set(false)"
        class="app-sidenav"
        [fixedInViewport]="true"
      >
        <app-sidebar (menuItemClicked)="isMobile() ? sidenavOpened.set(false) : null"></app-sidebar>
      </mat-sidenav>

      <!-- Contenido principal -->
      <mat-sidenav-content class="layout-content">
        <app-header
          [showMenuButton]="isMobile()"
          (menuToggled)="sidenavOpened.update(o => !o)">
        </app-header>
        <main class="main-content">
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
        radial-gradient(
          circle at 50% -25%,
          var(--sm-color-gunmetal-800) 0%,
          var(--sm-color-gunmetal-950) 75%
        );
    }

    .app-sidenav {
      width: 280px;
      border-right: 1px solid rgb(var(--sm-rgb-slate-400) / 0.2);
      background: linear-gradient(
        160deg,
        var(--sm-color-gunmetal-850),
        var(--sm-color-gunmetal-900)
      );
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
      padding: 1.5rem 2rem;
      width: 100%;
      background:
        linear-gradient(
          180deg,
          rgb(var(--sm-rgb-black) / 0.12),
          rgb(var(--sm-rgb-black) / 0.4)
        );
    }

    @media (max-width: 960px) {
      .app-sidenav {
        width: 260px;
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

  isMobile = toSignal(
    this.breakpointObserver.observe('(max-width: 960px)').pipe(
      map(result => result.matches)
    ),
    { initialValue: false }
  );

  sidenavOpened = signal(false);

  constructor() {
    this.authStore.init();

    // Guard inline: redirige si no hay sesión autenticada
    if (!this.authStore.isAuthenticated()) {
      this.router.navigate(['/identity/auth']);
    }
  }
}
