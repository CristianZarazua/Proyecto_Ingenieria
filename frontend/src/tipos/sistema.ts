export type RolUsuario = 'ADMINISTRADOR' | 'PLANEADOR' | 'JEFATURA';

export type EstatusDocumento = 'BORRADOR' | 'ENVIADO' | 'DEVUELTO' | 'VALIDADO';

export interface Licenciatura {
  id: number;
  nombre: string;
  activa: boolean;
}

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
  licenciaturaId: number | null;
  intentosFallidos: number;
  bloqueado: boolean;
  codigoOtp?: string;
}

export interface CambioFecha {
  id: number;
  fechaAnterior: string;
  fechaNueva: string;
  motivo: string;
  autor: string;
  fechaRegistro: string;
}

export interface RecomendacionPlan {
  id: number;
  licenciaturaId: number;
  categoria: string;
  indicador: string;
  recomendacion: string;
  acciones: string;
  metaMedible: string;
  fechaCumplimiento: string;
  porcentajeAvance: number;
  estatus: EstatusDocumento;
  observacionesPlaneacion: string;
  archivoPdfNombre: string | null;
  archivoPdfUrl: string | null;
  historialFechas: CambioFecha[];
}

export interface TicketProceso {
  id: number;
  licenciaturaId: number;
  creadoPor: string;
  tipo: 'PRORROGA_FECHA' | 'DUDA_PROCEDIMIENTO' | 'ACLARACION_OBSERVACION';
  asunto: string;
  descripcion: string;
  respuestaPlaneacion: string;
  estatus: 'ABIERTO' | 'RESUELTO';
  fechaCreacion: string;
}
