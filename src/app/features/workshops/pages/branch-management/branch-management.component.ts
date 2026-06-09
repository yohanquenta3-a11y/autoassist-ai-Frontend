import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { WorkshopsService } from '../../data-access/workshops.service';
import { SucursalCreate, SucursalResponse } from '@core/models/workshops.model';
import { injectQuery, injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { GoogleMapsModule } from '@angular/google-maps';
import { LucideAngularModule, Building2, MapPin, Phone, Pencil, Trash2, CheckCircle2, UserCheck, X, Mail } from 'lucide-angular';
import { PageHeaderComponent, LoadingStateComponent, EmptyStateComponent } from '@shared/ui';
import { IdentityService } from '@features/identity/data-access/identity.service';
import { UserResponse } from '@core/models/identity.model';
import { environment } from '@env/environment';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-branch-management',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatTableModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatDialogModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatSelectModule,
    GoogleMapsModule,
    LucideAngularModule,
    PageHeaderComponent,
    LoadingStateComponent,
    EmptyStateComponent
  ],
  template: `
    <div class="page-container">
      <app-page-header 
        title="Gestión de Talleres" 
        subtitle="Administra tus talleres físicos y asigna sus administradores locales."
        [icon]="buildingIcon">
        <div actions>
          <button mat-flat-button color="primary" class="btn-add" (click)="openCreateForm()">
            <lucide-icon [img]="buildingIcon" [size]="18"></lucide-icon>
            Nuevo Taller
          </button>
        </div>
      </app-page-header>

      <!-- Panel de Registro / Edición -->
      @if (showForm()) {
        <div class="form-grid sm-glass-card">
          <div class="form-header">
            <div class="header-left">
              <lucide-icon [img]="editingBranch() ? editIcon : buildingIcon" [size]="18" class="edit-icon-title"></lucide-icon>
              <h3>{{ editingBranch() ? 'Editar Taller' : 'Nuevo Taller' }}</h3>
              @if (editingBranch()) {
                <span class="edit-dot"></span>
              }
            </div>
            <button mat-icon-button (click)="closeForm()" class="btn-close-header">
              <lucide-icon [img]="closeIcon" [size]="18"></lucide-icon>
            </button>
          </div>
          
          <div class="form-layout">
            <form [formGroup]="branchForm" (ngSubmit)="onSubmit()" class="branch-form">
              <div class="form-field-group">
                <label class="field-label">Nombre del Taller *</label>
                <mat-form-field class="sm-capsule-field" appearance="outline" subscriptSizing="dynamic">
                  <input matInput formControlName="nombre" placeholder="Ej: Taller Norte" />
                </mat-form-field>
              </div>

              <div class="form-field-group">
                <label class="field-label">Teléfono</label>
                <mat-form-field class="sm-capsule-field" appearance="outline" subscriptSizing="dynamic">
                  <input matInput formControlName="telefono" placeholder="Ej: 77712345" />
                </mat-form-field>
              </div>

              <div class="form-field-group">
                <label class="field-label">Dirección Física *</label>
                <mat-form-field class="sm-capsule-field" appearance="outline" subscriptSizing="dynamic">
                  <input matInput formControlName="direccion" placeholder="Ej: Av. Banzer 4to Anillo" />
                </mat-form-field>
              </div>

              <div class="form-field-group">
                <label class="field-label">Administrador Asignado</label>
                <mat-form-field class="sm-capsule-field" appearance="outline" subscriptSizing="dynamic">
                  <mat-select formControlName="id_usuario_admin">
                    <mat-option [value]="null">-- Sin asignar --</mat-option>
                    @for (admin of adminsQuery.data() || []; track admin.id_usuario) {
                      <mat-option [value]="admin.id_usuario">
                        {{ admin.nombre }} ({{ admin.correo }}) {{ admin.id_sucursal && admin.id_sucursal !== editingBranch()?.id_sucursal ? '- [Asignado a otro]' : '' }}
                      </mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="coord-inputs">
                <div class="form-field-group">
                  <label class="field-label">Latitud *</label>
                  <mat-form-field class="sm-capsule-field" appearance="outline" subscriptSizing="dynamic">
                    <input matInput formControlName="latitud" type="number" readonly />
                  </mat-form-field>
                </div>

                <div class="form-field-group">
                  <label class="field-label">Longitud *</label>
                  <mat-form-field class="sm-capsule-field" appearance="outline" subscriptSizing="dynamic">
                    <input matInput formControlName="longitud" type="number" readonly />
                  </mat-form-field>
                </div>
              </div>

              <div class="form-actions">
                <button mat-stroked-button type="button" class="btn-cancel" (click)="closeForm()">Cancelar</button>
                <button mat-flat-button class="btn-save" type="submit"
                  [disabled]="branchForm.invalid || createMutation.isPending() || updateMutation.isPending()">
                  <lucide-icon [img]="checkIcon" [size]="16"></lucide-icon>
                  {{ (createMutation.isPending() || updateMutation.isPending()) ? 'Guardando...' : 'Guardar' }}
                </button>
              </div>
            </form>

            <!-- Selector de Mapa de Google -->
            <div class="map-picker-container">
              <div class="map-picker-help">
                <lucide-icon [img]="mapPinIcon" [size]="16" class="pin-icon"></lucide-icon>
                <span>Arrastra el marcador rojo para fijar las coordenadas exactas:</span>
              </div>
              
              <div class="google-map-wrapper">
                @if (apiLoaded()) {
                  <google-map 
                    height="310px" 
                    width="100%" 
                    [center]="mapCenter()" 
                    [zoom]="mapZoom()"
                    (mapClick)="onMapClick($event)">
                    <map-marker 
                      [position]="markerPosition()"
                      [options]="markerOptions"
                      (mapDragend)="onMarkerDragEnd($event)">
                    </map-marker>
                  </google-map>
                } @else {
                  <div class="map-loading-placeholder">
                    Cargando mapa interactivo...
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Panel de Asignar Administrador de Sucursal -->
      @if (showAssignForm()) {
        <div class="form-grid sm-glass-card assign-card">
          <div class="form-header">
            <div class="header-left">
              <lucide-icon [img]="userCheckIcon" [size]="18" class="edit-icon-title"></lucide-icon>
              <h3>Asignar Administrador del Taller</h3>
            </div>
            <button mat-icon-button (click)="closeAssignForm()" class="btn-close-header">
              <lucide-icon [img]="closeIcon" [size]="18"></lucide-icon>
            </button>
          </div>
          
          <div class="assign-form">
            <p class="assign-intro">Selecciona un usuario registrado con rol administrativo para el taller: <strong>{{ selectedBranch()?.nombre }}</strong></p>
            <div class="user-picker table-container">
              <table mat-table [dataSource]="adminsQuery.data() || []" class="admins-table modern-table">
                <ng-container matColumnDef="nombre">
                  <th mat-header-cell *matHeaderCellDef>Administrador</th>
                  <td mat-cell *matCellDef="let admin">
                    <div class="admin-profile-cell">
                      <div class="avatar-box admin_taller">
                        {{ admin.nombre[0] | uppercase }}
                      </div>
                      <div class="admin-details">
                        <div class="admin-name">{{ admin.nombre }}</div>
                        <div class="admin-sub">ID: {{ admin.id_usuario.substring(0,8) }}</div>
                      </div>
                    </div>
                  </td>
                </ng-container>
                <ng-container matColumnDef="correo">
                  <th mat-header-cell *matHeaderCellDef>Contacto</th>
                  <td mat-cell *matCellDef="let admin">
                    <div class="admin-contact">
                      <lucide-icon [img]="mailIcon" [size]="12"></lucide-icon>
                      <span>{{ admin.correo }}</span>
                    </div>
                  </td>
                </ng-container>
                <ng-container matColumnDef="acciones">
                  <th mat-header-cell *matHeaderCellDef class="actions-header">Acciones</th>
                  <td mat-cell *matCellDef="let admin" class="actions-cell">
                    <button mat-flat-button class="btn-assign-action" (click)="assignAdmin(admin.id_usuario)">
                      Asignar
                    </button>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="['nombre', 'correo', 'acciones']"></tr>
                <tr mat-row *matRowDef="let row; columns: ['nombre', 'correo', 'acciones']"></tr>
              </table>
              
              @if ((adminsQuery.data() || []).length === 0) {
                <div class="no-admins-warning">⚠️ No hay administradores de taller disponibles. Crea uno en Gestión de Usuarios primero.</div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Grid de Sucursales -->
      @if (branchesQuery.isLoading()) {
        <app-loading-state message="Cargando talleres..."></app-loading-state>
      } @else {
        <div class="branches-grid">
          @for (branch of branchesQuery.data() || []; track branch.id_sucursal) {
            <div class="branch-card sm-glass-card" [class.inactive]="!branch.estado">
              <div class="branch-card-header">
                <h4 class="branch-title">{{ branch.nombre }}</h4>
                <span class="status-dot-chip" [class.active]="branch.estado">
                  <span class="dot"></span>
                  {{ branch.estado ? 'Activo' : 'Inactivo' }}
                </span>
              </div>
              
              <div class="branch-card-divider"></div>
              
              <div class="branch-card-body">
                <!-- Dirección -->
                <div class="detail-item">
                  <span class="detail-label">
                    <lucide-icon [img]="mapPinIcon" [size]="14"></lucide-icon>
                    Dirección
                  </span>
                  <span class="detail-value">{{ branch.direccion }}</span>
                </div>
                
                <div class="branch-card-divider"></div>

                <!-- Teléfono y Coordenadas -->
                <div class="details-row-double">
                  @if (branch.telefono) {
                    <div class="detail-item">
                      <span class="detail-label">
                        <lucide-icon [img]="phoneIcon" [size]="14"></lucide-icon>
                        Teléfono
                      </span>
                      <span class="detail-value">{{ branch.telefono }}</span>
                    </div>
                  }
                  <div class="detail-item">
                    <span class="detail-label">
                      <lucide-icon [img]="mapPinIcon" [size]="14"></lucide-icon>
                      Coordenadas
                    </span>
                    <span class="detail-value latlong">Lat: {{ branch.latitud | number:'1.4-4' }}<br>Lon: {{ branch.longitud | number:'1.4-4' }}</span>
                  </div>
                </div>

                <!-- Administrador Asignado -->
                @if (getBranchAdmin(branch.id_sucursal); as admin) {
                  <div class="branch-card-divider"></div>
                  <div class="detail-item">
                    <span class="detail-label">
                      <lucide-icon [img]="userCheckIcon" [size]="14"></lucide-icon>
                      Administrador
                    </span>
                    <span class="detail-value admin-name">{{ admin.nombre }} ({{ admin.correo }})</span>
                  </div>
                } @else {
                  <div class="branch-card-divider"></div>
                  <div class="detail-item">
                    <span class="detail-label">
                      <lucide-icon [img]="userCheckIcon" [size]="14"></lucide-icon>
                      Administrador
                    </span>
                    <span class="detail-value admin-none">Sin administrador asignado</span>
                  </div>
                }
              </div>

              <div class="branch-card-actions">
                <button class="action-btn edit" matTooltip="Editar datos" (click)="openEditForm(branch)">
                  <lucide-icon [img]="editIcon" [size]="16"></lucide-icon>
                </button>
                <button class="action-btn assign" matTooltip="Asignar Administrador" (click)="openAssignForm(branch)">
                  <lucide-icon [img]="userCheckIcon" [size]="16"></lucide-icon>
                </button>
                <button class="action-btn status" 
                  [matTooltip]="branch.estado ? 'Desactivar taller' : 'Reactivar taller'"
                  [class.delete]="branch.estado"
                  [class.activate]="!branch.estado"
                  (click)="toggleStatus(branch.id_sucursal)">
                  <lucide-icon [img]="branch.estado ? deleteIcon : checkIcon" [size]="16"></lucide-icon>
                </button>
              </div>
            </div>
          }

          @if ((branchesQuery.data() || []).length === 0) {
            <div class="no-branches-container">
              <app-empty-state 
                [icon]="buildingIcon" 
                title="Sin talleres registrados" 
                message="Aún no has registrado ningún taller físico.">
              </app-empty-state>
            </div>
          }
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
    }

    /* Formulario */
    .form-grid { 
      margin-bottom: 2.5rem; 
      padding: 2rem 2.25rem; 
      border-radius: 16px !important; 
      background:
        radial-gradient(circle at 100% 0%, rgb(var(--sm-rgb-orange-500) / 0.12), transparent 24%),
        linear-gradient(180deg, rgb(var(--sm-rgb-white) / 0.02), rgb(var(--sm-rgb-white) / 0.01)),
        var(--sm-color-gunmetal-900) !important;
      border: 1px solid rgb(var(--sm-rgb-orange-500) / 0.14) !important;
      position: relative;
      box-shadow: 0 24px 60px -40px rgb(var(--sm-rgb-black) / 0.96);
    }
    
    .form-header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      margin-bottom: 1.75rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);

      .header-left {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        
        .edit-icon-title {
          color: #3b82f6;
        }
        h3 {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 700;
          color: white;
        }
        .edit-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #f59e0b;
          box-shadow: 0 0 6px #f59e0b;
          margin-left: 0.15rem;
        }
      }
      
      .btn-close-header {
        color: var(--sm-color-text-muted) !important;
        &:hover {
          color: white !important;
          background: rgba(255, 255, 255, 0.05) !important;
        }
      }
    }
    
    .form-layout { display: grid; grid-template-columns: 1fr 1.2fr; gap: 2rem; }
    .branch-form { display: flex; flex-direction: column; gap: 1.1rem; }
    .coord-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    
    .form-field-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .field-label {
      display: block;
      font-size: 0.7rem;
      color: var(--sm-color-text-muted);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .form-actions { 
      display: flex; 
      gap: 0.75rem; 
      justify-content: flex-end; 
      margin-top: 1.25rem;
      padding-top: 1.25rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .btn-cancel {
      border-radius: 20px !important;
      font-weight: 600 !important;
      font-size: 0.8rem !important;
      color: var(--sm-color-text-muted) !important;
      border-color: rgba(255, 255, 255, 0.08) !important;
      height: 38px !important;
      padding: 0 1.5rem !important;
      background: transparent;
      &:hover {
        color: white !important;
        background: rgba(255, 255, 255, 0.03) !important;
        border-color: rgba(255, 255, 255, 0.15) !important;
      }
    }
    .btn-save {
      border-radius: 20px !important;
      font-weight: 600 !important;
      font-size: 0.8rem !important;
      background: #3b82f6 !important;
      color: white !important;
      height: 38px !important;
      padding: 0 1.5rem !important;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      &:hover {
        background: #2563eb !important;
      }
      &:disabled {
        background: rgba(255, 255, 255, 0.05) !important;
        color: rgba(255, 255, 255, 0.2) !important;
      }
    }
    
    .map-picker-container { display: flex; flex-direction: column; gap: 0.75rem; }
    .map-picker-help { 
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: #818cf8; /* Indigo */
      margin: 0;
    }
    
    .google-map-wrapper {
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgb(var(--sm-rgb-orange-500) / 0.12);
      background: rgb(var(--sm-rgb-black) / 0.18);
    }
    
    .map-loading-placeholder {
      height: 310px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--sm-color-text-soft);
      font-size: 0.85rem;
    }

    /* Asignar admin */
    .assign-card { 
      margin-bottom: 2.5rem; 
      padding: 2rem 2.25rem;
    }
    .assign-intro {
      font-size: 0.85rem;
      color: var(--sm-color-text-soft);
      margin-bottom: 1.25rem;
      strong {
        color: #3b82f6;
      }
    }
    .user-picker { 
      border-radius: 12px; 
      overflow: hidden; 
      background: rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .admins-table { 
      width: 100%; 
      background: transparent;
      
      tr.mat-mdc-header-row {
        background: rgba(255, 255, 255, 0.02);
        height: 48px;
      }
      th.mat-mdc-header-cell {
        color: var(--sm-color-text-muted);
        font-weight: 700;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }
      td.mat-mdc-cell {
        border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        padding: 0.75rem 1rem;
      }
      tr.mat-mdc-row:hover {
        background: rgba(255, 255, 255, 0.01);
      }
    }
    
    .admin-profile-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      
      .avatar-box {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.9rem;
        color: white;
        background: #f59e0b; // admin_taller
      }
      .admin-details {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        .admin-name {
          font-weight: 600;
          color: var(--sm-color-text-main);
          font-size: 0.85rem;
        }
        .admin-sub {
          font-size: 0.7rem;
          color: var(--sm-color-text-muted);
          font-family: monospace;
        }
      }
    }
    .admin-contact {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8rem;
      color: var(--sm-color-text-soft);
      lucide-icon {
        color: var(--sm-color-text-muted);
      }
    }
    .actions-header {
      text-align: right !important;
      padding-right: 1.5rem !important;
    }
    .actions-cell {
      text-align: right;
      padding-right: 1.5rem !important;
    }
    .btn-assign-action {
      background: #3b82f6 !important;
      color: white !important;
      border-radius: 20px !important;
      font-size: 0.75rem !important;
      font-weight: 600 !important;
      height: 30px !important;
      padding: 0 1.25rem !important;
      &:hover {
        background: #2563eb !important;
      }
    }
    
    .no-admins-warning { padding: 1.5rem; text-align: center; color: #f59e0b; font-size: 0.85rem; }

    /* Grid de tarjetas */
    .branches-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.25rem; margin-top: 0.5rem; }
    .branch-card { 
      padding: 1.75rem 2rem; 
      border-radius: 16px !important; 
      display: flex; 
      flex-direction: column; 
      gap: 1.25rem; 
      transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
      background:
        radial-gradient(circle at 100% 0%, rgb(var(--sm-rgb-orange-500) / 0.1), transparent 24%),
        linear-gradient(180deg, rgb(var(--sm-rgb-white) / 0.02), rgb(var(--sm-rgb-white) / 0.01)),
        var(--sm-color-gunmetal-900) !important;
      border: 1px solid rgb(var(--sm-rgb-orange-500) / 0.12) !important;
      
      &:hover { 
        transform: translateY(-3px); 
        border-color: rgb(var(--sm-rgb-orange-500) / 0.22) !important;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3) !important;
      }
      &.inactive { 
        opacity: 0.55; 
        &:hover {
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
      }
    }
    
    .branch-card-header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center;
      
      .branch-title { 
        margin: 0; 
        font-size: 1.2rem; 
        font-weight: 700; 
        color: #3b82f6; 
      }
    }
    
    .status-dot-chip { 
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.7rem;
      font-weight: 700;
      background: rgba(255,255,255,0.04);
      color: var(--sm-color-text-muted);
      border: 1px solid rgba(255,255,255,0.06);
      
      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--sm-color-text-muted);
      }
      
      &.active { 
        background: rgba(46, 204, 113, 0.1); 
        color: #2ecc71;
        border-color: rgba(46, 204, 113, 0.15);
        .dot {
          background: #2ecc71;
          box-shadow: 0 0 6px #2ecc71;
        }
      }
    }
    
    .branch-card-divider {
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      margin: 0;
    }
    
    .branch-card-body { 
      display: flex; 
      flex-direction: column; 
      gap: 1.25rem;
      
      .detail-item {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .detail-label {
        font-size: 0.7rem;
        color: var(--sm-color-text-muted);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        lucide-icon {
          color: var(--sm-color-text-muted);
        }
      }
      .detail-value {
        font-size: 0.95rem;
        color: var(--sm-color-text-main);
        font-weight: 500;
        
        &.admin-name {
          color: #3b82f6;
        }
        &.admin-none {
          color: var(--sm-color-text-muted);
          font-style: italic;
        }
      }
      
      .details-row-double {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
      }
      
      .latlong { 
        font-size: 0.8rem !important; 
        color: var(--sm-color-text-soft) !important;
        font-family: monospace;
        line-height: 1.3;
      }
    }
    
    .branch-card-actions { 
      display: flex; 
      gap: 0.5rem; 
      justify-content: flex-end; 
      border-top: 1px solid rgba(255,255,255,0.05); 
      padding-top: 1rem; 
      margin-top: auto;
      
      .action-btn { 
        width: 32px;
        height: 32px;
        line-height: 32px;
        min-width: 32px;
        padding: 0;
        border-radius: 8px;
        background: rgb(var(--sm-rgb-black) / 0.16);
        border: 1px solid rgb(var(--sm-rgb-orange-500) / 0.12);
        color: var(--sm-color-text-muted);
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        
        &:hover { 
          color: white; 
          background: rgb(var(--sm-rgb-orange-500) / 0.12); 
          border-color: rgb(var(--sm-rgb-orange-500) / 0.18);
        }
        
        &.edit:hover {
          background: rgba(99, 102, 241, 0.1);
          color: #818cf8;
          border-color: rgba(99, 102, 241, 0.2);
        }
        &.assign:hover {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          border-color: rgba(59, 130, 246, 0.2);
        }
        &.status.delete:hover { 
          color: #e74c3c; 
          background: rgba(231, 76, 60, 0.1); 
          border-color: rgba(231, 76, 60, 0.2);
        }
        &.status.activate:hover { 
          color: #2ecc71; 
          background: rgba(46, 204, 113, 0.1); 
          border-color: rgba(46, 204, 113, 0.2);
        }
      }
    }
    
    .btn-add {
      border-radius: 20px !important;
      font-weight: 600 !important;
      font-size: 0.8rem !important;
      height: 38px !important;
      padding: 0 1.5rem !important;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #3b82f6 !important;
      color: white !important;
      &:hover {
        background: #2563eb !important;
      }
    }
    
    .no-branches-container { grid-column: 1 / -1; width: 100%; }

    @media (max-width: 960px) {
      .form-layout { grid-template-columns: 1fr; }
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class BranchManagementComponent implements OnInit {
  private fb = inject(FormBuilder);
  private workshopsService = inject(WorkshopsService);
  private identityService = inject(IdentityService);
  private snackBar = inject(MatSnackBar);
  private queryClient = injectQueryClient();

  // Iconos
  readonly buildingIcon = Building2;
  readonly mapPinIcon = MapPin;
  readonly phoneIcon = Phone;
  readonly editIcon = Pencil;
  readonly deleteIcon = Trash2;
  readonly checkIcon = CheckCircle2;
  readonly userCheckIcon = UserCheck;
  readonly closeIcon = X;
  readonly mailIcon = Mail;

  // Estado UI
  showForm = signal(false);
  showAssignForm = signal(false);
  editingBranch = signal<SucursalResponse | null>(null);
  selectedBranch = signal<SucursalResponse | null>(null);
  apiLoaded = signal(false);

  // Mapa reactivo
  mapCenter = signal<google.maps.LatLngLiteral>({ lat: -17.7833, lng: -63.1821 }); // Santa Cruz default
  mapZoom = signal(13);
  markerPosition = signal<google.maps.LatLngLiteral>({ lat: -17.7833, lng: -63.1821 });
  markerOptions: google.maps.MarkerOptions = { draggable: true };

  branchForm = this.fb.group({
    nombre: ['', Validators.required],
    telefono: [''],
    direccion: ['', Validators.required],
    latitud: [0, Validators.required],
    longitud: [0, Validators.required],
    id_usuario_admin: [null as string | null]
  });

  myWorkshopQuery = injectQuery(() => ({
    queryKey: ['my-workshop'],
    queryFn: () => lastValueFrom(this.workshopsService.getMyWorkshop()),
    retry: false
  }));

  getBranchAdmin(branchId: string): UserResponse | undefined {
    return (this.adminsQuery.data() || []).find(
      u => u.id_sucursal === branchId
    );
  }

  ngOnInit() {
    this.loadGoogleMapsScript().then(() => this.apiLoaded.set(true));
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
  branchesQuery = injectQuery(() => ({
    queryKey: ['branches'],
    queryFn: () => lastValueFrom(this.workshopsService.getBranches())
  }));

  // Buscar administradores de taller creados en gestión de usuarios
  adminsQuery = injectQuery(() => ({
    queryKey: ['branch-admins'],
    queryFn: () => lastValueFrom(this.identityService.getUsers()).then(users => 
      users.filter((u: UserResponse) => u.rol_nombre === 'admin_taller')
    )
  }));

  // ── Mutations ───────────────────────────────────────────────────────────────
  createMutation = injectMutation(() => ({
    mutationFn: async ({ data, adminId }: { data: SucursalCreate; adminId: string | null }) => {
      const branch = await lastValueFrom(this.workshopsService.createBranch(data));
      if (adminId && branch.id_sucursal) {
        await lastValueFrom(this.workshopsService.assignBranchAdmin({
          id_usuario: adminId,
          id_sucursal: branch.id_sucursal
        }));
      }
      return branch;
    },
    onSuccess: () => {
      this.snackBar.open('✅ Taller registrado y administrador asignado', 'Cerrar', { duration: 3000 });
      this.queryClient.invalidateQueries({ queryKey: ['branches'] });
      this.queryClient.invalidateQueries({ queryKey: ['branch-admins'] });
      this.closeForm();
    },
    onError: () => this.snackBar.open('❌ Error al registrar taller', 'Cerrar', { duration: 4000 })
  }));

  updateMutation = injectMutation(() => ({
    mutationFn: async ({ id, data, adminId }: { id: string; data: SucursalCreate; adminId: string | null }) => {
      const branch = await lastValueFrom(this.workshopsService.updateBranch(id, data));
      if (adminId) {
        await lastValueFrom(this.workshopsService.assignBranchAdmin({
          id_usuario: adminId,
          id_sucursal: id
        }));
      }
      return branch;
    },
    onSuccess: () => {
      this.snackBar.open('✅ Taller actualizado y administrador asignado', 'Cerrar', { duration: 3000 });
      this.queryClient.invalidateQueries({ queryKey: ['branches'] });
      this.queryClient.invalidateQueries({ queryKey: ['branch-admins'] });
      this.closeForm();
    },
    onError: () => this.snackBar.open('❌ Error al actualizar taller', 'Cerrar', { duration: 4000 })
  }));

  toggleMutation = injectMutation(() => ({
    mutationFn: (id: string) => lastValueFrom(this.workshopsService.toggleBranchStatus(id)),
    onSuccess: (branch) => {
      const msg = branch.estado ? '✅ Taller reactivado' : '⚠️ Taller desactivado';
      this.snackBar.open(msg, 'Cerrar', { duration: 3000 });
      this.queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
    onError: () => this.snackBar.open('❌ Error al cambiar estado del taller', 'Cerrar', { duration: 4000 })
  }));

  assignAdminMutation = injectMutation(() => ({
    mutationFn: (payload: { id_usuario: string; id_sucursal: string }) => 
      lastValueFrom(this.workshopsService.assignBranchAdmin(payload)),
    onSuccess: () => {
      this.snackBar.open('✅ Administrador de taller asignado con éxito', 'Cerrar', { duration: 3000 });
      this.closeAssignForm();
    },
    onError: () => this.snackBar.open('❌ Error al vincular administrador', 'Cerrar', { duration: 4000 })
  }));

  // ── Lógica Mapa ─────────────────────────────────────────────────────────────
  onMapClick(event: google.maps.MapMouseEvent) {
    if (event.latLng) {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      this.markerPosition.set({ lat, lng });
      this.branchForm.patchValue({ latitud: lat, longitud: lng });
      this.reverseGeocode(lat, lng);
    }
  }

  onMarkerDragEnd(event: google.maps.MapMouseEvent) {
    if (event.latLng) {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      this.markerPosition.set({ lat, lng });
      this.branchForm.patchValue({ latitud: lat, longitud: lng });
      this.reverseGeocode(lat, lng);
    }
  }

  private reverseGeocode(lat: number, lng: number) {
    if (typeof google === 'undefined' || !google.maps) return;
    
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const address = results[0].formatted_address.substring(0, 255);
        this.branchForm.patchValue({ direccion: address });
      } else {
        console.warn('Geocoding failed due to:', status);
      }
    });
  }

  // ── Acciones UI ─────────────────────────────────────────────────────────────
  openCreateForm() {
    this.editingBranch.set(null);
    const mainName = this.myWorkshopQuery.data()?.nombre || '';
    this.branchForm.reset({
      nombre: mainName,
      telefono: '',
      direccion: '',
      latitud: -17.7833,
      longitud: -63.1821,
      id_usuario_admin: null
    });
    this.mapCenter.set({ lat: -17.7833, lng: -63.1821 });
    this.markerPosition.set({ lat: -17.7833, lng: -63.1821 });
    this.showForm.set(true);
    this.showAssignForm.set(false);
  }

  openEditForm(branch: SucursalResponse) {
    this.editingBranch.set(branch);
    
    // Buscar si hay un administrador asignado a esta sucursal
    const currentAdmin = (this.adminsQuery.data() || []).find(
      u => u.id_sucursal === branch.id_sucursal
    );
    const adminId = currentAdmin ? currentAdmin.id_usuario : null;

    this.branchForm.patchValue({
      nombre: branch.nombre,
      telefono: branch.telefono || '',
      direccion: branch.direccion,
      latitud: branch.latitud || -17.7833,
      longitud: branch.longitud || -63.1821,
      id_usuario_admin: adminId
    });
    
    const lat = branch.latitud || -17.7833;
    const lng = branch.longitud || -63.1821;
    this.mapCenter.set({ lat, lng });
    this.markerPosition.set({ lat, lng });
    
    this.showForm.set(true);
    this.showAssignForm.set(false);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingBranch.set(null);
  }

  openAssignForm(branch: SucursalResponse) {
    this.selectedBranch.set(branch);
    this.showAssignForm.set(true);
    this.showForm.set(false);
  }

  closeAssignForm() {
    this.selectedBranch.set(null);
    this.showAssignForm.set(false);
  }

  onSubmit() {
    if (this.branchForm.invalid) return;

    const raw = this.branchForm.value;
    const payload: SucursalCreate = {
      nombre: raw.nombre || '',
      telefono: raw.telefono || undefined,
      direccion: raw.direccion || '',
      latitud: raw.latitud || 0,
      longitud: raw.longitud || 0
    };

    const adminId = raw.id_usuario_admin || null;

    const branch = this.editingBranch();
    if (branch) {
      this.updateMutation.mutate({ id: branch.id_sucursal, data: payload, adminId });
    } else {
      this.createMutation.mutate({ data: payload, adminId });
    }
  }

  assignAdmin(userId: string) {
    const branch = this.selectedBranch();
    if (branch) {
      this.assignAdminMutation.mutate({
        id_usuario: userId,
        id_sucursal: branch.id_sucursal
      });
    }
  }

  toggleStatus(id: string) {
    this.toggleMutation.mutate(id);
  }
}
