import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../state/auth.store';
import { LoginFormComponent, LoginCredentials } from '../../components/login-form/login-form.component';
import { AuthService } from '../../data-access/auth.service';
import { injectMutation } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [LoginFormComponent, MatSnackBarModule],
  template: `
    <div style="position: relative;">
      @if (loginMutation.isPending()) {
        <div class="loading-overlay">Cargando...</div>
      }
      <app-login-form (onSubmitCredentials)="iniciarSesion($event)"></app-login-form>
    </div>
  `,
  styles: [`
    .loading-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.5rem;
      backdrop-filter: blur(4px);
    }
  `]
})
export class LoginComponent {
  public authStore = inject(AuthStore);
  private router = inject(Router);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  loginMutation = injectMutation(() => ({
    mutationFn: (credentials: LoginCredentials) => lastValueFrom(this.authService.login(credentials)),
    onSuccess: (response) => {
      this.authService.saveAuthData(response);
      this.authStore.loginSuccess(response.user, response.access_token);
      this.router.navigate(['/identity/home']);
    },
    onError: (error: HttpErrorResponse) => {
      const message = error.error?.detail || 'Error al iniciar sesión. Verifica tus credenciales.';
      this.snackBar.open(message, 'Cerrar', { duration: 5000 });
    }
  }));

  constructor() {
    this.authStore.init();

    if (this.authStore.isAuthenticated()) {
      this.router.navigate(['/identity/home']);
    }
  }

  iniciarSesion(credentials: LoginCredentials) {
    this.loginMutation.mutate(credentials);
  }
}
