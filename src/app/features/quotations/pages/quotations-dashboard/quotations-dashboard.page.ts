import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LucideAngularModule, ReceiptText, RefreshCw, Save, X, TriangleAlert } from 'lucide-angular';
import { EmptyStateComponent, LoadingStateComponent, PageHeaderComponent, SearchInputComponent, SelectComponent } from '@shared/ui';
import { QuotationsService } from '../../data-access/quotations.service';
import { QuotationWorkshopInboxItemResponse } from '../../models/quotation.models';
import { QuotationInboxCardComponent } from '../../components/quotation-inbox-card/quotation-inbox-card.component';

@Component({
  selector: 'app-quotations-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    MatSnackBarModule,
    LucideAngularModule,
    PageHeaderComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    SearchInputComponent,
    SelectComponent,
    QuotationInboxCardComponent,
  ],
  template: `
    <div class="page-container">
      <app-page-header
        title="Cotizaciones"
        subtitle="Gestiona solicitudes de cotizacion, responde propuestas y revisa el estado de cada envio."
        [icon]="pageIcon"
      >
        <div actions class="header-actions">
          <button mat-stroked-button color="primary" (click)="refreshAll()">
            <lucide-icon [img]="refreshIcon" [size]="16"></lucide-icon>
            Refrescar
          </button>
        </div>
      </app-page-header>

      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-value">{{ filteredInbox().length }}</span>
          <span class="stat-label">Solicitudes visibles</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ pendingCount() }}</span>
          <span class="stat-label">Pendientes</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ respondedCount() }}</span>
          <span class="stat-label">Respondidas</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ rejectedCount() }}</span>
          <span class="stat-label">Cerradas</span>
        </div>
      </div>

      <div class="filters-bar sm-glass-card">
        <app-search-input [(value)]="searchQuery" placeholder="Buscar por cliente, telefono, vehiculo o descripcion..."></app-search-input>
        <app-select [(value)]="stateFilter" [options]="stateOptions"></app-select>
      </div>

      @if (inboxQuery.isLoading() && !inboxQuery.data()) {
        <app-loading-state message="Cargando bandeja de cotizaciones..."></app-loading-state>
      } @else if (filteredInbox().length === 0) {
        <app-empty-state
          [icon]="emptyIcon"
          title="Sin solicitudes"
          message="No hay cotizaciones para mostrar con los filtros actuales."
        />
      } @else {
        <div class="inbox-grid">
          @for (item of filteredInbox(); track item.id_solicitud_taller) {
            <app-quotation-inbox-card
              [item]="item"
              [selected]="selectedInbox()?.id_solicitud_taller === item.id_solicitud_taller"
              (viewDetail)="openDetail($event)"
              (reply)="selectForReply($event)"
              (reject)="rejectRequest($event)"
            />
          }
        </div>
      }

      @if (selectedInbox(); as selected) {
        <mat-card #replyPanel class="reply-panel sm-glass-card">
          <div class="panel-header">
            <div>
              <h3>Responder solicitud</h3>
              <p>{{ selected.request.descripcion || 'Solicitud sin descripcion' }}</p>
            </div>
            <button mat-icon-button (click)="clearSelected()">
              <lucide-icon [img]="closeIcon" [size]="18"></lucide-icon>
            </button>
          </div>

          <div class="reply-summary">
            <div class="summary-item">
              <span class="label">Cliente</span>
              <span class="value">{{ selected.request.client_name || 'Cliente sin nombre' }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Telefono</span>
              <span class="value">{{ selected.request.client_phone || 'Sin telefono' }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Vehiculo</span>
              <span class="value">{{ selected.request.vehicle_label || 'Vehiculo sin detalle' }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Sucursal</span>
              <span class="value">{{ selected.branch_name || 'Sucursal operativa' }}</span>
            </div>
          </div>

          <div class="reply-grid">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Mano de obra estimada</mat-label>
              <input matInput type="number" min="0" step="0.01" [ngModel]="manoObra()" (ngModelChange)="manoObra.set($event)" />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Repuestos estimados</mat-label>
              <input matInput type="number" min="0" step="0.01" [ngModel]="repuestos()" (ngModelChange)="repuestos.set($event)" />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Tiempo estimado (min)</mat-label>
              <input matInput type="number" min="30" step="15" [ngModel]="tiempoMinutos()" (ngModelChange)="tiempoMinutos.set($event)" />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Vigencia (horas)</mat-label>
              <input matInput type="number" min="1" step="1" [ngModel]="vigenciaHoras()" (ngModelChange)="vigenciaHoras.set($event)" />
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="observations-field">
            <mat-label>Observaciones</mat-label>
            <textarea matInput rows="3" [ngModel]="observaciones()" (ngModelChange)="observaciones.set($event)"></textarea>
          </mat-form-field>

          <div class="panel-footer">
            <div class="total-box">
              <span class="label">Total estimado</span>
              <span class="total-value">{{ totalEstimado() | number:'1.2-2' }}</span>
            </div>
            <button
              mat-flat-button
              color="primary"
              class="submit-btn"
              [disabled]="replyMutation.isPending() || !canSubmit()"
              (click)="submitReply()"
            >
              @if (replyMutation.isPending()) {
                <lucide-icon [img]="refreshIcon" [size]="16" class="spin"></lucide-icon>
              } @else {
                <lucide-icon [img]="saveIcon" [size]="16"></lucide-icon>
              }
              Enviar cotizacion
            </button>
          </div>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .page-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding-bottom: 2rem;
      animation: fadeIn 0.35s ease-out;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 1rem;
    }

    .stat-card {
      background:
        linear-gradient(180deg, rgba(16, 19, 28, 0.94), rgba(10, 13, 20, 0.98));
      border: 1px solid rgba(255, 149, 36, 0.14);
      border-radius: 22px;
      padding: 1rem 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.32rem;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.03),
        0 18px 38px rgba(0, 0, 0, 0.22);
    }

    .stat-value {
      color: #ffffff;
      font-size: clamp(1.45rem, 1.1rem + 0.8vw, 1.9rem);
      font-weight: 800;
    }

    .stat-label {
      color: var(--sm-color-amber-200);
      font-size: 0.76rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .filters-bar {
      display: grid;
      grid-template-columns: 1fr 240px;
      gap: 1rem;
      align-items: center;
      padding: 1rem;
      border-radius: 22px;
    }

    .inbox-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
    }

    .reply-panel {
      border-radius: 24px;
      padding: 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 0.25rem;
      border: 1px solid rgba(255, 149, 36, 0.14);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.03),
        0 22px 50px rgba(0, 0, 0, 0.22);
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
    }

    .panel-header h3 {
      margin: 0;
      color: #fff;
      font-size: 1.02rem;
      font-weight: 800;
    }

    .panel-header p {
      margin: 0.3rem 0 0;
      color: var(--sm-color-text-muted, #94a3b8);
      font-size: 0.86rem;
      line-height: 1.45;
    }

    .reply-summary {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.75rem;
    }

    .summary-item {
      padding: 0.85rem;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      flex-direction: column;
      gap: 0.28rem;
    }

    .summary-item .label {
      color: var(--sm-color-amber-300);
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .summary-item .value {
      color: #ffffff;
      font-size: 0.85rem;
      font-weight: 600;
      word-break: break-word;
      line-height: 1.45;
    }

    .reply-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.75rem;
    }

    .observations-field {
      width: 100%;
    }

    .panel-footer {
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 1rem;
      flex-wrap: wrap;
    }

    .total-box {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .total-box .label {
      color: var(--sm-color-amber-300);
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .total-value {
      color: #ffffff;
      font-size: clamp(1.35rem, 1.1rem + 0.6vw, 1.7rem);
      font-weight: 800;
    }

    .submit-btn {
      min-height: 44px;
      padding-inline: 1.2rem;
    }

    .submit-btn lucide-icon {
      margin-right: 0.45rem;
    }

    .spin {
      animation: spin 0.9s linear infinite;
    }

    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    @media (max-width: 1100px) {
      .stats-row,
      .reply-summary,
      .reply-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .inbox-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 720px) {
      .page-container {
        gap: 1rem;
        padding-bottom: 1.5rem;
      }

      .header-actions,
      .header-actions button {
        width: 100%;
      }

      .stats-row,
      .reply-summary,
      .reply-grid {
        grid-template-columns: 1fr;
      }

      .filters-bar {
        grid-template-columns: 1fr;
        gap: 0.8rem;
        padding: 0.95rem;
      }

      .reply-panel {
        padding: 1rem;
        border-radius: 20px;
      }

      .panel-header {
        align-items: flex-start;
      }

      .panel-footer {
        align-items: stretch;
      }

      .total-box,
      .submit-btn {
        width: 100%;
      }

      .submit-btn {
        justify-content: center;
      }
    }
  `],
})
export class QuotationsDashboardPage {
  private service = inject(QuotationsService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private queryClient = injectQueryClient();

  protected readonly pageIcon = ReceiptText;
  protected readonly refreshIcon = RefreshCw;
  protected readonly saveIcon = Save;
  protected readonly closeIcon = X;
  protected readonly emptyIcon = TriangleAlert;

  searchQuery = signal('');
  stateFilter = signal('all');
  selectedInbox = signal<QuotationWorkshopInboxItemResponse | null>(null);
  manoObra = signal<number>(0);
  repuestos = signal<number>(0);
  tiempoMinutos = signal<number>(60);
  vigenciaHoras = signal<number>(48);
  observaciones = signal('');

  @ViewChild('replyPanel') replyPanel?: ElementRef<HTMLElement>;

  stateOptions = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'ENVIADA', label: 'Pendientes de responder' },
    { value: 'RESPONDIDA', label: 'Respondidas' },
    { value: 'RECHAZADA', label: 'Rechazadas' },
    { value: 'CANCELADA', label: 'Canceladas' },
  ];

  inboxQuery = injectQuery(() => ({
    queryKey: ['quotations', 'workshop-inbox'],
    queryFn: () => lastValueFrom(this.service.getWorkshopInbox(true)),
    refetchInterval: 15000,
  }));

  filteredInbox = computed(() => {
    const data = this.inboxQuery.data() ?? [];
    const search = this.searchQuery().trim().toLowerCase();
    const status = this.stateFilter();

    return data.filter((item) => {
      const haystack = [
        item.id_solicitud_cotizacion,
        item.id_solicitud_taller,
        item.request.client_name ?? '',
        item.request.client_phone ?? '',
        item.request.vehicle_label ?? '',
        item.request.vehicle_brand ?? '',
        item.request.vehicle_model ?? '',
        item.request.vehicle_plate ?? '',
        item.request.descripcion ?? '',
        item.request.observaciones ?? '',
        item.request.estado,
        item.workshop_name ?? '',
        item.branch_name ?? '',
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch = !search || haystack.includes(search);
      const matchesState = status === 'all' || item.estado_envio.toUpperCase() === status;
      return matchesSearch && matchesState;
    });
  });

  pendingCount = computed(
    () => this.filteredInbox().filter((item) => item.estado_envio.toUpperCase() === 'ENVIADA').length,
  );
  respondedCount = computed(
    () => this.filteredInbox().filter((item) => item.estado_envio.toUpperCase() === 'RESPONDIDA').length,
  );
  rejectedCount = computed(
    () =>
      this.filteredInbox().filter((item) =>
        ['RECHAZADA', 'CANCELADA'].includes(item.estado_envio.toUpperCase()),
      ).length,
  );

  totalEstimado = computed(() => Number(this.manoObra()) + Number(this.repuestos()));

  replyMutation = injectMutation(() => ({
    mutationFn: (payload: {
      requestId: string;
      data: {
        mano_obra_estimado: number;
        repuestos_estimado: number;
        total_estimado: number;
        tiempo_estimado_minutos: number;
        observaciones?: string | null;
        vigencia_horas?: number;
      };
    }) => lastValueFrom(this.service.createWorkshopQuote(payload.requestId, payload.data)),
    onSuccess: () => {
      this.snackBar.open('Cotizacion enviada correctamente', 'OK', { duration: 2500 });
      this.selectedInbox.set(null);
      this.resetReplyForm();
      this.queryClient.invalidateQueries({ queryKey: ['quotations', 'workshop-inbox'] });
    },
    onError: (error: unknown) => {
      this.snackBar.open(this.extractErrorMessage(error, 'No se pudo enviar la cotizacion.'), 'OK', {
        duration: 4000,
      });
    },
  }));

  rejectMutation = injectMutation(() => ({
    mutationFn: (payload: { requestId: string; motivo?: string }) =>
      lastValueFrom(this.service.rejectWorkshopRequest(payload.requestId, payload.motivo ? { motivo: payload.motivo } : {})),
    onSuccess: () => {
      this.snackBar.open('Solicitud rechazada', 'OK', { duration: 2500 });
      this.queryClient.invalidateQueries({ queryKey: ['quotations', 'workshop-inbox'] });
    },
    onError: (error: unknown) => {
      this.snackBar.open(this.extractErrorMessage(error, 'No se pudo rechazar la solicitud.'), 'OK', {
        duration: 4000,
      });
    },
  }));

  selectForReply(item: QuotationWorkshopInboxItemResponse): void {
    if (item.estado_envio.toUpperCase() !== 'ENVIADA') {
      this.snackBar.open('Esta solicitud ya no admite nuevas ofertas.', 'OK', { duration: 3000 });
      return;
    }
    this.selectedInbox.set(item);
    this.resetReplyForm();
    queueMicrotask(() => {
      this.replyPanel?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  clearSelected(): void {
    this.selectedInbox.set(null);
    this.resetReplyForm();
  }

  canSubmit(): boolean {
    return (
      !!this.selectedInbox() &&
      Number(this.manoObra()) >= 0 &&
      Number(this.repuestos()) >= 0 &&
      Number(this.tiempoMinutos()) >= 30 &&
      Number(this.vigenciaHoras()) >= 1 &&
      this.totalEstimado() >= 0
    );
  }

  submitReply(): void {
    const selected = this.selectedInbox();
    if (!selected) {
      this.snackBar.open('Selecciona primero una solicitud para responder.', 'OK', { duration: 3000 });
      return;
    }
    if (selected.estado_envio.toUpperCase() !== 'ENVIADA') {
      this.snackBar.open('Esta solicitud ya no admite nuevas ofertas.', 'OK', { duration: 3000 });
      return;
    }
    if (!this.canSubmit()) {
      this.snackBar.open('Completa los datos minimos de la oferta antes de enviarla.', 'OK', { duration: 3000 });
      return;
    }

    this.replyMutation.mutate({
      requestId: selected.id_solicitud_cotizacion,
      data: {
        mano_obra_estimado: Number(this.manoObra()),
        repuestos_estimado: Number(this.repuestos()),
        total_estimado: this.totalEstimado(),
        tiempo_estimado_minutos: Number(this.tiempoMinutos()),
        observaciones: this.observaciones().trim() || null,
        vigencia_horas: Number(this.vigenciaHoras()),
      },
    });
  }

  rejectRequest(item: QuotationWorkshopInboxItemResponse): void {
    if (item.estado_envio.toUpperCase() !== 'ENVIADA') return;
    const motivo = window.prompt('Motivo del rechazo (opcional):', '') ?? '';
    this.rejectMutation.mutate({
      requestId: item.id_solicitud_cotizacion,
      motivo: motivo.trim() || undefined,
    });
  }

  openDetail(requestId: string): void {
    void this.router.navigate(['/quotations/requests', requestId]);
  }

  refreshAll(): void {
    this.queryClient.invalidateQueries({ queryKey: ['quotations', 'workshop-inbox'] });
  }

  resetReplyForm(): void {
    this.manoObra.set(0);
    this.repuestos.set(0);
    this.tiempoMinutos.set(60);
    this.vigenciaHoras.set(48);
    this.observaciones.set('');
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-BO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null) {
      const maybe = error as {
        error?: { detail?: string; message?: string };
        message?: string;
      };
      return maybe.error?.detail ?? maybe.error?.message ?? maybe.message ?? fallback;
    }

    return fallback;
  }
}
