'use client';

import { useEffect, useState } from 'react';
import { apiSistema } from '@/servicios/apiSistema';
import {
  Usuario,
  Licenciatura,
  CicloAcreditacion,
  CatalogosSistema,
  RecomendacionPlan,
} from '@/tipos/sistema';

interface ItemRecomendacionForm {
  recomendacion: string;
  acciones: string;
  meta: string;
  areaResponsableId: number;
  fechaCumplimiento: string;
}

export default function PlanesPage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [licenciaturas, setLicenciaturas] = useState<Licenciatura[]>([]);
  const [ciclos, setCiclos] = useState<CicloAcreditacion[]>([]);
  const [catalogos, setCatalogos] = useState<CatalogosSistema | null>(null);
  const [planes, setPlanes] = useState<RecomendacionPlan[]>([]);

  const [licFiltro, setLicFiltro] = useState<number>(0);
  const [cicloFiltro, setCicloFiltro] = useState<number>(0);
  const [accesoDenegado, setAccesoDenegado] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const [mostrarForm, setMostrarForm] = useState(false);
  const [cicloId, setCicloId] = useState<number>(0);
  const [categoriaId, setCategoriaId] = useState<number>(0);
  const [indicadorId, setIndicadorId] = useState<number>(0);
  const [items, setItems] = useState<ItemRecomendacionForm[]>([
    { recomendacion: '', acciones: '', meta: '', areaResponsableId: 0, fechaCumplimiento: '' },
  ]);

  const cargarPlanes = async (licId?: number | null, cicId?: number | null) => {
    try {
      setAccesoDenegado('');
      const lista = await apiSistema.obtenerPlanes(licId || null, cicId || null);
      setPlanes(lista);
    } catch (err: unknown) {
      setAccesoDenegado(err instanceof Error ? err.message : 'Acceso denegado a esta licenciatura.');
      setPlanes([]);
    }
  };

  useEffect(() => {
    const sesion = apiSistema.obtenerSesion();
    if (!sesion) return;
    setUsuario(sesion);

    const paramLic = new URLSearchParams(window.location.search).get('licenciaturaId');
    const licUrl = paramLic ? Number(paramLic) : null;

    Promise.all([
      apiSistema.obtenerLicenciaturas(),
      apiSistema.obtenerCiclos(),
      apiSistema.obtenerCatalogos(),
    ]).then(([lics, cics, cats]) => {
      setLicenciaturas(lics);
      setCiclos(cics);
      setCatalogos(cats);

      const catIni = cats.categorias[0]?.id || 0;
      const indIni = cats.indicadores.find((i) => i.categoriaId === catIni)?.id || 0;
      const areaIni = cats.areas[0]?.id || 0;
      setCategoriaId(catIni);
      setIndicadorId(indIni);
      setItems([{ recomendacion: '', acciones: '', meta: '', areaResponsableId: areaIni, fechaCumplimiento: '' }]);

      if (sesion.rol === 'JEFATURA') {
        const destino = licUrl || sesion.licenciaturaId;
        const ciclosLic = cics.filter((c) => c.licenciaturaId === sesion.licenciaturaId);
        const cicloActivo = ciclosLic.find((c) => c.activo)?.id || ciclosLic[0]?.id || 0;

        setLicFiltro(sesion.licenciaturaId || 0);
        setCicloFiltro(cicloActivo);
        setCicloId(cicloActivo);
        cargarPlanes(destino, cicloActivo || null);
      } else {
        const licInicial = licUrl || 0;
        const ciclosLic = licInicial ? cics.filter((c) => c.licenciaturaId === licInicial) : cics;
        const cicloInicial = licInicial ? (ciclosLic.find((c) => c.activo)?.id || ciclosLic[0]?.id || 0) : 0;

        setLicFiltro(licInicial);
        setCicloFiltro(cicloInicial);
        setCicloId(cicloInicial);
        cargarPlanes(licInicial || null, cicloInicial || null);
      }
    });
  }, []);

  const agregarFilaRecomendacion = () => {
    const areaIni = catalogos?.areas[0]?.id || 0;
    setItems([...items, { recomendacion: '', acciones: '', meta: '', areaResponsableId: areaIni, fechaCumplimiento: '' }]);
  };

  const quitarFila = (idx: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const actualizarFila = (idx: number, campo: keyof ItemRecomendacionForm, valor: string | number) => {
    setItems(items.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)));
  };

  const guardarPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario) return;
    setError('');
    setMensaje('');

    const licDestino = usuario.rol === 'JEFATURA' ? usuario.licenciaturaId : licFiltro;
    if (!licDestino || !cicloId || !categoriaId || !indicadorId) {
      setError('Seleccione licenciatura, ciclo de acreditación, categoría e indicador.');
      return;
    }

    try {
      const res = await apiSistema.guardarPlan({
        cicloId,
        licenciaturaId: licDestino,
        categoriaId,
        indicadorId,
        recomendaciones: items,
      });
      setMensaje((res as { mensaje?: string }).mensaje || 'Plan guardado correctamente.');
      setMostrarForm(false);
      const areaIni = catalogos?.areas[0]?.id || 0;
      setItems([{ recomendacion: '', acciones: '', meta: '', areaResponsableId: areaIni, fechaCumplimiento: '' }]);
      setCicloFiltro(cicloId);
      cargarPlanes(usuario.rol === 'JEFATURA' ? usuario.licenciaturaId : licFiltro || null, cicloId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar el Plan.');
    }
  };

  if (!usuario) return null;

  const indicadoresFiltrados = (catalogos?.indicadores || []).filter((i) => i.categoriaId === categoriaId);
  const ciclosFiltrados = ciclos.filter((c) =>
    usuario.rol === 'JEFATURA' ? c.licenciaturaId === usuario.licenciaturaId : (!licFiltro || c.licenciaturaId === licFiltro)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Plan de Mejora Continua</h1>
          <p className="text-sm text-slate-600">
            Captura y consulta de recomendaciones, acciones, metas y fechas de cumplimiento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {usuario.rol === 'ADMINISTRADOR' && (
            <select
              value={licFiltro}
              onChange={(e) => {
                const id = Number(e.target.value);
                setLicFiltro(id);
                const ciclosDeLic = id ? ciclos.filter((c) => c.licenciaturaId === id) : ciclos;
                const nuevoCiclo = id ? (ciclosDeLic.find((c) => c.activo)?.id || ciclosDeLic[0]?.id || 0) : 0;
                setCicloFiltro(nuevoCiclo);
                setCicloId(nuevoCiclo);
                cargarPlanes(id || null, nuevoCiclo || null);
              }}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value={0}>Todas las licenciaturas</option>
              {licenciaturas.map((l) => (
                <option key={l.id} value={l.id}>{l.nombre}</option>
              ))}
            </select>
          )}

          <select
            value={cicloFiltro}
            onChange={(e) => {
              const cId = Number(e.target.value);
              setCicloFiltro(cId);
              if (cId) setCicloId(cId);
              cargarPlanes(usuario.rol === 'JEFATURA' ? usuario.licenciaturaId : licFiltro || null, cId || null);
            }}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
          >
            {ciclosFiltrados.length === 0 ? (
              <option value={0}>Sin ciclos registrados</option>
            ) : (
              <>
                {usuario.rol === 'ADMINISTRADOR' && licFiltro === 0 && (
                  <option value={0}>Todos los ciclos</option>
                )}
                {ciclosFiltrados.map((c) => (
                  <option key={c.id} value={c.id}>
                    Ciclo: {c.organismoSiglas} ({c.fechaAcreditacion}) {c.activo ? '• Vigente' : '• Histórico'}
                  </option>
                ))}
              </>
            )}
          </select>

          {usuario.rol === 'JEFATURA' && !accesoDenegado && (
            <button
              onClick={() => {
                if (!mostrarForm && cicloFiltro) setCicloId(cicloFiltro);
                setMostrarForm(!mostrarForm);
              }}
              disabled={ciclosFiltrados.length === 0}
              className="rounded bg-[#0B2545] px-4 py-2 text-xs font-semibold text-white hover:bg-[#134074] disabled:opacity-50"
            >
              {mostrarForm ? 'Cerrar captura' : 'Capturar en el Plan'}
            </button>
          )}
        </div>
      </div>

      {usuario.rol === 'JEFATURA' && ciclosFiltrados.length === 0 && !accesoDenegado && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-800">
          Esta licenciatura aún no tiene un ciclo de acreditación registrado. Solicite a la Unidad de Planeación que registre el ciclo para poder capturar.
        </div>
      )}

      {accesoDenegado && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {accesoDenegado}
        </div>
      )}

      {error && <div className="rounded border border-red-300 bg-red-50 p-3 text-xs font-medium text-red-700">{error}</div>}
      {mensaje && <div className="rounded border border-emerald-300 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">{mensaje}</div>}

      {mostrarForm && (
        <form onSubmit={guardarPlan} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 text-sm shadow-sm">
          <h2 className="text-base font-bold text-slate-800">Nueva Captura del Plan</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block font-medium text-slate-700">Ciclo de acreditación</label>
              <select
                value={cicloId}
                onChange={(e) => setCicloId(Number(e.target.value))}
                required
                className="w-full rounded border border-slate-300 px-3 py-2"
              >
                <option value={0}>Seleccione ciclo...</option>
                {ciclosFiltrados.map((c) => (
                  <option key={c.id} value={c.id}>{c.organismoSiglas} ({c.fechaAcreditacion})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block font-medium text-slate-700">Categoría</label>
              <select
                value={categoriaId}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setCategoriaId(id);
                  const primerInd = (catalogos?.indicadores || []).find((i) => i.categoriaId === id)?.id || 0;
                  setIndicadorId(primerInd);
                }}
                required
                className="w-full rounded border border-slate-300 px-3 py-2"
              >
                {(catalogos?.categorias || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block font-medium text-slate-700">Indicador</label>
              <select
                value={indicadorId}
                onChange={(e) => setIndicadorId(Number(e.target.value))}
                required
                className="w-full rounded border border-slate-300 px-3 py-2"
              >
                <option value={0}>Seleccione indicador...</option>
                {indicadoresFiltrados.map((i) => (
                  <option key={i.id} value={i.id}>{i.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx} className="space-y-3 rounded border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-[#0B2545]">Recomendación #{idx + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => quitarFila(idx)} className="text-xs font-semibold text-red-600 hover:underline">
                      Quitar
                    </button>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Recomendación</label>
                  <textarea
                    rows={2}
                    required
                    value={item.recomendacion}
                    onChange={(e) => actualizarFila(idx, 'recomendacion', e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Acciones</label>
                  <textarea
                    rows={2}
                    required
                    value={item.acciones}
                    onChange={(e) => actualizarFila(idx, 'acciones', e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Meta (texto libre)</label>
                    <input
                      type="text"
                      required
                      value={item.meta}
                      onChange={(e) => actualizarFila(idx, 'meta', e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Área responsable</label>
                    <select
                      value={item.areaResponsableId}
                      onChange={(e) => actualizarFila(idx, 'areaResponsableId', Number(e.target.value))}
                      required
                      className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      {(catalogos?.areas || []).map((a) => (
                        <option key={a.id} value={a.id}>{a.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Fecha de cumplimiento</label>
                    <input
                      type="date"
                      required
                      value={item.fechaCumplimiento}
                      onChange={(e) => actualizarFila(idx, 'fechaCumplimiento', e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={agregarFilaRecomendacion}
              className="rounded border border-[#134074] px-3 py-2 text-xs font-semibold text-[#134074] hover:bg-slate-100"
            >
              + Agregar otra recomendación
            </button>

            <button
              type="submit"
              className="rounded bg-[#0B2545] px-5 py-2 text-xs font-semibold text-white hover:bg-[#134074]"
            >
              Guardar Plan
            </button>
          </div>
        </form>
      )}

      {!accesoDenegado && (
        <div className="space-y-3">
          {planes.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              No hay recomendaciones registradas para el ciclo seleccionado.
            </div>
          ) : (
            planes.map((p) => (
              <div key={p.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 text-xs">
                  <span className="font-bold text-[#0B2545]">{p.licenciaturaNombre} • Ciclo {p.cicloEtiqueta}</span>
                  <span className="text-slate-500">Cumplimiento: <strong>{p.fechaCumplimiento}</strong></span>
                </div>
                <p className="mt-2 text-xs font-semibold text-[#134074]">{p.categoriaNombre} — {p.indicadorNombre}</p>
                <p className="mt-2 text-sm text-slate-800"><strong>Recomendación:</strong> {p.recomendacion}</p>
                <p className="mt-1 text-sm text-slate-700"><strong>Acciones:</strong> {p.acciones}</p>
                <div className="mt-2 flex flex-wrap gap-6 text-xs text-slate-600">
                  <span><strong>Meta:</strong> {p.meta}</span>
                  <span><strong>Área responsable:</strong> {p.areaResponsableNombre}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}