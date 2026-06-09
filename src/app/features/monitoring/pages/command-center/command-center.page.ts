import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, DecimalPipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  LucideAngularModule,
  Activity,
  AlertTriangle,
  Building2,
  Clock3,
  Map as MapIcon,
  RefreshCw,
  ShieldAlert,
  Siren,
  TrendingUp,
} from 'lucide-angular';
import { Chart, registerables } from 'chart.js';
import type * as L from 'leaflet';

import { AuthStore } from '@features/identity/auth/state/auth.store';
import { OfflineSnapshotService } from '@core/services/offline-snapshot.service';
import { WorkshopsService } from '@features/workshops/data-access/workshops.service';
import { SucursalResponse, TallerResponse } from '@core/models/workshops.model';
import {
  EmptyStateComponent,
  LoadingStateComponent,
  PageHeaderComponent,
  SelectComponent,
  SelectOption,
} from '@shared/ui';
import { MonitoringService } from '../../data-access/monitoring.service';
import { OperationalDashboardResponse } from '../../models/monitoring.model';

type HeatPoint = [number, number, number?];
type HeatLayerOptions = {
  minOpacity?: number;
  maxZoom?: number;
  max?: number;
  radius?: number;
  blur?: number;
  gradient?: Record<number, string>;
};
type LeafletWithHeat = typeof L & {
  heatLayer: (latlngs: HeatPoint[], options?: HeatLayerOptions) => L.Layer;
};

Chart.register(...registerables);

@Component({
  selector: 'app-command-center',
  standalone: true,
  providers: [DecimalPipe],
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    LucideAngularModule,
    PageHeaderComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    SelectComponent,
  ],
  template: `
    <div class="page-container">
      <app-page-header
        [title]="pageTitle()"
        [subtitle]="pageSubtitle()">
        <div actions class="header-actions">
          @if (dashboardQuery.isFetching() && dashboardQuery.data()) {
            <span class="sync-indicator">
              <span class="sync-dot"></span>
              Actualizando
            </span>
          }
          <span class="scope-badge sm-glass-card">{{ scopeLabel() }}</span>
          <a mat-stroked-button routerLink="/monitoring/sla-alerts" class="secondary-btn">
            <lucide-icon [img]="shieldIcon" [size]="16"></lucide-icon>
            Ver Alertas SLA
          </a>
          <button mat-stroked-button class="secondary-btn" (click)="dashboardQuery.refetch()">
            <lucide-icon [img]="refreshIcon" [size]="16"></lucide-icon>
            Actualizar
          </button>
          <button mat-button class="clear-btn" (click)="clearFilters()">
            Limpiar filtros
          </button>
        </div>
      </app-page-header>

      <section class="hero-banner sm-surface-panel">
        <div class="hero-copy">
          <span class="sm-section-kicker">AutoAssist AI</span>
          <h2>Monitorea operación, densidad y cumplimiento sin perder contexto.</h2>
          <p>El centro de mando consolida métricas reales, ranking operativo y actividad reciente con una presentación más clara, ejecutiva y alineada al nuevo lenguaje visual.</p>
        </div>
        <div class="hero-badges">
          <span class="sm-pill">SLA visible</span>
          <span class="sm-pill">Mapa en vivo</span>
          <span class="sm-pill">Ranking operativo</span>
        </div>
      </section>

      @if (offlineMode()) {
        <div class="offline-banner warning">
          <strong>Modo sin conexion.</strong>
          <span>Mostrando el ultimo dashboard guardado localmente.</span>
        </div>
      } @else if (cachedSnapshotAt()) {
        <div class="offline-banner soft">
          <strong>Snapshot local disponible.</strong>
          <span>Ultima sincronizacion: {{ cachedSnapshotAt() | date:'dd/MM/yy HH:mm' : '-0400' }}</span>
        </div>
      }

      <div class="filters-container sm-glass-card">
        <div class="filters-grid">
          @if (isSuperAdmin()) {
            <app-select
              class="sm-select"
              [value]="selectedWorkshop()"
              (valueChange)="onWorkshopChange($event)"
              placeholder="Global o taller"
              [options]="workshopOptions()">
            </app-select>
          }

          @if (canFilterBranches()) {
            <app-select
              class="sm-select"
              [value]="selectedBranch()"
              (valueChange)="onBranchChange($event)"
              placeholder="Todas las sucursales"
              [options]="branchOptions()">
            </app-select>
          } @else if (isAdminSucursal()) {
            <span class="fixed-context sm-glass-card">Sucursal actual: {{ myBranchName() }}</span>
          }

          <app-select
            class="sm-select"
            [value]="selectedEstado()"
            (valueChange)="selectedEstado.set($event)"
            placeholder="Todos los estados"
            [options]="statusOptions">
          </app-select>

          <app-select
            class="sm-select"
            [value]="selectedPrioridad()"
            (valueChange)="selectedPrioridad.set($event)"
            placeholder="Todas las prioridades"
            [options]="priorityOptions">
          </app-select>

          <app-select
            class="sm-select"
            [value]="selectedOrigen()"
            (valueChange)="selectedOrigen.set($event)"
            placeholder="Todos los origenes"
            [options]="originOptions">
          </app-select>

          <div class="date-filter-group">
            <span class="date-label">Desde</span>
            <mat-form-field appearance="outline" class="sm-capsule-field date-field" subscriptSizing="dynamic">
              <input matInput type="date" [ngModel]="dateFrom()" (ngModelChange)="dateFrom.set($event)" />
            </mat-form-field>
          </div>

          <div class="date-filter-group">
            <span class="date-label">Hasta</span>
            <mat-form-field appearance="outline" class="sm-capsule-field date-field" subscriptSizing="dynamic">
              <input matInput type="date" [ngModel]="dateTo()" (ngModelChange)="dateTo.set($event)" />
            </mat-form-field>
          </div>
        </div>
      </div>

      @if (dashboardQuery.isLoading()) {
        <app-loading-state message="Calculando KPIs operacionales reales..."></app-loading-state>
      } @else if (dashboardQuery.isError()) {
        <div class="error-state sm-glass-card">
          <h3>No fue posible cargar el dashboard operacional.</h3>
          <p>Reintentar</p>
          <button mat-stroked-button class="secondary-btn" (click)="dashboardQuery.refetch()">
            <lucide-icon [img]="refreshIcon" [size]="16"></lucide-icon>
            Reintentar
          </button>
        </div>
      } @else if (dashboardData(); as dashboard) {
        @if (!hasDashboardContent(dashboard)) {
          <div class="empty-dashboard sm-glass-card">
            <app-empty-state
              [icon]="trendIcon"
              title="No hay datos suficientes para calcular KPIs en este rango."
              message="Ajusta las fechas o los filtros para ver actividad operacional real.">
            </app-empty-state>
          </div>
        } @else {
          <div class="mini-stats-grid">
            <div class="stat-box sm-glass-card">
              <div class="icon-wrap sapphire"><lucide-icon [img]="incidentsIcon" [size]="20"></lucide-icon></div>
              <div class="info">
                <span class="label">Total Emergencias</span>
                <span class="value">{{ dashboard.summary.total_incidentes }}</span>
              </div>
            </div>
            <div class="stat-box sm-glass-card">
              <div class="icon-wrap emerald"><lucide-icon [img]="activeIcon" [size]="20"></lucide-icon></div>
              <div class="info">
                <span class="label">Activas</span>
                <span class="value">{{ dashboard.summary.incidentes_activos }}</span>
              </div>
            </div>
            <div class="stat-box sm-glass-card">
              <div class="icon-wrap orange"><lucide-icon [img]="clockIcon" [size]="20"></lucide-icon></div>
              <div class="info">
                <span class="label">Promedio Llegada</span>
                <span class="value">{{ formatMinutes(dashboard.summary.tiempo_promedio_llegada_min) }}</span>
              </div>
            </div>
            <div class="stat-box sm-glass-card">
              <div class="icon-wrap red"><lucide-icon [img]="shieldIcon" [size]="20"></lucide-icon></div>
              <div class="info">
                <span class="label">Cumplimiento SLA</span>
                <span class="value">{{ formatPercentage(dashboard.summary.cumplimiento_sla_pct) }}</span>
              </div>
            </div>
            <div class="stat-box sm-glass-card">
              <div class="icon-wrap purple"><lucide-icon [img]="alertIcon" [size]="20"></lucide-icon></div>
              <div class="info">
                <span class="label">Alertas Activas</span>
                <span class="value">{{ dashboard.summary.alertas_sla_activas }}</span>
              </div>
            </div>
            <div class="stat-box sm-glass-card">
              <div class="icon-wrap gold"><lucide-icon [img]="trendIcon" [size]="20"></lucide-icon></div>
              <div class="info">
                <span class="label">Finalizadas</span>
                <span class="value">{{ dashboard.summary.incidentes_finalizados }}</span>
              </div>
            </div>
          </div>

          <div class="main-grid">
            <mat-card class="chart-card sm-glass-card">
              <div class="card-header">
                <div class="title-with-icon">
                  <lucide-icon [img]="trendIcon" [size]="18"></lucide-icon>
                  <h3>Incidentes por Estado</h3>
                </div>
              </div>
              <div class="chart-container">
                <canvas #performanceChart></canvas>
              </div>
            </mat-card>

            <mat-card class="map-card sm-glass-card">
              <div class="card-header">
                <div class="title-with-icon">
                  <lucide-icon [img]="mapIcon" [size]="18"></lucide-icon>
                  <h3>Densidad de Emergencias</h3>
                </div>
              </div>
              @if (dashboard.density.length === 0) {
                <app-empty-state
                  [icon]="mapIcon"
                  title="Sin coordenadas suficientes"
                  message="No hay incidentes con ubicacion valida para mostrar densidad en este rango.">
                </app-empty-state>
              } @else {
                <div #heatmapContainer class="heatmap-container" ngSkipHydration></div>
              }
            </mat-card>
          </div>

          <div class="secondary-grid">
            <mat-card class="list-card sm-glass-card">
              <div class="card-header">
                <div class="title-with-icon">
                  <lucide-icon [img]="buildingIcon" [size]="18"></lucide-icon>
                  <h3>{{ rankingTitle() }}</h3>
                </div>
              </div>
              @if (dashboard.ranking.length === 0) {
                <p class="empty-inline">Sin datos suficientes para ranking.</p>
              } @else {
                <div class="ranking-list">
                  @for (item of dashboard.ranking; track item.label) {
                    <div class="ranking-row">
                      <div>
                        <strong>{{ item.label }}</strong>
                        <p>{{ item.total_incidentes }} incidentes</p>
                      </div>
                      <div class="metrics">
                        <span>SLA {{ formatPercentage(item.cumplimiento_sla_pct) }}</span>
                        <span>Llegada {{ formatMinutes(item.tiempo_promedio_llegada_min) }}</span>
                      </div>
                    </div>
                  }
                </div>
              }
            </mat-card>

            <mat-card class="list-card sm-glass-card">
              <div class="card-header">
                <div class="title-with-icon">
                  <lucide-icon [img]="alertIcon" [size]="18"></lucide-icon>
                  <h3>Incidentes por Tipo</h3>
                </div>
              </div>
              @if (incidentTypes(dashboard).length === 0) {
                <p class="empty-inline">No hay clasificacion suficiente para este rango.</p>
              } @else {
                <div class="type-list">
                  @for (item of incidentTypes(dashboard); track item.label) {
                    <div class="type-row">
                      <div class="type-copy">
                        <strong>{{ item.label }}</strong>
                        <p>{{ item.value }} incidentes clasificados</p>
                      </div>
                      <span class="type-value">{{ item.value }}</span>
                    </div>
                  }
                </div>
              }
            </mat-card>

            <mat-card class="list-card sm-glass-card">
              <div class="card-header">
                <div class="title-with-icon">
                  <lucide-icon [img]="activityIcon" [size]="18"></lucide-icon>
                  <h3>Actividad Reciente</h3>
                </div>
              </div>
              @if (dashboard.recent_activity.length === 0) {
                <p class="empty-inline">No hay incidentes para este filtro.</p>
              } @else {
                <div class="activity-list">
                  @for (item of dashboard.recent_activity; track item.id_incidente) {
                    <a class="activity-row" [routerLink]="['/emergencies/details', item.id_incidente]">
                      <div class="activity-main">
                        <strong>{{ item.vehiculo || 'Vehiculo sin detalle' }}</strong>
                        <p>{{ item.resumen || 'Sin resumen disponible' }}</p>
                      </div>
                      <div class="activity-meta">
                        <span class="status-chip">{{ item.estado }}</span>
                        <span>{{ item.prioridad }}</span>
                      </div>
                    </a>
                  }
                </div>
              }
            </mat-card>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .page-container {
      padding: 0 0 2rem;
      max-width: 1440px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      animation: fadeIn 0.35s ease-out;
    }
    .hero-banner {
      padding: 1.25rem 1.35rem;
      border-radius: 1.5rem;
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(240px, 0.8fr);
      gap: 1rem;
      border: 1px solid rgb(var(--sm-rgb-copper-500) / 0.14);
      background:
        radial-gradient(circle at top right, rgb(var(--sm-rgb-copper-500) / 0.14), transparent 24%),
        linear-gradient(180deg, rgb(var(--sm-rgb-white) / 0.98), rgb(240 250 251 / 0.94)),
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
      justify-content: flex-start;
      gap: 0.55rem;
      min-width: 12rem;
      align-content: flex-start;
    }
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
    .header-actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .sync-indicator {
      display: inline-flex; align-items: center; gap: 0.45rem; color: #ffcf8e;
      font-size: 0.78rem; font-weight: 700;
    }
    .sync-dot {
      width: 0.5rem; height: 0.5rem; border-radius: 999px; background: #ffb347;
      box-shadow: 0 0 0 0 rgba(255, 179, 71, 0.45); animation: pulse 1.6s infinite;
    }
    .scope-badge, .fixed-context {
      padding: 0.45rem 0.8rem; border-radius: 999px; color: #ffd089;
      font-size: 0.78rem; font-weight: 700;
    }
    .secondary-btn { display: inline-flex; align-items: center; gap: 0.45rem; }
    .clear-btn { color: var(--sm-color-text-muted); font-weight: 700; }
    .filters-container {
      padding: 1rem 1.1rem;
      border-radius: 24px;
      border: 1px solid rgb(var(--sm-rgb-copper-500) / 0.12);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.03),
        0 18px 38px rgba(0, 0, 0, 0.18);
    }
    .filters-grid { display: flex; gap: 0.85rem; flex-wrap: wrap; align-items: center; }
    .sm-select { width: 170px; }
    .date-filter-group { display: flex; align-items: center; gap: 0.55rem; }
    .date-label {
      font-size: 0.72rem; color: var(--sm-color-text-muted); font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .date-field { width: 160px; }
    .mini-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; }
    .stat-box {
      padding: 1.15rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      border-radius: 22px;
      border: 1px solid rgb(var(--sm-rgb-copper-500) / 0.12);
      background: linear-gradient(180deg, rgb(var(--sm-rgb-white) / 0.98), rgb(240 250 251 / 0.94));
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.65),
        0 18px 38px rgba(15, 23, 42, 0.08);
    }
    .icon-wrap { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
    .icon-wrap.sapphire { background: rgba(var(--sm-rgb-sapphire-400), 0.15); color: var(--sm-color-sapphire-400); }
    .icon-wrap.emerald { background: rgba(46, 204, 113, 0.15); color: #2ecc71; }
    .icon-wrap.orange { background: rgba(243, 156, 18, 0.15); color: #f39c12; }
    .icon-wrap.red { background: rgba(231, 76, 60, 0.15); color: #e74c3c; }
    .icon-wrap.purple { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
    .icon-wrap.gold { background: rgba(251, 191, 36, 0.15); color: #fbbf24; }
    .info { display: flex; flex-direction: column; gap: 0.2rem; }
    .label { font-size: 0.72rem; color: var(--sm-color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .value { font-size: 1.5rem; font-weight: 800; color: var(--sm-color-text-title); }
    .main-grid, .secondary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.1rem; }
    .chart-card, .map-card, .list-card {
      padding: 1.2rem;
      border: 1px solid rgb(var(--sm-rgb-copper-500) / 0.12);
      border-radius: 24px;
      background: linear-gradient(180deg, rgb(var(--sm-rgb-white) / 0.98), rgb(240 250 251 / 0.94));
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.65),
        0 18px 38px rgba(15, 23, 42, 0.08);
    }
    .card-header { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .title-with-icon { display: flex; align-items: center; gap: 0.7rem; color: var(--sm-color-copper-700); }
    .title-with-icon h3 { margin: 0; font-size: 1rem; color: var(--sm-color-text-title); }
    .chart-container { height: 340px; position: relative; }
    .heatmap-container { height: 380px; border-radius: 18px; overflow: hidden; background: #eaf7f8; border: 1px solid rgba(14,165,164,0.08); }
    .ranking-list, .activity-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .type-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .ranking-row, .activity-row {
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
      padding: 0.95rem 1rem; border-radius: 18px; background: rgb(var(--sm-rgb-white) / 0.74);
      border: 1px solid rgb(var(--sm-rgb-copper-500) / 0.08);
    }
    .type-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.95rem 1rem;
      border-radius: 18px;
      background: linear-gradient(90deg, rgba(94, 234, 212, 0.16), rgba(56, 189, 248, 0.1));
      border: 1px solid rgba(14,165,164,0.1);
    }
    .type-copy p { margin: 0.2rem 0 0; color: var(--sm-color-text-muted); font-size: 0.82rem; }
    .type-value {
      min-width: 2.5rem;
      text-align: center;
      padding: 0.35rem 0.65rem;
      border-radius: 999px;
      background: rgb(var(--sm-rgb-white) / 0.82);
      color: var(--sm-color-text-title);
      font-weight: 800;
    }
    .ranking-row p, .activity-main p { margin: 0.2rem 0 0; color: var(--sm-color-text-muted); font-size: 0.82rem; }
    .metrics { display: flex; flex-direction: column; gap: 0.25rem; text-align: right; color: var(--sm-color-text-soft); font-size: 0.82rem; }
    .activity-row { text-decoration: none; color: inherit; }
    .activity-main { flex: 1; }
    .activity-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem; font-size: 0.8rem; color: var(--sm-color-text-soft); }
    .status-chip {
      background: rgba(255, 149, 32, 0.12);
      color: #ffd089;
      padding: 0.2rem 0.55rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700;
    }
    .empty-inline { margin: 0; color: var(--sm-color-text-muted); }
    .empty-dashboard { padding: 1rem; border-radius: 22px; }
    .error-state {
      padding: 2rem; text-align: center; color: #e74c3c; display: flex; flex-direction: column;
      gap: 0.85rem; align-items: center;
    }
    .error-state h3, .error-state p { margin: 0; }
    @media (max-width: 1200px) {
      .main-grid, .secondary-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 900px) {
      .page-container {
        gap: 1rem;
        padding-bottom: 1.5rem;
      }

      .hero-banner {
        grid-template-columns: 1fr;
      }

      .filters-container,
      .chart-card,
      .map-card,
      .list-card {
        border-radius: 20px;
      }

      .date-filter-group { width: 100%; justify-content: space-between; }
      .date-field { width: min(220px, 100%); }
    }
    @media (max-width: 640px) {
      .header-actions,
      .filters-grid,
      .offline-banner,
      .type-row,
      .ranking-row,
      .activity-row {
        flex-direction: column;
        align-items: stretch;
      }

      .sm-select,
      .date-field,
      .date-filter-group,
      .header-actions button,
      .secondary-btn {
        width: 100%;
      }

      .date-filter-group {
        align-items: flex-start;
      }

      .mini-stats-grid {
        grid-template-columns: 1fr;
      }

      .stat-box {
        padding: 1rem;
      }

      .chart-card, .map-card, .list-card {
        padding: 1rem;
      }

      .chart-container {
        height: 280px;
      }

      .heatmap-container {
        height: 280px;
      }

      .metrics,
      .activity-meta {
        align-items: flex-start;
        text-align: left;
      }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(255, 179, 71, 0.45); }
      70% { box-shadow: 0 0 0 10px rgba(255, 179, 71, 0); }
      100% { box-shadow: 0 0 0 0 rgba(255, 179, 71, 0); }
    }
  `],
})
export class CommandCenterPage implements AfterViewInit, OnDestroy {
  private monitoringService = inject(MonitoringService);
  private workshopsService = inject(WorkshopsService);
  private authStore = inject(AuthStore);
  private platformId = inject(PLATFORM_ID);
  private offlineSnapshot = inject(OfflineSnapshotService);

  @ViewChild('performanceChart') performanceChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('heatmapContainer') heatmapContainer?: ElementRef<HTMLDivElement>;

  private chart: Chart | null = null;
  private map: L.Map | null = null;
  private L: typeof L | undefined;

  readonly incidentsIcon = Siren;
  readonly activeIcon = Activity;
  readonly clockIcon = Clock3;
  readonly trendIcon = TrendingUp;
  readonly mapIcon = MapIcon;
  readonly shieldIcon = ShieldAlert;
  readonly alertIcon = AlertTriangle;
  readonly buildingIcon = Building2;
  readonly activityIcon = Activity;
  readonly refreshIcon = RefreshCw;

  readonly statusOptions: SelectOption[] = [
    { value: '', label: 'Todos los estados' },
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'ANALIZADO', label: 'Analizado' },
    { value: 'TALLER_ASIGNADO', label: 'Taller asignado' },
    { value: 'EN_CAMINO', label: 'En camino' },
    { value: 'TECNICO_EN_SITIO', label: 'Tecnico en sitio' },
    { value: 'EN_ATENCION', label: 'En atencion' },
    { value: 'EN_PROGRESO', label: 'En progreso' },
    { value: 'FINALIZADO', label: 'Finalizado' },
    { value: 'COMPLETADO', label: 'Completado' },
    { value: 'CANCELADO', label: 'Cancelado' },
  ];
  readonly priorityOptions: SelectOption[] = [
    { value: '', label: 'Todas las prioridades' },
    { value: 'CRITICA', label: 'Critica' },
    { value: 'ALTA', label: 'Alta' },
    { value: 'MEDIA', label: 'Media' },
    { value: 'BAJA', label: 'Baja' },
  ];
  readonly originOptions: SelectOption[] = [
    { value: '', label: 'Todos los origenes' },
    { value: 'COTIZACION', label: 'Cotizacion' },
    { value: 'ONLINE', label: 'Online' },
    { value: 'OFFLINE_MOVIL', label: 'Offline movil' },
  ];

  readonly workshops = signal<TallerResponse[]>([]);
  readonly branches = signal<SucursalResponse[]>([]);
  readonly myBranchName = signal('Sin sucursal asignada');

  readonly selectedWorkshop = signal('');
  readonly selectedBranch = signal('');
  readonly selectedEstado = signal('');
  readonly selectedPrioridad = signal('');
  readonly selectedOrigen = signal('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');

  readonly isSuperAdmin = computed(
    () => this.authStore.user()?.rol_nombre === 'superadmin',
  );
  readonly isOwner = computed(() => {
    const user = this.authStore.user();
    return user?.rol_nombre === 'admin_taller' && user?.rol_contexto === 'owner';
  });
  readonly isAdminSucursal = computed(() => {
    const user = this.authStore.user();
    return user?.rol_nombre === 'admin_taller' && user?.rol_contexto === 'admin_sucursal';
  });
  readonly canFilterBranches = computed(() => this.isOwner());

  readonly workshopOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Global o taller' },
    ...this.workshops().map(workshop => ({
      value: workshop.id_taller,
      label: workshop.nombre,
    })),
  ]);

  readonly branchOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Todas las sucursales' },
    ...this.branches().map(branch => ({
      value: branch.id_sucursal,
      label: branch.nombre,
    })),
  ]);

  readonly filters = computed(() => ({
    date_from: this.dateFrom() || undefined,
    date_to: this.dateTo() || undefined,
    id_taller: this.isSuperAdmin() ? this.selectedWorkshop() || undefined : undefined,
    id_sucursal: this.canFilterBranches() ? this.selectedBranch() || undefined : undefined,
    estado: this.selectedEstado() || undefined,
    prioridad: this.selectedPrioridad() || undefined,
    origen: this.selectedOrigen() || undefined,
  }));

  readonly filtersKey = computed(() => JSON.stringify(this.filters()));
  readonly offlineMode = signal(false);
  readonly cachedSnapshotAt = signal<string | null>(null);

  dashboardQuery = injectQuery<OperationalDashboardResponse>(() => ({
    queryKey: ['operational-dashboard', this.filtersKey()],
    queryFn: async () => {
      const cacheKey = `sm:operational-dashboard:${this.filtersKey()}`;
      try {
        const data = await lastValueFrom(
          this.monitoringService.getOperationalDashboard(this.filters()),
        );
        this.offlineSnapshot.write(cacheKey, data);
        this.offlineMode.set(false);
        this.cachedSnapshotAt.set(new Date().toISOString());
        return data;
      } catch (error) {
        const cached = this.offlineSnapshot.read<OperationalDashboardResponse>(cacheKey);
        if (cached) {
          this.offlineMode.set(!this.offlineSnapshot.hasBrowserConnection());
          this.cachedSnapshotAt.set(cached.savedAt);
          return cached.data;
        }
        throw error;
      }
    },
  }));

  readonly dashboardData = computed(
    () => this.dashboardQuery.data() as OperationalDashboardResponse | undefined,
  );

  readonly pageTitle = computed(() => {
    if (this.isSuperAdmin()) return 'Centro de Mando Operacional';
    if (this.isOwner()) return 'Dashboard Operacional del Taller';
    return 'Dashboard Operacional de Sucursal';
  });

  readonly pageSubtitle = computed(() => {
    if (this.isSuperAdmin()) {
      return 'KPIs operacionales, densidad de demanda y cumplimiento SLA de toda la plataforma.';
    }
    if (this.isOwner()) {
      return 'Vista consolidada de incidentes, tiempos operativos y rendimiento de tus sucursales.';
    }
    return 'Seguimiento de servicios, tiempos y alertas SLA de tu sucursal actual.';
  });

  readonly rankingTitle = computed(() =>
    this.isSuperAdmin()
      ? 'Ranking de Talleres'
      : 'Ranking de Sucursales',
  );

  readonly scopeLabel = computed(() => {
    const user = this.authStore.user();
    if (this.isSuperAdmin()) {
      return this.selectedWorkshop()
        ? 'Vista filtrada por taller'
        : 'Vista global';
    }
    if (this.isOwner()) {
      return this.selectedBranch()
        ? 'Owner - sucursal filtrada'
        : 'Owner - taller completo';
    }
    return `Sucursal fija - ${user?.id_sucursal ? 'contexto protegido' : 'sin sucursal'}`;
  });

  constructor() {
    if (this.isSuperAdmin()) {
      this.workshopsService.getAllWorkshops().subscribe({
        next: workshops => this.workshops.set(workshops ?? []),
      });
    } else if (this.isOwner()) {
      this.workshopsService.getBranches().subscribe({
        next: branches => this.branches.set(branches ?? []),
      });
    } else if (this.isAdminSucursal()) {
      this.workshopsService.getMyBranch().subscribe({
        next: branch => {
          if (branch) this.myBranchName.set(branch.nombre);
        },
      });
    }

    effect(() => {
      const dashboard = this.dashboardData();
      if (!dashboard || !this.hasDashboardContent(dashboard) || !isPlatformBrowser(this.platformId) || !this.L) {
        this.chart?.destroy();
        this.chart = null;
        return;
      }
      setTimeout(() => {
        this.initChart(dashboard);
        if (dashboard.density.length === 0) {
          this.map?.remove();
          this.map = null;
        } else {
          this.initMap(dashboard);
        }
      }, 50);
    });

    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('online', this.handleBrowserOnline);
      window.addEventListener('offline', this.handleBrowserOffline);
    }
  }

  async ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    const Leaflet = await import('leaflet');
    this.L = (Leaflet as any).default || Leaflet;
    (window as any).L = this.L;
    await import('leaflet.heat');
  }

  ngOnDestroy() {
    this.chart?.destroy();
    this.map?.remove();
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('online', this.handleBrowserOnline);
      window.removeEventListener('offline', this.handleBrowserOffline);
    }
  }

  onWorkshopChange(value: string) {
    this.selectedWorkshop.set(value);
    this.selectedBranch.set('');
  }

  onBranchChange(value: string) {
    this.selectedBranch.set(value);
  }

  clearFilters() {
    this.selectedWorkshop.set('');
    this.selectedBranch.set('');
    this.selectedEstado.set('');
    this.selectedPrioridad.set('');
    this.selectedOrigen.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
  }

  hasDashboardContent(dashboard: OperationalDashboardResponse): boolean {
    return dashboard.summary.total_incidentes > 0;
  }

  incidentTypes(dashboard: OperationalDashboardResponse) {
    return dashboard.series?.incidentes_por_tipo ?? [];
  }

  formatMinutes(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'Sin datos';
    return `${value.toFixed(1)} min`;
  }

  formatPercentage(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'Sin datos';
    return `${value.toFixed(1)}%`;
  }

  private initChart(dashboard: OperationalDashboardResponse) {
    if (!this.performanceChartRef) return;
    const canvas = this.performanceChartRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.chart?.destroy();

    const labels = dashboard.series.incidentes_por_estado.map(item => item.label);
    const totals = dashboard.series.incidentes_por_estado.map(item => item.value);
    const colors = [
      '#3498db',
      '#2ecc71',
      '#f39c12',
      '#e74c3c',
      '#9b59b6',
      '#1abc9c',
      '#f1c40f',
      '#95a5a6',
    ];

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Incidentes',
          data: totals,
          backgroundColor: totals.map((_, index) => colors[index % colors.length]),
          borderRadius: 10,
          borderSkipped: false,
          maxBarThickness: 48,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.parsed.y} incidentes`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
          x: {
            ticks: { color: '#94a3b8' },
            grid: { display: false },
          },
        },
      },
    });
  }

  private initMap(dashboard: OperationalDashboardResponse) {
    if (!this.L || !this.heatmapContainer || dashboard.density.length === 0) return;
    const leafletWithHeat = this.L as LeafletWithHeat;

    this.map?.remove();
    const first = dashboard.density[0];
    this.map = this.L.map(this.heatmapContainer.nativeElement, {
      zoomControl: false,
      scrollWheelZoom: false,
    }).setView([first.latitud, first.longitud], 11);

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);

    const points: HeatPoint[] = dashboard.density.map(item => [
      item.latitud,
      item.longitud,
      item.intensidad,
    ]);

    leafletWithHeat.heatLayer(points, {
      radius: 28,
      blur: 18,
      maxZoom: 16,
      gradient: { 0.2: '#3498db', 0.5: '#2ecc71', 0.8: '#f1c40f', 1: '#e74c3c' },
    }).addTo(this.map);

    setTimeout(() => this.map?.invalidateSize(), 300);
  }

  private handleBrowserOnline = () => {
    this.offlineMode.set(false);
    this.dashboardQuery.refetch();
  };

  private handleBrowserOffline = () => {
    this.offlineMode.set(true);
  };
}
