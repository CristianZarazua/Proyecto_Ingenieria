'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiSistema } from '@/servicios/apiSistema';
import {
  CicloAcreditacion,
  EstadoPlan,
  Licenciatura,
  RecomendacionPlan,
  SeguimientoRecomendacion,
  Usuario,
} from '@/tipos/sistema';

const COLORES_AVANCE = {
  atendidas: '#16845B',
  proceso: '#C29324',
  sinIniciar: '#71839A',
};

const ESTADOS_PLAN: Array<{ estado: EstadoPlan; etiqueta: string; color: string }> = [
  { estado: 'VALIDADO', etiqueta: 'Validados', color: '#16845B' },
  { estado: 'ENVIADO', etiqueta: 'En revisión', color: '#3478B7' },
  { estado: 'DEVUELTO', etiqueta: 'Devueltos', color: '#C45161' },
  { estado: 'BORRADOR', etiqueta: 'Borradores propios', color: '#71839A' },
];

type EstadoAvance = 'atendidas' | 'proceso' | 'sinIniciar';

interface GrupoAvance {
  etiqueta: string;
  atendidas: number;
  proceso: number;
  sinIniciar: number;
}

function normalizarAvance(valor: number | null): number {
  return Math.min(100, Math.max(0, valor ?? 0));
}

function clasificarAvance(valor: number | null): EstadoAvance {
  const avance = normalizarAvance(valor);
  if (avance === 100) return 'atendidas';
  return avance > 0 ? 'proceso' : 'sinIniciar';
}

function diasHasta(fecha: string): number | null {
  const fechaObjetivo = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(fechaObjetivo.getTime())) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.ceil((fechaObjetivo.getTime() - hoy.getTime()) / 86_400_000);
}

export default function ResumenTableroPage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [planes, setPlanes] = useState<RecomendacionPlan[]>([]);
  const [seguimientos, setSeguimientos] = useState<SeguimientoRecomendacion[]>([]);
  const [licenciaturas, setLicenciaturas] = useState<Licenciatura[]>([]);
  const [ciclos, setCiclos] = useState<CicloAcreditacion[]>([]);
  const [licenciaturaFiltro, setLicenciaturaFiltro] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargarDatos = useCallback(async (sesion: Usuario) => {
    setCargando(true);
    setError('');
    try {
      const [listaPlanes, listaLicenciaturas, listaCiclos, listaSeguimientos] = await Promise.all([
        apiSistema.obtenerPlanes(sesion.rol === 'JEFATURA' ? sesion.licenciaturaId : null),
        apiSistema.obtenerLicenciaturas(),
        apiSistema.obtenerCiclos(),
        apiSistema.obtenerSeguimiento(),
      ]);
      setPlanes(listaPlanes);
      setLicenciaturas(listaLicenciaturas);
      setCiclos(listaCiclos);
      setSeguimientos(listaSeguimientos);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los datos del tablero.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      const sesion = apiSistema.obtenerSesion();
      if (!sesion) return;
      setUsuario(sesion);
      void cargarDatos(sesion);
    });
  }, [cargarDatos]);

  const licenciaturaActiva = usuario?.rol === 'JEFATURA'
    ? usuario.licenciaturaId || 0
    : licenciaturaFiltro;
  const ciclosVisibles = ciclos.filter((ciclo) =>
    !licenciaturaActiva || ciclo.licenciaturaId === licenciaturaActiva
  );
  const planesVisibles = planes.filter((plan) =>
    !licenciaturaActiva || plan.licenciaturaId === licenciaturaActiva
  );
  const seguimientosVisibles = seguimientos.filter((item) =>
    !licenciaturaActiva || item.licenciaturaId === licenciaturaActiva
  );

  const metricas = useMemo(() => {
    const avance = { atendidas: 0, proceso: 0, sinIniciar: 0 };
    const categorias = new Map<string, { suma: number; total: number }>();
    const ciclosPorGrupo = new Map<string, GrupoAvance>();
    const plazos = { cumplidas: 0, vencidas: 0, proximas: 0, aTiempo: 0, sinFecha: 0 };

    for (const item of seguimientosVisibles) {
      const porcentaje = normalizarAvance(item.porcentajeAvance);
      const estadoAvance = clasificarAvance(item.porcentajeAvance);
      avance[estadoAvance] += 1;

      const categoria = categorias.get(item.categoriaNombre) || { suma: 0, total: 0 };
      categoria.suma += porcentaje;
      categoria.total += 1;
      categorias.set(item.categoriaNombre, categoria);

      const claveCiclo = `${item.licenciaturaNombre} · ${item.cicloEtiqueta}`;
      const grupo = ciclosPorGrupo.get(claveCiclo) || {
        etiqueta: claveCiclo,
        atendidas: 0,
        proceso: 0,
        sinIniciar: 0,
      };
      grupo[estadoAvance] += 1;
      ciclosPorGrupo.set(claveCiclo, grupo);

      const restante = diasHasta(item.fechaCumplimiento);
      if (porcentaje === 100) plazos.cumplidas += 1;
      else if (restante === null) plazos.sinFecha += 1;
      else if (restante < 0) plazos.vencidas += 1;
      else if (restante <= 30) plazos.proximas += 1;
      else plazos.aTiempo += 1;
    }

    const progresoPorCategoria = [...categorias.entries()]
      .map(([etiqueta, datos]) => ({
        etiqueta,
        promedio: Math.round(datos.suma / datos.total),
        total: datos.total,
      }))
      .sort((a, b) => b.promedio - a.promedio);

    const avancePorCiclo = [...ciclosPorGrupo.values()]
      .sort((a, b) =>
        (b.atendidas + b.proceso + b.sinIniciar) - (a.atendidas + a.proceso + a.sinIniciar)
      )
      .slice(0, 6);

    const planesPorEstado = ESTADOS_PLAN.map((item) => ({
      etiqueta: item.etiqueta,
      color: item.color,
      total: planesVisibles.filter((plan) => plan.estatus === item.estado).length,
    }));

    return {
      avance,
      plazos,
      planesPorEstado,
      progresoPorCategoria,
      avancePorCiclo,
      recomendaciones: seguimientosVisibles.length,
    };
  }, [planesVisibles, seguimientosVisibles]);

  if (!usuario) return null;

  const descripcion = usuario.rol === 'ADMINISTRADOR'
    ? 'Panorama institucional de recomendaciones, avances y fechas de cumplimiento.'
    : usuario.rol === 'PLANEADOR'
      ? 'Consulta global para dar seguimiento y revisar los Planes e Informes.'
      : 'Avance y fechas de cumplimiento de las recomendaciones de su licenciatura.';

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#765A10]">Resumen ejecutivo</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Tablero de seguimiento</h1>
          <p className="mt-1 text-sm text-slate-600">{descripcion}</p>
        </div>
        {usuario.rol !== 'JEFATURA' && (
          <label className="min-w-60 text-xs font-semibold text-slate-700">
            Licenciatura
            <select
              value={licenciaturaFiltro}
              onChange={(e) => setLicenciaturaFiltro(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value={0}>Todas las licenciaturas</option>
              {licenciaturas.map((licenciatura) => (
                <option key={licenciatura.id} value={licenciatura.id}>{licenciatura.nombre}</option>
              ))}
            </select>
          </label>
        )}
      </header>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <span>{error}</span>
          <button type="button" onClick={() => void cargarDatos(usuario)} className="rounded border border-red-300 px-3 py-1.5 font-semibold hover:bg-red-100">
            Reintentar
          </button>
        </div>
      )}

      {cargando && (
        <p role="status" className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Cargando indicadores…
        </p>
      )}

      <section
        hidden={cargando || Boolean(error)}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Indicadores principales"
      >
        <Indicador
          etiqueta="Recomendaciones en seguimiento"
          valor={metricas.recomendaciones}
          detalle={`${ciclosVisibles.length} ciclos de acreditación`}
          color="#134074"
        />
        <Indicador
          etiqueta="Atendidas al 100 %"
          valor={metricas.avance.atendidas}
          detalle="Meta concluida"
          color={COLORES_AVANCE.atendidas}
        />
        <Indicador
          etiqueta="En proceso"
          valor={metricas.avance.proceso}
          detalle="Avance de 1 % a 99 %"
          color={COLORES_AVANCE.proceso}
        />
        <Indicador
          etiqueta="Sin iniciar"
          valor={metricas.avance.sinIniciar}
          detalle={`${metricas.plazos.vencidas} recomendaciones vencidas`}
          color={COLORES_AVANCE.sinIniciar}
        />
      </section>

      <section
        hidden={cargando || Boolean(error)}
        className="grid grid-cols-1 gap-4 xl:grid-cols-2"
        aria-label="Gráficas de seguimiento"
      >
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <EncabezadoGrafica titulo="Atención de recomendaciones" descripcion="Clasificación por porcentaje de avance." />
          <GraficaDona
            segmentos={[
              { etiqueta: 'Atendidas · 100 %', total: metricas.avance.atendidas, color: COLORES_AVANCE.atendidas },
              { etiqueta: 'En proceso · 1–99 %', total: metricas.avance.proceso, color: COLORES_AVANCE.proceso },
              { etiqueta: 'No atendidas · 0 %', total: metricas.avance.sinIniciar, color: COLORES_AVANCE.sinIniciar },
            ]}
            total={metricas.recomendaciones}
          />
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <EncabezadoGrafica titulo="Estado de los Planes" descripcion="Recomendaciones visibles según su estado de revisión." />
          <div className="mt-5 space-y-4">
            {metricas.planesPorEstado.map((item) => (
              <Barra
                key={item.etiqueta}
                etiqueta={item.etiqueta}
                valor={item.total}
                maximo={Math.max(1, ...metricas.planesPorEstado.map((estado) => estado.total))}
                color={item.color}
              />
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <EncabezadoGrafica titulo="Avance promedio por categoría" descripcion="Promedio de avance entre las recomendaciones de cada categoría." />
          {metricas.progresoPorCategoria.length ? (
            <div className="mt-5 space-y-4">
              {metricas.progresoPorCategoria.map((item) => (
                <Barra
                  key={item.etiqueta}
                  etiqueta={item.etiqueta}
                  valor={item.promedio}
                  maximo={100}
                  color="#28628F"
                  sufijo="%"
                />
              ))}
            </div>
          ) : <VacioGrafica />}
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <EncabezadoGrafica titulo="Atención por ciclo" descripcion="Distribución de recomendaciones en los ciclos con más registros." />
          {metricas.avancePorCiclo.length ? (
            <>
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-600">
                <Leyenda color={COLORES_AVANCE.atendidas} etiqueta="Atendidas" />
                <Leyenda color={COLORES_AVANCE.proceso} etiqueta="En proceso" />
                <Leyenda color={COLORES_AVANCE.sinIniciar} etiqueta="Sin iniciar" />
              </div>
              <div className="mt-5 space-y-4">
                {metricas.avancePorCiclo.map((grupo) => {
                  const total = grupo.atendidas + grupo.proceso + grupo.sinIniciar;
                  return (
                    <div key={grupo.etiqueta}>
                      <div className="mb-1 flex justify-between gap-3 text-xs text-slate-700">
                        <span className="min-w-0 break-words">{grupo.etiqueta}</span>
                        <strong className="shrink-0">{total}</strong>
                      </div>
                      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${grupo.etiqueta}: ${grupo.atendidas} atendidas, ${grupo.proceso} en proceso, ${grupo.sinIniciar} sin iniciar`}>
                        <span style={{ width: `${(grupo.atendidas / total) * 100}%`, backgroundColor: COLORES_AVANCE.atendidas }} />
                        <span style={{ width: `${(grupo.proceso / total) * 100}%`, backgroundColor: COLORES_AVANCE.proceso }} />
                        <span style={{ width: `${(grupo.sinIniciar / total) * 100}%`, backgroundColor: COLORES_AVANCE.sinIniciar }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : <VacioGrafica />}
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <EncabezadoGrafica titulo="Fechas de cumplimiento" descripcion="Recomendaciones atendidas y pendientes con base en su fecha límite." />
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <IndicadorPlazo etiqueta="Cumplidas" total={metricas.plazos.cumplidas} color={COLORES_AVANCE.atendidas} />
            <IndicadorPlazo etiqueta="Vencidas" total={metricas.plazos.vencidas} color="#C45161" />
            <IndicadorPlazo etiqueta="Próximas · 30 días" total={metricas.plazos.proximas} color={COLORES_AVANCE.proceso} />
            <IndicadorPlazo etiqueta="A tiempo" total={metricas.plazos.aTiempo} color="#3478B7" />
            <IndicadorPlazo etiqueta="Sin fecha válida" total={metricas.plazos.sinFecha} color={COLORES_AVANCE.sinIniciar} />
          </div>
        </article>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/tablero/planes"
          className="rounded-md bg-[#0B2545] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#134074]"
        >
          {usuario.rol === 'JEFATURA' ? 'Ir a Captura y Consulta del Plan' : 'Consultar y revisar Planes'}
        </Link>
        {usuario.rol !== 'JEFATURA' && (
          <Link
            href="/tablero/administracion"
            className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-100"
          >
            {usuario.rol === 'ADMINISTRADOR' ? 'Administrar Cuentas, Catálogos y Ciclos' : 'Administrar Catálogos y Ciclos'}
          </Link>
        )}
      </div>
    </div>
  );
}

function Indicador({ etiqueta, valor, detalle, color }: {
  etiqueta: string;
  valor: number;
  detalle: string;
  color: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{etiqueta}</p>
      <p className="mt-2 border-l-4 pl-3 text-3xl font-bold text-slate-900" style={{ borderColor: color }}>{valor}</p>
      <p className="mt-1 text-xs text-slate-500">{detalle}</p>
    </article>
  );
}

function EncabezadoGrafica({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <header>
      <h2 className="text-base font-bold text-slate-900">{titulo}</h2>
      <p className="mt-1 text-xs text-slate-600">{descripcion}</p>
    </header>
  );
}

function VacioGrafica() {
  return <p className="mt-6 rounded-md bg-slate-50 p-4 text-center text-xs text-slate-500">No hay datos para mostrar con esta selección.</p>;
}

function GraficaDona({ segmentos, total }: {
  segmentos: Array<{ etiqueta: string; total: number; color: string }>;
  total: number;
}) {
  const radio = 43;
  const circunferencia = 2 * Math.PI * radio;
  let recorrido = 0;

  return (
    <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
      <svg viewBox="0 0 120 120" className="h-40 w-40 shrink-0" role="img" aria-label={`Total de recomendaciones: ${total}`}>
        <circle className="donut-track" cx="60" cy="60" r={radio} fill="none" stroke="#E2E8F0" strokeWidth="14" />
        {total > 0 && segmentos.map((segmento) => {
          const longitud = (segmento.total / total) * circunferencia;
          const desplazamiento = recorrido;
          recorrido += longitud;
          return (
            <circle
              key={segmento.etiqueta}
              cx="60"
              cy="60"
              r={radio}
              fill="none"
              stroke={segmento.color}
              strokeWidth="14"
              strokeDasharray={`${longitud} ${circunferencia - longitud}`}
              strokeDashoffset={-desplazamiento}
              transform="rotate(-90 60 60)"
            />
          );
        })}
        <text x="60" y="57" textAnchor="middle" className="fill-slate-900 text-[20px] font-bold">{total}</text>
        <text x="60" y="73" textAnchor="middle" className="fill-slate-500 text-[8px]">recomendaciones</text>
      </svg>
      <div className="w-full max-w-sm space-y-3">
        {segmentos.map((segmento) => (
          <div key={segmento.etiqueta} className="flex items-center justify-between gap-3 text-xs">
            <Leyenda color={segmento.color} etiqueta={segmento.etiqueta} />
            <strong className="text-slate-800">{segmento.total}</strong>
          </div>
        ))}
        {total === 0 && <p className="text-xs text-slate-500">Aún no hay recomendaciones en seguimiento.</p>}
      </div>
    </div>
  );
}

function Barra({ etiqueta, valor, maximo, color, sufijo = '' }: {
  etiqueta: string;
  valor: number;
  maximo: number;
  color: string;
  sufijo?: string;
}) {
  const ancho = maximo ? Math.min(100, (valor / maximo) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between gap-3 text-xs text-slate-700">
        <span className="min-w-0 break-words">{etiqueta}</span>
        <strong className="shrink-0">{valor}{sufijo}</strong>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${etiqueta}: ${valor}${sufijo}`}>
        <div className="h-full rounded-full transition-[width]" style={{ width: `${ancho}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function Leyenda({ color, etiqueta }: { color: string; etiqueta: string }) {
  return (
    <span className="flex items-center gap-2 text-slate-600">
      <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {etiqueta}
    </span>
  );
}

function IndicadorPlazo({ etiqueta, total, color }: { etiqueta: string; total: number; color: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <span className="block h-1.5 rounded-full" style={{ backgroundColor: color }} />
      <p className="mt-3 text-xs font-semibold text-slate-600">{etiqueta}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{total}</p>
    </div>
  );
}
