import { Router, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';
import { AuthRequest, verificarToken, requerirRoles } from '../middlewares/auth.js';
const router = Router();
router.use(verificarToken);
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const u = req.usuario!; const reqLic = req.query.licenciaturaId ? Number(req.query.licenciaturaId) : null;
    if (u.rol === 'JEFATURA' && reqLic && reqLic !== u.licenciaturaId) { res.status(403).json({ mensaje: 'Acceso denegado a otra licenciatura.' }); return; }
    const f = u.rol === 'JEFATURA' ? u.licenciaturaId : reqLic;
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT rp.id,rp.ciclo_id AS cicloId,CONCAT(o.siglas,' (',DATE_FORMAT(c.fecha_acreditacion,'%Y-%m-%d'),')') AS cicloEtiqueta,rp.licenciatura_id AS licenciaturaId,l.nombre AS licenciaturaNombre,rp.categoria_id AS categoriaId,cat.nombre AS categoriaNombre,rp.indicador_id AS indicadorId,ind.nombre AS indicadorNombre,rp.area_responsable_id AS areaResponsableId,ar.nombre AS areaResponsableNombre,rp.recomendacion,rp.acciones,rp.meta,DATE_FORMAT(rp.fecha_cumplimiento,'%Y-%m-%d') AS fechaCumplimiento,DATE_FORMAT(rp.creado_en,'%Y-%m-%d') AS fechaRegistro FROM recomendaciones_plan rp JOIN ciclos_acreditacion c ON rp.ciclo_id=c.id JOIN cat_organismos o ON c.organismo_id=o.id JOIN licenciaturas l ON rp.licenciatura_id=l.id JOIN cat_categorias cat ON rp.categoria_id=cat.id JOIN cat_indicadores ind ON rp.indicador_id=ind.id JOIN cat_areas_responsables ar ON rp.area_responsable_id=ar.id ${f ? 'WHERE rp.licenciatura_id=?' : ''} ORDER BY rp.id DESC`, f ? [f] : []);
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ mensaje: 'Error al consultar planes.' }); }
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
