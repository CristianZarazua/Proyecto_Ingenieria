'use client';

import { useEffect, useState } from 'react';
import { apiSistema } from '@/servicios/apiSistema';
import { Usuario, Licenciatura, TicketProceso } from '@/tipos/sistema';

export default function TicketsPage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [licenciaturas, setLicenciaturas] = useState<Licenciatura[]>([]);
  const [tickets, setTickets] = useState<TicketProceso[]>([]);

  // Formulario de nuevo ticket (Jefatura)
  const [tipo, setTipo] = useState<'PRORROGA_FECHA' | 'DUDA_PROCEDIMIENTO' | 'ACLARACION_OBSERVACION'>('PRORROGA_FECHA');
  const [asunto, setAsunto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [respuestas, setRespuestas] = useState<Record<number, string>>({});
  const [mensaje, setMensaje] = useState('');

  const cargar = (sesion: Usuario) => {
    const filtro = sesion.rol === 'JEFATURA' ? sesion.licenciaturaId : null;
    setTickets(apiSistema.obtenerTickets(filtro));
  };

  useEffect(() => {
    const sesion = apiSistema.obtenerSesion();
    if (!sesion) return;
    setUsuario(sesion);
    setLicenciaturas(apiSistema.obtenerLicenciaturas());
    cargar(sesion);
  }, []);

  const enviarTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario || !usuario.licenciaturaId) return;

    apiSistema.crearTicket({
      licenciaturaId: usuario.licenciaturaId,
      creadoPor: usuario.email,
      tipo,
      asunto: asunto.trim(),
      descripcion: descripcion.trim(),
    });

    setAsunto('');
    setDescripcion('');
    setMensaje('Solicitud enviada a la Unidad de Planeación.');
    cargar(usuario);
  };

  const atenderTicket = (ticketId: number) => {
    if (!usuario) return;
    const texto = respuestas[ticketId];
    if (!texto || !texto.trim()) {
      alert('Escriba una respuesta antes de cerrar el ticket.');
      return;
    }
    apiSistema.responderTicket(ticketId, texto.trim());
    setMensaje('Ticket respondido y notificado a la coordinación.');
    cargar(usuario);
  };

  if (!usuario) return null;

  const esPlaneacion = usuario.rol === 'ADMINISTRADOR' || usuario.rol === 'PLANEADOR';

  const nombreLic = (id: number) =>
    licenciaturas.find((l) => l.id === id)?.nombre || 'Licenciatura';

  const etiquetaTipo: Record<TicketProceso['tipo'], string> = {
    PRORROGA_FECHA: 'Solicitud de Prórroga / Cambio de Fecha',
    DUDA_PROCEDIMIENTO: 'Duda del Procedimiento de Planeación',
    ACLARACION_OBSERVACION: 'Aclaración de Observaciones',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Atención de Tickets del Proceso</h1>
        <p className="text-sm text-slate-600">
          Canal exclusivo para gestionar prórrogas de fechas, dudas metodológicas y aclaraciones del seguimiento.
        </p>
      </div>

      {mensaje && (
        <div className="rounded border border-emerald-300 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
          {mensaje}
        </div>
      )}

      {usuario.rol === 'JEFATURA' && (
        <form
          onSubmit={enviarTicket}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm text-sm"
        >
          <h2 className="text-base font-bold text-slate-800">Levantar Nueva Solicitud a Planeación</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block font-medium text-slate-700">Motivo de la solicitud</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as any)}
                className="w-full rounded border border-slate-300 px-3 py-2"
              >
                <option value="PRORROGA_FECHA">Solicitud de Prórroga / Cambio de Fecha</option>
                <option value="DUDA_PROCEDIMIENTO">Duda del Procedimiento de Planeación</option>
                <option value="ACLARACION_OBSERVACION">Aclaración de Observaciones</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block font-medium text-slate-700">Asunto breve</label>
              <input
                type="text"
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                placeholder="Ej. Solicitud de ampliación de fecha para indicador 3.2"
                required
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700">Detalle de la consulta o propuesta</label>
            <textarea
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describa su consulta operativa o la fecha propuesta para acuerdo con Planeación..."
              required
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded bg-[#0B2545] px-4 py-2 text-xs font-semibold text-white hover:bg-[#134074]"
            >
              Enviar Ticket
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {tickets.map((t) => (
          <div key={t.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div>
                <span className="text-xs font-semibold text-[#134074]">
                  {nombreLic(t.licenciaturaId)} • {etiquetaTipo[t.tipo]}
                </span>
                <h3 className="text-sm font-bold text-slate-900">{t.asunto}</h3>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  t.estatus === 'ABIERTO'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {t.estatus}
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-700">{t.descripcion}</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Registrado por {t.creadoPor} el {t.fechaCreacion}
            </p>

            {t.respuestaPlaneacion ? (
              <div className="mt-3 rounded border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                <strong>Respuesta de la Unidad de Planeación:</strong> {t.respuestaPlaneacion}
              </div>
            ) : (
              esPlaneacion && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={respuestas[t.id] || ''}
                    onChange={(e) => setRespuestas({ ...respuestas, [t.id]: e.target.value })}
                    placeholder="Escriba la resolución o acuerdo para la coordinación..."
                    className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => atenderTicket(t.id)}
                    className="rounded bg-[#0B2545] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#134074]"
                  >
                    Responder y Resolver
                  </button>
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
