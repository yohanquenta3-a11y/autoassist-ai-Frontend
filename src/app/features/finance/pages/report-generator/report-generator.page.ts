import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '@env/environment';
import { AuthStore } from '@features/identity/auth/state/auth.store';
import { FinanceService } from '../../data-access/finance.service';
import { MonitoringService } from '@features/monitoring/data-access/monitoring.service';
import { ReportService } from '@features/monitoring/data-access/report.service';
import { WorkshopsService } from '@features/workshops/data-access/workshops.service';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { format } from 'date-fns';
import { lastValueFrom } from 'rxjs';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Download,
  FileBarChart,
  FileText,
  History,
  Mic,
  MicOff,
  Send,
  ShieldCheck,
  Wrench,
  LucideAngularModule
} from 'lucide-angular';
import { PageHeaderComponent } from '@shared/ui';
import { AuditLog } from '@features/monitoring/models/monitoring.model';
import { SpeechRecognitionService } from './services/speech-recognition.service';

@Component({
  selector: 'app-report-generator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    LucideAngularModule,
    PageHeaderComponent
  ],
  template: `
    <div class="page-container">
      <app-page-header title="Generador de Reportes" subtitle="Resumen, exportaciÃ³n y asistente IA." [icon]="historyIcon"></app-page-header>

      <div class="header-actions">
        <button mat-stroked-button type="button"><lucide-icon [img]="historyIcon" [size]="16"></lucide-icon> Historial</button>
        <button mat-stroked-button type="button"><lucide-icon [img]="calendarIcon" [size]="16"></lucide-icon> Programados</button>
        <button mat-stroked-button type="button"><lucide-icon [img]="alertIcon" [size]="16"></lucide-icon> Ayuda</button>
      </div>

      <div class="generator-layout">
        <aside>
          <mat-card class="sm-glass-card config-card">
            <div class="card-section">
              <label><lucide-icon [img]="fileIcon" [size]="14"></lucide-icon> Tipo de Reporte</label>
              <mat-form-field appearance="outline" class="full-width">
                <mat-select [ngModel]="selectedType()" (ngModelChange)="selectedType.set($event); onTypeChange()">
                  <mat-option value="operativo">Auxilios MecÃ¡nicos (Operativo)</mat-option>
                  <mat-option value="financiero">LiquidaciÃ³n de Comisiones (Financiero)</mat-option>
                  @if (isSuperAdmin()) { <mat-option value="auditoria">BitÃ¡cora de AuditorÃ­a (Seguridad)</mat-option> }
                </mat-select>
              </mat-form-field>
            </div>

            <div class="card-section">
              <label><lucide-icon [img]="calendarIcon" [size]="14"></lucide-icon> Rango de Fechas</label>
              <form [formGroup]="range" class="full-width">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-date-range-input [rangePicker]="picker">
                    <input matStartDate formControlName="start" placeholder="Desde">
                    <input matEndDate formControlName="end" placeholder="Hasta">
                  </mat-date-range-input>
                  <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                  <mat-date-range-picker #picker></mat-date-range-picker>
                </mat-form-field>
              </form>
            </div>

            @if (isSuperAdmin() && selectedType() !== 'auditoria') {
              <div class="card-section">
                <label><lucide-icon [img]="wrenchIcon" [size]="14"></lucide-icon> Filtro por Taller</label>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-select [ngModel]="selectedWorkshop()" (ngModelChange)="selectedWorkshop.set($event)">
                    <mat-option [value]="null">Todos los talleres</mat-option>
                    @for (w of workshopsQuery.data(); track w.id_taller) { <mat-option [value]="w.id_taller">{{ w.nombre }}</mat-option> }
                  </mat-select>
                </mat-form-field>
              </div>
            }

            <div class="card-section">
              <label><lucide-icon [img]="checkIcon" [size]="14"></lucide-icon> Opciones</label>
              <div class="option-list">
                <label><input type="checkbox" [checked]="includeExecutiveSummary()" (change)="includeExecutiveSummary.set($any($event.target).checked)"> Incluir resumen ejecutivo</label>
                <label><input type="checkbox" [checked]="includeCharts()" (change)="includeCharts.set($any($event.target).checked)"> Incluir grÃ¡ficos</label>
                <label><input type="checkbox" [checked]="exportDetailed()" (change)="exportDetailed.set($any($event.target).checked)"> ExportaciÃ³n detallada</label>
                <label><input type="checkbox" [checked]="consolidatedOnly()" (change)="consolidatedOnly.set($any($event.target).checked)"> Solo datos consolidados</label>
              </div>
            </div>

            <div class="export-actions">
              <button mat-flat-button color="primary" class="export-btn pdf" [disabled]="range.invalid || isGenerating()" (click)="export('PDF')">
                @if (isGenerating()) { <mat-spinner diameter="20"></mat-spinner> } @else { <lucide-icon [img]="downloadIcon" [size]="16"></lucide-icon> Exportar PDF }
              </button>
              <button mat-stroked-button class="export-btn excel" [disabled]="range.invalid || isGenerating()" (click)="export('EXCEL')"><lucide-icon [img]="barChartIcon" [size]="16"></lucide-icon> Exportar Excel</button>
              <button mat-stroked-button class="export-btn html" [disabled]="range.invalid || isGenerating()" (click)="export('HTML')"><lucide-icon [img]="fileIcon" [size]="16"></lucide-icon> Exportar HTML</button>
            </div>
          </mat-card>
        </aside>

        <main>
          <mat-card class="sm-glass-card preview-card">
            <div class="panel-head">
              <div><p class="eyebrow">Vista previa</p><h2>{{ previewTitle() }}</h2></div>
              <p class="panel-subtitle">Datos estimados segÃºn filtros actuales.</p>
            </div>

            <div class="metric-grid">
              @for (metric of getPreviewMetrics(); track metric.label) {
                <div class="metric-card">
                  <span class="metric-label">{{ metric.label }}</span>
                  <strong>{{ metric.value }}</strong>
                  <span class="metric-note">{{ metric.note }}</span>
                </div>
              }
            </div>

            <div class="detail-grid">
              @for (item of getPreviewDetails(); track item.label) {
                <div class="detail-item"><span>{{ item.label }}</span><strong>{{ item.value }}</strong></div>
              }
            </div>

            <div class="data-preview"><span>Columnas: {{ getPreviewColumns().join(', ') }}</span></div>
          </mat-card>
        </main>

        <aside>
          <mat-card class="sm-glass-card voice-ai-card">
            <div class="voice-header"><div><h3><lucide-icon [img]="micIcon" [size]="16"></lucide-icon> Reporte IA</h3><p>Dicta o escribe la solicitud y genera el reporte IA.</p></div></div>

            <div class="quick-prompts">
              @for (prompt of quickPrompts; track prompt) { <button mat-stroked-button type="button" class="prompt-chip" (click)="applyQuickPrompt(prompt)">{{ prompt }}</button> }
            </div>

            <textarea class="voice-textarea" [value]="voicePrompt()" (input)="voicePrompt.set($any($event.target).value)" placeholder="Ej: Genera un reporte financiero de pagos completados este mes por taller"></textarea>

            <div class="voice-actions">
              <button mat-stroked-button type="button" [disabled]="isSendingAi() || isListening()" (click)="dictateAiReport()">
                @if (isListening()) { <lucide-icon [img]="micOffIcon" [size]="16"></lucide-icon> Escuchando... } @else { <lucide-icon [img]="micIcon" [size]="16"></lucide-icon> Dictar }
              </button>
              @if (isListening()) { <button mat-stroked-button type="button" color="warn" (click)="stopDictation()">Detener</button> }
              <button mat-flat-button color="primary" type="button" [disabled]="isSendingAi() || !voicePrompt().trim()" (click)="sendTranscriptToWebhook(voicePrompt())"><lucide-icon [img]="sendIcon" [size]="16"></lucide-icon> Generar</button>
            </div>

            @if (voiceError()) { <div class="voice-error">{{ voiceError() }}</div> }
            @if (voicePrompt()) { <div class="voice-preview"><strong>Texto detectado:</strong><span>{{ voicePrompt() }}</span></div> }
          </mat-card>
        </aside>
      </div>

      <section class="history-section">
        <div class="section-head"><p class="eyebrow">Historial reciente</p><h3>Ãšltimos reportes generados</h3></div>
        <div class="history-table-wrap">
          <table class="history-table">
            <thead><tr><th>Reporte</th><th>Tipo</th><th>Formato</th><th>Estado</th><th>Fecha</th></tr></thead>
            <tbody>
              @for (item of getRecentReports(); track item.name) {
                <tr>
                  <td>{{ item.name }}</td>
                  <td>{{ item.type }}</td>
                  <td><span class="badge" [class.pdf]="item.format === 'PDF'" [class.excel]="item.format === 'EXCEL'" [class.html]="item.format === 'HTML'">{{ item.format }}</span></td>
                  <td><span class="status-badge">{{ item.status }}</span></td>
                  <td>{{ item.date }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .page-container { padding: 2rem; max-width: 1500px; margin: 0 auto; }
    .header-actions { display: flex; gap: .75rem; flex-wrap: wrap; margin: 1rem 0 1.5rem; }
    .header-actions button { border-radius: 999px; display: inline-flex; align-items: center; gap: .5rem; }
    .generator-layout { display: grid; grid-template-columns: 360px minmax(0, 1fr) 360px; gap: 1.5rem; align-items: start; }
    .config-card, .preview-card, .voice-ai-card { padding: 1.5rem; }
    .card-section { margin-bottom: 1rem; }
    .card-section label, .voice-header h3 { display: flex; align-items: center; gap: .5rem; color: white; font-weight: 800; }
    .card-section label { font-size: .75rem; text-transform: uppercase; color: var(--sm-color-text-muted); margin-bottom: .75rem; }
    .full-width { width: 100%; }
    .option-list, .quick-prompts { display: grid; gap: .55rem; }
    .option-list label { display: flex; align-items: center; gap: .55rem; color: var(--sm-color-text-soft); font-size: .85rem; }
    .export-actions { display: grid; gap: .75rem; margin-top: 1rem; }
    .export-btn { height: 48px; border-radius: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: .75rem; }
    .export-btn.excel { color: #2ecc71; border-color: rgba(46, 204, 113, .3); }
    .export-btn.html { color: #38bdf8; border-color: rgba(56, 189, 248, .25); }
    .panel-head { display: flex; justify-content: space-between; align-items: end; gap: 1rem; margin-bottom: 1rem; }
    .eyebrow { margin: 0; color: var(--sm-color-sapphire-300); font-size: .72rem; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
    .panel-subtitle { margin: 0; color: var(--sm-color-text-muted); font-size: .82rem; }
    .metric-grid, .detail-grid { display: grid; gap: .75rem; }
    .metric-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 1rem; }
    .detail-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); margin-bottom: 1rem; }
    .metric-card, .detail-item { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.06); border-radius: 14px; padding: .9rem; }
    .metric-label, .detail-item span { display: block; color: var(--sm-color-text-muted); font-size: .7rem; text-transform: uppercase; letter-spacing: .05em; margin-bottom: .35rem; }
    .metric-card strong, .detail-item strong { color: white; font-size: 1.05rem; }
    .metric-note { display: block; margin-top: .25rem; color: var(--sm-color-text-soft); font-size: .78rem; }
    .data-preview { background: rgba(255,255,255,.03); padding: 1rem; border-radius: 8px; border-left: 3px solid var(--sm-color-sapphire-400); }
    .data-preview span { font-size: .75rem; color: var(--sm-color-text-muted); font-family: monospace; }
    .voice-textarea { width: 100%; min-height: 110px; resize: vertical; border-radius: 12px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04); color: white; padding: .85rem; outline: none; }
    .voice-actions { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 1rem; }
    .voice-actions button, .prompt-chip { border-radius: 12px; font-weight: 700; }
    .voice-error { margin-top: 1rem; padding: .75rem; border-radius: 10px; background: rgba(239,68,68,.12); color: #fca5a5; font-size: .8rem; }
    .voice-preview { margin-top: 1rem; padding: .75rem; border-radius: 10px; background: rgba(255,255,255,.04); color: var(--sm-color-text-soft); font-size: .8rem; display: flex; flex-direction: column; gap: .35rem; }
    .preview-card { min-height: 430px; }
    .history-section { margin-top: 1.5rem; background: rgba(255,255,255,.02); border: 1px solid rgba(255,255,255,.06); border-radius: 20px; padding: 1.25rem; }
    .history-table-wrap { overflow-x: auto; }
    .history-table { width: 100%; border-collapse: collapse; min-width: 760px; }
    .history-table th, .history-table td { padding: .85rem .9rem; border-bottom: 1px solid rgba(255,255,255,.08); text-align: left; font-size: .85rem; }
    .history-table th { color: var(--sm-color-text-muted); text-transform: uppercase; font-size: .68rem; letter-spacing: .08em; }
    .history-table td { color: white; }
    .badge, .status-badge { display: inline-flex; align-items: center; padding: .22rem .55rem; border-radius: 999px; font-size: .68rem; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
    .badge.pdf { background: rgba(248,113,113,.15); color: #fca5a5; } .badge.excel { background: rgba(34,197,94,.15); color: #86efac; } .badge.html { background: rgba(56,189,248,.15); color: #7dd3fc; }
    .status-badge { background: rgba(34,197,94,.12); color: #86efac; }
    @media (max-width: 1200px) { .generator-layout { grid-template-columns: 1fr; } }
  `]
})
export class ReportGeneratorPage {
  private financeService = inject(FinanceService);
  private monitoringService = inject(MonitoringService);
  private reportService = inject(ReportService);
  private workshopsService = inject(WorkshopsService);
  private authStore = inject(AuthStore);
  private snackBar = inject(MatSnackBar);
  private speechRecognitionService = inject(SpeechRecognitionService);

  protected readonly downloadIcon = Download;
  protected readonly barChartIcon = FileBarChart;
  protected readonly calendarIcon = Calendar;
  protected readonly fileIcon = FileText;
  protected readonly shieldIcon = ShieldCheck;
  protected readonly wrenchIcon = Wrench;
  protected readonly historyIcon = History;
  protected readonly checkIcon = CheckCircle2;
  protected readonly alertIcon = AlertTriangle;
  protected readonly micIcon = Mic;
  protected readonly micOffIcon = MicOff;
  protected readonly sendIcon = Send;

  isGenerating = signal(false);
  isSendingAi = signal(false);
  selectedType = signal('operativo');
  selectedWorkshop = signal<string | null>(null);
  includeExecutiveSummary = signal(true);
  includeCharts = signal(true);
  exportDetailed = signal(true);
  consolidatedOnly = signal(false);
  voicePrompt = signal('');
  isListening = signal(false);
  voiceError = signal('');
  quickPrompts = ['Genera un reporte financiero por taller', 'Reporte operativo del mes actual', 'AuditorÃ­a de accesos y cambios crÃ­ticos'];

  range = new FormGroup({
    start: new FormControl<Date | null>(null, [Validators.required]),
    end: new FormControl<Date | null>(null, [Validators.required]),
  });

  isSuperAdmin = computed(() => this.authStore.user()?.rol_nombre === 'superadmin');
  workshopsQuery = injectQuery(() => ({ queryKey: ['report-workshops'], queryFn: () => lastValueFrom(this.workshopsService.getAllWorkshops()), enabled: this.isSuperAdmin() }));

  onTypeChange() {}
  applyQuickPrompt(prompt: string): void { this.voicePrompt.set(prompt); }
  previewTitle(): string { return this.selectedType() === 'financiero' ? 'Reporte Financiero' : this.selectedType() === 'auditoria' ? 'Reporte de AuditorÃ­a' : 'Reporte Operativo'; }

  getPreviewColumns(): string[] { return this.selectedType() === 'financiero' ? ['Fecha', 'Incidente', 'Estado', 'Total', 'ComisiÃ³n', 'Neto'] : this.selectedType() === 'auditoria' ? ['Fecha', 'Usuario', 'AcciÃ³n', 'DescripciÃ³n', 'IP'] : ['Fecha', 'ID', 'Estado', 'Prioridad', 'Resumen IA', 'TelÃ©fono']; }
  getPreviewMetrics() { return this.selectedType() === 'financiero' ? [{ label: 'Recaudado', value: 'Bs 12,480', note: 'Global' }, { label: 'ComisiÃ³n', value: 'Bs 1,248', note: '10% estimado' }, { label: 'Neto', value: 'Bs 11,232', note: 'Transferible' }] : this.selectedType() === 'auditoria' ? [{ label: 'Eventos', value: '34', note: '24h' }, { label: 'Alertas', value: '6', note: 'CrÃ­ticas' }, { label: 'Cumplimiento', value: '99.8%', note: 'Global' }] : [{ label: 'Auxilios', value: '18', note: 'En curso' }, { label: 'Tiempo medio', value: '18 min', note: 'Respuesta' }, { label: 'Talleres activos', value: '9', note: this.selectedWorkshop() ? 'Con taller' : 'Global' }]; }
  getPreviewDetails() { const dr = this.range.value.start && this.range.value.end ? `${format(this.range.value.start, 'dd/MM/yyyy')} - ${format(this.range.value.end, 'dd/MM/yyyy')}` : 'Sin rango'; return [{ label: 'Taller', value: this.selectedWorkshop() ? 'Filtrado' : 'Todos' }, { label: 'Periodo', value: dr }, { label: 'Detalle', value: this.exportDetailed() ? 'Completo' : 'Consolidado' }, { label: 'GrÃ¡ficos', value: this.includeCharts() ? 'SÃ­' : 'No' }]; }
  getRecentReports() { return [{ name: 'Reporte Operativo', type: 'Operativo', format: 'PDF' as const, status: 'Completado', date: 'Hoy 10:40' }, { name: 'LiquidaciÃ³n', type: 'Financiero', format: 'EXCEL' as const, status: 'Completado', date: 'Ayer 17:20' }, { name: 'AuditorÃ­a', type: 'Seguridad', format: 'HTML' as const, status: 'Completado', date: '12 Jun 2026' }]; }

  async export(formatType: 'PDF' | 'EXCEL' | 'HTML') {
    const { start, end } = this.range.value;
    if (!start || !end) return;
    this.isGenerating.set(true);
    try {
      let tableRows: unknown[][] = [];
      let excelData: Record<string, unknown>[] = [];
      let columns: string[] = [];
      const filename = `Reporte_${this.selectedType()}`;

      if (this.selectedType() === 'financiero') {
        const raw = await lastValueFrom(this.financeService.getPayments(this.selectedWorkshop() ?? undefined));
        const filtered = raw.filter(p => { const d = new Date(p.fecha_pago || new Date()); return d >= start && d <= end; });
        columns = ['FECHA', 'ID_INCIDENTE', 'ESTADO', 'MONTO TOTAL', 'COMISIÃ“N (10%)', 'NETO'];
        tableRows = filtered.map(p => [format(new Date(p.fecha_pago || new Date()), 'dd/MM/yyyy HH:mm'), p.id_incidente.substring(0, 8), p.estado_pago, `${Number(p.monto).toFixed(2)} Bs`, `${Number(p.monto_comision).toFixed(2)} Bs`, `${(Number(p.monto) - Number(p.monto_comision)).toFixed(2)} Bs`]);
        excelData = filtered.map(p => ({ Fecha: format(new Date(p.fecha_pago || new Date()), 'dd/MM/yyyy HH:mm'), Incidente: p.id_incidente, Estado: p.estado_pago, Total: Number(p.monto), Comision: Number(p.monto_comision), Neto: Number(p.monto) - Number(p.monto_comision) }));
      } else if (this.selectedType() === 'operativo') {
        const raw = await lastValueFrom(this.workshopsService.getAssignments());
        const filtered = raw.filter(i => { const d = new Date(i.fecha_reporte || new Date()); return d >= start && d <= end; });
        columns = ['FECHA', 'ID', 'ESTADO', 'PRIORIDAD', 'RESUMEN IA', 'TELÃ‰FONO'];
        tableRows = filtered.map(i => [format(new Date(i.fecha_reporte || new Date()), 'dd/MM/yyyy HH:mm'), i.id_incidente.substring(0, 8), i.estado_incidente, i.prioridad_incidente, i.resumen_ia, i.telefono]);
        excelData = filtered.map(i => ({ Fecha: format(new Date(i.fecha_reporte || new Date()), 'dd/MM/yyyy HH:mm'), ID: i.id_incidente, Estado: i.estado_incidente, Prioridad: i.prioridad_incidente, Resumen: i.resumen_ia, Telefono: i.telefono }));
      } else {
        const raw = await lastValueFrom(this.monitoringService.getAuditLogs());
        const filtered = raw.items.filter((l: AuditLog) => { const d = new Date(l.fecha_hora); return d >= start && d <= end; });
        columns = ['FECHA', 'USUARIO', 'ACCIÃ“N', 'DESCRIPCIÃ“N', 'IP'];
        tableRows = filtered.map((l: AuditLog) => [format(new Date(l.fecha_hora || new Date()), 'dd/MM/yyyy HH:mm'), l.nombre_usuario || 'Desconocido', l.accion, l.descripcion || '-', l.ip]);
        excelData = filtered.map((l: AuditLog) => ({ Fecha: format(new Date(l.fecha_hora || new Date()), 'dd/MM/yyyy HH:mm'), Usuario: l.nombre_usuario || 'Desconocido', Accion: l.accion, Descripcion: l.descripcion || '-', IP: l.ip }));
      }

      if (tableRows.length === 0) { this.snackBar.open('No hay datos para el periodo seleccionado', 'Cerrar', { duration: 3000 }); return; }
      if (formatType === 'PDF') this.reportService.exportToPDF(`Reporte ${this.selectedType()} - Smart Mechanic`, columns, tableRows, filename);
      else if (formatType === 'EXCEL') this.reportService.exportToExcel(excelData, filename);
      else this.reportService.exportToHTML(`Reporte ${this.selectedType()} - Smart Mechanic`, columns, tableRows, filename);
      this.snackBar.open('âœ… Reporte generado con Ã©xito', 'Cerrar', { duration: 3000 });
    } catch (error) {
      console.error('Error:', error);
      this.snackBar.open('OcurriÃ³ un error al generar el reporte', 'Cerrar', { duration: 5000 });
    } finally { this.isGenerating.set(false); }
  }

  async dictateAiReport(): Promise<void> {
    this.voiceError.set('');
    if (!this.speechRecognitionService.isSupported()) { this.voiceError.set('Tu navegador no soporta reconocimiento de voz. Prueba con Chrome o Edge.'); return; }
    if (this.isListening()) { this.voiceError.set('Ya se estÃ¡ escuchando audio.'); return; }
    try { this.isListening.set(true); this.voicePrompt.set(await this.speechRecognitionService.listenOnce()); } catch (error) { this.voiceError.set(String(error)); } finally { this.isListening.set(false); }
  }
  stopDictation(): void { this.speechRecognitionService.stop(); this.isListening.set(false); }

  async sendTranscriptToWebhook(transcriptText: string): Promise<void> {
    const cleanText = transcriptText.trim();
    if (!cleanText) { this.voiceError.set('Primero dicta o escribe una solicitud de reporte.'); return; }
    this.voiceError.set(''); this.isSendingAi.set(true);
    try {
      const user = this.authStore.user();
      const requestBody: Record<string, unknown> = {
        action: 'sendMessage',
        sessionId: `session${user?.id_usuario ?? 'anon'}49c3832dfefe4505b87442`,
        chatInput: cleanText,
        id_usuario: user?.id_usuario ?? null,
        id_rol: (user as { id_rol?: string | null } | null)?.id_rol ?? null,
        nombre: user?.nombre ?? '',
        correo: user?.correo ?? '',
        email: user?.correo ?? '',
        telefono: (user as { telefono?: string | null } | null)?.telefono ?? '',
        rol: user?.rol_nombre ?? (user as { rol?: string | null } | null)?.rol ?? '',
        id_taller: user?.id_taller ?? null,
        id_sucursal: user?.id_sucursal ?? null,
        executionMode: 'production'
      };

      const response = await fetch(environment.aiReportUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
      if (!response.ok) { const errorText = await response.text(); console.error('AI error response', { status: response.status, url: response.url, errorText: errorText.slice(0, 500) }); this.snackBar.open('Error del asistente IA.', 'Cerrar', { duration: 5000 }); return; }
      const { blob, filename } = await this.buildAiDownloadFromResponse(response);
      this.downloadFile(blob, filename);
    } catch (error) { console.error('Error IA Report:', error); this.snackBar.open('Error al conectar con el asistente de IA.', 'Cerrar', { duration: 5000 }); }
    finally { this.isSendingAi.set(false); }
  }

  private async buildAiDownloadFromResponse(response: Response): Promise<{ blob: Blob; filename: string }> {
    const disposition = response.headers.get('content-disposition');
    const contentTypeHeader = response.headers.get('content-type') || '';
    const contentType = contentTypeHeader.toLowerCase().split(';')[0].trim();
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    console.log('AI URL', environment.aiReportUrl);
    console.log('AI headers', contentType, disposition, response.status, response.url);
    console.log('AI first text', text.slice(0, 200));
    console.log('AI first bytes', Array.from(bytes.slice(0, 12)));
    const type = this.getExtensionFromContentType(contentType, bytes, text);
    const filename = this.resolveAiFilename(this.extractFilenameFromContentDisposition(disposition), type);
    const blob = new Blob([buffer], { type: this.resolveAiMimeType(type) });
    return { blob, filename };
  }

  private extractFilenameFromContentDisposition(contentDisposition: string | null): string | null {
    if (!contentDisposition) return null;
    const utf8Match = contentDisposition.match(/filename\*\s*=\s*([^']*)''([^;]+)/i);
    if (utf8Match?.[2]) { try { return decodeURIComponent(utf8Match[2].trim().replace(/^"|"$/g, '')); } catch { return utf8Match[2].trim().replace(/^"|"$/g, ''); } }
    const filenameMatch = contentDisposition.match(/filename\s*=\s*([^;]+)/i);
    return filenameMatch?.[1]?.trim().replace(/^"|"$/g, '') ?? null;
  }

  private getExtensionFromContentType(contentType: string, bytes: Uint8Array, text: string): 'pdf' | 'html' | 'xlsx' | 'csv' | 'txt' {
    const normalized = text.toLowerCase().trim();
    if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'pdf';
    if (normalized.startsWith('<!doctype html') || normalized.startsWith('<html')) return 'html';
    if (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b) return 'xlsx';
    if (normalized.includes(',') && normalized.includes('\n')) return 'csv';
    if (contentType.includes('spreadsheetml') || contentType.includes('excel') || contentType.includes('sheet')) return 'xlsx';
    if (contentType.includes('csv')) return 'csv';
    if (contentType.includes('html')) return 'html';
    if (contentType.includes('pdf')) return 'pdf';
    if (contentType.includes('text/plain') || contentType.includes('plain')) return 'txt';
    if (contentType.includes('json')) return 'txt';
    return 'txt';
  }

  private resolveAiMimeType(type: 'pdf' | 'html' | 'xlsx' | 'csv' | 'txt'): string {
    switch (type) {
      case 'pdf': return 'application/pdf';
      case 'html': return 'text/html;charset=utf-8';
      case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'csv': return 'text/csv;charset=utf-8';
      default: return 'text/plain;charset=utf-8';
    }
  }

  private resolveAiFilename(filenameFromDisposition: string | null, extension: string): string {
    if (!filenameFromDisposition) return `Reporte_IA_${format(new Date(), 'yyyy-MM-dd_HHmm')}.${extension}`;
    if (/\.[a-z0-9]{2,8}$/i.test(filenameFromDisposition)) return filenameFromDisposition;
    return `${filenameFromDisposition}.${extension}`;
  }

  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}
