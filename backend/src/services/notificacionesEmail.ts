import { RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';
import { enviarCorreo, smtpConfigurado } from '../config/mailer.js';

interface CorreoRow extends RowDataPacket {
  id: number;
  email: string;
}

interface PendientesRow extends RowDataPacket {
  id: number;
  email: string;
  planesPendientes: number;
  informesPendientes: number;
}

async function enviarA(correos: string[], asunto: string, texto: string): Promise<string | null> {
  const destinatarios = [...new Set(correos)];
  if (!destinatarios.length) return 'No hay destinatarios activos para esta notificación.';

  const resultados = await Promise.allSettled(
    destinatarios.map((correo) => enviarCorreo(correo, asunto, texto))
  );
  const fallidos = resultados.filter((resultado) =>
    resultado.status === 'rejected' || !resultado.value
  ).length;

  if (fallidos) {
    console.error(`Falló el envío de ${fallidos} de ${destinatarios.length} notificaciones.`);
    return 'El estado se actualizó, pero no se pudo enviar una o más notificaciones por correo.';
  }
  return null;
}

export async function notificarPlaneacion(asunto: string, texto: string): Promise<string | null> {
  try {
    const [rows] = await pool.query<CorreoRow[]>(
      `SELECT id,email FROM usuarios
       WHERE activo=1 AND bloqueado=0 AND rol IN ('ADMINISTRADOR','PLANEADOR')`
    );
    return await enviarA(rows.map((row) => row.email), asunto, texto);
  } catch (error) {
    console.error('Error al notificar a Planeación:', error);
    return 'El estado se actualizó, pero no se pudo enviar la notificación a Planeación.';
  }
}

export async function notificarJefaturas(
  licenciaturaId: number,
  asunto: string,
  texto: string
): Promise<string | null> {
  try {
    const [rows] = await pool.query<CorreoRow[]>(
      `SELECT id,email FROM usuarios
       WHERE rol='JEFATURA' AND licenciatura_id=? AND activo=1 AND bloqueado=0`,
      [licenciaturaId]
    );
    return await enviarA(rows.map((row) => row.email), asunto, texto);
  } catch (error) {
    console.error('Error al notificar a Jefatura:', error);
    return 'El estado se actualizó, pero no se pudo enviar la notificación a Jefatura.';
  }
}

function semanaLocal(fecha: Date): { esLunesNueve: boolean; lunes: string } {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fecha);
  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value || '';
  const anio = Number(valor('year'));
  const mes = Number(valor('month'));
  const dia = Number(valor('day'));
  const lunes = new Date(Date.UTC(anio, mes - 1, dia));
  lunes.setUTCDate(lunes.getUTCDate() - ((lunes.getUTCDay() + 6) % 7));

  return {
    esLunesNueve: valor('weekday') === 'Mon' && Number(valor('hour')) === 9,
    lunes: lunes.toISOString().slice(0, 10),
  };
}

let ultimaSemanaProcesada: string | null = null;
let recordatorioEnCurso = false;
let semanaAvisoSmtp: string | null = null;

export async function procesarRecordatoriosSemanales(fecha = new Date()): Promise<void> {
  const semana = semanaLocal(fecha);
  if (!semana.esLunesNueve || ultimaSemanaProcesada === semana.lunes || recordatorioEnCurso) return;
  if (!smtpConfigurado()) {
    if (semanaAvisoSmtp !== semana.lunes) {
      console.warn('Recordatorios semanales omitidos: configure SMTP para enviarlos.');
      semanaAvisoSmtp = semana.lunes;
    }
    return;
  }

  ultimaSemanaProcesada = semana.lunes;
  recordatorioEnCurso = true;
  try {
    const [usuarios] = await pool.query<PendientesRow[]>(
      `SELECT u.id,u.email,
        COALESCE(SUM(
          CASE WHEN rp.estatus='DEVUELTO'
            OR (rp.estatus='BORRADOR' AND rp.creado_por=u.id)
            THEN 1 ELSE 0 END
        ),0) AS planesPendientes,
        COALESCE(SUM(
          CASE WHEN rp.estatus<>'BORRADOR'
            AND COALESCE(sr.estatus,'BORRADOR') IN ('BORRADOR','DEVUELTO')
            THEN 1 ELSE 0 END
        ),0) AS informesPendientes
       FROM usuarios u
       LEFT JOIN recomendaciones_plan rp ON rp.licenciatura_id=u.licenciatura_id
       LEFT JOIN seguimiento_recomendaciones sr ON sr.recomendacion_id=rp.id
       WHERE u.rol='JEFATURA' AND u.activo=1 AND u.bloqueado=0
       GROUP BY u.id,u.email
       HAVING planesPendientes>0 OR informesPendientes>0`
    );

    for (const usuario of usuarios) {
      const [enviados] = await pool.query<RowDataPacket[]>(
        'SELECT usuario_id FROM recordatorios_semanales WHERE usuario_id=? AND semana=?',
        [usuario.id, semana.lunes]
      );
      if (enviados.length) continue;

      const texto = [
        'Tiene pendientes en el Sistema de Seguimiento a la Mejora Continua.',
        `Planes por atender: ${Number(usuario.planesPendientes)}.`,
        `Informes por atender: ${Number(usuario.informesPendientes)}.`,
        'Ingrese al sistema para revisar sus pendientes.',
      ].join('\n');

      try {
        const enviado = await enviarCorreo(
          usuario.email,
          'Resumen semanal de pendientes - Seguimiento a la Mejora Continua',
          texto
        );
        if (!enviado) throw new Error('SMTP no envió el recordatorio.');
        await pool.query(
          'INSERT INTO recordatorios_semanales (usuario_id,semana) VALUES (?,?)',
          [usuario.id, semana.lunes]
        );
      } catch (error) {
        console.error(`No se pudo enviar el recordatorio semanal al usuario ${usuario.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error al procesar recordatorios semanales:', error);
  } finally {
    recordatorioEnCurso = false;
  }
}
