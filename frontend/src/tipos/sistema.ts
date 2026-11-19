export type RolUsuario = 'ADMINISTRADOR' | 'JEFATURA';
export type TipoCuenta = 'ADMIN' | 'TITULAR' | 'AUXILIAR';

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
}
