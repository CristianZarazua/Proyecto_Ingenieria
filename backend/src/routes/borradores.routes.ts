import { Router, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';
import { AuthRequest, verificarToken, requerirRoles } from '../middlewares/auth.js';

const router = Router();
router.use(verificarToken);

interface BorradorRow extends RowDataPacket {
  id: number;
  licenciaturaId: number | null;
  datos: string | Record<string, unknown>;
  actualizadoEn: string;
}

function decodificarDatos(datos: BorradorRow['datos']): Record<string, unknown> {
  const parsed = typeof datos === 'string' ? JSON.parse(datos) as unknown : datos;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('El contenido del borrador no es válido.');
  }
  return parsed as Record<string, unknown>;
}

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.query<BorradorRow[]>(
      `SELECT id, licenciatura_id AS licenciaturaId, datos_json AS datos,
        DATE_FORMAT(actualizado_en, '%Y-%m-%d %H:%i:%s') AS actualizadoEn
       FROM borradores_plan WHERE creado_por=? ORDER BY actualizado_en DESC`,
      [req.usuario!.id]
    );
    res.json(rows.map((row) => ({
      id: row.id,
      licenciaturaId: row.licenciaturaId,
      datos: decodificarDatos(row.datos),
      actualizadoEn: row.actualizadoEn,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'No se pudieron consultar tus borradores.' });
  }
});

router.post('/', requerirRoles('JEFATURA', 'ADMINISTRADOR'), async (req: AuthRequest, res: Response) => {
  const usuario = req.usuario!;
  const datos = req.body?.datos;
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    res.status(400).json({ mensaje: 'El contenido del borrador debe ser un objeto.' }); return;
  }
  const licenciaturaSolicitada = Number(datos.licenciaturaId) || null;
  const licenciaturaId = usuario.rol === 'JEFATURA'
    ? usuario.licenciaturaId
    : licenciaturaSolicitada;
  if (usuario.rol === 'JEFATURA' && licenciaturaId !== usuario.licenciaturaId) {
    res.status(403).json({ mensaje: 'Solo puedes crear borradores para tu licenciatura.' }); return;
  }

  try {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO borradores_plan (creado_por, licenciatura_id, datos_json) VALUES (?, ?, ?)',
      [usuario.id, licenciaturaId, JSON.stringify(datos)]
    );
    res.status(201).json({ id: result.insertId, mensaje: 'Borrador guardado.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'No se pudo guardar el borrador.' });
  }
});

router.put('/:id', requerirRoles('JEFATURA', 'ADMINISTRADOR'), async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const datos = req.body?.datos;
  if (!Number.isSafeInteger(id) || id < 1 || !datos || typeof datos !== 'object' || Array.isArray(datos)) {
    res.status(400).json({ mensaje: 'Identificador o contenido de borrador inválido.' }); return;
  }
  const usuario = req.usuario!;
  const licenciaturaId = usuario.rol === 'JEFATURA'
    ? usuario.licenciaturaId
    : Number(datos.licenciaturaId) || null;

  try {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE borradores_plan SET licenciatura_id=?, datos_json=? WHERE id=? AND creado_por=?',
      [licenciaturaId, JSON.stringify(datos), id, usuario.id]
    );
    if (!result.affectedRows) { res.status(404).json({ mensaje: 'Borrador no encontrado o no te pertenece.' }); return; }
    res.json({ mensaje: 'Borrador actualizado.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'No se pudo actualizar el borrador.' });
  }
});

router.delete('/:id', requerirRoles('JEFATURA', 'ADMINISTRADOR'), async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) { res.status(400).json({ mensaje: 'Identificador de borrador inválido.' }); return; }
  try {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM borradores_plan WHERE id=? AND creado_por=?',
      [id, req.usuario!.id]
    );
    if (!result.affectedRows) { res.status(404).json({ mensaje: 'Borrador no encontrado o no te pertenece.' }); return; }
    res.json({ mensaje: 'Borrador eliminado.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'No se pudo eliminar el borrador.' });
  }
});

export default router;
