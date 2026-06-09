import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface CachedSnapshot<T> {
  savedAt: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class OfflineSnapshotService {
  private platformId = inject(PLATFORM_ID);

  read<T>(key: string): CachedSnapshot<T> | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as CachedSnapshot<T>;
    } catch {
      return null;
    }
  }

  write<T>(key: string, data: T): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const snapshot: CachedSnapshot<T> = {
        savedAt: new Date().toISOString(),
        data,
      };
      window.localStorage.setItem(key, JSON.stringify(snapshot));
    } catch {
      // Ignore quota and serialization issues to avoid breaking the UI.
    }
  }

  hasBrowserConnection(): boolean {
    if (!isPlatformBrowser(this.platformId)) return true;
    return window.navigator.onLine;
  }
}
