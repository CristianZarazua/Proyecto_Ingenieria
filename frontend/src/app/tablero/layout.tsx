'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { apiSistema } from '@/servicios/apiSistema';
import { Usuario } from '@/tipos/sistema';

export default function TableroLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [nombreCarrera, setNombreCarrera] = useState('');
  const [modoOscuro, setModoOscuro] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  useEffect(() => {
    Promise.resolve().then(() => {
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
      setModoOscuro(localStorage.getItem('smc_tema') === 'oscuro');
      const preferenciaSidebar = localStorage.getItem('smc_sidebar');
      setSidebarVisible(preferenciaSidebar ? preferenciaSidebar === 'visible' : window.innerWidth >= 768);
    });
  }, [router]);

  const alternarTema = () => {
    setModoOscuro((actual) => {
      const nuevoTema = !actual;
      localStorage.setItem('smc_tema', nuevoTema ? 'oscuro' : 'claro');
      return nuevoTema;
    });
  };

  const alternarSidebar = () => {
    const nuevaVisibilidad = !sidebarVisible;
    setSidebarVisible(nuevaVisibilidad);
    localStorage.setItem('smc_sidebar', nuevaVisibilidad ? 'visible' : 'oculta');
  };

  const salir = () => {
    apiSistema.cerrarSesion();
    router.push('/login');
  };

  if (!usuario) return null;

  const enlaces = [
    { href: '/tablero', label: 'Inicio' },
    { href: '/tablero/planes', label: 'Captura y Consulta del Plan' },
    { href: '/tablero/informe', label: 'Informe de Seguimiento' },
  ];

  if (usuario.rol === 'ADMINISTRADOR' || usuario.rol === 'PLANEADOR') {
    enlaces.push({
      href: '/tablero/administracion',
      label: usuario.rol === 'ADMINISTRADOR' ? 'Cuentas, Catálogos y Ciclos' : 'Catálogos y Ciclos',
    });
  }

  return (
    <div className={`tablero-app flex min-h-screen min-w-0 bg-[#F1F5F9] ${modoOscuro ? 'tema-oscuro' : ''}`}>
      {sidebarVisible && (
        <aside id="navegacion-principal" className="sidebar-unam-animada sticky top-0 flex h-screen w-64 shrink-0 flex-col overflow-y-auto bg-[#0B2545] text-white shadow-xl">
          <div className="border-b border-white/15 px-5 py-5">
            <div className="flex items-center gap-3 rounded-md bg-white/10 p-3">
              <Image src="/logos/fes-blanco.png" alt="Logotipo de FES Acatlán" width={48} height={53} className="h-[53px] w-12 shrink-0 object-contain" />
              <div className="min-w-0">
                <h2 className="text-base font-bold leading-tight text-white">Mejora Continua</h2>
                <p className="mt-1 text-xs text-slate-200/80">Unidad de Planeación</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1.5 px-3 py-4" aria-label="Navegación principal">
            {enlaces.map((item) => {
              const activo = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={activo ? 'page' : undefined}
                  className={`block break-words rounded-md px-3 py-2.5 text-sm font-medium transition ${
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
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3.5 shadow-sm sm:px-6">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={alternarSidebar}
              aria-expanded={sidebarVisible}
              aria-controls={sidebarVisible ? 'navegacion-principal' : undefined}
              aria-label={sidebarVisible ? 'Ocultar barra lateral' : 'Mostrar barra lateral'}
              className="inline-flex shrink-0 items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <span className="hidden sm:inline">{sidebarVisible ? 'Ocultar menú' : 'Mostrar menú'}</span>
            </button>
            <span className="inline-block shrink-0 rounded bg-[#0B2545] px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
              {usuario.rol}
            </span>
            {nombreCarrera && (
              <span className="min-w-0 text-xs font-semibold text-[#134074]">Licenciatura en {nombreCarrera}</span>
            )}
          </div>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-3 sm:gap-4">
            <button
              type="button"
              onClick={alternarTema}
              aria-pressed={modoOscuro}
              aria-label={modoOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
            >
              <span aria-hidden="true" className="text-base">{modoOscuro ? '☀' : '☾'}</span>
              <span className="hidden sm:inline">{modoOscuro ? 'Modo claro' : 'Modo oscuro'}</span>
            </button>
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

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
