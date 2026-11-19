'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { apiSistema } from '@/servicios/apiSistema';
import { Usuario } from '@/tipos/sistema';

export default function TableroLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [nombreCarrera, setNombreCarrera] = useState('');

  useEffect(() => {
    const sesion = apiSistema.obtenerSesion();
    if (!sesion) {
      router.replace('/login');
      return;
    }
    setUsuario(sesion);
    if (sesion.licenciaturaId) {
      apiSistema.obtenerLicenciaturas()
        .then((lics) => {
          const lic = lics.find((l) => l.id === sesion.licenciaturaId);
          setNombreCarrera(lic ? lic.nombre : '');
        })
        .catch(() => {});
    }
  }, [router]);

  const salir = () => {
    apiSistema.cerrarSesion();
    router.push('/login');
  };

  if (!usuario) return null;

  const enlaces = [
    { href: '/tablero', label: 'Inicio' },
    { href: '/tablero/planes', label: 'Captura y Consulta del Plan' },
  ];

  if (usuario.rol === 'ADMINISTRADOR') {
    enlaces.push({ href: '/tablero/administracion', label: 'Cuentas, Catálogos y Ciclos' });
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <aside className="sidebar-unam-animada flex w-64 flex-col bg-[#0B2545] text-white shadow-xl">
        <div className="border-b border-white/15 px-5 py-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">FES Acatlán • UNAM</p>
          <h2 className="mt-1 text-base font-bold leading-tight text-white">Mejora Continua</h2>
          <p className="mt-1 text-xs text-slate-200/80">Unidad de Planeación</p>
        </div>

        <nav className="flex-1 space-y-1.5 px-3 py-4">
          {enlaces.map((item) => {
            const activo = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2.5 text-sm font-medium transition ${
                  activo
                    ? 'border-l-4 border-[#D4AF37] bg-white/15 text-white shadow-sm'
                    : 'text-slate-100/90 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/15 p-4 text-xs text-slate-200/75">ORVANT Technologies • 2026</div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5">
          <div>
            <span className="inline-block rounded bg-[#0B2545] px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
              {usuario.rol}
            </span>
            {nombreCarrera && (
              <span className="ml-2 text-xs font-semibold text-[#134074]">Licenciatura en {nombreCarrera}</span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-800">{usuario.nombre}</p>
              <p className="text-[11px] text-slate-500">{usuario.email}</p>
            </div>
            <button
              onClick={salir}
              className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
