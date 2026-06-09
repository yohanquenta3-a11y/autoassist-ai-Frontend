import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { WorkshopsService } from '../../data-access/workshops.service';
import { SchedulingService, Appointment, SlotAvailability } from '../../data-access/scheduling.service';
import { IdentityService } from '@features/identity/data-access/identity.service';
import { AuthStore } from '@features/identity/auth/state/auth.store';
import { StorageService } from '@core/services/storage.service';
import { injectQuery, injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { LucideAngularModule } from 'lucide-angular';
import {
  Calendar,
  Clock,
  User,
  Car,
  CheckCircle2,
  XCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  Building2,
  Wrench,
  AlertTriangle,
  Info,
  CornerDownRight,
  MessageSquare,
  CalendarRange,
  Search,
  X,
  RefreshCw,
  Eye,
  Link2,
  Phone
} from 'lucide-angular';
import { PageHeaderComponent, LoadingStateComponent, EmptyStateComponent, SearchInputComponent, SelectComponent, SelectOption } from '@shared/ui';
import { IncidentResponse } from '@core/models/workshops.model';
import { UserResponse, VehicleResponse } from '@core/models/identity.model';

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatDialogModule,
    LucideAngularModule,
    PageHeaderComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    SearchInputComponent,
    SelectComponent
  ],
  template: `
    <div class="page-container">
      <app-page-header 
        title="Gestionar Citas" 
        subtitle="Administra la agenda de atención posterior al auxilio, confirmaciones y reprogramaciones de tu sucursal."
        [icon]="calendarIcon">
      </app-page-header>

      <!-- Panel de Estadísticas Rápidas -->
      <div class="stats-deck">
        <div class="stat-card sm-glass-card pending">
          <div class="stat-icon">
            <span class="icon-pulse-yellow"></span>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ pendingCount() }}</span>
            <span class="stat-label">Pendientes de Confirmación</span>
          </div>
        </div>

        <div class="stat-card sm-glass-card reschedule">
          <div class="stat-icon">
            <span class="icon-pulse-orange"></span>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ rescheduleRequestedCount() }}</span>
            <span class="stat-label">Reprogramaciones Solicitadas</span>
          </div>
        </div>

        <div class="stat-card sm-glass-card confirmed">
          <div class="stat-icon-blue"></div>
          <div class="stat-info">
            <span class="stat-value">{{ confirmedCount() }}</span>
            <span class="stat-label">Citas Confirmadas</span>
          </div>
        </div>

        <div class="stat-card sm-glass-card completed">
          <div class="stat-icon-green"></div>
          <div class="stat-info">
            <span class="stat-value">{{ completedCount() }}</span>
            <span class="stat-label">Citas Completadas</span>
          </div>
        </div>

        <div class="stat-card sm-glass-card today">
          <div class="stat-icon-blue"></div>
          <div class="stat-info">
            <span class="stat-value">{{ todayCount() }}</span>
            <span class="stat-label">Citas de Hoy</span>
          </div>
        </div>

        <div class="stat-card sm-glass-card canceled">
          <div class="stat-icon-red"></div>
          <div class="stat-info">
            <span class="stat-value">{{ cancelledCount() }}</span>
            <span class="stat-label">Citas Canceladas</span>
          </div>
        </div>
      </div>

      <!-- Diseño Principal: Panel Calendario Izq + Listado/Agenda Der -->
      <div class="calendar-layout-grid">
        
        <!-- COLUMNA IZQUIERDA: Mini Calendario Interactivo -->
        <div class="calendar-panel-wrapper sm-glass-card">
          <div class="calendar-panel-header">
            <h3>Calendario del Mes</h3>
            <div class="calendar-nav-buttons">
              <button mat-icon-button (click)="prevMonth()" class="btn-nav">
                <i class="chevron-nav-left">&lt;</i>
              </button>
              <span class="current-month-label">{{ monthNames[currentMonth()] }} {{ currentYear() }}</span>
              <button mat-icon-button (click)="nextMonth()" class="btn-nav">
                <i class="chevron-nav-right">&gt;</i>
              </button>
            </div>
          </div>

          <div class="calendar-days-grid-header">
            <span>Lu</span>
            <span>Ma</span>
            <span>Mi</span>
            <span>Ju</span>
            <span>Vi</span>
            <span>Sáb</span>
            <span>Do</span>
          </div>

          <div class="calendar-days-grid-body">
            @for (day of calendarDays(); track $index) {
              @if (day.date) {
                <button 
                  class="calendar-day-cell" 
                  [class.today]="day.isToday" 
                  [class.selected]="day.isSelected"
                  (click)="selectDate(day.date)">
                  <span class="day-number">{{ day.date.getDate() }}</span>
                  
                  <!-- Puntos indicadores de citas -->
                  <div class="day-indicators">
                    @if (hasStatusInDay(day.date, ['PENDIENTE_CONFIRMACION', 'REPROGRAMACION_SOLICITADA'])) {
                      <span class="dot-yellow"></span>
                    }
                    @if (hasStatusInDay(day.date, ['CONFIRMADA'])) {
                      <span class="dot-blue"></span>
                    }
                    @if (hasStatusInDay(day.date, ['COMPLETADA'])) {
                      <span class="dot-green"></span>
                    }
                  </div>
                </button>
              } @else {
                <div class="calendar-day-cell empty"></div>
              }
            }
          </div>

          <div class="calendar-colors-legend">
            <div class="legend-item"><span class="legend-dot yellow"></span> Pendiente</div>
            <div class="legend-item"><span class="legend-dot blue"></span> Confirmada</div>
            <div class="legend-item"><span class="legend-dot green"></span> Completada</div>
          </div>
        </div>

        <!-- COLUMNA DERECHA: Agenda & Control de Citas -->
        <div class="agenda-panel-wrapper">
          
          <!-- Filtros de la Agenda -->
          <div class="agenda-filters-bar sm-glass-card">
            <!-- Barra de búsqueda -->
            <div class="search-box">
              <input 
                type="text" 
                [ngModel]="searchQuery()" 
                (ngModelChange)="searchQuery.set($event)" 
                placeholder="Buscar por cliente, matrícula o motivo..." 
                class="search-input" />
            </div>

            <!-- Filtros de Estado (Tabs) -->
            <div class="status-filters-tabs">
              @for (tab of statusTabs; track tab.value) {
                <button 
                  class="status-tab-btn" 
                  [class.active]="selectedStatusTab() === tab.value"
                  (click)="selectedStatusTab.set(tab.value)">
                  {{ tab.label }}
                </button>
              }
            </div>

            <!-- Local selector de sucursal para Owner -->
            @if (isOwner() && !headerBranchId()) {
              <div class="branch-local-filter">
                <mat-form-field appearance="outline" class="sm-capsule-field" subscriptSizing="dynamic">
                  <mat-select [ngModel]="localSelectedBranch()" (ngModelChange)="localSelectedBranch.set($event)" placeholder="Filtrar sucursal">
                    <mat-option value="">Todas las sucursales</mat-option>
                    @for (b of branchesQuery.data() || []; track b.id_sucursal) {
                      <mat-option [value]="b.id_sucursal">{{ b.nombre }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>
            }

            <div class="filters-row">
              <mat-form-field appearance="outline" class="sm-capsule-field" subscriptSizing="dynamic">
                <mat-select [value]="selectedPriority()" (selectionChange)="selectedPriority.set($event.value)" placeholder="Prioridad">
                  <mat-option value="all">Todas</mat-option>
                  <mat-option value="BAJA">Baja</mat-option>
                  <mat-option value="MEDIA">Media</mat-option>
                  <mat-option value="ALTA">Alta</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="sm-capsule-field" subscriptSizing="dynamic">
                <mat-select [value]="selectedType()" (selectionChange)="selectedType.set($event.value)" placeholder="Tipo">
                  <mat-option value="all">Todos</mat-option>
                  <mat-option value="POST_AUXILIO">Post auxilio</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="sm-capsule-field" subscriptSizing="dynamic">
                <input matInput type="date" [ngModel]="dateFrom()" (ngModelChange)="dateFrom.set($event)" placeholder="Desde">
              </mat-form-field>

              <mat-form-field appearance="outline" class="sm-capsule-field" subscriptSizing="dynamic">
                <input matInput type="date" [ngModel]="dateTo()" (ngModelChange)="dateTo.set($event)" placeholder="Hasta">
              </mat-form-field>

              <button mat-stroked-button class="btn-clear-date" (click)="clearAgendaFilters()">
                Limpiar filtros
              </button>
            </div>
          </div>

          <!-- Cabecera de la lista seleccionada -->
          <div class="agenda-list-header">
            <h4>
              Citas para el: 
              <span class="highlight-date">
                {{ selectedDate() ? (selectedDate() | date:'EEEE, d de MMMM, y' : undefined : 'es-BO') : 'Todas las fechas' }}
              </span>
            </h4>
            <div class="agenda-header-actions">
              <button mat-flat-button class="btn-create-appointment" (click)="openCreateAppointment()">
                Nueva cita
              </button>
              @if (selectedDate()) {
                <button mat-stroked-button class="btn-clear-date" (click)="clearDateFilter()">
                  Ver todas las fechas
                </button>
              }
            </div>
          </div>

          <!-- Listado de Citas -->
          @if (appointmentsQuery.isLoading()) {
            <app-loading-state message="Cargando agenda..."></app-loading-state>
          } @else if (appointmentsQuery.isError()) {
            <div class="agenda-error-state sm-glass-card">
              <div class="agenda-error-title">No se pudo cargar la agenda</div>
              <div class="agenda-error-text">Revisa la conexión o intenta nuevamente.</div>
              <button mat-flat-button class="btn-action confirm" (click)="appointmentsQuery.refetch()">
                Reintentar
              </button>
            </div>
          } @else {
            <div class="appointments-list">
              @for (appt of filteredAppointments(); track appt.id_cita) {
                <div class="appointment-card sm-glass-card" [class]="appt.estado.toLowerCase()">
                  
                  <!-- Cabecera de la Cita: Estado + Prioridad -->
                  <div class="card-header">
                    <div class="status-badge" [class]="appt.estado.toLowerCase()">
                      <span class="badge-dot"></span>
                      {{ formatStatus(appt.estado) }}
                    </div>

                    <div class="priority-badge" [class]="appt.prioridad.toLowerCase()">
                      Prioridad: {{ appt.prioridad }}
                    </div>
                  </div>

                  <!-- Cuerpo de la Cita: Cliente, Vehículo, Hora, etc. -->
                  <div class="card-body">
                    <div class="card-left-info">
                      
                      <!-- Horario -->
                      <div class="info-row time-row">
                        <lucide-icon [img]="clockIcon" [size]="14" class="clock-icon"></lucide-icon>
                        <span class="time-text">{{ appt.fecha_hora | date:'shortTime' }} - {{ getEndTime(appt.fecha_hora, appt.duracion_minutos) }}</span>
                        <span class="date-text">({{ appt.fecha_hora | date:'dd/MM/yyyy' }})</span>
                      </div>

                      <!-- Cliente -->
                      <div class="info-row">
                        <lucide-icon [img]="userIcon" [size]="14" class="user-icon"></lucide-icon>
                        <span class="main-text">{{ appt.cliente_nombre || 'Cliente' }}</span>
                      </div>

                      @if (appt.cliente_telefono) {
                        <div class="info-row">
                          <lucide-icon [img]="phoneIcon" [size]="13" class="phone-icon"></lucide-icon>
                          <span class="sub-text">{{ appt.cliente_telefono }}</span>
                        </div>
                      }

                      <!-- Vehículo -->
                      <div class="info-row">
                        <lucide-icon [img]="carIcon" [size]="14" class="car-icon"></lucide-icon>
                        <span class="sub-text">{{ appt.vehiculo_marca }} {{ appt.vehiculo_modelo }}</span>
                        <span class="plate-badge">{{ appt.vehiculo_matricula }}</span>
                      </div>

                      <!-- Motivo -->
                      <div class="info-row motivo-row">
                        <span class="motivo-label">Motivo:</span>
                        <span class="motivo-text">"{{ appt.motivo }}"</span>
                      </div>

                      <!-- Observaciones -->
                      @if (appt.observaciones) {
                        <div class="info-row obs-row">
                          <span class="obs-label">Nota:</span>
                          <span class="obs-text">{{ appt.observaciones }}</span>
                        </div>
                      }

                      <!-- Origen del Incidente -->
                      @if (appt.id_incidente_origen) {
                        <div class="incident-origin-badge" (click)="openIncidentDetails(appt.id_incidente_origen)">
                          <lucide-icon [img]="linkIcon" [size]="14" class="link-icon"></lucide-icon>
                          <span>Derivada de Auxilio (Incidente #{{ appt.id_incidente_origen.substring(0,8) }})</span>
                          <button mat-icon-button class="btn-view-inc">
                            <lucide-icon [img]="viewIcon" [size]="14"></lucide-icon>
                          </button>
                        </div>
                      }
                    </div>

                    <div class="card-right-info">
                      <div class="meta-label">Sucursal: <strong class="branch-name-val">{{ appt.sucursal_nombre || 'N/A' }}</strong></div>
                      @if (appt.tecnico_nombre) {
                        <div class="meta-label mt-1">Técnico: <strong class="tech-name-val">{{ appt.tecnico_nombre }}</strong></div>
                      }
                      <div class="meta-label date-created">Creado: {{ appt.fecha_creacion | date:'shortDate' }} por {{ appt.creado_por }} ({{ appt.rol_creador }})</div>
                    </div>
                  </div>

                  <!-- Zona de Reprogramación Inline -->
                  @if (reschedulingId() === appt.id_cita) {
                    <div class="reschedule-form-panel">
                      <h5>Reprogramar Cita</h5>
                      <div class="reschedule-inputs">
                        <div class="reschedule-field">
                          <label>Selecciona Nueva Fecha:</label>
                          <input 
                            type="date" 
                            [min]="minRescheduleDate" 
                            [max]="maxRescheduleDate" 
                            (change)="onDateSelectedForReschedule($event, appt)" 
                            class="reschedule-date-input" />
                        </div>

                        @if (loadingSlots()) {
                          <div class="loading-slots-text">Cargando horarios disponibles...</div>
                        } @else if (rescheduleSlots().length > 0) {
                          <div class="reschedule-slots-chips">
                            <label class="d-block mb-1">Horarios Disponibles:</label>
                            <div class="chips-container">
                              @for (slot of rescheduleSlots(); track slot.fecha_hora) {
                                <button 
                                  class="slot-chip" 
                                  [class.disabled]="!slot.disponible"
                                  [class.selected]="selectedRescheduleSlot() === slot.fecha_hora"
                                  [disabled]="!slot.disponible"
                                  (click)="selectedRescheduleSlot.set(slot.fecha_hora)">
                                  {{ slot.fecha_hora | date:'shortTime' }}
                                </button>
                              }
                            </div>
                          </div>
                        } @else if (rescheduleDate()) {
                          <div class="no-slots-warning">No hay horarios disponibles para esta fecha (Lunes a Sábado, 08:00 - 18:00).</div>
                        }
                      </div>

                      <div class="reschedule-actions">
                        <button mat-stroked-button class="btn-cancel-res" (click)="cancelRescheduling()">
                          Cancelar
                        </button>
                        <button 
                          mat-flat-button 
                          class="btn-save-res" 
                          [disabled]="!selectedRescheduleSlot() || rescheduleMutation.isPending()" 
                          (click)="saveReschedule(appt.id_cita)">
                          {{ rescheduleMutation.isPending() ? 'Guardando...' : 'Confirmar Horario' }}
                        </button>
                      </div>
                    </div>
                  }

                  <!-- Acciones de la Cita -->
                  @if (reschedulingId() !== appt.id_cita) {
                    <div class="card-footer-actions">
                      <!-- Confirmar cita pendiente -->
                      @if (appt.estado === 'PENDIENTE_CONFIRMACION') {
                        <button 
                          mat-flat-button 
                          class="btn-action confirm" 
                          [disabled]="confirmMutation.isPending()"
                          (click)="confirmAppointment(appt.id_cita)">
                          Confirmar Cita
                        </button>
                      }

                      <!-- Aceptar reprogramación solicitada por el cliente -->
                      @if (appt.estado === 'REPROGRAMACION_SOLICITADA') {
                        <button 
                          mat-flat-button 
                          class="btn-action accept-reschedule" 
                          [disabled]="confirmMutation.isPending()"
                          (click)="confirmAppointment(appt.id_cita)">
                          Aceptar Reprogramación
                        </button>
                      }

                      <!-- Completar cita confirmada -->
                      @if (appt.estado === 'CONFIRMADA') {
                        <button 
                          mat-flat-button 
                          class="btn-action complete" 
                          [disabled]="completeMutation.isPending()"
                          (click)="completeAppointment(appt.id_cita)">
                          Completar Servicio
                        </button>
                      }

                      <!-- Reprogramar cita activa -->
                      @if (appt.estado === 'CONFIRMADA' || appt.estado === 'PENDIENTE_CONFIRMACION' || appt.estado === 'REPROGRAMACION_SOLICITADA') {
                        <button 
                          mat-stroked-button 
                          class="btn-action reschedule-btn" 
                          (click)="startRescheduling(appt)">
                          Reprogramar
                        </button>
                      }

                      <!-- Cancelar cita activa -->
                      @if (appt.estado === 'CONFIRMADA' || appt.estado === 'PENDIENTE_CONFIRMACION' || appt.estado === 'REPROGRAMACION_SOLICITADA') {
                        <button 
                          mat-stroked-button 
                          class="btn-action cancel" 
                          [disabled]="cancelMutation.isPending()"
                          (click)="cancelAppointment(appt.id_cita)">
                          Cancelar Cita
                        </button>
                      }
                    </div>
                  }

                </div>
              }

              @if (filteredAppointments().length === 0) {
                <app-empty-state 
                  [icon]="calendarIcon" 
                  title="Sin citas encontradas" 
                  message="No hay citas registradas en la fecha o filtros seleccionados.">
                </app-empty-state>
              }
            </div>
          }

        </div>

      </div>
    </div>

    <!-- MODAL / DIALOG INLINE DE DETALLE DEL INCIDENTE -->
    @if (showingIncidentModal(); as incident) {
      <div class="incident-modal-backdrop" (click)="closeIncidentDetails()">
        <div class="incident-modal-card sm-glass-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Detalle del Auxilio Original</h3>
            <button mat-icon-button (click)="closeIncidentDetails()" class="btn-close-modal">
              <i>Error</i>
            </button>
          </div>

          <div class="modal-body">
            <div class="modal-section-title">Información del Incidente</div>
            <div class="modal-fields-grid">
              <div class="modal-field">
                <span class="modal-label">ID Incidente</span>
                <span class="modal-val code">{{ incident.id_incidente }}</span>
              </div>
              <div class="modal-field">
                <span class="modal-label">Estado</span>
                <span class="modal-val status" [class]="incident.estado_incidente.toLowerCase()">{{ incident.estado_incidente }}</span>
              </div>
              <div class="modal-field">
                <span class="modal-label">Tipo Servicio</span>
                <span class="modal-val">{{ incident.tipo_servicio }}</span>
              </div>
              <div class="modal-field">
                <span class="modal-label">Fecha Creación</span>
                <span class="modal-val">{{ incident.fecha_creacion | date:'medium' }}</span>
              </div>
            </div>

            <div class="modal-section-title mt-4">Detalles del Vehículo y Cliente</div>
            <div class="modal-fields-grid">
              <div class="modal-field">
                <span class="modal-label">Cliente</span>
                <span class="modal-val">{{ incident.cliente_nombre || 'Cargando...' }}</span>
              </div>
              <div class="modal-field">
                <span class="modal-label">Vehículo</span>
                <span class="modal-val">{{ incident.vehiculo_marca }} {{ incident.vehiculo_modelo }} ({{ incident.vehiculo_matricula }})</span>
              </div>
            </div>

            <div class="modal-section-title mt-4">Reporte Técnico Inicial</div>
            <div class="modal-field-block">
              <span class="modal-label">Descripción de Falla / Diagnóstico</span>
              <p class="modal-text-desc">"{{ incident.descripcion }}"</p>
            </div>
            
            @if (incident.diagnostico) {
              <div class="modal-field-block mt-2">
                <span class="modal-label">Diagnóstico Final</span>
                <p class="modal-text-desc">"{{ incident.diagnostico }}"</p>
              </div>
            }
          </div>

          <div class="modal-footer">
            <button mat-flat-button class="btn-close-action" (click)="closeIncidentDetails()">
              Entendido
            </button>
          </div>
        </div>
      </div>
    }

    @if (showCreateAppointmentModal()) {
      <div class="incident-modal-backdrop" (click)="closeCreateAppointment()">
        <div class="incident-modal-card sm-glass-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Nueva Cita</h3>
            <button mat-icon-button (click)="closeCreateAppointment()" class="btn-close-modal">
              <lucide-icon [img]="xIcon" [size]="16"></lucide-icon>
            </button>
          </div>

          <div class="modal-body">
            <div class="modal-field-block">
              <span class="modal-label">Tipo de cita</span>
              <app-select
                [value]="createType()"
                (valueChange)="onCreateTypeChange($event)"
                [options]="createTypeOptions">
              </app-select>
            </div>

            @if (createType() === 'POST_AUXILIO') {
              <div class="modal-section-title">Incidente origen</div>
              <div class="modal-field-block">
                <app-select
                  [value]="selectedCreateIncidentId()"
                  (valueChange)="onCreateIncidentChange($event)"
                  placeholder="Selecciona un incidente"
                  [options]="creatableIncidentOptions()">
                </app-select>
                @if (incidentOptionsQuery.isLoading()) {
                  <div class="helper-text">Cargando incidentes disponibles...</div>
                } @else if (creatableIncidents().length === 0) {
                  <div class="helper-text warning">No hay incidentes elegibles para crear una cita posterior.</div>
                }
              </div>

              @if (selectedCreateIncident()) {
                <div class="derived-badge">
                  <lucide-icon [img]="alertIcon" [size]="14"></lucide-icon>
                  <span>Derivada de auxilio</span>
                </div>
                <div class="modal-fields-grid">
                  <div class="modal-field">
                    <span class="modal-label">Cliente</span>
                    <span class="modal-val">{{ selectedCreateIncident()?.client_name || 'N/A' }}</span>
                  </div>
                  <div class="modal-field">
                    <span class="modal-label">Vehículo</span>
                    <span class="modal-val">{{ selectedCreateIncident()?.vehicle_plate || selectedCreateIncident()?.id_vehiculo || 'N/A' }}</span>
                  </div>
                  <div class="modal-field">
                    <span class="modal-label">Sucursal</span>
                    <span class="modal-val">{{ selectedCreateIncident()?.branch_name || 'N/A' }}</span>
                  </div>
                  <div class="modal-field">
                    <span class="modal-label">Prioridad</span>
                    <app-select [value]="createPriority()" (valueChange)="createPriority.set($event)" [options]="priorityOptions"></app-select>
                  </div>
                </div>
              }
            } @else {
              <div class="modal-section-title">Cliente y vehículo</div>
              <div class="modal-field-block">
                <app-search-input
                  [value]="createSearchClient()"
                  (valueChange)="createSearchClient.set($event)"
                  placeholder="Buscar cliente por nombre, teléfono o placa...">
                </app-search-input>
              </div>

              <div class="modal-field-block">
                <app-select
                  [value]="selectedCreateClientId()"
                  (valueChange)="onCreateClientChange($event)"
                  placeholder="Selecciona un cliente"
                  [options]="clientOptions()">
                </app-select>
                @if (clientsQuery.isLoading()) {
                  <div class="helper-text">Cargando clientes...</div>
                } @else if (filteredCreateClients().length === 0) {
                  <div class="helper-text warning">No hay clientes disponibles para la sucursal seleccionada.</div>
                }
              </div>

              <div class="modal-field-block">
                <app-select
                  [value]="selectedCreateVehicleId()"
                  (valueChange)="onCreateVehicleChange($event)"
                  placeholder="Selecciona un vehículo"
                  [options]="vehicleOptions()">
                </app-select>
                @if (selectedCreateClientId() && clientVehiclesQuery.isLoading()) {
                  <div class="helper-text">Cargando vehículos del cliente...</div>
                } @else if (selectedCreateClientId() && vehicleOptions().length === 0) {
                  <div class="helper-text warning">El cliente seleccionado no tiene vehículos registrados.</div>
                }
              </div>

              <div class="modal-fields-grid">
                <div class="modal-field">
                  <span class="modal-label">Sucursal</span>
                  @if (isOwner() && !headerBranchId()) {
                    <app-select
                      [value]="selectedCreateBranchId()"
                      (valueChange)="onCreateBranchChange($event)"
                      placeholder="Selecciona una sucursal"
                      [options]="branchOptions()">
                    </app-select>
                  } @else {
                    <span class="modal-val">{{ activeBranchId() || 'Sucursal activa' }}</span>
                  }
                </div>

                <div class="modal-field">
                  <span class="modal-label">Técnico opcional</span>
                  <app-select
                    [value]="selectedCreateTechnicianId()"
                    (valueChange)="selectedCreateTechnicianId.set($event)"
                    placeholder="Sin técnico"
                    [options]="technicianOptions()">
                  </app-select>
                </div>
              </div>

              <div class="modal-field-block">
                <span class="modal-label">Prioridad</span>
                <app-select
                  [value]="createPriority()"
                  (valueChange)="createPriority.set($event)"
                  [options]="priorityOptions">
                </app-select>
              </div>
            }

            <div class="modal-field-block">
              <span class="modal-label">Motivo</span>
              <input
                matInput
                type="text"
                class="create-text-input"
                [ngModel]="createMotivo()"
                (ngModelChange)="createMotivo.set($event)"
                placeholder="Describe el motivo de la cita" />
            </div>

            <div class="modal-field-block">
              <span class="modal-label">Observaciones</span>
              <textarea
                matInput
                rows="3"
                class="create-textarea"
                [ngModel]="createObservaciones()"
                (ngModelChange)="createObservaciones.set($event)"
                placeholder="Observaciones opcionales"></textarea>
            </div>

            <div class="modal-section-title mt-4">Fecha y hora solicitada</div>
            <div class="reschedule-inputs">
              <div class="reschedule-field">
                <label>Selecciona Fecha:</label>
                <input
                  type="date"
                  [min]="minCreateDate"
                  [max]="maxCreateDate"
                  [ngModel]="createDate()"
                  (ngModelChange)="onCreateDateSelected($event)"
                  class="reschedule-date-input" />
              </div>

              @if (loadingCreateSlots()) {
                <div class="loading-slots-text">Cargando horarios disponibles...</div>
              } @else if (createSlots().length > 0) {
                <div class="reschedule-slots-chips">
                  <label class="d-block mb-1">Horarios Disponibles:</label>
                  <div class="chips-container create-slots-grid">
                    @for (slot of createSlots(); track slot.fecha_hora) {
                      <button
                        class="slot-chip"
                        [class.disabled]="!slot.disponible"
                        [class.selected]="selectedCreateSlot() === slot.fecha_hora"
                        [disabled]="!slot.disponible"
                        (click)="selectedCreateSlot.set(slot.fecha_hora)">
                        {{ slot.fecha_hora | date:'shortTime' }}
                      </button>
                    }
                  </div>
                </div>
              } @else if (createDate()) {
                <div class="no-slots-warning">No hay horarios disponibles para esta fecha. Selecciona otro día.</div>
              }
            </div>
          </div>

          <div class="modal-footer">
            <button mat-stroked-button class="btn-close-action secondary" (click)="closeCreateAppointment()">
              Cancelar
            </button>
            <button
              mat-flat-button
              class="btn-close-action"
              [disabled]="!canSubmitCreateAppointment() || creatingAppointment()"
              (click)="submitCreateAppointment()">
              {{ creatingAppointment() ? 'Creando...' : 'Crear Cita' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-container {
      padding: 0 0 2rem;
      max-width: 1440px;
      margin: 0 auto;
      animation: fadeIn 0.4s ease-out;
    }

    /* Stats Deck */
    .stats-deck {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
    }
    .stat-card {
      padding: 1.25rem;
      border-radius: 22px !important;
      background: linear-gradient(180deg, rgba(14, 17, 24, 0.95), rgba(9, 12, 19, 0.98)) !important;
      border: 1px solid rgba(255, 149, 32, 0.12) !important;
      display: flex;
      align-items: center;
      gap: 1.25rem;
      position: relative;
      overflow: hidden;
    }
    .stat-card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
    }
    .stat-card.pending::before { background: #f59e0b; }
    .stat-card.reschedule::before { background: #f97316; }
    .stat-card.confirmed::before { background: #3b82f6; }
    .stat-card.completed::before { background: #10b981; }
    .stat-card.today::before { background: #8b5cf6; }
    .stat-card.canceled::before { background: #ef4444; }

    .stat-icon {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon-pulse-yellow {
      width: 10px;
      height: 10px;
      background: #f59e0b;
      border-radius: 50%;
      box-shadow: 0 0 8px #f59e0b;
      animation: pulseYellow 2s infinite;
    }
    .icon-pulse-orange {
      width: 10px;
      height: 10px;
      background: #f97316;
      border-radius: 50%;
      box-shadow: 0 0 8px #f97316;
      animation: pulseOrange 2s infinite;
    }
    .stat-icon-blue {
      width: 10px;
      height: 10px;
      background: #3b82f6;
      border-radius: 50%;
      box-shadow: 0 0 6px #3b82f6;
    }
    .stat-icon-green {
      width: 10px;
      height: 10px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 6px #10b981;
    }
    .stat-icon-red {
      width: 10px;
      height: 10px;
      background: #ef4444;
      border-radius: 50%;
      box-shadow: 0 0 6px #ef4444;
    }

    .stat-info {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .stat-value {
      font-size: 1.75rem;
      font-weight: 800;
      color: white;
      line-height: 1;
    }
    .stat-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--sm-color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Grid layout */
    .calendar-layout-grid {
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 1.25rem;
      align-items: start;
    }

    /* Panel Calendario */
    .calendar-panel-wrapper {
      padding: 1.35rem;
      border-radius: 24px !important;
      background: linear-gradient(180deg, rgba(14, 17, 24, 0.95), rgba(9, 12, 19, 0.98)) !important;
      border: 1px solid rgba(255, 149, 32, 0.12) !important;
    }
    .calendar-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 700;
        color: white;
      }
    }
    .calendar-nav-buttons {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .btn-nav {
      color: var(--sm-color-text-muted) !important;
      width: 32px !important;
      height: 32px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: rgba(255, 255, 255, 0.02) !important;
      border: 1px solid rgba(255, 255, 255, 0.05) !important;
      border-radius: 12px !important;
      padding: 0 !important;
      line-height: 1 !important;
      i {
        font-style: normal;
        font-weight: 700;
        font-size: 1rem;
      }
      &:hover {
        color: white !important;
        background: rgba(255, 149, 32, 0.08) !important;
      }
    }
    .current-month-label {
      font-size: 0.85rem;
      font-weight: 700;
      color: white;
      min-width: 100px;
      text-align: center;
      text-transform: capitalize;
    }

    .calendar-days-grid-header {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 0.5rem;
      text-align: center;
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--sm-color-text-muted);
      text-transform: uppercase;
      margin-bottom: 0.75rem;
    }
    .calendar-days-grid-body {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 0.5rem;
    }
    .calendar-day-cell {
      aspect-ratio: 1;
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.03);
      background: rgba(255, 255, 255, 0.01);
      color: var(--sm-color-text-soft);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      transition: all 0.2s ease;
      padding: 0;

      .day-number {
        font-weight: 600;
        font-size: 0.9rem;
      }

      &:hover {
        background: rgba(255, 149, 32, 0.08);
        border-color: rgba(255, 149, 32, 0.22);
        color: white;
      }

      &.today {
        border-color: rgba(99, 102, 241, 0.4);
        background: rgba(99, 102, 241, 0.05);
        color: #818cf8;
        .day-number {
          font-weight: 800;
        }
      }

      &.selected {
        background: linear-gradient(135deg, #ffb347, #ff7a18) !important;
        border-color: #ff8a1f !important;
        color: white !important;
        box-shadow: 0 0 14px rgba(255, 122, 24, 0.35);
      }

      &.empty {
        background: transparent;
        border: none;
        cursor: default;
        pointer-events: none;
      }
    }

    .day-indicators {
      display: flex;
      gap: 3px;
      margin-top: 4px;
      position: absolute;
      bottom: 5px;
    }
    .dot-yellow { width: 4px; height: 4px; border-radius: 50%; background: #f59e0b; }
    .dot-blue { width: 4px; height: 4px; border-radius: 50%; background: #3b82f6; }
    .dot-green { width: 4px; height: 4px; border-radius: 50%; background: #10b981; }

    .calendar-colors-legend {
      display: flex;
      justify-content: space-between;
      margin-top: 1.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 0.7rem;
      color: var(--sm-color-text-muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .legend-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      &.yellow { background: #f59e0b; box-shadow: 0 0 4px #f59e0b; }
      &.blue { background: #3b82f6; box-shadow: 0 0 4px #3b82f6; }
      &.green { background: #10b981; box-shadow: 0 0 4px #10b981; }
    }

    /* Columna Derecha */
    .agenda-panel-wrapper {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    /* Filtros Agenda */
    .agenda-filters-bar {
      padding: 1rem 1.1rem;
      border-radius: 24px !important;
      background: linear-gradient(180deg, rgba(14, 17, 24, 0.95), rgba(9, 12, 19, 0.98)) !important;
      border: 1px solid rgba(255, 149, 32, 0.12) !important;
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
      justify-content: space-between;
    }
    .search-box {
      flex: 1;
      min-width: 250px;
      position: relative;
    }
    .search-input {
      width: 100%;
      height: 38px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 0 1.25rem;
      color: white;
      font-size: 0.85rem;
      transition: all 0.2s ease;
      &:focus {
        outline: none;
        border-color: rgba(255, 149, 32, 0.4);
        background: rgba(255, 255, 255, 0.06);
      }
    }
    .status-filters-tabs {
      display: flex;
      gap: 0.35rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 0.2rem;
      border-radius: 14px;
    }
    .status-tab-btn {
      padding: 0.4rem 0.85rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--sm-color-text-muted);
      border: none;
      background: transparent;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      
      &:hover {
        color: white;
        background: rgba(255, 255, 255, 0.03);
      }
      &.active {
        color: white;
        background: linear-gradient(135deg, #ffb347, #ff7a18);
        box-shadow: 0 2px 10px rgba(255, 122, 24, 0.28);
      }
    }
    .branch-local-filter {
      width: 180px;
    }
    .filters-row {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 0.75rem;
      width: 100%;
      align-items: center;
      flex-basis: 100%;
    }
    .filters-row .sm-capsule-field {
      width: 100%;
    }

    /* List header */
    .agenda-list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.5rem;
      
      h4 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 700;
        color: white;
      }
      .highlight-date {
        color: #3b82f6;
      }
      .btn-clear-date {
        border-radius: 20px !important;
        font-size: 0.75rem !important;
        font-weight: 600 !important;
        color: var(--sm-color-text-muted) !important;
        border-color: rgba(255, 255, 255, 0.08) !important;
        height: 32px !important;
        padding: 0 1rem !important;
        &:hover {
          color: white !important;
          background: rgba(255, 255, 255, 0.03) !important;
          border-color: rgba(255, 255, 255, 0.15) !important;
        }
      }
    }
    .agenda-header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .btn-create-appointment {
      border-radius: 20px !important;
      font-size: 0.75rem !important;
      font-weight: 700 !important;
      height: 32px !important;
      padding: 0 1rem !important;
      background: linear-gradient(135deg, #f97316, #f59e0b) !important;
      color: white !important;
    }

    /* Tarjeta Cita */
    .appointments-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .agenda-error-state {
      padding: 1.5rem;
      border-radius: 16px !important;
      border: 1px solid rgba(239, 68, 68, 0.2) !important;
      background: rgba(239, 68, 68, 0.05) !important;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-start;
    }
    .agenda-error-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #fca5a5;
    }
    .agenda-error-text {
      font-size: 0.85rem;
      color: var(--sm-color-text-soft);
    }
    .full-width-field { width: 100%; }
    .create-text-input,
    .create-textarea {
      width: 100%;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.03);
      color: white;
      padding: 0.85rem 1rem;
      font-size: 0.9rem;
      outline: none;
      &:focus {
        border-color: #f97316;
        background: rgba(255, 255, 255, 0.05);
      }
    }
    .create-textarea {
      resize: vertical;
      min-height: 84px;
    }
    .helper-text {
      font-size: 0.8rem;
      color: var(--sm-color-text-muted);
      margin-top: 0.4rem;
      &.warning {
        color: #f59e0b;
      }
    }
    .derived-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.3rem 0.7rem;
      border-radius: 999px;
      background: rgba(249, 115, 22, 0.12);
      border: 1px solid rgba(249, 115, 22, 0.18);
      color: #fb923c;
      font-size: 0.75rem;
      font-weight: 700;
      margin: 0.25rem 0 0.75rem;
    }
    .create-slots-grid {
      display: grid !important;
      grid-template-columns: repeat(auto-fit, minmax(82px, 1fr));
      gap: 0.5rem;
    }
    .modal-footer .btn-close-action.secondary {
      border-radius: 20px !important;
      font-size: 0.8rem !important;
      font-weight: 600 !important;
      height: 38px !important;
      padding: 0 1.25rem !important;
      border-color: rgba(255, 255, 255, 0.08) !important;
      color: var(--sm-color-text-muted) !important;
      background: transparent;
    }
    .appointment-card {
      padding: 1.2rem;
      border-radius: 22px !important;
      background: linear-gradient(180deg, rgba(14, 17, 24, 0.95), rgba(9, 12, 19, 0.98)) !important;
      border: 1px solid rgba(255, 149, 32, 0.1) !important;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      transition: all 0.25s ease;

      &:hover {
        transform: translateY(-2px);
        border-color: rgba(255, 255, 255, 0.08) !important;
      }
      
      &.pendiente_confirmacion { border-left: 3px solid #f59e0b !important; }
      &.reprogramacion_solicitada { border-left: 3px solid #f97316 !important; }
      &.confirmada { border-left: 3px solid #3b82f6 !important; }
      &.cancelada { border-left: 3px solid #ef4444 !important; opacity: 0.65; }
      &.completada { border-left: 3px solid #10b981 !important; }
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      border: 1px solid rgba(255, 255, 255, 0.05);

      .badge-dot { width: 5px; height: 5px; border-radius: 50%; background: #94a3b8; }

      &.pendiente_confirmacion {
        background: rgba(245, 158, 11, 0.1);
        color: #f59e0b;
        border-color: rgba(245, 158, 11, 0.15);
        .badge-dot { background: #f59e0b; box-shadow: 0 0 4px #f59e0b; }
      }
      &.reprogramacion_solicitada {
        background: rgba(249, 115, 22, 0.1);
        color: #f97316;
        border-color: rgba(249, 115, 22, 0.15);
        .badge-dot { background: #f97316; box-shadow: 0 0 6px #f97316; animation: pulseOrange 2s infinite; }
      }
      &.confirmada {
        background: rgba(59, 130, 246, 0.1);
        color: #3b82f6;
        border-color: rgba(59, 130, 246, 0.15);
        .badge-dot { background: #3b82f6; box-shadow: 0 0 4px #3b82f6; }
      }
      &.cancelada {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        border-color: rgba(239, 68, 68, 0.15);
        .badge-dot { background: #ef4444; }
      }
      &.completada {
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
        border-color: rgba(16, 185, 129, 0.15);
        .badge-dot { background: #10b981; }
      }
    }
    .priority-badge {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.03);
      color: var(--sm-color-text-muted);

      &.alta { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
      &.media { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
      &.baja { background: rgba(16, 185, 129, 0.1); color: #10b981; }
    }

    .card-body {
      display: grid;
      grid-template-columns: 1fr 240px;
      gap: 1rem;
    }
    .card-left-info {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .info-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      color: var(--sm-color-text-soft);
      i { font-style: normal; }
    }
    .time-row {
      font-size: 0.95rem;
      font-weight: 700;
      color: white;
      .clock-icon { color: #3b82f6; }
      .date-text {
        font-size: 0.8rem;
        color: var(--sm-color-text-muted);
        font-weight: 500;
      }
    }
    .main-text {
      font-weight: 700;
      color: white;
    }
    .sub-text {
      font-weight: 600;
      color: var(--sm-color-text-soft);
    }
    .plate-badge {
      font-family: monospace;
      font-size: 0.75rem;
      font-weight: 700;
      color: #ffd089;
      background: rgba(255, 149, 32, 0.1);
      border: 1px solid rgba(255, 149, 32, 0.18);
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
    }
    .motivo-row {
      font-size: 0.85rem;
      margin-top: 0.25rem;
      color: var(--sm-color-text-soft);
      .motivo-label { font-weight: 700; color: var(--sm-color-text-muted); }
      .motivo-text { font-style: italic; color: white; }
    }
    .obs-row {
      font-size: 0.8rem;
      margin-top: 0.15rem;
      .obs-label { font-weight: 700; color: var(--sm-color-text-muted); }
      .obs-text { color: var(--sm-color-text-soft); }
    }

    .incident-origin-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #818cf8; /* Indigo light */
      background: rgba(129, 140, 248, 0.08);
      border: 1px solid rgba(129, 140, 248, 0.15);
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
      margin-top: 0.5rem;
      width: fit-content;
      cursor: pointer;
      transition: all 0.2s ease;
      
      &:hover {
        background: rgba(129, 140, 248, 0.15);
        border-color: rgba(129, 140, 248, 0.3);
        transform: scale(1.02);
      }
      
      .btn-view-inc {
        padding: 0 !important;
        width: 18px !important;
        height: 18px !important;
        line-height: 18px !important;
        color: #818cf8 !important;
        margin-left: 0.25rem !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        i { font-style: normal; font-size: 0.75rem; }
      }
    }

    .card-right-info {
      font-size: 0.8rem;
      color: var(--sm-color-text-muted);
      border-left: 1px solid rgba(255, 255, 255, 0.04);
      padding-left: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      justify-content: center;

      .branch-name-val { color: #ffd089; font-weight: 700; }
      .tech-name-val { color: white; font-weight: 600; }
      .date-created { font-size: 0.7rem; margin-top: 0.5rem; }
    }

    /* Formulario de Reprogramación Inline */
    .reschedule-form-panel {
      margin-top: 0.75rem;
      padding: 1.25rem;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      flex-direction: column;
      gap: 1rem;

      h5 {
        margin: 0;
        font-size: 0.9rem;
        font-weight: 700;
        color: #f97316;
      }
    }
    .reschedule-inputs {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .reschedule-field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      label {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--sm-color-text-muted);
      }
    }
    .reschedule-date-input {
      height: 36px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 0 0.75rem;
      color: white;
      font-size: 0.85rem;
      width: 200px;
      &:focus {
        outline: none;
        border-color: #f97316;
      }
    }
    .loading-slots-text {
      font-size: 0.8rem;
      color: var(--sm-color-text-muted);
      font-style: italic;
    }
    .reschedule-slots-chips {
      label {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--sm-color-text-muted);
      }
      .chips-container {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.25rem;
      }
    }
    .slot-chip {
      height: 32px;
      padding: 0 0.85rem;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      background: rgba(255, 255, 255, 0.02);
      color: var(--sm-color-text-soft);
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        color: white;
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
      }
      &.selected {
        background: #f97316 !important;
        border-color: #f97316 !important;
        color: white !important;
        box-shadow: 0 0 8px rgba(249, 115, 22, 0.3);
      }
      &.disabled {
        opacity: 0.3;
        cursor: not-allowed;
        background: transparent !important;
        color: var(--sm-color-text-muted) !important;
        border-color: rgba(255, 255, 255, 0.02) !important;
      }
    }
    .no-slots-warning {
      font-size: 0.8rem;
      color: #f59e0b;
    }
    .reschedule-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.25rem;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(255, 255, 255, 0.03);

      .btn-cancel-res {
        border-radius: 18px !important;
        font-size: 0.75rem !important;
        font-weight: 600 !important;
        height: 32px !important;
        border-color: rgba(255, 255, 255, 0.08) !important;
        color: var(--sm-color-text-muted) !important;
        background: transparent;
      }
      .btn-save-res {
        border-radius: 18px !important;
        font-size: 0.75rem !important;
        font-weight: 600 !important;
        height: 32px !important;
        background: #f97316 !important;
        color: white !important;
        &:disabled {
          background: rgba(255,255,255,0.05) !important;
          color: rgba(255,255,255,0.15) !important;
        }
      }
    }

    .card-footer-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: flex-end;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
      padding-top: 1rem;
      margin-top: 0.25rem;

      .btn-action {
        height: 34px !important;
        font-size: 0.8rem !important;
        font-weight: 600 !important;
        border-radius: 8px !important;
        padding: 0 1.25rem !important;

        &.confirm { background: #3b82f6 !important; color: white !important; &:hover { background: #2563eb !important; } }
        &.accept-reschedule { background: #f97316 !important; color: white !important; &:hover { background: #ea580c !important; } }
        &.complete { background: #10b981 !important; color: white !important; &:hover { background: #059669 !important; } }
        &.reschedule-btn {
          color: var(--sm-color-text-muted) !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
          background: transparent;
          &:hover { color: white !important; background: rgba(255, 255, 255, 0.03) !important; }
        }
        &.cancel {
          color: #ef4444 !important;
          border-color: rgba(239, 68, 68, 0.15) !important;
          background: transparent;
          &:hover { background: rgba(239, 68, 68, 0.05) !important; }
        }
      }
    }

    /* Modal Incidente */
    .incident-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(10, 14, 23, 0.75);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      animation: fadeIn 0.2s ease-out;
    }
    .incident-modal-card {
      width: 100%;
      max-width: 720px;
      max-height: min(92vh, 920px);
      overflow: auto;
      border-radius: 24px !important;
      background: rgba(16, 20, 30, 0.97) !important;
      border: 1px solid rgba(255, 149, 32, 0.16) !important;
      padding: 1.35rem 1.35rem 1.5rem;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      padding-bottom: 1rem;
      margin-bottom: 1.25rem;

      h3 {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 700;
        color: white;
      }
      .btn-close-modal {
        color: var(--sm-color-text-muted) !important;
        width: 28px !important;
        height: 28px !important;
        padding: 0 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        i { font-style: normal; font-size: 0.8rem; }
        &:hover { color: white !important; background: rgba(255, 255, 255, 0.05) !important; }
      }
    }
    .modal-section-title {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #ffcf8e;
      margin-bottom: 0.75rem;
    }
    .modal-fields-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
      margin-bottom: 1.25rem;
    }
    .modal-field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .modal-label {
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--sm-color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .modal-val {
      font-size: 0.9rem;
      font-weight: 600;
      color: white;
      
      &.code { font-family: monospace; font-size: 0.8rem; color: #ffd089; }
      &.status {
        font-size: 0.75rem;
        text-transform: uppercase;
        border-radius: 4px;
        padding: 0.1rem 0.4rem;
        width: fit-content;
        
        &.completado { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        &.finalizado { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        &.en_atencion { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
      }
    }
    .modal-field-block {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .modal-text-desc {
      font-size: 0.85rem;
      color: var(--sm-color-text-soft);
      line-height: 1.4;
      background: rgba(0, 0, 0, 0.15);
      padding: 0.75rem 1rem;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.03);
      margin: 0;
      font-style: italic;
    }
    .modal-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 1rem;
      margin-top: 1.5rem;
      display: flex;
      justify-content: flex-end;

      .btn-close-action {
        border-radius: 20px !important;
        font-size: 0.8rem !important;
        font-weight: 600 !important;
        height: 38px !important;
        padding: 0 1.5rem !important;
        background: #3b82f6 !important;
        color: white !important;
        &:hover { background: #2563eb !important; }
      }
    }

    /* Animations & Utilities */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulseYellow {
      0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
      70% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
      100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
    }
    @keyframes pulseOrange {
      0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); }
      70% { box-shadow: 0 0 0 6px rgba(249, 115, 22, 0); }
      100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
    }

    .d-block { display: block; }
    .mb-1 { margin-bottom: 0.25rem; }
    .mt-1 { margin-top: 0.25rem; }
    .mt-2 { margin-top: 0.5rem; }
    .mt-4 { margin-top: 1rem; }

    @media (max-width: 960px) {
      .page-container {
        gap: 1rem;
        padding-bottom: 1.5rem;
      }

      .stats-deck {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .calendar-layout-grid {
        grid-template-columns: 1fr;
      }
      .filters-row {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 600px) {
      .stats-deck {
        grid-template-columns: 1fr;
      }

      .stat-card {
        padding: 1rem;
        gap: 0.9rem;
      }

      .calendar-panel-wrapper,
      .agenda-filters-bar,
      .appointment-card {
        padding: 1rem;
      }

      .calendar-days-grid-header,
      .calendar-days-grid-body {
        gap: 0.35rem;
      }

      .agenda-list-header,
      .agenda-header-actions,
      .card-footer-actions,
      .reschedule-actions,
      .modal-footer {
        flex-direction: column;
        align-items: stretch;
      }

      .card-footer-actions .btn-action,
      .reschedule-actions button,
      .modal-footer .btn-close-action {
        width: 100%;
      }

      .incident-modal-backdrop {
        padding: 0.75rem;
      }

      .incident-modal-card {
        padding: 1rem;
      }

      .modal-fields-grid {
        grid-template-columns: 1fr;
        gap: 0.9rem;
      }

      .card-body {
        grid-template-columns: 1fr;
      }
      .card-right-info {
        border-left: none;
        border-top: 1px solid rgba(255, 255, 255, 0.04);
        padding-left: 0;
        padding-top: 0.75rem;
        justify-content: flex-start;
      }
      .filters-row {
        grid-template-columns: 1fr;
      }

    }
  `]
})
export class CalendarPageComponent implements OnInit {
  private workshopsService = inject(WorkshopsService);
  private schedulingService = inject(SchedulingService);
  private identityService = inject(IdentityService);
  private authStore = inject(AuthStore);
  private storageService = inject(StorageService);
  private snackBar = inject(MatSnackBar);
  private queryClient = injectQueryClient();
  private http = inject(WorkshopsService); // standard angular service can also be used if needed

  // Iconos
  readonly calendarIcon = Calendar;
  readonly clockIcon = Clock;
  readonly userIcon = User;
  readonly carIcon = Car;
  readonly xIcon = X;
  readonly alertIcon = AlertTriangle;
  readonly linkIcon = Link2;
  readonly phoneIcon = Phone;
  readonly viewIcon = Eye;

  // Variables de navegación del mes
  currentYear = signal<number>(new Date().getFullYear());
  currentMonth = signal<number>(new Date().getMonth());
  selectedDate = signal<Date | null>(new Date()); // Today selected by default

  // Inline rescheduling
  reschedulingId = signal<string | null>(null);
  rescheduleDate = signal<string>('');
  rescheduleSlots = signal<SlotAvailability[]>([]);
  loadingSlots = signal<boolean>(false);
  selectedRescheduleSlot = signal<string | null>(null);
  minRescheduleDate: string = '';
  maxRescheduleDate: string = '';

  // Local selection filter for branches
  localSelectedBranch = signal<string>('');

  // Modal de incidentes
  showingIncidentModal = signal<any | null>(null);

  // Modal de nueva cita
  showCreateAppointmentModal = signal<boolean>(false);
  creatingAppointment = signal<boolean>(false);
  createType = signal<'DIRECTA' | 'POST_AUXILIO'>('POST_AUXILIO');
  selectedCreateIncidentId = signal<string>('');
  createSearchClient = signal<string>('');
  selectedCreateClientId = signal<string>('');
  selectedCreateVehicleId = signal<string>('');
  selectedCreateBranchId = signal<string>('');
  selectedCreateTechnicianId = signal<string>('');
  createClientVehicles = signal<VehicleResponse[]>([]);
  loadingClients = signal<boolean>(false);
  loadingVehicles = signal<boolean>(false);
  createDate = signal<string>('');
  createSlots = signal<SlotAvailability[]>([]);
  loadingCreateSlots = signal<boolean>(false);
  selectedCreateSlot = signal<string | null>(null);
  createPriority = signal<string>('MEDIA');
  createMotivo = signal<string>('');
  createObservaciones = signal<string>('');
  minCreateDate: string = '';
  maxCreateDate: string = '';

  // Search and tabs filters
  searchQuery = signal<string>('');
  selectedStatusTab = signal<string>('all'); // 'all', 'PENDIENTE_CONFIRMACION', 'CONFIRMADA', 'REPROGRAMACION_SOLICITADA', 'CANCELADA', 'COMPLETADA'
  selectedPriority = signal<string>('all');
  selectedType = signal<string>('all');
  dateFrom = signal<string>('');
  dateTo = signal<string>('');

  readonly monthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  readonly statusTabs = [
    { label: 'Todas', value: 'all' },
    { label: 'Pendientes', value: 'PENDIENTE_CONFIRMACION' },
    { label: 'Confirmadas', value: 'CONFIRMADA' },
    { label: 'Por Reprogramar', value: 'REPROGRAMACION_SOLICITADA' },
    { label: 'Historial', value: 'past' } // completadas + canceladas
  ];

  // Identificar el rol
  isOwner = computed(() => {
    const user = this.authStore.user();
    return (user?.rol_nombre || '').toLowerCase().trim() === 'admin_taller' && user?.rol_contexto === 'owner';
  });

  headerBranchId = computed(() => {
    return this.storageService.getItem('selected_branch') || '';
  });

  // Query: get branches (only for owner local filter)
  branchesQuery = injectQuery(() => ({
    queryKey: ['my-branches-list'],
    queryFn: () => lastValueFrom(this.workshopsService.getBranches()),
    enabled: this.isOwner(),
  }));

  incidentOptionsQuery = injectQuery(() => ({
    queryKey: ['workshop-incident-options'],
    queryFn: () => lastValueFrom(this.workshopsService.getAssignments()),
  }));

  clientsQuery = injectQuery(() => ({
    queryKey: ['appointment-clients', this.createType(), this.selectedCreateBranchId() || this.activeBranchId()],
    queryFn: () => lastValueFrom(this.identityService.getUsers({
      tallerId: this.authStore.user()?.id_taller || undefined,
      idSucursal: (this.selectedCreateBranchId() || this.activeBranchId()) || undefined,
      role: 'cliente',
    })),
  }));

  techniciansQuery = injectQuery(() => ({
    queryKey: ['appointment-technicians', this.activeBranchId()],
    queryFn: () => lastValueFrom(this.workshopsService.getTechnicians()),
  }));

  clientVehiclesQuery = injectQuery(() => ({
    queryKey: ['appointment-client-vehicles', this.selectedCreateClientId()],
    queryFn: () => lastValueFrom(this.identityService.getUserVehicles(this.selectedCreateClientId())),
    enabled: !!this.selectedCreateClientId(),
  }));

  // Resolves active branch ID based on Owner local filter, header switcher, or User profile
  activeBranchId = computed(() => {
    const headerId = this.headerBranchId();
    if (headerId) return headerId;

    if (this.isOwner()) {
      return this.localSelectedBranch() || undefined;
    }

    // Branch Admin/Tech/etc will have X-Selected-Branch set from localStorage or resolved on backend
    return undefined; 
  });

  // Query: load workshop appointments
  appointmentsQuery = injectQuery(() => ({
    queryKey: [
      'workshop-appointments',
      this.activeBranchId() || 'all',
      this.selectedStatusTab(),
      this.selectedPriority(),
      this.selectedType(),
      this.searchQuery().trim(),
      this.dateFrom(),
      this.dateTo(),
    ],
    queryFn: () => lastValueFrom(this.schedulingService.getWorkshopAppointments({
      sucursalId: this.activeBranchId(),
      estado: this.selectedStatusTab(),
      prioridad: this.selectedPriority(),
      tipo: this.selectedType(),
      search: this.searchQuery(),
      fechaDesde: this.dateFrom() || undefined,
      fechaHasta: this.dateTo() || undefined,
    })),
  }));

  // Mutaciones para acciones
  confirmMutation = injectMutation(() => ({
    mutationFn: (id: string) => lastValueFrom(this.schedulingService.confirmAppointment(id)),
    onSuccess: () => {
      this.snackBar.open(' Cita confirmada con éxito', 'Cerrar', { duration: 3000 });
      this.queryClient.invalidateQueries({ queryKey: ['workshop-appointments'] });
    },
    onError: (err: any) => {
      const errMsg = err?.error?.detail || 'Error al confirmar la cita';
      this.snackBar.open(`Error ${errMsg}`, 'Cerrar', { duration: 5000 });
    }
  }));

  cancelMutation = injectMutation(() => ({
    mutationFn: (id: string) => lastValueFrom(this.schedulingService.cancelAppointment(id)),
    onSuccess: () => {
      this.snackBar.open(' Cita cancelada con éxito', 'Cerrar', { duration: 3000 });
      this.queryClient.invalidateQueries({ queryKey: ['workshop-appointments'] });
    },
    onError: (err: any) => {
      const errMsg = err?.error?.detail || 'Error al cancelar la cita';
      this.snackBar.open(`Error ${errMsg}`, 'Cerrar', { duration: 5000 });
    }
  }));

  completeMutation = injectMutation(() => ({
    mutationFn: (id: string) => lastValueFrom(this.schedulingService.completeAppointment(id)),
    onSuccess: () => {
      this.snackBar.open(' Cita completada con éxito', 'Cerrar', { duration: 3000 });
      this.queryClient.invalidateQueries({ queryKey: ['workshop-appointments'] });
    },
    onError: (err: any) => {
      const errMsg = err?.error?.detail || 'Error al completar la cita';
      this.snackBar.open(`Error ${errMsg}`, 'Cerrar', { duration: 5000 });
    }
  }));

  rescheduleMutation = injectMutation(() => ({
    mutationFn: (data: { appointmentId: string; fecha_hora: string; observaciones?: string }) => 
      lastValueFrom(this.schedulingService.rescheduleAppointment(data.appointmentId, {
        fecha_hora: data.fecha_hora,
        observaciones: data.observaciones
      })),
    onSuccess: () => {
      this.snackBar.open(' Cita reprogramada con éxito. El cliente recibirá notificación.', 'Cerrar', { duration: 4000 });
      this.queryClient.invalidateQueries({ queryKey: ['workshop-appointments'] });
      this.cancelRescheduling();
    },
    onError: (err: any) => {
      const errMsg = err?.error?.detail || 'Error al reprogramar la cita';
      this.snackBar.open(`Error ${errMsg}`, 'Cerrar', { duration: 5000 });
    }
  }));

  ngOnInit() {
    // Definir límites de reprogramación: próximos 7 días hábiles
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 7);
    
    this.minRescheduleDate = today.toISOString().split('T')[0];
    this.maxRescheduleDate = maxDate.toISOString().split('T')[0];
    this.minCreateDate = this.minRescheduleDate;
    this.maxCreateDate = this.maxRescheduleDate;
  }

  // Generación de días del mini calendario
  calendarDays = computed(() => {
    const year = this.currentYear();
    const month = this.currentMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Aliniado a lunes (0) a domingo (6)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;
    
    const days: Array<{ date: Date | null, isToday: boolean, isSelected: boolean }> = [];
    
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ date: null, isToday: false, isSelected: false });
    }
    
    const today = new Date();
    const selDate = this.selectedDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const isToday = 
        dateObj.getDate() === today.getDate() &&
        dateObj.getMonth() === today.getMonth() &&
        dateObj.getFullYear() === today.getFullYear();
      
      const isSelected = selDate ? (
        dateObj.getDate() === selDate.getDate() &&
        dateObj.getMonth() === selDate.getMonth() &&
        dateObj.getFullYear() === selDate.getFullYear()
      ) : false;
      days.push({ date: dateObj, isToday, isSelected });
    }
    
    return days;
  });

  // Agrupamiento por fecha para los puntos indicadores
  appointmentsByDateMap = computed(() => {
    const appointments = this.appointmentsQuery.data() || [];
    const map: Record<string, Appointment[]> = {};
    for (const appt of appointments) {
      const d = new Date(appt.fecha_hora);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(appt);
    }
    return map;
  });

  // Contadores rápidos para la cabecera
  pendingCount = computed(() => {
    const appts = this.appointmentsQuery.data() || [];
    return appts.filter(a => a.estado === 'PENDIENTE_CONFIRMACION').length;
  });

  rescheduleRequestedCount = computed(() => {
    const appts = this.appointmentsQuery.data() || [];
    return appts.filter(a => a.estado === 'REPROGRAMACION_SOLICITADA').length;
  });

  confirmedCount = computed(() => {
    const appts = this.appointmentsQuery.data() || [];
    return appts.filter(a => a.estado === 'CONFIRMADA').length;
  });

  completedCount = computed(() => {
    const appts = this.appointmentsQuery.data() || [];
    return appts.filter(a => a.estado === 'COMPLETADA').length;
  });

  cancelledCount = computed(() => {
    const appts = this.appointmentsQuery.data() || [];
    return appts.filter(a => a.estado === 'CANCELADA').length;
  });

  todayCount = computed(() => {
    const appts = this.appointmentsQuery.data() || [];
    const today = new Date();
    return appts.filter(a => {
      const d = new Date(a.fecha_hora);
      return d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();
    }).length;
  });

  creatableIncidents = computed(() => {
    const items = this.incidentOptionsQuery.data() || [];
    return items.filter(inc =>
      ['EN_ATENCION', 'FINALIZADO', 'COMPLETADO'].includes((inc.estado_incidente || '').toUpperCase())
    );
  });

  selectedCreateIncident = computed<IncidentResponse | null>(() => {
    const selectedId = this.selectedCreateIncidentId();
    if (!selectedId) return null;
    return this.creatableIncidents().find(inc => inc.id_incidente === selectedId) || null;
  });

  filteredCreateClients = computed(() => {
    const search = this.createSearchClient().toLowerCase().trim();
    const clients = this.clientsQuery.data() || [];
    if (!search) return clients;
    return clients.filter(client =>
      client.nombre.toLowerCase().includes(search) ||
      client.correo.toLowerCase().includes(search) ||
      (client.telefono || '').toLowerCase().includes(search) ||
      (client.placas || []).some(p => p.toLowerCase().includes(search))
    );
  });

  selectedCreateClient = computed<UserResponse | null>(() => {
    const selectedId = this.selectedCreateClientId();
    return this.filteredCreateClients().find(client => client.id_usuario === selectedId) || null;
  });

  selectedCreateVehicle = computed<VehicleResponse | null>(() => {
    const selectedId = this.selectedCreateVehicleId();
    return (this.clientVehiclesQuery.data() || []).find(vehicle => vehicle.id_vehiculo === selectedId) || null;
  });

  createTypeOptions: SelectOption[] = [
    { value: 'POST_AUXILIO', label: 'Derivada de auxilio' },
    { value: 'DIRECTA', label: 'Cita normal' },
  ];

  priorityOptions: SelectOption[] = [
    { value: 'BAJA', label: 'Baja' },
    { value: 'MEDIA', label: 'Media' },
    { value: 'ALTA', label: 'Alta' },
  ];

  branchOptions = computed<SelectOption[]>(() => {
    const branches = this.branchesQuery.data() || [];
    return branches.map(branch => ({ value: branch.id_sucursal, label: branch.nombre }));
  });

  creatableIncidentOptions = computed<SelectOption[]>(() => {
    return this.creatableIncidents().map(inc => ({
      value: inc.id_incidente,
      label: `${inc.client_name || 'Cliente'} · ${inc.vehicle_plate || inc.id_vehiculo} · ${inc.estado_incidente}`,
    }));
  });

  clientOptions = computed<SelectOption[]>(() => {
    return this.filteredCreateClients().map(client => ({
      value: client.id_usuario,
      label: `${client.nombre}${client.telefono ? ` · ${client.telefono}` : ''}`,
    }));
  });

  vehicleOptions = computed<SelectOption[]>(() => {
    return (this.clientVehiclesQuery.data() || []).map(vehicle => ({
      value: vehicle.id_vehiculo,
      label: `${vehicle.matricula} · ${vehicle.marca} ${vehicle.modelo}`,
    }));
  });

  technicianOptions = computed<SelectOption[]>(() => {
    const currentBranch = this.selectedCreateBranchId() || this.activeBranchId() || '';
    const techs = this.techniciansQuery.data() || [];
    return techs
      .filter(tech => !currentBranch || tech.id_sucursal === currentBranch)
      .map(tech => ({ value: tech.id_tecnico, label: tech.nombre }));
  });

  // Comprobar si un día tiene citas de cierto estado
  hasStatusInDay(dateObj: Date, states: string[]): boolean {
    const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    const dayAppts = this.appointmentsByDateMap()[key] || [];
    return dayAppts.some(a => states.includes(a.estado));
  }

  // Selección de fecha en el mini calendario
  selectDate(dateObj: Date) {
    this.selectedDate.set(dateObj);
  }

  clearDateFilter() {
    this.selectedDate.set(null);
  }

  clearAgendaFilters() {
    this.selectedPriority.set('all');
    this.selectedType.set('all');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.searchQuery.set('');
    if (this.isOwner() && !this.headerBranchId()) {
      this.localSelectedBranch.set('');
    }
  }

  openCreateAppointment() {
    this.showCreateAppointmentModal.set(true);
    this.createType.set('POST_AUXILIO');
    this.selectedCreateIncidentId.set('');
    this.createSearchClient.set('');
    this.selectedCreateClientId.set('');
    this.selectedCreateVehicleId.set('');
    this.selectedCreateBranchId.set(this.activeBranchId() || '');
    this.selectedCreateTechnicianId.set('');
    this.createClientVehicles.set([]);
    this.loadingClients.set(false);
    this.loadingVehicles.set(false);
    this.createDate.set('');
    this.createSlots.set([]);
    this.loadingCreateSlots.set(false);
    this.selectedCreateSlot.set(null);
    this.createPriority.set('MEDIA');
    this.createMotivo.set('');
    this.createObservaciones.set('');
  }

  closeCreateAppointment() {
    this.showCreateAppointmentModal.set(false);
    this.createSlots.set([]);
    this.loadingCreateSlots.set(false);
    this.selectedCreateSlot.set(null);
  }

  onCreateTypeChange(type: 'DIRECTA' | 'POST_AUXILIO') {
    this.createType.set(type);
    this.selectedCreateIncidentId.set('');
    this.selectedCreateClientId.set('');
    this.selectedCreateVehicleId.set('');
    this.createClientVehicles.set([]);
    this.createSearchClient.set('');
    this.selectedCreateSlot.set(null);
    this.createSlots.set([]);
    this.createDate.set('');
    this.createMotivo.set('');
    this.createObservaciones.set('');
    this.selectedCreateTechnicianId.set('');
  }

  onCreateIncidentChange(incidentId: string) {
    this.selectedCreateIncidentId.set(incidentId);
    this.selectedCreateSlot.set(null);
    this.createDate.set('');
    this.createSlots.set([]);

    const incident = this.creatableIncidents().find(item => item.id_incidente === incidentId);
    if (incident) {
      this.createMotivo.set((incident.resumen_ia || incident.descripcion || '').trim());
      if (incident.prioridad_incidente) {
        this.createPriority.set(incident.prioridad_incidente.toUpperCase());
      }
    } else {
      this.createMotivo.set('');
    }
  }

  onCreateClientChange(clientId: string) {
    this.selectedCreateClientId.set(clientId);
    this.selectedCreateVehicleId.set('');
    this.createClientVehicles.set([]);
  }

  onCreateVehicleChange(vehicleId: string) {
    this.selectedCreateVehicleId.set(vehicleId);
  }

  onCreateBranchChange(branchId: string) {
    this.selectedCreateBranchId.set(branchId);
    this.selectedCreateClientId.set('');
    this.selectedCreateVehicleId.set('');
    this.createSearchClient.set('');
    this.createClientVehicles.set([]);
    this.selectedCreateTechnicianId.set('');
    this.selectedCreateSlot.set(null);
    this.createDate.set('');
    this.createSlots.set([]);
  }

  onCreateDateSelected(dateStr: string) {
    this.createDate.set(dateStr);
    this.selectedCreateSlot.set(null);

    const incident = this.selectedCreateIncident();
    const sucursalId = this.createType() === 'DIRECTA'
      ? (this.selectedCreateBranchId() || this.activeBranchId())
      : (incident?.id_sucursal || this.activeBranchId());
    if (!dateStr || !sucursalId) {
      this.createSlots.set([]);
      return;
    }

    this.loadingCreateSlots.set(true);
    this.schedulingService.getSlotsAvailability(sucursalId, dateStr).subscribe({
      next: (slots) => {
        this.createSlots.set(slots);
        this.loadingCreateSlots.set(false);
      },
      error: (err) => {
        console.error('Error loading slots for create appointment:', err);
        this.snackBar.open('Error al cargar la disponibilidad para la cita', 'Cerrar', { duration: 3500 });
        this.createSlots.set([]);
        this.loadingCreateSlots.set(false);
      }
    });
  }

  canSubmitCreateAppointment(): boolean {
    if (!this.createMotivo().trim() || !this.createDate() || !this.selectedCreateSlot()) {
      return false;
    }

    if (this.createType() === 'DIRECTA') {
      return Boolean(
        this.selectedCreateClientId() &&
        this.selectedCreateVehicleId() &&
        (this.selectedCreateBranchId() || this.activeBranchId())
      );
    }

    return Boolean(
      this.selectedCreateIncidentId() &&
      this.selectedCreateIncident()
    );
  }

  submitCreateAppointment() {
    const incident = this.selectedCreateIncident();
    const slot = this.selectedCreateSlot();
    if (!slot || !this.createMotivo().trim()) {
      return;
    }

    if (this.createType() === 'DIRECTA') {
      const clientId = this.selectedCreateClientId();
      const vehicleId = this.selectedCreateVehicleId();
      const branchId = this.selectedCreateBranchId() || this.activeBranchId();
      if (!clientId || !vehicleId || !branchId) {
        return;
      }

      this.creatingAppointment.set(true);
      this.schedulingService.createAppointment({
        tipo: 'DIRECTA',
        id_cliente: clientId,
        id_vehiculo: vehicleId,
        id_sucursal: branchId,
        id_tecnico: this.selectedCreateTechnicianId() || undefined,
        fecha_hora: slot,
        motivo: this.createMotivo().trim(),
        observaciones: this.createObservaciones().trim() || undefined,
        prioridad: this.createPriority(),
      }).subscribe({
        next: () => {
          this.snackBar.open('Cita creada con éxito', 'Cerrar', { duration: 3000 });
          this.queryClient.invalidateQueries({ queryKey: ['workshop-appointments'] });
          this.closeCreateAppointment();
          this.creatingAppointment.set(false);
        },
        error: (err) => {
          console.error('Error creating appointment:', err);
          const errMsg = err?.error?.detail || 'Error al crear la cita';
          this.snackBar.open(errMsg, 'Cerrar', { duration: 5000 });
          this.creatingAppointment.set(false);
        }
      });
      return;
    }

    this.creatingAppointment.set(true);
    if (!incident) {
      this.creatingAppointment.set(false);
      return;
    }
    this.schedulingService.createAppointment({
      tipo: 'POST_AUXILIO',
      id_incidente_origen: incident.id_incidente,
      id_vehiculo: incident.id_vehiculo,
      fecha_hora: slot,
      motivo: this.createMotivo().trim(),
      observaciones: this.createObservaciones().trim() || undefined,
      prioridad: this.createPriority(),
    }).subscribe({
      next: () => {
        this.snackBar.open('Cita creada con éxito', 'Cerrar', { duration: 3000 });
        this.queryClient.invalidateQueries({ queryKey: ['workshop-appointments'] });
        this.closeCreateAppointment();
        this.creatingAppointment.set(false);
      },
      error: (err) => {
        console.error('Error creating appointment:', err);
        const errMsg = err?.error?.detail || 'Error al crear la cita';
        this.snackBar.open(errMsg, 'Cerrar', { duration: 5000 });
        this.creatingAppointment.set(false);
      }
    });
  }

  prevMonth() {
    if (this.currentMonth() === 0) {
      this.currentMonth.set(11);
      this.currentYear.set(this.currentYear() - 1);
    } else {
      this.currentMonth.set(this.currentMonth() - 1);
    }
  }

  nextMonth() {
    if (this.currentMonth() === 11) {
      this.currentMonth.set(0);
      this.currentYear.set(this.currentYear() + 1);
    } else {
      this.currentMonth.set(this.currentMonth() + 1);
    }
  }

  // Filtrado reactivo de citas en el panel derecho
  filteredAppointments = computed(() => {
    let list = this.appointmentsQuery.data() || [];

    // 1. Filtrar por fecha
    const selDate = this.selectedDate();
    if (selDate) {
      list = list.filter(appt => {
        const d = new Date(appt.fecha_hora);
        return d.getDate() === selDate.getDate() &&
               d.getMonth() === selDate.getMonth() &&
               d.getFullYear() === selDate.getFullYear();
      });
    }

    // 2. Filtrar por pestaña de estado
    const tab = this.selectedStatusTab();
    if (tab !== 'all') {
      if (tab === 'past') {
        list = list.filter(a => a.estado === 'COMPLETADA' || a.estado === 'CANCELADA');
      } else {
        list = list.filter(a => a.estado === tab);
      }
    }

    // 3. Filtrar por búsqueda
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(appt => {
        return (appt.cliente_nombre || '').toLowerCase().includes(q) ||
               (appt.vehiculo_matricula || '').toLowerCase().includes(q) ||
               (appt.motivo || '').toLowerCase().includes(q) ||
               (appt.tecnico_nombre || '').toLowerCase().includes(q);
      });
    }

    // Ordenar cronológicamente
    return [...list].sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());
  });

  // Formatear estado para UI
  formatStatus(statusStr: string): string {
    switch (statusStr) {
      case 'PENDIENTE_CONFIRMACION': return 'Pendiente Confirmar';
      case 'CONFIRMADA': return 'Confirmada';
      case 'REPROGRAMACION_SOLICITADA': return 'Solicitud Reprog.';
      case 'CANCELADA': return 'Cancelada';
      case 'COMPLETADA': return 'Completada';
      default: return statusStr;
    }
  }

  getEndTime(startTimeStr: string, durationMin: number): string {
    const start = new Date(startTimeStr);
    const end = new Date(start.getTime() + durationMin * 60 * 1000);
    return end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Gestión de confirmación, cancelación y completado
  confirmAppointment(id: string) {
    this.confirmMutation.mutate(id);
  }

  cancelAppointment(id: string) {
    if (confirm('¿Está seguro de que desea cancelar esta cita?')) {
      this.cancelMutation.mutate(id);
    }
  }

  completeAppointment(id: string) {
    this.completeMutation.mutate(id);
  }

  // Reprogramación inline
  startRescheduling(appt: Appointment) {
    this.reschedulingId.set(appt.id_cita);
    this.rescheduleDate.set('');
    this.rescheduleSlots.set([]);
    this.selectedRescheduleSlot.set(null);
  }

  cancelRescheduling() {
    this.reschedulingId.set(null);
    this.rescheduleDate.set('');
    this.rescheduleSlots.set([]);
    this.selectedRescheduleSlot.set(null);
  }

  onDateSelectedForReschedule(event: any, appt: Appointment) {
    const dateStr = event.target.value;
    this.rescheduleDate.set(dateStr);
    this.selectedRescheduleSlot.set(null);
    if (!dateStr) {
      this.rescheduleSlots.set([]);
      return;
    }

    this.loadingSlots.set(true);
    // Usamos el ID de la sucursal de la cita y el técnico asignado si existe
    this.schedulingService.getSlotsAvailability(appt.id_sucursal, dateStr, appt.id_tecnico || undefined).subscribe({
      next: (slots) => {
        this.rescheduleSlots.set(slots);
        this.loadingSlots.set(false);
      },
      error: (err) => {
        console.error('Error loading slots for rescheduling:', err);
        this.snackBar.open('Error Error al cargar slots de disponibilidad', 'Cerrar', { duration: 3000 });
        this.loadingSlots.set(false);
      }
    });
  }

  saveReschedule(appointmentId: string) {
    const slot = this.selectedRescheduleSlot();
    if (!slot) return;

    this.rescheduleMutation.mutate({
      appointmentId,
      fecha_hora: slot,
      observaciones: 'Reprogramación realizada por el administrador del taller'
    });
  }

  // Ver detalles del incidente de origen
  openIncidentDetails(incidentId: string) {
    // Buscamos el incidente en los endpoints del taller
    // Pero para evitar hacer múltiples inyecciones, podemos llamar a workshopsService.getAssignments()
    // y buscar la asignación correspondiente, o bien simularlo / recuperarlo.
    // Vamos a buscar en los assignments del workshopsService:
    this.workshopsService.getAssignments().subscribe({
      next: (assignments) => {
        const found = assignments.find(a => a.id_incidente === incidentId);
        if (found) {
          this.showingIncidentModal.set(found);
        } else {
          // Si no es un incidente asignado (o ya fue cerrado e historificado), mostramos info básica
          this.showingIncidentModal.set({
            id_incidente: incidentId,
            estado_incidente: 'Cerrado/Completado',
            tipo_servicio: 'Servicio de Auxilio',
            fecha_creacion: new Date(),
            descripcion: 'El servicio original de auxilio ya ha sido archivado e historificado.',
            vehiculo_marca: 'Vehículo',
            vehiculo_modelo: 'Asociado',
            vehiculo_matricula: 'N/A'
          });
        }
      },
      error: (err) => {
        console.error('Error fetching incident detail:', err);
        this.showingIncidentModal.set({
          id_incidente: incidentId,
          estado_incidente: 'Desconocido',
          tipo_servicio: 'Servicio de Auxilio',
          fecha_creacion: new Date(),
          descripcion: 'No se pudo recuperar los detalles completos del incidente original.'
        });
      }
    });
  }

  closeIncidentDetails() {
    this.showingIncidentModal.set(null);
  }
}


