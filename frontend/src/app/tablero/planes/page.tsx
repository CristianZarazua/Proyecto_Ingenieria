'use client';

import { useEffect, useState } from 'react';
import { apiSistema } from '@/servicios/apiSistema';
import {
  Usuario,
  Licenciatura,
  CicloAcreditacion,
  CatalogosSistema,
  RecomendacionPlan,
  EstadoPlan,
  BorradorPlan,
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
  const [borradores, setBorradores] = useState<BorradorPlan[]>([]);
  const [borradorId, setBorradorId] = useState<number | undefined>();

  const [licFiltro, setLicFiltro] = useState<number>(0);
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

  const cargarPlanes = async (licId?: number | null) => {
    try {
      setAccesoDenegado('');
      const lista = await apiSistema.obtenerPlanes(licId || null);
      setPlanes(lista);
    } catch (err: unknown) {
      setAccesoDenegado(err instanceof Error ? err.message : 'Acceso denegado a esta licenciatura.');
      setPlanes([]);
    }
  };

  const cargarBorradores = async () => {
    try {
      setBorradores(await apiSistema.obtenerBorradores());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron consultar tus borradores.');
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
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
        const licenciaturaInicial = sesion.rol === 'JEFATURA' ? sesion.licenciaturaId : licUrl;
        const cicloInicial = licenciaturaInicial
          ? cics.find((ciclo) => ciclo.licenciaturaId === licenciaturaInicial)?.id || 0
          : 0;
        setCategoriaId(catIni);
        setIndicadorId(indIni);
        setCicloId(cicloInicial);
        setItems([{ recomendacion: '', acciones: '', meta: '', areaResponsableId: areaIni, fechaCumplimiento: '' }]);

        if (sesion.rol === 'JEFATURA') {
          const destino = licUrl || sesion.licenciaturaId;
          setLicFiltro(sesion.licenciaturaId || 0);
          cargarPlanes(destino);
        } else {
          setLicFiltro(licUrl || 0);
          cargarPlanes(licUrl);
        }
      }).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los datos del Plan.');
      });
      if (sesion.rol !== 'PLANEADOR') cargarBorradores();
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
      if (borradorId) {
        try {
          await apiSistema.eliminarBorrador(borradorId);
          setBorradores((actuales) => actuales.filter((borrador) => borrador.id !== borradorId));
          setBorradorId(undefined);
        } catch (err: unknown) {
          setError(err instanceof Error
            ? `El Plan se guardó, pero el borrador no se pudo eliminar: ${err.message}`
            : 'El Plan se guardó, pero el borrador no se pudo eliminar.');
        }
      }
      setMostrarForm(false);
      const areaIni = catalogos?.areas[0]?.id || 0;
      setItems([{ recomendacion: '', acciones: '', meta: '', areaResponsableId: areaIni, fechaCumplimiento: '' }]);
      cargarPlanes(usuario.rol === 'JEFATURA' ? usuario.licenciaturaId : licFiltro || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar el Plan.');
    }
  };

  const guardarBorrador = async () => {
    if (!usuario) return;
    setError('');
    setMensaje('');
    const licenciaturaId = usuario.rol === 'JEFATURA' ? usuario.licenciaturaId : licFiltro || null;
    try {
      const resultado = await apiSistema.guardarBorrador({
        licenciaturaId,
        cicloId,
        categoriaId,
        indicadorId,
        recomendaciones: items,
      }, borradorId);
      if (resultado.id) setBorradorId(resultado.id);
      setMensaje(resultado.mensaje);
      await cargarBorradores();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el borrador.');
    }
  };

  const abrirBorrador = (borrador: BorradorPlan) => {
    setBorradorId(borrador.id);
    setCicloId(borrador.datos.cicloId || 0);
    setCategoriaId(borrador.datos.categoriaId || 0);
    setIndicadorId(borrador.datos.indicadorId || 0);
    setItems(borrador.datos.recomendaciones?.length
      ? borrador.datos.recomendaciones
      : [{ recomendacion: '', acciones: '', meta: '', areaResponsableId: 0, fechaCumplimiento: '' }]);
    if (usuario?.rol !== 'JEFATURA') setLicFiltro(borrador.licenciaturaId || 0);
    setMostrarForm(true);
    setError('');
    setMensaje('');
  };

  const eliminarBorrador = async (borradorIdEliminar: number) => {
    if (!window.confirm('¿Eliminar este borrador? Esta acción no se puede deshacer.')) return;
    try {
      const resultado = await apiSistema.eliminarBorrador(borradorIdEliminar);
      setBorradores((actuales) => actuales.filter((borrador) => borrador.id !== borradorIdEliminar));
      if (borradorId === borradorIdEliminar) setBorradorId(undefined);
      setMensaje(resultado.mensaje);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el borrador.');
    }
  };

  const descargarReporte = async (formato: 'docx' | 'pdf') => {
    if (!usuario || !cicloId) return;
    const licenciaturaId = usuario.rol === 'JEFATURA' ? usuario.licenciaturaId : licFiltro;
    if (!licenciaturaId) { setError('Selecciona una licenciatura para generar el reporte.'); return; }
    try {
      await apiSistema.descargarReporte('plan', formato, cicloId, licenciaturaId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo descargar el reporte.');
    }
  };

  const cambiarEstadoPlan = async (
    planId: number,
    estatus: EstadoPlan,
    correccion?: ItemRecomendacionForm,
    observacionesPlaneacion?: string
  ) => {
    setError('');
    setMensaje('');
    try {
      const resultado = await apiSistema.cambiarEstadoPlan(planId, estatus, correccion, observacionesPlaneacion);
      setMensaje(resultado.mensaje);
      await cargarPlanes(usuario?.rol === 'JEFATURA' ? usuario.licenciaturaId : licFiltro || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado de la recomendación.');
      throw err;
    }
  };

  if (!usuario) return null;

  const indicadoresFiltrados = (catalogos?.indicadores || []).filter((i) => i.categoriaId === categoriaId);
  const ciclosFiltrados = ciclos.filter((c) =>
    usuario.rol === 'JEFATURA' ? c.licenciaturaId === usuario.licenciaturaId : (!licFiltro || c.licenciaturaId === licFiltro)
  );
  const planesDelCiclo = planes.filter((plan) => plan.cicloId === cicloId);

  return (
    <div className="mx-auto w-full max-w-[1700px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="min-w-0 border-l-4 border-[#D4AF37] pl-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#765A10]">Captura y seguimiento</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Plan de Mejora Continua</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Captura y consulta de recomendaciones, acciones, metas y fechas de cumplimiento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {usuario.rol !== 'JEFATURA' && (
            <select
              value={licFiltro}
              onChange={(e) => {
                const id = Number(e.target.value);
                setLicFiltro(id);
                setCicloId(ciclos.find((ciclo) => !id || ciclo.licenciaturaId === id)?.id || 0);
                cargarPlanes(id || null);
              }}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value={0}>Todas las licenciaturas</option>
              {licenciaturas.map((l) => (
                <option key={l.id} value={l.id}>{l.nombre}</option>
              ))}
            </select>
          )}

          {usuario.rol === 'JEFATURA' && !accesoDenegado && (
            <button
              onClick={() => setMostrarForm(!mostrarForm)}
              className="rounded bg-[#0B2545] px-4 py-2 text-xs font-semibold text-white hover:bg-[#134074]"
            >
              {mostrarForm ? 'Cerrar captura' : 'Capturar en el Plan'}
            </button>
          )}
        </div>
      </div>

      {accesoDenegado && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {accesoDenegado}
        </div>
      )}

      {error && <div className="rounded border border-red-300 bg-red-50 p-3 text-xs font-medium text-red-700">{error}</div>}
      {mensaje && <div className="rounded border border-emerald-300 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">{mensaje}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 border-t-4 border-t-[#134074] bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-800">Reporte del Plan de Mejora Continua</h2>
          <p className="mt-1 text-xs text-slate-600">Descarga el ciclo seleccionado en formato editable o PDF.</p>
          <label className="mt-3 block max-w-xl text-xs font-semibold text-slate-700">
            Ciclo de acreditación
            <select value={cicloId} onChange={(e) => setCicloId(Number(e.target.value))} className="mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value={0}>Selecciona un ciclo</option>
              {ciclosFiltrados.map((ciclo) => (
                <option key={ciclo.id} value={ciclo.id}>
                  {ciclo.licenciaturaNombre} · {ciclo.organismoSiglas} · {ciclo.fechaAcreditacion} al {ciclo.fechaFinAcreditacion}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={!cicloId || (usuario.rol !== 'JEFATURA' && !licFiltro)} onClick={() => descargarReporte('docx')} className="rounded bg-[#0B2545] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
              Descargar Word
            </button>
            <button type="button" disabled={!cicloId || (usuario.rol !== 'JEFATURA' && !licFiltro)} onClick={() => descargarReporte('pdf')} className="rounded border border-[#134074] px-3 py-2 text-xs font-semibold text-[#134074] disabled:opacity-50">
              Descargar PDF
            </button>
          </div>
        </section>

        {usuario.rol !== 'PLANEADOR' && <section className="rounded-xl border border-slate-200 border-t-4 border-t-[#D4AF37] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-slate-800">Mis borradores</h2>
              <p className="mt-1 text-xs text-slate-600">Solo tú puedes consultar, editar o eliminar los borradores que creaste.</p>
            </div>
            <button type="button" onClick={cargarBorradores} className="rounded border px-3 py-2 text-xs font-semibold text-slate-700">Actualizar</button>
          </div>
          {borradores.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">Aún no tienes borradores guardados.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-200">
              {borradores.map((borrador) => (
                <li key={borrador.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                  <span>Borrador {borrador.id} · {borrador.actualizadoEn}</span>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => abrirBorrador(borrador)} className="font-semibold text-[#134074] hover:underline">Editar</button>
                    <button type="button" onClick={() => eliminarBorrador(borrador.id)} className="font-semibold text-red-700 hover:underline">Eliminar</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>}
      </div>

      <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="Vista previa del Plan">
        <div className="border-b border-slate-100 p-4">
          <h2 className="font-bold text-slate-800">Vista previa del Plan de Mejora Continua</h2>
          <p className="mt-1 text-xs text-slate-600">Contenido del ciclo seleccionado, con las columnas del formato institucional.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1300px] border-collapse text-left text-xs">
            <thead className="bg-[#0B2545] text-white">
              <tr>
                {['Categoría', 'Indicador', 'Recomendación', 'Acciones para atender la recomendación', 'Metas', 'Área responsable', 'Fecha de cumplimiento'].map((titulo) => (
                  <th key={titulo} className="border border-slate-400 px-3 py-2 align-top">{titulo}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {planesDelCiclo.map((plan) => (
                <tr key={plan.id} className="align-top even:bg-slate-50">
                  {[plan.categoriaNombre, plan.indicadorNombre, plan.recomendacion, plan.acciones, plan.meta, plan.areaResponsableNombre, plan.fechaCumplimiento].map((valor, indice) => (
                    <td key={`${plan.id}-${indice}`} className="whitespace-pre-wrap border border-slate-300 px-3 py-2">{valor}</td>
                  ))}
                </tr>
              ))}
              {planesDelCiclo.length === 0 && (
                <tr><td colSpan={7} className="border border-slate-300 px-3 py-6 text-center text-slate-500">No hay recomendaciones para mostrar en este ciclo.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {mostrarForm && (
        <form onSubmit={guardarPlan} className="space-y-4 rounded-xl border border-slate-200 border-t-4 border-t-[#D4AF37] bg-white p-5 text-sm shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-[#0B2545]">{borradorId ? 'Editar borrador del Plan' : 'Nueva captura del Plan'}</h2>

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
                  <option key={c.id} value={c.id}>{c.organismoSiglas} ({c.fechaAcreditacion} al {c.fechaFinAcreditacion})</option>
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
              <div key={idx} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-5">
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
            <button
              type="button"
              onClick={guardarBorrador}
              className="rounded border border-[#134074] px-4 py-2 text-xs font-semibold text-[#134074] hover:bg-slate-100"
            >
              Guardar borrador
            </button>
          </div>
        </form>
      )}

      {!accesoDenegado && (
        <div className="space-y-3">
          {planes.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              No hay recomendaciones registradas para esta selección.
            </div>
          ) : (
            planes.map((p) => (
              <div key={p.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 text-xs">
                  <span className="font-bold text-[#0B2545]">{p.licenciaturaNombre} • Ciclo {p.cicloEtiqueta}</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded-full px-2.5 py-1 font-semibold ${
                      p.estatus === 'VALIDADO' ? 'bg-emerald-100 text-emerald-800' :
                      p.estatus === 'DEVUELTO' ? 'bg-rose-100 text-rose-800' :
                      p.estatus === 'ENVIADO' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                    }`}>{p.estatus}</span>
                    <span className="text-slate-500">Cumplimiento: <strong>{p.fechaCumplimiento}</strong></span>
                  </div>
                </div>
                <p className="mt-2 text-xs font-semibold text-[#134074]">{p.categoriaNombre} — {p.indicadorNombre}</p>
                <p className="mt-2 text-sm text-slate-800"><strong>Recomendación:</strong> {p.recomendacion}</p>
                <p className="mt-1 text-sm text-slate-700"><strong>Acciones:</strong> {p.acciones}</p>
                <div className="mt-2 flex flex-wrap gap-6 text-xs text-slate-600">
                  <span><strong>Meta:</strong> {p.meta}</span>
                  <span><strong>Área responsable:</strong> {p.areaResponsableNombre}</span>
                </div>
                {p.observacionesPlaneacion && (
                  <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                    <strong>Observaciones de Planeación:</strong> {p.observacionesPlaneacion}
                  </div>
                )}
                {usuario.rol === 'JEFATURA' && p.estatus === 'BORRADOR' && (
                  <button
                    onClick={() => cambiarEstadoPlan(p.id, 'ENVIADO')}
                    className="mt-4 rounded bg-[#0B2545] px-4 py-2 text-xs font-semibold text-white hover:bg-[#134074]"
                  >
                    Enviar a Planeación
                  </button>
                )}
                {usuario.rol === 'JEFATURA' && p.estatus === 'DEVUELTO' && catalogos && (
                  <FormularioCorreccion
                    plan={p}
                    areas={catalogos.areas}
                    onSubmit={(correccion) => cambiarEstadoPlan(p.id, 'ENVIADO', correccion)}
                  />
                )}
                {(usuario.rol === 'ADMINISTRADOR' || usuario.rol === 'PLANEADOR') && p.estatus === 'ENVIADO' && (
                  <AccionesValidacion
                    onDecision={(estatus, observaciones) => cambiarEstadoPlan(p.id, estatus, undefined, observaciones)}
                  />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function AccionesValidacion({ onDecision }: {
  onDecision: (estatus: 'VALIDADO' | 'DEVUELTO', observaciones: string) => Promise<void>;
}) {
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState('');

  const decidir = async (estatus: 'VALIDADO' | 'DEVUELTO') => {
    if (estatus === 'DEVUELTO' && !observaciones.trim()) {
      setErrorLocal('Escribe la observación que verá la jefatura.');
      return;
    }
    setErrorLocal('');
    setGuardando(true);
    try {
      await onDecision(estatus, observaciones);
    } catch {
      setErrorLocal('No se pudo guardar la decisión. Revisa el mensaje de la página e inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="mt-4 space-y-3 rounded border border-slate-200 bg-slate-50 p-4">
      <label className="block text-xs font-semibold text-slate-700">
        Observaciones para la jefatura
        <textarea
          rows={2}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </label>
      {errorLocal && <p className="text-xs text-red-700">{errorLocal}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={guardando}
          onClick={() => decidir('VALIDADO')}
          className="rounded bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          Validar
        </button>
        <button
          type="button"
          disabled={guardando}
          onClick={() => decidir('DEVUELTO')}
          className="rounded bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
        >
          Devolver con observación
        </button>
      </div>
    </div>
  );
}

function FormularioCorreccion({ plan, areas, onSubmit }: {
  plan: RecomendacionPlan;
  areas: CatalogosSistema['areas'];
  onSubmit: (correccion: ItemRecomendacionForm) => Promise<void>;
}) {
  const [correccion, setCorreccion] = useState<ItemRecomendacionForm>({
    recomendacion: plan.recomendacion,
    acciones: plan.acciones,
    meta: plan.meta,
    areaResponsableId: plan.areaResponsableId,
    fechaCumplimiento: plan.fechaCumplimiento,
  });
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState('');

  const actualizar = (campo: keyof ItemRecomendacionForm, valor: string | number) => {
    setCorreccion((actual) => ({ ...actual, [campo]: valor }));
  };

  const reenviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal('');
    setGuardando(true);
    try {
      await onSubmit(correccion);
    } catch {
      setErrorLocal('No se pudo reenviar la recomendación. Revisa el mensaje de la página e inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={reenviar} className="mt-4 space-y-3 rounded border border-rose-200 bg-rose-50/50 p-4">
      <p className="text-xs font-bold text-rose-900">Corrige la recomendación devuelta por Planeación</p>
      <label className="block text-xs font-medium text-slate-700">
        Recomendación
        <textarea required value={correccion.recomendacion} onChange={(e) => actualizar('recomendacion', e.target.value)} className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm" />
      </label>
      <label className="block text-xs font-medium text-slate-700">
        Acciones
        <textarea required value={correccion.acciones} onChange={(e) => actualizar('acciones', e.target.value)} className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm" />
      </label>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block text-xs font-medium text-slate-700">
          Meta
          <input required value={correccion.meta} onChange={(e) => actualizar('meta', e.target.value)} className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm" />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          Área responsable
          <select required value={correccion.areaResponsableId} onChange={(e) => actualizar('areaResponsableId', Number(e.target.value))} className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm">
            {areas.map((area) => <option key={area.id} value={area.id}>{area.nombre}</option>)}
          </select>
        </label>
        <label className="block text-xs font-medium text-slate-700">
          Fecha de cumplimiento
          <input required type="date" value={correccion.fechaCumplimiento} onChange={(e) => actualizar('fechaCumplimiento', e.target.value)} className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm" />
        </label>
      </div>
      {errorLocal && <p className="text-xs text-red-700">{errorLocal}</p>}
      <button type="submit" disabled={guardando} className="rounded bg-[#0B2545] px-4 py-2 text-xs font-semibold text-white hover:bg-[#134074] disabled:opacity-50">
        Corregir y reenviar
      </button>
    </form>
  );
}
