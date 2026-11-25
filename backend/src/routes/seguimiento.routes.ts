import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { PDFDocument } from 'pdf-lib';
import { pool } from '../config/db.js';
import { AuthRequest, verificarToken, requerirRoles } from '../middlewares/auth.js';
import { notificarJefaturas, notificarPlaneacion } from '../services/notificacionesEmail.js';

const router = Router();
const limiteArchivo = 20 * 1024 * 1024;
const cargarPdf = multer({ storage: multer.memoryStorage(), limits: { fileSize: limiteArchivo, files: 1 } });
router.use(verificarToken);

type EstadoInforme = 'BORRADOR' | 'ENVIADO' | 'DEVUELTO' | 'VALIDADO';

interface SeguimientoRow extends RowDataPacket {
  recomendacionId: number;
  licenciaturaId: number;
  licenciaturaNombre: string;
  cicloId: number;
  cicloEtiqueta: string;
  categoriaNombre: string;
  indicadorNombre: string;
  recomendacion: string;
  acciones: string;
  meta: string;
  areaResponsableNombre: string;
  fechaCumplimiento: string;
  seguimientoId: number | null;
  porcentajeId: number | null;
  porcentajeAvance: number | null;
  etiquetaAvance: string | null;
  observaciones: string | null;
  estatus: EstadoInforme;
  observacionesPlaneacion: string | null;
}

interface EvidenciaRow extends RowDataPacket {
  id: number;
  recomendacionId: number;
  tipo: 'PDF' | 'ENLACE';
  titulo: string;
  nombreArchivo: string | null;
  urlExterna: string | null;
  tamanoBytes: number | null;
}

interface AccesoRow extends RowDataPacket {
  licenciaturaId: number;
  licenciaturaNombre: string;
  estatusPlan: string;
  estatusInforme: EstadoInforme | null;
}

function directorioEvidencias(): string {
  const configurado = process.env.EVIDENCE_STORAGE_DIR;
  return configurado
    ? path.resolve(configurado)
    : path.resolve(process.cwd(), '..', 'storage', 'evidencias');
}

async function obtenerAcceso(recomendacionId: number, res: Response, req: AuthRequest): Promise<AccesoRow | null> {
  const [rows] = await pool.query<AccesoRow[]>(
    `SELECT rp.licenciatura_id AS licenciaturaId,l.nombre AS licenciaturaNombre,rp.estatus AS estatusPlan,
      sr.estatus AS estatusInforme
     FROM recomendaciones_plan rp
     JOIN licenciaturas l ON l.id=rp.licenciatura_id
     LEFT JOIN seguimiento_recomendaciones sr ON sr.recomendacion_id=rp.id
     WHERE rp.id=?`,
    [recomendacionId]
  );
  if (!rows.length) {
    res.status(404).json({ mensaje: 'Recomendación no encontrada.' });
    return null;
  }
  const row = rows[0];
  if (req.usuario!.rol === 'JEFATURA' && row.licenciaturaId !== req.usuario!.licenciaturaId) {
    res.status(403).json({ mensaje: 'Solo puedes consultar evidencias de tu licenciatura.' });
    return null;
  }
  if (row.estatusPlan === 'BORRADOR') {
    res.status(409).json({ mensaje: 'El Informe se habilita cuando la recomendación del Plan ha sido enviada.' });
    return null;
  }
  return row;
}

function cargarArchivo(req: AuthRequest, res: Response, next: NextFunction) {
  cargarPdf.single('archivo')(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ mensaje: 'El PDF excede el límite de 20 MB.' });
      return;
    }
    if (error) {
      res.status(400).json({ mensaje: 'No se pudo recibir el archivo.' });
      return;
    }
    next();
  });
}

router.get('/', async (req: AuthRequest, res: Response) => {
  const usuario = req.usuario!;
  const licenciaSolicitada = req.query.licenciaturaId ? Number(req.query.licenciaturaId) : null;
  const cicloId = req.query.cicloId ? Number(req.query.cicloId) : null;
  if ((licenciaSolicitada !== null && (!Number.isSafeInteger(licenciaSolicitada) || licenciaSolicitada < 1)) ||
    (cicloId !== null && (!Number.isSafeInteger(cicloId) || cicloId < 1))) {
    res.status(400).json({ mensaje: 'Filtro de licenciatura o ciclo inválido.' }); return;
  }
  if (usuario.rol === 'JEFATURA' && licenciaSolicitada && licenciaSolicitada !== usuario.licenciaturaId) {
    res.status(403).json({ mensaje: 'No puedes consultar otra licenciatura.' }); return;
  }
  const licenciaturaId = usuario.rol === 'JEFATURA' ? usuario.licenciaturaId : licenciaSolicitada;
  const filtros: string[] = ["rp.estatus <> 'BORRADOR'"];
  const parametros: number[] = [];
  if (licenciaturaId) { filtros.push('rp.licenciatura_id=?'); parametros.push(licenciaturaId); }
  if (cicloId) { filtros.push('rp.ciclo_id=?'); parametros.push(cicloId); }

  try {
    const [rows] = await pool.query<SeguimientoRow[]>(
      `SELECT rp.id AS recomendacionId, rp.licenciatura_id AS licenciaturaId, l.nombre AS licenciaturaNombre,
        c.id AS cicloId, CONCAT(o.siglas, ' (', DATE_FORMAT(c.fecha_acreditacion, '%Y-%m-%d'),
          ' al ', DATE_FORMAT(c.fecha_fin_acreditacion, '%Y-%m-%d'), ')') AS cicloEtiqueta,
        cat.nombre AS categoriaNombre, ind.nombre AS indicadorNombre, rp.recomendacion, rp.acciones, rp.meta,
        ar.nombre AS areaResponsableNombre, DATE_FORMAT(rp.fecha_cumplimiento, '%Y-%m-%d') AS fechaCumplimiento,
        sr.id AS seguimientoId, sr.porcentaje_id AS porcentajeId, p.valor AS porcentajeAvance,
        p.etiqueta AS etiquetaAvance, sr.observaciones,
        COALESCE(sr.estatus, 'BORRADOR') AS estatus, sr.observaciones_planeacion AS observacionesPlaneacion
       FROM recomendaciones_plan rp
       JOIN licenciaturas l ON l.id=rp.licenciatura_id
       JOIN ciclos_acreditacion c ON c.id=rp.ciclo_id
       JOIN cat_organismos o ON o.id=c.organismo_id
       JOIN cat_categorias cat ON cat.id=rp.categoria_id
       JOIN cat_indicadores ind ON ind.id=rp.indicador_id
       JOIN cat_areas_responsables ar ON ar.id=rp.area_responsable_id
       LEFT JOIN seguimiento_recomendaciones sr ON sr.recomendacion_id=rp.id
       LEFT JOIN cat_porcentajes_avance p ON p.id=sr.porcentaje_id
       WHERE ${filtros.join(' AND ')}
       ORDER BY l.nombre, c.fecha_acreditacion DESC, rp.id`,
      parametros
    );
    if (!rows.length) { res.json([]); return; }
    const ids = rows.map((row) => row.recomendacionId);
    const [evidencias] = await pool.query<EvidenciaRow[]>(
      `SELECT id, recomendacion_id AS recomendacionId, tipo, titulo,
        nombre_archivo AS nombreArchivo, url_externa AS urlExterna, tamano_bytes AS tamanoBytes
       FROM evidencias_recomendacion WHERE recomendacion_id IN (${ids.map(() => '?').join(',')})
       ORDER BY creado_en`,
      ids
    );
    const porRecomendacion = new Map<number, EvidenciaRow[]>();
    for (const evidencia of evidencias) {
      const lista = porRecomendacion.get(evidencia.recomendacionId) || [];
      lista.push(evidencia);
      porRecomendacion.set(evidencia.recomendacionId, lista);
    }
    res.json(rows.map((row) => ({
      ...row,
      evidencias: (porRecomendacion.get(row.recomendacionId) || []).map((e) => ({
        id: e.id,
        tipo: e.tipo,
        titulo: e.titulo,
        nombreArchivo: e.nombreArchivo,
        urlExterna: e.urlExterna,
        tamanoBytes: e.tamanoBytes,
      })),
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'No se pudo consultar el Informe de Seguimiento.' });
  }
});

router.put('/:recomendacionId', requerirRoles('JEFATURA', 'ADMINISTRADOR'), async (req: AuthRequest, res: Response) => {
  const recomendacionId = Number(req.params.recomendacionId);
  const porcentajeId = req.body.porcentajeId === null || req.body.porcentajeId === ''
    ? null
    : Number(req.body.porcentajeId);
  if (!Number.isSafeInteger(recomendacionId) || recomendacionId < 1 ||
    (porcentajeId !== null && (!Number.isSafeInteger(porcentajeId) || porcentajeId < 1))) {
    res.status(400).json({ mensaje: 'Recomendación o porcentaje inválido.' }); return;
  }
  const observaciones = req.body.observaciones == null ? null : String(req.body.observaciones).trim();
  try {
    const acceso = await obtenerAcceso(recomendacionId, res, req);
    if (!acceso) return;
    if (req.usuario!.rol === 'JEFATURA' &&
      acceso.estatusInforme !== null &&
      acceso.estatusInforme !== 'BORRADOR' &&
      acceso.estatusInforme !== 'DEVUELTO') {
      res.status(409).json({ mensaje: 'El Informe enviado o validado no se puede editar.' }); return;
    }
    if (porcentajeId !== null) {
      const [catalogo] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM cat_porcentajes_avance WHERE id=? AND activo=1',
        [porcentajeId]
      );
      if (!catalogo.length) { res.status(400).json({ mensaje: 'El porcentaje elegido no está activo.' }); return; }
    }
    await pool.query(
      `INSERT INTO seguimiento_recomendaciones (recomendacion_id, porcentaje_id, observaciones, actualizado_por)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE porcentaje_id=VALUES(porcentaje_id), observaciones=VALUES(observaciones),
         actualizado_por=VALUES(actualizado_por)`,
      [recomendacionId, porcentajeId, observaciones, req.usuario!.id]
    );
    res.json({ mensaje: 'Avance y observaciones guardados.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'No se pudo guardar el avance del Informe.' });
  }
});

router.patch('/:recomendacionId/estado', async (req: AuthRequest, res: Response) => {
  const recomendacionId = Number(req.params.recomendacionId);
  const siguiente = req.body.estatus as EstadoInforme;
  if (!Number.isSafeInteger(recomendacionId) || recomendacionId < 1) {
    res.status(400).json({ mensaje: 'Identificador de recomendación inválido.' }); return;
  }
  try {
    const acceso = await obtenerAcceso(recomendacionId, res, req);
    if (!acceso) return;
    if (req.usuario!.rol === 'ADMINISTRADOR' || req.usuario!.rol === 'PLANEADOR') {
      if (siguiente !== 'VALIDADO' && siguiente !== 'DEVUELTO') {
        res.status(400).json({ mensaje: 'Planeación solo puede validar o devolver el Informe.' }); return;
      }
      if (acceso.estatusInforme !== 'ENVIADO') {
        res.status(409).json({ mensaje: 'Solo se pueden revisar Informes enviados.' }); return;
      }
      const observaciones = String(req.body.observacionesPlaneacion || '').trim();
      if (siguiente === 'DEVUELTO' && !observaciones) {
        res.status(400).json({ mensaje: 'Indica las observaciones para devolver el Informe.' }); return;
      }
      const [result] = await pool.query<ResultSetHeader>(
        `UPDATE seguimiento_recomendaciones SET estatus=?, observaciones_planeacion=?, actualizado_por=?
         WHERE recomendacion_id=? AND estatus='ENVIADO'`,
        [siguiente, observaciones || null, req.usuario!.id, recomendacionId]
      );
      if (!result.affectedRows) { res.status(409).json({ mensaje: 'El Informe cambió; actualiza la pantalla.' }); return; }
      const estadoTexto = siguiente === 'VALIDADO' ? 'validado' : 'devuelto';
      const aviso = await notificarJefaturas(
        acceso.licenciaturaId,
        `Informe ${estadoTexto} - Seguimiento a la Mejora Continua`,
        `El Informe de la recomendación ${recomendacionId} de ${acceso.licenciaturaNombre} fue ${estadoTexto} por Planeación.${observaciones ? `\nObservaciones: ${observaciones}` : ''}`
      );
      res.json({
        mensaje: `${siguiente === 'VALIDADO' ? 'Informe validado.' : 'Informe devuelto con observaciones.'}${aviso ? ` ${aviso}` : ''}`,
      });
      return;
    }

    if (siguiente !== 'ENVIADO') {
      res.status(400).json({ mensaje: 'La Coordinación solo puede enviar el Informe.' }); return;
    }
    if (acceso.estatusInforme !== 'BORRADOR' && acceso.estatusInforme !== 'DEVUELTO') {
      res.status(409).json({ mensaje: 'Solo se pueden enviar Informes en borrador o devueltos.' }); return;
    }
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE seguimiento_recomendaciones SET estatus='ENVIADO', observaciones_planeacion=NULL, actualizado_por=?
       WHERE recomendacion_id=? AND estatus IN ('BORRADOR','DEVUELTO')`,
      [req.usuario!.id, recomendacionId]
    );
    if (!result.affectedRows) { res.status(409).json({ mensaje: 'El Informe cambió; actualiza la pantalla.' }); return; }
    const aviso = await notificarPlaneacion(
      'Nuevo Informe enviado a Planeación - Seguimiento a la Mejora Continua',
      `El Informe de la recomendación ${recomendacionId} de ${acceso.licenciaturaNombre} fue enviado a Planeación.`
    );
    res.json({ mensaje: `Informe enviado a Planeación.${aviso ? ` ${aviso}` : ''}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'No se pudo cambiar el estado del Informe.' });
  }
});

router.post('/:recomendacionId/evidencias/enlace', requerirRoles('JEFATURA', 'ADMINISTRADOR'), async (req: AuthRequest, res: Response) => {
  const recomendacionId = Number(req.params.recomendacionId);
  const titulo = String(req.body.titulo || '').trim();
  const valorUrl = String(req.body.url || '').trim();
  if (!Number.isSafeInteger(recomendacionId) || recomendacionId < 1 || !titulo || titulo.length > 255) {
    res.status(400).json({ mensaje: 'Indica un título válido para la evidencia.' }); return;
  }
  let url: URL;
  try {
    url = new URL(valorUrl);
  } catch {
    res.status(400).json({ mensaje: 'La liga de la evidencia no tiene un formato válido.' }); return;
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    res.status(400).json({ mensaje: 'La evidencia debe usar una liga HTTP o HTTPS.' }); return;
  }
  try {
    const acceso = await obtenerAcceso(recomendacionId, res, req);
    if (!acceso) return;
    if (req.usuario!.rol === 'JEFATURA' && acceso.estatusInforme !== null &&
      acceso.estatusInforme !== 'BORRADOR' && acceso.estatusInforme !== 'DEVUELTO') {
      res.status(409).json({ mensaje: 'El Informe enviado o validado no admite cambios en evidencias.' }); return;
    }
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO evidencias_recomendacion (recomendacion_id,tipo,titulo,url_externa,creado_por)
       VALUES (?,'ENLACE',?,?,?)`,
      [recomendacionId, titulo, url.toString(), req.usuario!.id]
    );
    res.status(201).json({ id: result.insertId, mensaje: 'Liga de evidencia agregada.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'No se pudo agregar la liga de evidencia.' });
  }
});

router.post('/:recomendacionId/evidencias/pdf', requerirRoles('JEFATURA', 'ADMINISTRADOR'), cargarArchivo, async (req: AuthRequest, res: Response) => {
  const recomendacionId = Number(req.params.recomendacionId);
  const file = req.file;
  if (!Number.isSafeInteger(recomendacionId) || recomendacionId < 1 || !file) {
    res.status(400).json({ mensaje: 'Selecciona un archivo PDF.' }); return;
  }
  try {
    const documento = await PDFDocument.load(file.buffer);
    if (documento.getPageCount() < 1) {
      res.status(400).json({ mensaje: 'El PDF debe contener al menos una página.' }); return;
    }
  } catch {
    res.status(400).json({ mensaje: 'El contenido del archivo no corresponde a un PDF válido.' }); return;
  }
  try {
    const acceso = await obtenerAcceso(recomendacionId, res, req);
    if (!acceso) return;
    if (req.usuario!.rol === 'JEFATURA' && acceso.estatusInforme !== null &&
      acceso.estatusInforme !== 'BORRADOR' && acceso.estatusInforme !== 'DEVUELTO') {
      res.status(409).json({ mensaje: 'El Informe enviado o validado no admite cambios en evidencias.' }); return;
    }
    const directorio = directorioEvidencias();
    await fs.mkdir(directorio, { recursive: true });
    const nombreAlmacenado = `${randomUUID()}.pdf`;
    const rutaCompleta = path.join(directorio, nombreAlmacenado);
    await fs.writeFile(rutaCompleta, file.buffer, { flag: 'wx', mode: 0o600 });
    try {
      const titulo = path.basename(file.originalname).slice(0, 255) || 'Evidencia PDF';
      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO evidencias_recomendacion
         (recomendacion_id,tipo,titulo,nombre_archivo,ruta_archivo,tamano_bytes,creado_por)
         VALUES (?,'PDF',?,?,?,?,?)`,
        [recomendacionId, titulo, titulo, nombreAlmacenado, file.size, req.usuario!.id]
      );
      res.status(201).json({ id: result.insertId, titulo, mensaje: 'Archivo PDF agregado.' });
    } catch (error) {
      await fs.unlink(rutaCompleta);
      throw error;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'No se pudo guardar el archivo de evidencia.' });
  }
});

router.get('/evidencias/:id/archivo', async (req: AuthRequest, res: Response) => {
  const evidenciaId = Number(req.params.id);
  if (!Number.isSafeInteger(evidenciaId) || evidenciaId < 1) {
    res.status(400).json({ mensaje: 'Identificador de evidencia inválido.' }); return;
  }
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT e.recomendacion_id AS recomendacionId,e.ruta_archivo AS rutaArchivo,
        e.nombre_archivo AS nombreArchivo,rp.licenciatura_id AS licenciaturaId,rp.estatus AS estatusPlan
       FROM evidencias_recomendacion e
       JOIN recomendaciones_plan rp ON rp.id=e.recomendacion_id WHERE e.id=? AND e.tipo='PDF'`,
      [evidenciaId]
    );
    if (!rows.length) { res.status(404).json({ mensaje: 'Archivo de evidencia no encontrado.' }); return; }
    const row = rows[0];
    if (req.usuario!.rol === 'JEFATURA' && Number(row.licenciaturaId) !== req.usuario!.licenciaturaId) {
      res.status(403).json({ mensaje: 'No tienes permiso para consultar esta evidencia.' }); return;
    }
    if (row.estatusPlan === 'BORRADOR') {
      res.status(409).json({ mensaje: 'El Informe se habilita cuando la recomendación del Plan ha sido enviada.' }); return;
    }
    const nombreAlmacenado = String(row.rutaArchivo || '');
    if (!nombreAlmacenado || path.basename(nombreAlmacenado) !== nombreAlmacenado) {
      res.status(404).json({ mensaje: 'Archivo de evidencia no disponible.' }); return;
    }
    const rutaCompleta = path.join(directorioEvidencias(), nombreAlmacenado);
    await fs.access(rutaCompleta);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="evidencia-${evidenciaId}.pdf"`);
    createReadStream(rutaCompleta).on('error', (error) => {
      console.error(error);
      if (!res.headersSent) res.status(404).json({ mensaje: 'Archivo de evidencia no disponible.' });
      else res.end();
    }).pipe(res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.status(404).json({ mensaje: 'Archivo de evidencia no disponible.' });
  }
});

router.delete('/evidencias/:id', requerirRoles('JEFATURA', 'ADMINISTRADOR'), async (req: AuthRequest, res: Response) => {
  const evidenciaId = Number(req.params.id);
  if (!Number.isSafeInteger(evidenciaId) || evidenciaId < 1) {
    res.status(400).json({ mensaje: 'Identificador de evidencia inválido.' }); return;
  }
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT e.recomendacion_id AS recomendacionId,e.ruta_archivo AS rutaArchivo,
        rp.licenciatura_id AS licenciaturaId,rp.estatus AS estatusPlan,
        sr.estatus AS estatusInforme
       FROM evidencias_recomendacion e
       JOIN recomendaciones_plan rp ON rp.id=e.recomendacion_id
       LEFT JOIN seguimiento_recomendaciones sr ON sr.recomendacion_id=rp.id
       WHERE e.id=?`,
      [evidenciaId]
    );
    if (!rows.length) { res.status(404).json({ mensaje: 'Evidencia no encontrada.' }); return; }
    if (req.usuario!.rol === 'JEFATURA' && Number(rows[0].licenciaturaId) !== req.usuario!.licenciaturaId) {
      res.status(403).json({ mensaje: 'No tienes permiso para eliminar esta evidencia.' }); return;
    }
    if (rows[0].estatusPlan === 'BORRADOR') {
      res.status(409).json({ mensaje: 'El Informe se habilita cuando la recomendación del Plan ha sido enviada.' }); return;
    }
    if (req.usuario!.rol === 'JEFATURA' && rows[0].estatusInforme !== null &&
      rows[0].estatusInforme !== 'BORRADOR' && rows[0].estatusInforme !== 'DEVUELTO') {
      res.status(409).json({ mensaje: 'El Informe enviado o validado no admite cambios en evidencias.' }); return;
    }
    const ruta = String(rows[0].rutaArchivo || '');
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM evidencias_recomendacion WHERE id=?',
      [evidenciaId]
    );
    if (result.affectedRows && ruta && path.basename(ruta) === ruta) {
      await fs.unlink(path.join(directorioEvidencias(), ruta)).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
    res.json({ mensaje: 'Evidencia eliminada.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'No se pudo eliminar la evidencia.' });
  }
});

export default router;
