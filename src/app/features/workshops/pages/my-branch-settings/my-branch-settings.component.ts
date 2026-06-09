import { ChangeDetectionStrategy, Component, computed, inject, signal, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { WorkshopsService } from '../../data-access/workshops.service';
import { SucursalCreate, SucursalResponse } from '@core/models/workshops.model';
import { injectQuery, injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GoogleMapsModule } from '@angular/google-maps';
import { 
  LucideAngularModule, 
  Building, 
  MapPin, 
  Phone, 
  Save, 
  ArrowLeft, 
  Copy, 
  Check, 
  RotateCcw, 
  Locate, 
  Crosshair, 
  Maximize2, 
  Info, 
  AlertTriangle, 
  Wrench, 
  X, 
  Search 
} from 'lucide-angular';
import { PageHeaderComponent, LoadingStateComponent } from '@shared/ui';
import { environment } from '@env/environment';

@Component({
  selector: 'app-my-branch-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatTooltipModule,
    GoogleMapsModule,
    LucideAngularModule,
    PageHeaderComponent,
    LoadingStateComponent
  ],
  template: `
    <div class="page-container">
      <app-page-header 
        title="Configuración de Mi Taller" 
        subtitle="Actualiza la dirección, teléfono y ubicación GPS de tu sucursal asignada.">
        <div prefix class="header-prefix">
          <button mat-icon-button class="btn-back" (click)="goBack()" matTooltip="Volver">
            <lucide-icon [img]="arrowLeftIcon" [size]="20"></lucide-icon>
          </button>
          <div class="header-icon-badge">
            <lucide-icon [img]="wrenchIcon" [size]="22"></lucide-icon>
          </div>
        </div>
        <div actions class="header-actions">
          @if (hasUnsavedChanges()) {
            <div class="unsaved-badge">
              <span class="dot animate-pulse"></span>
              Tienes cambios sin guardar
            </div>
          }
        </div>
      </app-page-header>

      @if (branchQuery.isLoading()) {
        <app-loading-state message="Sincronizando con tu taller..."></app-loading-state>
      } @else if (branchQuery.isError()) {
        <div class="error-container sm-glass-card">
          <lucide-icon [img]="alertIcon" [size]="32" class="error-icon"></lucide-icon>
          <h3>Acceso Denegado / Error</h3>
          <p>No tienes asignado ningún taller físico en el sistema o el taller no existe. Contacta al administrador Owner.</p>
        </div>
      } @else {
        <!-- Tarjeta de Perfil de la Sucursal -->
        <div class="branch-profile-card sm-glass-card">
          <div class="profile-avatar">
            <lucide-icon [img]="buildingIcon" [size]="26" class="avatar-icon"></lucide-icon>
          </div>
          <div class="profile-details">
            <div class="profile-title-row">
              <h2 class="branch-name">{{ branchQuery.data()?.nombre }}</h2>
              <span class="badge-assigned">Sucursal asignada</span>
            </div>
            <div class="profile-id-row">
              <span class="id-label">ID de Sucursal:</span>
              <span class="id-value">{{ branchQuery.data()?.id_sucursal }}</span>
              <button mat-icon-button class="btn-copy" (click)="copyBranchId()" [matTooltip]="copied() ? '¡Copiado!' : 'Copiar ID'">
                <lucide-icon [img]="copied() ? checkIcon : copyIcon" [size]="14"></lucide-icon>
              </button>
            </div>
          </div>
        </div>

        <div class="settings-grid">
          <!-- Columna Izquierda: Formulario -->
          <div class="settings-card sm-glass-card form-column">
            <form [formGroup]="branchForm" (ngSubmit)="onSubmit()" class="branch-form-group">
              
              <!-- Sección 1: Datos de Contacto -->
              <div class="form-section">
                <div class="section-header">
                  <div class="section-title-icon contact-icon-bg">
                    <lucide-icon [img]="phoneIcon" [size]="16"></lucide-icon>
                  </div>
                  <h3>1. Datos de contacto</h3>
                </div>
                
                <div class="form-fields">
                  <div class="form-field-group">
                    <label class="field-label">Dirección física del taller *</label>
                    <mat-form-field class="sm-capsule-field" appearance="outline" subscriptSizing="dynamic">
                      <lucide-icon matPrefix [img]="mapPinIcon" [size]="16" class="input-icon-prefix"></lucide-icon>
                      <input matInput formControlName="direccion" placeholder="Ej: 4to anillo / Canal isuto / Calle 3" />
                      <button mat-icon-button matSuffix (click)="geocodeAddress()" type="button" class="btn-search-address" matTooltip="Buscar dirección en el mapa">
                        <lucide-icon [img]="searchIcon" [size]="16"></lucide-icon>
                      </button>
                    </mat-form-field>
                    @if (branchForm.get('direccion')?.touched && branchForm.get('direccion')?.invalid) {
                      <span class="field-error-msg">La dirección física es requerida.</span>
                    }
                  </div>

                  <div class="form-field-group">
                    <label class="field-label">Teléfono de contacto *</label>
                    <mat-form-field class="sm-capsule-field" appearance="outline" subscriptSizing="dynamic">
                      <lucide-icon matPrefix [img]="phoneIcon" [size]="16" class="input-icon-prefix"></lucide-icon>
                      <input matInput formControlName="telefono" placeholder="Ej: 56735678" />
                    </mat-form-field>
                    @if (branchForm.get('telefono')?.touched && branchForm.get('telefono')?.invalid) {
                      <span class="field-error-msg">El teléfono de contacto es requerido.</span>
                    }
                  </div>
                </div>
              </div>

              <!-- Sección 2: Ubicación GPS -->
              <div class="form-section">
                <div class="section-header">
                  <div class="section-title-icon gps-icon-bg">
                    <lucide-icon [img]="mapPinIcon" [size]="16"></lucide-icon>
                  </div>
                  <h3>2. Ubicación GPS</h3>
                  <lucide-icon [img]="infoIcon" [size]="15" class="section-help-icon" matTooltip="Ingresa las coordenadas o usa el mapa interactivo para configurarla."></lucide-icon>
                </div>

                <div class="form-fields">
                  <div class="coords-row">
                    <div class="form-field-group">
                      <label class="field-label">Latitud *</label>
                      <mat-form-field class="sm-capsule-field" appearance="outline" subscriptSizing="dynamic">
                        <input matInput formControlName="latitud" type="number" placeholder="Ej: -17.7513" />
                        <lucide-icon matSuffix [img]="crosshairIcon" [size]="16" class="input-icon-suffix"></lucide-icon>
                      </mat-form-field>
                      <div class="validation-status-text" [class.valid]="latitudValid()" [class.invalid]="!latitudValid()">
                        <span class="status-indicator-dot"></span>
                        <span>{{ latitudValid() ? '✓ Válido (-90 a 90)' : '✗ Inválido (-90 a 90)' }}</span>
                      </div>
                    </div>

                    <div class="form-field-group">
                      <label class="field-label">Longitud *</label>
                      <mat-form-field class="sm-capsule-field" appearance="outline" subscriptSizing="dynamic">
                        <input matInput formControlName="longitud" type="number" placeholder="Ej: -63.1928" />
                        <lucide-icon matSuffix [img]="crosshairIcon" [size]="16" class="input-icon-suffix"></lucide-icon>
                      </mat-form-field>
                      <div class="validation-status-text" [class.valid]="longitudValid()" [class.invalid]="!longitudValid()">
                        <span class="status-indicator-dot"></span>
                        <span>{{ longitudValid() ? '✓ Válido (-180 a 180)' : '✗ Inválido (-180 a 180)' }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Caja de Alerta de Validación de Coordenadas -->
                  <div class="coordinates-status-box" [ngClass]="coordsValidationStatus()">
                    <div class="status-box-icon">
                      @if (coordsValidationStatus() === 'valid') {
                        <lucide-icon [img]="infoIcon" [size]="18"></lucide-icon>
                      } @else {
                        <lucide-icon [img]="alertIcon" [size]="18"></lucide-icon>
                      }
                    </div>
                    <div class="status-box-content">
                      @if (coordsValidationStatus() === 'valid') {
                        <div class="status-box-title">Coordenadas válidas</div>
                        <div class="status-box-desc">Las coordenadas ingresadas son correctas y están dentro del rango permitido.</div>
                      } @else if (coordsValidationStatus() === 'invalid') {
                        <div class="status-box-title">Coordenadas inválidas</div>
                        <div class="status-box-desc">La latitud debe ser entre -90 y 90, y la longitud entre -180 y 180.</div>
                      } @else {
                        <div class="status-box-title">Coordenadas incompletas</div>
                        <div class="status-box-desc">Por favor ingresa coordenadas válidas o usa los botones de ayuda para autocompletar.</div>
                      }
                    </div>
                  </div>

                  <!-- Botones de Acción Rápida -->
                  <div class="quick-actions-row">
                    <button type="button" mat-stroked-button class="btn-quick-action" (click)="useCurrentLocation()">
                      <lucide-icon [img]="locateIcon" [size]="14"></lucide-icon>
                      <span>Usar mi ubicación actual</span>
                    </button>
                    <button type="button" mat-stroked-button class="btn-quick-action" (click)="centerMap()">
                      <lucide-icon [img]="crosshairIcon" [size]="14"></lucide-icon>
                      <span>Centrar mapa</span>
                    </button>
                    <button type="button" mat-stroked-button class="btn-quick-action" (click)="resetChanges()">
                      <lucide-icon [img]="rotateCcwIcon" [size]="14"></lucide-icon>
                      <span>Restablecer cambios</span>
                    </button>
                  </div>
                </div>
              </div>

            </form>
          </div>

          <!-- Columna Derecha: Mapa Interactivo -->
          <div class="settings-card sm-glass-card map-column">
            <div class="map-section-header">
              <div class="header-left">
                <div class="section-title-icon map-icon-bg">
                  <lucide-icon [img]="mapPinIcon" [size]="16"></lucide-icon>
                </div>
                <div class="map-title-details">
                  <h3>3. Vista previa de ubicación</h3>
                  <span class="map-help-text">Haz clic en el mapa o arrastra el marcador para ajustar la ubicación exacta.</span>
                </div>
              </div>
              <button type="button" mat-stroked-button class="btn-fullscreen" (click)="toggleFullscreen()">
                <lucide-icon [img]="isFullscreen() ? xIcon : maximizeIcon" [size]="14"></lucide-icon>
                <span>{{ isFullscreen() ? 'Salir' : 'Pantalla completa' }}</span>
              </button>
            </div>

            <!-- Contenedor del Mapa con Transición -->
            <div class="google-map-wrapper" [class.fullscreen-map]="isFullscreen()">
              @if (isFullscreen()) {
                <div class="fullscreen-overlay-header">
                  <div class="overlay-title">
                    <lucide-icon [img]="wrenchIcon" [size]="18" class="wrench-icon-glow"></lucide-icon>
                    <span>Configurando ubicación: {{ branchQuery.data()?.nombre }}</span>
                  </div>
                  <button type="button" class="btn-close-overlay" (click)="toggleFullscreen()">
                    <lucide-icon [img]="xIcon" [size]="16"></lucide-icon>
                    <span>Cerrar</span>
                  </button>
                </div>
              }
              
              @if (apiLoaded()) {
                <google-map 
                  [height]="isFullscreen() ? '100%' : '370px'" 
                  width="100%" 
                  [center]="mapCenter()" 
                  [zoom]="14"
                  [options]="mapOptions()"
                  (mapClick)="onMapClick($event)">
                  <map-marker 
                    [position]="markerPosition()"
                    [options]="markerOptions()"
                    (mapDragend)="onMarkerDragEnd($event)">
                  </map-marker>
                </google-map>
              } @else {
                <div class="map-error-placeholder">
                  <lucide-icon [img]="alertIcon" [size]="32" class="error-icon"></lucide-icon>
                  <p>Cargando mapa interactivo de Google...</p>
                  <span class="map-error-sub">Si tarda demasiado, verifica tu conexión de red o la configuración de API.</span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Barra Inferior de Acciones Generales -->
        <div class="form-action-bar sm-glass-card">
          <button mat-stroked-button type="button" class="btn-cancel-form" (click)="goBack()">
            Cancelar
          </button>
          <button mat-flat-button color="primary" class="btn-save-form" type="button" (click)="onSubmit()"
            [disabled]="branchForm.invalid || !hasUnsavedChanges() || updateMutation.isPending()">
            <lucide-icon [img]="saveIcon" [size]="16"></lucide-icon>
            <span>{{ updateMutation.isPending() ? 'Guardando...' : 'Guardar configuración' }}</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { 
      padding: 0.25rem 0 1rem; 
      max-width: 1440px; 
      margin: 0 auto; 
      animation: fadeIn 0.4s ease-out;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    /* Page Header Prefix and Actions customization */
    .header-prefix {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-right: 0.5rem;
    }
    .btn-back {
      color: var(--sm-color-text-muted) !important;
      background: rgba(255, 255, 255, 0.02) !important;
      border: 1px solid rgba(255, 255, 255, 0.05) !important;
      border-radius: 50% !important;
      width: 40px !important;
      height: 40px !important;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      &:hover {
        color: white !important;
        background: rgba(255, 255, 255, 0.08) !important;
        border-color: rgba(255, 255, 255, 0.15) !important;
      }
    }
    .header-icon-badge {
      width: 42px;
      height: 42px;
      background: linear-gradient(135deg, var(--sm-color-sapphire-600), var(--sm-color-sapphire-800));
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .unsaved-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 1rem;
      border-radius: 20px;
      background: rgba(245, 158, 11, 0.06);
      border: 1px solid rgba(245, 158, 11, 0.2);
      color: #fbbf24;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      animation: pulseAlert 2.5s infinite ease-in-out;
      
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #f59e0b;
        box-shadow: 0 0 6px #f59e0b;
      }
    }

    /* Branch Profile Secondary Card */
    .branch-profile-card {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      padding: 1.25rem 1.5rem;
      border-radius: 16px;
      background:
        radial-gradient(circle at 100% 0%, rgb(var(--sm-rgb-orange-500) / 0.12), transparent 24%),
        linear-gradient(180deg, rgb(var(--sm-rgb-white) / 0.02), rgb(var(--sm-rgb-white) / 0.01)),
        var(--sm-color-gunmetal-900) !important;
      border: 1px solid rgb(var(--sm-rgb-orange-500) / 0.14) !important;
      
      .profile-avatar {
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: linear-gradient(135deg, #ef4444, #7f1d1d);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        box-shadow: 0 4px 14px rgba(239, 68, 68, 0.25);
        border: 1.5px solid rgba(255, 255, 255, 0.15);
      }
      .profile-details {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .profile-title-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
        
        .branch-name {
          font-size: 1.35rem;
          font-weight: 800;
          color: white;
          margin: 0;
          letter-spacing: -0.01em;
        }
        .badge-assigned {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          padding: 0.2rem 0.6rem;
          border-radius: 6px;
          background: rgba(59, 130, 246, 0.12);
          border: 1px solid rgba(59, 130, 246, 0.25);
          color: #60a5fa;
        }
      }
      .profile-id-row {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.75rem;
        color: var(--sm-color-text-muted);
        
        .id-label {
          font-weight: 500;
        }
        .id-value {
          font-family: monospace;
          background: rgba(0, 0, 0, 0.2);
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.03);
        }
        .btn-copy {
          width: 24px !important;
          height: 24px !important;
          line-height: 24px !important;
          color: var(--sm-color-text-muted) !important;
          &:hover {
            color: white !important;
            background: rgba(255, 255, 255, 0.05) !important;
          }
        }
      }
    }

    /* Grid Layout */
    .settings-grid { 
      display: grid; 
      grid-template-columns: 1fr 1.1fr; 
      gap: 1.25rem; 
      align-items: start;
    }
    
    .settings-card {
      border-radius: 16px !important; 
      background: rgba(255, 255, 255, 0.02) !important;
      border: 1px solid rgba(255, 255, 255, 0.05) !important;
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
    }

    .form-column {
      gap: 1.5rem;
    }

    .branch-form-group {
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
      
      .section-header {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        padding-bottom: 0.75rem;
        
        .section-title-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .contact-icon-bg {
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
          border-color: rgba(16, 185, 129, 0.25);
        }
        .gps-icon-bg {
          background: rgba(139, 92, 246, 0.12);
          color: #8b5cf6;
          border-color: rgba(139, 92, 246, 0.25);
        }
        
        h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 700;
          color: white;
          letter-spacing: -0.01em;
        }
        .section-help-icon {
          color: var(--sm-color-text-muted);
          cursor: help;
          margin-left: 0.25rem;
          &:hover {
            color: white;
          }
        }
      }
      
      .form-fields {
        display: flex;
        flex-direction: column;
        gap: 1.1rem;
      }
    }

    .form-field-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      
      .field-label {
        font-size: 0.7rem;
        color: var(--sm-color-text-muted);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .field-error-msg {
        font-size: 0.75rem;
        color: #f87171;
        margin-top: 0.2rem;
        padding-left: 0.5rem;
      }
    }

    .input-icon-prefix {
      color: rgba(255, 255, 255, 0.3);
      margin-right: 0.5rem;
    }
    .input-icon-suffix {
      color: rgba(255, 255, 255, 0.2);
    }
    .btn-search-address {
      color: var(--sm-color-text-muted) !important;
      &:hover {
        color: white !important;
        background: rgba(255, 255, 255, 0.05) !important;
      }
    }

    .coords-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .validation-status-text {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      font-weight: 600;
      margin-top: 0.25rem;
      padding-left: 0.5rem;
      
      .status-indicator-dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        display: inline-block;
      }
      
      &.valid {
        color: #10b981;
        .status-indicator-dot { background-color: #10b981; }
      }
      &.invalid {
        color: #ef4444;
        .status-indicator-dot { background-color: #ef4444; }
      }
    }

    /* Coordinates status Alert box */
    .coordinates-status-box {
      display: flex;
      gap: 0.75rem;
      padding: 0.9rem 1rem;
      border-radius: 12px;
      transition: all 0.25s ease;
      
      .status-box-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        height: fit-content;
      }
      .status-box-content {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }
      .status-box-title {
        font-size: 0.85rem;
        font-weight: 700;
      }
      .status-box-desc {
        font-size: 0.75rem;
        line-height: 1.3;
      }
      
      &.valid {
        background: rgba(59, 130, 246, 0.06);
        border: 1px solid rgba(59, 130, 246, 0.18);
        color: #60a5fa;
        .status-box-icon { color: #3b82f6; }
        .status-box-desc { color: rgba(255, 255, 255, 0.7); }
      }
      &.invalid {
        background: rgba(239, 68, 68, 0.06);
        border: 1px solid rgba(239, 68, 68, 0.18);
        color: #f87171;
        .status-box-icon { color: #ef4444; }
        .status-box-desc { color: rgba(255, 255, 255, 0.7); }
      }
      &.incomplete {
        background: rgba(156, 163, 175, 0.04);
        border: 1px solid rgba(156, 163, 175, 0.15);
        color: #9ca3af;
        .status-box-icon { color: #9ca3af; }
        .status-box-desc { color: rgba(255, 255, 255, 0.5); }
      }
    }

    /* Quick Action buttons */
    .quick-actions-row {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 0.25rem;
      
      .btn-quick-action {
        border-radius: 20px !important;
        font-size: 0.75rem !important;
        font-weight: 600 !important;
        height: 34px !important;
        padding: 0 0.85rem !important;
        color: var(--sm-color-text-muted) !important;
        border-color: rgba(255, 255, 255, 0.08) !important;
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        background: rgba(255, 255, 255, 0.01);
        
        &:hover {
          color: white !important;
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(255, 255, 255, 0.15) !important;
        }
      }
    }

    /* Map column details */
    .map-column {
      gap: 1.25rem;
    }
    .map-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      
      .header-left {
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }
      .map-icon-bg {
        background: rgba(59, 130, 246, 0.12);
        color: #3b82f6;
        border-color: rgba(59, 130, 246, 0.25);
        width: 28px;
        height: 28px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid;
      }
      .map-title-details {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        
        h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 700;
          color: white;
          letter-spacing: -0.01em;
        }
        .map-help-text {
          font-size: 0.7rem;
          color: var(--sm-color-text-muted);
        }
      }
      .btn-fullscreen {
        border-radius: 20px !important;
        font-size: 0.75rem !important;
        font-weight: 600 !important;
        height: 32px !important;
        padding: 0 0.85rem !important;
        color: var(--sm-color-text-muted) !important;
        border-color: rgba(255, 255, 255, 0.08) !important;
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        background: rgba(255, 255, 255, 0.01);
        &:hover {
          color: white !important;
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(255, 255, 255, 0.15) !important;
        }
      }
    }

    .google-map-wrapper {
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgb(var(--sm-rgb-orange-500) / 0.12);
      box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
      background: #0b1019;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 1;
      
      &.fullscreen-map {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 9999;
        border-radius: 0;
        border: none;
        box-shadow: none;
        animation: zoomIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
    }

    .fullscreen-overlay-header {
      position: absolute;
      top: 1.5rem;
      left: 1.5rem;
      right: 1.5rem;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 0.75rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 10;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      
      .overlay-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: white;
        font-weight: 700;
        font-size: 0.9rem;
        
        .wrench-icon-glow {
          color: #3b82f6;
          filter: drop-shadow(0 0 4px #3b82f6);
        }
      }
      
      .btn-close-overlay {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: white;
        border-radius: 20px;
        padding: 0.4rem 1rem;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        transition: all 0.2s ease;
        &:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.4);
          color: #f87171;
        }
      }
    }

    .map-error-placeholder {
      height: 370px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 2rem;
      text-align: center;
      background: rgba(0, 0, 0, 0.2);
      color: var(--sm-color-text-muted);
      
      .error-icon {
        color: #3b82f6;
        opacity: 0.6;
        animation: spin-slow 12s linear infinite;
      }
      p {
        margin: 0;
        font-size: 0.85rem;
        color: white;
        font-weight: 600;
      }
      .map-error-sub {
        font-size: 0.75rem;
        color: var(--sm-color-text-muted);
        max-width: 280px;
      }
    }

    /* Global Actions Footer Bar */
    .form-action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 2rem;
      border-radius: 16px;
      background:
        linear-gradient(180deg, rgb(var(--sm-rgb-white) / 0.02), rgb(var(--sm-rgb-white) / 0.01)),
        var(--sm-color-gunmetal-900) !important;
      border: 1px solid rgb(var(--sm-rgb-orange-500) / 0.12) !important;
      margin-top: 0.5rem;
      
      .btn-cancel-form {
        border-radius: 20px !important;
        font-weight: 600 !important;
        font-size: 0.8rem !important;
        color: var(--sm-color-text-muted) !important;
        border-color: rgba(255, 255, 255, 0.08) !important;
        height: 40px !important;
        padding: 0 1.75rem !important;
        background: transparent;
        transition: all 0.2s ease;
        &:hover {
          color: white !important;
          background: rgba(255, 255, 255, 0.04) !important;
          border-color: rgba(255, 255, 255, 0.15) !important;
        }
      }
      .btn-save-form {
        border-radius: 20px !important;
        font-weight: 600 !important;
        font-size: 0.8rem !important;
        background: linear-gradient(135deg, var(--sm-color-orange-500), var(--sm-color-orange-600)) !important;
        color: white !important;
        height: 40px !important;
        padding: 0 1.75rem !important;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        box-shadow: 0 4px 14px rgba(59, 130, 246, 0.15);
        transition: all 0.2s ease;
        
        &:hover:not(:disabled) {
          background: linear-gradient(135deg, var(--sm-color-orange-400), var(--sm-color-orange-500)) !important;
          box-shadow: 0 4px 20px rgb(var(--sm-rgb-orange-500) / 0.25);
        }
        &:disabled {
          background: rgba(255, 255, 255, 0.03) !important;
          color: rgba(255, 255, 255, 0.15) !important;
          border-color: rgba(255, 255, 255, 0.02) !important;
          box-shadow: none;
        }
      }
    }

    .error-container { 
      padding: 3rem 2rem; 
      text-align: center; 
      color: #ef4444; 
      border: 1px solid rgba(239, 68, 68, 0.18); 
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      
      .error-icon {
        color: #ef4444;
        filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.3));
      }
      h3 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 700;
        color: white;
      }
      p {
        margin: 0;
        font-size: 0.85rem;
        color: var(--sm-color-text-muted);
        max-width: 420px;
      }
    }

    @keyframes pulseAlert {
      0%, 100% { border-color: rgba(245, 158, 11, 0.2); background: rgba(245, 158, 11, 0.06); }
      50% { border-color: rgba(245, 158, 11, 0.45); background: rgba(245, 158, 11, 0.12); }
    }
    @keyframes spin-slow {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes zoomIn {
      from { transform: scale(0.98); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    @keyframes fadeIn { 
      from { opacity: 0; transform: translateY(6px); } 
      to { opacity: 1; transform: translateY(0); } 
    }

    /* Responsive adjustments */
    @media (max-width: 1024px) {
      .settings-grid { 
        grid-template-columns: 1fr; 
      }
    }
    @media (max-width: 640px) {
      .page-container {
        padding: 1rem;
        gap: 1rem;
      }
      .settings-card {
        padding: 1.25rem;
      }
      .coords-row {
        grid-template-columns: 1fr;
      }
      .quick-actions-row {
        flex-direction: column;
        
        .btn-quick-action {
          width: 100% !important;
          justify-content: center;
        }
      }
      .branch-profile-card {
        flex-direction: column;
        text-align: center;
        align-items: center;
        padding: 1.25rem 1rem;
        
        .profile-title-row {
          justify-content: center;
        }
        .profile-id-row {
          justify-content: center;
        }
      }
      .form-action-bar {
        flex-direction: column-reverse;
        gap: 0.75rem;
        padding: 1rem;
        
        .btn-cancel-form {
          width: 100% !important;
        }
        .btn-save-form {
          width: 100% !important;
          justify-content: center;
        }
      }
    }
  `]
})
export class MyBranchSettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private workshopsService = inject(WorkshopsService);
  private snackBar = inject(MatSnackBar);
  private queryClient = injectQueryClient();

  // Iconos Lucide
  readonly arrowLeftIcon = ArrowLeft;
  readonly wrenchIcon = Wrench;
  readonly buildingIcon = Building;
  readonly mapPinIcon = MapPin;
  readonly phoneIcon = Phone;
  readonly saveIcon = Save;
  readonly copyIcon = Copy;
  readonly checkIcon = Check;
  readonly rotateCcwIcon = RotateCcw;
  readonly locateIcon = Locate;
  readonly crosshairIcon = Crosshair;
  readonly maximizeIcon = Maximize2;
  readonly infoIcon = Info;
  readonly alertIcon = AlertTriangle;
  readonly xIcon = X;
  readonly searchIcon = Search;

  apiLoaded = signal(false);
  copied = signal(false);
  isFullscreen = signal(false);

  // Reactividad del Mapa
  mapCenter = signal<google.maps.LatLngLiteral>({ lat: -17.7833, lng: -63.1821 });
  markerPosition = signal<google.maps.LatLngLiteral>({ lat: -17.7833, lng: -63.1821 });

  // Estilo Dark personalizado para Google Maps
  mapOptions = computed<google.maps.MapOptions>(() => ({
    styles: [
      { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
      {
        featureType: 'administrative.locality',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#cbd5e1' }]
      },
      {
        featureType: 'poi',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#38bdf8' }]
      },
      {
        featureType: 'poi.park',
        elementType: 'geometry',
        stylers: [{ color: '#1e293b' }]
      },
      {
        featureType: 'poi.park',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#475569' }]
      },
      {
        featureType: 'road',
        elementType: 'geometry',
        stylers: [{ color: '#1e293b' }]
      },
      {
        featureType: 'road',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#334155' }]
      },
      {
        featureType: 'road',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#94a3b8' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry',
        stylers: [{ color: '#1e293b' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#334155' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#f1f5f9' }]
      },
      {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#0f172a' }]
      },
      {
        featureType: 'water',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#475569' }]
      },
      {
        featureType: 'water',
        elementType: 'labels.text.stroke',
        stylers: [{ color: '#0f172a' }]
      }
    ],
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    scaleControl: true,
    streetViewControl: false,
    rotateControl: false,
    fullscreenControl: false
  }));

  markerOptions = computed<google.maps.MarkerOptions>(() => ({
    draggable: true,
    animation: typeof google !== 'undefined' ? google.maps.Animation.DROP : undefined
  }));

  branchForm = this.fb.nonNullable.group({
    direccion: ['', Validators.required],
    telefono: ['', Validators.required],
    latitud: [0, [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitud: [0, [Validators.required, Validators.min(-180), Validators.max(180)]]
  });

  // Signal para rastrear el valor actual del formulario y comparar cambios
  formValueSignal = signal({ direccion: '', telefono: '', latitud: 0, longitud: 0 });

  ngOnInit() {
    this.loadGoogleMapsScript().then(() => this.apiLoaded.set(true));

    // Escuchar cambios en campos GPS para sincronizar marcador automáticamente
    this.branchForm.get('latitud')?.valueChanges.subscribe(() => this.updateMapFromInputs());
    this.branchForm.get('longitud')?.valueChanges.subscribe(() => this.updateMapFromInputs());

    // Sincronizar el valor actual del formulario para el dirty checking reactivo
    this.branchForm.valueChanges.subscribe(() => {
      const raw = this.branchForm.getRawValue();
      this.formValueSignal.set({
        direccion: raw.direccion,
        telefono: raw.telefono,
        latitud: Number(raw.latitud) || 0,
        longitud: Number(raw.longitud) || 0
      });
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

  // ── Queries ─────────────────────────────────────────────────────────────────
  branchQuery = injectQuery(() => ({
    queryKey: ['my-branch'],
    queryFn: () => lastValueFrom(this.workshopsService.getMyBranch()),
    gcTime: 0 // Evitar guardar cache de asignaciones cruzadas
  }));

  // Cargar datos en el formulario cuando la query se complete
  constructor() {
    effect(() => {
      const branch = this.branchQuery.data();
      if (branch) {
        this.branchForm.patchValue({
          direccion: branch.direccion,
          telefono: branch.telefono || '',
          latitud: branch.latitud || -17.7833,
          longitud: branch.longitud || -63.1821
        });
        
        // Resetear estado sucio/limpio tras cargar/guardar exitosamente
        this.branchForm.markAsPristine();
        const raw = this.branchForm.getRawValue();
        this.formValueSignal.set({
          direccion: raw.direccion,
          telefono: raw.telefono,
          latitud: Number(raw.latitud) || 0,
          longitud: Number(raw.longitud) || 0
        });

        const lat = branch.latitud || -17.7833;
        const lng = branch.longitud || -63.1821;
        this.mapCenter.set({ lat, lng });
        this.markerPosition.set({ lat, lng });
      }
    });
  }

  // ── Signals de Validación ───────────────────────────────────────────────────
  latitudValid = computed(() => {
    const ctrl = this.branchForm.get('latitud');
    if (!ctrl) return false;
    const val = ctrl.value;
    if (val === null || val === undefined || (val as any) === '') return false;
    return ctrl.valid;
  });

  longitudValid = computed(() => {
    const ctrl = this.branchForm.get('longitud');
    if (!ctrl) return false;
    const val = ctrl.value;
    if (val === null || val === undefined || (val as any) === '') return false;
    return ctrl.valid;
  });

  coordsValidationStatus = computed<'valid' | 'invalid' | 'incomplete'>(() => {
    const latCtrl = this.branchForm.get('latitud');
    const lngCtrl = this.branchForm.get('longitud');
    
    if (!latCtrl || !lngCtrl) return 'incomplete';
    
    const latVal = latCtrl.value;
    const lngVal = lngCtrl.value;
    
    if (latVal === null || latVal === undefined || (latVal as any) === '' ||
        lngVal === null || lngVal === undefined || (lngVal as any) === '') {
      return 'incomplete';
    }
    
    if (latCtrl.invalid || lngCtrl.invalid) {
      return 'invalid';
    }
    
    return 'valid';
  });

  hasUnsavedChanges = computed(() => {
    const branch = this.branchQuery.data();
    if (!branch) return false;

    const current = this.formValueSignal();
    const originalDireccion = branch.direccion;
    const originalTelefono = branch.telefono || '';
    const originalLat = branch.latitud || -17.7833;
    const originalLng = branch.longitud || -63.1821;

    return current.direccion !== originalDireccion ||
           current.telefono !== originalTelefono ||
           Number(current.latitud) !== Number(originalLat) ||
           Number(current.longitud) !== Number(originalLng);
  });

  // ── Lógica Mapa ─────────────────────────────────────────────────────────────
  onMapClick(event: google.maps.MapMouseEvent) {
    if (event.latLng) {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      this.markerPosition.set({ lat, lng });
      this.branchForm.patchValue({ latitud: lat, longitud: lng });
      this.branchForm.markAsDirty();
      this.reverseGeocode(lat, lng);
    }
  }

  onMarkerDragEnd(event: google.maps.MapMouseEvent) {
    if (event.latLng) {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      this.markerPosition.set({ lat, lng });
      this.branchForm.patchValue({ latitud: lat, longitud: lng });
      this.branchForm.markAsDirty();
      this.reverseGeocode(lat, lng);
    }
  }

  private updateMapFromInputs() {
    const latCtrl = this.branchForm.get('latitud');
    const lngCtrl = this.branchForm.get('longitud');
    
    if (latCtrl?.valid && lngCtrl?.valid && 
        latCtrl.value !== null && (latCtrl.value as any) !== '' &&
        lngCtrl.value !== null && (lngCtrl.value as any) !== '') {
      const lat = Number(latCtrl.value);
      const lng = Number(lngCtrl.value);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        const currentMarker = this.markerPosition();
        if (lat !== currentMarker.lat || lng !== currentMarker.lng) {
          this.markerPosition.set({ lat, lng });
          this.mapCenter.set({ lat, lng });
        }
      }
    }
  }

  private reverseGeocode(lat: number, lng: number) {
    if (typeof google === 'undefined' || !google.maps) return;
    
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const address = results[0].formatted_address.substring(0, 255);
        this.branchForm.patchValue({ direccion: address });
        this.branchForm.markAsDirty();
      } else {
        console.warn('Geocoding failed due to:', status);
      }
    });
  }

  geocodeAddress() {
    const address = this.branchForm.get('direccion')?.value;
    if (!address || typeof google === 'undefined' || !google.maps) return;
    
    this.snackBar.open('⏳ Buscando dirección en el mapa...', 'Cerrar', { duration: 2000 });
    
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location;
        const lat = location.lat();
        const lng = location.lng();
        
        this.branchForm.patchValue({ latitud: lat, longitud: lng });
        this.branchForm.markAsDirty();
        
        this.markerPosition.set({ lat, lng });
        this.mapCenter.set({ lat, lng });
        
        this.snackBar.open('✅ Dirección encontrada y marcada en el mapa.', 'Cerrar', { duration: 3000 });
      } else {
        this.snackBar.open('⚠️ No se pudo geolocalizar la dirección ingresada.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  // ── Acciones GPS Rápidas ────────────────────────────────────────────────────
  useCurrentLocation() {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      this.snackBar.open('❌ Geolocalización no está soportada por tu navegador', 'Cerrar', { duration: 4000 });
      return;
    }
    
    this.snackBar.open('⏳ Obteniendo ubicación actual...', 'Cerrar', { duration: 2500 });
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        this.branchForm.patchValue({ latitud: lat, longitud: lng });
        this.branchForm.markAsDirty();
        
        this.markerPosition.set({ lat, lng });
        this.mapCenter.set({ lat, lng });
        
        this.reverseGeocode(lat, lng);
        this.snackBar.open('✅ Ubicación actualizada con éxito', 'Cerrar', { duration: 3000 });
      },
      (error) => {
        let msg = '❌ Error al obtener tu ubicación';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = '❌ Permiso de ubicación denegado por el usuario o navegador';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = '❌ Ubicación GPS no disponible en este dispositivo';
            break;
          case error.TIMEOUT:
            msg = '❌ Tiempo de espera agotado al obtener ubicación';
            break;
        }
        this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  centerMap() {
    const latCtrl = this.branchForm.get('latitud');
    const lngCtrl = this.branchForm.get('longitud');
    
    if (latCtrl?.valid && lngCtrl?.valid && 
        latCtrl.value !== null && (latCtrl.value as any) !== '' &&
        lngCtrl.value !== null && (lngCtrl.value as any) !== '') {
      const lat = Number(latCtrl.value);
      const lng = Number(lngCtrl.value);
      if (!isNaN(lat) && !isNaN(lng)) {
        this.mapCenter.set({ lat, lng });
        this.snackBar.open('🔍 Mapa centrado en tus coordenadas actuales', 'Cerrar', { duration: 2000 });
      }
    } else {
      this.snackBar.open('⚠️ Primero ingresa coordenadas válidas para centrar el mapa', 'Cerrar', { duration: 3500 });
    }
  }

  resetChanges() {
    const branch = this.branchQuery.data();
    if (branch) {
      this.branchForm.patchValue({
        direccion: branch.direccion,
        telefono: branch.telefono || '',
        latitud: branch.latitud || -17.7833,
        longitud: branch.longitud || -63.1821
      });
      this.branchForm.markAsPristine();
      
      const lat = branch.latitud || -17.7833;
      const lng = branch.longitud || -63.1821;
      this.mapCenter.set({ lat, lng });
      this.markerPosition.set({ lat, lng });
      this.snackBar.open('Valores restablecidos a la configuración guardada.', 'Cerrar', { duration: 2500 });
    }
  }

  copyBranchId() {
    const branch = this.branchQuery.data();
    if (branch?.id_sucursal && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(branch.id_sucursal).then(() => {
        this.copied.set(true);
        this.snackBar.open('📋 ID de Sucursal copiado al portapapeles', 'Cerrar', { duration: 2000 });
        setTimeout(() => this.copied.set(false), 2000);
      }).catch(err => {
        console.error('Error al copiar:', err);
        this.snackBar.open('❌ No se pudo copiar el ID', 'Cerrar', { duration: 3000 });
      });
    }
  }

  toggleFullscreen() {
    this.isFullscreen.update(val => !val);
    // Recentrar en la posición del marcador tras redimensionar el mapa
    setTimeout(() => {
      this.mapCenter.set(this.markerPosition());
    }, 150);
  }

  goBack() {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  }

  // ── Mutations ───────────────────────────────────────────────────────────────
  updateMutation = injectMutation(() => ({
    mutationFn: (data: SucursalCreate) => lastValueFrom(this.workshopsService.updateMyBranchLocal(data)),
    onSuccess: () => {
      this.snackBar.open('✅ Configuración de taller guardada con éxito', 'Cerrar', { duration: 3000 });
      this.queryClient.invalidateQueries({ queryKey: ['my-branch'] });
    },
    onError: () => this.snackBar.open('❌ Error al actualizar el taller', 'Cerrar', { duration: 4000 })
  }));

  onSubmit() {
    if (this.branchForm.invalid) return;

    const branch = this.branchQuery.data();
    if (!branch) return;

    const raw = this.branchForm.getRawValue();
    const payload: SucursalCreate = {
      nombre: branch.nombre, // Se mantiene el nombre original corporativo
      direccion: raw.direccion,
      telefono: raw.telefono,
      latitud: Number(raw.latitud),
      longitud: Number(raw.longitud)
    };

    this.updateMutation.mutate(payload);
  }
}

