import { Router, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../config/db.js';
import { AuthRequest, verificarToken, requerirRoles } from '../middlewares/auth.js';

const router = Router();
router.use(verificarToken);

router.get('/', async (req: AuthRequest, res: Response) => {
  const usr = req.usuario!;
  const filtro = usr.rol === 'JEFATURA' && usr.programaId ? 'WHERE l.programa_id = ?' : '';
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT t.id, t.licenciatura_id AS licenciaturaId, u.email AS creadoPor, t.tipo, t.asunto,
            t.descripcion, COALESCE(t.respuesta_planeacion, '') AS respuestaPlaneacion,
            t.estatus, DATE_FORMAT(t.creado_en, '%Y-%m-%d') AS fechaCreacion
     FROM tickets_proceso t
     INNER JOIN usuarios u ON t.creado_por = u.id
     INNER JOIN licenciaturas l ON t.licenciatura_id = l.id
     ${filtro} ORDER BY t.id DESC`,
    usr.rol === 'JEFATURA' && usr.programaId ? [usr.programaId] : []
  );
  res.json(rows);
});

router.post('/', requerirRoles('JEFATURA'), async (req: AuthRequest, res: Response) => {
  const { licenciaturaId, tipo, asunto, descripcion } = req.body;
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO tickets_proceso (licenciatura_id, creado_por, tipo, asunto, descripcion) VALUES (?, ?, ?, ?, ?)',
    [Number(licenciaturaId), req.usuario!.id, tipo, asunto, descripcion]
  );
  res.status(201).json({ id: result.insertId, mensaje: 'Ticket registrado.' });
});

router.patch('/:id/responder', requerirRoles('ADMINISTRADOR', 'PLANEADOR'), async (req: AuthRequest, res: Response) => {
  await pool.query("UPDATE tickets_proceso SET respuesta_planeacion = ?, estatus = 'RESUELTO' WHERE id = ?", [req.body.respuesta, Number(req.params.id)]);
  res.json({ mensaje: 'Ticket resuelto.' });
});

export default router;
