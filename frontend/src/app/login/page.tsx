'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiSistema } from '@/servicios/apiSistema';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [codigoOtp, setCodigoOtp] = useState('');
  const [esperandoOtp, setEsperandoOtp] = useState(false);
  const [codigoPrueba, setCodigoPrueba] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const manejarPaso1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setCodigoPrueba(null);

    try {
      const resultado = await apiSistema.solicitarAcceso(email);
      if (!resultado.requiereOtp) {
        router.push('/tablero');
        return;
      }
      setEsperandoOtp(true);
      setInfo('Se envió un código de verificación de 6 dígitos a su correo institucional.');
      if (resultado.codigoSimulado) {
        setCodigoPrueba(resultado.codigoSimulado);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const manejarPaso2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await apiSistema.verificarOtp(email, codigoOtp);
      router.push('/tablero');
    } catch (err: any) {
      setError(err.message);
      if (err.message.includes('bloqueada')) {
        setEsperandoOtp(false);
        setCodigoOtp('');
        setCodigoPrueba(null);
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#0B2545] px-4 py-12">
      <div className="mx-auto w-full max-w-md rounded-xl border border-slate-700 bg-white p-8 shadow-2xl">
        <div className="mb-6 border-b border-slate-200 pb-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#134074]">
            UNAM • FES Acatlán
          </p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">
            Seguimiento a la Mejora Continua
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Unidad de Planeación y Coordinaciones de Licenciatura
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        {info && (
          <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
            {info}
            {codigoPrueba && (
              <div className="mt-2 rounded bg-white p-2 font-mono text-xs text-slate-800 border border-blue-200">
                Modo prueba local (sin SMTP activo) — Código generado: <strong>{codigoPrueba}</strong>
              </div>
            )}
          </div>
        )}

        {!esperandoOtp ? (
          <form onSubmit={manejarPaso1} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-700">
                Correo Institucional (@pcpuma.acatlan.unam.mx)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@pcpuma.acatlan.unam.mx"
                required
                className="w-full rounded border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#134074] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded bg-[#0B2545] py-2.5 text-sm font-semibold text-white transition hover:bg-[#134074]"
            >
              Continuar
            </button>
          </form>
        ) : (
          <form onSubmit={manejarPaso2} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-700">
                Código de Verificación (6 dígitos)
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={codigoOtp}
                onChange={(e) => setCodigoOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                required
                className="w-full rounded border border-slate-300 px-3 py-2.5 text-center font-mono text-lg tracking-widest text-slate-900 focus:border-[#134074] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded bg-emerald-700 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Verificar e Ingresar
            </button>

            <button
              type="button"
              onClick={() => {
                setEsperandoOtp(false);
                setCodigoOtp('');
                setError('');
                setInfo('');
              }}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-800 hover:underline"
            >
              Cambiar correo electrónico
            </button>
          </form>
        )}

        <div className="mt-6 border-t border-slate-200 pt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase text-slate-400">
            Cuentas precargadas para pruebas rápidas:
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setEmail('admin.planeacion@pcpuma.acatlan.unam.mx')}
              className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-200"
            >
              Administrador
            </button>
            <button
              type="button"
              onClick={() => setEmail('revisor.acreditacion@pcpuma.acatlan.unam.mx')}
              className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-200"
            >
              Planeador
            </button>
            <button
              type="button"
              onClick={() => setEmail('jefatura.mac@pcpuma.acatlan.unam.mx')}
              className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-200"
            >
              Jefatura MAC
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
