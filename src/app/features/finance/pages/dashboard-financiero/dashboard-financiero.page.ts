import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinanceService, PaymentResponse } from '../../data-access/finance.service';
import { WorkshopsService } from '@features/workshops/data-access/workshops.service';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthStore } from '@features/identity/auth/state/auth.store';
import { 
  LucideAngularModule, 
  DollarSign, 
  PieChart, 
  CheckCircle, 
  ArrowUpRight, 
  FileText, 
  TrendingUp,
  Wallet,
  ArrowDownRight,
  RefreshCw,
  Zap
} from 'lucide-angular';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent, LoadingStateComponent, EmptyStateComponent } from '@shared/ui';

@Component({
  selector: 'app-dashboard-financiero',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatTooltipModule,
    LucideAngularModule,
    RouterLink,
    PageHeaderComponent,
    LoadingStateComponent,
    EmptyStateComponent
  ],
  template: `
    <div class="page-container">
      <app-page-header 
        [title]="isSuperAdmin() ? 'Panel Financiero Global' : 'Resumen Financiero del Taller'"
        subtitle="Control de ingresos, recaudación de comisiones y flujo de caja en tiempo real."
        [icon]="walletIcon">
        <div actions>
          <button mat-icon-button class="refresh-btn" (click)="paymentsQuery.refetch()" matTooltip="Sincronizar Datos">
            <lucide-icon [img]="refreshIcon" [size]="18"></lucide-icon>
          </button>
          <button mat-flat-button color="primary" routerLink="../reports" class="report-btn">
            <lucide-icon [img]="reportIcon" [size]="18"></lucide-icon>
            Generar Reportes
          </button>
        </div>
      </app-page-header>

      @if (paymentsQuery.isLoading()) {
        <app-loading-state message="Analizando transacciones..."></app-loading-state>
      } @else {
        <section class="hero-banner sm-surface-panel">
          <div class="hero-copy">
            <span class="sm-section-kicker">AutoAssist AI</span>
            <h2>Lectura financiera clara para ingresos, comisiones y liquidez.</h2>
            <p>El panel resume volumen, comisión de plataforma, margen y movimientos recientes con una experiencia más ejecutiva.</p>
          </div>
          <div class="hero-badges">
            <span class="sm-pill">Cobros recientes</span>
            <span class="sm-pill">Comisión visible</span>
            <span class="sm-pill">Liquidez rápida</span>
          </div>
        </section>

        <!-- KPI Grid -->
        <div class="kpi-grid">
          <!-- KPI 1: Ingresos Brutos (Total procesado) -->
          <mat-card class="kpi-card sm-glass-card border-sapphire">
            <div class="kpi-icon sapphire">
              <lucide-icon [img]="incomeIcon" [size]="22"></lucide-icon>
            </div>
            <div class="kpi-content">
              <span class="kpi-label">{{ isSuperAdmin() ? 'Volumen Total' : 'Ingresos Brutos' }}</span>
              <h2 class="kpi-value">{{ stats().totalIngresos | currency }}</h2>
              <div class="kpi-trend up">
                <lucide-icon [img]="trendUpIcon" [size]="12"></lucide-icon>
                <span>+8.4% vs mes anterior</span>
              </div>
            </div>
          </mat-card>

          <!-- KPI 2: Comisiones (Ingreso para SA, Gasto para Taller) -->
          <mat-card class="kpi-card sm-glass-card border-orange">
            <div class="kpi-icon orange">
              <lucide-icon [img]="commissionIcon" [size]="22"></lucide-icon>
            </div>
            <div class="kpi-content">
              <span class="kpi-label">{{ isSuperAdmin() ? 'Comisiones Recaudadas' : 'Comisión de Plataforma' }}</span>
              <h2 class="kpi-value text-orange">{{ stats().totalComisiones | currency }}</h2>
              <div class="kpi-trend neutral">
                <lucide-icon [img]="zapIcon" [size]="12"></lucide-icon>
                <span>Tasa fija: 10%</span>
              </div>
            </div>
          </mat-card>

          <!-- KPI 3: Margen Neto o Servicios -->
          <mat-card class="kpi-card sm-glass-card border-emerald">
            <div class="kpi-icon emerald">
              <lucide-icon [img]="isSuperAdmin() ? trendingIcon : doneIcon" [size]="22"></lucide-icon>
            </div>
            <div class="kpi-content">
              <span class="kpi-label">{{ isSuperAdmin() ? 'Crecimiento de Red' : 'Ingresos Netos' }}</span>
              <h2 class="kpi-value text-emerald">
                {{ isSuperAdmin() ? '+' + (workshopsQuery.data()?.length || 0) + ' Talleres' : (stats().totalIngresos - stats().totalComisiones | currency) }}
              </h2>
              <div class="kpi-trend up">
                <lucide-icon [img]="trendUpIcon" [size]="12"></lucide-icon>
                <span>{{ isSuperAdmin() ? 'Meta: 20' : 'Disponible para retiro' }}</span>
              </div>
            </div>
          </mat-card>
        </div>

        <div class="dashboard-grid">
          <!-- Sección: Transacciones -->
          <div class="main-content">
            <div class="section-header">
              <h3>Historial Reciente de Cobros</h3>
            </div>
            
            <mat-card class="table-card sm-glass-card">
              <table mat-table [dataSource]="paymentsQuery.data() || []" class="modern-table">
                <ng-container matColumnDef="fecha">
                  <th mat-header-cell *matHeaderCellDef>Fecha y Hora</th>
                  <td mat-cell *matCellDef="let p">
                    <div class="date-cell">
                      <span class="main-date">{{ p.fecha_pago | date:'mediumDate' }}</span>
                      <span class="sub-date">{{ p.fecha_pago | date:'shortTime' }}</span>
                    </div>
                  </td>
                </ng-container>

                <ng-container matColumnDef="id">
                  <th mat-header-cell *matHeaderCellDef>ID Incidente</th>
                  <td mat-cell *matCellDef="let p">
                    <span class="id-tag">#{{ p.id_incidente.substring(0,8) }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="monto">
                  <th mat-header-cell *matHeaderCellDef>Monto Total</th>
                  <td mat-cell *matCellDef="let p">
                    <span class="monto-total">{{ p.monto | currency }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="comision">
                  <th mat-header-cell *matHeaderCellDef>Comisión (10%)</th>
                  <td mat-cell *matCellDef="let p">
                    <span class="monto-comision">{{ p.monto_comision | currency }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="estado">
                  <th mat-header-cell *matHeaderCellDef>Estado</th>
                  <td mat-cell *matCellDef="let p">
                    <span class="status-badge" [class.paid]="p.estado_pago === 'PAGADO'">
                      {{ p.estado_pago }}
                    </span>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row"></tr>
              </table>

              @if ((paymentsQuery.data() || []).length === 0) {
                <app-empty-state 
                  [icon]="walletIcon" 
                  title="Sin transacciones" 
                  message="Aún no se han registrado transacciones financieras en el sistema.">
                </app-empty-state>
              }
            </mat-card>
          </div>

          <!-- Sidebar: Info / Acciones -->
          <aside class="dashboard-sidebar">
            <mat-card class="info-card sm-glass-card bg-sapphire">
              <h4>Liquidación Próxima</h4>
              <p>Tu próximo balance se generará el 01 de Mayo de 2026.</p>
              <div class="balance-box">
                <span class="balance-label">Monto Acumulado</span>
                <span class="balance-value">{{ stats().totalComisiones | currency }}</span>
              </div>
              <button mat-flat-button class="action-btn">Ver Facturación</button>
            </mat-card>

            <mat-card class="tip-card sm-glass-card">
              <div class="tip-header">
                <lucide-icon [img]="zapIcon" [size]="16" class="tip-icon"></lucide-icon>
                <span>Consejo Financiero</span>
              </div>
              <p>Los servicios con prioridad ALTA generan un 15% más de ingresos debido al recargo de urgencia.</p>
            </mat-card>
          </aside>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { padding: 0 0 2rem; max-width: 1400px; margin: 0 auto; animation: fadeIn 0.4s ease-out; }

    .hero-banner {
      padding: 1.25rem 1.35rem;
      border-radius: 1.5rem;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.25rem;
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

    .refresh-btn { color: var(--sm-color-copper-300); }

    /* KPI Grid */
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .kpi-card {
      padding: 1.5rem; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 1.25rem;
      &.border-sapphire { border-left: 4px solid var(--sm-color-copper-400); }
      &.border-orange { border-left: 4px solid #f39c12; }
      &.border-emerald { border-left: 4px solid #2ecc71; }
      
      .kpi-icon {
        width: 54px; height: 54px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
        &.sapphire { background: rgb(var(--sm-rgb-copper-500) / 0.1); color: var(--sm-color-copper-300); }
        &.orange { background: rgba(243, 156, 18, 0.1); color: #f39c12; }
        &.emerald { background: rgba(46, 204, 113, 0.1); color: #2ecc71; }
      }
      
      .kpi-label { font-size: 0.75rem; color: var(--sm-color-text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; }
      .kpi-value { margin: 0.2rem 0; font-size: 1.8rem; font-weight: 800; color: white; }
      .text-orange { color: #f39c12; }
      .text-emerald { color: #2ecc71; }
      
      .kpi-trend {
        display: flex; align-items: center; gap: 0.3rem; font-size: 0.7rem; font-weight: 700;
        &.up { color: #2ecc71; }
        &.neutral { color: var(--sm-color-text-muted); }
      }
    }

    /* Dashboard Layout */
    .dashboard-grid { display: grid; grid-template-columns: 1fr 300px; gap: 2rem; }

    .section-header { margin-bottom: 1.25rem; h3 { font-size: 1.1rem; font-weight: 700; color: white; margin: 0; } }

    .table-card { border-radius: 20px; overflow: hidden; padding: 0; border: 1px solid rgb(var(--sm-rgb-copper-500) / 0.12); }
    .modern-table {
      width: 100%; background: transparent;
      th { padding: 1rem 1.5rem; color: var(--sm-color-text-muted); font-size: 0.7rem; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.05); }
      td { padding: 1rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.02); }
    }
    .table-row:hover td { background: rgba(255,255,255,0.02); }

    .date-cell {
      display: flex; flex-direction: column;
      .main-date { font-weight: 600; color: white; font-size: 0.85rem; }
      .sub-date { font-size: 0.7rem; color: var(--sm-color-text-muted); }
    }

    .id-tag { font-family: monospace; font-size: 0.75rem; color: var(--sm-color-copper-300); background: rgb(var(--sm-rgb-copper-500) / 0.1); padding: 0.2rem 0.5rem; border-radius: 999px; }
    .monto-total { font-weight: 700; color: white; font-size: 0.9rem; }
    .monto-comision { color: #f39c12; font-weight: 600; font-size: 0.85rem; }

    .status-badge {
      font-size: 0.65rem; font-weight: 800; padding: 0.2rem 0.6rem; border-radius: 20px; background: rgba(255,255,255,0.05); color: var(--sm-color-text-muted);
      &.paid { background: rgba(46, 204, 113, 0.1); color: #2ecc71; }
    }

    /* Sidebar */
    .dashboard-sidebar { display: flex; flex-direction: column; gap: 1.5rem; }
    .info-card {
      padding: 1.5rem; border-radius: 16px;
      &.bg-sapphire { background: linear-gradient(135deg, rgba(var(--sm-rgb-sapphire-600), 0.2), rgba(var(--sm-rgb-sapphire-800), 0.2)); border: 1px solid rgba(var(--sm-rgb-sapphire-400), 0.2); }
      h4 { margin: 0 0 0.5rem; font-size: 1rem; color: white; }
      p { font-size: 0.8rem; color: var(--sm-color-text-soft); margin-bottom: 1.5rem; }
      .balance-box {
        display: flex; flex-direction: column; margin-bottom: 1.5rem;
        .balance-label { font-size: 0.7rem; color: var(--sm-color-text-muted); text-transform: uppercase; font-weight: 700; }
        .balance-value { font-size: 1.8rem; font-weight: 800; color: white; }
      }
      .action-btn { width: 100%; border-radius: 8px; font-weight: 700; }
    }

    .tip-card {
      padding: 1.25rem; border-radius: 16px;
      .tip-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; color: #f1c40f; font-weight: 700; font-size: 0.8rem; }
      p { font-size: 0.75rem; color: var(--sm-color-text-soft); margin: 0; line-height: 1.5; }
    }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    @media (max-width: 960px) {
      .hero-banner {
        flex-direction: column;
      }

      .hero-badges {
        justify-content: flex-start;
      }

      .dashboard-grid {
        grid-template-columns: 1fr;
        gap: 1.25rem;
      }
    }
  `]
})
export class DashboardFinancieroPage {
  private financeService = inject(FinanceService);
  private workshopsService = inject(WorkshopsService);
  private authStore = inject(AuthStore);

  // Iconos
  protected readonly incomeIcon = DollarSign;
  protected readonly commissionIcon = PieChart;
  protected readonly doneIcon = CheckCircle;
  protected readonly trendUpIcon = TrendingUp;
  protected readonly reportIcon = FileText;
  protected readonly walletIcon = Wallet;
  protected readonly trendingIcon = TrendingUp;
  protected readonly zapIcon = Zap;
  protected readonly refreshIcon = RefreshCw;

  isSuperAdmin = computed(() => this.authStore.user()?.rol_nombre === 'superadmin');
  displayedColumns = ['fecha', 'id', 'monto', 'comision', 'estado'];

  paymentsQuery = injectQuery(() => ({
    queryKey: ['financial-payments'],
    queryFn: () => lastValueFrom(this.financeService.getPayments()),
    refetchInterval: 60000
  }));

  workshopsQuery = injectQuery(() => ({
    queryKey: ['admin-workshops-count'],
    queryFn: () => lastValueFrom(this.workshopsService.getAllWorkshops()),
    enabled: this.isSuperAdmin()
  }));

  // Estadísticas Calculadas en Caliente
  stats = computed(() => {
    const data = this.paymentsQuery.data() || [];
    const totalIngresos = data.reduce((acc, curr) => acc + Number(curr.monto), 0);
    const totalComisiones = data.reduce((acc, curr) => acc + Number(curr.monto_comision), 0);
    
    return {
      totalIngresos,
      totalComisiones,
      count: data.length
    };
  });
}
