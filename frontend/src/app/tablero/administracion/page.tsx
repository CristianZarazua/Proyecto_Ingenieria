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

export default function AdministracionPage() {
  const [sesion, setSesion] = useState<Usuario | null>(null);
  const [tab, setTab] = useState<'cuentas' | 'catalogos' | 'ciclos'>('cuentas');

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [licenciaturas, setLicenciaturas] = useState<Licenciatura[]>([]);
  const [catalogos, setCatalogos] = useState<CatalogosSistema | null>(null);
  const [ciclos, setCiclos] = useState<CicloAcreditacion[]>([]);

  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  // Form Cuentas (PB-02)
  const [editUsuarioId, setEditUsuarioId] = useState<number | null>(null);
  const [nombreUsr, setNombreUsr] = useState('');
  const [emailUsr, setEmailUsr] = useState('');
  const [rolUsr, setRolUsr] = useState<RolUsuario>('JEFATURA');
  const [tipoCuentaUsr, setTipoCuentaUsr] = useState<TipoCuenta>('TITULAR');
  const [licUsr, setLicUsr] = useState<number>(1);
  const [activoUsr, setActivoUsr] = useState<boolean>(true);

  // Form Licenciaturas y Ciclos (PB-05)
  const [nombreLic, setNombreLic] = useState('');
  const [cicloLicId, setCicloLicId] = useState<number>(1);
  const [cicloOrgId, setCicloOrgId] = useState<number>(1);
  const [cicloFecha, setCicloFecha] = useState('');

  // Form Catalogos (PB-04)
  const [tipoCat, setTipoCat] = useState<'categorias' | 'indicadores' | 'areas' | 'porcentajes' | 'organismos'>('categorias');
  const [editCatId, setEditCatId] = useState<number | null>(null);
  const [catNombre, setCatNombre] = useState('');
  const [catExtra, setCatExtra] = useState('');
  const [catPadreId, setCatPadreId] = useState<number>(1);
  const [catActivo, setCatActivo] = useState<boolean>(true);

  const cargarTodo = async () => {
    const [usrs, lics, cats, cics] = await Promise.all([
      apiSistema.obtenerUsuarios(),
      apiSistema.obtenerLicenciaturas(),
      apiSistema.obtenerCatalogos(),
      apiSistema.obtenerCiclos(),
    ]);
    setUsuarios(usrs);
    setLicenciaturas(lics);
    setCatalogos(cats);
    setCiclos(cics);
    if (lics[0]) { setLicUsr(lics[0].id); setCicloLicId(lics[0].id); }
    if (cats.organismos[0]) setCicloOrgId(cats.organismos[0].id);
    if (cats.categorias[0]) setCatPadreId(cats.categorias[0].id);
  };

  useEffect(() => {
    const actual = apiSistema.obtenerSesion();
    if (!actual) return;
    setSesion(actual);
    if (actual.rol === 'ADMINISTRADOR') {
      cargarTodo().catch(() => {});
    }
  }, []);

  if (!sesion) return null;
  if (sesion.rol !== 'ADMINISTRADOR') {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">
        Acceso denegado: módulo exclusivo para el rol Administrador.
      </div>
    );
  }

  const guardarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    try {
      const payload = {
        nombre: nombreUsr,
        email: emailUsr,
        rol: rolUsr,
        tipoCuenta: rolUsr === 'ADMINISTRADOR' ? ('ADMIN' as TipoCuenta) : tipoCuentaUsr,
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
      await cargarTodo();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar cuenta.');
    }
  };

  const iniciarEdicionUsuario = (u: Usuario) => {
    setEditUsuarioId(u.id);
    setNombreUsr(u.nombre);
    setEmailUsr(u.email);
    setRolUsr(u.rol);
    setTipoCuentaUsr(u.tipoCuenta);
    if (u.licenciaturaId) setLicUsr(u.licenciaturaId);
    setActivoUsr(u.activo);
  };

  const alternarEstadoUsuario = async (u: Usuario) => {
    setError('');
    setMensaje('');
    try {
      await apiSistema.cambiarEstadoUsuario(u.id, !u.activo);
      setMensaje(!u.activo ? 'Cuenta reactivada.' : 'Cuenta desactivada (baja lógica).');
      await cargarTodo();
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
      await cargarTodo();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar licenciatura.');
    }
  };

  const guardarCiclo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    try {
      await apiSistema.crearCiclo({ licenciaturaId: cicloLicId, organismoId: cicloOrgId, fechaAcreditacion: cicloFecha });
      setCicloFecha('');
      setMensaje('Ciclo de acreditación registrado.');
      await cargarTodo();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar ciclo.');
    }
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
      await cargarTodo();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar en catálogo.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button onClick={() => setTab('cuentas')} className={`rounded px-4 py-2 text-xs font-semibold ${tab === 'cuentas' ? 'bg-[#0B2545] text-white' : 'bg-white text-slate-700 border'}`}>
          1. Cuentas (PB-02)
        </button>
        <button onClick={() => setTab('catalogos')} className={`rounded px-4 py-2 text-xs font-semibold ${tab === 'catalogos' ? 'bg-[#0B2545] text-white' : 'bg-white text-slate-700 border'}`}>
          2. Catálogos (PB-04)
        </button>
        <button onClick={() => setTab('ciclos')} className={`rounded px-4 py-2 text-xs font-semibold ${tab === 'ciclos' ? 'bg-[#0B2545] text-white' : 'bg-white text-slate-700 border'}`}>
          3. Licenciaturas y Ciclos (PB-05)
        </button>
      </div>

      {error && <div className="rounded border border-red-300 bg-red-50 p-3 text-xs font-medium text-red-700">{error}</div>}
      {mensaje && <div className="rounded border border-emerald-300 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">{mensaje}</div>}

      {tab === 'cuentas' && (
        <div className="space-y-6">
          <form onSubmit={guardarUsuario} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 text-sm shadow-sm">
            <h2 className="font-bold text-slate-800">{editUsuarioId ? 'Editar Cuenta' : 'Alta de Cuenta Institucional'} (Máx. 2 activas por licenciatura)</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <input type="text" placeholder="Nombre completo" required value={nombreUsr} onChange={(e) => setNombreUsr(e.target.value)} className="rounded border border-slate-300 px-3 py-2" />
              <input type="email" placeholder="correo@pcpuma.acatlan.unam.mx" required value={emailUsr} onChange={(e) => setEmailUsr(e.target.value)} className="rounded border border-slate-300 px-3 py-2" />
              <select value={rolUsr} onChange={(e) => setRolUsr(e.target.value as RolUsuario)} className="rounded border border-slate-300 px-3 py-2">
                <option value="JEFATURA">Rol: Jefatura</option>
                <option value="ADMINISTRADOR">Rol: Administrador</option>
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
                    <td className="p-3">{u.rol} ({u.tipoCuenta})</td>
                    <td className="p-3">{u.licenciaturaNombre || 'Global'}</td>
                    <td className="p-3">
                      <span className={`rounded px-2 py-0.5 font-semibold ${u.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                        {u.activo ? 'Activa' : 'Desactivada'}
                      </span>
                    </td>
                    <td className="p-3 space-x-2">
                      <button onClick={() => iniciarEdicionUsuario(u)} className="text-[#134074] font-semibold hover:underline">Editar</button>
                      <button onClick={() => alternarEstadoUsuario(u)} className="text-amber-700 font-semibold hover:underline">
                        {u.activo ? 'Dar de baja' : 'Reactivar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'catalogos' && catalogos && (
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

      {tab === 'ciclos' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <form onSubmit={guardarLicenciatura} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 text-sm shadow-sm">
            <h2 className="font-bold text-slate-800">Alta de Licenciatura</h2>
            <input type="text" placeholder="Nombre de la licenciatura" required value={nombreLic} onChange={(e) => setNombreLic(e.target.value)} className="w-full rounded border px-3 py-2" />
            <button type="submit" className="rounded bg-[#0B2545] px-4 py-2 text-xs font-semibold text-white">Registrar Licenciatura</button>
            <ul className="divide-y pt-2 text-xs">
              {licenciaturas.map((l) => <li key={l.id} className="py-1.5">{l.nombre}</li>)}
            </ul>
          </form>

          <form onSubmit={guardarCiclo} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 text-sm shadow-sm">
            <h2 className="font-bold text-slate-800">Alta de Ciclo de Acreditación</h2>
            <select value={cicloLicId} onChange={(e) => setCicloLicId(Number(e.target.value))} className="w-full rounded border px-3 py-2">
              {licenciaturas.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </select>
            <select value={cicloOrgId} onChange={(e) => setCicloOrgId(Number(e.target.value))} className="w-full rounded border px-3 py-2">
              {(catalogos?.organismos || []).map((o) => <option key={o.id} value={o.id}>{o.siglas} - {o.nombre}</option>)}
            </select>
            <input type="date" required value={cicloFecha} onChange={(e) => setCicloFecha(e.target.value)} className="w-full rounded border px-3 py-2" />
            <button type="submit" className="rounded bg-[#0B2545] px-4 py-2 text-xs font-semibold text-white">Registrar Ciclo</button>
            <ul className="divide-y pt-2 text-xs">
              {ciclos.map((c) => (
                <li key={c.id} className="py-1.5">
                  <strong>{c.licenciaturaNombre}</strong> • {c.organismoSiglas} ({c.fechaAcreditacion})
                </li>
              ))}
            </ul>
          </form>
        </div>
      )}
    </div>
  );
}
