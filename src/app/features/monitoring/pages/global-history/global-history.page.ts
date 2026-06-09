import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MonitoringService } from '../../data-access/monitoring.service';
import { WorkshopsService } from '@features/workshops/data-access/workshops.service';
import { AuthStore } from '@features/identity/auth/state/auth.store';
import { SucursalResponse } from '@core/models/workshops.model';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { LucideAngularModule, History, Search, Filter, RefreshCw } from 'lucide-angular';
import { IncidentDetailResponse } from '@core/models/emergencies.model';
import { PageHeaderComponent, LoadingStateComponent, EmptyStateComponent, SearchInputComponent, SelectComponent, SelectOption } from '@shared/ui';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-global-history',
  standalone: true,
  providers: [DatePipe],
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
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
        [icon]="historyIcon">
        <div actions>
          <button mat-stroked-button class="refresh-btn" (click)="historyQuery.refetch()">
            <lucide-icon [img]="refreshIcon" [size]="16"></lucide-icon>
            Actualizar
          </button>
        </div>
      </app-page-header>

      <section class="history-hero sm-glass-card">
        <div class="hero-copy">
          <span class="hero-kicker">Bitacora operativa</span>
          <h2>Seguimiento claro de cada asistencia cerrada por AutoAssist AI</h2>
          <p>Consulta estados, prioridad, fechas y sucursales desde una misma vista con un tablero mas limpio y legible.</p>
        </div>

        <div class="hero-cues">
          <span class="cue-pill">Busqueda por incidente</span>
          <span class="cue-pill">Filtros por estado</span>
          <span class="cue-pill">Trazabilidad por sucursal</span>
        </div>
      </section>

      <div class="filters-container sm-glass-card">
        <div class="filter-group">
          <app-search-input
            class="search-id-field"
            [(value)]="searchId"
            (valueChange)="onFilterChange()"
            placeholder="Buscar por codigo de incidente...">
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
            <span class="branch-badge sm-glass-card">📍 {{ myBranchName() }}</span>
          }
          <button mat-icon-button (click)="historyQuery.refetch()" matTooltip="Actualizar">
            <lucide-icon [img]="refreshIcon" [size]="18"></lucide-icon>
          </button>
          <button mat-button class="clear-btn" (click)="clearFilters()">Limpiar</button>
        </div>
      </div>

      <!-- Tabla -->
      @if (historyQuery.isLoading()) {
        <app-loading-state message="Cargando historial..."></app-loading-state>
      } @else if (historyQuery.isError()) {
        <div class="error-state sm-glass-card">❌ No se pudo cargar el historial.</div>
      } @else {
        <mat-card class="table-card sm-glass-card">
          <div class="table-header">
            <lucide-icon [img]="historyIcon" [size]="18"></lucide-icon>
            <span>Registros encontrados</span>
            <span class="count-badge">{{ filteredData().length }}</span>
          </div>

          <table mat-table [dataSource]="pagedData()" class="modern-table">

            <!-- ID -->
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>ID Incidente</th>
              <td mat-cell *matCellDef="let h">
                <span class="mono-id">#{{ h.id_incidente.substring(0, 8) }}</span>
              </td>
            </ng-container>

            <!-- Fecha -->
            <ng-container matColumnDef="fecha">
              <th mat-header-cell *matHeaderCellDef>Fecha (BOL)</th>
              <td mat-cell *matCellDef="let h">
                <span class="date-text">{{ h.fecha_reporte | date:'dd/MM/yyyy HH:mm' : '-0400' }}</span>
              </td>
            </ng-container>

            <!-- Estado -->
            <ng-container matColumnDef="estado">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let h">
                <span class="status-tag" [attr.data-status]="h.estado_incidente">
                  {{ h.estado_incidente?.replace('_', ' ') }}
                </span>
              </td>
            </ng-container>

            <!-- Prioridad -->
            <ng-container matColumnDef="prioridad">
              <th mat-header-cell *matHeaderCellDef>Prioridad</th>
              <td mat-cell *matCellDef="let h">
                <span class="priority-tag" [attr.data-priority]="h.prioridad_incidente">
                  {{ h.prioridad_incidente }}
                </span>
              </td>
            </ng-container>

            <!-- Resumen IA -->
            <ng-container matColumnDef="resumen">
              <th mat-header-cell *matHeaderCellDef>Resumen IA</th>
              <td mat-cell *matCellDef="let h">
                <p class="truncate-text">{{ h.resumen_ia || 'Sin análisis' }}</p>
              </td>
            </ng-container>

            <!-- Taller -->
            <ng-container matColumnDef="taller">
              <th mat-header-cell *matHeaderCellDef>Taller</th>
              <td mat-cell *matCellDef="let h">
                @if (h.id_taller) {
                  <span class="assigned-badge">Asignado</span>
                } @else {
                  <span class="unassigned-badge">Sin taller</span>
                }
              </td>
            </ng-container>

            <!-- Sucursal -->
            <ng-container matColumnDef="sucursal">
              <th mat-header-cell *matHeaderCellDef>Sucursal</th>
              <td mat-cell *matCellDef="let h">
                <span class="branch-tag">{{ h.branch_name || 'Sin sucursal asignada' }}</span>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns()"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns();" class="table-row"></tr>
          </table>

          @if (filteredData().length === 0) {
            <app-empty-state 
              [icon]="historyIcon" 
              [title]="emptyStateTitle()" 
              [message]="emptyStateMessage()">
            </app-empty-state>
          }

          <!-- Paginador DINÁMICO -->
          <mat-paginator
            [length]="filteredData().length"
            [pageSize]="pageSize()"
            [pageIndex]="pageIndex()"
            [pageSizeOptions]="[10, 25, 50]"
            (page)="onPageChange($event)"
            aria-label="Páginas del historial">
          </mat-paginator>
        </mat-card>
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

    .history-hero {
      display: grid;
      grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.9fr);
      gap: 1.2rem;
      padding: 1.4rem;
      border-radius: 32px;
      background:
        radial-gradient(circle at top right, rgba(91, 210, 199, 0.16), transparent 30%),
        linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(241, 250, 251, 0.98));
      border: 1px solid rgba(70, 148, 156, 0.14);
      box-shadow: 0 20px 44px rgba(34, 68, 84, 0.12);
    }

    .hero-copy h2 {
      margin: 0.35rem 0 0.6rem;
      color: #10273a;
      font-size: clamp(1.45rem, 2.6vw, 2.15rem);
      line-height: 1.04;
      font-weight: 900;
      letter-spacing: -0.04em;
    }

    .hero-copy p {
      margin: 0;
      max-width: 680px;
      color: #516579;
      font-size: 0.96rem;
      line-height: 1.7;
    }

    .hero-kicker {
      display: inline-flex;
      padding: 0.38rem 0.72rem;
      border-radius: 999px;
      background: rgba(16, 39, 58, 0.06);
      color: #187d84;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .hero-cues {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 0.8rem;
      padding: 1rem;
      border-radius: 28px;
      background: linear-gradient(160deg, #0f2c3f, #153d52);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    .cue-pill {
      display: inline-flex;
      align-items: center;
      min-height: 48px;
      padding: 0.85rem 1rem;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.08);
      color: #ecffff;
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.03em;
    }

    .refresh-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-color: rgba(24, 125, 132, 0.18);
      color: #123246;
      background: rgba(255, 255, 255, 0.82);
      border-radius: 999px;
      box-shadow: 0 10px 24px rgba(34, 68, 84, 0.08);
    }

    .filters-container {
      padding: 1.15rem 1.2rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      border-radius: 28px;
      border: 1px solid rgba(70, 148, 156, 0.12);
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(246, 250, 251, 0.98));
      box-shadow: 0 18px 38px rgba(34, 68, 84, 0.08);
      .filter-group {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        flex: 1;
        flex-wrap: wrap;
      }
    }

    .search-id-field { flex: 1; max-width: 220px; }
    .sm-select { width: 160px; }
    
    .date-filter-group {
      display: flex; align-items: center; gap: 0.5rem;
      .date-label { font-size: 0.72rem; font-weight: 700; color: #187d84; text-transform: uppercase; letter-spacing: 0.05em; }
      .date-field { width: 155px; }
    }

    .clear-btn {
      color: #5f7283;
      font-size: 0.8rem;
      font-weight: 700;
      white-space: nowrap;
      &:hover { color: #10273a; }
    }

    .filter-actions {
      display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; justify-content: flex-end;
      button[mat-icon-button] {
        color: #5f7283;
        &:hover { color: #10273a; background: rgba(16, 39, 58, 0.06); }
      }
    }

    .branch-badge {
      display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.78rem; font-weight: 700; color: #13425b;
      background: rgba(91, 210, 199, 0.14); padding: 0.45rem 0.85rem; border-radius: 999px; border: 1px solid rgba(91, 210, 199, 0.24);
    }

    .branch-tag {
      font-size: 0.72rem; font-weight: 700; padding: 0.28rem 0.68rem; border-radius: 999px;
      background: rgba(19, 66, 91, 0.08); color: #13425b;
      border: 1px solid rgba(19, 66, 91, 0.12);
    }

    .table-card { border: none; padding: 0; }
    .table-header { display: flex; align-items: center; gap: 0.75rem; padding: 1.2rem 1.3rem; border-bottom: 1px solid rgba(19,66,91,0.08); color: #123246; font-size: 0.82rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase;
      .count-badge { margin-left: auto; background: rgba(91, 210, 199, 0.16); color: #0f5b63; padding: 0.25rem 0.7rem; border-radius: 999px; font-size: 0.75rem; }
    }
    .modern-table { width: 100%; background: transparent;
      th { color: #6c7f8e; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.82rem 1rem; border-bottom: 1px solid rgba(19,66,91,0.08); }
      td { padding: 0.85rem 1rem; border-bottom: 1px solid rgba(19,66,91,0.05); color: #163246; }
    }
    .table-row:hover td { background: rgba(91, 210, 199, 0.08); }

    .mono-id { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: #0f5b63; font-weight: 700; }
    .date-text { font-size: 0.82rem; color: #4c6274; }
    .truncate-text { margin: 0; max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.82rem; color: #4c6274; }

    .status-tag { font-size: 0.68rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 4px; letter-spacing: 0.03em;
      &[data-status="COMPLETADO"] { background: rgba(46,204,113,0.12); color: #2ecc71; }
      &[data-status="FINALIZADO"]   { background: rgba(46,204,113,0.12); color: #2ecc71; }
      &[data-status="ASIGNADO"]   { background: rgba(52,152,219,0.12); color: #3498db; }
      &[data-status="EN_CAMINO"]  { background: rgba(230,126,34,0.12); color: #e67e22; }
      &[data-status="EN_PROGRESO"]{ background: rgba(241,196,15,0.12); color: #f1c40f; }
      &[data-status="EN_ATENCION"] { background: rgba(241,196,15,0.12); color: #f1c40f; }
      &[data-status="CANCELADO"]  { background: rgba(231,76,60,0.12);  color: #e74c3c; }
      &[data-status="PENDIENTE"]  { background: rgba(108,127,142,0.12); color: #6c7f8e; }
    }

    .priority-tag { font-size: 0.68rem; font-weight: 800; padding: 0.2rem 0.55rem; border-radius: 4px;
      &[data-priority="ALTA"]  { background: rgba(231,76,60,0.12);  color: #e74c3c; }
      &[data-priority="MEDIA"] { background: rgba(241,196,15,0.12); color: #f1c40f; }
      &[data-priority="BAJA"]  { background: rgba(46,204,113,0.12); color: #2ecc71; }
    }

    .assigned-badge   { font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 4px; background: rgba(46,204,113,0.1); color: #248a57; font-weight: 700; }
    .unassigned-badge { font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 4px; background: rgba(108,127,142,0.1); color: #6c7f8e; font-weight: 700; }

    .error-state { padding: 2rem; text-align: center; color: #c0392b; background: rgba(255, 255, 255, 0.96); border: 1px solid rgba(192, 57, 43, 0.12); border-radius: 24px; }

    mat-paginator { background: transparent; }

    @media (max-width: 980px) {
      .history-hero {
        grid-template-columns: 1fr;
      }

      .filters-container {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-actions {
        justify-content: flex-start;
      }
    }

    @media (max-width: 720px) {
      .page-container {
        gap: 1rem;
        padding-bottom: 1.5rem;
      }

      .history-hero {
        padding: 1rem;
        border-radius: 24px;
      }

      .filters-container {
        padding: 1rem;
        border-radius: 20px;
      }

      .filter-group {
        flex-direction: column;
        align-items: stretch !important;
      }

      .search-id-field,
      .sm-select,
      .date-filter-group,
      .date-filter-group .date-field {
        width: 100%;
        max-width: none;
      }

      .date-filter-group {
        flex-direction: column;
        align-items: flex-start;
      }

      .filter-actions {
        width: 100%;
      }

      .table-card {
        overflow: hidden;
      }

      .table-header {
        padding: 1rem;
        flex-wrap: wrap;
      }

      .modern-table {
        display: block;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      .truncate-text {
        max-width: 180px;
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `]
})
export class GlobalHistoryPage {
  private monitoringService = inject(MonitoringService);
  private authStore         = inject(AuthStore);
  private workshopsService  = inject(WorkshopsService);

  readonly historyIcon = History;
  readonly filterIcon  = Filter;
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

  pageTitle = computed(() =>
    this.isSuperAdmin()
      ? 'Historial Global de Servicios'
      : 'Historial de Servicios – Mi Taller'
  );

  pageSubtitle = computed(() =>
    this.isSuperAdmin()
      ? 'Auditoría completa de todos los auxilios mecánicos brindados por la plataforma.'
      : 'Registro de todos los servicios prestados por tu taller.'
  );

  displayedColumns = computed(() => {
    if (this.isSuperAdmin()) {
      return ['id', 'fecha', 'estado', 'prioridad', 'resumen', 'taller'];
    }
    if (this.isOwner()) {
      return ['id', 'fecha', 'estado', 'prioridad', 'resumen', 'sucursal'];
    }
    return ['id', 'fecha', 'estado', 'prioridad', 'resumen'];
  });

  // Opciones para Selectores de Filtro
  statusOptions: SelectOption[] = [
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'ASIGNADO', label: 'Asignado' },
    { value: 'EN_CAMINO', label: 'En Camino' },
    { value: 'EN_ATENCION', label: 'En Atención' },
    { value: 'EN_PROGRESO', label: 'En Progreso' },
    { value: 'FINALIZADO', label: 'Finalizado' },
    { value: 'COMPLETADO', label: 'Completado' },
    { value: 'CANCELADO', label: 'Cancelado' }
  ];

  priorityOptions: SelectOption[] = [
    { value: 'ALTA', label: 'Alta' },
    { value: 'MEDIA', label: 'Media' },
    { value: 'BAJA', label: 'Baja' }
  ];

  branchOptions = computed<SelectOption[]>(() => {
    return [
      { value: '', label: 'Todas las sucursales' },
      ...this.branches().map(b => ({ value: b.id_sucursal, label: b.nombre }))
    ];
  });

  // Estado de filtros (Signals para reactividad)
  searchId          = signal('');
  filterEstado      = signal('');
  filterPrioridad   = signal('');
  filterSucursal    = signal('');
  filterFechaInicio = signal('');
  filterFechaFin    = signal('');
  pageSize          = signal(10);
  pageIndex         = signal(0);

  // Carga TODOS los datos; el filtrado y paginación se hacen en el cliente
  historyQuery = injectQuery(() => ({
    queryKey: ['global-history'],
    queryFn: () => lastValueFrom(this.monitoringService.getGlobalHistory())
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
  }

  // ── Mensajes de Estado Vacío Dinámicos ─────────────────────────────────────
  emptyStateTitle = computed(() => {
    if ((this.isOwner() && this.filterSucursal()) || this.isAdminSucursal()) {
      return 'Sin registros para sucursal';
    }
    return 'Sin registros';
  });

  emptyStateMessage = computed(() => {
    if ((this.isOwner() && this.filterSucursal()) || this.isAdminSucursal()) {
      return 'No hay servicios registrados para esta sucursal';
    }
    return 'No hay registros que coincidan con los filtros aplicados.';
  });

  // ── Filtrado reactivo ──────────────────────────────────────────────────────
  filteredData = computed(() => {
    let data = (this.historyQuery.data() as IncidentDetailResponse[]) ?? [];

    if (this.searchId()) {
      const q = this.searchId().toLowerCase();
      data = data.filter((h: IncidentDetailResponse) => h.id_incidente?.toLowerCase().includes(q));
    }
    if (this.filterEstado()) {
      data = data.filter((h: IncidentDetailResponse) => h.estado_incidente === this.filterEstado());
    }
    if (this.filterPrioridad()) {
      data = data.filter((h: IncidentDetailResponse) => h.prioridad_incidente === this.filterPrioridad());
    }
    if (this.filterFechaInicio()) {
      const desde = new Date(this.filterFechaInicio()).getTime();
      data = data.filter((h: IncidentDetailResponse) => h.fecha_reporte ? new Date(h.fecha_reporte).getTime() >= desde : true);
    }
    if (this.filterFechaFin()) {
      const hasta = new Date(this.filterFechaFin() + 'T23:59:59').getTime();
      data = data.filter((h: IncidentDetailResponse) => h.fecha_reporte ? new Date(h.fecha_reporte).getTime() <= hasta : true);
    }
    if (this.isOwner() && this.filterSucursal()) {
      data = data.filter((h: IncidentDetailResponse) => h.id_sucursal === this.filterSucursal());
    }

    return data;
  });

  // ── Paginación dinámica ────────────────────────────────────────────────────
  pagedData = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredData().slice(start, start + this.pageSize());
  });

  onFilterChange() {
    this.pageIndex.set(0); // Resetear a primera página al filtrar
  }

  onPageChange(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  clearFilters() {
    this.searchId.set('');
    this.filterEstado.set('');
    this.filterPrioridad.set('');
    this.filterSucursal.set('');
    this.filterFechaInicio.set('');
    this.filterFechaFin.set('');
    this.pageIndex.set(0);
  }
}
