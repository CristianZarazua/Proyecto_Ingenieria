import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
export interface PayloadUsuario { id: number; nombre: string; email: string; rol: 'ADMINISTRADOR' | 'PLANEADOR' | 'JEFATURA'; tipoCuenta: 'ADMIN' | 'TITULAR' | 'AUXILIAR'; licenciaturaId: number | null; licenciaturaNombre?: string | null; activo: boolean; bloqueado: boolean; }
export interface AuthRequest extends Request { usuario?: PayloadUsuario; }
const SECRET = process.env.JWT_SECRET || 'clave_secreta_fes_acatlan_2026';
export const firmarToken = (p: PayloadUsuario) => jwt.sign(p, SECRET, { expiresIn: '12h' });
export function verificarToken(req: AuthRequest, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) { res.status(401).json({ mensaje: 'Token requerido.' }); return; }
  try { req.usuario = jwt.verify(h.split(' ')[1], SECRET) as PayloadUsuario; next(); } catch { res.status(401).json({ mensaje: 'Sesión expirada.' }); }
}
export const requerirRoles = (...roles: Array<PayloadUsuario['rol']>) => (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.usuario || !roles.includes(req.usuario.rol)) { res.status(403).json({ mensaje: 'Sin permisos.' }); return; }
  next();
};
