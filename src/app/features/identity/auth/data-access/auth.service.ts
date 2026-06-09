import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import { LoginCredentials, AuthResponse } from '../schemas/auth.schema';
import { StorageService } from '../../../../core/services/storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private storageService = inject(StorageService);
  private readonly API_URL = `${environment.apiUrl}/identity/auth`;

  login(credentials: LoginCredentials & { rememberMe?: boolean }): Observable<AuthResponse> {
    const payload = {
      correo: String(credentials.correo).trim(),
      contrasena: String(credentials.contrasena).trim()
    };

    return this.http.post<AuthResponse>(`${this.API_URL}/login`, payload);
  }

  logout(): void {
    this.storageService.removeItem('access_token');
    this.storageService.removeItem('user_data');
  }

  saveAuthData(response: AuthResponse): void {
    this.storageService.setItem('access_token', response.access_token);
    this.storageService.setItem('user_data', JSON.stringify(response.user));
  }
}