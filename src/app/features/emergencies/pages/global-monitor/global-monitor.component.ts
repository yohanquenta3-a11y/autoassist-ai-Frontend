import { Component, OnDestroy, inject, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  LucideAngularModule,
  RefreshCw,
  Siren,
} from 'lucide-angular';

import { PushNotificationService } from '@core/services/push-notification.service';
import { OfflineSnapshotService } from '@core/services/offline-snapshot.service';
import { IncidentResponse, SucursalResponse } from '@core/models/workshops.model';
import { AuthStore } from '@features/identity/auth/state/auth.store';
import { WorkshopsService } from '@features/workshops/data-access/workshops.service';
import {
  EmptyStateComponent,
  LoadingStateComponent,
  PageHeaderComponent,
  SearchInputComponent,
  SelectComponent,
  SelectOption,
} from '@shared/ui';
import { EmergenciesService } from '../../data-access/emergencies.service';

@Component({
  selector: 'app-global-monitor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
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
        [title]="pageTitle()"
        [subtitle]="pageSubtitle()"
        [icon]="sirenIcon">
        <div class="header-right" actions>
          @if (incidentsQuery.isFetching() && incidentsQuery.data()) {
            <div class="sync-indicator">
              <div class="mini-spinner"></div>
              Sincronizando...
            </div>
          }
          <div class="live-indicator">
            <span class="pulse-dot"></span>
            EN VIVO
          </div>
          <button mat-stroked-button class="refresh-btn" (click)="incidentsQuery.refetch()">
            <lucide-icon [img]="refreshIcon" [size]="15"></lucide-icon>
            Actualizar
          </button>
        </div>
      </app-page-header>

      @if (offlineMode()) {
        <div class="offline-banner warning">
          <strong>Sin conexion con la API.</strong>
          <span>Mostrando el ultimo monitor de incidentes guardado localmente.</span>
        </div>
      } @else if (cachedSnapshotAt()) {
        <div class="offline-banner soft">
          <strong>Cache local activa.</strong>
          <span>Ultima sincronizacion: {{ cachedSnapshotAt() | date:'dd/MM/yy HH:mm' : '-0400' }}</span>
        </div>
      }

      @if (incidentsQuery.isPending() && !incidentsQuery.data()) {
        <app-loading-state message="Sincronizando monitor central..."></app-loading-state>
      } @else {
        <section class="hero-banner sm-surface-panel">
          <div class="hero-copy">
            <span class="sm-section-kicker">AutoAssist AI</span>
            <h2>Supervisa incidentes activos con lectura operativa inmediata.</h2>
            <p>El monitor central agrupa prioridad, estado, asignación y fechas en una vista más clara para seguimiento continuo.</p>
          </div>
          <div class="hero-badges">
            <span class="sm-pill">Despacho en vivo</span>
            <span class="sm-pill">Prioridad visible</span>
            <span class="sm-pill">Filtros por fecha</span>
          </div>
        </section>

        <div class="stats-bar">
          <div class="stat-item sm-glass-card">
            <lucide-icon [img]="sirenIcon" [size]="18" class="stat-icon total"></lucide-icon>
            <span class="label">Total</span>
            <span class="value">{{ totalCount() }}</span>
          </div>
          <div class="stat-item sm-glass-card">
            <lucide-icon [img]="clockIcon" [size]="18" class="stat-icon active"></lucide-icon>
            <span class="label">En Atención</span>
            <span class="value active">{{ activeCount() }}</span>
          </div>
          <div class="stat-item sm-glass-card">
            <lucide-icon [img]="alertIcon" [size]="18" class="stat-icon high"></lucide-icon>
            <span class="label">Alta Prioridad</span>
            <span class="value high">{{ highPriorityCount() }}</span>
          </div>
          <div class="stat-item sm-glass-card">
            <lucide-icon [img]="checkIcon" [size]="18" class="stat-icon done"></lucide-icon>
            <span class="label">Completados</span>
            <span class="value done">{{ completedCount() }}</span>
          </div>
        </div>

        <div class="filters-container sm-glass-card">
          <div class="filter-group">
            <app-search-input
              class="search-id-field"
              [(value)]="searchId"
              (valueChange)="onFilterChange()"
              placeholder="Buscar por ID incidente...">
            </app-search-input>

            <app-select
              class="sm-select"
              [(value)]="filterEstado"
              (valueChange)="onFilterChange()"
              placeholder="Todos los estados"
              [options]="statusOptions">
            </app-select>

            <app-select
              class="sm-select"
              [(value)]="filterPrioridad"
              (valueChange)="onFilterChange()"
              placeholder="Todas las prioridades"
              [options]="priorityOptions">
            </app-select>

            @if (isSuperAdmin()) {
              <app-select
                class="sm-select"
                [(value)]="filterTaller"
                (valueChange)="onFilterChange()"
                placeholder="Todos los talleres"
                [options]="workshopFilterOptions">
              </app-select>
            }

            @if (isOwner()) {
              <app-select
                class="sm-select"
                [(value)]="filterSucursal"
                (valueChange)="onFilterChange()"
                placeholder="Todas las sucursales"
                [options]="branchOptions()">
              </app-select>
            }

            <div class="date-filter-group">
              <span class="date-label">Desde</span>
              <mat-form-field appearance="outline" class="sm-capsule-field date-field" subscriptSizing="dynamic">
                <input matInput type="date" [ngModel]="filterFechaInicio()" (ngModelChange)="filterFechaInicio.set($event); onFilterChange()" />
              </mat-form-field>
            </div>

            <div class="date-filter-group">
              <span class="date-label">Hasta</span>
              <mat-form-field appearance="outline" class="sm-capsule-field date-field" subscriptSizing="dynamic">
                <input matInput type="date" [ngModel]="filterFechaFin()" (ngModelChange)="filterFechaFin.set($event); onFilterChange()" />
              </mat-form-field>
            </div>
          </div>

          <div class="filter-actions">
            @if (isAdminSucursal()) {
              <span class="branch-badge sm-glass-card">{{ myBranchName() }}</span>
            }
            <button mat-icon-button (click)="incidentsQuery.refetch()" matTooltip="Actualizar">
              <lucide-icon [img]="refreshIcon" [size]="18"></lucide-icon>
            </button>
            <button mat-button class="clear-btn" (click)="clearFilters()">Limpiar</button>
          </div>
        </div>

        <div class="table-container sm-glass-card">
          <div class="table-header">
            <lucide-icon [img]="activityIcon" [size]="16"></lucide-icon>
            <span>Incidentes</span>
            <span class="count-badge">{{ filteredData().length }}</span>
          </div>

          <table mat-table [dataSource]="pagedData()" class="monitor-table">
            <ng-container matColumnDef="prioridad">
              <th mat-header-cell *matHeaderCellDef>Prioridad</th>
              <td mat-cell *matCellDef="let inc">
                <span class="priority-badge" [attr.data-p]="inc.prioridad_incidente">
                  {{ inc.prioridad_incidente }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>ID</th>
              <td mat-cell *matCellDef="let inc">
                <span class="mono-id">#{{ inc.id_incidente.substring(0,8) }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="fecha">
              <th mat-header-cell *matHeaderCellDef>Fecha (BOL)</th>
              <td mat-cell *matCellDef="let inc">
                <span class="date-text">{{ inc.fecha_reporte | date:'dd/MM/yy HH:mm' : '-0400' }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="resumen">
              <th mat-header-cell *matHeaderCellDef>Resumen IA</th>
              <td mat-cell *matCellDef="let inc">
                <p class="truncate">{{ inc.resumen_ia || 'Analizando...' }}</p>
              </td>
            </ng-container>

            <ng-container matColumnDef="taller">
              <th mat-header-cell *matHeaderCellDef>Taller</th>
              <td mat-cell *matCellDef="let inc">
                @if (inc.id_taller) {
                  <span class="assigned-tag">Asignado</span>
                } @else {
                  <span class="pending-tag">Buscando...</span>
                }
              </td>
            </ng-container>

            <ng-container matColumnDef="sucursal">
              <th mat-header-cell *matHeaderCellDef>Sucursal</th>
              <td mat-cell *matCellDef="let inc">
                <span class="branch-tag">{{ inc.branch_name || 'Sin sucursal asignada' }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="estado">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let inc">
                <span class="status-badge" [attr.data-s]="inc.estado_incidente">
                  {{ inc.estado_incidente?.replace('_', ' ') }}
                </span>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns()"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns();" class="table-row"></tr>
          </table>

          @if (filteredData().length === 0 && !incidentsQuery.isLoading()) {
            <app-empty-state
              [icon]="sirenIcon"
              title="Sin incidentes"
              message="No hay incidentes que coincidan con los filtros aplicados.">
            </app-empty-state>
          }

          <mat-paginator
            [length]="filteredData().length"
            [pageSize]="pageSize()"
            [pageIndex]="pageIndex()"
            [pageSizeOptions]="[10, 25, 50]"
            (page)="onPageChange($event)"
            aria-label="Paginas del monitor">
          </mat-paginator>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { padding: 0 0 2rem; min-height: 100vh; display: flex; flex-direction: column; gap: 1.25rem; animation: fadeIn 0.4s ease-out; }

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

    .header-right { display: flex; align-items: center; gap: 1rem; }
    .offline-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.9rem 1rem;
      border-radius: 18px;
      font-size: 0.84rem;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .offline-banner.warning {
      background: rgba(245, 158, 11, 0.12);
      color: #fcd34d;
      border-color: rgba(245, 158, 11, 0.28);
    }
    .offline-banner.soft {
      background: rgba(59, 130, 246, 0.08);
      color: #bfdbfe;
      border-color: rgba(59, 130, 246, 0.2);
    }
    .sync-indicator { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: var(--sm-color-copper-300); font-weight: 600; }
    .mini-spinner { width: 12px; height: 12px; border: 2px solid rgb(var(--sm-rgb-copper-500) / .2); border-top: 2px solid var(--sm-color-copper-400); border-radius: 50%; animation: spin .8s linear infinite; }
    .live-indicator { display: flex; align-items: center; gap: 0.5rem; background: rgba(231,76,60,.1); padding: 0.4rem 0.9rem; border-radius: 20px; font-size: 0.72rem; font-weight: 800; color: #e74c3c; letter-spacing: .05em; }
    .pulse-dot { width: 7px; height: 7px; background: #e74c3c; border-radius: 50%; animation: pulse 1.5s infinite; }
    .refresh-btn { display: flex; align-items: center; gap: 0.4rem; border-color: rgb(var(--sm-rgb-copper-500) / .3); color: var(--sm-color-copper-300); }

    .stats-bar { display: flex; gap: 1rem; margin-bottom: 0.15rem; flex-wrap: wrap; }
    .stat-item { padding: 1.1rem 1.5rem; display: flex; flex-direction: column; align-items: flex-start; gap: 0.25rem; min-width: 160px; flex: 1; border-radius: 12px;
      .label { font-size: 0.7rem; color: var(--sm-color-text-muted); text-transform: uppercase; letter-spacing: .05em; }
      .value { font-size: 1.7rem; font-weight: 800; color: var(--sm-color-copper-300);
        &.active { color: #f1c40f; }
        &.high   { color: #e74c3c; }
        &.done   { color: #2ecc71; }
      }
      .stat-icon { &.total { color: var(--sm-color-copper-300); } &.active { color: #f1c40f; } &.high { color: #e74c3c; } &.done { color: #2ecc71; } }
    }

    .filters-container {
      padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; gap: 1.5rem;
      .filter-group { display: flex; align-items: center; gap: 0.85rem; flex: 1; flex-wrap: wrap; }
    }

    .search-id-field { flex: 1; max-width: 220px; }
    .sm-select { width: 160px; }
    .date-filter-group {
      display: flex; align-items: center; gap: 0.5rem;
      .date-label { font-size: 0.72rem; font-weight: 700; color: var(--sm-color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
      .date-field { width: 155px; }
    }

    .clear-btn { color: var(--sm-color-text-muted); font-size: 0.8rem; font-weight: 600; white-space: nowrap; &:hover { color: white; } }
    .filter-actions {
      display: flex; align-items: center; gap: 0.5rem;
      button[mat-icon-button] {
        color: var(--sm-color-text-muted);
        &:hover { color: white; background: rgba(255, 255, 255, 0.05); }
      }
    }

    .branch-badge {
      display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.78rem; font-weight: 600; color: var(--sm-color-copper-300);
      background: rgb(var(--sm-rgb-copper-500) / 0.12); padding: 0.35rem 0.75rem; border-radius: 20px; border: 1px solid rgb(var(--sm-rgb-copper-500) / 0.2);
    }

    .branch-tag {
      font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 999px;
      background: rgb(var(--sm-rgb-copper-500) / 0.1); color: var(--sm-color-copper-300);
      border: 1px solid rgb(var(--sm-rgb-copper-500) / 0.18);
    }

    .table-container { border-radius: 20px; overflow: auto; background: var(--sm-color-gunmetal-900); border: 1px solid rgb(var(--sm-rgb-copper-500) / 0.12); }
    .table-header { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.5rem; border-bottom: 1px solid rgb(var(--sm-rgb-copper-500) / 0.08); color: var(--sm-color-copper-300); font-size: 0.82rem; font-weight: 600;
      .count-badge { margin-left: auto; background: rgb(var(--sm-rgb-copper-500) /.15); color: var(--sm-color-copper-300); padding: .15rem .6rem; border-radius: 20px; font-size: .72rem; }
    }
    .monitor-table { width: 100%; background: transparent;
      th { color: var(--sm-color-text-muted); font-size: .7rem; text-transform: uppercase; letter-spacing: .05em; padding: .75rem 1rem; border-bottom: 1px solid rgba(255,255,255,.05); }
      td { padding: .75rem 1rem; border-bottom: 1px solid rgba(255,255,255,.03); }
    }
    .table-row:hover td { background: rgb(var(--sm-rgb-copper-500) /.05); }

    .mono-id  { font-family: 'JetBrains Mono', monospace; font-size: .8rem; color: var(--sm-color-copper-300); font-weight: 600; }
    .date-text { font-size: .82rem; color: var(--sm-color-text-soft); }
    .truncate { max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0; font-size: .82rem; color: var(--sm-color-text-soft); }

    .priority-badge { padding: .2rem .55rem; border-radius: 4px; font-size: .68rem; font-weight: 800; letter-spacing: .03em;
      &[data-p="CRITICA"] { background: rgba(231,76,60,.25);  color: #ef4444; border: 1px solid rgba(231,76,60,.4); }
      &[data-p="ALTA"]  { background: rgba(231,76,60,.15);  color: #e74c3c; }
      &[data-p="MEDIA"] { background: rgba(241,196,15,.15); color: #f1c40f; }
      &[data-p="BAJA"]  { background: rgba(46,204,113,.15); color: #2ecc71; }
    }

    .status-badge { padding: .2rem .55rem; border-radius: 4px; font-size: .68rem; font-weight: 700;
      &[data-s="COMPLETADO"]   { background: rgba(46,204,113,.12);  color: #2ecc71; }
      &[data-s="FINALIZADO"]   { background: rgba(46,204,113,.12);  color: #2ecc71; }
      &[data-s="ASIGNADO"]     { background: rgba(52,152,219,.12);  color: #3498db; }
      &[data-s="EN_CAMINO"]    { background: rgba(230,126,34,.12);  color: #e67e22; }
      &[data-s="TECNICO_EN_SITIO"] { background: rgba(52,152,219,.12); color: #3498db; }
      &[data-s="TECNICO_RECHAZADO"] { background: rgba(231,76,60,.12); color: #e74c3c; }
      &[data-s="EN_ATENCION"]  { background: rgba(241,196,15,.12);  color: #f1c40f; }
      &[data-s="EN_PROGRESO"]  { background: rgba(241,196,15,.12);  color: #f1c40f; }
      &[data-s="CANCELADO"]    { background: rgba(231,76,60,.12);   color: #e74c3c; }
      &[data-s="PENDIENTE"]    { background: rgba(var(--sm-rgb-slate-400),.1); color: var(--sm-color-text-muted); }
    }

    .assigned-tag { font-size: .7rem; padding: .15rem .5rem; border-radius: 4px; background: rgba(46,204,113,.1); color: #2ecc71; font-weight: 600; }
    .pending-tag  { font-size: .7rem; padding: .15rem .5rem; border-radius: 4px; background: rgba(var(--sm-rgb-slate-400),.1); color: var(--sm-color-text-muted); font-style: italic; }

    mat-paginator { background: transparent; }

    @keyframes spin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes pulse { 0%  { box-shadow: 0 0 0 0 rgba(231,76,60,.7); } 70% { box-shadow: 0 0 0 10px rgba(231,76,60,0); } 100% { box-shadow: 0 0 0 0 rgba(231,76,60,0); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    @media (max-width: 768px) {
      .page-container { padding: 1rem; }
      .hero-banner { flex-direction: column; }
      .hero-badges { justify-content: flex-start; }
      .stats-bar { gap: 0.75rem; }
      .filters-container {
        flex-direction: column; align-items: stretch; gap: 1rem; padding: 1rem;
        .filter-group { flex-direction: column; align-items: stretch; gap: 0.75rem; }
        .search-id-field { max-width: 100%; }
        .sm-select { width: 100%; }
        .date-filter-group {
          width: 100%; justify-content: space-between;
          .date-field { width: 70%; max-width: 250px; }
        }
      }
    }
  `]
})
export class GlobalMonitorComponent implements OnDestroy {
  private emergenciesService = inject(EmergenciesService);
  private authStore = inject(AuthStore);
  private workshopsService = inject(WorkshopsService);
  private offlineSnapshot = inject(OfflineSnapshotService);

  readonly sirenIcon = Siren;
  readonly activityIcon = Activity;
  readonly clockIcon = Clock;
  readonly alertIcon = AlertTriangle;
  readonly checkIcon = CheckCircle;
  readonly refreshIcon = RefreshCw;

  isSuperAdmin = computed(() => this.authStore.user()?.rol_nombre === 'superadmin');

  isOwner = computed(() => {
    const user = this.authStore.user();
    return (user?.rol_nombre || '').toLowerCase().trim() === 'admin_taller' && user?.rol_contexto === 'owner';
  });

  isAdminSucursal = computed(() => {
    const user = this.authStore.user();
    return (user?.rol_nombre || '').toLowerCase().trim() === 'admin_taller' && user?.rol_contexto === 'admin_sucursal';
  });

  branches = signal<SucursalResponse[]>([]);
  myBranchName = signal<string>('Sin sucursal asignada');

  displayedColumns = computed(() => {
    if (this.isSuperAdmin()) {
      return ['prioridad', 'id', 'fecha', 'resumen', 'taller', 'estado'];
    }
    if (this.isOwner()) {
      return ['prioridad', 'id', 'fecha', 'resumen', 'sucursal', 'estado'];
    }
    return ['prioridad', 'id', 'fecha', 'resumen', 'estado'];
  });

  pageTitle = computed(() =>
    this.isSuperAdmin()
      ? 'Monitor Global de Emergencias'
      : 'Monitor de Incidentes - Mi Taller'
  );

  pageSubtitle = computed(() =>
    this.isSuperAdmin()
      ? 'Visibilidad total de todos los incidentes activos en la plataforma en tiempo real.'
      : 'Seguimiento de los incidentes asignados a tu taller.'
  );

  statusOptions: SelectOption[] = [
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'ASIGNADO', label: 'Asignado' },
    { value: 'EN_CAMINO', label: 'En Camino' },
    { value: 'TECNICO_EN_SITIO', label: 'Tecnico en Sitio' },
    { value: 'TECNICO_RECHAZADO', label: 'Tecnico Rechazado' },
    { value: 'EN_ATENCION', label: 'En Atención' },
    { value: 'EN_PROGRESO', label: 'En Progreso' },
    { value: 'FINALIZADO', label: 'Finalizado' },
    { value: 'COMPLETADO', label: 'Completado' },
    { value: 'CANCELADO', label: 'Cancelado' }
  ];

  priorityOptions: SelectOption[] = [
    { value: 'CRITICA', label: 'Crítica' },
    { value: 'ALTA', label: 'Alta' },
    { value: 'MEDIA', label: 'Media' },
    { value: 'BAJA', label: 'Baja' }
  ];

  workshopFilterOptions: SelectOption[] = [
    { value: 'asignado', label: 'Con taller' },
    { value: 'sin_asignar', label: 'Sin asignar' }
  ];

  branchOptions = computed<SelectOption[]>(() => {
    return [
      { value: '', label: 'Todas las sucursales' },
      ...this.branches().map(b => ({ value: b.id_sucursal, label: b.nombre }))
    ];
  });

  searchId = signal('');
  filterEstado = signal('');
  filterPrioridad = signal('');
  filterTaller = signal('');
  filterSucursal = signal('');
  filterFechaInicio = signal('');
  filterFechaFin = signal('');
  pageSize = signal(10);
  pageIndex = signal(0);
  offlineMode = signal(false);
  cachedSnapshotAt = signal<string | null>(null);

  private pushService = inject(PushNotificationService);

  incidentsQuery = injectQuery(() => ({
    queryKey: ['global-incidents'],
    queryFn: async () => {
      const cacheKey = 'sm:global-incidents';
      try {
        const data = await lastValueFrom(this.emergenciesService.getAllIncidents());
        this.offlineSnapshot.write(cacheKey, data);
        this.offlineMode.set(false);
        this.cachedSnapshotAt.set(new Date().toISOString());
        return data;
      } catch (error) {
        const cached = this.offlineSnapshot.read<IncidentResponse[]>(cacheKey);
        if (cached) {
          this.offlineMode.set(!this.offlineSnapshot.hasBrowserConnection());
          this.cachedSnapshotAt.set(cached.savedAt);
          return cached.data;
        }
        throw error;
      }
    },
  }));

  constructor() {
    if (this.isOwner()) {
      this.workshopsService.getBranches().subscribe({
        next: (res) => {
          this.branches.set(res || []);
        }
      });
    } else if (this.isAdminSucursal()) {
      this.workshopsService.getMyBranch().subscribe({
        next: (res) => {
          if (res) this.myBranchName.set(res.nombre);
        }
      });
    }

    this.pushService.message$
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.incidentsQuery.refetch();
      });

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleBrowserOnline);
      window.addEventListener('offline', this.handleBrowserOffline);
    }
  }

  allData = computed(() => (this.incidentsQuery.data()) ?? []);
  totalCount = computed(() => this.filteredData().length);
  activeCount = computed(() => this.filteredData().filter(i => ['EN_CAMINO', 'EN_PROGRESO', 'EN_ATENCION', 'ASIGNADO', 'TECNICO_EN_SITIO', 'TECNICO_RECHAZADO'].includes(i.estado_incidente)).length);
  highPriorityCount = computed(() => this.filteredData().filter(i => {
    const p = (i.prioridad_incidente || '').trim().toUpperCase();
    return p === 'ALTA' || p === 'CRITICA';
  }).length);
  completedCount = computed(() => this.filteredData().filter(i => ['COMPLETADO', 'FINALIZADO'].includes(i.estado_incidente)).length);

  filteredData = computed(() => {
    let data = this.allData();

    if (this.searchId()) {
      const q = this.searchId().toLowerCase();
      data = data.filter((i) => i.id_incidente?.toLowerCase().includes(q));
    }
    if (this.filterEstado()) data = data.filter((i) => i.estado_incidente === this.filterEstado());
    if (this.filterPrioridad()) {
      const p = this.filterPrioridad().trim().toUpperCase();
      data = data.filter((i) => (i.prioridad_incidente || '').trim().toUpperCase() === p);
    }
    if (this.filterTaller() === 'asignado') data = data.filter((i) => i.id_taller);
    if (this.filterTaller() === 'sin_asignar') data = data.filter((i) => !i.id_taller);
    if (this.filterFechaInicio()) {
      const desde = new Date(this.filterFechaInicio()).getTime();
      data = data.filter((i) => new Date(i.fecha_reporte || '').getTime() >= desde);
    }
    if (this.filterFechaFin()) {
      const hasta = new Date(this.filterFechaFin() + 'T23:59:59').getTime();
      data = data.filter((i) => new Date(i.fecha_reporte || '').getTime() <= hasta);
    }
    if (this.isOwner() && this.filterSucursal()) {
      data = data.filter((i) => i.id_sucursal === this.filterSucursal());
    }

    return data;
  });

  pagedData = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredData().slice(start, start + this.pageSize());
  });

  onFilterChange() { this.pageIndex.set(0); }

  onPageChange(e: PageEvent) {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
  }

  clearFilters() {
    this.searchId.set('');
    this.filterEstado.set('');
    this.filterPrioridad.set('');
    this.filterTaller.set('');
    this.filterSucursal.set('');
    this.filterFechaInicio.set('');
    this.filterFechaFin.set('');
    this.pageIndex.set(0);
  }

  ngOnDestroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleBrowserOnline);
      window.removeEventListener('offline', this.handleBrowserOffline);
    }
  }

  private handleBrowserOnline = () => {
    this.offlineMode.set(false);
    this.incidentsQuery.refetch();
  };

  private handleBrowserOffline = () => {
    this.offlineMode.set(true);
  };
}
