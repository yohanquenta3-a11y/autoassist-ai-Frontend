import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';

import { TransferFilters, VehicleTransfer } from '../models/transfers.model';

@Injectable({ providedIn: 'root' })
export class TransfersService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/transfers`;

  getWorkshopTransfers(filters: TransferFilters = {}): Observable<VehicleTransfer[]> {
    const params: Record<string, string> = {};
    if (filters.estado && filters.estado !== 'all') params['estado'] = filters.estado;
    if (filters.tipoTraslado && filters.tipoTraslado !== 'all') params['tipo_traslado'] = filters.tipoTraslado;
    if (filters.search?.trim()) params['search'] = filters.search.trim();
    if (filters.fechaDesde) params['fecha_desde'] = filters.fechaDesde;
    if (filters.fechaHasta) params['fecha_hasta'] = filters.fechaHasta;
    if (filters.idTecnico) params['id_tecnico'] = filters.idTecnico;
    return this.http.get<VehicleTransfer[]>(`${this.API_URL}/workshop`, { params });
  }

  getTransfer(id: string): Observable<VehicleTransfer> {
    return this.http.get<VehicleTransfer>(`${this.API_URL}/${id}`);
  }

  confirm(id: string): Observable<VehicleTransfer> {
    return this.http.put<VehicleTransfer>(`${this.API_URL}/${id}/confirm`, {});
  }

  reject(id: string, comentario?: string): Observable<VehicleTransfer> {
    return this.http.put<VehicleTransfer>(`${this.API_URL}/${id}/reject`, { comentario });
  }

  assign(id: string, idTecnico: string): Observable<VehicleTransfer> {
    return this.http.put<VehicleTransfer>(`${this.API_URL}/${id}/assign`, { id_tecnico: idTecnico });
  }

  updateStatus(id: string, estado: string, comentario?: string): Observable<VehicleTransfer> {
    return this.http.patch<VehicleTransfer>(`${this.API_URL}/${id}/status`, { estado, comentario });
  }

  reschedule(id: string, fechaProgramada: string, comentario?: string): Observable<VehicleTransfer> {
    return this.http.put<VehicleTransfer>(`${this.API_URL}/${id}/reschedule`, {
      fecha_programada: fechaProgramada,
      comentario
    });
  }
}
