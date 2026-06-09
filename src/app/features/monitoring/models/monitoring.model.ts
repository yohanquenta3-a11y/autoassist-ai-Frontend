export interface GlobalStats {
  total_talleres: number;
  total_incidentes: number;
  total_comisiones: number;
  emergencias_activas: number;
  rendimiento_operativo: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
    }[];
  };
  puntos_calor: [number, number, number][];
}

export interface AuditLog {
  id_bitacora: string;
  id_usuario?: string | null;
  nombre_usuario?: string | null;
  rol_usuario?: string | null;
  accion: string;
  descripcion?: string;
  ip: string;
  fecha_hora: string;
  tipo_entidad?: string | null;
  id_entidad?: string | null;
  id_taller?: string | null;
  taller_nombre?: string | null;
  id_sucursal?: string | null;
  sucursal_nombre?: string | null;
}

export interface AuditLogFilters {
  usuario_nombre?: string;
  accion?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  id_taller?: string;
  id_sucursal?: string;
  page?: number;
  page_size?: number;
}

export interface AuditLogPage {
  items: AuditLog[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
}

export interface OperationalScope {
  role: string;
  id_taller: string | null;
  id_sucursal: string | null;
  is_global: boolean;
}

export interface LabelValue {
  label: string;
  value: number;
}

export interface OperationalPerformancePoint {
  label: string;
  total_incidentes: number;
  finalizados: number;
  cancelados: number;
  cumplimiento_sla_pct: number | null;
}

export interface DensityPoint {
  latitud: number;
  longitud: number;
  cantidad_incidentes: number;
  prioridad?: string | null;
  estado?: string | null;
  intensidad: number;
}

export interface RankingItem {
  label: string;
  id_taller?: string | null;
  id_sucursal?: string | null;
  total_incidentes: number;
  completados_pct: number;
  cancelados_pct: number;
  cumplimiento_sla_pct: number;
  tiempo_promedio_llegada_min?: number | null;
  tiempo_promedio_finalizacion_min?: number | null;
}

export interface RecentActivityItem {
  id_incidente: string;
  cliente?: string | null;
  vehiculo?: string | null;
  taller?: string | null;
  sucursal?: string | null;
  estado: string;
  prioridad: string;
  fecha_reporte?: string | null;
  resumen?: string | null;
}

export interface OperationalDashboardSummary {
  total_incidentes: number;
  incidentes_activos: number;
  incidentes_finalizados: number;
  incidentes_cancelados: number;
  incidentes_no_atendidos: number;
  tiempo_promedio_asignacion_min?: number | null;
  tiempo_promedio_llegada_min?: number | null;
  tiempo_promedio_finalizacion_min?: number | null;
  cumplimiento_sla_pct?: number | null;
  alertas_sla_activas: number;
}

export interface OperationalDashboardResponse {
  scope: OperationalScope;
  summary: OperationalDashboardSummary;
  series: {
    rendimiento_operativo: OperationalPerformancePoint[];
    incidentes_por_estado: LabelValue[];
    incidentes_por_prioridad: LabelValue[];
    incidentes_por_origen: LabelValue[];
    incidentes_por_tipo: LabelValue[];
    incidentes_por_sucursal: LabelValue[];
    incidentes_por_taller: LabelValue[];
  };
  density: DensityPoint[];
  ranking: RankingItem[];
  recent_activity: RecentActivityItem[];
}

export interface SlaAlertSummary {
  total_alertas: number;
  en_riesgo: number;
  incumplidas: number;
  cumplidas: number;
  sin_datos: number;
}

export interface SlaAlertItem {
  id_incidente: string;
  tipo_alerta: string;
  sla_status: 'CUMPLIDO' | 'EN_RIESGO' | 'INCUMPLIDO' | 'SIN_DATOS';
  estado_actual: string;
  tiempo_actual_min?: number | null;
  limite_sla_min?: number | null;
  tiempo_excedido_min?: number | null;
  taller?: string | null;
  sucursal?: string | null;
  tecnico?: string | null;
  prioridad: string;
  fecha_reporte?: string | null;
  ultimo_evento?: string | null;
}

export interface SlaAlertsResponse {
  scope: OperationalScope;
  summary: SlaAlertSummary;
  alerts: SlaAlertItem[];
}

export interface OperationalDashboardFilters {
  date_from?: string;
  date_to?: string;
  id_taller?: string;
  id_sucursal?: string;
  estado?: string;
  prioridad?: string;
  origen?: string;
}

export interface SlaAlertsFilters {
  date_from?: string;
  date_to?: string;
  id_taller?: string;
  id_sucursal?: string;
  prioridad?: string;
  tipo_alerta?: string;
  sla_status?: string;
  estado_incidente?: string;
}
