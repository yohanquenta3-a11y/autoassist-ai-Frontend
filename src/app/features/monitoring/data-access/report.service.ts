import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { environment } from '@env/environment';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Observable } from 'rxjs';
import { User } from '@features/identity/auth/schemas/auth.schema';
import { buildAiReportRequest } from '@features/finance/pages/report-generator/services/ai-report.request';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private http = inject(HttpClient);

  constructor() { }

  /**
   * EnvÃ­a una solicitud al motor de IA en n8n para generar un reporte basado en lenguaje natural.
   */
  generateAiReport(chatInput: string, sessionId: string, user?: User | null): Observable<HttpResponse<Blob>> {
    const normalizedPrompt = /excel/i.test(chatInput)
      ? chatInput
      : `${chatInput}\n\nDevuelve el resultado en formato excel.`;

    return this.http.post(environment.aiReportUrl, buildAiReportRequest(normalizedPrompt, sessionId, user), {
      responseType: 'blob',
      observe: 'response' as const,
      headers: {
        'Accept': 'application/pdf, text/html, text/csv, text/plain, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream'
      }
    }) as unknown as Observable<HttpResponse<Blob>>;
  }

  /**
   * Genera un reporte en PDF con una tabla estilizada.
   */
  exportToPDF(title: string, columns: string[], data: unknown[][], filename: string) {
    const doc = new jsPDF('l', 'mm', 'a4');

    const primaryColor: [number, number, number] = [15, 23, 42];

    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('AUTOASSIST AI PLATFORM', 14, 20);

    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text(title.toUpperCase(), 14, 30);

    doc.setFontSize(10);
    doc.text(`Fecha de EmisiÃ³n: ${new Date().toLocaleString('es-BO')}`, 14, 38);
    doc.text('Sistema de operaciones y asistencia vehicular', 14, 44);

    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(14, 48, 283, 48);

    (autoTable as any)(doc, {
      head: [columns],
      body: data,
      startY: 55,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { top: 55 },
      didDrawPage: (_dataArg: unknown) => {
        doc.setFontSize(8);
        doc.setTextColor(150);
        const internal = (doc as unknown as { internal: { getNumberOfPages?: () => number } }).internal;
        const totalPages = (internal && internal.getNumberOfPages) ? internal.getNumberOfPages() : 1;
        const str = `PÃ¡gina ${totalPages}`;
        doc.text(str, 283 - 20, 200);
        doc.text('Â© 2026 AutoAssist AI - Reporte Confidencial', 14, 200);
      }
    });

    doc.save(`${filename}_${new Date().getTime()}.pdf`);
  }

  exportToExcel(data: unknown[], filename: string) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');
    XLSX.writeFile(workbook, `${filename}_${new Date().getTime()}.xlsx`);
  }

  exportToHTML(title: string, columns: string[], data: unknown[][], filename: string) {
    const rows = data.map(row =>
      `<tr>${row.map(cell => `<td>${this.escapeHtml(String(cell ?? ''))}</td>`).join('')}</tr>`
    ).join('');

    const html = `
      <!doctype html>
      <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${this.escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #e5e7eb; background: #0b1020; }
          .sheet { max-width: 1200px; margin: 0 auto; background: #111827; padding: 24px; border-radius: 16px; }
          h1 { margin: 0 0 8px; font-size: 24px; }
          .meta { color: #94a3b8; margin-bottom: 18px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #334155; padding: 10px 12px; text-align: left; font-size: 13px; }
          th { background: #1e293b; color: #fff; text-transform: uppercase; font-size: 11px; letter-spacing: .04em; }
          tr:nth-child(even) td { background: #0f172a; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <h1>${this.escapeHtml(title)}</h1>
          <div class="meta">Fecha de emisiÃ³n: ${new Date().toLocaleString('es-BO')}</div>
          <table>
            <thead>
              <tr>${columns.map(column => `<th>${this.escapeHtml(column)}</th>`).join('')}</tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${filename}_${new Date().getTime()}.html`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
