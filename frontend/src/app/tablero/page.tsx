'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiSistema } from '@/servicios/apiSistema';
import { Usuario, RecomendacionPlan, Licenciatura, CicloAcreditacion } from '@/tipos/sistema';

export default function ResumenTableroPage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [planes, setPlanes] = useState<RecomendacionPlan[]>([]);
  const [licenciaturas, setLicenciaturas] = useState<Licenciatura[]>([]);
  const [ciclos, setCiclos] = useState<CicloAcreditacion[]>([]);

  useEffect(() => {
    const sesion = apiSistema.obtenerSesion();
    if (!sesion) return;
    setUsuario(sesion);

    Promise.all([
      apiSistema.obtenerPlanes(sesion.rol === 'JEFATURA' ? sesion.licenciaturaId : null),
      apiSistema.obtenerLicenciaturas(),
      apiSistema.obtenerCiclos(),
    ])
      .then(([p, l, c]) => {
        setPlanes(p);
        setLicenciaturas(l);
        setCiclos(c);
      })
      .catch(() => {});
  }, []);

  if (!usuario) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Sistema de Seguimiento a la Mejora Continua</h1>
        <p className="text-sm text-slate-600">
          {usuario.rol === 'ADMINISTRADOR'
            ? 'Vista global de licenciaturas, ciclos de acreditación y planes capturados.'
            : 'Vista exclusiva de su licenciatura para captura y consulta del Plan de Mejora.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Licenciaturas visibles</p>
          <p className="mt-2 text-3xl font-bold text-[#0B2545]">{licenciaturas.length}</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Ciclos de acreditación</p>
          <p className="mt-2 text-3xl font-bold text-[#134074]">{ciclos.length}</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Recomendaciones capturadas</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{planes.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/tablero/planes"
          className="rounded bg-[#0B2545] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#134074]"
        >
          Ir a Captura y Consulta del Plan
        </Link>
        {usuario.rol === 'ADMINISTRADOR' && (
          <Link
            href="/tablero/administracion"
            className="rounded border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
          >
            Administrar Cuentas, Catálogos y Ciclos
          </Link>
        )}
      </div>
    </div>
  );
}
