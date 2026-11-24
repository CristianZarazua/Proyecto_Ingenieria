import { Router, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';
import { AuthRequest, verificarToken, requerirRoles } from '../middlewares/auth.js';
const router = Router();
router.use(verificarToken);

type EstadoPlan = 'BORRADOR' | 'ENVIADO' | 'DEVUELTO' | 'VALIDADO';
interface EstadoPlanRow extends RowDataPacket {
  licenciaturaId: number;
  estatus: EstadoPlan;
}

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const u = req.usuario!; const reqLic = req.query.licenciaturaId ? Number(req.query.licenciaturaId) : null;
    if (u.rol === 'JEFATURA' && reqLic && reqLic !== u.licenciaturaId) { res.status(403).json({ mensaje: 'Acceso denegado a otra licenciatura.' }); return; }
    const f = u.rol === 'JEFATURA' ? u.licenciaturaId : reqLic;
    const restriction = u.rol === 'JEFATURA'
      ? "(rp.estatus<>'BORRADOR' AND rp.licenciatura_id=?) OR (rp.estatus='BORRADOR' AND rp.creado_por=?)"
      : `((rp.estatus<>'BORRADOR'${f ? ' AND rp.licenciatura_id=?' : ''}) OR (rp.estatus='BORRADOR' AND rp.creado_por=?))`;
    const parameters = u.rol === 'JEFATURA'
      ? [u.licenciaturaId, u.id]
      : f ? [f, u.id] : [u.id];
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT rp.id,rp.ciclo_id AS cicloId,
        CONCAT(o.siglas,' (',DATE_FORMAT(c.fecha_acreditacion,'%Y-%m-%d'),' al ',
          DATE_FORMAT(c.fecha_fin_acreditacion,'%Y-%m-%d'),')') AS cicloEtiqueta,
        rp.licenciatura_id AS licenciaturaId,l.nombre AS licenciaturaNombre,
        rp.categoria_id AS categoriaId,cat.nombre AS categoriaNombre,
        rp.indicador_id AS indicadorId,ind.nombre AS indicadorNombre,
        rp.area_responsable_id AS areaResponsableId,ar.nombre AS areaResponsableNombre,
        rp.recomendacion,rp.acciones,rp.meta,
        DATE_FORMAT(rp.fecha_cumplimiento,'%Y-%m-%d') AS fechaCumplimiento,
        DATE_FORMAT(rp.creado_en,'%Y-%m-%d') AS fechaRegistro,
        rp.estatus,rp.observaciones_planeacion AS observacionesPlaneacion
       FROM recomendaciones_plan rp
       JOIN ciclos_acreditacion c ON rp.ciclo_id=c.id
       JOIN cat_organismos o ON c.organismo_id=o.id
       JOIN licenciaturas l ON rp.licenciatura_id=l.id
       JOIN cat_categorias cat ON rp.categoria_id=cat.id
       JOIN cat_indicadores ind ON rp.indicador_id=ind.id
       JOIN cat_areas_responsables ar ON rp.area_responsable_id=ar.id
       WHERE ${restriction} ORDER BY rp.id DESC`,
      parameters
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al consultar planes.' });
  }
});

router.patch('/:id/estado', async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) { res.status(400).json({ mensaje: 'Identificador de recomendación inválido.' }); return; }

  try {
    const usuario = req.usuario!;
    const [rows] = await pool.query<EstadoPlanRow[]>(
      'SELECT licenciatura_id AS licenciaturaId, estatus FROM recomendaciones_plan WHERE id=?',
      [id]
    );
    if (!rows.length) { res.status(404).json({ mensaje: 'Recomendación no encontrada.' }); return; }
    const actual = rows[0].estatus;

    if (usuario.rol === 'ADMINISTRADOR' || usuario.rol === 'PLANEADOR') {
      const siguiente = req.body.estatus;
      if (siguiente !== 'VALIDADO' && siguiente !== 'DEVUELTO') {
        res.status(400).json({ mensaje: 'El administrador solo puede validar o devolver una recomendación.' }); return;
      }
      if (actual !== 'ENVIADO') {
        res.status(409).json({ mensaje: 'Solo se pueden revisar recomendaciones enviadas.' }); return;
      }
      const observaciones = String(req.body.observacionesPlaneacion || '').trim();
      if (siguiente === 'DEVUELTO' && !observaciones) {
        res.status(400).json({ mensaje: 'Indique el motivo de la devolución.' }); return;
      }
      const [result] = await pool.query<ResultSetHeader>(
        "UPDATE recomendaciones_plan SET estatus=?, observaciones_planeacion=? WHERE id=? AND estatus='ENVIADO'",
        [siguiente, observaciones || null, id]
      );
      if (!result.affectedRows) { res.status(409).json({ mensaje: 'La recomendación cambió; actualice la pantalla e intente de nuevo.' }); return; }
      res.json({ mensaje: siguiente === 'VALIDADO' ? 'Recomendación validada.' : 'Recomendación devuelta a la jefatura.' });
      return;
    }

    if (Number(rows[0].licenciaturaId) !== usuario.licenciaturaId) {
      res.status(403).json({ mensaje: 'Solo puede modificar recomendaciones de su licenciatura.' }); return;
    }
    if (req.body.estatus !== 'ENVIADO') {
      res.status(400).json({ mensaje: 'La jefatura solo puede enviar recomendaciones.' }); return;
    }

    if (actual === 'BORRADOR') {
      const [result] = await pool.query<ResultSetHeader>(
        "UPDATE recomendaciones_plan SET estatus='ENVIADO' WHERE id=? AND licenciatura_id=? AND estatus='BORRADOR'",
        [id, usuario.licenciaturaId]
      );
      if (!result.affectedRows) { res.status(409).json({ mensaje: 'La recomendación cambió; actualice la pantalla e intente de nuevo.' }); return; }
      res.json({ mensaje: 'Recomendación enviada a Planeación.' });
      return;
    }

    if (actual !== 'DEVUELTO') {
      res.status(409).json({ mensaje: 'Solo se pueden enviar recomendaciones en borrador o devueltas.' }); return;
    }

    const recomendacion = String(req.body.recomendacion || '').trim();
    const acciones = String(req.body.acciones || '').trim();
    const meta = String(req.body.meta || '').trim();
    const areaResponsableId = Number(req.body.areaResponsableId);
    const fechaCumplimiento = String(req.body.fechaCumplimiento || '');
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaCumplimiento)
      ? new Date(`${fechaCumplimiento}T00:00:00.000Z`)
      : null;
    const fechaNormalizada = fecha && Number.isFinite(fecha.getTime())
      ? fecha.toISOString().slice(0, 10)
      : '';
    if (!recomendacion || !acciones || !meta || !Number.isSafeInteger(areaResponsableId) ||
      areaResponsableId < 1 || fechaNormalizada !== fechaCumplimiento) {
      res.status(400).json({ mensaje: 'Complete los datos de la recomendación y verifique la fecha antes de reenviar.' }); return;
    }
    const [result] = await pool.query<ResultSetHeader>(
      "UPDATE recomendaciones_plan SET recomendacion=?, acciones=?, meta=?, area_responsable_id=?, fecha_cumplimiento=?, estatus='ENVIADO', observaciones_planeacion=NULL WHERE id=? AND licenciatura_id=? AND estatus='DEVUELTO'",
      [recomendacion, acciones, meta, areaResponsableId, fechaCumplimiento, id, usuario.licenciaturaId]
    );
    if (!result.affectedRows) { res.status(409).json({ mensaje: 'La recomendación cambió; actualice la pantalla e intente de nuevo.' }); return; }
    res.json({ mensaje: 'Correcciones guardadas y recomendación reenviada a Planeación.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al actualizar el estado de la recomendación.' });
  }
});

router.post('/', requerirRoles('JEFATURA', 'ADMINISTRADOR'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const u = req.usuario!; const { cicloId, licenciaturaId, categoriaId, indicadorId, recomendaciones } = req.body;
    const target = u.rol === 'JEFATURA' ? u.licenciaturaId : Number(licenciaturaId);
    if (u.rol === 'JEFATURA' && Number(licenciaturaId) !== u.licenciaturaId) { res.status(403).json({ mensaje: 'Solo puede capturar para su licenciatura.' }); return; }
    await conn.beginTransaction();
    for (const it of recomendaciones) {
      await conn.query('INSERT INTO recomendaciones_plan (ciclo_id,licenciatura_id,categoria_id,indicador_id,area_responsable_id,recomendacion,acciones,meta,fecha_cumplimiento,creado_por) VALUES (?,?,?,?,?,?,?,?,?,?)', [Number(cicloId), target, Number(categoriaId), Number(indicadorId), Number(it.areaResponsableId), String(it.recomendacion).trim(), String(it.acciones).trim(), String(it.meta).trim(), it.fechaCumplimiento, u.id]);
    }
    await conn.commit();
    res.status(201).json({ mensaje: `Se guardaron ${recomendaciones.length} recomendación(es).` });
  } catch (e) { await conn.rollback(); console.error(e); res.status(500).json({ mensaje: 'Error al guardar.' }); }
  finally { conn.release(); }
});
export default router;
