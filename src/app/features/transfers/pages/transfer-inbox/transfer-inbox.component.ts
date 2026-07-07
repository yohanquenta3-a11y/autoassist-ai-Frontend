import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { lastValueFrom } from 'rxjs';

import { TransfersService } from '../../data-access/transfers.service';
import { VehicleTransfer } from '../../models/transfers.model';

@Component({
  selector: 'app-transfer-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <header class="hero">
        <div>
          <p class="eyebrow">Traslados</p>
          <h1>Bandeja de fletes y traslados preventivos</h1>
          <p>Gestiona solicitudes de recojo, asignacion y entrega sin tocar incidentes ni citas existentes.</p>
        </div>
        <button type="button" (click)="load()">Actualizar</button>
      </header>

      <div class="filters">
        <input [(ngModel)]="search" placeholder="Buscar cliente, placa, motivo..." (keyup.enter)="load()" />
        <select [(ngModel)]="estado" (change)="load()">
          <option value="all">Todos los estados</option>
          @for (item of estados; track item) {
            <option [value]="item">{{ item }}</option>
          }
        </select>
        <select [(ngModel)]="tipo" (change)="load()">
          <option value="all">Todos los tipos</option>
          <option value="FLETE_INMEDIATO">Flete inmediato</option>
          <option value="PREVENTIVO">Preventivo</option>
        </select>
        <button type="button" (click)="load()">Filtrar</button>
      </div>

      <div class="stats">
        <article><strong>{{ transfers().length }}</strong><span>Total</span></article>
        <article><strong>{{ pendingCount() }}</strong><span>Pendientes</span></article>
        <article><strong>{{ activeCount() }}</strong><span>En curso</span></article>
      </div>

      @if (success()) {
        <p class="state success">{{ success() }}</p>
      }

      @if (loading()) {
        <p class="state">Cargando traslados...</p>
      } @else if (error()) {
        <p class="state error">{{ error() }}</p>
      } @else if (transfers().length === 0) {
        <p class="state">No hay solicitudes de traslado para los filtros actuales.</p>
      } @else {
        <div class="grid">
          @for (transfer of transfers(); track transfer.id_traslado) {
            <article class="card">
              <div class="card-head">
                <span class="type">{{ readableType(transfer) }}</span>
                <span class="badge">{{ transfer.estado }}</span>
              </div>
              <h2>{{ transfer.vehiculo_marca || 'Vehiculo' }} {{ transfer.vehiculo_modelo || '' }}</h2>
              <p class="plate">{{ transfer.vehiculo_matricula || 'Sin placa' }}</p>
              <p><strong>Cliente:</strong> {{ transfer.cliente_nombre || 'Sin nombre' }}</p>
              <p><strong>Recojo:</strong> {{ transfer.origen_direccion }}</p>
              <p><strong>Destino:</strong> {{ transfer.destino_direccion }}</p>
              @if (transfer.fecha_programada) {
                <p><strong>Fecha:</strong> {{ transfer.fecha_programada | date:'short' }}</p>
              }
              <div class="actions">
                <a [routerLink]="['/transfers', transfer.id_traslado]">Ver detalle</a>
                @if (canConfirm(transfer)) {
                  <button
                    type="button"
                    [disabled]="confirmingId() === transfer.id_traslado"
                    (click)="confirm(transfer)"
                  >
                    {{ confirmingId() === transfer.id_traslado ? 'Procesando...' : confirmLabel(transfer) }}
                  </button>
                } @else {
                  <span class="status-note">{{ statusHint(transfer) }}</span>
                }
              </div>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .page { padding: 24px; color: #0f172a; }
    .hero, .filters, .card, .stats article {
      background: rgba(255,255,255,.9);
      border: 1px solid rgba(15,23,42,.08);
      border-radius: 20px;
      box-shadow: 0 14px 35px rgba(15,23,42,.08);
    }
    .hero { display:flex; justify-content:space-between; gap:16px; padding:24px; margin-bottom:16px; }
    .hero h1 { margin: 4px 0 8px; font-size: 28px; }
    .eyebrow { margin:0; color:#f97316; font-weight:800; text-transform:uppercase; letter-spacing:.08em; }
    .filters { display:grid; grid-template-columns: 1fr 220px 220px auto; gap:12px; padding:16px; margin-bottom:16px; }
    input, select, button { border-radius:12px; border:1px solid #cbd5e1; padding:10px 12px; }
    button { background:#0f172a; color:white; cursor:pointer; }
    button:disabled { opacity:.65; cursor:not-allowed; }
    .stats { display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; margin-bottom:16px; }
    .stats article { padding:18px; display:flex; flex-direction:column; }
    .stats strong { font-size:28px; }
    .stats span { color:#64748b; }
    .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap:16px; }
    .card { padding:18px; }
    .card-head { display:flex; align-items:center; justify-content:space-between; gap:8px; }
    .type { color:#475569; font-size:13px; font-weight:800; }
    .badge { background:#dbeafe; color:#1d4ed8; border-radius:999px; padding:6px 10px; font-size:12px; font-weight:800; }
    .plate { color:#64748b; font-weight:700; }
    .actions { display:flex; gap:10px; align-items:center; margin-top:14px; }
    .actions a { color:#0f766e; font-weight:800; }
    .status-note { color:#64748b; font-size:13px; font-weight:800; }
    .state { padding:24px; text-align:center; color:#64748b; }
    .success { color:#047857; background:#ecfdf5; border:1px solid #a7f3d0; border-radius:16px; }
    .error { color:#dc2626; }
    @media (max-width: 900px) {
      .hero { flex-direction:column; }
      .filters, .stats { grid-template-columns:1fr; }
    }
  `]
})
export class TransferInboxComponent {
  private transfersService = inject(TransfersService);

  transfers = signal<VehicleTransfer[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  confirmingId = signal<string | null>(null);
  search = '';
  estado = 'all';
  tipo = 'all';
  estados = [
    'SOLICITADO',
    'PROGRAMADO',
    'ACEPTADO',
    'CONFIRMADO',
    'ASIGNADO',
    'EN_CAMINO',
    'VEHICULO_RECOGIDO',
    'ENTREGADO',
    'ENTREGADO_EN_TALLER',
    'RECHAZADO',
    'CANCELADO',
  ];

  pendingCount = computed(() =>
    this.transfers().filter(t => ['SOLICITADO', 'PROGRAMADO'].includes(t.estado)).length
  );
  activeCount = computed(() =>
    this.transfers().filter(t => ['ACEPTADO', 'CONFIRMADO', 'ASIGNADO', 'EN_CAMINO', 'VEHICULO_RECOGIDO'].includes(t.estado)).length
  );

  constructor() {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await lastValueFrom(this.transfersService.getWorkshopTransfers({
        estado: this.estado,
        tipoTraslado: this.tipo,
        search: this.search,
      }));
      this.transfers.set(data);
    } catch (err) {
      this.error.set('No se pudieron cargar los traslados.');
    } finally {
      this.loading.set(false);
    }
  }

  readableType(transfer: VehicleTransfer): string {
    return transfer.tipo_traslado === 'PREVENTIVO' ? 'Traslado preventivo' : 'Flete inmediato';
  }

  canConfirm(transfer: VehicleTransfer): boolean {
    return (
      (transfer.tipo_traslado === 'FLETE_INMEDIATO' && transfer.estado === 'SOLICITADO') ||
      (transfer.tipo_traslado === 'PREVENTIVO' && transfer.estado === 'PROGRAMADO')
    );
  }

  confirmLabel(transfer: VehicleTransfer): string {
    return transfer.tipo_traslado === 'PREVENTIVO' ? 'Confirmar traslado' : 'Aceptar flete';
  }

  statusHint(transfer: VehicleTransfer): string {
    const hints: Record<string, string> = {
      ACEPTADO: 'Flete aceptado',
      CONFIRMADO: 'Traslado confirmado',
      ASIGNADO: 'Tecnico asignado',
      EN_CAMINO: 'Tecnico en camino',
      VEHICULO_RECOGIDO: 'Vehiculo recogido',
      ENTREGADO: 'Entregado',
      ENTREGADO_EN_TALLER: 'Entregado en taller',
      RECHAZADO: 'Rechazado',
      CANCELADO: 'Cancelado',
    };
    return hints[transfer.estado] || 'Sin accion disponible';
  }

  async confirm(transfer: VehicleTransfer): Promise<void> {
    if (!this.canConfirm(transfer) || this.confirmingId()) return;
    this.error.set(null);
    this.success.set(null);
    this.confirmingId.set(transfer.id_traslado);
    try {
      const updated = await lastValueFrom(this.transfersService.confirm(transfer.id_traslado));
      this.transfers.update(items => items.map(item => item.id_traslado === updated.id_traslado ? updated : item));
      this.success.set(`${this.readableType(updated)} ${updated.vehiculo_matricula || updated.id_traslado} actualizado a ${updated.estado}.`);
    } catch {
      this.error.set('No se pudo confirmar el traslado.');
    } finally {
      this.confirmingId.set(null);
    }
  }
}
