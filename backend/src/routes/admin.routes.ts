import { Router, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../config/db.js';
import { AuthRequest, verificarToken, requerirRoles } from '../middlewares/auth.js';
const router = Router();
router.use(verificarToken);
router.get('/usuarios', requerirRoles('ADMINISTRADOR'), async (_req: AuthRequest, res: Response) => {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT u.id,u.nombre,u.email,u.rol,u.tipo_cuenta AS tipoCuenta,u.licenciatura_id AS licenciaturaId,l.nombre AS licenciaturaNombre,u.activo,u.bloqueado FROM usuarios u LEFT JOIN licenciaturas l ON u.licenciatura_id=l.id ORDER BY u.id');
  res.json(rows.map((r) => ({ ...r, activo: Boolean(r.activo), bloqueado: Boolean(r.bloqueado) })));
});
router.post('/usuarios', requerirRoles('ADMINISTRADOR'), async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, rol, tipoCuenta } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();
    const licId = rol === 'JEFATURA' ? Number(req.body.licenciaturaId) : null;
    if (!email.endsWith('@pcpuma.acatlan.unam.mx')) { res.status(400).json({ mensaje: 'Correo inválido.' }); return; }
    if (rol === 'JEFATURA') {
      const [c] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS t FROM usuarios WHERE rol='JEFATURA' AND licenciatura_id=? AND activo=1", [licId]);
      if (Number(c[0].t) >= 2) { res.status(400).json({ mensaje: 'Máximo 2 cuentas activas por licenciatura.' }); return; }
    }
    const [r] = await pool.query<ResultSetHeader>('INSERT INTO usuarios (nombre,email,rol,tipo_cuenta,licenciatura_id,activo) VALUES (?,?,?,?,?,1)', [String(nombre).trim(), email, rol, rol === 'ADMINISTRADOR' ? 'ADMIN' : (tipoCuenta || 'TITULAR'), licId]);
    res.status(201).json({ id: r.insertId });
  } catch (e: unknown) { res.status(400).json({ mensaje: (e as { code?: string }).code === 'ER_DUP_ENTRY' ? 'Correo duplicado.' : 'Error al registrar.' }); }
});
router.put('/usuarios/:id', requerirRoles('ADMINISTRADOR'), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id); const { nombre, rol, tipoCuenta, activo } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();
    const licId = rol === 'JEFATURA' ? Number(req.body.licenciaturaId) : null; const act = activo !== false ? 1 : 0;
    if (rol === 'JEFATURA' && act === 1) {
      const [c] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS t FROM usuarios WHERE rol='JEFATURA' AND licenciatura_id=? AND activo=1 AND id<>?", [licId, id]);
      if (Number(c[0].t) >= 2) { res.status(400).json({ mensaje: 'Máximo 2 cuentas activas.' }); return; }
    }
    await pool.query('UPDATE usuarios SET nombre=?,email=?,rol=?,tipo_cuenta=?,licenciatura_id=?,activo=? WHERE id=?', [String(nombre).trim(), email, rol, rol === 'ADMINISTRADOR' ? 'ADMIN' : (tipoCuenta || 'TITULAR'), licId, act, id]);
    res.json({ mensaje: 'Actualizado.' });
  } catch { res.status(400).json({ mensaje: 'Error al actualizar.' }); }
});
router.patch('/usuarios/:id/estado', requerirRoles('ADMINISTRADOR'), async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id); const act = req.body.activo ? 1 : 0;
  const [rows] = await pool.query<RowDataPacket[]>('SELECT rol, licenciatura_id FROM usuarios WHERE id=?', [id]);
  if (!rows.length) { res.status(404).json({ mensaje: 'No encontrado.' }); return; }
  if (act === 0 && rows[0].rol === 'ADMINISTRADOR') {
    const [a] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS t FROM usuarios WHERE rol='ADMINISTRADOR' AND activo=1 AND id<>?", [id]);
    if (!Number(a[0].t)) { res.status(400).json({ mensaje: 'No puede desactivar al único Administrador.' }); return; }
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
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT c.id,c.licenciatura_id AS licenciaturaId,l.nombre AS licenciaturaNombre,c.organismo_id AS organismoId,o.siglas AS organismoSiglas,o.nombre AS organismoNombre,DATE_FORMAT(c.fecha_acreditacion,'%Y-%m-%d') AS fechaAcreditacion,c.activo FROM ciclos_acreditacion c JOIN licenciaturas l ON c.licenciatura_id=l.id JOIN cat_organismos o ON c.organismo_id=o.id ${f} ORDER BY c.fecha_acreditacion DESC`, u.rol === 'JEFATURA' && u.licenciaturaId ? [u.licenciaturaId] : []);
  res.json(rows.map((r) => ({ ...r, activo: Boolean(r.activo) })));
});
router.post('/ciclos', requerirRoles('ADMINISTRADOR'), async (req: AuthRequest, res: Response) => {
  try { const [r] = await pool.query<ResultSetHeader>('INSERT INTO ciclos_acreditacion (licenciatura_id,organismo_id,fecha_acreditacion,activo) VALUES (?,?,?,1)', [Number(req.body.licenciaturaId), Number(req.body.organismoId), req.body.fechaAcreditacion]); res.status(201).json({ id: r.insertId }); }
  catch { res.status(400).json({ mensaje: 'Error al crear ciclo.' }); }
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
router.post('/catalogos/:tipo', requerirRoles('ADMINISTRADOR'), async (req: AuthRequest, res: Response) => {
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
router.put('/catalogos/:tipo/:id', requerirRoles('ADMINISTRADOR'), async (req: AuthRequest, res: Response) => {
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
