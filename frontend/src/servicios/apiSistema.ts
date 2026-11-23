import {
  Usuario,
  Licenciatura,
  CatalogosSistema,
  CicloAcreditacion,
  RecomendacionPlan,
  EstadoPlan,
  BorradorPlan,
  DatosBorradorPlan,
  EvidenciaRecomendacion,
  EstadoSeguimiento,
  RolUsuario,
  SeguimientoRecomendacion,
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

async function peticionArchivo<T>(ruta: string, archivo: FormData): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(KEY_TOKEN) : null;
  const res = await fetch(`/api${ruta}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: archivo,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.mensaje || `Error HTTP ${res.status}`);
  return data as T;
}

async function descargar(ruta: string, nombre: string): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(KEY_TOKEN) : null;
  const res = await fetch(`/api${ruta}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.mensaje || `Error HTTP ${res.status}`);
  }
  const objectUrl = URL.createObjectURL(await res.blob());
  const enlace = document.createElement('a');
  enlace.href = objectUrl;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(objectUrl);
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

  crearUsuario(datos: { nombre: string; email: string; rol: Exclude<RolUsuario, 'ADMINISTRADOR'>; tipoCuenta: TipoCuenta; licenciaturaId: number | null }) {
    return peticion('/usuarios', { method: 'POST', body: JSON.stringify(datos) });
  },

  crearUsuariosLote(datos: {
    emails: string[];
    rol: Exclude<RolUsuario, 'ADMINISTRADOR'>;
    tipoCuenta: TipoCuenta;
    licenciaturaId: number | null;
  }): Promise<{ mensaje: string; creadas: number }> {
    return peticion('/usuarios/lote', { method: 'POST', body: JSON.stringify(datos) });
  },

  editarUsuario(id: number, datos: { nombre: string; email: string; rol: Exclude<RolUsuario, 'ADMINISTRADOR'>; tipoCuenta: TipoCuenta; licenciaturaId: number | null; activo: boolean }) {
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

  crearCiclo(datos: { licenciaturaId: number; organismoId: number; fechaAcreditacion: string; fechaFinAcreditacion: string }) {
    return peticion('/ciclos', { method: 'POST', body: JSON.stringify(datos) });
  },

  editarCiclo(id: number, datos: { licenciaturaId: number; organismoId: number; fechaAcreditacion: string; fechaFinAcreditacion: string; activo: boolean }) {
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

  cambiarEstadoPlan(id: number, estatus: EstadoPlan, correccion?: {
    recomendacion: string;
    acciones: string;
    meta: string;
    areaResponsableId: number;
    fechaCumplimiento: string;
  }, observacionesPlaneacion?: string) {
    return peticion<{ mensaje: string }>(`/planes/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estatus, ...correccion, observacionesPlaneacion }),
    });
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

  obtenerBorradores(): Promise<BorradorPlan[]> {
    return peticion<BorradorPlan[]>('/borradores');
  },

  guardarBorrador(datos: DatosBorradorPlan, id?: number) {
    return peticion<{ id?: number; mensaje: string }>(id ? `/borradores/${id}` : '/borradores', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify({ datos }),
    });
  },

  eliminarBorrador(id: number) {
    return peticion<{ mensaje: string }>(`/borradores/${id}`, { method: 'DELETE' });
  },

  obtenerSeguimiento(filtros: { licenciaturaId?: number | null; cicloId?: number | null } = {}) {
    const query = new URLSearchParams();
    if (filtros.licenciaturaId) query.set('licenciaturaId', String(filtros.licenciaturaId));
    if (filtros.cicloId) query.set('cicloId', String(filtros.cicloId));
    return peticion<SeguimientoRecomendacion[]>(`/seguimiento${query.size ? `?${query}` : ''}`);
  },

  guardarSeguimiento(recomendacionId: number, porcentajeId: number | null, observaciones: string) {
    return peticion<{ mensaje: string }>(`/seguimiento/${recomendacionId}`, {
      method: 'PUT',
      body: JSON.stringify({ porcentajeId, observaciones }),
    });
  },

  cambiarEstadoSeguimiento(recomendacionId: number, estatus: EstadoSeguimiento, observacionesPlaneacion?: string) {
    return peticion<{ mensaje: string }>(`/seguimiento/${recomendacionId}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estatus, observacionesPlaneacion }),
    });
  },

  agregarEvidenciaPdf(recomendacionId: number, archivo: File) {
    const formulario = new FormData();
    formulario.append('archivo', archivo);
    return peticionArchivo<{ id: number; mensaje: string }>(
      `/seguimiento/${recomendacionId}/evidencias/pdf`,
      formulario
    );
  },

  agregarEvidenciaEnlace(recomendacionId: number, titulo: string, url: string) {
    return peticion<{ id: number; mensaje: string }>(`/seguimiento/${recomendacionId}/evidencias/enlace`, {
      method: 'POST',
      body: JSON.stringify({ titulo, url }),
    });
  },

  eliminarEvidencia(id: number) {
    return peticion<{ mensaje: string }>(`/seguimiento/evidencias/${id}`, { method: 'DELETE' });
  },

  descargarEvidencia(evidencia: EvidenciaRecomendacion) {
    return descargar(`/seguimiento/evidencias/${evidencia.id}/archivo`, evidencia.nombreArchivo || evidencia.titulo);
  },

  descargarReporte(tipo: 'plan' | 'informe', formato: 'docx' | 'pdf', cicloId: number, licenciaturaId: number) {
    const query = new URLSearchParams({ cicloId: String(cicloId), licenciaturaId: String(licenciaturaId) });
    return descargar(`/reportes/${tipo}/${formato}?${query}`, `${tipo}-ciclo-${cicloId}.${formato}`);
  },
};
