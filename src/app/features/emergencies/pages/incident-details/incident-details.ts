import { Component, inject, PLATFORM_ID, effect, OnDestroy } from '@angular/core';
import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { EmergenciesService } from '../../data-access/emergencies.service';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { lastValueFrom, Subscription } from 'rxjs';
import { IncidentDetailsCard } from '../../components/incident-details-card/incident-details-card';
import { EvidenceViewer } from '../../components/evidence-viewer/evidence-viewer';
import { AiAnalysisPanel } from '../../components/ai-analysis-panel/ai-analysis-panel';
import { IncidentTimeline } from '../../components/incident-timeline/incident-timeline';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PageHeaderComponent, LoadingStateComponent } from '@shared/ui';
import { LucideAngularModule, Siren, Map as MapIcon, Compass } from 'lucide-angular';
import { GoogleMapsModule } from '@angular/google-maps';
import { environment } from '@env/environment';
import { IncidentTrackingService, WebSocketMessage } from '@core/services/incident-tracking.service';
import { FormsModule } from '@angular/forms';
import { AuthStore } from '@features/identity/auth/state/auth.store';

@Component({
  selector: 'app-incident-details-page',
  standalone: true,
  imports: [
    CommonModule, 
    IncidentDetailsCard, 
    EvidenceViewer, 
    AiAnalysisPanel,
    IncidentTimeline,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    PageHeaderComponent,
    LoadingStateComponent,
    LucideAngularModule,
    GoogleMapsModule,
    FormsModule
  ],
  template: `
    <div class="page-container">
      <app-page-header 
        title="Detalles del Incidente" 
        subtitle="Información detallada y análisis de la emergencia mecánica en tiempo real."
        [icon]="sirenIcon">
        <button prefix mat-icon-button (click)="goBack()" aria-label="Volver">
          <mat-icon>arrow_back</mat-icon>
        </button>
      </app-page-header>

      @if (incidentQuery.isPending()) {
        <app-loading-state message="Consultando detalles del incidente..."></app-loading-state>
      } @else if (incidentQuery.isError()) {
        <div class="error-state">
          <mat-icon>error_outline</mat-icon>
          <p>No se pudo cargar la información. El incidente no existe o no tienes permisos.</p>
          <button mat-flat-button color="primary" (click)="incidentQuery.refetch()">Reintentar</button>
        </div>
      } @else {
        <section class="hero-banner sm-surface-panel">
          <div class="hero-copy">
            <span class="sm-section-kicker">AutoAssist AI</span>
            <h2>Contexto completo del incidente en una sola lectura.</h2>
            <p>Consulta evidencia, verificación, seguimiento en mapa, historial y análisis sin cambiar el flujo operativo actual.</p>
          </div>
          <div class="hero-badges">
            <span class="sm-pill">Mapa en vivo</span>
            <span class="sm-pill">Evidencia centralizada</span>
            <span class="sm-pill">Verificación segura</span>
          </div>
        </section>

        <div class="details-layout">
          <div class="main-column">
            <div class="card">
              <app-incident-details-card [incident]="incidentQuery.data()!"></app-incident-details-card>
            </div>
            
            <div class="card">
              <app-evidence-viewer [evidences]="incidentQuery.data()!.evidencias"></app-evidence-viewer>
            </div>
          </div>

          <div class="side-column">
            <!-- Verification Card (CU30) -->
            @if (incidentQuery.data()?.verification_status) {
              <div class="card verification-card">
                <div class="card-header-premium">
                  <mat-icon>verified_user</mat-icon>
                  <span>Verificación de Técnico en Sitio</span>
                </div>
                <div class="verification-body">
                  <div class="info-row">
                    <span class="label">Estado de Verificación:</span>
                    <span class="status-val" [attr.data-status]="incidentQuery.data()?.verification_status">
                      {{ incidentQuery.data()?.verification_status }}
                    </span>
                  </div>
                  
                  @if (incidentQuery.data()?.verification_code) {
                    <div class="info-row code-row">
                      <span class="label">PIN de Seguridad:</span>
                      <span class="pin-code">{{ incidentQuery.data()?.verification_code }}</span>
                    </div>
                  }
                  
                  @if (canOverride(incidentQuery.data())) {
                    <div class="override-section">
                      <p class="override-warn">⚠️ Usa esta opción únicamente si el cliente tiene problemas de conectividad para realizar la verificación desde su app móvil.</p>
                      
                      <div class="override-input-group">
                        <textarea 
                          placeholder="Escribe el motivo del override manual (Obligatorio)..." 
                          [(ngModel)]="overrideReason"
                          class="motive-textarea">
                        </textarea>
                        
                        <button 
                          mat-flat-button 
                          color="warn" 
                          class="override-btn"
                          [disabled]="!overrideReason.trim() || isOverriding"
                          (click)="performManualOverride()">
                          <mat-icon>lock_open</mat-icon>
                          Autorizar Override Manual
                        </button>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Google Maps Card -->
            <div class="card map-card">
              <div class="map-header">
                <div class="title-section">
                  <lucide-icon [img]="mapIcon" [size]="16"></lucide-icon>
                  <span>Seguimiento de Asistencia</span>
                </div>
                
                @if (etaMinutos !== null && incidentQuery.data()!.id_sucursal) {
                  <span class="eta-badge">
                    <lucide-icon [img]="compassIcon" [size]="12" class="spin"></lucide-icon>
                    Llega en {{ etaMinutos }} min
                  </span>
                }
              </div>
              
              <div class="details-map-container">
                @if (incidentQuery.data()!.id_sucursal) {
                  @if (mapsLoaded) {
                    <google-map 
                      height="100%" 
                      width="100%" 
                      [center]="mapCenter" 
                      [zoom]="mapZoom" 
                      [options]="mapOptions">
                      
                      <!-- Marcador de la Emergencia -->
                      <map-marker 
                        [position]="mapCenter" 
                        [options]="incidentMarkerOptions">
                      </map-marker>

                      <!-- Marcador del Técnico en ruta -->
                      @if (techPosition) {
                        <map-marker 
                          [position]="techPosition" 
                          [options]="techMarkerOptions">
                        </map-marker>
                      }

                      <!-- Polilínea del trayecto calculado por Google Directions -->
                      @if (polylinePath.length > 0) {
                        <map-polyline 
                          [path]="polylinePath" 
                          [options]="polylineOptions">
                        </map-polyline>
                      }
                    </google-map>
                  } @else {
                    <div class="map-loading-placeholder">
                      <mat-icon class="spin">cached</mat-icon>
                      <span>Cargando Google Maps...</span>
                    </div>
                  }
                } @else {
                  <div class="map-disabled-placeholder">
                    <mat-icon>location_off</mat-icon>
                    <p>Seguimiento en tiempo real disponible cuando la emergencia sea asignada a una sucursal.</p>
                  </div>
                }
              </div>
            </div>

            <!-- Timeline Card -->
            <div class="card">
              <app-incident-timeline [history]="incidentQuery.data()!.historial || []"></app-incident-timeline>
            </div>

            <div class="card">
              <app-ai-analysis-panel [analysis]="incidentQuery.data()!.analisis_consolidado"></app-ai-analysis-panel>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1320px;
      margin: 0 auto;
      padding: 0 0 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      animation: fadeIn 0.35s ease-out;
    }

    .hero-banner {
      padding: 1.25rem 1.35rem;
      border-radius: 1.5rem;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      border: 1px solid rgb(var(--sm-rgb-copper-500) / 0.14);
      background:
        radial-gradient(circle at top right, rgb(var(--sm-rgb-copper-500) / 0.12), transparent 24%),
        linear-gradient(180deg, rgb(var(--sm-rgb-white) / 0.02), rgb(var(--sm-rgb-white) / 0.01)),
        var(--sm-color-gunmetal-900);
    }

    .hero-copy {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      max-width: 54rem;
    }

    .hero-copy h2 {
      margin: 0;
      color: var(--sm-color-text-title);
      font-size: clamp(1.2rem, 2vw, 1.7rem);
      line-height: 1.1;
    }

    .hero-copy p {
      margin: 0;
      color: var(--sm-color-text-soft);
      line-height: 1.5;
      font-size: 0.92rem;
    }

    .hero-badges {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 0.55rem;
      min-width: 12rem;
    }

    .details-layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.25rem;

      @media (min-width: 1200px) {
        grid-template-columns: minmax(0, 1.18fr) minmax(320px, 400px);
      }
    }

    .main-column {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .side-column {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .card {
      background:
        linear-gradient(180deg, rgba(14, 18, 27, 0.94) 0%, rgba(9, 12, 19, 0.96) 100%);
      border-radius: 24px;
      border: 1px solid rgba(255, 148, 31, 0.14);
      overflow: hidden;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.03),
        0 22px 50px rgba(0, 0, 0, 0.28);
      position: relative;
    }

    .card::before {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        radial-gradient(circle at top right, rgba(255, 153, 0, 0.08), transparent 40%);
      opacity: 0.95;
    }

    .map-card {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .map-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      color: var(--sm-color-amber-300);
      font-size: 0.82rem;
      font-weight: 700;
      flex-wrap: wrap;
    }

    .title-section {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .eta-badge {
      background: rgba(255, 157, 0, 0.14);
      color: #ffd089;
      padding: 0.4rem 0.7rem;
      border-radius: 999px;
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      border: 1px solid rgba(255, 157, 0, 0.2);
      white-space: nowrap;
    }

    .details-map-container {
      height: 300px;
      width: 100%;
      border-radius: 18px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      overflow: hidden;
      background: rgba(255, 255, 255, 0.02);
    }

    .map-disabled-placeholder {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
      gap: 0.85rem;
      color: var(--sm-color-text-soft);
      background:
        radial-gradient(circle at center, rgba(255, 149, 0, 0.08), transparent 55%),
        rgba(255, 255, 255, 0.02);
      mat-icon { font-size: 32px; width: 32px; height: 32px; color: var(--sm-color-amber-500); }
      p { font-size: 0.85rem; line-height: 1.5; margin: 0; max-width: 280px; }
    }

    .map-loading-placeholder {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      color: var(--sm-color-text-soft);
      background: rgba(255, 255, 255, 0.02);
      mat-icon { font-size: 24px; width: 24px; height: 24px; }
      span { font-size: 0.8rem; }
    }

    .error-state {
      padding: 2.5rem 1.4rem;
      text-align: center;
      background:
        linear-gradient(180deg, rgba(20, 18, 24, 0.9), rgba(14, 13, 18, 0.96));
      border-radius: 22px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--sm-color-crimson-500); margin-bottom: 1rem; }
      p { color: var(--sm-color-text-soft); margin-bottom: 1.5rem; }
    }

    .spin {
      animation: spin 2s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .verification-card {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .card-header-premium {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      color: var(--sm-color-amber-300);
      font-size: 0.82rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      padding-bottom: 0.9rem;
      mat-icon {
        color: var(--sm-color-amber-400);
      }
    }

    .verification-body {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.85rem;
      font-size: 0.85rem;
      .label {
        color: var(--sm-color-text-muted);
      }
      .status-val {
        font-weight: 700;
        padding: 0.3rem 0.65rem;
        border-radius: 999px;
        font-size: 0.75rem;
        &[data-status="VERIFICADO"] {
          background: rgba(46, 204, 113, 0.15);
          color: #2ecc71;
        }
        &[data-status="PENDIENTE"] {
          background: rgba(241, 196, 15, 0.15);
          color: #f1c40f;
        }
        &[data-status="BLOQUEADO"] {
          background: rgba(231, 76, 60, 0.15);
          color: #e74c3c;
        }
        &[data-status="RECHAZADO_ERROR"] {
          background: rgba(231, 76, 60, 0.15);
          color: #e74c3c;
        }
      }
    }

    .code-row {
      background: rgba(255, 255, 255, 0.03);
      padding: 0.7rem 0.85rem;
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .pin-code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 1.1rem;
      font-weight: 800;
      letter-spacing: 2px;
      color: #ffd089;
    }

    .override-section {
      margin-top: 0.5rem;
      padding: 0.95rem;
      background: rgba(231, 76, 60, 0.05);
      border-radius: 16px;
      border: 1px solid rgba(231, 76, 60, 0.15);
    }

    .override-warn {
      font-size: 0.75rem;
      color: #e74c3c;
      line-height: 1.3;
      margin: 0 0 0.75rem 0;
    }

    .override-input-group {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .motive-textarea {
      width: 100%;
      min-height: 88px;
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 14px;
      padding: 0.75rem 0.85rem;
      color: white;
      font-size: 0.82rem;
      resize: vertical;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      &:focus {
        border-color: rgba(255, 150, 32, 0.4);
        box-shadow: 0 0 0 3px rgba(255, 150, 32, 0.12);
      }
    }

    .override-btn {
      width: 100%;
      min-height: 42px;
      font-size: 0.78rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
    }

    @media (max-width: 959px) {
      .page-container {
        gap: 1rem;
      }

      .hero-banner {
        flex-direction: column;
      }

      .hero-badges {
        justify-content: flex-start;
      }

      .details-layout,
      .main-column,
      .side-column {
        gap: 1rem;
      }

      .details-map-container {
        height: 260px;
      }
    }

    @media (max-width: 720px) {
      .page-container {
        padding-bottom: 1.5rem;
      }

      .card,
      .verification-card,
      .map-card {
        border-radius: 20px;
      }

      .map-header,
      .info-row {
        align-items: flex-start;
        flex-direction: column;
      }

      .code-row {
        gap: 0.55rem;
      }

      .pin-code {
        font-size: 1rem;
        letter-spacing: 1.4px;
      }

      .details-map-container {
        height: 220px;
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class IncidentDetails implements OnDestroy {
  private route = inject(ActivatedRoute);
  private emergenciesService = inject(EmergenciesService);
  private trackingService = inject(IncidentTrackingService);
  private location = inject(Location);
  private platformId = inject(PLATFORM_ID);
  private snackBar = inject(MatSnackBar);
  private authStore = inject(AuthStore);

  overrideReason = '';
  isOverriding = false;

  canOverride(incident: any): boolean {
    if (!incident) return false;
    const user = this.authStore.user();
    if (!user) return false;
    
    const status = (incident.estado_incidente || '').toUpperCase();
    if (status !== 'TECNICO_EN_SITIO' && status !== 'TECNICO_RECHAZADO') {
      return false;
    }
    
    return user.rol_nombre === 'superadmin' || user.rol_nombre === 'admin_taller';
  }

  async performManualOverride() {
    if (!this.overrideReason.trim()) return;
    this.isOverriding = true;
    try {
      await lastValueFrom(this.emergenciesService.overrideVerification(this.incidentId, this.overrideReason));
      this.snackBar.open('Manual override aplicado con éxito. Servicio iniciado.', 'Ok', {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
      this.overrideReason = '';
      this.incidentQuery.refetch();
    } catch (err: any) {
      console.error(err);
      this.snackBar.open(`Error al aplicar override: ${err?.error?.detail || err?.message || 'Error desconocido'}`, 'Cerrar', {
        duration: 5000
      });
    } finally {
      this.isOverriding = false;
    }
  }

  incidentId = this.route.snapshot.paramMap.get('id') || '';
  mapsLoaded = false;
  
  // Coordenadas del Mapa
  mapCenter: google.maps.LatLngLiteral = { lat: 0, lng: 0 };
  mapZoom = 15;
  techPosition: google.maps.LatLngLiteral | null = null;
  polylinePath: google.maps.LatLngLiteral[] = [];
  etaMinutos: number | null = null;

  // Estilo Dark Premium para Google Maps
  mapOptions: google.maps.MapOptions = {
    styles: [
      { elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#1f2937' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
      { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#f3f4f6' }] },
      { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#60a5fa' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#374151' }] },
      { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1f2937' }] },
      { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
      { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#4b5563' }] },
      { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#111827' }] },
      { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
      { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#60a5fa' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#111827' }] },
      { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#374151' }] }
    ],
    disableDefaultUI: true,
    zoomControl: true
  };

  // Opciones de Marcadores
  incidentMarkerOptions: google.maps.MarkerOptions = {
    icon: {
      path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
      fillColor: '#ef4444', // Crimson / Rojo
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: 1.5,
      anchor: { x: 12, y: 22 } as any
    },
    title: 'Incidente de Emergencia'
  };

  techMarkerOptions: google.maps.MarkerOptions = {
    icon: {
      path: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42.99L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
      fillColor: '#3b82f6', // Sapphire / Azul
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 1.5,
      scale: 1.2,
      anchor: { x: 12, y: 12 } as any
    },
    title: 'Técnico de Auxilio'
  };

  polylineOptions: google.maps.PolylineOptions = {
    strokeColor: '#60a5fa', // Celeste / Azul claro
    strokeOpacity: 0.8,
    strokeWeight: 4
  };

  readonly sirenIcon = Siren;
  readonly mapIcon = MapIcon;
  readonly compassIcon = Compass;

  private trackingSubscription?: Subscription;

  incidentQuery = injectQuery(() => ({
    queryKey: ['incident', this.incidentId],
    queryFn: () => lastValueFrom(this.emergenciesService.getIncidentById(this.incidentId)),
    enabled: !!this.incidentId
  }));

  constructor() {
    // Iniciar carga del script de mapas y conexión de sockets cuando se cargue el incidente
    effect(() => {
      const data = this.incidentQuery.data();
      if (data && isPlatformBrowser(this.platformId)) {
        if (data.latitud && data.longitud) {
          this.mapCenter = { lat: data.latitud, lng: data.longitud };
          this.loadGoogleMapsScript().then(() => {
            this.mapsLoaded = true;
          });
        }
        
        // Manejar la conexión al WebSocket de seguimiento (scoping por sucursal)
        this.manageTrackingSubscription(data.estado_incidente, data.id_sucursal);
      }
    });
  }

  private loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && (window as any).google) {
        resolve();
        return;
      }

      const scriptId = 'google-maps-script';
      let script = document.getElementById(scriptId) as HTMLScriptElement;

      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=geometry`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        document.head.appendChild(script);
      } else {
        script.addEventListener('load', () => resolve());
      }
    });
  }

  private manageTrackingSubscription(status: string, branchId?: string | null) {
    const activeStates = ['TALLER_ASIGNADO', 'EN_CAMINO', 'EN_ATENCION'];
    const shouldSubscribe = activeStates.includes(status.toUpperCase()) && !!branchId;

    if (shouldSubscribe) {
      if (!this.trackingSubscription) {
        console.log(`🔌 Iniciando suscripción de tracking para incidente: ${this.incidentId} (Sucursal: ${branchId})`);
        this.trackingSubscription = this.trackingService.connect(this.incidentId, branchId!).subscribe({
          next: (message: WebSocketMessage) => {
            this.handleWebsocketMessage(message);
          },
          error: (err) => {
            console.error('Error en WebSocket de seguimiento:', err);
          }
        });
      }
    } else {
      if (this.trackingSubscription) {
        console.log(`🔌 Desconectando tracking (estado inactivo o sin sucursal: ${status})`);
        this.trackingSubscription.unsubscribe();
        this.trackingSubscription = undefined;
        this.trackingService.disconnect();
      }
    }
  }

  private handleWebsocketMessage(message: WebSocketMessage) {
    if (message.type === 'TRACKING_UPDATE' && message.data) {
      console.log('📍 Actualización de tracking recibida:', message.data);
      const { latitud, longitud, eta_minutos, polyline_ruta } = message.data;
      
      if (latitud && longitud) {
        this.techPosition = { lat: latitud, lng: longitud };
        
        // Auto-centrar el mapa para mostrar ambos marcadores
        if ((window as any).google) {
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(this.mapCenter);
          bounds.extend(this.techPosition);
          // Si el mapa ya está instanciado, se puede re-encuadrar, o simplemente dejamos que el zoom ajuste
        }
      }

      if (eta_minutos !== undefined) {
        this.etaMinutos = eta_minutos;
      }

      if (polyline_ruta && (window as any).google) {
        try {
          const decoded = google.maps.geometry.encoding.decodePath(polyline_ruta);
          this.polylinePath = decoded.map(p => ({ lat: p.lat(), lng: p.lng() }));
        } catch (e) {
          console.error('Error al decodificar la polilínea de ruta:', e);
        }
      }
    } else if (message.type === 'STATUS_UPDATE' || message.type === 'STATUS_UPDATED') {
      console.log('🚨 Cambio de estado detectado por WebSocket. Refrescando datos...');
      this.incidentQuery.refetch();
      if (message.data && message.data.estado_nuevo) {
        const cleanState = message.data.estado_nuevo.replace(/_/g, ' ').toUpperCase();
        this.snackBar.open(`🚨 ESTADO DE EMERGENCIA: ${cleanState}`, 'Ok', {
          duration: 5000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });
      }
    }
  }

  ngOnDestroy() {
    if (this.trackingSubscription) {
      this.trackingSubscription.unsubscribe();
    }
    this.trackingService.disconnect();
  }

  goBack() {
    this.location.back();
  }
}
