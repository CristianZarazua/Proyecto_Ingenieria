'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { apiSistema } from '@/servicios/apiSistema';

export default function LoginPage() {
  const router = useRouter();
  const correoContactoAlta = 'admin.planeacion@pcpuma.acatlan.unam.mx';
  const asuntoAlta = encodeURIComponent('Solicitud de alta en Seguimiento a la Mejora Continua');
  const cuerpoAlta = encodeURIComponent('Nombre completo:\nLicenciatura:\nTipo de cuenta (titular o auxiliar):\n');
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al solicitar acceso.');
    }
  };

  const manejarPaso2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await apiSistema.verificarOtp(email, codigoOtp);
      router.push('/tablero');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al verificar código.';
      setError(msg);
      if (msg.includes('bloqueada')) {
        setEsperandoOtp(false);
        setCodigoOtp('');
        setCodigoPrueba(null);
      }
    }
  };

  return (
    <div className="fondo-unam-animado flex min-h-screen flex-col justify-center px-4 py-12">
      <div className="mx-auto w-full max-w-md rounded-xl border border-amber-400/30 bg-white/95 p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-6 border-b border-slate-200 pb-4 text-center">
          <div className="mx-auto mb-3 flex items-center justify-center">
            <Image
              src="/logos/fes-blanco.png"
              alt="Logotipo de FES Acatlán"
              width={1000}
              height={1102}
              className="h-40 w-auto object-contain"
              style={{ filter: 'brightness(0) saturate(100%)' }}
              priority
            />
          </div>
          <h1 className="mt-1 text-xl font-bold text-[#0B2545]">
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
              <div className="mt-2 rounded border border-blue-200 bg-white p-2 font-mono text-xs text-slate-800">
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
          <section className="rounded-lg border border-blue-200 border-l-4 border-l-[#D4AF37] bg-slate-50 p-4" aria-labelledby="solicitud-alta">
            <h2 id="solicitud-alta" className="text-sm font-bold text-[#0B2545]">
              ¿Aún no tienes cuenta?
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Solicita tu alta desde tu correo institucional. Incluye tu nombre, licenciatura y si eres titular o auxiliar. El Administrador registrará la cuenta; no hay autorregistro público.
            </p>
            <a
              href={`mailto:${correoContactoAlta}?subject=${asuntoAlta}&body=${cuerpoAlta}`}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0B2545] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#134074] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                <path d="M3 5.5h14v9H3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="m3.5 6 6.5 5 6.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              Enviar solicitud de alta
            </a>
            <p className="mt-2 text-center text-[11px] text-slate-500">
              Correo de ejemplo: <span className="font-semibold text-[#134074]">{correoContactoAlta}</span>
            </p>
            <p className="mt-1 text-center text-[11px] text-slate-500">
              Cuando te confirmen el alta, mantente atento a tu correo y revisa también la carpeta de spam.
            </p>
          </section>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase text-slate-400">
                Cuentas de prueba (requieren estar cargadas en la base de datos):
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
                  onClick={() => setEmail('planeador.planeacion@pcpuma.acatlan.unam.mx')}
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
          )}
          </div>
      </div>
    </div>
  );
}
