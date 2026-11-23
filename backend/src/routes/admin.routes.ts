import { Router, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../config/db.js';
import { AuthRequest, verificarToken, requerirRoles } from '../middlewares/auth.js';
import { normalizarCorreoInstitucional } from '../utils/correoInstitucional.js';
const router = Router();
router.use(verificarToken);

type RolAlta = 'PLANEADOR' | 'JEFATURA';
type TipoCuentaJefatura = 'TITULAR' | 'AUXILIAR';

function esRolAlta(rol: unknown): rol is RolAlta {
  return rol === 'PLANEADOR' || rol === 'JEFATURA';
}

function esTipoCuentaJefatura(tipo: unknown): tipo is TipoCuentaJefatura {
  return tipo === 'TITULAR' || tipo === 'AUXILIAR';
}

function nombreDesdeCorreo(email: string): string {
  return email.split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ')
    .slice(0, 150);
}

async function validarLicenciaturaActiva(id: number): Promise<boolean> {
  if (!Number.isSafeInteger(id) || id < 1) return false;
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM licenciaturas WHERE id=? AND activa=1', [id]);
  return rows.length > 0;
}

function responderErrorAlta(res: Response, error: unknown): void {
  const detalle = error as { code?: string; sqlMessage?: string; message?: string };
  if (detalle.code === 'ER_DUP_ENTRY') {
    res.status(409).json({ mensaje: 'Ya existe una cuenta con ese correo institucional.' });
    return;
  }
  if (detalle.code === 'ER_SIGNAL_EXCEPTION') {
    res.status(409).json({ mensaje: detalle.sqlMessage || 'Se alcanzó el límite de cuentas activas para esa licenciatura.' });
    return;
  }
  console.error('Error al registrar cuentas institucionales:', error);
  res.status(500).json({ mensaje: 'No se pudieron registrar las cuentas. Inténtelo nuevamente.' });
}

router.get('/usuarios', requerirRoles('ADMINISTRADOR'), async (_req: AuthRequest, res: Response) => {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT u.id,u.nombre,u.email,u.rol,u.tipo_cuenta AS tipoCuenta,u.licenciatura_id AS licenciaturaId,l.nombre AS licenciaturaNombre,u.activo,u.bloqueado FROM usuarios u LEFT JOIN licenciaturas l ON u.licenciatura_id=l.id ORDER BY u.id');
  res.json(rows.map((r) => ({ ...r, activo: Boolean(r.activo), bloqueado: Boolean(r.bloqueado) })));
});
router.post('/usuarios', requerirRoles('ADMINISTRADOR'), async (req: AuthRequest, res: Response) => {
  try {
    const nombre = typeof req.body.nombre === 'string' ? req.body.nombre.trim() : '';
    const email = normalizarCorreoInstitucional(req.body.email);
    const { rol, tipoCuenta } = req.body;
    if (!nombre || nombre.length > 150) { res.status(400).json({ mensaje: 'Indique un nombre de hasta 150 caracteres.' }); return; }
    if (!email) { res.status(400).json({ mensaje: 'Indique un correo válido @pcpuma.acatlan.unam.mx.' }); return; }
    if (!esRolAlta(rol)) { res.status(400).json({ mensaje: 'Solo se pueden dar de alta cuentas de Jefatura o Planeador.' }); return; }
    const licId = rol === 'JEFATURA' ? Number(req.body.licenciaturaId) : null;
    const tipo = rol === 'JEFATURA' ? tipoCuenta : 'ADMIN';
    if (rol === 'JEFATURA') {
      if (!esTipoCuentaJefatura(tipo)) { res.status(400).json({ mensaje: 'Seleccione Jefatura titular o auxiliar.' }); return; }
      if (!(await validarLicenciaturaActiva(licId!))) { res.status(400).json({ mensaje: 'Seleccione una licenciatura activa.' }); return; }
      const [cuentas] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM usuarios WHERE rol='JEFATURA' AND licenciatura_id=? AND activo=1", [licId]);
      if (Number(cuentas[0].total) >= 2) { res.status(409).json({ mensaje: 'Máximo 2 cuentas activas por licenciatura.' }); return; }
    }
    const [r] = await pool.query<ResultSetHeader>(
      'INSERT INTO usuarios (nombre,email,rol,tipo_cuenta,licenciatura_id,activo) VALUES (?,?,?,?,?,1)',
      [nombre, email, rol, tipo, licId]
    );
    res.status(201).json({ id: r.insertId });
  } catch (error: unknown) {
    responderErrorAlta(res, error);
  }
});
router.post('/usuarios/lote', requerirRoles('ADMINISTRADOR'), async (req: AuthRequest, res: Response) => {
  try {
    const { rol } = req.body;
    if (!esRolAlta(rol)) { res.status(400).json({ mensaje: 'Solo se pueden dar de alta cuentas de Jefatura o Planeador.' }); return; }

    const emailsSinNormalizar: unknown[] = req.body.emails;
    if (!Array.isArray(emailsSinNormalizar) || !emailsSinNormalizar.length || emailsSinNormalizar.length > 100) {
      res.status(400).json({ mensaje: 'Indique entre 1 y 100 correos institucionales.' }); return;
    }
    const emails = emailsSinNormalizar.map(normalizarCorreoInstitucional);
    if (emails.some((email) => email === null)) {
      res.status(400).json({ mensaje: 'Todos los correos deben pertenecer a @pcpuma.acatlan.unam.mx.' }); return;
    }
    const correos = emails.filter((email): email is string => email !== null);
    if (new Set(correos).size !== correos.length) {
      res.status(400).json({ mensaje: 'La lista contiene correos repetidos.' }); return;
    }

    const [existentes] = await pool.query<RowDataPacket[]>('SELECT email FROM usuarios WHERE email IN (?)', [correos]);
    if (existentes.length) {
      const lista = existentes.map((cuenta) => cuenta.email).join(', ');
      res.status(409).json({ mensaje: `Ya existen cuentas para: ${lista}. No se creó ninguna cuenta.` }); return;
    }

    const licId = rol === 'JEFATURA' ? Number(req.body.licenciaturaId) : null;
    const tipoCuenta = rol === 'JEFATURA' ? req.body.tipoCuenta : 'ADMIN';
    if (rol === 'JEFATURA') {
      if (!esTipoCuentaJefatura(tipoCuenta)) { res.status(400).json({ mensaje: 'Seleccione Jefatura titular o auxiliar.' }); return; }
      if (!(await validarLicenciaturaActiva(licId!))) { res.status(400).json({ mensaje: 'Seleccione una licenciatura activa.' }); return; }
      const [cuentas] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM usuarios WHERE rol='JEFATURA' AND licenciatura_id=? AND activo=1", [licId]);
      if (Number(cuentas[0].total) + correos.length > 2) {
        res.status(409).json({ mensaje: 'El lote supera el máximo de 2 cuentas activas de Jefatura por licenciatura.' }); return;
      }
    }

    let conexion: Awaited<ReturnType<typeof pool.getConnection>> | null = null;
    try {
      conexion = await pool.getConnection();
      await conexion.beginTransaction();
      for (const email of correos) {
        await conexion.query<ResultSetHeader>(
          'INSERT INTO usuarios (nombre,email,rol,tipo_cuenta,licenciatura_id,activo) VALUES (?,?,?,?,?,1)',
          [nombreDesdeCorreo(email), email, rol, tipoCuenta, licId]
        );
      }
      await conexion.commit();
      res.status(201).json({ mensaje: `Se crearon ${correos.length} cuentas.`, creadas: correos.length });
    } catch (error: unknown) {
      if (conexion) {
        try {
          await conexion.rollback();
        } catch (rollbackError: unknown) {
          console.error('Error al revertir el alta por lote:', rollbackError);
        }
      }
      throw error;
    } finally {
      conexion?.release();
    }
  } catch (error: unknown) {
    responderErrorAlta(res, error);
  }
});
router.put('/usuarios/:id', requerirRoles('ADMINISTRADOR'), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const nombre = typeof req.body.nombre === 'string' ? req.body.nombre.trim() : '';
    const email = normalizarCorreoInstitucional(req.body.email);
    const { rol, tipoCuenta, activo } = req.body;
    if (!Number.isSafeInteger(id) || id < 1) { res.status(400).json({ mensaje: 'Identificador de cuenta inválido.' }); return; }
    if (!nombre || nombre.length > 150) { res.status(400).json({ mensaje: 'Indique un nombre de hasta 150 caracteres.' }); return; }
    if (!email) { res.status(400).json({ mensaje: 'Indique un correo válido @pcpuma.acatlan.unam.mx.' }); return; }
    if (!esRolAlta(rol)) { res.status(400).json({ mensaje: 'Solo se pueden gestionar cuentas de Jefatura o Planeador.' }); return; }
    const [cuentasExistentes] = await pool.query<RowDataPacket[]>('SELECT rol FROM usuarios WHERE id=?', [id]);
    if (!cuentasExistentes.length) { res.status(404).json({ mensaje: 'Cuenta no encontrada.' }); return; }
    if (cuentasExistentes[0].rol === 'ADMINISTRADOR') {
      res.status(403).json({ mensaje: 'Las cuentas de Administrador no se modifican desde esta operación.' }); return;
    }
    const licId = rol === 'JEFATURA' ? Number(req.body.licenciaturaId) : null;
    const tipo = rol === 'JEFATURA' ? tipoCuenta : 'ADMIN';
    const act = activo === true ? 1 : 0;
    if (rol === 'JEFATURA') {
      if (!esTipoCuentaJefatura(tipo)) { res.status(400).json({ mensaje: 'Seleccione Jefatura titular o auxiliar.' }); return; }
      if (!(await validarLicenciaturaActiva(licId!))) { res.status(400).json({ mensaje: 'Seleccione una licenciatura activa.' }); return; }
    }
    if (rol === 'JEFATURA' && act === 1) {
      const [c] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS t FROM usuarios WHERE rol='JEFATURA' AND licenciatura_id=? AND activo=1 AND id<>?", [licId, id]);
      if (Number(c[0].t) >= 2) { res.status(409).json({ mensaje: 'Máximo 2 cuentas activas por licenciatura.' }); return; }
    }
    await pool.query<ResultSetHeader>(
      'UPDATE usuarios SET nombre=?,email=?,rol=?,tipo_cuenta=?,licenciatura_id=?,activo=? WHERE id=?',
      [nombre, email, rol, tipo, licId, act, id]
    );
    res.json({ mensaje: 'Actualizado.' });
  } catch (error: unknown) {
    responderErrorAlta(res, error);
  }
});
router.patch('/usuarios/:id/estado', requerirRoles('ADMINISTRADOR'), async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id); const act = req.body.activo ? 1 : 0;
  if (!Number.isSafeInteger(id) || id < 1) { res.status(400).json({ mensaje: 'Identificador de cuenta inválido.' }); return; }
  const [rows] = await pool.query<RowDataPacket[]>('SELECT rol, licenciatura_id FROM usuarios WHERE id=?', [id]);
  if (!rows.length) { res.status(404).json({ mensaje: 'No encontrado.' }); return; }
  if (rows[0].rol === 'ADMINISTRADOR') {
    res.status(403).json({ mensaje: 'Las cuentas de Administrador no se modifican desde esta operación.' }); return;
  }
  await pool.query('UPDATE usuarios SET activo=?, bloqueado=0, intentos_fallidos=0 WHERE id=?', [act, id]);
  res.json({ mensaje: 'Estado actualizado.' });
});
router.get('/licenciaturas', async (req: AuthRequest, res: Response) => {
  const u = req.usuario!;
  const [rows] = await pool.query<RowDataPacket[]>(u.rol === 'JEFATURA' && u.licenciaturaId ? 'SELECT id,nombre,activa FROM licenciaturas WHERE id=?' : 'SELECT id,nombre,activa FROM licenciaturas ORDER BY nombre', u.rol === 'JEFATURA' && u.licenciaturaId ? [u.licenciaturaId] : []);
  res.json(rows.map((r) => ({ ...r, activa: Boolean(r.activa) })));
});
router.post('/licenciaturas', requerirRoles('ADMINISTRADOR'), async (req: AuthRequest, res: Response) => {
  try { const [r] = await pool.query<ResultSetHeader>('INSERT INTO licenciaturas (nombre,activa) VALUES (?,1)', [String(req.body.nombre || '').trim()]); res.status(201).json({ id: r.insertId }); }
  catch { res.status(400).json({ mensaje: 'Licenciatura duplicada.' }); }
});
router.get('/ciclos', async (req: AuthRequest, res: Response) => {
  const u = req.usuario!; const f = u.rol === 'JEFATURA' && u.licenciaturaId ? 'WHERE c.licenciatura_id=? AND c.activo=1' : '';
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT c.id,c.licenciatura_id AS licenciaturaId,l.nombre AS licenciaturaNombre,c.organismo_id AS organismoId,o.siglas AS organismoSiglas,o.nombre AS organismoNombre,DATE_FORMAT(c.fecha_acreditacion,'%Y-%m-%d') AS fechaAcreditacion,DATE_FORMAT(c.fecha_fin_acreditacion,'%Y-%m-%d') AS fechaFinAcreditacion,c.activo FROM ciclos_acreditacion c JOIN licenciaturas l ON c.licenciatura_id=l.id JOIN cat_organismos o ON c.organismo_id=o.id ${f} ORDER BY c.fecha_acreditacion DESC`, u.rol === 'JEFATURA' && u.licenciaturaId ? [u.licenciaturaId] : []);
  res.json(rows.map((r) => ({ ...r, activo: Boolean(r.activo) })));
});
router.post('/ciclos', requerirRoles('ADMINISTRADOR', 'PLANEADOR'), async (req: AuthRequest, res: Response) => {
  try {
    const licenciaturaId = Number(req.body.licenciaturaId);
    const organismoId = Number(req.body.organismoId);
    const fechaAcreditacion = String(req.body.fechaAcreditacion || '');
    const fechaFinAcreditacion = String(req.body.fechaFinAcreditacion || '');
    if (!Number.isSafeInteger(licenciaturaId) || !Number.isSafeInteger(organismoId) ||
      !fechaValida(fechaAcreditacion) || !fechaValida(fechaFinAcreditacion) ||
      fechaFinAcreditacion <= fechaAcreditacion) {
      res.status(400).json({ mensaje: 'Indique una licenciatura, un organismo y un periodo de acreditación válido.' }); return;
    }
    const [r] = await pool.query<ResultSetHeader>(
      'INSERT INTO ciclos_acreditacion (licenciatura_id,organismo_id,fecha_acreditacion,fecha_fin_acreditacion,activo) VALUES (?,?,?,?,1)',
      [licenciaturaId, organismoId, fechaAcreditacion, fechaFinAcreditacion]
    );
    res.status(201).json({ id: r.insertId });
  }
  catch { res.status(400).json({ mensaje: 'Error al crear ciclo.' }); }
});
router.put('/ciclos/:id', requerirRoles('ADMINISTRADOR', 'PLANEADOR'), async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const licenciaturaId = Number(req.body.licenciaturaId);
  const organismoId = Number(req.body.organismoId);
  const fechaAcreditacion = String(req.body.fechaAcreditacion || '');
  const fechaFinAcreditacion = String(req.body.fechaFinAcreditacion || '');
  const activo = req.body.activo !== false ? 1 : 0;
  if (!Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(licenciaturaId) ||
    !Number.isSafeInteger(organismoId) || !fechaValida(fechaAcreditacion) ||
    !fechaValida(fechaFinAcreditacion) || fechaFinAcreditacion <= fechaAcreditacion) {
    res.status(400).json({ mensaje: 'Indique un ciclo y un periodo de acreditación válido.' }); return;
  }
  try {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE ciclos_acreditacion SET licenciatura_id=?,organismo_id=?,fecha_acreditacion=?,fecha_fin_acreditacion=?,activo=? WHERE id=?',
      [licenciaturaId, organismoId, fechaAcreditacion, fechaFinAcreditacion, activo, id]
    );
    if (!result.affectedRows) { res.status(404).json({ mensaje: 'Ciclo no encontrado.' }); return; }
    res.json({ mensaje: 'Ciclo actualizado.' });
  } catch (e) {
    console.error(e);
    res.status(400).json({ mensaje: 'No se pudo actualizar el ciclo.' });
  }
});
router.get('/catalogos', async (req: AuthRequest, res: Response) => {
  const w = req.usuario!.rol === 'JEFATURA' ? 'WHERE activo=1' : '';
  const [categorias] = await pool.query<RowDataPacket[]>(`SELECT id,nombre,activo FROM cat_categorias ${w} ORDER BY id`);
  const [indicadores] = await pool.query<RowDataPacket[]>(`SELECT id,categoria_id AS categoriaId,nombre,activo FROM cat_indicadores ${w} ORDER BY id`);
  const [areas] = await pool.query<RowDataPacket[]>(`SELECT id,nombre,activo FROM cat_areas_responsables ${w} ORDER BY id`);
  const [porcentajes] = await pool.query<RowDataPacket[]>(`SELECT id,valor,etiqueta,activo FROM cat_porcentajes_avance ${w} ORDER BY valor`);
  const [organismos] = await pool.query<RowDataPacket[]>(`SELECT id,siglas,nombre,activo FROM cat_organismos ${w} ORDER BY siglas`);
  const b = (r: RowDataPacket[]) => r.map((x) => ({ ...x, activo: Boolean(x.activo) }));
  res.json({ categorias: b(categorias), indicadores: b(indicadores), areas: b(areas), porcentajes: b(porcentajes), organismos: b(organismos) });
});
router.post('/catalogos/:tipo', requerirRoles('ADMINISTRADOR', 'PLANEADOR'), async (req: AuthRequest, res: Response) => {
  try {
    const { tipo } = req.params; const a = req.body.activo !== false ? 1 : 0;
    if (tipo === 'categorias') await pool.query('INSERT INTO cat_categorias (nombre,activo) VALUES (?,?)', [req.body.nombre, a]);
    else if (tipo === 'indicadores') await pool.query('INSERT INTO cat_indicadores (categoria_id,nombre,activo) VALUES (?,?,?)', [Number(req.body.categoriaId), req.body.nombre, a]);
    else if (tipo === 'areas') await pool.query('INSERT INTO cat_areas_responsables (nombre,activo) VALUES (?,?)', [req.body.nombre, a]);
    else if (tipo === 'porcentajes') await pool.query('INSERT INTO cat_porcentajes_avance (valor,etiqueta,activo) VALUES (?,?,?)', [Number(req.body.valor), req.body.etiqueta, a]);
    else if (tipo === 'organismos') await pool.query('INSERT INTO cat_organismos (siglas,nombre,activo) VALUES (?,?,?)', [req.body.siglas, req.body.nombre, a]);
    res.status(201).json({ mensaje: 'Agregado.' });
  } catch { res.status(400).json({ mensaje: 'Error o duplicado.' }); }
});
router.put('/catalogos/:tipo/:id', requerirRoles('ADMINISTRADOR', 'PLANEADOR'), async (req: AuthRequest, res: Response) => {
  try {
    const { tipo, id } = req.params; const a = req.body.activo !== false ? 1 : 0;
    if (tipo === 'categorias') await pool.query('UPDATE cat_categorias SET nombre=?,activo=? WHERE id=?', [req.body.nombre, a, Number(id)]);
    else if (tipo === 'indicadores') await pool.query('UPDATE cat_indicadores SET categoria_id=?,nombre=?,activo=? WHERE id=?', [Number(req.body.categoriaId), req.body.nombre, a, Number(id)]);
    else if (tipo === 'areas') await pool.query('UPDATE cat_areas_responsables SET nombre=?,activo=? WHERE id=?', [req.body.nombre, a, Number(id)]);
    else if (tipo === 'porcentajes') await pool.query('UPDATE cat_porcentajes_avance SET valor=?,etiqueta=?,activo=? WHERE id=?', [Number(req.body.valor), req.body.etiqueta, a, Number(id)]);
    else if (tipo === 'organismos') await pool.query('UPDATE cat_organismos SET siglas=?,nombre=?,activo=? WHERE id=?', [req.body.siglas, req.body.nombre, a, Number(id)]);
    res.json({ mensaje: 'Actualizado.' });
  } catch { res.status(400).json({ mensaje: 'Error al actualizar.' }); }
});
export default router;

function fechaValida(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
