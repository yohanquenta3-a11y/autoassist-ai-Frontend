/**
 * Servicio para CU33: gestionar tenants y aislamiento de informacion.
 * Se conecta a los endpoints reales del modulo admin/tenants.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

import { IdentityService } from '@features/identity/data-access/identity.service';
import {
  ActionResultResponse,
  BitacoraTenant,
  IncidenteTenant,
  TenantIsolationVerificationResult,
  TenantMetricsResponse,
  TallerTenant,
  TallerTenantCreate,
  UsuarioTenant,
} from '../admin.models';

@Injectable({
  providedIn: 'root',
})
export class GestionTenantsAislamientoService {
  private readonly http = inject(HttpClient);
  private readonly identityService = inject(IdentityService);
  private readonly apiUrl = `${environment.apiUrl}/admin/tenants`;

  getTenants(): Observable<TallerTenant[]> {
    return this.http.get<TallerTenant[]>(`${this.apiUrl}/talleres`);
  }

  getTenantDetail(idTaller: string): Observable<TallerTenant> {
    return this.http.get<TallerTenant>(`${this.apiUrl}/talleres/${idTaller}`);
  }

  createTenant(data: TallerTenantCreate): Observable<TallerTenant> {
    return this.http.post<TallerTenant>(`${this.apiUrl}/talleres`, data);
  }

  updateTenant(idTaller: string, data: Partial<TallerTenantCreate>): Observable<TallerTenant> {
    return this.http.patch<TallerTenant>(`${this.apiUrl}/talleres/${idTaller}`, data);
  }

  updateTenantStatus(idTaller: string, activo: boolean): Observable<TallerTenant> {
    const params = new HttpParams().set('activo', String(activo));
    return this.http.patch<TallerTenant>(`${this.apiUrl}/talleres/${idTaller}/estado`, null, { params });
  }

  getTenantUsers(idTaller: string): Observable<UsuarioTenant[]> {
    return this.identityService.getUsers({ tallerId: idTaller });
  }

  getTenantTechnicians(idTaller: string): Observable<UsuarioTenant[]> {
    return this.identityService.getUsers({ tallerId: idTaller, role: 'tecnico' });
  }

  associateUser(idTaller: string, idUsuario: string): Observable<ActionResultResponse> {
    return this.http.post<ActionResultResponse>(`${this.apiUrl}/talleres/${idTaller}/usuarios/${idUsuario}`, {});
  }

  associateTechnician(idTaller: string, idTecnico: string): Observable<ActionResultResponse> {
    return this.http.post<ActionResultResponse>(`${this.apiUrl}/talleres/${idTaller}/tecnicos/${idTecnico}`, {});
  }

  getTenantIncidents(idTaller: string): Observable<IncidenteTenant[]> {
    return this.http.get<IncidenteTenant[]>(`${this.apiUrl}/talleres/${idTaller}/incidentes`);
  }

  getTenantMetrics(idTaller: string): Observable<TenantMetricsResponse> {
    return this.http.get<TenantMetricsResponse>(`${this.apiUrl}/talleres/${idTaller}/metricas`);
  }

  getTenantBitacora(idTaller: string): Observable<BitacoraTenant[]> {
    return this.http.get<BitacoraTenant[]>(`${this.apiUrl}/talleres/${idTaller}/bitacora`);
  }

  verifyIsolation(): Observable<TenantIsolationVerificationResult> {
    return this.http.get<TenantIsolationVerificationResult>(`${this.apiUrl}/verificar-aislamiento`);
  }
}
