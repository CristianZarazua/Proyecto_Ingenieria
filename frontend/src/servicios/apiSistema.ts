import {
  Licenciatura,
  Usuario,
  RecomendacionPlan,
  TicketProceso,
  EstatusDocumento,
  RolUsuario,
} from '@/tipos/sistema';
import {
  LICENCIATURAS_INICIALES,
  USUARIOS_INICIALES,
  PLANES_INICIALES,
  TICKETS_INICIALES,
} from '@/datos/datosIniciales';

const CLAVES_STORAGE = {
  LICENCIATURAS: 'smc_licenciaturas_v1',
  USUARIOS: 'smc_usuarios_v1',
  PLANES: 'smc_planes_v1',
  TICKETS: 'smc_tickets_v1',
  SESION: 'smc_sesion_activa_v1',
};

const DOMINIO_INSTITUCIONAL = '@pcpuma.acatlan.unam.mx';

// PDF minimo valido codificado en Base64 para previsualizar el registro de muestra
const PDF_MUESTRA_BASE64 =
  'data:application/pdf;base64,JVBERi0xLjMKMyAwIG9iago8PC9UeXBlIC9QYWdlCi9QYXJlbnQgMSAwIFIKL1Jlc291cmNlcyA8PC9Gb250IDw8L0YxIDIgMCBSPj4+PgovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDY4Pj4Kc3RyZWFtCkJUCi9GMSAxNCBUZgo1MCA3NTAgVGQKKERvY3VtZW50byBkZSBFdmlkZW5jaWEgUERGIC0gRkVTIEFjYXRsYW4pIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKMSAwIG9iago8PC9UeXBlIC9QYWdlcwovS2lkcyBbMyAwIFJdCi9Db3VudCAxCi9NZWRpYUJveCBbMCAwIDU5NSA4NDJdCj4+CmVuZG9iagoyIDAgb2Jqago8PC9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQo+PgplbmRvYmoKNSAwIG9iago8PC9UeXBlIC9DYXRhbG9nCi9QYWdlcyAxIDAgUgo+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMjE1IDAwMDAwIG4gCjAwMDAwMDAyOTQgMDAwMDAgbiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDk4IDAwMDAwIG4gCjAwMDAwMDAzNjAgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDYKL1Jvb3QgNSAwIFIKPj4Kc3RhcnR4cmVmCjQwOQpPRg==';

function leerColeccion<T>(clave: string, semilla: T[]): T[] {
  if (typeof window === 'undefined') return semilla;
  const guardado = localStorage.getItem(clave);
  if (!guardado) {
    localStorage.setItem(clave, JSON.stringify(semilla));
    return semilla;
  }
  return JSON.parse(guardado);
}

function guardarColeccion<T>(clave: string, datos: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(clave, JSON.stringify(datos));
}

export const apiSistema = {
  validarDominio(email: string): boolean {
    return email.trim().toLowerCase().endsWith(DOMINIO_INSTITUCIONAL);
  },

  // Paso 1 de autenticacion: valida dominio, verifica bloqueo y genera OTP de 6 digitos
  async solicitarAcceso(emailInput: string): Promise<{ requiereOtp: boolean; codigoSimulado?: string; usuario?: Usuario }> {
    const email = emailInput.trim().toLowerCase();

    if (!this.validarDominio(email)) {
      throw new Error(`Solo se permiten correos institucionales con terminación ${DOMINIO_INSTITUCIONAL}`);
    }

    const usuarios = leerColeccion<Usuario>(CLAVES_STORAGE.USUARIOS, USUARIOS_INICIALES);
    const indice = usuarios.findIndex((u) => u.email.toLowerCase() === email);

    if (indice === -1) {
      throw new Error('El correo no se encuentra dado de alta en el padrón del sistema.');
    }

    const usuario = usuarios[indice];

    if (usuario.bloqueado) {
      throw new Error(
        'Cuenta bloqueada por seguridad tras 3 intentos fallidos. Solicite el desbloqueo al Administrador.'
      );
    }

    // El Administrador principal accede sin requerir verificacion OTP
    if (usuario.rol === 'ADMINISTRADOR') {
      usuario.intentosFallidos = 0;
      usuarios[indice] = usuario;
      guardarColeccion(CLAVES_STORAGE.USUARIOS, usuarios);
      localStorage.setItem(CLAVES_STORAGE.SESION, JSON.stringify(usuario));
      return { requiereOtp: false, usuario };
    }

    // Generacion de codigo numerico de 6 digitos para Planeadores y Jefaturas
    const codigoOtp = Math.floor(100000 + Math.random() * 900000).toString();
    usuario.codigoOtp = codigoOtp;
    usuarios[indice] = usuario;
    guardarColeccion(CLAVES_STORAGE.USUARIOS, usuarios);

    return {
      requiereOtp: true,
      codigoSimulado: codigoOtp,
    };
  },

  // Paso 2 de autenticacion: comprueba OTP y aplica bloqueo al tercer fallo consecutivo
  async verificarOtp(emailInput: string, codigoIngresado: string): Promise<Usuario> {
    const email = emailInput.trim().toLowerCase();
    const usuarios = leerColeccion<Usuario>(CLAVES_STORAGE.USUARIOS, USUARIOS_INICIALES);
    const indice = usuarios.findIndex((u) => u.email.toLowerCase() === email);

    if (indice === -1) {
      throw new Error('Usuario no encontrado.');
    }

    const usuario = usuarios[indice];

    if (usuario.bloqueado) {
      throw new Error('Esta cuenta ya se encuentra bloqueada. Contacte al Administrador.');
    }

    if (!usuario.codigoOtp || usuario.codigoOtp !== codigoIngresado.trim()) {
      usuario.intentosFallidos = (usuario.intentosFallidos || 0) + 1;

      if (usuario.intentosFallidos >= 3) {
        usuario.bloqueado = true;
        usuario.codigoOtp = undefined;
        usuarios[indice] = usuario;
        guardarColeccion(CLAVES_STORAGE.USUARIOS, usuarios);
        throw new Error(
          'Ha excedido el límite de 3 intentos fallidos. Su cuenta ha sido bloqueada por seguridad.'
        );
      }

      usuarios[indice] = usuario;
      guardarColeccion(CLAVES_STORAGE.USUARIOS, usuarios);
      throw new Error(
        `Código de verificación incorrecto. Intento ${usuario.intentosFallidos} de 3 antes del bloqueo.`
      );
    }

    usuario.intentosFallidos = 0;
    usuario.codigoOtp = undefined;
    usuarios[indice] = usuario;
    guardarColeccion(CLAVES_STORAGE.USUARIOS, usuarios);
    localStorage.setItem(CLAVES_STORAGE.SESION, JSON.stringify(usuario));

    return usuario;
  },

  obtenerSesion(): Usuario | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(CLAVES_STORAGE.SESION);
    return raw ? JSON.parse(raw) : null;
  },

  cerrarSesion(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(CLAVES_STORAGE.SESION);
  },

  obtenerLicenciaturas(): Licenciatura[] {
    return leerColeccion<Licenciatura>(CLAVES_STORAGE.LICENCIATURAS, LICENCIATURAS_INICIALES);
  },

  agregarLicenciatura(nombre: string): Licenciatura {
    const limpio = nombre.trim();
    if (!limpio) throw new Error('Debe escribir el nombre de la licenciatura.');

    const lista = this.obtenerLicenciaturas();
    if (lista.some((l) => l.nombre.toLowerCase() === limpio.toLowerCase())) {
      throw new Error('Esa licenciatura ya se encuentra registrada en el catálogo.');
    }

    const nueva: Licenciatura = {
      id: Date.now(),
      nombre: limpio,
      activa: true,
    };

    const actualizada = [...lista, nueva].sort((a, b) => a.nombre.localeCompare(b.nombre));
    guardarColeccion(CLAVES_STORAGE.LICENCIATURAS, actualizada);
    return nueva;
  },

  obtenerUsuarios(): Usuario[] {
    return leerColeccion<Usuario>(CLAVES_STORAGE.USUARIOS, USUARIOS_INICIALES);
  },

  registrarUsuario(datos: {
    nombre: string;
    email: string;
    rol: RolUsuario;
    licenciaturaId: number | null;
  }): Usuario {
    const email = datos.email.trim().toLowerCase();
    if (!this.validarDominio(email)) {
      throw new Error(`El correo debe pertenecer al dominio ${DOMINIO_INSTITUCIONAL}`);
    }

    const usuarios = this.obtenerUsuarios();
    if (usuarios.some((u) => u.email.toLowerCase() === email)) {
      throw new Error('Este correo institucional ya tiene una cuenta registrada.');
    }

    // Regla de negocio: maximo 2 cuentas de nivel bajo (JEFATURA) por licenciatura
    if (datos.rol === 'JEFATURA') {
      if (!datos.licenciaturaId) {
        throw new Error('Debe seleccionar una licenciatura para la cuenta de Jefatura o Auxiliar.');
      }
      const cuentasEnCarrera = usuarios.filter(
        (u) => u.rol === 'JEFATURA' && u.licenciaturaId === datos.licenciaturaId
      );
      if (cuentasEnCarrera.length >= 2) {
        throw new Error(
          'Límite alcanzado: cada coordinación de carrera puede tener máximo 2 cuentas registradas.'
        );
      }
    }

    const nuevo: Usuario = {
      id: Date.now(),
      nombre: datos.nombre.trim(),
      email,
      rol: datos.rol,
      licenciaturaId: datos.rol === 'JEFATURA' ? datos.licenciaturaId : null,
      intentosFallidos: 0,
      bloqueado: false,
    };

    guardarColeccion(CLAVES_STORAGE.USUARIOS, [...usuarios, nuevo]);
    return nuevo;
  },

  desbloquearUsuario(usuarioId: number): void {
    const usuarios = this.obtenerUsuarios();
    const actualizados = usuarios.map((u) =>
      u.id === usuarioId ? { ...u, bloqueado: false, intentosFallidos: 0, codigoOtp: undefined } : u
    );
    guardarColeccion(CLAVES_STORAGE.USUARIOS, actualizados);
  },

  obtenerPlanes(licenciaturaId?: number | null): RecomendacionPlan[] {
    const planes = leerColeccion<RecomendacionPlan>(CLAVES_STORAGE.PLANES, PLANES_INICIALES).map((p) =>
      p.archivoPdfNombre && !p.archivoPdfUrl ? { ...p, archivoPdfUrl: PDF_MUESTRA_BASE64 } : p
    );
    if (licenciaturaId) {
      return planes.filter((p) => p.licenciaturaId === licenciaturaId);
    }
    return planes;
  },

  guardarPlan(plan: Omit<RecomendacionPlan, 'id' | 'historialFechas'> & { id?: number }): RecomendacionPlan {
    const planes = leerColeccion<RecomendacionPlan>(CLAVES_STORAGE.PLANES, PLANES_INICIALES);

    if (plan.id) {
      const actualizados = planes.map((item) =>
        item.id === plan.id ? { ...item, ...plan } : item
      );
      guardarColeccion(CLAVES_STORAGE.PLANES, actualizados);
      return actualizados.find((item) => item.id === plan.id)!;
    }

    const nuevo: RecomendacionPlan = {
      ...plan,
      id: Date.now(),
      historialFechas: [],
    };
    guardarColeccion(CLAVES_STORAGE.PLANES, [nuevo, ...planes]);
    return nuevo;
  },

  cambiarEstatusPlan(planId: number, estatus: EstatusDocumento, observaciones: string): void {
    const planes = leerColeccion<RecomendacionPlan>(CLAVES_STORAGE.PLANES, PLANES_INICIALES);
    const actualizados = planes.map((p) =>
      p.id === planId ? { ...p, estatus, observacionesPlaneacion: observaciones } : p
    );
    guardarColeccion(CLAVES_STORAGE.PLANES, actualizados);
  },

  ajustarFechaPlan(planId: number, fechaNueva: string, motivo: string, autor: string): void {
    const planes = leerColeccion<RecomendacionPlan>(CLAVES_STORAGE.PLANES, PLANES_INICIALES);
    const actualizados = planes.map((p) => {
      if (p.id !== planId) return p;
      const registroHistorial = {
        id: Date.now(),
        fechaAnterior: p.fechaCumplimiento,
        fechaNueva,
        motivo,
        autor,
        fechaRegistro: new Date().toISOString().split('T')[0],
      };
      return {
        ...p,
        fechaCumplimiento: fechaNueva,
        historialFechas: [registroHistorial, ...(p.historialFechas || [])],
      };
    });
    guardarColeccion(CLAVES_STORAGE.PLANES, actualizados);
  },

  obtenerTickets(licenciaturaId?: number | null): TicketProceso[] {
    const tickets = leerColeccion<TicketProceso>(CLAVES_STORAGE.TICKETS, TICKETS_INICIALES);
    if (licenciaturaId) {
      return tickets.filter((t) => t.licenciaturaId === licenciaturaId);
    }
    return tickets;
  },

  crearTicket(datos: Omit<TicketProceso, 'id' | 'respuestaPlaneacion' | 'estatus' | 'fechaCreacion'>): TicketProceso {
    const tickets = leerColeccion<TicketProceso>(CLAVES_STORAGE.TICKETS, TICKETS_INICIALES);
    const nuevo: TicketProceso = {
      ...datos,
      id: Date.now(),
      respuestaPlaneacion: '',
      estatus: 'ABIERTO',
      fechaCreacion: new Date().toISOString().split('T')[0],
    };
    guardarColeccion(CLAVES_STORAGE.TICKETS, [nuevo, ...tickets]);
    return nuevo;
  },

  responderTicket(ticketId: number, respuesta: string): void {
    const tickets = leerColeccion<TicketProceso>(CLAVES_STORAGE.TICKETS, TICKETS_INICIALES);
    const actualizados = tickets.map((t) =>
      t.id === ticketId
        ? { ...t, respuestaPlaneacion: respuesta, estatus: 'RESUELTO' as const }
        : t
    );
    guardarColeccion(CLAVES_STORAGE.TICKETS, actualizados);
  },
};
