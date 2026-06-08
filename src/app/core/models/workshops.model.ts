import { EvidenceResponse } from './emergencies.model';

export interface TallerCreate {
  nombre: string;
  nit: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  latitud: number;
  longitud: number;
}

export interface TallerResponse {
  id_taller: string;
  nombre: string;
  nit: string;
  telefono: string;
  email: string;
  direccion: string;
  latitud?: number;
  longitud?: number;
  is_active: boolean;
}

export interface StatusUpdate {
  nuevo_estado: string; // Ej: EN_CAMINO, EN_PROGRESO, COMPLETADO
}

export interface IncidentHistoryResponse {
  id_historial: string;
  id_incidente: string;
  id_taller?: string | null;
  id_sucursal?: string | null;
  incidente_estado_anterior?: string | null;
  incidente_estado_nuevo: string;
  historial_actor?: string | null;
  fecha: string;
}

export interface IncidentResponse {
  id_incidente: string;
  id_vehiculo: string;
  id_taller: string | null;
  id_sucursal?: string | null;
  branch_name?: string | null;
  id_tecnico?: string | null;
  workshop_name?: string | null;
  technician_name?: string | null;
  technician_phone?: string | null;
  descripcion: string | null;
  telefono: string | null;
  latitud: number;
  longitud: number;
  estado_incidente: string;
  prioridad_incidente: string;
  transcripcion_audio: string | null;
  resumen_ia: string | null;
  analisis_consolidado: string | null;
  fecha_reporte?: string;
  evidencias: EvidenceResponse[];
  historial?: IncidentHistoryResponse[];
  
  // Nuevos campos
  client_name?: string | null;
  client_phone?: string | null;
  vehicle_brand?: string | null;
  vehicle_model?: string | null;
  vehicle_plate?: string | null;
  vehicle_color?: string | null;
  vehicle_year?: number | null;
  
  verification_status?: string | null;
  verification_code?: string | null;
  monto_total?: number | null;
  mano_de_obra?: number | null;
  repuestos?: number | null;
  observaciones?: string | null;
}

export interface IncidentDetailResponse {
  id_incidente: string;
  id_vehiculo: string;
  id_taller: string | null;
  id_sucursal?: string | null;
  branch_name?: string | null;
  descripcion: string | null;
  telefono: string | null;
  latitud?: number;
  longitud?: number;
  estado_incidente: string;
  prioridad_incidente: string;
  transcripcion_audio: string | null;
  resumen_ia: string | null;
  analisis_consolidado: string | null;
  fecha_reporte?: string;
  evidencias: EvidenceResponse[];
}

export interface TecnicoCreate {
  nombre: string;
  telefono?: string;
  email?: string;
}

export interface TecnicoResponse {
  id_tecnico: string;
  id_taller: string;
  id_sucursal?: string | null;
  branch_name?: string | null;
  nombre: string;
  telefono: string;
  estado: boolean;
  temp_password?: string;
}

export interface IncidentAccept {
  id_tecnico: string;
}

export interface SucursalCreate {
  nombre: string;
  telefono?: string;
  direccion: string;
  latitud: number;
  longitud: number;
}

export interface SucursalResponse {
  id_sucursal: string;
  id_taller: string;
  nombre: string;
  telefono?: string;
  email?: string | null;
  direccion: string;
  latitud?: number;
  longitud?: number;
  estado: boolean;
  fecha_creacion: string;
}

export interface AsignarAdminSucursal {
  id_usuario: string;
  id_sucursal: string;
}
