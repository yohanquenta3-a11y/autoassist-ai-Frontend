import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private http = inject(HttpClient);

  constructor() { }

  /**
   * Envía una solicitud al motor de IA en n8n para generar un reporte basado en lenguaje natural.
   */
  generateAiReport(chatInput: string, sessionId: string) {
    const normalizedPrompt = /excel/i.test(chatInput)
      ? chatInput
      : `${chatInput}\n\nDevuelve el resultado en formato excel.`;

    return this.http.post(environment.aiReportUrl, {
      action: 'sendMessage',
      sessionId,
      chatInput: normalizedPrompt
    }, { 
      responseType: 'blob',
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    });
  }

  /**
   * Genera un reporte en PDF con una tabla estilizada.
   */
  exportToPDF(title: string, columns: string[], data: unknown[][], filename: string) {
    const doc = new jsPDF('l', 'mm', 'a4'); 
    
    // Usamos un array de números para el color primario
    const primaryColor: [number, number, number] = [15, 23, 42];
    
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('SMART MECHANIC PLATFORM', 14, 20);
    
    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text(title.toUpperCase(), 14, 30);
    
    doc.setFontSize(10);
    doc.text(`Fecha de Emisión: ${new Date().toLocaleString('es-BO')}`, 14, 38);
    doc.text('Sistema de Gestión de Auxilios Mecánicos', 14, 44);

    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(14, 48, 283, 48);

    // Llamamos a autoTable con casting a any para ignorar errores de definición de jspdf-autotable
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
      didDrawPage: (dataArg: unknown) => {
        doc.setFontSize(8);
        doc.setTextColor(150);
        // Acceso ultra-seguro al número de páginas (usando cast controlado)
        const internal = (doc as unknown as { internal: { getNumberOfPages?: () => number } }).internal;
        const totalPages = (internal && internal.getNumberOfPages) ? internal.getNumberOfPages() : 1;
        const str = `Página ${totalPages}`;
        doc.text(str, 283 - 20, 200);
        doc.text('© 2026 Smart Mechanic - Reporte Confidencial', 14, 200);
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
}
