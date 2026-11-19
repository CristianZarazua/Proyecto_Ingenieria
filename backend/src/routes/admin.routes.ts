import { Router, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../config/db.js';
import { AuthRequest, verificarToken, requerirRoles } from '../middlewares/auth.js';

const router = Router();
router.use(verificarToken);

router.get('/programas', async (_req: AuthRequest, res: Response) => {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id, nombre, activo FROM programas_carrera ORDER BY id ASC');
  res.json(rows.map((r) => ({ id: r.id, nombre: r.nombre, activo: Boolean(r.activo) })));
});

router.post('/programas', requerirRoles('ADMINISTRADOR'), async (req: AuthRequest, res: Response) => {
  try {
    const nombre = String(req.body.nombre || '').trim();
    const [result] = await pool.query<ResultSetHeader>('INSERT INTO programas_carrera (nombre) VALUES (?)', [nombre]);
    res.status(201).json({ id: result.insertId, nombre, activo: true });
  } catch {
    res.status(400).json({ mensaje: 'No se pudo registrar el Programa de Carrera.' });
  }
});

router.get('/licenciaturas', async (req: AuthRequest, res: Response) => {
  const usr = req.usuario!;
  const sql = usr.rol === 'JEFATURA' && usr.programaId
    ? 'SELECT id, programa_id AS programaId, nombre, activa FROM licenciaturas WHERE programa_id = ? ORDER BY nombre ASC'
    : 'SELECT id, programa_id AS programaId, nombre, activa FROM licenciaturas ORDER BY nombre ASC';
  const [rows] = await pool.query<RowDataPacket[]>(sql, usr.rol === 'JEFATURA' && usr.programaId ? [usr.programaId] : []);
  res.json(rows.map((r) => ({ ...r, activa: Boolean(r.activa) })));
});

router.post('/licenciaturas', requerirRoles('ADMINISTRADOR'), async (req: AuthRequest, res: Response) => {
  try {
    const nombre = String(req.body.nombre || '').trim();
    const programaId = Number(req.body.programaId);
    const [result] = await pool.query<ResultSetHeader>('INSERT INTO licenciaturas (programa_id, nombre) VALUES (?, ?)', [programaId, nombre]);
    res.status(201).json({ id: result.insertId, programaId, nombre, activa: true });
  } catch {
    res.status(400).json({ mensaje: 'No se pudo registrar la licenciatura.' });
  }
});

router.get('/usuarios', requerirRoles('ADMINISTRADOR', 'JEFATURA'), async (req: AuthRequest, res: Response) => {
  const usr = req.usuario!;
  const sql = usr.rol === 'JEFATURA'
    ? 'SELECT id, nombre, email, rol, programa_id AS programaId, intentos_fallidos AS intentosFallidos, bloqueado FROM usuarios WHERE programa_id = ?'
    : 'SELECT id, nombre, email, rol, programa_id AS programaId, intentos_fallidos AS intentosFallidos, bloqueado FROM usuarios ORDER BY id ASC';
  const [rows] = await pool.query<RowDataPacket[]>(sql, usr.rol === 'JEFATURA' ? [usr.programaId] : []);
  res.json(rows.map((r) => ({ ...r, bloqueado: Boolean(r.bloqueado) })));
});

router.post('/usuarios', requerirRoles('ADMINISTRADOR', 'JEFATURA'), async (req: AuthRequest, res: Response) => {
  try {
    const sol = req.usuario!;
    const nombre = String(req.body.nombre || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const rol = sol.rol === 'JEFATURA' ? 'JEFATURA' : req.body.rol;
    const programaId = sol.rol === 'JEFATURA' ? sol.programaId : rol === 'JEFATURA' ? Number(req.body.programaId) : null;

    if (!email.endsWith('@pcpuma.acatlan.unam.mx')) {
      res.status(400).json({ mensaje: 'El correo debe terminar en @pcpuma.acatlan.unam.mx' });
      return;
    }
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO usuarios (nombre, email, rol, programa_id) VALUES (?, ?, ?, ?)',
      [nombre, email, rol, programaId]
    );
    res.status(201).json({ id: result.insertId, nombre, email, rol, programaId, intentosFallidos: 0, bloqueado: false });
  } catch (err: unknown) {
    const e = err as { sqlState?: string; message?: string; code?: string };
    if (e.sqlState === '45000') { res.status(400).json({ mensaje: e.message }); return; }
    if (e.code === 'ER_DUP_ENTRY') { res.status(409).json({ mensaje: 'Ese correo ya está registrado.' }); return; }
    res.status(500).json({ mensaje: 'Error al registrar usuario.' });
  }
});

router.patch('/usuarios/:id/desbloquear', requerirRoles('ADMINISTRADOR'), async (req: AuthRequest, res: Response) => {
  await pool.query('UPDATE usuarios SET bloqueado = 0, intentos_fallidos = 0, codigo_otp = NULL WHERE id = ?', [Number(req.params.id)]);
  res.json({ mensaje: 'Cuenta desbloqueada.' });
});

export default router;
