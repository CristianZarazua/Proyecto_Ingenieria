import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import planesRoutes from './routes/planes.routes.js';
import ticketsRoutes from './routes/tickets.routes.js';

dotenv.config();
const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, servicio: 'API Mejora Continua FES Acatlán', db: 'conectada' });
  } catch {
    res.status(500).json({ ok: false, db: 'sin conexion' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api', adminRoutes);
app.use('/api/planes', planesRoutes);
app.use('/api/tickets', ticketsRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API corriendo en http://localhost:${PORT}`);
});
