import {
  Usuario,
  Licenciatura,
  CatalogosSistema,
  CicloAcreditacion,
  RecomendacionPlan,
  RolUsuario,
  TipoCuenta,
} from '@/tipos/sistema';

const KEY_TOKEN = 'smc_token_v1';
const KEY_USUARIO = 'smc_usuario_v1';

async function peticion<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(KEY_TOKEN) : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`/api${ruta}`, { ...opciones, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.mensaje || `Error HTTP ${res.status}`);
  }
  return data as T;
}

export const apiSistema = {
  async solicitarAcceso(email: string): Promise<{ requiereOtp: boolean; codigoSimulado?: string; usuario?: Usuario }> {
    const res = await peticion<{ requiereOtp: boolean; codigoSimulado?: string; token?: string; usuario?: Usuario }>(
      '/auth/solicitar-acceso',
      { method: 'POST', body: JSON.stringify({ email }) }
    );
    if (!res.requiereOtp && res.token && res.usuario) {
      localStorage.setItem(KEY_TOKEN, res.token);
      localStorage.setItem(KEY_USUARIO, JSON.stringify(res.usuario));
    }
    return res;
  },

  async verificarOtp(email: string, codigo: string): Promise<Usuario> {
    const res = await peticion<{ token: string; usuario: Usuario }>('/auth/verificar-otp', {
      method: 'POST',
      body: JSON.stringify({ email, codigo }),
    });
    localStorage.setItem(KEY_TOKEN, res.token);
    localStorage.setItem(KEY_USUARIO, JSON.stringify(res.usuario));
    return res.usuario;
  },

  obtenerSesion(): Usuario | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(KEY_USUARIO);
    return raw ? JSON.parse(raw) : null;
  },

  cerrarSesion(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(KEY_TOKEN);
    localStorage.removeItem(KEY_USUARIO);
  },

  obtenerUsuarios(): Promise<Usuario[]> {
    return peticion<Usuario[]>('/usuarios');
  },

  crearUsuario(datos: { nombre: string; email: string; rol: RolUsuario; tipoCuenta: TipoCuenta; licenciaturaId: number | null }) {
    return peticion('/usuarios', { method: 'POST', body: JSON.stringify(datos) });
  },

  editarUsuario(id: number, datos: { nombre: string; email: string; rol: RolUsuario; tipoCuenta: TipoCuenta; licenciaturaId: number | null; activo: boolean }) {
    return peticion(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(datos) });
  },

  cambiarEstadoUsuario(id: number, activo: boolean) {
    return peticion(`/usuarios/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ activo }) });
  },

  obtenerLicenciaturas(): Promise<Licenciatura[]> {
    return peticion<Licenciatura[]>('/licenciaturas');
  },

  crearLicenciatura(nombre: string) {
    return peticion('/licenciaturas', { method: 'POST', body: JSON.stringify({ nombre }) });
  },

  editarLicenciatura(id: number, nombre: string, activa: boolean) {
    return peticion(`/licenciaturas/${id}`, { method: 'PUT', body: JSON.stringify({ nombre, activa }) });
  },

  obtenerCiclos(): Promise<CicloAcreditacion[]> {
    return peticion<CicloAcreditacion[]>('/ciclos');
  },

  crearCiclo(datos: { licenciaturaId: number; organismoId: number; fechaAcreditacion: string }) {
    return peticion('/ciclos', { method: 'POST', body: JSON.stringify(datos) });
  },

  editarCiclo(id: number, datos: { licenciaturaId: number; organismoId: number; fechaAcreditacion: string; activo: boolean }) {
    return peticion(`/ciclos/${id}`, { method: 'PUT', body: JSON.stringify(datos) });
  },

  obtenerCatalogos(): Promise<CatalogosSistema> {
    return peticion<CatalogosSistema>('/catalogos');
  },

  crearCatalogo(tipo: string, datos: Record<string, unknown>) {
    return peticion(`/catalogos/${tipo}`, { method: 'POST', body: JSON.stringify(datos) });
  },

  editarCatalogo(tipo: string, id: number, datos: Record<string, unknown>) {
    return peticion(`/catalogos/${tipo}/${id}`, { method: 'PUT', body: JSON.stringify(datos) });
  },

  obtenerPlanes(licenciaturaId?: number | null): Promise<RecomendacionPlan[]> {
    const query = licenciaturaId ? `?licenciaturaId=${licenciaturaId}` : '';
    return peticion<RecomendacionPlan[]>(`/planes${query}`);
  },

  guardarPlan(datos: {
    cicloId: number;
    licenciaturaId: number;
    categoriaId: number;
    indicadorId: number;
    recomendaciones: Array<{
      areaResponsableId: number;
      recomendacion: string;
      acciones: string;
      meta: string;
      fechaCumplimiento: string;
    }>;
  }) {
    return peticion('/planes', { method: 'POST', body: JSON.stringify(datos) });
  },
};
