'use client';

import { useEffect, useState } from 'react';
import { apiSistema } from '@/servicios/apiSistema';
import { Usuario, Licenciatura, RolUsuario } from '@/tipos/sistema';

export default function AdministracionPage() {
  const [sesion, setSesion] = useState<Usuario | null>(null);
  const [licenciaturas, setLicenciaturas] = useState<Licenciatura[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  // Alta dinamica de licenciatura
  const [nuevaCarrera, setNuevaCarrera] = useState('');

  // Registro de nuevo usuario
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [emailUsuario, setEmailUsuario] = useState('');
  const [rolUsuario, setRolUsuario] = useState<RolUsuario>('JEFATURA');
  const [carreraUsuario, setCarreraUsuario] = useState<number>(17);

  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const cargarDatos = () => {
    setLicenciaturas(apiSistema.obtenerLicenciaturas());
    setUsuarios(apiSistema.obtenerUsuarios());
  };

  useEffect(() => {
    const actual = apiSistema.obtenerSesion();
    if (!actual) return;
    setSesion(actual);
    if (actual.licenciaturaId) {
      setCarreraUsuario(actual.licenciaturaId);
    }
    cargarDatos();
  }, []);

  const manejarAltaCarrera = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    try {
      apiSistema.agregarLicenciatura(nuevaCarrera);
      setNuevaCarrera('');
      setMensaje('Nueva licenciatura incorporada al catálogo operativo.');
      cargarDatos();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const manejarRegistroUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    if (!sesion) return;

    const rolFinal: RolUsuario = sesion.rol === 'JEFATURA' ? 'JEFATURA' : rolUsuario;
    const carreraFinal = sesion.rol === 'JEFATURA' ? sesion.licenciaturaId : carreraUsuario;

    try {
      apiSistema.registrarUsuario({
        nombre: nombreUsuario,
        email: emailUsuario,
        rol: rolFinal,
        licenciaturaId: rolFinal === 'JEFATURA' ? carreraFinal : null,
      });
      setNombreUsuario('');
      setEmailUsuario('');
      setMensaje('Cuenta registrada correctamente. El usuario ya puede solicitar su código OTP.');
      cargarDatos();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const desbloquear = (id: number) => {
    apiSistema.desbloquearUsuario(id);
    setMensaje('Cuenta desbloqueada y contador de intentos restablecido a cero.');
    cargarDatos();
  };

  if (!sesion) return null;

  const esAdmin = sesion.rol === 'ADMINISTRADOR';
  const usuariosVisibles = esAdmin
    ? usuarios
    : usuarios.filter((u) => u.licenciaturaId === sesion.licenciaturaId);

  const nombreCarrera = (id: number | null) =>
    licenciaturas.find((l) => l.id === id)?.nombre || 'Global (Unidad de Planeación)';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          {esAdmin
            ? 'Administración de Licenciaturas, Usuarios y Seguridad'
            : 'Gestión de Cuentas de Coordinación'}
        </h1>
        <p className="text-sm text-slate-600">
          {esAdmin
            ? 'Alta dinámica de programas académicos, asignación de cuentas y desbloqueo de accesos.'
            : 'Cada coordinación dispone de un máximo de 2 cuentas institucionales (@pcpuma.acatlan.unam.mx).'}
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="rounded border border-emerald-300 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
          {mensaje}
        </div>
      )}

      {/* Formulario de Registro de Usuarios */}
      <form
        onSubmit={manejarRegistroUsuario}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm text-sm"
      >
        <h2 className="text-base font-bold text-slate-800">
          {esAdmin ? 'Registrar Nueva Cuenta Institucional' : 'Registrar Segunda Cuenta de Coordinación'}
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block font-medium text-slate-700">Nombre completo</label>
            <input
              type="text"
              value={nombreUsuario}
              onChange={(e) => setNombreUsuario(e.target.value)}
              placeholder="Ej. Mtro. Carlos Hernández"
              required
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Correo Institucional (@pcpuma.acatlan.unam.mx)
            </label>
            <input
              type="email"
              value={emailUsuario}
              onChange={(e) => setEmailUsuario(e.target.value)}
              placeholder="cuenta@pcpuma.acatlan.unam.mx"
              required
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </div>

          {esAdmin && (
            <>
              <div>
                <label className="mb-1 block font-medium text-slate-700">Nivel de Acceso (Rol)</label>
                <select
                  value={rolUsuario}
                  onChange={(e) => setRolUsuario(e.target.value as RolUsuario)}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                >
                  <option value="JEFATURA">Jefatura / Auxiliar (Nivel Bajo - Máx. 2 por carrera)</option>
                  <option value="PLANEADOR">Planeador / Revisor (Nivel Intermedio)</option>
                  <option value="ADMINISTRADOR">Administrador General</option>
                </select>
              </div>

              {rolUsuario === 'JEFATURA' && (
                <div>
                  <label className="mb-1 block font-medium text-slate-700">Licenciatura Asignada</label>
                  <select
                    value={carreraUsuario}
                    onChange={(e) => setCarreraUsuario(Number(e.target.value))}
                    className="w-full rounded border border-slate-300 px-3 py-2"
                  >
                    {licenciaturas.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded bg-[#0B2545] px-4 py-2 text-xs font-semibold text-white hover:bg-[#134074]"
          >
            Guardar Cuenta
          </button>
        </div>
      </form>

      {/* Tabla de Usuarios y Desbloqueos */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-bold text-slate-800">
            Cuentas Registradas ({usuariosVisibles.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Correo Institucional</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Adscripción</th>
                <th className="px-4 py-3">Seguridad</th>
                {esAdmin && <th className="px-4 py-3">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {usuariosVisibles.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{u.nombre}</td>
                  <td className="px-4 py-3 text-slate-700">{u.email}</td>
                  <td className="px-4 py-3 font-semibold text-[#134074]">{u.rol}</td>
                  <td className="px-4 py-3 text-slate-600">{nombreCarrera(u.licenciaturaId)}</td>
                  <td className="px-4 py-3">
                    {u.bloqueado ? (
                      <span className="rounded bg-red-100 px-2 py-0.5 font-semibold text-red-700">
                        BLOQUEADA (3/3 intentos)
                      </span>
                    ) : (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">
                        ACTIVA ({u.intentosFallidos}/3 fallos)
                      </span>
                    )}
                  </td>
                  {esAdmin && (
                    <td className="px-4 py-3">
                      {u.bloqueado && (
                        <button
                          onClick={() => desbloquear(u.id)}
                          className="rounded bg-red-700 px-2.5 py-1 font-semibold text-white hover:bg-red-800"
                        >
                          Desbloquear
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Catalogo Dinamico de Licenciaturas (Solo Administrador) */}
      {esAdmin && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-800">
            Catálogo Dinámico de Licenciaturas ({licenciaturas.length} registradas)
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Permite incorporar nuevas carreras al proceso de planeación sin modificar el código del sistema.
          </p>

          <form onSubmit={manejarAltaCarrera} className="mt-4 flex gap-3">
            <input
              type="text"
              value={nuevaCarrera}
              onChange={(e) => setNuevaCarrera(e.target.value)}
              placeholder="Nombre de la nueva licenciatura..."
              required
              className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded bg-[#0B2545] px-4 py-2 text-xs font-semibold text-white hover:bg-[#134074]"
            >
              Agregar Licenciatura
            </button>
          </form>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {licenciaturas.map((lic) => (
              <div
                key={lic.id}
                className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800"
              >
                {lic.nombre}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
