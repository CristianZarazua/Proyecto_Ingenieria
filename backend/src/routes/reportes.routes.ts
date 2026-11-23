import { Router, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';
import { AuthRequest, verificarToken } from '../middlewares/auth.js';
import { FilaReporte, generarPdf, generarWord, ModeloReporte } from '../services/reportes.js';

const router = Router();
router.use(verificarToken);

interface CicloReporteRow extends RowDataPacket {
  licenciaturaId: number;
  licenciatura: string;
  organismo: string;
  fechaInicio: string;
  fechaFin: string;
}

interface FilaReporteRow extends RowDataPacket {
  id: number;
  categoria: string;
  indicador: string;
  recomendacion: string;
  acciones: string;
  meta: string;
  areaResponsable: string;
  fechaCumplimiento: string;
  porcentaje: string | null;
  observaciones: string | null;
}

router.get('/:tipo/:formato', async (req: AuthRequest, res: Response) => {
  const { tipo, formato } = req.params;
  const cicloId = Number(req.query.cicloId);
  const licenciaturaSolicitada = req.query.licenciaturaId ? Number(req.query.licenciaturaId) : null;
  if ((tipo !== 'plan' && tipo !== 'informe') || (formato !== 'docx' && formato !== 'pdf') ||
    !Number.isSafeInteger(cicloId) || cicloId < 1 ||
    (licenciaturaSolicitada !== null && (!Number.isSafeInteger(licenciaturaSolicitada) || licenciaturaSolicitada < 1))) {
    res.status(400).json({ mensaje: 'Tipo, formato o filtro de reporte inválido.' }); return;
  }
  const usuario = req.usuario!;
  if (usuario.rol === 'JEFATURA' && licenciaturaSolicitada !== null &&
    licenciaturaSolicitada !== usuario.licenciaturaId) {
    res.status(403).json({ mensaje: 'No puedes generar reportes de otra licenciatura.' }); return;
  }
  const licenciaturaId = usuario.rol === 'JEFATURA'
    ? usuario.licenciaturaId
    : licenciaturaSolicitada;
  if (!licenciaturaId) { res.status(400).json({ mensaje: 'Selecciona la licenciatura del reporte.' }); return; }

  try {
    const [ciclos] = await pool.query<CicloReporteRow[]>(
      `SELECT c.licenciatura_id AS licenciaturaId,l.nombre AS licenciatura,
        o.nombre AS organismo,DATE_FORMAT(c.fecha_acreditacion,'%Y-%m-%d') AS fechaInicio,
        DATE_FORMAT(c.fecha_fin_acreditacion,'%Y-%m-%d') AS fechaFin
       FROM ciclos_acreditacion c
       JOIN licenciaturas l ON l.id=c.licenciatura_id
       JOIN cat_organismos o ON o.id=c.organismo_id
       WHERE c.id=? AND c.licenciatura_id=?`,
      [cicloId, licenciaturaId]
    );
    if (!ciclos.length) { res.status(404).json({ mensaje: 'El ciclo no pertenece a la licenciatura seleccionada.' }); return; }
    const ciclo = ciclos[0];
    const [rows] = await pool.query<FilaReporteRow[]>(
      `SELECT rp.id,cat.nombre AS categoria,ind.nombre AS indicador,rp.recomendacion,rp.acciones,
        rp.meta,ar.nombre AS areaResponsable,DATE_FORMAT(rp.fecha_cumplimiento,'%Y-%m-%d') AS fechaCumplimiento,
        CONCAT(COALESCE(p.valor,0),'%') AS porcentaje,sr.observaciones
       FROM recomendaciones_plan rp
       JOIN cat_categorias cat ON cat.id=rp.categoria_id
       JOIN cat_indicadores ind ON ind.id=rp.indicador_id
       JOIN cat_areas_responsables ar ON ar.id=rp.area_responsable_id
       LEFT JOIN seguimiento_recomendaciones sr ON sr.recomendacion_id=rp.id
       LEFT JOIN cat_porcentajes_avance p ON p.id=sr.porcentaje_id
       WHERE rp.ciclo_id=? AND rp.licenciatura_id=?
         AND (rp.estatus<>'BORRADOR' OR (rp.creado_por=? AND ?='JEFATURA'))
       ORDER BY rp.id`,
      [cicloId, licenciaturaId, usuario.id, usuario.rol]
    );

    let evidenciasPorRecomendacion = new Map<number, string[]>();
    if (tipo === 'informe' && rows.length) {
      const ids = rows.map((row) => row.id);
      const [evidencias] = await pool.query<RowDataPacket[]>(
        `SELECT recomendacion_id AS recomendacionId,titulo,url_externa AS urlExterna
         FROM evidencias_recomendacion WHERE recomendacion_id IN (${ids.map(() => '?').join(',')})
         ORDER BY creado_en`,
        ids
      );
      evidenciasPorRecomendacion = new Map<number, string[]>();
      for (const evidencia of evidencias) {
        const entry = String(evidencia.urlExterna || evidencia.titulo);
        const lista = evidenciasPorRecomendacion.get(Number(evidencia.recomendacionId)) || [];
        lista.push(entry);
        evidenciasPorRecomendacion.set(Number(evidencia.recomendacionId), lista);
      }
    }

    const filas: FilaReporte[] = rows.map((row) => ({
      categoria: row.categoria,
      indicador: row.indicador,
      recomendacion: row.recomendacion,
      acciones: row.acciones,
      meta: row.meta,
      areaResponsable: row.areaResponsable,
      fechaCumplimiento: row.fechaCumplimiento,
      ...(tipo === 'informe' ? {
        porcentajeAvance: row.porcentaje || '0%',
        observaciones: row.observaciones || 'Ninguna',
        evidencias: (evidenciasPorRecomendacion.get(row.id) || ['Sin evidencias'])
          .map((item, index) => `${index + 1}. ${item}`)
          .join('\n'),
      } : {}),
    }));
    const modelo: ModeloReporte = {
      tipo: tipo === 'plan' ? 'PLAN' : 'INFORME',
      licenciatura: ciclo.licenciatura,
      organismo: ciclo.organismo,
      fechaInicio: ciclo.fechaInicio,
      fechaFin: ciclo.fechaFin,
      filas,
    };
    const buffer = formato === 'docx'
      ? await generarWord(modelo)
      : await generarPdf(modelo);
    const nombre = `${tipo}-${licenciaturaId}-ciclo-${cicloId}.${formato}`;
    res.setHeader('Content-Type', formato === 'docx'
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'No se pudo generar el reporte solicitado.' });
  }
});

export default router;
