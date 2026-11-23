'use client';

import { useEffect, useState } from 'react';
import { apiSistema } from '@/servicios/apiSistema';
import {
  Usuario,
  Licenciatura,
  CatalogosSistema,
  CicloAcreditacion,
  RolUsuario,
  TipoCuenta,
} from '@/tipos/sistema';

type RolCuentaGestionada = Extract<RolUsuario, 'JEFATURA' | 'PLANEADOR'>;

export default function AdministracionPage() {
  const [sesion, setSesion] = useState<Usuario | null>(null);
  const [tab, setTab] = useState<'cuentas' | 'catalogos' | 'ciclos'>('cuentas');
  const [modoAlta, setModoAlta] = useState<'individual' | 'lote'>('individual');

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [licenciaturas, setLicenciaturas] = useState<Licenciatura[]>([]);
  const [catalogos, setCatalogos] = useState<CatalogosSistema | null>(null);
  const [ciclos, setCiclos] = useState<CicloAcreditacion[]>([]);

  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  // Formulario de cuentas
  const [editUsuarioId, setEditUsuarioId] = useState<number | null>(null);
  const [nombreUsr, setNombreUsr] = useState('');
  const [emailUsr, setEmailUsr] = useState('');
  const [rolUsr, setRolUsr] = useState<RolCuentaGestionada>('JEFATURA');
  const [tipoCuentaUsr, setTipoCuentaUsr] = useState<TipoCuenta>('TITULAR');
  const [licUsr, setLicUsr] = useState<number>(1);
  const [activoUsr, setActivoUsr] = useState<boolean>(true);
  const [correosLote, setCorreosLote] = useState('');
  const [rolLote, setRolLote] = useState<RolCuentaGestionada>('JEFATURA');
  const [tipoCuentaLote, setTipoCuentaLote] = useState<TipoCuenta>('TITULAR');
  const [licLote, setLicLote] = useState<number>(1);

  // Formulario de licenciaturas y ciclos
  const [nombreLic, setNombreLic] = useState('');
  const [cicloLicId, setCicloLicId] = useState<number>(1);
  const [cicloOrgId, setCicloOrgId] = useState<number>(1);
  const [cicloFecha, setCicloFecha] = useState('');
  const [cicloFechaFin, setCicloFechaFin] = useState('');
  const [editCicloId, setEditCicloId] = useState<number | null>(null);
  const [cicloActivo, setCicloActivo] = useState(true);

  // Formulario de catalogos
  const [tipoCat, setTipoCat] = useState<'categorias' | 'indicadores' | 'areas' | 'porcentajes' | 'organismos'>('categorias');
  const [editCatId, setEditCatId] = useState<number | null>(null);
  const [catNombre, setCatNombre] = useState('');
  const [catExtra, setCatExtra] = useState('');
  const [catPadreId, setCatPadreId] = useState<number>(1);
  const [catActivo, setCatActivo] = useState<boolean>(true);

  const cargarTodo = async (incluirCuentas = true) => {
    const [usrs, lics, cats, cics] = await Promise.all([
      incluirCuentas ? apiSistema.obtenerUsuarios() : Promise.resolve([] as Usuario[]),
      apiSistema.obtenerLicenciaturas(),
      apiSistema.obtenerCatalogos(),
      apiSistema.obtenerCiclos(),
    ]);
    if (incluirCuentas) setUsuarios(usrs);
    setLicenciaturas(lics);
    setCatalogos(cats);
    setCiclos(cics);
    if (lics[0]) { setLicUsr(lics[0].id); setCicloLicId(lics[0].id); }
    if (lics[0]) setLicLote(lics[0].id);
    if (cats.organismos[0]) setCicloOrgId(cats.organismos[0].id);
    if (cats.categorias[0]) setCatPadreId(cats.categorias[0].id);
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      const actual = apiSistema.obtenerSesion();
      if (!actual) return;
      setSesion(actual);
      if (actual.rol === 'ADMINISTRADOR') {
        cargarTodo().catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar las cuentas y catálogos.');
        });
      } else if (actual.rol === 'PLANEADOR') {
        cargarTodo(false).catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar los catálogos.');
        });
      }
    });
  }, []);

  if (!sesion) return null;
  if (sesion.rol !== 'ADMINISTRADOR' && sesion.rol !== 'PLANEADOR') {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">
        Acceso denegado: se requieren permisos de Planeación.
      </div>
    );
  }

  const pestanaActiva = sesion.rol === 'PLANEADOR' && tab === 'cuentas' ? 'catalogos' : tab;

  const guardarUsuario = async (e: React.FormEvent) => {
    if (sesion.rol !== 'ADMINISTRADOR') return;
    e.preventDefault();
    setError('');
    setMensaje('');
    try {
      const payload = {
        nombre: nombreUsr,
        email: emailUsr,
        rol: rolUsr,
        tipoCuenta: rolUsr === 'JEFATURA' ? tipoCuentaUsr : ('ADMIN' as TipoCuenta),
        licenciaturaId: rolUsr === 'JEFATURA' ? licUsr : null,
        activo: activoUsr,
      };
      if (editUsuarioId) {
        await apiSistema.editarUsuario(editUsuarioId, payload);
        setMensaje('Cuenta actualizada correctamente.');
      } else {
        await apiSistema.crearUsuario(payload);
        setMensaje('Cuenta registrada correctamente.');
      }
      setEditUsuarioId(null);
      setNombreUsr('');
      setEmailUsr('');
      setActivoUsr(true);
      setModoAlta('individual');
      await cargarTodo(sesion?.rol === 'ADMINISTRADOR');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar cuenta.');
    }
  };

  const iniciarEdicionUsuario = (u: Usuario) => {
    if (u.rol === 'ADMINISTRADOR') return;
    setEditUsuarioId(u.id);
    setNombreUsr(u.nombre);
    setEmailUsr(u.email);
    setRolUsr(u.rol);
    setTipoCuentaUsr(u.tipoCuenta);
    if (u.licenciaturaId) setLicUsr(u.licenciaturaId);
    setActivoUsr(u.activo);
    setModoAlta('individual');
  };

  const guardarUsuariosLote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sesion.rol !== 'ADMINISTRADOR') return;
    setError('');
    setMensaje('');
    const emails = correosLote.split(/[\s,;]+/).filter(Boolean);
    try {
      const resultado = await apiSistema.crearUsuariosLote({
        emails,
        rol: rolLote,
        tipoCuenta: rolLote === 'JEFATURA' ? tipoCuentaLote : 'ADMIN',
        licenciaturaId: rolLote === 'JEFATURA' ? licLote : null,
      });
      setMensaje(`${resultado.mensaje} Los nombres se generaron a partir del correo y se pueden editar después.`);
      setCorreosLote('');
      await cargarTodo();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron crear las cuentas del lote.');
    }
  };

  const alternarEstadoUsuario = async (u: Usuario) => {
    setError('');
    setMensaje('');
    try {
      await apiSistema.cambiarEstadoUsuario(u.id, !u.activo);
      setMensaje(!u.activo ? 'Cuenta reactivada.' : 'Cuenta desactivada (baja lógica).');
      await cargarTodo(sesion?.rol === 'ADMINISTRADOR');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el estado de la cuenta.');
    }
  };

  const guardarLicenciatura = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    try {
      await apiSistema.crearLicenciatura(nombreLic);
      setNombreLic('');
      setMensaje('Licenciatura dada de alta.');
      await cargarTodo(sesion?.rol === 'ADMINISTRADOR');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar licenciatura.');
    }
  };

  const guardarCiclo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    try {
      const datosCiclo = {
        licenciaturaId: cicloLicId,
        organismoId: cicloOrgId,
        fechaAcreditacion: cicloFecha,
        fechaFinAcreditacion: cicloFechaFin,
      };
      if (editCicloId) {
        await apiSistema.editarCiclo(editCicloId, { ...datosCiclo, activo: cicloActivo });
        setMensaje('Ciclo de acreditación actualizado.');
      } else {
        await apiSistema.crearCiclo(datosCiclo);
        setMensaje('Ciclo de acreditación registrado.');
      }
      setEditCicloId(null);
      setCicloFecha('');
      setCicloFechaFin('');
      setCicloActivo(true);
      await cargarTodo(sesion?.rol === 'ADMINISTRADOR');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar ciclo.');
    }
  };

  const iniciarEdicionCiclo = (ciclo: CicloAcreditacion) => {
    setEditCicloId(ciclo.id);
    setCicloLicId(ciclo.licenciaturaId);
    setCicloOrgId(ciclo.organismoId);
    setCicloFecha(ciclo.fechaAcreditacion);
    setCicloFechaFin(ciclo.fechaFinAcreditacion);
    setCicloActivo(ciclo.activo);
  };

  const guardarCatalogo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    try {
      const payload: Record<string, unknown> = { nombre: catNombre, activo: catActivo };
      if (tipoCat === 'indicadores') payload.categoriaId = catPadreId;
      if (tipoCat === 'porcentajes') { payload.valor = Number(catExtra); payload.etiqueta = catNombre; }
      if (tipoCat === 'organismos') { payload.siglas = catExtra; }

      if (editCatId) {
        await apiSistema.editarCatalogo(tipoCat, editCatId, payload);
        setMensaje('Elemento de catálogo actualizado.');
      } else {
        await apiSistema.crearCatalogo(tipoCat, payload);
        setMensaje('Elemento agregado al catálogo.');
      }
      setEditCatId(null);
      setCatNombre('');
      setCatExtra('');
      setCatActivo(true);
      await cargarTodo(sesion?.rol === 'ADMINISTRADOR');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar en catálogo.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {sesion.rol === 'ADMINISTRADOR' && (
          <button onClick={() => setTab('cuentas')} className={`rounded px-4 py-2 text-xs font-semibold ${tab === 'cuentas' ? 'bg-[#0B2545] text-white' : 'bg-white text-slate-700 border'}`}>
            Cuentas institucionales
          </button>
        )}
        <button onClick={() => setTab('catalogos')} className={`rounded px-4 py-2 text-xs font-semibold ${pestanaActiva === 'catalogos' ? 'bg-[#0B2545] text-white' : 'bg-white text-slate-700 border'}`}>
          Catálogos
        </button>
        <button onClick={() => setTab('ciclos')} className={`rounded px-4 py-2 text-xs font-semibold ${pestanaActiva === 'ciclos' ? 'bg-[#0B2545] text-white' : 'bg-white text-slate-700 border'}`}>
          Licenciaturas y ciclos
        </button>
      </div>

      {error && <div className="rounded border border-red-300 bg-red-50 p-3 text-xs font-medium text-red-700">{error}</div>}
      {mensaje && <div className="rounded border border-emerald-300 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">{mensaje}</div>}

      {tab === 'cuentas' && sesion.rol === 'ADMINISTRADOR' && (
        <div className="space-y-6">
          <form
            onSubmit={modoAlta === 'lote' && !editUsuarioId ? guardarUsuariosLote : guardarUsuario}
            className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 text-sm shadow-sm"
          >
            <h2 className="font-bold text-slate-800">
              {editUsuarioId ? 'Editar Cuenta' : 'Administrar cuentas institucionales'}
            </h2>
            {!editUsuarioId && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={modoAlta === 'individual'}
                  onClick={() => setModoAlta('individual')}
                  className={`rounded px-3 py-2 text-xs font-semibold ${modoAlta === 'individual' ? 'bg-[#0B2545] text-white' : 'border bg-white text-slate-700'}`}
                >
                  Alta individual
                </button>
                <button
                  type="button"
                  aria-pressed={modoAlta === 'lote'}
                  onClick={() => setModoAlta('lote')}
                  className={`rounded px-3 py-2 text-xs font-semibold ${modoAlta === 'lote' ? 'bg-[#0B2545] text-white' : 'border bg-white text-slate-700'}`}
                >
                  Alta por lote
                </button>
              </div>
            )}

            {(modoAlta === 'individual' || editUsuarioId !== null) && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <input type="text" maxLength={150} placeholder="Nombre completo" required value={nombreUsr} onChange={(e) => setNombreUsr(e.target.value)} className="rounded border border-slate-300 px-3 py-2" />
                  <input type="email" maxLength={150} placeholder="correo@pcpuma.acatlan.unam.mx" required value={emailUsr} onChange={(e) => setEmailUsr(e.target.value)} className="rounded border border-slate-300 px-3 py-2" />
                  <select value={rolUsr} onChange={(e) => {
                    const rol = e.target.value;
                    if (rol !== 'JEFATURA' && rol !== 'PLANEADOR') return;
                    setRolUsr(rol);
                    if (rol === 'PLANEADOR') setTipoCuentaUsr('ADMIN');
                    else if (tipoCuentaUsr === 'ADMIN') setTipoCuentaUsr('TITULAR');
                  }} className="rounded border border-slate-300 px-3 py-2">
                    <option value="JEFATURA">Rol: Jefatura</option>
                    <option value="PLANEADOR">Rol: Planeador</option>
                  </select>

                  {rolUsr === 'JEFATURA' && (
                    <>
                      <select value={tipoCuentaUsr} onChange={(e) => setTipoCuentaUsr(e.target.value as TipoCuenta)} className="rounded border border-slate-300 px-3 py-2">
                        <option value="TITULAR">Tipo: Jefatura (Titular)</option>
                        <option value="AUXILIAR">Tipo: Auxiliar</option>
                      </select>
                      <select value={licUsr} onChange={(e) => setLicUsr(Number(e.target.value))} className="rounded border border-slate-300 px-3 py-2">
                        {licenciaturas.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                      </select>
                    </>
                  )}
                </div>
                {rolUsr === 'JEFATURA' && (
                  <p className="text-xs text-slate-600">Máximo 2 cuentas activas de Jefatura por licenciatura.</p>
                )}
                <div className="flex justify-end gap-2">
                  {editUsuarioId && (
                    <button type="button" onClick={() => { setEditUsuarioId(null); setNombreUsr(''); setEmailUsr(''); }} className="rounded border px-3 py-2 text-xs">
                      Cancelar
                    </button>
                  )}
                  <button type="submit" className="rounded bg-[#0B2545] px-4 py-2 text-xs font-semibold text-white">
                    {editUsuarioId ? 'Actualizar Cuenta' : 'Crear Cuenta'}
                  </button>
                </div>
              </>
            )}

            {modoAlta === 'lote' && !editUsuarioId && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <select value={rolLote} onChange={(e) => {
                    const rol = e.target.value;
                    if (rol !== 'JEFATURA' && rol !== 'PLANEADOR') return;
                    setRolLote(rol);
                    if (rol === 'JEFATURA' && tipoCuentaLote === 'ADMIN') setTipoCuentaLote('TITULAR');
                  }} className="rounded border border-slate-300 px-3 py-2">
                    <option value="JEFATURA">Rol: Jefatura</option>
                    <option value="PLANEADOR">Rol: Planeador</option>
                  </select>
                  {rolLote === 'JEFATURA' && (
                    <>
                      <select value={tipoCuentaLote} onChange={(e) => setTipoCuentaLote(e.target.value as TipoCuenta)} className="rounded border border-slate-300 px-3 py-2">
                        <option value="TITULAR">Tipo: Jefatura (Titular)</option>
                        <option value="AUXILIAR">Tipo: Auxiliar</option>
                      </select>
                      <select value={licLote} onChange={(e) => setLicLote(Number(e.target.value))} className="rounded border border-slate-300 px-3 py-2">
                        {licenciaturas.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                      </select>
                    </>
                  )}
                </div>
                {rolLote === 'JEFATURA' && (
                  <p className="text-xs text-slate-600">Máximo 2 cuentas activas de Jefatura por licenciatura; el lote se rechaza completo si excede el límite.</p>
                )}
                <label className="block text-xs font-semibold text-slate-700">
                  Correos institucionales (máximo 100)
                  <textarea
                    rows={5}
                    value={correosLote}
                    onChange={(e) => setCorreosLote(e.target.value)}
                    placeholder={'persona1@pcpuma.acatlan.unam.mx\npersona2@pcpuma.acatlan.unam.mx'}
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal"
                    required
                  />
                </label>
                <p className="text-xs text-slate-600">
                  Separa los correos con saltos de línea, comas o punto y coma. Las altas se realizan en conjunto: si un correo ya existe o no es válido, no se crea ninguna cuenta. El nombre inicial se genera a partir del correo y podrás editarlo después.
                </p>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!correosLote.trim()}
                    className="rounded bg-[#0B2545] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Crear {correosLote.split(/[\s,;]+/).filter(Boolean).length} cuentas
                  </button>
                </div>
              </>
            )}
          </form>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Correo</th>
                  <th className="p-3">Rol / Tipo</th>
                  <th className="p-3">Licenciatura</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td className="p-3 font-medium">{u.nombre}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">{u.rol}{u.rol === 'JEFATURA' ? ` (${u.tipoCuenta})` : ''}</td>
                    <td className="p-3">{u.licenciaturaNombre || 'Global'}</td>
                    <td className="p-3">
                      <span className={`rounded px-2 py-0.5 font-semibold ${u.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                        {u.activo ? 'Activa' : 'Desactivada'}
                      </span>
                    </td>
                    <td className="p-3 space-x-2">
                      {u.rol === 'ADMINISTRADOR' ? (
                        <span className="text-slate-500">Cuenta protegida</span>
                      ) : (
                        <>
                          <button onClick={() => iniciarEdicionUsuario(u)} className="text-[#134074] font-semibold hover:underline">Editar</button>
                          <button onClick={() => alternarEstadoUsuario(u)} className="text-amber-700 font-semibold hover:underline">
                            {u.activo ? 'Dar de baja' : 'Reactivar'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pestanaActiva === 'catalogos' && catalogos && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {(['categorias', 'indicadores', 'areas', 'porcentajes', 'organismos'] as const).map((t) => (
              <button key={t} onClick={() => { setTipoCat(t); setEditCatId(null); setCatNombre(''); setCatExtra(''); }}
                className={`rounded px-3 py-1.5 text-xs font-semibold capitalize ${tipoCat === t ? 'bg-[#134074] text-white' : 'bg-white border'}`}>
                {t}
              </button>
            ))}
          </div>

          <form onSubmit={guardarCatalogo} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-5 text-sm shadow-sm md:grid-cols-4">
            {tipoCat === 'indicadores' && (
              <select value={catPadreId} onChange={(e) => setCatPadreId(Number(e.target.value))} className="rounded border px-3 py-2">
                {catalogos.categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            )}
            {tipoCat === 'organismos' && (
              <input type="text" placeholder="Siglas (ej. CONAIC)" required value={catExtra} onChange={(e) => setCatExtra(e.target.value)} className="rounded border px-3 py-2" />
            )}
            {tipoCat === 'porcentajes' && (
              <input type="number" min={0} max={100} placeholder="Valor numérico (0-100)" required value={catExtra} onChange={(e) => setCatExtra(e.target.value)} className="rounded border px-3 py-2" />
            )}
            <input type="text" placeholder="Nombre / Etiqueta" required value={catNombre} onChange={(e) => setCatNombre(e.target.value)} className="rounded border px-3 py-2 md:col-span-2" />
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={catActivo} onChange={(e) => setCatActivo(e.target.checked)} /> Activo
            </label>
            <button type="submit" className="rounded bg-[#0B2545] px-4 py-2 text-xs font-semibold text-white">
              {editCatId ? 'Guardar cambios' : 'Agregar'}
            </button>
          </form>

          <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs shadow-sm">
            {tipoCat === 'categorias' && catalogos.categorias.map((c) => (
              <div key={c.id} className="flex items-center justify-between border-b py-2">
                <span>{c.nombre} ({c.activo ? 'Activo' : 'Inactivo'})</span>
                <button onClick={() => { setEditCatId(c.id); setCatNombre(c.nombre); setCatActivo(c.activo); }} className="text-[#134074] font-semibold">Editar</button>
              </div>
            ))}
            {tipoCat === 'indicadores' && catalogos.indicadores.map((i) => (
              <div key={i.id} className="flex items-center justify-between border-b py-2">
                <span>{i.nombre} ({i.activo ? 'Activo' : 'Inactivo'})</span>
                <button onClick={() => { setEditCatId(i.id); setCatPadreId(i.categoriaId); setCatNombre(i.nombre); setCatActivo(i.activo); }} className="text-[#134074] font-semibold">Editar</button>
              </div>
            ))}
            {tipoCat === 'areas' && catalogos.areas.map((a) => (
              <div key={a.id} className="flex items-center justify-between border-b py-2">
                <span>{a.nombre} ({a.activo ? 'Activo' : 'Inactivo'})</span>
                <button onClick={() => { setEditCatId(a.id); setCatNombre(a.nombre); setCatActivo(a.activo); }} className="text-[#134074] font-semibold">Editar</button>
              </div>
            ))}
            {tipoCat === 'porcentajes' && catalogos.porcentajes.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b py-2">
                <span>{p.valor}% — {p.etiqueta} ({p.activo ? 'Activo' : 'Inactivo'})</span>
                <button onClick={() => { setEditCatId(p.id); setCatExtra(String(p.valor)); setCatNombre(p.etiqueta); setCatActivo(p.activo); }} className="text-[#134074] font-semibold">Editar</button>
              </div>
            ))}
            {tipoCat === 'organismos' && catalogos.organismos.map((o) => (
              <div key={o.id} className="flex items-center justify-between border-b py-2">
                <span><strong>{o.siglas}</strong> — {o.nombre} ({o.activo ? 'Activo' : 'Inactivo'})</span>
                <button onClick={() => { setEditCatId(o.id); setCatExtra(o.siglas); setCatNombre(o.nombre); setCatActivo(o.activo); }} className="text-[#134074] font-semibold">Editar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {pestanaActiva === 'ciclos' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 text-sm shadow-sm">
            {sesion.rol === 'ADMINISTRADOR' && (
              <form onSubmit={guardarLicenciatura} className="space-y-3">
                <h2 className="font-bold text-slate-800">Alta de Licenciatura</h2>
                <input type="text" placeholder="Nombre de la licenciatura" required value={nombreLic} onChange={(e) => setNombreLic(e.target.value)} className="w-full rounded border px-3 py-2" />
                <button type="submit" className="rounded bg-[#0B2545] px-4 py-2 text-xs font-semibold text-white">Registrar Licenciatura</button>
              </form>
            )}
            <h2 className="font-bold text-slate-800">Licenciaturas</h2>
            <ul className="divide-y pt-2 text-xs">
              {licenciaturas.map((l) => <li key={l.id} className="py-1.5">{l.nombre}</li>)}
            </ul>
          </div>

          <form onSubmit={guardarCiclo} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 text-sm shadow-sm">
            <h2 className="font-bold text-slate-800">{editCicloId ? 'Editar Ciclo de Acreditación' : 'Alta de Ciclo de Acreditación'}</h2>
            <select value={cicloLicId} onChange={(e) => setCicloLicId(Number(e.target.value))} className="w-full rounded border px-3 py-2">
              {licenciaturas.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </select>
            <select value={cicloOrgId} onChange={(e) => setCicloOrgId(Number(e.target.value))} className="w-full rounded border px-3 py-2">
              {(catalogos?.organismos || []).map((o) => <option key={o.id} value={o.id}>{o.siglas} - {o.nombre}</option>)}
            </select>
            <label className="block text-xs font-medium text-slate-700">
              Fecha de acreditación
              <input type="date" required value={cicloFecha} onChange={(e) => setCicloFecha(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Fin de vigencia
              <input type="date" required min={cicloFecha} value={cicloFechaFin} onChange={(e) => setCicloFechaFin(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
            </label>
            {editCicloId && (
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={cicloActivo} onChange={(e) => setCicloActivo(e.target.checked)} />
                Ciclo activo
              </label>
            )}
            <div className="flex gap-2">
              {editCicloId && (
                <button type="button" onClick={() => { setEditCicloId(null); setCicloFecha(''); setCicloFechaFin(''); setCicloActivo(true); }} className="rounded border px-4 py-2 text-xs font-semibold">
                  Cancelar
                </button>
              )}
              <button type="submit" className="rounded bg-[#0B2545] px-4 py-2 text-xs font-semibold text-white">
                {editCicloId ? 'Guardar cambios' : 'Registrar Ciclo'}
              </button>
            </div>
            <ul className="divide-y pt-2 text-xs">
              {ciclos.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    <strong>{c.licenciaturaNombre}</strong> • {c.organismoSiglas} ({c.fechaAcreditacion} al {c.fechaFinAcreditacion}) · {c.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  <button type="button" onClick={() => iniciarEdicionCiclo(c)} className="shrink-0 font-semibold text-[#134074] hover:underline">
                    Editar
                  </button>
                </li>
              ))}
            </ul>
          </form>
        </div>
      )}
    </div>
  );
}
