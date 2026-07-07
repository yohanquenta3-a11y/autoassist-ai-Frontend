export interface TransferHistory {
  id_historial: string;
  id_traslado: string;
  estado_anterior?: string | null;
  estado_nuevo: string;
  historial_actor?: string | null;
  id_usuario_actor?: string | null;
  comentario?: string | null;
  fecha: string;
}

export interface VehicleTransfer {
  id_traslado: string;
  tipo_traslado: 'FLETE_INMEDIATO' | 'PREVENTIVO' | string;
  estado: string;
  id_cliente: string;
  id_vehiculo: string;
  id_taller?: string | null;
  id_sucursal?: string | null;
  id_tecnico?: string | null;
  origen_direccion: string;
  origen_latitud?: string | number | null;
  origen_longitud?: string | number | null;
  destino_direccion: string;
  destino_latitud?: string | number | null;
  destino_longitud?: string | number | null;
  fecha_programada?: string | null;
  motivo: string;
  observaciones?: string | null;
  telefono_contacto?: string | null;
  creado_por: string;
  rol_creador: string;
  fecha_creacion: string;
  fecha_modificacion: string;
  cliente_nombre?: string | null;
  cliente_telefono?: string | null;
  vehiculo_matricula?: string | null;
  vehiculo_marca?: string | null;
  vehiculo_modelo?: string | null;
  vehiculo_color?: string | null;
  vehiculo_ano?: number | null;
  taller_nombre?: string | null;
  sucursal_nombre?: string | null;
  tecnico_nombre?: string | null;
  tecnico_telefono?: string | null;
  historial: TransferHistory[];
}

export interface TransferFilters {
  estado?: string;
  tipoTraslado?: string;
  search?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  idTecnico?: string;
}
