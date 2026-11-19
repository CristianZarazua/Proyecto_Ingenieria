import { Router, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';
import { enviarCorreoOtp } from '../config/mailer.js';
import { firmarToken, PayloadUsuario } from '../middlewares/auth.js';

const router = Router();
const DOMINIO = '@pcpuma.acatlan.unam.mx';

router.post('/solicitar-acceso', async (req: Request, res: Response) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email.endsWith(DOMINIO)) {
      res.status(400).json({ mensaje: `Solo se permiten correos institucionales ${DOMINIO}` });
      return;
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, nombre, email, rol, programa_id, bloqueado FROM usuarios WHERE LOWER(email) = ?',
      [email]
    );
    if (rows.length === 0) {
      res.status(404).json({ mensaje: 'El correo no está dado de alta en el sistema.' });
      return;
    }

    const u = rows[0];
    if (u.bloqueado) {
      res.status(403).json({ mensaje: 'Cuenta bloqueada tras 3 intentos fallidos. Contacte al Administrador.' });
      return;
    }

    if (u.rol === 'ADMINISTRADOR') {
      await pool.query('UPDATE usuarios SET intentos_fallidos = 0 WHERE id = ?', [u.id]);
      const payload: PayloadUsuario = { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, programaId: u.programa_id };
      res.json({ requiereOtp: false, token: firmarToken(payload), usuario: payload });
      return;
    }

    const codigoOtp = Math.floor(100000 + Math.random() * 900000).toString();
    await pool.query(
      'UPDATE usuarios SET codigo_otp = ?, otp_expira_en = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE id = ?',
      [codigoOtp, u.id]
    );
    const enviado = await enviarCorreoOtp(u.email, codigoOtp);
    res.json({ requiereOtp: true, mensaje: 'Código generado.', ...(enviado ? {} : { codigoSimulado: codigoOtp }) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al solicitar acceso.' });
  }
});

router.post('/verificar-otp', async (req: Request, res: Response) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const codigo = String(req.body.codigo || '').trim();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, nombre, email, rol, programa_id, codigo_otp, intentos_fallidos, bloqueado,
              (otp_expira_en IS NOT NULL AND otp_expira_en >= NOW()) AS vigente
       FROM usuarios WHERE LOWER(email) = ?`,
      [email]
    );
    if (rows.length === 0) {
      res.status(404).json({ mensaje: 'Usuario no encontrado.' });
      return;
    }

    const u = rows[0];
    if (u.bloqueado) {
      res.status(403).json({ mensaje: 'Cuenta bloqueada. Contacte al Administrador.' });
      return;
    }

    if (!u.codigo_otp || u.codigo_otp !== codigo || !u.vigente) {
      const fallos = Number(u.intentos_fallidos || 0) + 1;
      if (fallos >= 3) {
        await pool.query('UPDATE usuarios SET intentos_fallidos = ?, bloqueado = 1, codigo_otp = NULL WHERE id = ?', [fallos, u.id]);
        res.status(403).json({ mensaje: 'Límite de 3 intentos excedido. Cuenta bloqueada.' });
        return;
      }
      await pool.query('UPDATE usuarios SET intentos_fallidos = ? WHERE id = ?', [fallos, u.id]);
      res.status(401).json({ mensaje: `Código incorrecto o expirado. Intento ${fallos} de 3.` });
      return;
    }

    await pool.query('UPDATE usuarios SET intentos_fallidos = 0, codigo_otp = NULL, otp_expira_en = NULL WHERE id = ?', [u.id]);
    const payload: PayloadUsuario = { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, programaId: u.programa_id };
    res.json({ token: firmarToken(payload), usuario: payload });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al verificar código.' });
  }
});

export default router;
