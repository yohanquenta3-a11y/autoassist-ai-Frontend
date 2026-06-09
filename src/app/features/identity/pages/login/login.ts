import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoginForm } from '../../components/login-form/login-form';
import { UserLogin } from '@core/models/identity.model';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, LoginForm],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <h1>AutoAssist AI</h1>
          <p>Centro administrativo y operativo</p>
        </div>
        <app-login-form (submitLogin)="onLoginSubmit($event)"></app-login-form>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: radial-gradient(circle at 50% -25%, var(--sm-color-gunmetal-800) 0%, var(--sm-color-gunmetal-950) 75%);
      font-family: 'Inter', sans-serif;
    }
    .login-card {
      background: var(--sm-color-gunmetal-850, #1c1f24);
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      width: 100%;
      max-width: 400px;
      border: 1px solid var(--sm-color-border-metal, #334155);
    }
    .login-header {
      text-align: center;
      margin-bottom: 32px;
      
      h1 {
        margin: 0;
        font-size: 28px;
        color: var(--sm-color-text-title, #fff);
        font-weight: 700;
      }
      p {
        margin: 8px 0 0;
        color: var(--sm-color-text-soft, #ccc);
      }
    }
  `]
})
export class Login {
  // TODO: Inject AuthStore/AuthService here

  onLoginSubmit(credentials: UserLogin) {
    console.log('Login Submit en AutoAssist AI:', credentials);
    // TODO: Ejecutar mutación con TanStack Query o HttpClient para POST /api/v1/identity/auth/login
  }
}
