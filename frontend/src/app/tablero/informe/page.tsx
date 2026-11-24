'use client';

import { useEffect, useState } from 'react';
import { apiSistema } from '@/servicios/apiSistema';
import {
  CatalogosSistema,
  CicloAcreditacion,
  Licenciatura,
  SeguimientoRecomendacion,
  Usuario,
} from '@/tipos/sistema';

export default function InformePage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [licenciaturas, setLicenciaturas] = useState<Licenciatura[]>([]);
  const [ciclos, setCiclos] = useState<CicloAcreditacion[]>([]);
  const [catalogos, setCatalogos] = useState<CatalogosSistema | null>(null);
  const [recomendaciones, setRecomendaciones] = useState<SeguimientoRecomendacion[]>([]);
  const [licenciaturaId, setLicenciaturaId] = useState(0);
  const [cicloId, setCicloId] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const cargarSeguimiento = async (licId: number, cicloSeleccionado: number) => {
    try {
      setError('');
      setRecomendaciones(await apiSistema.obtenerSeguimiento({
        licenciaturaId: licId || null,
        cicloId: cicloSeleccionado || null,
      }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo consultar el Informe.');
      setRecomendaciones([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      const sesion = apiSistema.obtenerSesion();
      if (!sesion) { setCargando(false); return; }
      setUsuario(sesion);
      Promise.all([
        apiSistema.obtenerLicenciaturas(),
        apiSistema.obtenerCiclos(),
        apiSistema.obtenerCatalogos(),
      ]).then(([lics, cics, cats]) => {
        setLicenciaturas(lics);
        setCiclos(cics);
        setCatalogos(cats);
        const licId = sesion.rol === 'JEFATURA' ? sesion.licenciaturaId || 0 : 0;
        const primerCiclo = licId
          ? cics.find((ciclo) => ciclo.licenciaturaId === licId)?.id || 0
          : 0;
        setLicenciaturaId(licId);
        setCicloId(primerCiclo);
        return cargarSeguimiento(licId, primerCiclo);
      }).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el Informe.');
        setCargando(false);
      });
    });
  }, []);

  const cambiarLicenciatura = (licId: number) => {
    setLicenciaturaId(licId);
    const primerCiclo = ciclos.find((ciclo) => ciclo.licenciaturaId === licId)?.id || 0;
    setCicloId(primerCiclo);
    cargarSeguimiento(licId, primerCiclo);
  };

  const cambiarCiclo = (id: number) => {
    setCicloId(id);
    cargarSeguimiento(licenciaturaId, id);
  };

  const refrescar = () => cargarSeguimiento(licenciaturaId, cicloId);

  if (!usuario) return null;

  const ciclosFiltrados = ciclos.filter((ciclo) =>
    usuario.rol === 'JEFATURA' ? ciclo.licenciaturaId === usuario.licenciaturaId :
      (!licenciaturaId || ciclo.licenciaturaId === licenciaturaId)
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Informe de Seguimiento</h1>
          <p className="mt-1 text-sm text-slate-600">Registra el avance, las observaciones y las evidencias de cada recomendación.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {usuario.rol !== 'JEFATURA' && (
            <label className="text-xs font-semibold text-slate-700">
              Licenciatura
              <select value={licenciaturaId} onChange={(e) => cambiarLicenciatura(Number(e.target.value))} className="mt-1 block rounded border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value={0}>Todas las licenciaturas</option>
                {licenciaturas.map((lic) => <option key={lic.id} value={lic.id}>{lic.nombre}</option>)}
              </select>
            </label>
          )}
          <label className="text-xs font-semibold text-slate-700">
            Ciclo de acreditación
            <select value={cicloId} onChange={(e) => cambiarCiclo(Number(e.target.value))} className="mt-1 block rounded border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value={0}>Todos los ciclos</option>
              {ciclosFiltrados.map((ciclo) => (
                <option key={ciclo.id} value={ciclo.id}>
                  {ciclo.licenciaturaNombre} · {ciclo.organismoSiglas} · {ciclo.fechaAcreditacion} al {ciclo.fechaFinAcreditacion}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {error && <div role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {mensaje && <div role="status" className="rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">{mensaje}</div>}

      {usuario.rol !== 'JEFATURA' && (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!licenciaturaId || !cicloId} onClick={() => apiSistema.descargarReporte('informe', 'docx', cicloId, licenciaturaId).catch((err: unknown) => setError(err instanceof Error ? err.message : 'No se pudo descargar el reporte.'))} className="rounded bg-[#0B2545] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
            Descargar Informe en Word
          </button>
          <button type="button" disabled={!licenciaturaId || !cicloId} onClick={() => apiSistema.descargarReporte('informe', 'pdf', cicloId, licenciaturaId).catch((err: unknown) => setError(err instanceof Error ? err.message : 'No se pudo descargar el reporte.'))} className="rounded border border-[#134074] px-4 py-2 text-xs font-semibold text-[#134074] disabled:opacity-50">
            Descargar Informe en PDF
          </button>
        </div>
      )}
      {usuario.rol === 'JEFATURA' && (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!cicloId} onClick={() => apiSistema.descargarReporte('informe', 'docx', cicloId, usuario.licenciaturaId || 0).catch((err: unknown) => setError(err instanceof Error ? err.message : 'No se pudo descargar el reporte.'))} className="rounded bg-[#0B2545] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
            Descargar Informe en Word
          </button>
          <button type="button" disabled={!cicloId} onClick={() => apiSistema.descargarReporte('informe', 'pdf', cicloId, usuario.licenciaturaId || 0).catch((err: unknown) => setError(err instanceof Error ? err.message : 'No se pudo descargar el reporte.'))} className="rounded border border-[#134074] px-4 py-2 text-xs font-semibold text-[#134074] disabled:opacity-50">
            Descargar Informe en PDF
          </button>
        </div>
      )}

      <details className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <summary className="cursor-pointer list-none border-b border-slate-100 p-4 [&::-webkit-details-marker]:hidden">
          <span className="font-bold text-slate-800">Vista previa del Informe de Seguimiento</span>
          <span className="ml-2 text-xs text-slate-600">· Mostrar u ocultar la tabla institucional</span>
        </summary>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] table-fixed border-collapse text-left text-xs">
            <thead className="bg-[#0B2545] text-white">
              <tr>
                {['Categoría', 'Indicador', 'Recomendación', 'Acciones para atender la recomendación', 'Metas', 'Área responsable', 'Fecha de cumplimiento', '% de avance', 'Observaciones', 'Evidencias'].map((titulo) => (
                  <th key={titulo} className="border border-slate-400 px-3 py-2 align-top">{titulo}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recomendaciones.map((item) => {
                const evidencias = item.evidencias.map((evidencia) =>
                  evidencia.tipo === 'ENLACE' ? evidencia.urlExterna || evidencia.titulo : evidencia.nombreArchivo || evidencia.titulo
                ).join('\n');
                return (
                  <tr key={item.recomendacionId} className="align-top even:bg-slate-50">
                    {[item.categoriaNombre, item.indicadorNombre, item.recomendacion, item.acciones, item.meta, item.areaResponsableNombre, item.fechaCumplimiento, `${item.porcentajeAvance ?? 0}%`, item.observaciones || 'Ninguna', evidencias || 'Sin evidencias'].map((valor, indice) => (
                      <td key={`${item.recomendacionId}-${indice}`} className="break-words whitespace-pre-wrap border border-slate-300 px-2 py-2">{valor}</td>
                    ))}
                  </tr>
                );
              })}
              {!cargando && recomendaciones.length === 0 && (
                <tr><td colSpan={10} className="border border-slate-300 px-3 py-6 text-center text-slate-500">No hay recomendaciones para mostrar en este ciclo.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </details>

      {cargando ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Cargando recomendaciones…</p>
      ) : recomendaciones.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          No hay recomendaciones enviadas para esta selección.
        </p>
      ) : (
        <div className="space-y-4">
          {recomendaciones.map((item) => (
            <TarjetaSeguimiento
              key={item.recomendacionId}
              item={item}
              porcentajes={catalogos?.porcentajes.filter((porcentaje) => porcentaje.activo) || []}
              administrador={usuario.rol === 'ADMINISTRADOR'}
              planeacion={usuario.rol === 'ADMINISTRADOR' || usuario.rol === 'PLANEADOR'}
              onActualizar={refrescar}
              onMensaje={setMensaje}
              onError={setError}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TarjetaSeguimiento({ item, porcentajes, administrador, planeacion, onActualizar, onMensaje, onError }: {
  item: SeguimientoRecomendacion;
  porcentajes: NonNullable<CatalogosSistema['porcentajes']>;
  administrador: boolean;
  planeacion: boolean;
  onActualizar: () => Promise<void>;
  onMensaje: (mensaje: string) => void;
  onError: (error: string) => void;
}) {
  const [porcentajeId, setPorcentajeId] = useState(item.porcentajeId?.toString() || '');
  const [observaciones, setObservaciones] = useState(item.observaciones || '');
  const [tituloEnlace, setTituloEnlace] = useState('');
  const [urlEnlace, setUrlEnlace] = useState('');
  const [observacionesPlaneacion, setObservacionesPlaneacion] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const editable = administrador || item.estatus === 'BORRADOR' || item.estatus === 'DEVUELTO';

  const guardar = async () => {
    setOcupado(true);
    onError('');
    try {
      const resultado = await apiSistema.guardarSeguimiento(
        item.recomendacionId,
        porcentajeId ? Number(porcentajeId) : null,
        observaciones
      );
      onMensaje(resultado.mensaje);
      await onActualizar();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'No se pudo guardar el avance.');
    } finally {
      setOcupado(false);
    }
  };

  const enviar = async () => {
    setOcupado(true);
    onError('');
    try {
      await apiSistema.guardarSeguimiento(item.recomendacionId, porcentajeId ? Number(porcentajeId) : null, observaciones);
      const resultado = await apiSistema.cambiarEstadoSeguimiento(item.recomendacionId, 'ENVIADO');
      onMensaje(resultado.mensaje);
      await onActualizar();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'No se pudo enviar el avance.');
    } finally {
      setOcupado(false);
    }
  };

  const tomarDecision = async (estatus: 'VALIDADO' | 'DEVUELTO') => {
    setOcupado(true);
    onError('');
    try {
      const resultado = await apiSistema.cambiarEstadoSeguimiento(item.recomendacionId, estatus, observacionesPlaneacion);
      onMensaje(resultado.mensaje);
      await onActualizar();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'No se pudo actualizar el estado del Informe.');
    } finally {
      setOcupado(false);
    }
  };

  const subirPdf = async (archivo: File | undefined) => {
    if (!archivo) return;
    onError('');
    if (archivo.size > 20 * 1024 * 1024) { onError('El PDF no puede superar 20 MB.'); return; }
    setOcupado(true);
    try {
      const resultado = await apiSistema.agregarEvidenciaPdf(item.recomendacionId, archivo);
      onMensaje(resultado.mensaje);
      await onActualizar();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'No se pudo agregar el archivo.');
    } finally {
      setOcupado(false);
    }
  };

  const agregarEnlace = async (e: React.FormEvent) => {
    e.preventDefault();
    setOcupado(true);
    onError('');
    try {
      const resultado = await apiSistema.agregarEvidenciaEnlace(item.recomendacionId, tituloEnlace, urlEnlace);
      setTituloEnlace('');
      setUrlEnlace('');
      onMensaje(resultado.mensaje);
      await onActualizar();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'No se pudo agregar la liga.');
    } finally {
      setOcupado(false);
    }
  };

  const eliminarEvidencia = async (id: number) => {
    if (!window.confirm('¿Eliminar esta evidencia?')) return;
    try {
      const resultado = await apiSistema.eliminarEvidencia(id);
      onMensaje(resultado.mensaje);
      await onActualizar();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'No se pudo eliminar la evidencia.');
    }
  };

  return (
    <details className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase text-[#134074]">{item.licenciaturaNombre} · {item.cicloEtiqueta}</p>
          <h2 className="mt-1 text-sm font-bold text-slate-900">{item.categoriaNombre} — {item.indicadorNombre}</h2>
          <p className="mt-1 line-clamp-2 text-xs text-slate-600">{item.recomendacion}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{item.estatus}</span>
          <span className="text-xs font-semibold text-[#134074]">{item.porcentajeAvance ?? 0}% de avance</span>
          <span className="text-[11px] text-slate-500">Ver detalles</span>
        </div>
      </summary>
      <div className="space-y-4 border-t border-slate-100 p-4 md:p-5">
      <div className="grid gap-3 py-3 text-sm text-slate-700 md:grid-cols-2">
        <p><strong>Recomendación:</strong> {item.recomendacion}</p>
        <p><strong>Acciones:</strong> {item.acciones}</p>
        <p><strong>Meta:</strong> {item.meta}</p>
        <p><strong>Área responsable:</strong> {item.areaResponsableNombre}</p>
        <p><strong>Fecha de cumplimiento:</strong> {item.fechaCumplimiento}</p>
      </div>
      {item.observacionesPlaneacion && (
        <p className="mb-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <strong>Observaciones de Planeación:</strong> {item.observacionesPlaneacion}
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs font-semibold text-slate-700">
          Porcentaje de avance
          <select disabled={!editable} value={porcentajeId} onChange={(e) => setPorcentajeId(e.target.value)} className="mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100">
            <option value="">Selecciona un porcentaje</option>
            {porcentajes.map((porcentaje) => <option key={porcentaje.id} value={porcentaje.id}>{porcentaje.valor}% — {porcentaje.etiqueta}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Observaciones de la Coordinación
          <textarea disabled={!editable} rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100" />
        </label>
      </div>

      <div className="mt-4">
        <h3 className="text-xs font-bold uppercase text-slate-700">Evidencias</h3>
        <ul className="mt-2 space-y-2">
          {item.evidencias.map((evidencia) => (
            <li key={evidencia.id} className="flex flex-wrap items-center justify-between gap-2 rounded bg-slate-50 px-3 py-2 text-xs">
              {evidencia.tipo === 'ENLACE' ? (
                <a href={evidencia.urlExterna || '#'} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-800 underline">{evidencia.titulo}</a>
              ) : (
                <button type="button" onClick={() => apiSistema.descargarEvidencia(evidencia).catch((err: unknown) => onError(err instanceof Error ? err.message : 'No se pudo descargar la evidencia.'))} className="font-medium text-blue-800 underline">
                  {evidencia.nombreArchivo || evidencia.titulo}
                </button>
              )}
              {editable && <button type="button" onClick={() => eliminarEvidencia(evidencia.id)} className="font-semibold text-red-700 hover:underline">Quitar</button>}
            </li>
          ))}
          {item.evidencias.length === 0 && <li className="text-xs text-slate-500">Sin evidencias registradas.</li>}
        </ul>
        {editable && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-xs font-semibold text-slate-700">
              Agregar archivo PDF (máximo 20 MB)
              <input type="file" accept="application/pdf,.pdf" disabled={ocupado} onChange={(e) => { void subirPdf(e.target.files?.[0]); e.currentTarget.value = ''; }} className="mt-1 block w-full rounded border border-slate-300 bg-white p-2 text-xs" />
            </label>
            <form onSubmit={agregarEnlace} className="grid gap-2">
              <input required maxLength={255} value={tituloEnlace} onChange={(e) => setTituloEnlace(e.target.value)} placeholder="Nombre de la evidencia" className="rounded border border-slate-300 px-3 py-2 text-xs" />
              <div className="flex gap-2">
                <input required type="url" value={urlEnlace} onChange={(e) => setUrlEnlace(e.target.value)} placeholder="https://..." className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-2 text-xs" />
                <button disabled={ocupado} type="submit" className="rounded border px-3 py-2 text-xs font-semibold disabled:opacity-50">Agregar liga</button>
              </div>
            </form>
          </div>
        )}
      </div>

      {editable && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button type="button" disabled={ocupado} onClick={guardar} className="rounded border border-slate-300 px-3 py-2 text-xs font-semibold disabled:opacity-50">Guardar avance</button>
          {!administrador && (item.estatus === 'BORRADOR' || item.estatus === 'DEVUELTO') && (
            <button type="button" disabled={ocupado} onClick={enviar} className="rounded bg-[#0B2545] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Enviar a Planeación</button>
          )}
        </div>
      )}
      {planeacion && item.estatus === 'ENVIADO' && (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          <label className="block text-xs font-semibold text-slate-700">
            Observaciones para la Coordinación
            <textarea rows={2} value={observacionesPlaneacion} onChange={(e) => setObservacionesPlaneacion(e.target.value)} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <div className="flex gap-2">
            <button type="button" disabled={ocupado} onClick={() => tomarDecision('VALIDADO')} className="rounded bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Validar Informe</button>
            <button type="button" disabled={ocupado} onClick={() => tomarDecision('DEVUELTO')} className="rounded bg-rose-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Devolver con observaciones</button>
          </div>
        </div>
      )}
      </div>
    </details>
  );
}
