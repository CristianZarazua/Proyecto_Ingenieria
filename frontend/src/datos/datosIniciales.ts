import { Licenciatura, Usuario, RecomendacionPlan, TicketProceso } from '@/tipos/sistema';

export const LICENCIATURAS_INICIALES: Licenciatura[] = [
  { id: 1, nombre: 'Actuaría', activa: true },
  { id: 2, nombre: 'Arquitectura', activa: true },
  { id: 3, nombre: 'Ciencias Políticas y Administración Pública', activa: true },
  { id: 4, nombre: 'Comunicación', activa: true },
  { id: 5, nombre: 'Derecho', activa: true },
  { id: 6, nombre: 'Diseño Gráfico', activa: true },
  { id: 7, nombre: 'Economía', activa: true },
  { id: 8, nombre: 'Enseñanza de Alemán como Lengua Extranjera', activa: true },
  { id: 9, nombre: 'Enseñanza de Español como Lengua Extranjera', activa: true },
  { id: 10, nombre: 'Enseñanza de Francés como Lengua Extranjera', activa: true },
  { id: 11, nombre: 'Enseñanza de Inglés como Lengua Extranjera', activa: true },
  { id: 12, nombre: 'Enseñanza de Italiano como Lengua Extranjera', activa: true },
  { id: 13, nombre: 'Filosofía', activa: true },
  { id: 14, nombre: 'Historia', activa: true },
  { id: 15, nombre: 'Ingeniería Civil', activa: true },
  { id: 16, nombre: 'Lengua y Literaturas Hispánicas', activa: true },
  { id: 17, nombre: 'Matemáticas Aplicadas y Computación', activa: true },
  { id: 18, nombre: 'Pedagogía', activa: true },
  { id: 19, nombre: 'Relaciones Internacionales', activa: true },
  { id: 20, nombre: 'Sociología', activa: true },
];

export const USUARIOS_INICIALES: Usuario[] = [
  {
    id: 1,
    nombre: 'Administrador General Planeación',
    email: 'admin.planeacion@pcpuma.acatlan.unam.mx',
    rol: 'ADMINISTRADOR',
    licenciaturaId: null,
    intentosFallidos: 0,
    bloqueado: false,
  },
  {
    id: 2,
    nombre: 'Revisor Unidad de Planeación',
    email: 'revisor.acreditacion@pcpuma.acatlan.unam.mx',
    rol: 'PLANEADOR',
    licenciaturaId: null,
    intentosFallidos: 0,
    bloqueado: false,
  },
  {
    id: 3,
    nombre: 'Jefatura de Carrera MAC',
    email: 'jefatura.mac@pcpuma.acatlan.unam.mx',
    rol: 'JEFATURA',
    licenciaturaId: 17,
    intentosFallidos: 0,
    bloqueado: false,
  },
];

export const PLANES_INICIALES: RecomendacionPlan[] = [
  {
    id: 101,
    licenciaturaId: 17,
    categoria: 'Plan de Estudios',
    indicador: 'Actualización de programas de asignatura',
    recomendacion: 'Actualizar al menos el 80% de las bibliografías básicas de los semestres 5 al 8.',
    acciones: 'Convocar a las academias por área de conocimiento para revisión de temarios.',
    metaMedible: '16 programas actualizados',
    fechaCumplimiento: '2026-12-15',
    porcentajeAvance: 65,
    estatus: 'ENVIADO',
    observacionesPlaneacion: '',
    archivoPdfNombre: 'minuta_academia_mac_2026.pdf',
    archivoPdfUrl: null,
    historialFechas: [],
  },
];

export const TICKETS_INICIALES: TicketProceso[] = [
  {
    id: 501,
    licenciaturaId: 17,
    creadoPor: 'jefatura.mac@pcpuma.acatlan.unam.mx',
    tipo: 'PRORROGA_FECHA',
    asunto: 'Solicitud de ampliación de plazo para evidencia de tutorías',
    descripcion: 'Debido al calendario de inscripciones, solicitamos recorrer 15 días la fecha límite de la recomendación 2.',
    respuestaPlaneacion: '',
    estatus: 'ABIERTO',
    fechaCreacion: '2026-11-12',
  },
];
