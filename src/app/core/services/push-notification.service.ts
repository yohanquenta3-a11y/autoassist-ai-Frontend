import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '@env/environment';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { HttpClient } from '@angular/common/http';
import { AuthStore } from '../../features/identity/auth/state/auth.store';
import { Subject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private httpClient = inject(HttpClient);
  private authStore = inject(AuthStore);
  private platformId = inject(PLATFORM_ID);
  private snackBar = inject(MatSnackBar);
  
  private messaging: Messaging | undefined;
  private messageSubject = new Subject<any>();
  public message$ = this.messageSubject.asObservable();

  // URL de un sonido de notificación premium
  private readonly NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      try {
        if (!this.hasValidFirebaseConfig()) {
          console.warn('Firebase web push disabled: missing runtime config.');
          return;
        }

        const app = initializeApp(environment.firebase);
        this.messaging = getMessaging(app);
      } catch (error) {
        console.warn('Firebase web push initialization skipped:', error);
      }
    }
  }

  /**
   * Solicita permisos al usuario y obtiene el token de FCM
   */
  async requestPermissionAndGetToken() {
    if (!isPlatformBrowser(this.platformId) || !this.messaging) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Pequeño retraso para asegurar estabilidad en la carga
        await new Promise(resolve => setTimeout(resolve, 500));

        // Registro explícito con scope definido
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          type: 'module',
          scope: '/'
        });
        
        // Esperar a que el service worker esté listo
        await navigator.serviceWorker.ready;

        const token = await getToken(this.messaging, {
          vapidKey: environment.vapidKey,
          serviceWorkerRegistration: registration
        });

        if (token) {
          console.log('FCM Token obtenido:', token);
          this.saveTokenToBackend(token);
        } else {
          console.warn('No se pudo obtener el token de FCM.');
        }
      } else {
        console.error('Permiso de notificaciones denegado.');
      }
    } catch (error) {
      console.error('Error al obtener permiso/token:', error);
    }
  }

  /**
   * Escucha mensajes cuando la app está en primer plano
   */
  listenForMessages() {
    if (!isPlatformBrowser(this.platformId) || !this.messaging) return;

    onMessage(this.messaging, (payload) => {
      console.log('Mensaje en primer plano recibido:', payload);
      this.messageSubject.next(payload);
      
      if (payload.notification) {
        this.playSound();
        this.snackBar.open(
          `${payload.notification.title}: ${payload.notification.body}`, 
          'Ver', 
          { duration: 8000, horizontalPosition: 'right', verticalPosition: 'top' }
        );
      }
    });
  }

  private playSound() {
    try {
      const audio = new Audio(this.NOTIFICATION_SOUND);
      audio.play();
    } catch (e) {
      console.warn('No se pudo reproducir el sonido de notificación:', e);
    }
  }

  /**
   * Envía el token al backend para guardarlo en el perfil del usuario
   */
  private saveTokenToBackend(token: string) {
    const user = this.authStore.user();
    if (!user) return;

    // URL tentativa: ajustar según el endpoint real de tu FastAPI
    const url = `${environment.apiUrl}/identity/auth/fcm-token`;
    
    this.httpClient.post(url, { fcm_token: token }).subscribe({
      next: () => console.log('Token guardado en el servidor correctamente.'),
      error: (err) => console.error('Error al guardar el token en el servidor:', err)
    });
  }

  private hasValidFirebaseConfig(): boolean {
    const firebase = environment.firebase;

    return !!(
      firebase &&
      firebase.apiKey &&
      firebase.authDomain &&
      firebase.projectId &&
      firebase.messagingSenderId &&
      firebase.appId
    );
  }
}
