'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiSistema } from '@/servicios/apiSistema';
import { Usuario, RecomendacionPlan, TicketProceso } from '@/tipos/sistema';

export default function ResumenTableroPage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [planes, setPlanes] = useState<RecomendacionPlan[]>([]);
  const [tickets, setTickets] = useState<TicketProceso[]>([]);
  const [bloqueados, setBloqueados] = useState<Usuario[]>([]);
  const [totalCarreras, setTotalCarreras] = useState(0);

  useEffect(() => {
    const sesion = apiSistema.obtenerSesion();
    if (!sesion) return;
    setUsuario(sesion);

    const filtroLic = sesion.rol === 'JEFATURA' ? sesion.licenciaturaId : null;
    setPlanes(apiSistema.obtenerPlanes(filtroLic));
    setTickets(apiSistema.obtenerTickets(filtroLic));
    setTotalCarreras(apiSistema.obtenerLicenciaturas().length);

    if (sesion.rol === 'ADMINISTRADOR') {
      setBloqueados(apiSistema.obtenerUsuarios().filter((u) => u.bloqueado));
    }
  }, []);

  if (!usuario) return null;

  const enviados = planes.filter((p) => p.estatus === 'ENVIADO').length;
  const devueltos = planes.filter((p) => p.estatus === 'DEVUELTO').length;
  const validados = planes.filter((p) => p.estatus === 'VALIDADO').length;
  const ticketsAbiertos = tickets.filter((t) => t.estatus === 'ABIERTO').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Panel de Seguimiento Institucional</h1>
        <p className="text-sm text-slate-600">
          Estado general de recomendaciones, evidencias documentales y solicitudes del proceso.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">En Revisión (Planeación)</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{enviados}</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Devueltos con Observaciones</p>
          <p className="mt-2 text-3xl font-bold text-orange-600">{devueltos}</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Recomendaciones Validadas</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{validados}</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Tickets de Proceso Abiertos</p>
          <p className="mt-2 text-3xl font-bold text-[#134074]">{ticketsAbiertos}</p>
        </div>
      </div>

      {usuario.rol === 'ADMINISTRADOR' && bloqueados.length > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-red-800">
                Alerta de Seguridad: {bloqueados.length} cuenta(s) bloqueada(s) por intentos fallidos
              </h2>
              <p className="text-xs text-red-700">
                Usuarios bloqueados: {bloqueados.map((b) => b.email).join(', ')}
              </p>
            </div>
            <Link
              href="/tablero/administracion"
              className="rounded bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
            >
              Gestionar desbloqueos
            </Link>
          </div>
        </div>
      )}

      {devueltos > 0 && (
        <div className="rounded-lg border border-orange-300 bg-orange-50 p-4">
          <h2 className="text-sm font-bold text-orange-900">
            Atención requerida: Existen {devueltos} recomendación(es) devueltas por la Unidad de Planeación
          </h2>
          <p className="mt-1 text-xs text-orange-800">
            Revise los comentarios emitidos en el módulo de Planes y Evidencias PDF para solventar las observaciones.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800">Cobertura Académica Activa</h2>
        <p className="mt-1 text-xs text-slate-600">
          Actualmente el catálogo operativo contempla <strong>{totalCarreras} licenciaturas</strong> habilitadas para seguimiento de acreditación.
        </p>
      </div>
    </div>
  );
}
