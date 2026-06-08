import { Component, signal, inject, OnInit, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthStore } from './features/identity/auth/state/auth.store';
import { PushNotificationService } from '@core/services/push-notification.service';
import { IdentityService } from './features/identity/data-access/identity.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private authStore = inject(AuthStore);
  private pushService = inject(PushNotificationService);
  private identityService = inject(IdentityService);
  protected readonly title = signal('taller-frontend');

  constructor() {
    // Cuando el usuario se autentique, solicitamos permiso para notificaciones
    effect(() => {
      if (this.authStore.isAuthenticated()) {
        this.pushService.requestPermissionAndGetToken();
      }
    });
  }

  ngOnInit() {
    this.pushService.listenForMessages();

    if (this.authStore.isAuthenticated()) {
      this.identityService.getMyProfile().subscribe({
        next: (profile) => {
          this.authStore.updateUser(profile);
        },
        error: (err) => {
          console.error('Error auto-syncing user profile:', err);
          if (err.status === 401 || err.status === 403) {
            this.authStore.logout();
          }
        }
      });
    }
  }
}
