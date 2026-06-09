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

type ReportFormat = 'PDF' | 'EXCEL' | 'HTML';
type AiFileType = 'pdf' | 'html' | 'xlsx' | 'csv' | 'txt';

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
    <div class="reports-shell">
      <section class="reports-hero">
        <div class="hero-left">
          <div class="hero-icon">
            <lucide-icon [img]="fileIcon" [size]="22"></lucide-icon>
          </div>
          <div>
            <h1>Generador de Reportes</h1>
            <p>Resumen, exportación y asistente IA.</p>
          </div>
        </div>

        <div class="hero-actions">
          <button mat-stroked-button type="button" class="hero-btn">
            <lucide-icon [img]="historyIcon" [size]="15"></lucide-icon>
            Historial
          </button>
          <button mat-stroked-button type="button" class="hero-btn">
            <lucide-icon [img]="calendarIcon" [size]="15"></lucide-icon>
            Programados
          </button>
          <button mat-stroked-button type="button" class="hero-btn">
            <lucide-icon [img]="alertIcon" [size]="15"></lucide-icon>
            Ayuda
          </button>
        </div>
      </section>

      <div class="reports-grid">
        <mat-card class="report-card config-card">
          <div class="card-title">
            <lucide-icon [img]="wrenchIcon" [size]="16"></lucide-icon>
            <span>Configuración</span>
          </div>

          <div class="field-block">
            <label>
              <lucide-icon [img]="fileIcon" [size]="13"></lucide-icon>
              Tipo de reporte
            </label>
            <mat-form-field appearance="outline" class="full-width compact-field">
              <mat-select [ngModel]="selectedType()" (ngModelChange)="selectedType.set($event); onTypeChange()">
                <mat-option value="operativo">Auxilios Mecánicos (Operativo)</mat-option>
                <mat-option value="financiero">Liquidación de Comisiones (Financiero)</mat-option>
                @if (isSuperAdmin()) {
                  <mat-option value="auditoria">Bitácora de Auditoría (Seguridad)</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

          <div class="field-block">
            <label>
              <lucide-icon [img]="calendarIcon" [size]="13"></lucide-icon>
              Rango de fechas
            </label>
            <form [formGroup]="range" class="full-width">
              <mat-form-field appearance="outline" class="full-width compact-field">
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
            <div class="field-block">
              <label>
                <lucide-icon [img]="wrenchIcon" [size]="13"></lucide-icon>
                Filtro por taller
              </label>
              <mat-form-field appearance="outline" class="full-width compact-field">
                <mat-select [ngModel]="selectedWorkshop()" (ngModelChange)="selectedWorkshop.set($event)">
                  <mat-option [value]="null">Todos los talleres</mat-option>
                  @for (w of (workshopsQuery.data() ?? []); track w.id_taller) {
                    <mat-option [value]="w.id_taller">{{ w.nombre }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
          }

          <div class="export-format-block">
            <p>Exportar como</p>
            <div class="format-grid">
              <button type="button" class="format-option" [class.active]="selectedExportFormat() === 'PDF'" (click)="setExportFormat('PDF')">
                <lucide-icon [img]="fileIcon" [size]="17"></lucide-icon>
                <span>PDF</span>
              </button>
              <button type="button" class="format-option" [class.active]="selectedExportFormat() === 'EXCEL'" (click)="setExportFormat('EXCEL')">
                <lucide-icon [img]="barChartIcon" [size]="17"></lucide-icon>
                <span>Excel</span>
              </button>
              <button type="button" class="format-option" [class.active]="selectedExportFormat() === 'HTML'" (click)="setExportFormat('HTML')">
                <lucide-icon [img]="fileIcon" [size]="17"></lucide-icon>
                <span>HTML</span>
              </button>
            </div>
          </div>

          <button mat-flat-button type="button" class="main-export-btn" [disabled]="range.invalid || isGenerating()" (click)="export(selectedExportFormat())">
            @if (isGenerating()) {
              <mat-spinner diameter="18"></mat-spinner>
            } @else {
              <lucide-icon [img]="downloadIcon" [size]="16"></lucide-icon>
              Exportar {{ selectedExportFormatLabel() }}
            }
          </button>
        </mat-card>

        <mat-card class="report-card preview-card">
          <div class="preview-head">
            <div>
              <p class="eyebrow">Vista previa</p>
              <h2>{{ previewTitle() }}</h2>
            </div>
            <span>Datos estimados según filtros</span>
          </div>

          <div class="metric-grid">
            @for (metric of getPreviewMetrics(); track metric.label) {
              <div class="metric-card">
                <p>{{ metric.label }}</p>
                <strong>{{ metric.value }}</strong>
                <span>{{ metric.note }}</span>
              </div>
            }

            @for (item of getPreviewDetails(); track item.label) {
              <div class="metric-card">
                <p>{{ item.label }}</p>
                <strong>{{ item.value }}</strong>
                <span>{{ item.label === 'Periodo' ? 'Fechas' : 'Filtro actual' }}</span>
              </div>
            }
          </div>

          <div class="columns-preview">
            <span>Columnas:</span> {{ getPreviewColumns().join(', ') }}
          </div>
        </mat-card>

        <mat-card class="report-card voice-card">
          <div class="card-title">
            <lucide-icon [img]="shieldIcon" [size]="16"></lucide-icon>
            <span>Reporte IA</span>
          </div>

          <p class="voice-subtitle">Dicta o escribe la solicitud y genera el reporte con IA.</p>

          <div class="quick-prompts">
            @for (prompt of quickPrompts; track prompt) {
              <button mat-stroked-button type="button" class="prompt-chip" (click)="applyQuickPrompt(prompt)">
                {{ prompt }}
              </button>
            }
          </div>

          <textarea
            class="voice-textarea"
            [value]="voicePrompt()"
            (input)="voicePrompt.set($any($event.target).value)"
            placeholder="Ej: genera reporte de los últimos 10 incidentes en pdf"
          ></textarea>

          <div class="voice-actions">
            <button mat-stroked-button type="button" class="dictate-btn" [disabled]="isSendingAi() || isListening()" (click)="dictateAiReport()">
              @if (isListening()) {
                <lucide-icon [img]="micOffIcon" [size]="16"></lucide-icon>
                Escuchando...
              } @else {
                <lucide-icon [img]="micIcon" [size]="16"></lucide-icon>
                Dictar
              }
            </button>

            @if (isListening()) {
              <button mat-stroked-button type="button" color="warn" class="stop-btn" (click)="stopDictation()">Detener</button>
            }

            <button mat-flat-button type="button" class="ai-generate-btn" [disabled]="isSendingAi() || !voicePrompt().trim()" (click)="sendTranscriptToWebhook(voicePrompt())">
              @if (isSendingAi()) {
                <mat-spinner diameter="18"></mat-spinner>
              } @else {
                <lucide-icon [img]="sendIcon" [size]="16"></lucide-icon>
                Generar
              }
            </button>
          </div>

          @if (voiceError()) {
            <div class="voice-error">{{ voiceError() }}</div>
          }

          @if (voicePrompt()) {
            <div class="voice-preview">
              <strong>Texto detectado:</strong>
              <span>{{ voicePrompt() }}</span>
            </div>
          }
        </mat-card>
      </div>

      <section class="history-card">
        <div class="history-head">
          <p class="eyebrow">Historial reciente</p>
          <h3>Últimos reportes generados</h3>
        </div>

        <div class="history-table-wrap">
          <table class="history-table">
            <thead>
              <tr>
                <th>Reporte</th>
                <th>Tipo</th>
                <th>Formato</th>
                <th>Estado</th>
                <th class="right">Fecha</th>
              </tr>
            </thead>
            <tbody>
              @for (item of getRecentReports(); track item.name) {
                <tr>
                  <td class="report-name">{{ item.name }}</td>
                  <td>{{ item.type }}</td>
                  <td>
                    <span class="format-badge" [class.pdf]="item.format === 'PDF'" [class.excel]="item.format === 'EXCEL'" [class.html]="item.format === 'HTML'">
                      {{ item.format }}
                    </span>
                  </td>
                  <td>
                    <span class="status-badge"><i></i>{{ item.status }}</span>
                  </td>
                  <td class="right">{{ item.date }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100%;
      --report-primary: #009688;
      --report-primary-dark: #00897b;
      --report-primary-soft: #e3f7f5;
      --report-bg: #f4fbfa;
      --report-card: #ffffff;
      --report-border: rgba(0, 150, 136, .18);
      --report-border-strong: rgba(0, 150, 136, .32);
      --report-text: #102a2d;
      --report-muted: #607d8b;
      --report-soft: #f8fdfc;
    }

    .reports-shell {
      width: 100%;
      max-width: 1360px;
      margin: 0 auto;
      padding: 2rem;
      color: var(--report-text);
    }

    .reports-hero,
    .report-card,
    .history-card {
      background: var(--report-card);
      border: 1px solid var(--report-border);
      border-radius: 18px;
      box-shadow: 0 14px 32px rgba(6, 78, 73, .045);
    }

    .reports-hero {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.35rem 1.5rem;
      margin-bottom: 1.45rem;
    }

    .hero-left {
      display: flex;
      align-items: center;
      gap: .9rem;
    }

    .hero-icon {
      width: 48px;
      height: 48px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: var(--report-primary-soft);
      color: var(--report-primary);
    }

    .reports-hero h1 {
      margin: 0;
      font-size: 1.55rem;
      line-height: 1.15;
      font-weight: 900;
      letter-spacing: -.035em;
      color: var(--report-text);
    }

    .reports-hero p {
      margin: .2rem 0 0;
      font-size: .85rem;
      color: var(--report-muted);
    }

    .hero-actions {
      display: flex;
      align-items: center;
      gap: .6rem;
      flex-wrap: wrap;
    }

    .hero-btn {
      height: 36px;
      border-radius: 9px !important;
      border-color: var(--report-border) !important;
      background: #fff !important;
      color: var(--report-text) !important;
      font-weight: 700;
    }

    .hero-btn lucide-icon {
      color: var(--report-primary);
    }

    .reports-grid {
      display: grid;
      grid-template-columns: 320px minmax(0, 1fr) 420px;
      gap: 1.45rem;
      align-items: stretch;
    }

    .report-card {
      padding: 1.35rem;
      min-height: 420px;
    }

    .card-title {
      display: flex;
      align-items: center;
      gap: .55rem;
      font-size: .95rem;
      font-weight: 900;
      color: var(--report-text);
      margin-bottom: 1.25rem;
    }

    .card-title lucide-icon {
      color: var(--report-primary);
    }

    .field-block {
      margin-bottom: .95rem;
    }

    .field-block label,
    .export-format-block p {
      display: flex;
      align-items: center;
      gap: .45rem;
      margin: 0 0 .42rem;
      font-size: .69rem;
      font-weight: 900;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: var(--report-muted);
    }

    .full-width {
      width: 100%;
    }

    .compact-field ::ng-deep .mat-mdc-text-field-wrapper {
      height: 42px;
      background: var(--report-soft);
      border-radius: 9px;
    }

    .compact-field ::ng-deep .mat-mdc-form-field-flex {
      height: 42px;
      align-items: center;
    }

    .compact-field ::ng-deep .mat-mdc-form-field-infix {
      min-height: 42px;
      padding-top: 10px;
      padding-bottom: 8px;
    }

    .compact-field ::ng-deep .mdc-notched-outline__leading,
    .compact-field ::ng-deep .mdc-notched-outline__notch,
    .compact-field ::ng-deep .mdc-notched-outline__trailing {
      border-color: var(--report-border) !important;
    }

    .compact-field ::ng-deep .mat-mdc-select-value,
    .compact-field ::ng-deep input {
      color: var(--report-text) !important;
      font-size: .85rem;
    }

    .export-format-block {
      padding-top: .25rem;
      margin-bottom: .85rem;
    }

    .format-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: .55rem;
    }

    .format-option {
      border: 1px solid var(--report-border);
      background: var(--report-soft);
      color: var(--report-muted);
      border-radius: 9px;
      min-height: 58px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: .25rem;
      font-size: .76rem;
      font-weight: 800;
      transition: .18s ease;
    }

    .format-option:hover,
    .format-option.active {
      border-color: var(--report-primary);
      background: rgba(0, 150, 136, .08);
      color: var(--report-primary);
    }

    .main-export-btn,
    .ai-generate-btn {
      background: var(--report-primary) !important;
      color: #fff !important;
      border-radius: 9px !important;
      font-weight: 900 !important;
      box-shadow: none !important;
    }

    .main-export-btn {
      width: 100%;
      height: 44px;
    }

    .main-export-btn:disabled,
    .ai-generate-btn:disabled {
      opacity: .55;
    }

    .preview-card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .preview-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
    }

    .eyebrow {
      margin: 0;
      font-size: .68rem;
      font-weight: 900;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--report-primary);
    }

    .preview-head h2,
    .history-head h3 {
      margin: .18rem 0 0;
      color: var(--report-text);
      font-weight: 900;
      letter-spacing: -.03em;
    }

    .preview-head h2 {
      font-size: 1.35rem;
    }

    .preview-head span {
      font-size: .76rem;
      color: var(--report-muted);
      margin-top: .25rem;
    }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: .85rem;
    }

    .metric-card {
      min-height: 82px;
      border: 1px solid var(--report-border);
      border-radius: 10px;
      background: var(--report-soft);
      padding: .8rem .9rem;
    }

    .metric-card p {
      margin: 0;
      font-size: .64rem;
      font-weight: 900;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: var(--report-muted);
    }

    .metric-card strong {
      display: block;
      margin-top: .3rem;
      font-size: 1.08rem;
      line-height: 1;
      color: var(--report-text);
    }

    .metric-card span {
      display: block;
      margin-top: .32rem;
      font-size: .72rem;
      color: var(--report-muted);
    }

    .columns-preview {
      margin-top: auto;
      border: 1px dashed rgba(0, 150, 136, .45);
      background: rgba(0, 150, 136, .04);
      color: var(--report-text);
      border-radius: 10px;
      padding: .8rem .9rem;
      font-size: .78rem;
    }

    .columns-preview span {
      font-weight: 900;
    }

    .voice-card {
      display: flex;
      flex-direction: column;
      gap: .85rem;
    }

    .voice-subtitle {
      margin: -.65rem 0 .1rem;
      color: var(--report-muted);
      font-size: .78rem;
    }

    .quick-prompts {
      display: grid;
      gap: .55rem;
    }

    .prompt-chip {
      justify-content: flex-start !important;
      width: 100%;
      min-height: 38px;
      border-radius: 8px !important;
      border-color: var(--report-border) !important;
      background: var(--report-soft) !important;
      color: var(--report-text) !important;
      font-size: .74rem;
      text-align: left;
      font-weight: 600;
    }

    .prompt-chip:hover {
      border-color: var(--report-border-strong) !important;
      background: rgba(0, 150, 136, .06) !important;
    }

    .voice-textarea {
      width: 100%;
      min-height: 92px;
      resize: vertical;
      border: 1px solid var(--report-border);
      border-radius: 9px;
      background: var(--report-soft);
      padding: .85rem;
      color: var(--report-text);
      outline: none;
      font-size: .86rem;
      line-height: 1.45;
      font-family: inherit;
    }

    .voice-textarea:focus {
      border-color: var(--report-primary);
      box-shadow: 0 0 0 3px rgba(0, 150, 136, .12);
    }

    .voice-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: .65rem;
      align-items: center;
    }

    .voice-actions:has(.stop-btn) {
      grid-template-columns: 1fr auto 1fr;
    }

    .dictate-btn,
    .stop-btn {
      border-radius: 9px !important;
      border-color: var(--report-border) !important;
      background: #fff !important;
      color: var(--report-text) !important;
      font-weight: 800 !important;
    }

    .ai-generate-btn {
      height: 40px;
    }

    .voice-error {
      border-radius: 10px;
      padding: .75rem;
      background: rgba(239, 68, 68, .1);
      color: #b42318;
      font-size: .78rem;
      font-weight: 700;
    }

    .voice-preview {
      border-radius: 10px;
      padding: .75rem;
      background: rgba(0, 150, 136, .05);
      color: var(--report-muted);
      font-size: .78rem;
      display: flex;
      flex-direction: column;
      gap: .3rem;
    }

    .voice-preview strong {
      color: var(--report-text);
    }

    .history-card {
      margin-top: 1.45rem;
      padding: 1.35rem;
    }

    .history-head {
      margin-bottom: 1.1rem;
    }

    .history-table-wrap {
      overflow-x: auto;
    }

    .history-table {
      width: 100%;
      min-width: 760px;
      border-collapse: collapse;
      font-size: .85rem;
    }

    .history-table th {
      padding: 0 .9rem .7rem;
      border-bottom: 1px solid var(--report-border);
      text-align: left;
      font-size: .68rem;
      font-weight: 900;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--report-muted);
    }

    .history-table td {
      padding: .85rem .9rem;
      border-bottom: 1px solid rgba(0, 150, 136, .10);
      color: var(--report-muted);
    }

    .history-table tbody tr:hover {
      background: rgba(0, 150, 136, .035);
    }

    .history-table .report-name {
      color: var(--report-text);
      font-weight: 800;
    }

    .history-table .right {
      text-align: right;
    }

    .format-badge {
      display: inline-flex;
      align-items: center;
      border-radius: 7px;
      padding: .2rem .45rem;
      background: #edf5f4;
      color: var(--report-text);
      font-size: .7rem;
      font-weight: 900;
    }

    .format-badge.pdf {
      background: rgba(0, 150, 136, .10);
      color: var(--report-primary-dark);
    }

    .format-badge.excel {
      background: rgba(34, 197, 94, .12);
      color: #16a34a;
    }

    .format-badge.html {
      background: rgba(14, 165, 233, .12);
      color: #0284c7;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: .45rem;
      color: #16a34a;
      font-size: .72rem;
      font-weight: 900;
      text-transform: uppercase;
    }

    .status-badge i {
      width: 6px;
      height: 6px;
      border-radius: 999px;
      background: #22c55e;
      display: inline-block;
    }

    @media (max-width: 1260px) {
      .reports-grid {
        grid-template-columns: 1fr;
      }

      .report-card {
        min-height: auto;
      }
    }

    @media (max-width: 760px) {
      .reports-shell {
        padding: 1rem;
      }

      .reports-hero,
      .preview-head {
        flex-direction: column;
        align-items: flex-start;
      }

      .hero-actions,
      .hero-btn {
        width: 100%;
      }

      .metric-grid {
        grid-template-columns: 1fr;
      }

      .voice-actions,
      .voice-actions:has(.stop-btn) {
        grid-template-columns: 1fr;
      }
    }
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
  protected readonly alertIcon = AlertTriangle;
  protected readonly micIcon = Mic;
  protected readonly micOffIcon = MicOff;
  protected readonly sendIcon = Send;

  isGenerating = signal(false);
  isSendingAi = signal(false);
  selectedType = signal<'operativo' | 'financiero' | 'auditoria'>('operativo');
  selectedWorkshop = signal<string | null>(null);
  selectedExportFormat = signal<ReportFormat>('PDF');
  voicePrompt = signal('');
  isListening = signal(false);
  voiceError = signal('');
  quickPrompts = [
    'Genera un reporte financiero por taller en PDF',
    'Reporte operativo del mes actual en PDF',
    'Auditoría de accesos y cambios críticos en HTML'
  ];

  range = new FormGroup({
    start: new FormControl<Date | null>(null, [Validators.required]),
    end: new FormControl<Date | null>(null, [Validators.required]),
  });

  isSuperAdmin = computed(() => this.authStore.user()?.rol_nombre === 'superadmin');

  workshopsQuery = injectQuery(() => ({
    queryKey: ['report-workshops'],
    queryFn: () => lastValueFrom(this.workshopsService.getAllWorkshops()),
    enabled: this.isSuperAdmin()
  }));

  onTypeChange(): void {}

  setExportFormat(formatType: ReportFormat): void {
    this.selectedExportFormat.set(formatType);
  }

  selectedExportFormatLabel(): string {
    return this.selectedExportFormat() === 'EXCEL' ? 'Excel' : this.selectedExportFormat();
  }

  applyQuickPrompt(prompt: string): void {
    this.voicePrompt.set(prompt);
  }

  previewTitle(): string {
    if (this.selectedType() === 'financiero') return 'Reporte Financiero';
    if (this.selectedType() === 'auditoria') return 'Reporte de Auditoría';
    return 'Reporte Operativo';
  }

  getPreviewColumns(): string[] {
    if (this.selectedType() === 'financiero') return ['Fecha', 'Incidente', 'Estado', 'Total', 'Comisión', 'Neto'];
    if (this.selectedType() === 'auditoria') return ['Fecha', 'Usuario', 'Acción', 'Descripción', 'IP'];
    return ['Fecha', 'ID', 'Estado', 'Prioridad', 'Resumen IA', 'Teléfono'];
  }

  getPreviewMetrics(): Array<{ label: string; value: string; note: string }> {
    if (this.selectedType() === 'financiero') {
      return [
        { label: 'Recaudado', value: 'Bs 12,480', note: 'Global' },
        { label: 'Comisión', value: 'Bs 1,248', note: '10% estimado' },
        { label: 'Neto', value: 'Bs 11,232', note: 'Transferible' }
      ];
    }

    if (this.selectedType() === 'auditoria') {
      return [
        { label: 'Eventos', value: '34', note: '24h' },
        { label: 'Alertas', value: '6', note: 'Críticas' },
        { label: 'Cumplimiento', value: '99.8%', note: 'Global' }
      ];
    }

    return [
      { label: 'Auxilios', value: '18', note: 'En curso' },
      { label: 'Tiempo medio', value: '18 min', note: 'Respuesta' },
      { label: 'Talleres activos', value: '9', note: this.selectedWorkshop() ? 'Con taller' : 'Global' }
    ];
  }

  getPreviewDetails(): Array<{ label: string; value: string }> {
    const dr = this.range.value.start && this.range.value.end
      ? `${format(this.range.value.start, 'dd/MM/yyyy')} - ${format(this.range.value.end, 'dd/MM/yyyy')}`
      : 'Sin rango';

    return [
      { label: 'Taller', value: this.selectedWorkshop() ? 'Filtrado' : 'Todos' },
      { label: 'Periodo', value: dr }
    ];
  }

  getRecentReports(): Array<{ name: string; type: string; format: ReportFormat; status: string; date: string }> {
    return [
      { name: 'Reporte Operativo', type: 'Operativo', format: 'PDF', status: 'Completado', date: 'Hoy 10:40' },
      { name: 'Liquidación', type: 'Financiero', format: 'EXCEL', status: 'Completado', date: 'Ayer 17:20' },
      { name: 'Auditoría', type: 'Seguridad', format: 'HTML', status: 'Completado', date: '12 Jun 2026' }
    ];
  }

  async export(formatType: ReportFormat): Promise<void> {
    const rangeBounds = this.getRangeBounds();
    if (!rangeBounds) return;

    this.isGenerating.set(true);

    try {
      let tableRows: unknown[][] = [];
      let excelData: Record<string, unknown>[] = [];
      let columns: string[] = [];
      const filename = `Reporte_${this.selectedType()}`;

      if (this.selectedType() === 'financiero') {
        const raw = await lastValueFrom(this.financeService.getPayments(this.selectedWorkshop() ?? undefined));
        const filtered = this.asArray(raw).filter((p: any) => {
          const d = new Date(p.fecha_pago || new Date());
          return d >= rangeBounds.start && d <= rangeBounds.end;
        });

        columns = ['FECHA', 'ID_INCIDENTE', 'ESTADO', 'MONTO TOTAL', 'COMISIÓN (10%)', 'NETO'];

        tableRows = filtered.map((p: any) => [
          this.formatDateTime(p.fecha_pago),
          this.shortId(p.id_incidente),
          p.estado_pago ?? '-',
          `${Number(p.monto ?? 0).toFixed(2)} Bs`,
          `${Number(p.monto_comision ?? 0).toFixed(2)} Bs`,
          `${(Number(p.monto ?? 0) - Number(p.monto_comision ?? 0)).toFixed(2)} Bs`
        ]);

        excelData = filtered.map((p: any) => ({
          Fecha: this.formatDateTime(p.fecha_pago),
          Incidente: p.id_incidente ?? '-',
          Estado: p.estado_pago ?? '-',
          Total: Number(p.monto ?? 0),
          Comision: Number(p.monto_comision ?? 0),
          Neto: Number(p.monto ?? 0) - Number(p.monto_comision ?? 0)
        }));
      } else if (this.selectedType() === 'operativo') {
        const raw = await lastValueFrom(this.workshopsService.getAssignments());
        const items = this.asArray(raw);

        const filtered = items.filter((i: any) => {
          const inc = i.incidente ?? i.incident ?? i;
          const fecha = inc.fecha_reporte ?? i.fecha_reporte ?? i.fecha_asignacion;
          if (!fecha) return false;

          const d = new Date(fecha);
          return d >= rangeBounds.start && d <= rangeBounds.end;
        });

        columns = ['FECHA', 'ID', 'ESTADO', 'PRIORIDAD', 'RESUMEN IA', 'TELÉFONO'];

        tableRows = filtered.map((i: any) => {
          const inc = i.incidente ?? i.incident ?? i;
          const fecha = inc.fecha_reporte ?? i.fecha_reporte ?? i.fecha_asignacion;
          const id = inc.id_incidente ?? i.id_incidente;

          return [
            this.formatDateTime(fecha),
            this.shortId(id),
            inc.estado_incidente ?? i.estado_asignacion ?? '-',
            inc.prioridad_incidente ?? '-',
            inc.resumen_ia ?? '-',
            inc.telefono ?? '-'
          ];
        });

        excelData = filtered.map((i: any) => {
          const inc = i.incidente ?? i.incident ?? i;
          const fecha = inc.fecha_reporte ?? i.fecha_reporte ?? i.fecha_asignacion;
          const id = inc.id_incidente ?? i.id_incidente;

          return {
            Fecha: this.formatDateTime(fecha),
            ID: id ?? '-',
            Estado: inc.estado_incidente ?? i.estado_asignacion ?? '-',
            Prioridad: inc.prioridad_incidente ?? '-',
            Resumen: inc.resumen_ia ?? '-',
            Telefono: inc.telefono ?? '-'
          };
        });
      } else {
        const raw = await lastValueFrom(this.monitoringService.getAuditLogs());
        const logs = this.asArray(raw);

        const filtered = logs.filter((l: AuditLog) => {
          const d = new Date(l.fecha_hora);
          return d >= rangeBounds.start && d <= rangeBounds.end;
        });

        columns = ['FECHA', 'USUARIO', 'ACCIÓN', 'DESCRIPCIÓN', 'IP'];

        tableRows = filtered.map((l: AuditLog) => [
          this.formatDateTime(l.fecha_hora),
          l.nombre_usuario || 'Desconocido',
          l.accion ?? '-',
          l.descripcion || '-',
          l.ip ?? '-'
        ]);

        excelData = filtered.map((l: AuditLog) => ({
          Fecha: this.formatDateTime(l.fecha_hora),
          Usuario: l.nombre_usuario || 'Desconocido',
          Accion: l.accion ?? '-',
          Descripcion: l.descripcion || '-',
          IP: l.ip ?? '-'
        }));
      }

      if (tableRows.length === 0) {
        this.snackBar.open('No hay datos para el periodo seleccionado', 'Cerrar', { duration: 3000 });
        return;
      }

      if (formatType === 'PDF') {
        this.reportService.exportToPDF(`Reporte ${this.selectedType()} - AutoAssist AI`, columns, tableRows, filename);
      } else if (formatType === 'EXCEL') {
        this.reportService.exportToExcel(excelData, filename);
      } else {
        this.reportService.exportToHTML(`Reporte ${this.selectedType()} - AutoAssist AI`, columns, tableRows, filename);
      }

      this.snackBar.open('✅ Reporte generado con éxito', 'Cerrar', { duration: 3000 });
    } catch (error) {
      console.error('Error:', error);
      this.snackBar.open('Ocurrió un error al generar el reporte', 'Cerrar', { duration: 5000 });
    } finally {
      this.isGenerating.set(false);
    }
  }

  async dictateAiReport(): Promise<void> {
    this.voiceError.set('');

    if (!this.speechRecognitionService.isSupported()) {
      this.voiceError.set('Tu navegador no soporta reconocimiento de voz. Prueba con Chrome o Edge.');
      return;
    }

    if (this.isListening()) {
      this.voiceError.set('Ya se está escuchando audio.');
      return;
    }

    try {
      this.isListening.set(true);
      this.voicePrompt.set(await this.speechRecognitionService.listenOnce());
    } catch (error) {
      this.voiceError.set(String(error));
    } finally {
      this.isListening.set(false);
    }
  }

  stopDictation(): void {
    this.speechRecognitionService.stop();
    this.isListening.set(false);
  }

  async sendTranscriptToWebhook(transcriptText: string): Promise<void> {
    const cleanText = transcriptText.trim();

    if (!cleanText) {
      this.voiceError.set('Primero dicta o escribe una solicitud de reporte.');
      return;
    }

    this.voiceError.set('');
    this.isSendingAi.set(true);

    try {
      const user = this.authStore.user();
      const requestBody: Record<string, unknown> = {
        action: 'sendMessage',
        sessionId: `session${user?.id_usuario ?? 'anon'}49c3832dfefe4505b87442`,
        chatInput: cleanText,
        reportFormat: this.detectRequestedAiFormat(cleanText),
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

      const response = await fetch(environment.aiReportUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI error response', {
          status: response.status,
          url: response.url,
          errorText: errorText.slice(0, 500)
        });
        this.snackBar.open('Error del asistente IA.', 'Cerrar', { duration: 5000 });
        return;
      }

      const requestedFormat = this.detectRequestedAiFormat(cleanText);
      const { blob, filename } = await this.buildAiDownloadFromResponse(response, requestedFormat);
      this.downloadFile(blob, filename);
      this.snackBar.open('✅ Reporte IA generado con éxito', 'Cerrar', { duration: 3000 });
    } catch (error) {
      console.error('Error IA Report:', error);
      this.snackBar.open('Error al conectar con el asistente de IA.', 'Cerrar', { duration: 5000 });
    } finally {
      this.isSendingAi.set(false);
    }
  }

  private async buildAiDownloadFromResponse(response: Response, requestedFormat: ReportFormat): Promise<{ blob: Blob; filename: string }> {
    const disposition = response.headers.get('content-disposition');
    const contentTypeHeader = response.headers.get('content-type') || '';
    const contentType = contentTypeHeader.toLowerCase().split(';')[0].trim();

    if (contentType.includes('application/json')) {
      const data = await response.json();
      return this.buildDownloadFromJson(data, requestedFormat);
    }

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

    console.log('AI URL', environment.aiReportUrl);
    console.log('AI headers', contentType, disposition, response.status, response.url);
    console.log('AI first text', text.slice(0, 200));
    console.log('AI first bytes', Array.from(bytes.slice(0, 12)));

    const filenameFromDisposition = this.extractFilenameFromContentDisposition(disposition);
    const type = this.getExtensionFromContentType(contentType, bytes, text, filenameFromDisposition);
    const filename = this.resolveAiFilename(filenameFromDisposition, type);
    const blob = new Blob([buffer], { type: this.resolveAiMimeType(type) });

    return { blob, filename };
  }

  private buildDownloadFromJson(data: unknown, requestedFormat: ReportFormat): { blob: Blob; filename: string } {
    const item = Array.isArray(data) ? data[0] : data;
    const obj = (item && typeof item === 'object') ? item as Record<string, unknown> : {};

    const filenameValue = obj['filename'] ?? obj['fileName'] ?? obj['name'];
    const filename = typeof filenameValue === 'string' && filenameValue.trim()
      ? filenameValue.trim()
      : `Reporte_IA_${format(new Date(), 'yyyy-MM-dd_HHmm')}.${this.extensionFromReportFormat(requestedFormat)}`;

    const mimeTypeValue = obj['mimeType'] ?? obj['contentType'] ?? obj['type'];
    const mimeType = typeof mimeTypeValue === 'string' && mimeTypeValue.includes('/')
      ? mimeTypeValue
      : this.resolveAiMimeType(this.getExtensionFromFilename(filename));

    const base64Value = obj['base64'] ?? obj['data'] ?? obj['file'];
    if (typeof base64Value === 'string' && this.looksLikeBase64(base64Value)) {
      const type = this.getExtensionFromFilename(filename);
      return {
        blob: this.blobFromBase64(base64Value, mimeType),
        filename: this.ensureFilenameExtension(filename, type)
      };
    }

    const contentValue = obj['content'] ?? obj['output'] ?? obj['html'] ?? obj['text'] ?? obj['report'];
    if (typeof contentValue === 'string') {
      const type = this.getExtensionFromFilename(filename);
      return {
        blob: new Blob([contentValue], { type: this.resolveAiMimeType(type) }),
        filename: this.ensureFilenameExtension(filename, type)
      };
    }

    const fallbackContent = JSON.stringify(data, null, 2);
    return {
      blob: new Blob([fallbackContent], { type: 'text/plain;charset=utf-8' }),
      filename: `Respuesta_IA_${format(new Date(), 'yyyy-MM-dd_HHmm')}.txt`
    };
  }

  private extractFilenameFromContentDisposition(contentDisposition: string | null): string | null {
    if (!contentDisposition) return null;

    const utf8Match = contentDisposition.match(/filename\*\s*=\s*([^']*)''([^;]+)/i);
    if (utf8Match?.[2]) {
      try {
        return decodeURIComponent(utf8Match[2].trim().replace(/^"|"$/g, ''));
      } catch {
        return utf8Match[2].trim().replace(/^"|"$/g, '');
      }
    }

    const filenameMatch = contentDisposition.match(/filename\s*=\s*([^;]+)/i);
    return filenameMatch?.[1]?.trim().replace(/^"|"$/g, '') ?? null;
  }

  private getExtensionFromContentType(contentType: string, bytes: Uint8Array, text: string, filename?: string | null): AiFileType {
    const fromFilename: AiFileType = filename ? this.getExtensionFromFilename(filename) : 'txt';
    if (fromFilename !== 'txt') return fromFilename;

    const normalized = text.toLowerCase().trim();

    if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'pdf';
    if (contentType.includes('spreadsheetml') || contentType.includes('excel') || contentType.includes('sheet')) return 'xlsx';
    if (normalized.startsWith('<!doctype html') || normalized.startsWith('<html')) return 'html';
    if (contentType.includes('csv')) return 'csv';
    if (contentType.includes('html')) return 'html';
    if (contentType.includes('pdf')) return 'pdf';
    if (normalized.includes(',') && normalized.includes('\n')) return 'csv';
    if (contentType.includes('text/plain') || contentType.includes('plain')) return 'txt';
    if (contentType.includes('json')) return 'txt';

    return 'txt';
  }

  private getExtensionFromFilename(filename: string): AiFileType {
    const clean = filename.toLowerCase().split('?')[0].split('#')[0];

    if (clean.endsWith('.pdf')) return 'pdf';
    if (clean.endsWith('.html') || clean.endsWith('.htm')) return 'html';
    if (clean.endsWith('.xlsx') || clean.endsWith('.xls')) return 'xlsx';
    if (clean.endsWith('.csv')) return 'csv';

    return 'txt';
  }

  private resolveAiMimeType(type: AiFileType): string {
    switch (type) {
      case 'pdf': return 'application/pdf';
      case 'html': return 'text/html;charset=utf-8';
      case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'csv': return 'text/csv;charset=utf-8';
      default: return 'text/plain;charset=utf-8';
    }
  }

  private resolveAiFilename(filenameFromDisposition: string | null, extension: AiFileType): string {
    if (!filenameFromDisposition) return `Reporte_IA_${format(new Date(), 'yyyy-MM-dd_HHmm')}.${extension}`;
    return this.ensureFilenameExtension(filenameFromDisposition, extension);
  }

  private ensureFilenameExtension(filename: string, extension: AiFileType): string {
    if (/\.[a-z0-9]{2,8}$/i.test(filename)) return filename;
    return `${filename}.${extension}`;
  }

  private extensionFromReportFormat(formatType: ReportFormat): AiFileType {
    if (formatType === 'PDF') return 'pdf';
    if (formatType === 'EXCEL') return 'xlsx';
    return 'html';
  }

  private detectRequestedAiFormat(text: string): ReportFormat {
    const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const compact = normalized.replace(/[\s.\-_]/g, '');

    if (compact.includes('pdf') || normalized.includes('pe de efe')) return 'PDF';
    if (compact.includes('excel') || compact.includes('xlsx') || compact.includes('xls')) return 'EXCEL';
    if (compact.includes('html')) return 'HTML';

    return 'HTML';
  }

  private looksLikeBase64(value: string): boolean {
    const clean = value.includes(',') ? value.split(',').pop() ?? value : value;
    return clean.length > 80 && /^[A-Za-z0-9+/=\r\n]+$/.test(clean);
  }

  private blobFromBase64(base64: string, mimeType: string): Blob {
    const cleanBase64 = base64.includes(',') ? base64.split(',').pop() ?? base64 : base64;
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
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

  private getRangeBounds(): { start: Date; end: Date } | null {
    const { start, end } = this.range.value;

    if (!start || !end) {
      this.snackBar.open('Selecciona un rango de fechas', 'Cerrar', { duration: 3000 });
      return null;
    }

    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    return { start: startDate, end: endDate };
  }

  private asArray(raw: any): any[] {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    if (Array.isArray(raw?.items)) return raw.items;
    if (Array.isArray(raw?.results)) return raw.results;
    if (Array.isArray(raw?.assignments)) return raw.assignments;
    if (Array.isArray(raw?.data?.items)) return raw.data.items;
    if (Array.isArray(raw?.data?.results)) return raw.data.results;
    return [];
  }

  private formatDateTime(value: unknown): string {
    if (!value) return '-';

    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return '-';

    return format(date, 'dd/MM/yyyy HH:mm');
  }

  private shortId(value: unknown): string {
    if (value === null || value === undefined) return '-';
    return String(value).substring(0, 8);
  }
}
