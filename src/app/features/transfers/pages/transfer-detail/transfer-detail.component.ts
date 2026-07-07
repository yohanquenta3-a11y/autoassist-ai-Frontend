import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { lastValueFrom } from 'rxjs';

import { TecnicoResponse } from '@core/models/workshops.model';
import { WorkshopsService } from '../../../workshops/data-access/workshops.service';
import { TransfersService } from '../../data-access/transfers.service';
import { VehicleTransfer } from '../../models/transfers.model';

@Component({
  selector: 'app-transfer-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <a routerLink="/transfers" class="back">← Volver a traslados</a>

      @if (loading()) {
        <p class="state">Cargando detalle...</p>
      } @else if (error()) {
        <p class="state error">{{ error() }}</p>
      } @else if (transfer()) {
        @if (success()) {
          <p class="state success">{{ success() }}</p>
        }

        <article class="hero">
          <div>
            <p class="eyebrow">{{ readableType() }}</p>
            <h1>{{ transfer()!.vehiculo_marca || 'Vehiculo' }} {{ transfer()!.vehiculo_modelo || '' }}</h1>
            <p>{{ transfer()!.vehiculo_matricula || 'Sin placa' }} · {{ transfer()!.estado }}</p>
          </div>
          <span class="badge">{{ transfer()!.estado }}</span>
        </article>

        <div class="layout">
          <article class="panel">
            <h2>Datos del traslado</h2>
            <p><strong>Cliente:</strong> {{ transfer()!.cliente_nombre || 'Sin nombre' }}</p>
            <p><strong>Telefono:</strong> {{ transfer()!.cliente_telefono || transfer()!.telefono_contacto || 'No registrado' }}</p>
            <p><strong>Recojo:</strong> {{ transfer()!.origen_direccion }}</p>
            <p><strong>Destino:</strong> {{ transfer()!.destino_direccion }}</p>
            <p><strong>Motivo:</strong> {{ cleanText(transfer()!.motivo) }}</p>
            @if (transfer()!.fecha_programada) {
              <p><strong>Fecha programada:</strong> {{ transfer()!.fecha_programada | date:'medium' }}</p>
            }
            <p><strong>Responsable:</strong> {{ transfer()!.tecnico_nombre || 'Sin asignar' }}</p>
            @if (transfer()!.observaciones) {
              <p><strong>Observaciones:</strong> {{ cleanText(transfer()!.observaciones) }}</p>
            }
          </article>

          <article class="panel">
            <h2>Acciones</h2>
            @if (canConfirm()) {
              <button type="button" [disabled]="saving()" (click)="confirm()">{{ confirmLabel() }}</button>
            } @else {
              <p class="status-note">{{ statusHint() }}</p>
            }
            <button type="button" (click)="reject()">Rechazar</button>
            <label>
              Tecnico responsable
              <select [(ngModel)]="technicianId">
                <option value="">Selecciona un tecnico</option>
                @for (tech of activeTechnicians(); track tech.id_tecnico) {
                  <option [value]="tech.id_tecnico">
                    {{ tech.nombre }}{{ tech.branch_name ? ' - ' + tech.branch_name : '' }}
                  </option>
                }
              </select>
            </label>
            @if (techniciansLoading()) {
              <p class="status-note">Cargando tecnicos...</p>
            }
            <button type="button" [disabled]="saving() || !technicianId" (click)="assign()">
              {{ transfer()!.id_tecnico ? 'Confirmar asignacion' : 'Asignar tecnico' }}
            </button>
            @if (nextStatuses().length > 0) {
              <label>
                Nuevo estado
                <select [(ngModel)]="nextStatus">
                  @for (status of nextStatuses(); track status) {
                    <option [value]="status">{{ readableStatus(status) }}</option>
                  }
                </select>
              </label>
              <button type="button" [disabled]="saving()" (click)="updateStatus()">Actualizar estado</button>
            } @else {
              <p class="status-note">{{ nextStepHint() }}</p>
            }
          </article>
        </div>

        <article class="panel">
          <h2>Historial</h2>
          @if ((transfer()!.historial || []).length === 0) {
            <p>Sin historial registrado.</p>
          } @else {
            <ol>
              @for (item of transfer()!.historial; track item.id_historial) {
                <li>
                  <strong>{{ item.estado_nuevo }}</strong>
                  <span>{{ item.fecha | date:'short' }}</span>
                  @if (item.historial_actor) { <small>{{ item.historial_actor }}</small> }
                  @if (item.comentario) { <p>{{ cleanText(item.comentario) }}</p> }
                </li>
              }
            </ol>
          }
        </article>
      }
    </section>
  `,
  styles: [`
    .page { padding: 24px; color:#0f172a; }
    .back { display:inline-block; margin-bottom:16px; color:#0f766e; font-weight:800; }
    .hero, .panel {
      background: rgba(255,255,255,.92);
      border: 1px solid rgba(15,23,42,.08);
      border-radius: 20px;
      box-shadow: 0 14px 35px rgba(15,23,42,.08);
    }
    .hero { display:flex; justify-content:space-between; gap:16px; padding:24px; margin-bottom:16px; }
    .hero h1 { margin:4px 0 8px; font-size:30px; }
    .eyebrow { margin:0; color:#f97316; font-weight:900; text-transform:uppercase; letter-spacing:.08em; }
    .badge { align-self:flex-start; background:#dcfce7; color:#166534; border-radius:999px; padding:8px 12px; font-weight:900; }
    .layout { display:grid; grid-template-columns: 1.2fr .8fr; gap:16px; margin-bottom:16px; }
    .panel { padding:20px; }
    .panel h2 { margin-top:0; }
    button, input, select { width:100%; border-radius:12px; border:1px solid #cbd5e1; padding:10px 12px; margin:6px 0 12px; }
    button { background:#0f172a; color:white; cursor:pointer; }
    button:disabled { opacity:.65; cursor:not-allowed; }
    label { display:block; font-weight:800; color:#475569; }
    .status-note { color:#64748b; font-weight:800; }
    li { margin-bottom:14px; }
    li span, li small { display:block; color:#64748b; }
    .state { padding:24px; text-align:center; color:#64748b; }
    .success { color:#047857; background:#ecfdf5; border:1px solid #a7f3d0; border-radius:16px; }
    .error { color:#dc2626; }
    @media (max-width: 900px) {
      .hero { flex-direction:column; }
      .layout { grid-template-columns:1fr; }
    }
  `]
})
export class TransferDetailComponent {
  private route = inject(ActivatedRoute);
  private transfersService = inject(TransfersService);
  private workshopsService = inject(WorkshopsService);

  transfer = signal<VehicleTransfer | null>(null);
  technicians = signal<TecnicoResponse[]>([]);
  loading = signal(false);
  techniciansLoading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  saving = signal(false);
  technicianId = '';
  nextStatus = 'EN_CAMINO';

  constructor() {
    this.load();
    this.loadTechnicians();
  }

  get id(): string {
    return this.route.snapshot.paramMap.get('id') || '';
  }

  readableType(): string {
    return this.transfer()?.tipo_traslado === 'PREVENTIVO' ? 'Traslado preventivo' : 'Flete inmediato';
  }

  canConfirm(): boolean {
    const transfer = this.transfer();
    if (!transfer) return false;
    return (
      (transfer.tipo_traslado === 'FLETE_INMEDIATO' && transfer.estado === 'SOLICITADO') ||
      (transfer.tipo_traslado === 'PREVENTIVO' && transfer.estado === 'PROGRAMADO')
    );
  }

  confirmLabel(): string {
    return this.transfer()?.tipo_traslado === 'PREVENTIVO' ? 'Confirmar traslado' : 'Aceptar flete';
  }

  statusHint(): string {
    const estado = this.transfer()?.estado || '';
    const hints: Record<string, string> = {
      ACEPTADO: 'Este flete ya fue aceptado. Selecciona un tecnico para iniciar el traslado.',
      CONFIRMADO: 'Este traslado ya fue confirmado. Selecciona un tecnico para iniciar el traslado.',
      ASIGNADO: 'Tecnico asignado. El siguiente paso es marcar en camino.',
      EN_CAMINO: 'Tecnico en camino. El siguiente paso es marcar vehiculo recogido.',
      VEHICULO_RECOGIDO: 'Vehiculo recogido. El siguiente paso es completar la entrega.',
      ENTREGADO: 'Flete entregado.',
      ENTREGADO_EN_TALLER: 'Vehiculo entregado en taller.',
      RECHAZADO: 'Solicitud rechazada.',
      CANCELADO: 'Solicitud cancelada.',
    };
    return hints[estado] || 'No hay accion de confirmacion disponible.';
  }

  nextStatuses(): string[] {
    const transfer = this.transfer();
    if (!transfer) return [];

    const terminalStatuses = ['ENTREGADO', 'ENTREGADO_EN_TALLER', 'RECHAZADO', 'CANCELADO'];
    if (terminalStatuses.includes(transfer.estado)) return [];

    if (transfer.estado === 'ASIGNADO') return ['EN_CAMINO', 'CANCELADO'];
    if (transfer.estado === 'EN_CAMINO') return ['VEHICULO_RECOGIDO', 'CANCELADO'];
    if (transfer.estado === 'VEHICULO_RECOGIDO') {
      return transfer.tipo_traslado === 'PREVENTIVO'
        ? ['ENTREGADO_EN_TALLER', 'CANCELADO']
        : ['ENTREGADO', 'CANCELADO'];
    }

    return [];
  }

  activeTechnicians(): TecnicoResponse[] {
    return this.technicians().filter(tech => tech.estado);
  }

  readableStatus(status: string): string {
    const labels: Record<string, string> = {
      EN_CAMINO: 'En camino',
      VEHICULO_RECOGIDO: 'Vehiculo recogido',
      ENTREGADO: 'Entregado',
      ENTREGADO_EN_TALLER: 'Entregado en taller',
      CANCELADO: 'Cancelado',
    };
    return labels[status] || status;
  }

  cleanText(value?: string | null): string {
    if (!value) return '';
    return value
      .replace(/^DEMO CU\d+\s*-\s*/i, '')
      .replace(/CU47\/CU48/gi, 'traslados')
      .replace(/CU47|CU48/gi, 'traslados')
      .replace(/Seed demo recuperatorio traslados/gi, 'Registro inicial del traslado')
      .replace(/Dato demo para probar traslados sin afectar datos reales\./gi, 'Solicitud registrada para prueba operativa.');
  }

  nextStepHint(): string {
    const estado = this.transfer()?.estado;
    if (estado === 'ACEPTADO' || estado === 'CONFIRMADO') {
      return 'Primero asigna un tecnico para habilitar los estados de avance.';
    }
    return 'No hay estados de avance disponibles para este traslado.';
  }

  async load(): Promise<void> {
    if (!this.id) return;
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);
    try {
      this.setTransfer(await lastValueFrom(this.transfersService.getTransfer(this.id)));
    } catch {
      this.error.set('No se pudo cargar el traslado.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadTechnicians(): Promise<void> {
    this.techniciansLoading.set(true);
    try {
      this.technicians.set(await lastValueFrom(this.workshopsService.getTechnicians()));
    } catch {
      this.error.set('No se pudieron cargar los tecnicos del taller.');
    } finally {
      this.techniciansLoading.set(false);
    }
  }

  async confirm(): Promise<void> {
    if (!this.canConfirm()) return;
    await this.runAction(() => this.transfersService.confirm(this.id));
  }

  async reject(): Promise<void> {
    await this.runAction(() => this.transfersService.reject(this.id, 'Rechazado desde panel web'));
  }

  async assign(): Promise<void> {
    if (!this.technicianId.trim()) {
      this.error.set('Selecciona un tecnico.');
      return;
    }
    await this.runAction(() => this.transfersService.assign(this.id, this.technicianId.trim()));
  }

  async updateStatus(): Promise<void> {
    if (this.nextStatuses().length === 0) {
      this.error.set('Este traslado no tiene siguientes estados disponibles.');
      return;
    }
    await this.runAction(() => this.transfersService.updateStatus(this.id, this.nextStatus));
  }

  private async runAction(action: () => ReturnType<TransfersService['confirm']>): Promise<void> {
    if (this.saving()) return;
    this.error.set(null);
    this.success.set(null);
    this.saving.set(true);
    try {
      this.setTransfer(await lastValueFrom(action()));
      this.success.set(`Traslado actualizado a ${this.transfer()?.estado}.`);
    } catch {
      this.error.set('No se pudo ejecutar la accion.');
    } finally {
      this.saving.set(false);
    }
  }

  private setTransfer(transfer: VehicleTransfer): void {
    this.transfer.set(transfer);
    this.technicianId = transfer.id_tecnico || this.technicianId || '';
    const statuses = this.nextStatuses();
    this.nextStatus = statuses[0] || '';
  }
}
