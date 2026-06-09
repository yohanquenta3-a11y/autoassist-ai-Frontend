import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import {
  LucideAngularModule,
  MessageSquare,
  Ban,
  FileText,
  Car,
  Building2,
  Clock3,
  BadgeCheck,
  User,
  Phone,
} from 'lucide-angular';
import { QuotationWorkshopInboxItemResponse } from '../../models/quotation.models';

@Component({
  selector: 'app-quotation-inbox-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgClass, MatButtonModule, MatCardModule, MatChipsModule, LucideAngularModule],
  template: `
    <mat-card class="quotation-card" [class.selected]="selected()">
      <div class="card-top">
        <div class="status-chip" [ngClass]="stateClass()">
          <lucide-icon [img]="badgeIcon" [size]="12"></lucide-icon>
          <span>{{ stateLabel() }}</span>
        </div>
        <span class="date-label">{{ formatDate(item().fecha_envio) }}</span>
      </div>

      <div class="card-title">
        <h3>{{ item().request.descripcion || 'Solicitud sin descripcion' }}</h3>
        <p>{{ item().request.observaciones || 'Sin observaciones adicionales.' }}</p>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <lucide-icon [img]="userIcon" [size]="14"></lucide-icon>
          <span>Cliente: {{ item().request.client_name || 'Cliente sin nombre' }}</span>
        </div>
        <div class="meta-item" *ngIf="item().request.client_phone">
          <lucide-icon [img]="phoneIcon" [size]="14"></lucide-icon>
          <span>Telefono: {{ item().request.client_phone }}</span>
        </div>
        <div class="meta-item">
          <lucide-icon [img]="carIcon" [size]="14"></lucide-icon>
          <span>Vehiculo: {{ item().request.vehicle_label || 'Vehiculo sin detalle' }}</span>
        </div>
        <div class="meta-item">
          <lucide-icon [img]="buildingIcon" [size]="14"></lucide-icon>
          <span>Taller: {{ item().workshop_name || 'Taller compatible' }}</span>
        </div>
        <div class="meta-item">
          <lucide-icon [img]="buildingIcon" [size]="14"></lucide-icon>
          <span>Sucursal: {{ item().branch_name || 'Sucursal operativa' }}</span>
        </div>
        <div class="meta-item">
          <lucide-icon [img]="clockIcon" [size]="14"></lucide-icon>
          <span>Vence: {{ formatDate(item().request.fecha_vencimiento) }}</span>
        </div>
      </div>

      <div class="chips-row">
        <span class="chip-soft">Prioridad {{ item().request.prioridad }}</span>
        <span class="chip-soft">{{ item().request.estado.replaceAll('_', ' ') }}</span>
        <span class="chip-soft">{{ item().request.compatible_workshops.length }} talleres compatibles</span>
      </div>

      @if (item().request.compatible_workshops.length > 0) {
        <div class="compatible-list">
          @for (workshop of item().request.compatible_workshops.slice(0, 3); track workshop.id_sucursal_representante) {
            <span class="compatible-chip">
              {{ workshop.workshop_name || 'Taller' }} - {{ workshop.branch_name || 'Sucursal' }}
            </span>
          }
        </div>
      }

      <div class="actions">
        <button mat-stroked-button color="primary" (click)="viewDetail.emit(item().id_solicitud_cotizacion)">
          <lucide-icon [img]="detailIcon" [size]="16"></lucide-icon>
          Detalle
        </button>
        <button
          mat-flat-button
          color="primary"
          [disabled]="!canReply()"
          (click)="reply.emit(item())"
        >
          <lucide-icon [img]="replyIcon" [size]="16"></lucide-icon>
          Responder
        </button>
        <button
          mat-stroked-button
          color="warn"
          [disabled]="!canReply()"
          (click)="reject.emit(item())"
        >
          <lucide-icon [img]="rejectIcon" [size]="16"></lucide-icon>
          Rechazar
        </button>
      </div>
    </mat-card>
  `,
  styles: [`
    .quotation-card {
      background:
        linear-gradient(180deg, rgba(14, 17, 24, 0.95), rgba(9, 12, 19, 0.98));
      border: 1px solid rgba(255, 149, 32, 0.12);
      color: var(--sm-color-text-main, #e2e8f0);
      border-radius: 22px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.03),
        0 18px 38px rgba(0, 0, 0, 0.2);
    }

    .quotation-card.selected {
      border-color: rgba(255, 153, 41, 0.45);
      box-shadow:
        0 0 0 1px rgba(255, 153, 41, 0.12),
        0 18px 38px rgba(0, 0, 0, 0.26);
    }

    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.3rem 0.65rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      border: 1px solid transparent;
      text-transform: uppercase;
    }

    .status-chip.pendiente { background: rgba(255, 214, 102, 0.09); color: #ffd977; border-color: rgba(255, 214, 102, 0.16); }
    .status-chip.enviada { background: rgba(245, 158, 11, 0.14); color: #ffb74d; border-color: rgba(245, 158, 11, 0.24); }
    .status-chip.rechazada { background: rgba(239, 68, 68, 0.12); color: #f87171; border-color: rgba(239, 68, 68, 0.25); }
    .status-chip.aceptada { background: rgba(34, 197, 94, 0.12); color: #4ade80; border-color: rgba(34, 197, 94, 0.25); }

    .date-label { color: var(--sm-color-text-muted, #94a3b8); font-size: 0.78rem; }

    .card-title h3 { margin: 0; font-size: 1rem; color: #ffffff; line-height: 1.4; }
    .card-title p { margin: 0.25rem 0 0; color: var(--sm-color-text-soft, #94a3b8); font-size: 0.86rem; line-height: 1.45; }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.55rem 0.85rem;
    }

    .meta-item {
      display: flex;
      align-items: flex-start;
      gap: 0.45rem;
      font-size: 0.8rem;
      color: var(--sm-color-text-soft, #cbd5e1);
      min-width: 0;
      padding: 0.7rem 0.8rem;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .chips-row, .compatible-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .chip-soft, .compatible-chip {
      padding: 0.34rem 0.65rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 600;
      border: 1px solid rgba(255, 149, 32, 0.1);
      background: rgba(255, 255, 255, 0.03);
      color: var(--sm-color-text-soft, #cbd5e1);
    }

    .actions {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.55rem;
      margin-top: 0.15rem;
    }

    .actions button {
      width: 100%;
      justify-content: center;
    }

    .actions lucide-icon {
      margin-right: 0.35rem;
    }

    @media (max-width: 720px) {
      .quotation-card {
        padding: 0.95rem;
        border-radius: 20px;
      }

      .meta-grid,
      .actions {
        grid-template-columns: 1fr;
      }

      .actions button {
        min-height: 42px;
      }
    }
  `]
})
export class QuotationInboxCardComponent {
  readonly item = input.required<QuotationWorkshopInboxItemResponse>();
  readonly selected = input(false);

  readonly viewDetail = output<string>();
  readonly reply = output<QuotationWorkshopInboxItemResponse>();
  readonly reject = output<QuotationWorkshopInboxItemResponse>();

  protected readonly badgeIcon = BadgeCheck;
  protected readonly replyIcon = MessageSquare;
  protected readonly rejectIcon = Ban;
  protected readonly detailIcon = FileText;
  protected readonly carIcon = Car;
  protected readonly buildingIcon = Building2;
  protected readonly clockIcon = Clock3;
  protected readonly userIcon = User;
  protected readonly phoneIcon = Phone;

  stateLabel(): string {
    const state = this.item().estado_envio.toUpperCase();
    switch (state) {
      case 'ENVIADA':
        return 'PENDIENTE';
      case 'RESPONDIDA':
        return 'RESPONDIDA';
      case 'CANCELADA':
        return 'CANCELADA';
      case 'RECHAZADA':
        return 'RECHAZADA';
      default:
        return state;
    }
  }

  stateClass(): string {
    const state = this.item().estado_envio.toUpperCase();
    if (state.includes('RECHAZ') || state.includes('CANCEL')) return 'rechazada';
    if (state.includes('ACEPT') || state.includes('RESPOND')) return 'aceptada';
    if (state.includes('ENVI')) return 'enviada';
    return 'pendiente';
  }

  canReply(): boolean {
    return this.item().estado_envio.toUpperCase() === 'ENVIADA';
  }

  formatDate(value: string): string {
    if (!value) return 'Sin fecha';
    return new Intl.DateTimeFormat('es-BO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }
}
