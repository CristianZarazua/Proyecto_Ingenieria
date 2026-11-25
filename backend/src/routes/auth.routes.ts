import { Router, Request, Response } from 'express';
import { randomInt } from 'node:crypto';
import { RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';
import { enviarCorreoOtp } from '../config/mailer.js';
import { firmarToken, PayloadUsuario } from '../middlewares/auth.js';
import { normalizarCorreoInstitucional } from '../utils/correoInstitucional.js';
const router = Router();
router.post('/solicitar-acceso', async (req: Request, res: Response) => {
  try {
    const email = normalizarCorreoInstitucional(req.body.email);
    if (!email) { res.status(400).json({ mensaje: 'Indique un correo válido @pcpuma.acatlan.unam.mx.' }); return; }
    const [rows] = await pool.query<RowDataPacket[]>('SELECT u.*, l.nombre AS licNombre FROM usuarios u LEFT JOIN licenciaturas l ON u.licenciatura_id=l.id WHERE LOWER(u.email)=?', [email]);
    if (!rows.length) { res.status(404).json({ mensaje: 'Correo no registrado.' }); return; }
    const u = rows[0];
    if (!u.activo || u.bloqueado) { res.status(403).json({ mensaje: 'Cuenta inactiva o bloqueada.' }); return; }
    const p: PayloadUsuario = { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, tipoCuenta: u.tipo_cuenta, licenciaturaId: u.licenciatura_id, licenciaturaNombre: u.licNombre || null, activo: true, bloqueado: false };
    if (u.rol === 'ADMINISTRADOR' &&
      process.env.NODE_ENV === 'development' &&
      process.env.FORCE_ADMIN_OTP !== 'true') {
      await pool.query('UPDATE usuarios SET intentos_fallidos=0, codigo_otp=NULL, otp_expira_en=NULL WHERE id=?', [u.id]);
      res.json({ requiereOtp: false, token: firmarToken(p), usuario: p });
      return;
    }
    const otp = randomInt(100000, 1000000).toString();
    await pool.query('UPDATE usuarios SET codigo_otp=?, otp_expira_en=DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE id=?', [otp, u.id]);
    const ok = await enviarCorreoOtp(u.email, otp);
    res.json({ requiereOtp: true, ...(ok ? {} : { codigoSimulado: otp }) });
  } catch (e) { console.error(e); res.status(500).json({ mensaje: 'Error al solicitar acceso.' }); }
});
router.post('/verificar-otp', async (req: Request, res: Response) => {
  try {
    const email = normalizarCorreoInstitucional(req.body.email);
    const codigo = String(req.body.codigo || '').trim();
    if (!email) { res.status(400).json({ mensaje: 'Indique un correo válido @pcpuma.acatlan.unam.mx.' }); return; }
    const [rows] = await pool.query<RowDataPacket[]>('SELECT u.*, l.nombre AS licNombre, (u.otp_expira_en IS NOT NULL AND u.otp_expira_en>=NOW()) AS vigente FROM usuarios u LEFT JOIN licenciaturas l ON u.licenciatura_id=l.id WHERE LOWER(u.email)=?', [email]);
    if (!rows.length) { res.status(404).json({ mensaje: 'Usuario no encontrado.' }); return; }
    const u = rows[0];
    if (!u.activo || u.bloqueado) { res.status(403).json({ mensaje: 'Cuenta inactiva o bloqueada.' }); return; }
    if (!u.codigo_otp || u.codigo_otp !== codigo || !u.vigente) {
      const f = Number(u.intentos_fallidos || 0) + 1;
      await pool.query('UPDATE usuarios SET intentos_fallidos=?, bloqueado=?, codigo_otp=IF(?>=3,NULL,codigo_otp) WHERE id=?', [f, f >= 3 ? 1 : 0, f, u.id]);
      res.status(f >= 3 ? 403 : 401).json({ mensaje: f >= 3 ? 'Cuenta bloqueada por 3 intentos.' : `Código incorrecto (${f}/3).` }); return;
    }
    await pool.query('UPDATE usuarios SET intentos_fallidos=0, codigo_otp=NULL, otp_expira_en=NULL WHERE id=?', [u.id]);
    const p: PayloadUsuario = { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, tipoCuenta: u.tipo_cuenta, licenciaturaId: u.licenciatura_id, licenciaturaNombre: u.licNombre || null, activo: true, bloqueado: false };
    res.json({ token: firmarToken(p), usuario: p });
  } catch (e) { console.error(e); res.status(500).json({ mensaje: 'Error al verificar código.' }); }
});
export default router;
