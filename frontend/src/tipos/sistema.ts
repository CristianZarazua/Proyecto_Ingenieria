export type RolUsuario = 'ADMINISTRADOR' | 'PLANEADOR' | 'JEFATURA';
export type TipoCuenta = 'ADMIN' | 'TITULAR' | 'AUXILIAR';
export type EstadoPlan = 'BORRADOR' | 'ENVIADO' | 'DEVUELTO' | 'VALIDADO';
export type EstadoSeguimiento = 'BORRADOR' | 'ENVIADO' | 'DEVUELTO' | 'VALIDADO';
export type TipoEvidencia = 'PDF' | 'ENLACE';

export interface ItemPlan {
  recomendacion: string;
  acciones: string;
  meta: string;
  areaResponsableId: number;
  fechaCumplimiento: string;
}

export interface DatosBorradorPlan {
  licenciaturaId: number | null;
  cicloId: number;
  categoriaId: number;
  indicadorId: number;
  recomendaciones: ItemPlan[];
}

export interface BorradorPlan {
  id: number;
  licenciaturaId: number | null;
  datos: DatosBorradorPlan;
  actualizadoEn: string;
}

export interface EvidenciaRecomendacion {
  id: number;
  tipo: TipoEvidencia;
  titulo: string;
  nombreArchivo: string | null;
  urlExterna: string | null;
  tamanoBytes: number | null;
}

export interface SeguimientoRecomendacion {
  recomendacionId: number;
  licenciaturaId: number;
  licenciaturaNombre: string;
  cicloId: number;
  cicloEtiqueta: string;
  categoriaNombre: string;
  indicadorNombre: string;
  recomendacion: string;
  acciones: string;
  meta: string;
  areaResponsableNombre: string;
  fechaCumplimiento: string;
  seguimientoId: number | null;
  porcentajeId: number | null;
  porcentajeAvance: number | null;
  etiquetaAvance: string | null;
  observaciones: string | null;
  estatus: EstadoSeguimiento;
  observacionesPlaneacion: string | null;
  evidencias: EvidenciaRecomendacion[];
}

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
  tipoCuenta: TipoCuenta;
  licenciaturaId: number | null;
  licenciaturaNombre?: string | null;
  activo: boolean;
  bloqueado: boolean;
}

export interface CatCategoria {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface CatIndicador {
  id: number;
  categoriaId: number;
  nombre: string;
  activo: boolean;
}

export interface CatAreaResponsable {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface CatPorcentajeAvance {
  id: number;
  valor: number;
  etiqueta: string;
  activo: boolean;
}

export interface CatOrganismo {
  id: number;
  siglas: string;
  nombre: string;
  activo: boolean;
}

export interface CatalogosSistema {
  categorias: CatCategoria[];
  indicadores: CatIndicador[];
  areas: CatAreaResponsable[];
  porcentajes: CatPorcentajeAvance[];
  organismos: CatOrganismo[];
}

export interface CicloAcreditacion {
  id: number;
  licenciaturaId: number;
  licenciaturaNombre: string;
  organismoId: number;
  organismoSiglas: string;
  organismoNombre: string;
  fechaAcreditacion: string;
  fechaFinAcreditacion: string;
  activo: boolean;
}

export interface RecomendacionPlan {
  id: number;
  cicloId: number;
  cicloEtiqueta: string;
  licenciaturaId: number;
  licenciaturaNombre: string;
  categoriaId: number;
  categoriaNombre: string;
  indicadorId: number;
  indicadorNombre: string;
  areaResponsableId: number;
  areaResponsableNombre: string;
  recomendacion: string;
  acciones: string;
  meta: string;
  fechaCumplimiento: string;
  fechaRegistro: string;
  estatus: EstadoPlan;
  observacionesPlaneacion: string | null;
}
