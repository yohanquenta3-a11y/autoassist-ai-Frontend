import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import { HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '@features/identity/auth/schemas/auth.schema';
import { buildAiReportRequest } from './ai-report.request';

@Injectable({
  providedIn: 'root'
})
export class AiReportService {
  private readonly http = inject(HttpClient);

  generateAiReport(chatInput: string, sessionId: string, user?: User | null): Observable<HttpResponse<Blob>> {
    return this.http.post(
      environment.aiReportUrl,
      buildAiReportRequest(chatInput, sessionId, user),
      {
        responseType: 'blob',
        observe: 'response' as const,
        headers: {
          Accept: 'application/pdf, text/html, text/csv, text/plain, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream'
        }
      }
    ) as unknown as Observable<HttpResponse<Blob>>;
  }
}
