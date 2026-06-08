import { IncidentResponse } from '@core/models/workshops.model';
import { UserResponse } from '@core/models/identity.model';

export interface TallerTenant {
  id_taller: string;
  nombre: string;
  nit: string;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  is_active: boolean;
  latitud?: number | null;
  longitud?: number | null;
}

export interface TallerTenantCreate {
  nombre: string;
  nit: string;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  is_active?: boolean | null;
}

export type UsuarioTenant = UserResponse;
export type IncidenteTenant = IncidentResponse;

export interface BitacoraTenant {
  id_bitacora: string;
  id_usuario_actor: string;
  rol_usuario?: string | null;
  id_taller?: string | null;
  id_sucursal_contexto?: string | null;
  accion: string;
  descripcion?: string | null;
  fecha_hora?: string | null;
}

export interface ActionResultResponse {
  success: boolean;
  message: string;
}

export interface TenantMetricsResponse {
  total_incidentes: number;
  incidentes_abiertos: number;
  total_tecnicos: number;
  sucursales_activas: number;
}

export interface TenantIsolationVerificationResult {
  rol: string;
  id_taller: string | null;
  id_sucursal: string | null;
  puede_acceder: boolean;
  mensaje: string;
}

export interface TenantIsolationState {
  tenant: TallerTenant | null;
  usuarios: UsuarioTenant[];
  tecnicos: UsuarioTenant[];
  incidentes: IncidenteTenant[];
  metricas: TenantMetricsResponse;
  bitacora: BitacoraTenant[];
}
