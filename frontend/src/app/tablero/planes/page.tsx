'use client';

import { useEffect, useState } from 'react';
import { apiSistema } from '@/servicios/apiSistema';
import { Usuario, Licenciatura, RecomendacionPlan, EstatusDocumento } from '@/tipos/sistema';
import VisorPdfModal from '@/componentes/VisorPdfModal';
import ModalAjusteFecha from '@/componentes/ModalAjusteFecha';

export default function PlanesPage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [licenciaturas, setLicenciaturas] = useState<Licenciatura[]>([]);
  const [licSeleccionada, setLicSeleccionada] = useState<number>(17);
  const [planes, setPlanes] = useState<RecomendacionPlan[]>([]);
  const [notificacion, setNotificacion] = useState('');

  // Estados para previsualizacion PDF y ajuste de fechas
  const [pdfVisor, setPdfVisor] = useState<{ titulo: string; url: string | null } | null>(null);
  const [planAjusteFecha, setPlanAjusteFecha] = useState<RecomendacionPlan | null>(null);

  // Formulario de nueva recomendacion (Jefatura)
  const [mostrarForm, setMostrarForm] = useState(false);
  const [categoria, setCategoria] = useState('');
  const [indicador, setIndicador] = useState('');
  const [recomendacion, setRecomendacion] = useState('');
  const [acciones, setAcciones] = useState('');
  const [metaMedible, setMetaMedible] = useState('');
  const [fechaCumplimiento, setFechaCumplimiento] = useState('');
  const [porcentajeAvance, setPorcentajeAvance] = useState(0);
  const [archivoNombre, setArchivoNombre] = useState<string | null>(null);
  const [archivoUrl, setArchivoUrl] = useState<string | null>(null);

  // Observaciones de revision (Planeador / Admin)
  const [observacionesTemp, setObservacionesTemp] = useState<Record<number, string>>({});

  const recargar = (sesionActual: Usuario, carreraId: number) => {
    const idFiltro = sesionActual.rol === 'JEFATURA' ? sesionActual.licenciaturaId : carreraId;
    setPlanes(apiSistema.obtenerPlanes(idFiltro));
  };

  useEffect(() => {
    const sesion = apiSistema.obtenerSesion();
    if (!sesion) return;
    setUsuario(sesion);
    const lics = apiSistema.obtenerLicenciaturas();
    setLicenciaturas(lics);

    const inicial = sesion.licenciaturaId || (lics[0]?.id ?? 1);
    setLicSeleccionada(inicial);
    recargar(sesion, inicial);
  }, []);

  const manejarCambioArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Solo se permiten evidencias probatorias en formato PDF.');
      e.target.value = '';
      return;
    }
    setArchivoNombre(file.name);
    setArchivoUrl(URL.createObjectURL(file));
  };

  const guardarBorradorOEnviar = (estatusDestino: EstatusDocumento) => {
    if (!usuario) return;
    const carreraDestino = usuario.licenciaturaId || licSeleccionada;

    if (!categoria.trim() || !indicador.trim() || !recomendacion.trim() || !fechaCumplimiento) {
      alert('Complete los campos obligatorios: Categoría, Indicador, Recomendación y Fecha de cumplimiento.');
      return;
    }

    apiSistema.guardarPlan({
      licenciaturaId: carreraDestino,
      categoria,
      indicador,
      recomendacion,
      acciones,
      metaMedible,
      fechaCumplimiento,
      porcentajeAvance,
      estatus: estatusDestino,
      observacionesPlaneacion: '',
      archivoPdfNombre: archivoNombre,
      archivoPdfUrl: archivoUrl,
    });

    setMostrarForm(false);
    setCategoria('');
    setIndicador('');
    setRecomendacion('');
    setAcciones('');
    setMetaMedible('');
    setFechaCumplimiento('');
    setPorcentajeAvance(0);
    setArchivoNombre(null);
    setArchivoUrl(null);

    setNotificacion(
      estatusDestino === 'ENVIADO'
        ? 'Información enviada a la Unidad de Planeación. Se ha generado la alerta correspondiente.'
        : 'Borrador guardado correctamente.'
    );
    recargar(usuario, licSeleccionada);
  };

  const dictaminarPlan = (plan: RecomendacionPlan, nuevoEstatus: EstatusDocumento) => {
    if (!usuario) return;
    const obs = observacionesTemp[plan.id] ?? plan.observacionesPlaneacion;
    if (nuevoEstatus === 'DEVUELTO' && !obs.trim()) {
      alert('Debe escribir las observaciones antes de devolver el instrumento a la coordinación.');
      return;
    }
    apiSistema.cambiarEstatusPlan(plan.id, nuevoEstatus, obs);
    setNotificacion(
      nuevoEstatus === 'VALIDADO'
        ? 'Recomendación validada y notificada a la coordinación.'
        : 'Instrumento devuelto con observaciones. Se notificó vía sistema y correo institucional.'
    );
    recargar(usuario, licSeleccionada);
  };

  const exportarReporteWord = () => {
    const carreraObj = licenciaturas.find((l) => l.id === licSeleccionada);
    const lineas = [
      'UNIVERSIDAD NACIONAL AUTONOMA DE MEXICO',
      'FACULTAD DE ESTUDIOS SUPERIORES ACATLAN - UNIDAD DE PLANEACION',
      `REPORTE DE SEGUIMIENTO A LA MEJORA CONTINUA: ${carreraObj?.nombre || ''}`,
      '========================================================================',
      '',
      ...planes.map(
        (p, idx) =>
          `${idx + 1}. [${p.estatus}] ${p.categoria} - ${p.indicador}\n` +
          `   Recomendacion: ${p.recomendacion}\n` +
          `   Meta: ${p.metaMedible} | Avance: ${p.porcentajeAvance}% | Fecha limite: ${p.fechaCumplimiento}\n` +
          `   Evidencia PDF: ${p.archivoPdfNombre || 'Sin archivo adjunto'}\n` +
          `   Observaciones Planeacion: ${p.observacionesPlaneacion || 'Ninguna'}\n`
      ),
    ].join('\n');

    const blob = new Blob([lineas], { type: 'application/msword;charset=utf-8' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = `Seguimiento_Mejora_Continua_${(carreraObj?.nombre || 'FES').replace(/\s+/g, '_')}.doc`;
    enlace.click();
  };

  if (!usuario) return null;

  const esPlaneacion = usuario.rol === 'ADMINISTRADOR' || usuario.rol === 'PLANEADOR';

  const claseEstatus: Record<EstatusDocumento, string> = {
    BORRADOR: 'bg-slate-200 text-slate-800',
    ENVIADO: 'bg-amber-100 text-amber-800 border border-amber-300',
    DEVUELTO: 'bg-orange-100 text-orange-800 border border-orange-300',
    VALIDADO: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Plan de Mejora e Informe de Seguimiento</h1>
          <p className="text-sm text-slate-600">
            Captura de avances, validación de evidencias PDF y control de fechas de cumplimiento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {esPlaneacion && (
            <select
              value={licSeleccionada}
              onChange={(e) => {
                const id = Number(e.target.value);
                setLicSeleccionada(id);
                recargar(usuario, id);
              }}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            >
              {licenciaturas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={exportarReporteWord}
            className="rounded border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Exportar Editable (.doc)
          </button>

          {usuario.rol === 'JEFATURA' && (
            <button
              onClick={() => setMostrarForm(!mostrarForm)}
              className="rounded bg-[#0B2545] px-4 py-2 text-xs font-semibold text-white hover:bg-[#134074]"
            >
              {mostrarForm ? 'Cerrar formulario' : 'Nueva Recomendación'}
            </button>
          )}
        </div>
      </div>

      {notificacion && (
        <div className="flex items-center justify-between rounded border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
          <span>{notificacion}</span>
          <button onClick={() => setNotificacion('')} className="underline">
            Ocultar
          </button>
        </div>
      )}

      {mostrarForm && usuario.rol === 'JEFATURA' && (
        <div className="rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-800">
            Registrar Recomendación y Evidencia Probatoria
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm">
            <div>
              <label className="mb-1 block font-medium text-slate-700">Categoría / Criterio</label>
              <input
                type="text"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ej. Personal Académico"
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Indicador</label>
              <input
                type="text"
                value={indicador}
                onChange={(e) => setIndicador(e.target.value)}
                placeholder="Ej. Actualización docente"
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block font-medium text-slate-700">Recomendación del Organismo</label>
              <textarea
                rows={2}
                value={recomendacion}
                onChange={(e) => setRecomendacion(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block font-medium text-slate-700">Acciones de Mejora</label>
              <textarea
                rows={2}
                value={acciones}
                onChange={(e) => setAcciones(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Meta Medible</label>
              <input
                type="text"
                value={metaMedible}
                onChange={(e) => setMetaMedible(e.target.value)}
                placeholder="Ej. 100% de profesores capacitados"
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-medium text-slate-700">Fecha de Cumplimiento</label>
                <input
                  type="date"
                  value={fechaCumplimiento}
                  onChange={(e) => setFechaCumplimiento(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700">% Avance</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={porcentajeAvance}
                  onChange={(e) => setPorcentajeAvance(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block font-medium text-slate-700">
                Archivo de Evidencia (Exclusivamente PDF)
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={manejarCambioArchivo}
                className="w-full rounded border border-slate-300 bg-slate-50 p-2 text-xs"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => guardarBorradorOEnviar('BORRADOR')}
              className="rounded border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Guardar en Borrador
            </button>
            <button
              type="button"
              onClick={() => guardarBorradorOEnviar('ENVIADO')}
              className="rounded bg-[#0B2545] px-4 py-2 text-xs font-semibold text-white hover:bg-[#134074]"
            >
              Enviar a Planeación
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {planes.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No hay recomendaciones registradas para esta licenciatura en el ciclo actual.
          </div>
        ) : (
          planes.map((plan) => (
            <div
              key={plan.id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs font-semibold uppercase text-[#134074]">
                    {plan.categoria} • {plan.indicador}
                  </span>
                  <h3 className="mt-1 text-base font-bold text-slate-900">{plan.recomendacion}</h3>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${claseEstatus[plan.estatus]}`}>
                  {plan.estatus}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 text-xs text-slate-700 md:grid-cols-3">
                <div>
                  <span className="font-semibold text-slate-500">Acciones:</span> {plan.acciones || 'N/A'}
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Meta medible:</span> {plan.metaMedible}
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Fecha límite:</span>{' '}
                  <strong>{plan.fechaCumplimiento}</strong> ({plan.porcentajeAvance}% avance)
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-3">
                  {plan.archivoPdfNombre ? (
                    <button
                      type="button"
                      onClick={() =>
                        setPdfVisor({ titulo: plan.archivoPdfNombre!, url: plan.archivoPdfUrl })
                      }
                      className="rounded bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#134074] border border-blue-200 hover:bg-blue-100"
                    >
                      Previsualizar PDF: {plan.archivoPdfNombre}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">Sin evidencia PDF adjunta</span>
                  )}

                  {plan.historialFechas && plan.historialFechas.length > 0 && (
                    <span className="rounded bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
                      {plan.historialFechas.length} ajuste(s) de fecha registrado(s)
                    </span>
                  )}
                </div>

                {esPlaneacion && (
                  <button
                    type="button"
                    onClick={() => setPlanAjusteFecha(plan)}
                    className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Alargar / Acortar Fecha
                  </button>
                )}
              </div>

              {plan.observacionesPlaneacion && (
                <div className="mt-3 rounded border border-orange-200 bg-orange-50 p-3 text-xs text-orange-900">
                  <strong>Observaciones de Planeación:</strong> {plan.observacionesPlaneacion}
                </div>
              )}

              {esPlaneacion && (
                <div className="mt-4 rounded bg-slate-50 p-3 border border-slate-200">
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Dictamen y comentarios para la coordinación (envía alerta en sistema y correo):
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={observacionesTemp[plan.id] ?? plan.observacionesPlaneacion}
                      onChange={(e) =>
                        setObservacionesTemp({ ...observacionesTemp, [plan.id]: e.target.value })
                      }
                      placeholder="Escriba observaciones de revisión o notas de validación..."
                      className="flex-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => dictaminarPlan(plan, 'DEVUELTO')}
                      className="rounded bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700"
                    >
                      Devolver con Observaciones
                    </button>
                    <button
                      type="button"
                      onClick={() => dictaminarPlan(plan, 'VALIDADO')}
                      className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      Validar Avance
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {pdfVisor && (
        <VisorPdfModal
          titulo={pdfVisor.titulo}
          urlPdf={pdfVisor.url}
          onCerrar={() => setPdfVisor(null)}
        />
      )}

      {planAjusteFecha && (
        <ModalAjusteFecha
          plan={planAjusteFecha}
          onCerrar={() => setPlanAjusteFecha(null)}
          onGuardar={(fechaNueva, motivo) => {
            apiSistema.ajustarFechaPlan(planAjusteFecha.id, fechaNueva, motivo, usuario.email);
            setPlanAjusteFecha(null);
            setNotificacion('Fecha de cumplimiento actualizada y registrada en la bitácora de acuerdos.');
            recargar(usuario, licSeleccionada);
          }}
        />
      )}
    </div>
  );
}
