import { isPlatformBrowser } from '@angular/common';
import { Injectable, NgZone, PLATFORM_ID, inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SpeechRecognitionService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly zone = inject(NgZone);

  private recognition: any = null;
  private listening = false;

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'es-BO';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;
  }

  isSupported(): boolean {
    return !!this.recognition;
  }

  listenOnce(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject('Tu navegador no soporta reconocimiento de voz. Prueba con Chrome o Edge.');
        return;
      }

      if (this.listening) {
        reject('Ya se está escuchando audio.');
        return;
      }

      let transcript = '';
      this.listening = true;

      this.recognition.onresult = (event: any) => {
        transcript = event.results?.[0]?.[0]?.transcript?.trim() ?? '';
      };

      this.recognition.onerror = (event: any) => {
        this.zone.run(() => {
          this.listening = false;
          reject(event.error || 'Error al reconocer el audio.');
        });
      };

      this.recognition.onend = () => {
        this.zone.run(() => {
          this.listening = false;

          if (!transcript) {
            reject('No se detectó ninguna solicitud.');
            return;
          }

          resolve(transcript);
        });
      };

      this.recognition.start();
    });
  }

  stop(): void {
    if (this.recognition && this.listening) {
      this.recognition.stop();
    }
  }
}