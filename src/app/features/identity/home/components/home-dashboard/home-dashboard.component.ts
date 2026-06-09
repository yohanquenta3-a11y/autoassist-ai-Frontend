import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeAlert, HomeKpi, HomeQuickAction } from '../../models/home-dashboard.model';
import { IncidentDetailResponse } from '@core/models/emergencies.model';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-home-dashboard',
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-dashboard.component.html',
  styleUrl: './home-dashboard.component.scss',
})
export class HomeDashboardComponent {
  title = input('Centro de Operaciones AutoAssist AI');
  subtitle = input('Vision integral del estado de la plataforma en tiempo real.');
  personaLabel = input('');
  personaSummary = input('');
  statusTitle = input('Operacion estable');
  statusSummary = input('Vista general lista para seguimiento');
  kpis = input<HomeKpi[]>([]);
  highlights = input<string[]>([]);
  alerts = input<HomeAlert[]>([]);
  quickActions = input<HomeQuickAction[]>([]);
  incidents = input<IncidentDetailResponse[]>([]);
  isSyncing = input<boolean>(false);

  quickActionSelected = output<HomeQuickAction>();

  selectQuickAction(action: HomeQuickAction): void {
    this.quickActionSelected.emit(action);
  }
}
