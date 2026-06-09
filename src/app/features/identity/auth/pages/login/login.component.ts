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
    <section class="login-shell">
      @if (loginMutation.isPending()) {
        <div class="loading-overlay">Cargando...</div>
      }

      <div class="login-stage">
        <article class="brand-panel">
          <span class="brand-chip">AutoAssist AI</span>
          <h1>Coordina asistencia vehicular con una cabina visual totalmente renovada</h1>
          <p>
            Supervisa incidentes, talleres, clientes y trazabilidad operativa desde una entrada
            mas clara, ligera y distinta al diseño anterior.
          </p>

          <div class="stage-cues">
            <div class="cue-card">
              <strong>Red multi taller</strong>
              <span>Tres redes, sucursales aisladas y control centralizado.</span>
            </div>
            <div class="cue-card">
              <strong>Despacho en tiempo real</strong>
              <span>Seguimiento de servicios, tecnicos y estados desde la misma plataforma.</span>
            </div>
            <div class="cue-card">
              <strong>Acceso por rol</strong>
              <span>SuperAdmin, owner, admin de sucursal, tecnico y cliente.</span>
            </div>
          </div>
        </article>

        <div class="form-panel">
          <app-login-form (onSubmitCredentials)="iniciarSesion($event)"></app-login-form>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .login-shell {
      min-height: 100vh;
      padding: clamp(1.25rem, 3vw, 2.5rem);
      background:
        radial-gradient(circle at top left, rgba(14, 165, 164, 0.18), transparent 24%),
        radial-gradient(circle at bottom right, rgba(15, 118, 110, 0.14), transparent 26%),
        linear-gradient(135deg, #f4fbfc 0%, #eef7f7 48%, #fdfefe 100%);
    }

    .login-stage {
      position: relative;
      max-width: 1320px;
      margin: 0 auto;
      min-height: calc(100vh - 5rem);
      display: grid;
      grid-template-columns: minmax(320px, 1.05fr) minmax(420px, 0.95fr);
      gap: 1.5rem;
      align-items: center;
    }

    .brand-panel {
      position: relative;
      overflow: hidden;
      padding: clamp(1.6rem, 3vw, 2.4rem);
      border-radius: 36px;
      background:
        linear-gradient(145deg, rgba(12, 41, 58, 0.96), rgba(16, 68, 83, 0.92)),
        #0f2534;
      color: white;
      box-shadow: 0 30px 60px rgba(18, 50, 70, 0.18);
    }

    .brand-panel::after {
      content: '';
      position: absolute;
      inset: auto -4rem -4rem auto;
      width: 220px;
      height: 220px;
      border-radius: 999px;
      background: radial-gradient(circle, rgba(255,255,255,0.18), transparent 68%);
      pointer-events: none;
    }

    .brand-chip {
      display: inline-flex;
      padding: 0.42rem 0.78rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.1);
      color: #a5fff6;
      font-size: 0.76rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .brand-panel h1 {
      margin: 1rem 0 0.9rem;
      max-width: 12ch;
      font-size: clamp(2.3rem, 5vw, 4.4rem);
      line-height: 0.96;
      letter-spacing: -0.05em;
    }

    .brand-panel p {
      margin: 0;
      max-width: 520px;
      color: rgba(232, 251, 249, 0.86);
      font-size: 1rem;
      line-height: 1.75;
    }

    .stage-cues {
      display: grid;
      gap: 0.85rem;
      margin-top: 1.5rem;
    }

    .cue-card {
      display: grid;
      gap: 0.3rem;
      padding: 1rem 1.1rem;
      border-radius: 22px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .cue-card strong {
      font-size: 0.88rem;
      font-weight: 800;
      color: white;
    }

    .cue-card span {
      font-size: 0.84rem;
      line-height: 1.55;
      color: rgba(225, 247, 245, 0.82);
    }

    .form-panel {
      display: flex;
      justify-content: center;
    }

    .loading-overlay {
      position: fixed;
      inset: 0;
      background: rgba(9, 24, 33, 0.42);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.5rem;
      backdrop-filter: blur(4px);
    }

    @media (max-width: 980px) {
      .login-stage {
        grid-template-columns: 1fr;
        min-height: auto;
      }

      .brand-panel h1 {
        max-width: none;
      }
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
