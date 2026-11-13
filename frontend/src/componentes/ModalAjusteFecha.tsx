'use client';

import { useState } from 'react';
import { RecomendacionPlan } from '@/tipos/sistema';

interface ModalAjusteFechaProps {
  plan: RecomendacionPlan;
  onGuardar: (fechaNueva: string, motivo: string) => void;
  onCerrar: () => void;
}

export default function ModalAjusteFecha({ plan, onGuardar, onCerrar }: ModalAjusteFechaProps) {
  const [fechaNueva, setFechaNueva] = useState(plan.fechaCumplimiento);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  const manejarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fechaNueva) {
      setError('Seleccione una fecha válida.');
      return;
    }
    if (fechaNueva === plan.fechaCumplimiento) {
      setError('La nueva fecha debe ser distinta a la fecha vigente.');
      return;
    }
    if (motivo.trim().length < 10) {
      setError('Describa el acuerdo alcanzado con la coordinación (mínimo 10 caracteres).');
      return;
    }
    onGuardar(fechaNueva, motivo.trim());
  };

  const tipoMovimiento =
    fechaNueva > plan.fechaCumplimiento
      ? 'Ampliación de plazo (Prórroga)'
      : fechaNueva < plan.fechaCumplimiento
      ? 'Reducción de plazo acordada'
      : 'Sin cambios respecto a la fecha actual';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-lg rounded-lg border border-slate-300 bg-white shadow-xl">
        <div className="border-b border-slate-200 bg-[#0B2545] px-5 py-4 text-white">
          <h3 className="text-base font-semibold">Ajuste de Fecha de Cumplimiento</h3>
          <p className="text-xs text-slate-300">{plan.indicador}</p>
        </div>

        <form onSubmit={manejarSubmit} className="space-y-4 p-5 text-sm">
          {error && (
            <div className="rounded border border-red-300 bg-red-50 p-2.5 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 rounded bg-slate-50 p-3 border border-slate-200">
            <div>
              <span className="block text-xs text-slate-500">Fecha actual registrada</span>
              <strong className="text-slate-800">{plan.fechaCumplimiento}</strong>
            </div>
            <div>
              <span className="block text-xs text-slate-500">Tipo de ajuste</span>
              <span className="font-medium text-[#134074]">{tipoMovimiento}</span>
            </div>
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Nueva fecha acordada con la coordinación
            </label>
            <input
              type="date"
              value={fechaNueva}
              onChange={(e) => setFechaNueva(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-slate-800 focus:border-[#134074] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Justificación y acuerdo formal
            </label>
            <textarea
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. Acuerdo tomado en reunión de seguimiento con la Jefatura de Carrera debido al periodo intersemestral."
              className="w-full rounded border border-slate-300 px-3 py-2 text-slate-800 focus:border-[#134074] focus:outline-none"
              required
            />
          </div>

          {plan.historialFechas && plan.historialFechas.length > 0 && (
            <div className="border-t border-slate-200 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                Bitácora de modificaciones previas
              </p>
              <div className="max-h-28 space-y-1.5 overflow-y-auto text-xs">
                {plan.historialFechas.map((h) => (
                  <div key={h.id} className="rounded bg-slate-100 p-2 text-slate-700">
                    <span className="font-semibold">
                      {h.fechaAnterior} → {h.fechaNueva}
                    </span>{' '}
                    ({h.fechaRegistro}): {h.motivo}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onCerrar}
              className="rounded border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded bg-[#0B2545] px-4 py-2 text-xs font-semibold text-white hover:bg-[#134074]"
            >
              Guardar Nueva Fecha
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
