import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface PayloadUsuario {
  id: number;
  nombre: string;
  email: string;
  rol: 'ADMINISTRADOR' | 'PLANEADOR' | 'JEFATURA';
  programaId: number | null;
}

export interface AuthRequest extends Request {
  usuario?: PayloadUsuario;
}

const JWT_SECRET = process.env.JWT_SECRET || 'clave_desarrollo_acatlan_2026';

export function firmarToken(payload: PayloadUsuario): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
}

export function verificarToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ mensaje: 'Token de autenticación requerido.' });
    return;
  }
  try {
    req.usuario = jwt.verify(header.split(' ')[1], JWT_SECRET) as PayloadUsuario;
    next();
  } catch {
    res.status(401).json({ mensaje: 'Sesión inválida o expirada.' });
  }
}

export function requerirRoles(...roles: Array<PayloadUsuario['rol']>) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      res.status(403).json({ mensaje: 'No cuenta con permisos para realizar esta acción.' });
      return;
    }
    next();
  };
}
