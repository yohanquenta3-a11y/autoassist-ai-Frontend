import { Injectable, inject, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthStore } from '@features/identity/auth/state/auth.store';
import { injectQueryClient } from '@tanstack/angular-query-experimental';
import { environment } from '@env/environment';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private authStore = inject(AuthStore);
  private queryClient = injectQueryClient();
  private snackBar = inject(MatSnackBar);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  
  private socket: WebSocket | null = null;
  private alertAudio: any = null;

  constructor() {
    if (this.isBrowser) {
      this.alertAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    }

    // Re-conectar automáticamente si el usuario cambia (login/logout)
    effect(() => {
      const token = this.authStore.accessToken();
      if (token && this.isBrowser) {
        this.connect(token);
      } else {
        this.disconnect();
      }
    });
  }

  private connect(token: string) {
    if (this.socket || !this.isBrowser) return;

    const url = new URL(environment.apiUrl);
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = url.host;
    
    this.socket = new WebSocket(`${protocol}//${host}/ws?token=${token}`);

    this.socket.onerror = () => {
      console.warn('WebSocket connection failed:', `${protocol}//${host}/ws`);
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('🔔 Notificación recibida:', message);
        this.handleMessage(message);
      } catch (e: any) {
        console.error('Error al parsear mensaje WS:', e);
      }
    };

    this.socket.onclose = () => {
      this.socket = null;
      setTimeout(() => {
        const currentToken = this.authStore.accessToken();
        if (currentToken) this.connect(currentToken);
      }, 5000);
    };
  }

  private disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  private handleMessage(message: any) {
    // 1. Invalidar queries para refrescar data
    this.queryClient.invalidateQueries({ queryKey: ['assignments'] });
    this.queryClient.invalidateQueries({ queryKey: ['global-incidents'] });
    this.queryClient.invalidateQueries({ queryKey: ['home-recent-incidents'] });

    // 2. Alerta visual y sonora si es una nueva emergencia
    if (message.type === 'NEW_INCIDENT') {
      this.playAlert();
      this.snackBar.open('🚨 NUEVA SOLICITUD DE AUXILIO RECIBIDA', 'Ver', {
        duration: 10000,
        panelClass: ['snack-important'],
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
    }
  }

  private playAlert() {
    if (this.alertAudio) {
      this.alertAudio.play().catch((e: any) => console.log('Audio blocked by browser:', e));
    }
  }
}
