import { Router, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../config/db.js';
import { AuthRequest, verificarToken, requerirRoles } from '../middlewares/auth.js';

const router = Router();
router.use(verificarToken);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const usr = req.usuario!;
    const cond: string[] = [];
    const params: Array<string | number> = [];

    if (usr.rol === 'JEFATURA' && usr.programaId) { cond.push('l.programa_id = ?'); params.push(usr.programaId); }
    if (req.query.anio && req.query.anio !== 'TODOS') { cond.push('c.anio = ?'); params.push(Number(req.query.anio)); }
    if (req.query.licenciaturaId && req.query.licenciaturaId !== 'TODAS') { cond.push('rp.licenciatura_id = ?'); params.push(Number(req.query.licenciaturaId)); }
    if (req.query.categoria && req.query.categoria !== 'TODAS') { cond.push('cat.nombre = ?'); params.push(String(req.query.categoria)); }
    if (req.query.indicador && req.query.indicador !== 'TODOS') { cond.push('ind.nombre = ?'); params.push(String(req.query.indicador)); }
    if (req.query.estatus && req.query.estatus !== 'TODOS') { cond.push('rp.estatus = ?'); params.push(String(req.query.estatus)); }

    const where = cond.length > 0 ? `WHERE ${cond.join(' AND ')}` : '';
    const [planes] = await pool.query<RowDataPacket[]>(
      `SELECT rp.id, c.anio, rp.licenciatura_id AS licenciaturaId, cat.nombre AS categoria, ind.nombre AS indicador,
              rp.recomendacion, rp.acciones, rp.meta_medible AS metaMedible,
              DATE_FORMAT(rp.fecha_cumplimiento, '%Y-%m-%d') AS fechaCumplimiento,
              rp.porcentaje_avance AS porcentajeAvance, rp.estatus,
              COALESCE(rp.observaciones_planeacion, '') AS observacionesPlaneacion,
              ed.titulo_documento AS archivoPdfNombre, ed.url_drive AS urlDrive
       FROM recomendaciones_plan rp
       INNER JOIN ciclos_acreditacion c ON rp.ciclo_id = c.id
       INNER JOIN licenciaturas l ON rp.licenciatura_id = l.id
       INNER JOIN categorias cat ON rp.categoria_id = cat.id
       INNER JOIN indicadores ind ON rp.indicador_id = ind.id
       LEFT JOIN evidencias_drive ed ON ed.id = (SELECT MAX(id) FROM evidencias_drive WHERE recomendacion_id = rp.id)
       ${where} ORDER BY rp.id DESC`,
      params
    );

    const [historial] = await pool.query<RowDataPacket[]>(
      `SELECT hf.id, hf.recomendacion_id AS recomendacionId,
              DATE_FORMAT(hf.fecha_anterior, '%Y-%m-%d') AS fechaAnterior,
              DATE_FORMAT(hf.fecha_nueva, '%Y-%m-%d') AS fechaNueva,
              hf.motivo, u.email AS autor, DATE_FORMAT(hf.creado_en, '%Y-%m-%d') AS fechaRegistro
       FROM historial_fechas_plan hf INNER JOIN usuarios u ON hf.autor_id = u.id ORDER BY hf.id DESC`
    );

    res.json(planes.map((p) => ({ ...p, historialFechas: historial.filter((h) => h.recomendacionId === p.id) })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al consultar planes.' });
  }
});

router.post('/', requerirRoles('JEFATURA', 'ADMINISTRADOR'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { anio = 2026, licenciaturaId, categoria, indicador, recomendacion, acciones = '', metaMedible = '', fechaCumplimiento, porcentajeAvance = 0, estatus = 'BORRADOR', archivoPdfNombre, urlDrive } = req.body;

    let [cRows] = await conn.query<RowDataPacket[]>('SELECT id FROM ciclos_acreditacion WHERE anio = ? LIMIT 1', [Number(anio)]);
    let cicloId = cRows[0]?.id;
    if (!cicloId) {
      const [ins] = await conn.query<ResultSetHeader>('INSERT INTO ciclos_acreditacion (anio, etiqueta) VALUES (?, ?)', [Number(anio), `Ciclo ${anio}`]);
      cicloId = ins.insertId;
    }

    let [catRows] = await conn.query<RowDataPacket[]>('SELECT id FROM categorias WHERE nombre = ? LIMIT 1', [String(categoria).trim()]);
    let categoriaId = catRows[0]?.id;
    if (!categoriaId) {
      const [ins] = await conn.query<ResultSetHeader>('INSERT INTO categorias (nombre) VALUES (?)', [String(categoria).trim()]);
      categoriaId = ins.insertId;
    }

    let [indRows] = await conn.query<RowDataPacket[]>('SELECT id FROM indicadores WHERE categoria_id = ? AND nombre = ? LIMIT 1', [categoriaId, String(indicador).trim()]);
    let indicadorId = indRows[0]?.id;
    if (!indicadorId) {
      const [ins] = await conn.query<ResultSetHeader>('INSERT INTO indicadores (categoria_id, nombre) VALUES (?, ?)', [categoriaId, String(indicador).trim()]);
      indicadorId = ins.insertId;
    }

    const [insPlan] = await conn.query<ResultSetHeader>(
      `INSERT INTO recomendaciones_plan (ciclo_id, licenciatura_id, categoria_id, indicador_id, recomendacion, acciones, meta_medible, fecha_cumplimiento, porcentaje_avance, estatus)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cicloId, Number(licenciaturaId), categoriaId, indicadorId, recomendacion, acciones, metaMedible, fechaCumplimiento, Number(porcentajeAvance), estatus]
    );

    if (urlDrive && String(urlDrive).trim().startsWith('http')) {
      await conn.query(
        'INSERT INTO evidencias_drive (recomendacion_id, titulo_documento, url_drive, registrado_por) VALUES (?, ?, ?, ?)',
        [insPlan.insertId, String(archivoPdfNombre || 'Evidencia_PDF_Drive.pdf').trim(), String(urlDrive).trim(), req.usuario!.id]
      );
    }

    await conn.commit();
    res.status(201).json({ id: insPlan.insertId, mensaje: 'Recomendación registrada.' });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).json({ mensaje: 'Error al guardar recomendación.' });
  } finally {
    conn.release();
  }
});

router.patch('/:id/dictamen', requerirRoles('ADMINISTRADOR', 'PLANEADOR'), async (req: AuthRequest, res: Response) => {
  await pool.query('UPDATE recomendaciones_plan SET estatus = ?, observaciones_planeacion = ? WHERE id = ?', [req.body.estatus, req.body.observaciones || '', Number(req.params.id)]);
  res.json({ mensaje: 'Dictamen registrado.' });
});

router.patch('/:id/fecha', requerirRoles('ADMINISTRADOR', 'PLANEADOR'), async (req: AuthRequest, res: Response) => {
  const planId = Number(req.params.id);
  const [rows] = await pool.query<RowDataPacket[]>("SELECT DATE_FORMAT(fecha_cumplimiento, '%Y-%m-%d') AS actual FROM recomendaciones_plan WHERE id = ?", [planId]);
  if (rows.length === 0) { res.status(404).json({ mensaje: 'No encontrado.' }); return; }
  await pool.query('INSERT INTO historial_fechas_plan (recomendacion_id, fecha_anterior, fecha_nueva, motivo, autor_id) VALUES (?, ?, ?, ?, ?)', [planId, rows[0].actual, req.body.fechaNueva, req.body.motivo, req.usuario!.id]);
  await pool.query('UPDATE recomendaciones_plan SET fecha_cumplimiento = ? WHERE id = ?', [req.body.fechaNueva, planId]);
  res.json({ mensaje: 'Fecha actualizada.' });
});

export default router;
