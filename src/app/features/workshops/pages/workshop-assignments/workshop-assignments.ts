import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WorkshopsService } from '../../data-access/workshops.service';
import { injectQuery, injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { FinanceService } from '@features/finance/data-access/finance.service';
import { LucideAngularModule, ClipboardList, MapPin, Clock, CheckCircle, Search, Filter, RefreshCw, AlertTriangle, Eye, ChevronRight, User, CheckCircle2, UserCheck, Navigation, MessageSquare, Inbox, Wrench, Phone, Siren, Compass, DollarSign } from 'lucide-angular';
import { PageHeaderComponent, LoadingStateComponent } from '@shared/ui';
import { IncidentResponse, TecnicoResponse } from '@core/models/workshops.model';

@Component({
  selector: 'app-workshop-assignments-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, 
    FormsModule,
    MatSnackBarModule, 
    MatButtonModule, 
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatDialogModule,
    LucideAngularModule,
    PageHeaderComponent,
    LoadingStateComponent
  ],
  template: `
    <div class="page-container">
      <app-page-header 
        title="Panel de Auxilios" 
        subtitle="Monitoreo de incidentes en tiempo real y despacho inteligente de técnicos."
        [icon]="assignmentsIcon">
      </app-page-header>

      <!-- Stats Bar -->
      <div class="stats-bar">
        <div class="stat-card">
          <span class="stat-label">SOLICITUDES<br>NUEVAS</span>
          <span class="stat-value color-red">{{ statsSolicitudesNuevas() }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">TÉCNICOS EN<br>RUTA</span>
          <span class="stat-value color-blue">{{ statsTecnicosEnRuta() }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">EN<br>REPARACIÓN</span>
          <span class="stat-value color-yellow">{{ statsEnReparacion() }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">ESPERANDO<br>PAGO</span>
          <span class="stat-value color-orange">{{ statsEsperandoPago() }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">COMPLETADOS<br>HOY</span>
          <span class="stat-value color-green">{{ statsCompletadosHoy() }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">TASA DE<br>RESOLUCIÓN</span>
          <span class="stat-value color-green">{{ statsTasaResolucion() }}%</span>
        </div>
      </div>

      <!-- Filters Bar -->
      <div class="filters-container">
        <div class="search-wrapper">
          <lucide-icon [img]="searchIcon" class="search-icon"></lucide-icon>
          <input 
            type="text" 
            [ngModel]="searchQuery()" 
            (ngModelChange)="searchQuery.set($event)" 
            placeholder="Buscar por ID o descripción..." 
            class="search-input" />
        </div>

        <div class="filter-chips">
          <button 
            class="filter-chip" 
            [class.active]="filterPrioridad() === ''" 
            (click)="filterPrioridad.set('')">
            <lucide-icon [img]="filterIcon" class="chip-icon"></lucide-icon>
            Todas
          </button>
          <button 
            class="filter-chip" 
            [class.active]="filterPrioridad() === 'ALTA'" 
            (click)="filterPrioridad.set('ALTA')">
            Alta
          </button>
          <button 
            class="filter-chip" 
            [class.active]="filterPrioridad() === 'MEDIA'" 
            (click)="filterPrioridad.set('MEDIA')">
            Media
          </button>
          <button 
            class="filter-chip" 
            [class.active]="filterPrioridad() === 'BAJA'" 
            (click)="filterPrioridad.set('BAJA')">
            Baja
          </button>
        </div>
      </div>

      @if (assignmentsQuery.isLoading() && !assignmentsQuery.data()) {
        <app-loading-state message="Sincronizando órdenes de auxilio..."></app-loading-state>
      } @else {
        <!-- Kanban Board -->
        <div class="kanban-board">
          
          <!-- COLUMNA: SOLICITUDES NUEVAS -->
          <div class="kanban-column col-nuevas">
            <div class="column-header">
              <span class="dot-indicator"></span>
              <span class="column-title">Solicitudes Nuevas</span>
              <span class="column-count" [class.has-items]="filteredPending().length > 0">{{ filteredPending().length }}</span>
            </div>
            
            <div class="column-body">
              @for (inc of filteredPending(); track inc.id_incidente) {
                <div class="incident-card" (click)="onIncidentClick(inc.id_incidente)">
                  <div class="card-header">
                    <div class="header-left">
                      <lucide-icon [img]="sirenIcon" class="status-icon color-red"></lucide-icon>
                      <span class="status-text color-red">Solicitud nueva</span>
                    </div>
                    <span class="card-time">{{ formatTime(inc.fecha_reporte) }}</span>
                  </div>
                  
                  <div class="card-body">
                    <p class="summary">{{ inc.resumen_ia || inc.descripcion || 'Analizando evidencias...' }}</p>

                    @if (inc.telefono) {
                      <div class="client-info">
                        <div class="info-item">
                          <lucide-icon [img]="phoneIcon" [size]="12"></lucide-icon>
                          {{ inc.telefono }}
                        </div>
                      </div>
                    }

                    <div class="card-footer-info">
                      <span class="category-tag">{{ getCategory(inc) }}</span>
                      <span class="short-code">{{ getShortCode(inc, $index) }}</span>
                    </div>
                  </div>

                  <div class="card-footer-actions" (click)="$event.stopPropagation()">
                    <mat-form-field appearance="outline" class="full-width-select sm-dark-field">
                      <mat-select #techSelect placeholder="Seleccionar Técnico">
                        @for (tech of techsQuery.data(); track tech.id_tecnico) {
                          <mat-option [value]="tech.id_tecnico" [disabled]="!tech.estado">
                            <div class="tech-option">
                              <span>{{ tech.nombre }}</span>
                              @if (!tech.estado) { <span class="busy-tag">Ocupado</span> }
                            </div>
                          </mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                    
                    <div class="action-buttons">
                      <button mat-flat-button color="primary" 
                              [disabled]="!techSelect.value || acceptMutation.isPending()"
                              (click)="onAccept(inc.id_incidente, techSelect.value)">
                        <div class="btn-content">
                          @if (acceptMutation.isPending()) {
                            <lucide-icon [img]="refreshIcon" class="spin" [size]="14"></lucide-icon>
                          } @else {
                            <span>ACEPTAR</span>
                          }
                        </div>
                      </button>
                      <button mat-button class="reject-btn" (click)="onReject(inc.id_incidente)">
                        RECHAZAR
                      </button>
                    </div>
                  </div>
                </div>
              } @empty {
                <div class="empty-column-state">
                  <lucide-icon [img]="inboxIcon" class="empty-icon"></lucide-icon>
                  <div class="empty-title">Todo despejado.</div>
                  <div class="empty-subtitle">Buen trabajo.</div>
                </div>
              }
            </div>
          </div>

          <!-- COLUMNA: TÉCNICO EN RUTA -->
          <div class="kanban-column col-ruta">
            <div class="column-header">
              <span class="dot-indicator"></span>
              <span class="column-title">Técnico en Ruta</span>
              <span class="column-count" [class.has-items]="filteredEnCamino().length > 0">{{ filteredEnCamino().length }}</span>
            </div>

            <div class="column-body">
              @for (inc of filteredEnCamino(); track inc.id_incidente) {
                <div class="incident-card" (click)="onIncidentClick(inc.id_incidente)">
                  <div class="card-header">
                    <div class="header-left">
                      <lucide-icon [img]="compassIcon" class="status-icon color-blue"></lucide-icon>
                      <span class="status-text color-blue">{{ inc.estado_incidente === 'EN_CAMINO' ? 'Técnico en camino' : 'Técnico asignado' }}</span>
                    </div>
                    <span class="card-time">{{ formatTime(inc.fecha_reporte) }}</span>
                  </div>

                  <div class="card-body">
                    <p class="summary">{{ inc.resumen_ia || inc.descripcion }}</p>
                    
                    @if (inc.technician_name) {
                      <div class="assigned-tech">
                        <lucide-icon [img]="userIcon" [size]="12"></lucide-icon>
                        <span>Técnico: {{ inc.technician_name }}</span>
                      </div>
                    }

                    <div class="card-footer-info">
                      <span class="category-tag">{{ getCategory(inc) }}</span>
                      <span class="short-code">{{ getShortCode(inc, $index) }}</span>
                    </div>
                  </div>

                  <div class="card-footer-actions" (click)="$event.stopPropagation()">
                    <button mat-stroked-button color="primary" class="full-width-btn" (click)="onUpdateStatus(inc.id_incidente, 'EN_ATENCION')">
                      CONFIRMAR LLEGADA
                    </button>
                  </div>
                </div>
              } @empty {
                <div class="empty-column-state">
                  <lucide-icon [img]="mapPinIcon" class="empty-icon"></lucide-icon>
                  <div class="empty-title">No hay técnicos</div>
                  <div class="empty-subtitle">en ruta</div>
                </div>
              }
            </div>
          </div>

          <!-- COLUMNA: EN REPARACIÓN -->
          <div class="kanban-column col-reparacion">
            <div class="column-header">
              <span class="dot-indicator"></span>
              <span class="column-title">En Reparación</span>
              <span class="column-count" [class.has-items]="filteredInProgress().length > 0">{{ filteredInProgress().length }}</span>
            </div>

            <div class="column-body">
              @for (inc of filteredInProgress(); track inc.id_incidente) {
                <div class="incident-card" (click)="onIncidentClick(inc.id_incidente)">
                  <div class="card-header">
                    <div class="header-left">
                      <lucide-icon [img]="clockIcon" class="status-icon color-yellow"></lucide-icon>
                      <span class="status-text color-yellow">
                        {{ inc.estado_incidente === 'EN_ATENCION' ? 'En atención' : 'En reparación' }}
                      </span>
                    </div>
                    <span class="card-time">{{ formatTime(inc.fecha_reporte) }}</span>
                  </div>

                  <div class="card-body">
                    <p class="summary">{{ inc.resumen_ia || inc.descripcion }}</p>

                    @if (inc.technician_name) {
                      <div class="assigned-tech">
                        <lucide-icon [img]="userIcon" [size]="12"></lucide-icon>
                        <span>Técnico: {{ inc.technician_name }}</span>
                      </div>
                    }

                    <div class="card-footer-info">
                      <span class="category-tag">{{ getCategory(inc) }}</span>
                      <span class="short-code">{{ getShortCode(inc, $index) }}</span>
                    </div>
                  </div>

                  <div class="card-footer-actions" (click)="$event.stopPropagation()">
                    <button mat-flat-button color="primary" class="full-width-btn" (click)="onRegisterBilling(inc)">
                      REGISTRAR COBRO
                    </button>
                  </div>
                </div>
              } @empty {
                <div class="empty-column-state">
                  <lucide-icon [img]="wrenchIcon" class="empty-icon"></lucide-icon>
                  <div class="empty-title">Sin trabajos</div>
                  <div class="empty-subtitle">activos en taller</div>
                </div>
              }
            </div>
          </div>

          <!-- COLUMNA: ESPERANDO PAGO -->
          <div class="kanban-column col-esperando-pago">
            <div class="column-header">
              <span class="dot-indicator"></span>
              <span class="column-title">Esperando Pago</span>
              <span class="column-count" [class.has-items]="filteredWaitingPayment().length > 0">{{ filteredWaitingPayment().length }}</span>
            </div>

            <div class="column-body">
              @for (inc of filteredWaitingPayment(); track inc.id_incidente) {
                <div class="incident-card" (click)="onIncidentClick(inc.id_incidente)">
                  <div class="card-header">
                    <div class="header-left">
                      <lucide-icon [img]="dollarIcon" class="status-icon color-orange"></lucide-icon>
                      <span class="status-text color-orange">Esperando Pago</span>
                    </div>
                    <span class="card-time">{{ formatTime(inc.fecha_reporte) }}</span>
                  </div>

                  <div class="card-body">
                    <p class="summary">{{ inc.resumen_ia || inc.descripcion }}</p>

                    @if (inc.technician_name) {
                      <div class="assigned-tech">
                        <lucide-icon [img]="userIcon" [size]="12"></lucide-icon>
                        <span>Técnico: {{ inc.technician_name }}</span>
                      </div>
                    }

                    <div class="card-footer-info">
                      <span class="category-tag">{{ getCategory(inc) }}</span>
                      <span class="short-code">{{ getShortCode(inc, $index) }}</span>
                    </div>
                  </div>

                  <div class="card-footer-actions" (click)="$event.stopPropagation()">
                    @if (inc.monto_total) {
                      <button mat-flat-button color="primary" class="full-width-btn mb-2" (click)="onRegisterBilling(inc)">
                        VER / EDITAR COBRO
                      </button>
                      <button mat-flat-button color="accent" class="full-width-btn" (click)="onManualPayment(inc.id_incidente, inc.monto_total)">
                        REGISTRAR PAGO MANUAL
                      </button>
                    } @else {
                      <button mat-flat-button color="primary" class="full-width-btn" (click)="onRegisterBilling(inc)">
                        REGISTRAR COBRO
                      </button>
                    }
                  </div>
                </div>
              } @empty {
                <div class="empty-column-state">
                  <lucide-icon [img]="clockIcon" class="empty-icon"></lucide-icon>
                  <div class="empty-title">Sin cobros pendientes</div>
                </div>
              }
            </div>
          </div>

          <!-- COLUMNA: FINALIZADOS -->
          <div class="kanban-column col-completados">
            <div class="column-header">
              <span class="dot-indicator"></span>
              <span class="column-title">Completados</span>
              <span class="column-count" [class.has-items]="filteredCompleted().length > 0">{{ filteredCompleted().length }}</span>
            </div>

            <div class="column-body">
              @for (inc of filteredCompleted(); track inc.id_incidente) {
                <div class="incident-card completed-card" (click)="onIncidentClick(inc.id_incidente)">
                  <div class="card-header">
                    <div class="header-left">
                      <lucide-icon [img]="doneIcon" class="status-icon color-green"></lucide-icon>
                      <span class="status-text color-green">Servicio finalizado</span>
                    </div>
                    <span class="card-time">{{ formatTime(inc.fecha_reporte) }}</span>
                  </div>

                  <div class="card-body">
                    <p class="summary-muted">{{ inc.resumen_ia || inc.descripcion }}</p>
                    
                    <div class="card-footer-info">
                      <span class="category-tag">{{ getCategory(inc) }}</span>
                      <span class="short-code">{{ getShortCode(inc, $index) }}</span>
                    </div>
                  </div>
                </div>
              } @empty {
                <div class="empty-column-state">
                  <lucide-icon [img]="doneIcon" class="empty-icon"></lucide-icon>
                  <div class="empty-title">Sin cierres recientes</div>
                </div>
              }
            </div>
          </div>

        </div>
      }
    </div>
  `,
  styles: [`
    .page-container {
      animation: fadeIn 0.4s ease-out;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      width: 100%;
      padding-bottom: 2rem;
    }


    /* Stats Bar */
    .stats-bar {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 0.85rem;
      width: 100%;
    }
    .stat-card {
      background:
        radial-gradient(circle at 100% 0%, rgb(var(--sm-rgb-orange-500) / 0.12), transparent 24%),
        linear-gradient(180deg, rgb(var(--sm-rgb-white) / 0.02), rgb(var(--sm-rgb-white) / 0.01)),
        rgba(25, 30, 45, 0.55);
      border: 1px solid rgb(var(--sm-rgb-orange-500) / 0.12);
      backdrop-filter: blur(10px);
      padding: 1.25rem;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      .stat-label {
        font-size: 0.72rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--sm-color-text-muted, #7f8c8d);
        line-height: 1.3;
      }
      .stat-value {
        font-size: 1.8rem;
        font-weight: 800;
        line-height: 1.2;
        &.color-red { color: #ff5b5b; }
        &.color-blue { color: #3b82f6; }
        &.color-yellow { color: #f1c40f; }
        &.color-orange { color: #e67e22; }
        &.color-green { color: #2ecc71; }
      }
    }

    /* Filters Bar */
    .filters-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
      width: 100%;
      flex-wrap: wrap;
    }
    .search-wrapper {
      position: relative;
      flex: 1;
      min-width: 250px;
      max-width: 450px;
      .search-icon {
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        color: var(--sm-color-text-muted, #7f8c8d);
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
      }
    .search-input {
        width: 100%;
        background: rgb(var(--sm-rgb-black) / 0.18);
        border: 1px solid rgb(var(--sm-rgb-orange-500) / 0.12);
        border-radius: 24px;
        padding: 0.75rem 1rem 0.75rem 2.5rem;
        color: #ffffff;
        font-size: 0.85rem;
        outline: none;
        transition: border-color 0.25s, box-shadow 0.25s;
        &:focus {
          border-color: rgb(var(--sm-rgb-orange-500) / 0.38);
          box-shadow: 0 0 0 2px rgb(var(--sm-rgb-orange-500) / 0.15);
        }
        &::placeholder {
          color: var(--sm-color-text-muted, #7f8c8d);
        }
      }
    }
    .filter-chips {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .filter-chip {
      background: rgb(var(--sm-rgb-black) / 0.18);
      border: 1px solid rgb(var(--sm-rgb-orange-500) / 0.12);
      color: var(--sm-color-text-soft, #bdc3c7);
      padding: 0.5rem 1.1rem;
      border-radius: 20px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.25s ease;
      .chip-icon {
        width: 14px;
        height: 14px;
        color: inherit;
        display: flex;
        align-items: center;
      }
      &:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #ffffff;
      }
      &.active {
        background: rgb(var(--sm-rgb-orange-500) / 0.12);
        border-color: rgb(var(--sm-rgb-orange-500) / 0.3);
        color: var(--sm-color-orange-100);
      }
    }

    /* Kanban Board Layout */
    .kanban-board {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 1rem;
      padding-bottom: 1.5rem;
    }
    .kanban-column {
      display: flex; flex-direction: column; background: linear-gradient(180deg, rgb(var(--sm-rgb-white) / 0.02), rgb(var(--sm-rgb-white) / 0.01)), rgba(18, 20, 28, 0.45); border: 1px solid rgb(var(--sm-rgb-orange-500) / 0.1); border-radius: 14px; overflow: hidden;
      
      /* Accent Column Headers */
      &.col-nuevas { border-top: 4px solid #ff5b5b; .dot-indicator { background: #ff5b5b; } }
      &.col-ruta { border-top: 4px solid #3b82f6; .dot-indicator { background: #3b82f6; } }
      &.col-reparacion { border-top: 4px solid #f1c40f; .dot-indicator { background: #f1c40f; } }
      &.col-esperando-pago { border-top: 4px solid #e67e22; .dot-indicator { background: #e67e22; } }
      &.col-completados { border-top: 4px solid #2ecc71; .dot-indicator { background: #2ecc71; } }
    }
    .column-header {
      padding: 1.1rem 1.25rem 0.75rem; display: flex; align-items: center; gap: 0.6rem; border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      .dot-indicator { width: 6px; height: 6px; border-radius: 50%; }
      .column-title { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: var(--sm-color-text-soft, #bdc3c7); }
      .column-count {
        margin-left: auto;
        background: rgba(255, 255, 255, 0.05);
        color: #94a3b8;
        font-size: 0.72rem;
        font-weight: 700;
        padding: 0.15rem 0.55rem;
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        transition: all 0.25s ease;
        
        &.has-items {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          border-color: rgba(59, 130, 246, 0.25);
        }
      }
    }
    .column-body {
      padding: 1rem 0.8rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-height: 760px;
      overflow-y: auto;
      &::-webkit-scrollbar { width: 4px; }
      &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
    }

    /* Empty Column States */
    .empty-column-state {
      display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 4rem 1rem; gap: 0.5rem; color: var(--sm-color-text-muted, #7f8c8d);
      .empty-icon { width: 32px; height: 32px; opacity: 0.35; margin-bottom: 0.25rem; }
      .empty-title { font-size: 0.88rem; font-weight: 600; color: var(--sm-color-text-soft, #bdc3c7); }
      .empty-subtitle { font-size: 0.78rem; opacity: 0.8; }
    }

    /* Incident Cards styling */
    .incident-card {
      background:
        radial-gradient(circle at 100% 0%, rgb(var(--sm-rgb-orange-500) / 0.08), transparent 22%),
        rgba(25, 30, 45, 0.62);
      border: 1px solid rgb(var(--sm-rgb-orange-500) / 0.1);
      border-radius: 10px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      cursor: pointer;
      transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        background: rgba(25, 30, 45, 0.75);
        border-color: rgb(var(--sm-rgb-orange-500) / 0.22);
      }
      &.completed-card {
        opacity: 0.65;
        cursor: default;
        &:hover {
          transform: none;
          box-shadow: none;
          background: rgba(25, 30, 45, 0.55);
          border-color: rgba(255, 255, 255, 0.06);
        }
      }
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }
      .header-left {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .status-icon {
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
      }
      .status-text {
        font-size: 0.82rem;
        font-weight: 700;
      }
      .card-time {
        font-size: 0.82rem;
        color: var(--sm-color-text-muted, #7f8c8d);
      }
      
      .card-body {
        font-size: 0.92rem;
        line-height: 1.45;
        color: var(--sm-color-text-soft, #bdc3c7);
        display: flex;
        flex-direction: column;
        gap: 0.7rem;
        p { margin: 0; }
        .client-info {
          display: flex;
          gap: 1.25rem;
          .info-item {
            display: flex;
            align-items: center;
            gap: 0.35rem;
            font-size: 0.78rem;
            color: var(--sm-color-text-muted);
          }
        }
        .summary {
          font-size: 0.92rem;
          color: #e2e8f0;
          line-height: 1.45;
          margin: 0;
        }
        .summary-muted {
          font-size: 0.9rem;
          color: var(--sm-color-text-soft);
          line-height: 1.45;
          margin: 0;
        }
        .assigned-tech {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.78rem;
          color: #3498db;
          font-weight: 600;
        }
        .card-footer-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.5rem;
        }
      }

      /* Actions container in footer of the card */
      .card-footer-actions {
        margin-top: 0.5rem;
        padding-top: 0.85rem;
        border-top: 1px solid rgba(255,255,255,0.05);
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
        .full-width-select {
          width: 100%;
          font-size: 0.85rem;
        }
        .action-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.65rem; 
          button {
            font-size: 0.72rem;
            font-weight: 700;
            height: 36px;
          }
          .reject-btn {
            border: 1px solid rgba(255,255,255,0.08);
            color: var(--sm-color-text-soft);
            &:hover { background: rgba(255,255,255,0.03); }
          }
        }
        .full-width-btn {
          width: 100%;
          font-size: 0.78rem;
          font-weight: 700;
          height: 38px;
        }
      }
      
      /* Colors */
      .color-red { color: #ff5b5b; }
      .color-blue { color: #3b82f6; }
      .color-yellow { color: #f1c40f; }
      .color-orange { color: #e67e22; }
      .color-green { color: #2ecc71; }
    }

    .col-nuevas .incident-card { border-left: 4px solid #ff5b5b; }
    .col-ruta .incident-card { border-left: 4px solid #3b82f6; }
    .col-reparacion .incident-card { border-left: 4px solid #f1c40f; }
    .col-esperando-pago .incident-card { border-left: 4px solid #e67e22; }
    .col-completados .incident-card { border-left: 4px solid #2ecc71; }

    .category-tag {
      background: rgb(var(--sm-rgb-orange-500) / 0.08);
      color: #cbd5e1;
      font-size: 0.78rem;
      font-weight: 600;
      padding: 0.3rem 0.8rem;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .short-code {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: linear-gradient(145deg, var(--sm-color-orange-500), var(--sm-color-orange-600));
      color: #ffffff;
      font-weight: 700;
      font-size: 0.78rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .tech-option { display: flex; justify-content: space-between; align-items: center; width: 100%; font-size: 0.78rem;
      .busy-tag { font-size: 0.58rem; color: #ff5b5b; background: rgba(255, 91, 91, 0.1); padding: 0.12rem 0.35rem; border-radius: 4px; font-weight: 700; }
    }

    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class WorkshopAssignments {
  private workshopsService = inject(WorkshopsService);
  private financeService = inject(FinanceService);
  private snackBar = inject(MatSnackBar);
  private queryClient = injectQueryClient();
  private dialog = inject(MatDialog);
  private router = inject(Router);
  
  @ViewChild('alertSound') alertSound!: ElementRef<HTMLAudioElement>;

  // Iconos
  protected readonly assignmentsIcon = ClipboardList;
  protected readonly alertIcon = AlertTriangle;
  protected readonly checkIcon = CheckCircle2;
  protected readonly userCheckIcon = UserCheck;
  protected readonly navigationIcon = Navigation;
  protected readonly messageIcon = MessageSquare;
  protected readonly inboxIcon = Inbox;
  protected readonly wrenchIcon = Wrench;
  protected readonly doneIcon = CheckCircle;
  protected readonly refreshIcon = RefreshCw;
  protected readonly searchIcon = Search;
  protected readonly phoneIcon = Phone;
  protected readonly userIcon = User;
  protected readonly compassIcon = Compass;
  protected readonly sirenIcon = Siren;
  protected readonly filterIcon = Filter;
  protected readonly clockIcon = Clock;
  protected readonly mapPinIcon = MapPin;
  protected readonly dollarIcon = DollarSign;

  // Filtros (Signals para reactividad)
  searchQuery = signal('');
  filterPrioridad = signal('');

  // Consultas
  assignmentsQuery = injectQuery(() => ({
    queryKey: ['assignments'],
    queryFn: () => lastValueFrom(this.workshopsService.getAssignments()),
    refetchInterval: 10000,
  }));

  techsQuery = injectQuery(() => ({
    queryKey: ['technicians'],
    queryFn: () => lastValueFrom(this.workshopsService.getTechnicians()),
  }));

  // Lógica de Filtrado Local para el Board
  private applyBaseFilters(data: IncidentResponse[]) {
    return data.filter(inc => {
      const q = this.searchQuery().toLowerCase();
      const matchSearch = q ? 
        (inc.id_incidente.toLowerCase().includes(q) || 
         inc.resumen_ia?.toLowerCase().includes(q) ||
         inc.descripcion?.toLowerCase().includes(q)) : true;
      
      const priority = (inc.prioridad_incidente || '').trim().toUpperCase();
      const filter = this.filterPrioridad().trim().toUpperCase();
      
      let matchPriority = true;
      if (filter) {
        if (filter === 'ALTA') {
          matchPriority = (priority === 'ALTA' || priority === 'CRITICA');
        } else {
          matchPriority = (priority === filter);
        }
      }
      return matchSearch && matchPriority;
    });
  }

  filteredPending = computed(() => 
    this.applyBaseFilters(this.assignmentsQuery.data() || []).filter(i => 
      ['TALLER_ASIGNADO', 'ASIGNADO', 'ANALIZADO', 'PENDIENTE', 'DATOS_INCOMPLETOS'].includes(i.estado_incidente)
    )
  );

  filteredEnCamino = computed(() => 
    this.applyBaseFilters(this.assignmentsQuery.data() || []).filter(i => 
      ['ACEPTADO', 'EN_CAMINO', 'TECNICO_ASIGNADO'].includes(i.estado_incidente)
    )
  );

  filteredInProgress = computed(() => 
    this.applyBaseFilters(this.assignmentsQuery.data() || []).filter(i => 
      ['EN_PROGRESO', 'EN_ATENCION'].includes(i.estado_incidente)
    )
  );

  filteredWaitingPayment = computed(() => 
    this.applyBaseFilters(this.assignmentsQuery.data() || []).filter(i => 
      ['FINALIZADO'].includes(i.estado_incidente)
    )
  );

  filteredCompleted = computed(() => 
    this.applyBaseFilters(this.assignmentsQuery.data() || []).filter(i => i.estado_incidente === 'COMPLETADO')
  );

  totalActivos = computed(() => 
    this.filteredEnCamino().length + this.filteredInProgress().length + this.filteredWaitingPayment().length
  );

  // Stats calculados para las tarjetas superiores (NUEVO)
  statsSolicitudesNuevas = computed(() => 
    (this.assignmentsQuery.data() || []).filter(i => 
      ['TALLER_ASIGNADO', 'ASIGNADO', 'ANALIZADO', 'PENDIENTE', 'DATOS_INCOMPLETOS'].includes(i.estado_incidente)
    ).length
  );

  statsTecnicosEnRuta = computed(() => 
    (this.assignmentsQuery.data() || []).filter(i => 
      ['ACEPTADO', 'EN_CAMINO', 'TECNICO_ASIGNADO'].includes(i.estado_incidente)
    ).length
  );

  statsEnReparacion = computed(() => 
    (this.assignmentsQuery.data() || []).filter(i => 
      ['EN_PROGRESO', 'EN_ATENCION'].includes(i.estado_incidente)
    ).length
  );

  statsEsperandoPago = computed(() => 
    (this.assignmentsQuery.data() || []).filter(i => 
      ['FINALIZADO'].includes(i.estado_incidente)
    ).length
  );

  statsCompletadosHoy = computed(() => 
    (this.assignmentsQuery.data() || []).filter(i => i.estado_incidente === 'COMPLETADO').length
  );

  statsTasaResolucion = computed(() => {
    const newCount = this.statsSolicitudesNuevas();
    const routeCount = this.statsTecnicosEnRuta();
    const progressCount = this.statsEnReparacion();
    const waitingCount = this.statsEsperandoPago();
    const completedCount = this.statsCompletadosHoy();
    const total = newCount + routeCount + progressCount + waitingCount + completedCount;
    if (total === 0) return 100;
    return Math.round((completedCount / total) * 100);
  });

  // Métodos auxiliares de diseño (NUEVO)
  getCategory(inc: IncidentResponse): string {
    const text = ((inc.descripcion || '') + ' ' + (inc.resumen_ia || '')).toLowerCase();
    if (text.includes('llanta') || text.includes('pincha') || text.includes('neumat') || text.includes('rueda')) {
      return 'Neumático';
    }
    if (text.includes('bater') || text.includes('arranc') || text.includes('electric')) {
      return 'Batería';
    }
    if (text.includes('freno') || text.includes('frenad')) {
      return 'Frenos';
    }
    if (text.includes('motor') || text.includes('aceite') || text.includes('refrigeran') || text.includes('calenta')) {
      return 'Motor';
    }
    if (text.includes('choque') || text.includes('colis') || text.includes('accident') || text.includes('golpe')) {
      return 'Choque';
    }
    return 'Mecánica';
  }

  getShortCode(inc: IncidentResponse, index: number): string {
    const firstLetter = inc.prioridad_incidente?.substring(0, 1).toUpperCase() || 'M';
    const hash = (inc.id_incidente || '').split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const num = (hash % 9) + 1;
    return `${firstLetter}${num}`;
  }

  formatTime(dateString?: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).toUpperCase();
    } catch {
      return '';
    }
  }

  onIncidentClick(id: string) {
    this.router.navigate(['/emergencies/details', id]);
  }

  constructor() {}

  // Mutaciones
  acceptMutation = injectMutation(() => ({
    mutationFn: (data: { id: string, techId: string }) => 
      lastValueFrom(this.workshopsService.acceptIncident(data.id, { id_tecnico: data.techId })),
    onSuccess: () => {
      this.snackBar.open('✅ Solicitud aceptada y técnico asignado', 'OK', { duration: 3000 });
      this.queryClient.invalidateQueries({ queryKey: ['assignments'] });
      this.queryClient.invalidateQueries({ queryKey: ['technicians'] });
    }
  }));

  rejectMutation = injectMutation(() => ({
    mutationFn: (id: string) => lastValueFrom(this.workshopsService.rejectIncident(id)),
    onSuccess: () => {
      this.snackBar.open('Solicitud rechazada correctamente', 'OK', { duration: 3000 });
      this.queryClient.invalidateQueries({ queryKey: ['assignments'] });
    }
  }));

  statusMutation = injectMutation(() => ({
    mutationFn: (data: { id: string, status: string }) => 
      lastValueFrom(this.workshopsService.updateIncidentStatus(data.id, { nuevo_estado: data.status })),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['assignments'] });
      this.snackBar.open('Estado actualizado', 'Cerrar', { duration: 2000 });
    }
  }));

  paymentMutation = injectMutation(() => ({
    mutationFn: (data: { id: string, amount: number }) => 
      lastValueFrom(this.financeService.processPayment(data.id, { monto_total: data.amount })),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['assignments'] });
      this.queryClient.invalidateQueries({ queryKey: ['technicians'] });
      this.queryClient.invalidateQueries({ queryKey: ['financial-payments'] });
      this.snackBar.open('✅ Servicio Finalizado y Pago Procesado', 'OK', { duration: 4000 });
    }
  }));

  billingMutation = injectMutation(() => ({
    mutationFn: (data: { id: string, billing: any }) => 
      lastValueFrom(this.financeService.registerBilling(data.id, data.billing)),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['assignments'] });
      this.queryClient.invalidateQueries({ queryKey: ['technicians'] });
      this.snackBar.open('✅ Cobro registrado correctamente', 'OK', { duration: 3500 });
    }
  }));

  onAccept(id: string, techId: string) {
    this.acceptMutation.mutate({ id, techId });
  }

  onReject(id: string) {
    if (confirm('¿Está seguro de rechazar esta solicitud? Se asignará a otro taller.')) {
      this.rejectMutation.mutate(id);
    }
  }

  onUpdateStatus(id: string, status: string) {
    this.statusMutation.mutate({ id, status });
  }

  async onRegisterBilling(inc: IncidentResponse) {
    const { ProcessPaymentDialog } = await import('@features/finance/dialogs/process-payment-dialog.component');
    const dialogRef = this.dialog.open(ProcessPaymentDialog, {
      data: { 
        incidentId: inc.id_incidente,
        mano_de_obra: inc.mano_de_obra,
        repuestos: inc.repuestos,
        observaciones: inc.observaciones
      },
      width: '450px',
      disableClose: true
    });

    const result = await lastValueFrom(dialogRef.afterClosed());
    if (result) {
      this.billingMutation.mutate({ 
        id: inc.id_incidente, 
        billing: result 
      });
    }
  }

  onManualPayment(id: string, amount: number) {
    if (confirm(`¿Está seguro de confirmar el PAGO MANUAL en efectivo por un monto de Bs. ${amount}?`)) {
      this.paymentMutation.mutate({ id, amount });
    }
  }
}
