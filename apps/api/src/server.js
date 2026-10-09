import './config/env.js';
import { envWarnings } from './config/env.js';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import goalRoutes from './routes/goals.js';
import proofRoutes from './routes/proofs.js';
import { requireAuth } from './middleware/auth.js';
import User from './models/User.js';
import Goal from './models/Goal.js';
import Proof from './models/Proof.js';

const app = express();
const port = Number(process.env.PORT) || 5000;
const isProd = process.env.NODE_ENV === 'production';
const clientOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim());
// In development, also accept any localhost / 127.0.0.1 / LAN origin on any port
// (Vite moves to 5174 when 5173 is busy, and --host exposes the LAN address).
const devOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/;
const originAllowed = (origin) => !origin || clientOrigins.includes(origin) || (!isProd && devOrigin.test(origin));

app.disable('x-powered-by');
app.use(cors({ origin: (origin, cb) => (originAllowed(origin) ? cb(null, true) : cb(new Error('Origin not allowed by CORS'))), credentials: false }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads'), { fallthrough: false, dotfiles: 'deny', index: false }));

app.get('/api/health', async (_req, res) => {
  const c = mongoose.connection;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const body = { status: c.readyState === 1 ? 'ok' : 'degraded', service: 'ProofLoop API', database: { state: states[c.readyState] || 'unknown', name: c.name || null, host: c.host ? `${c.host}:${c.port}` : null } };
  if (c.readyState === 1) {
    const [users, goals, proofs] = await Promise.all([User.estimatedDocumentCount(), Goal.estimatedDocumentCount(), Proof.estimatedDocumentCount()]);
    body.database.collections = { users, goals, proofs };
  }
  res.json(body);
});
app.use('/api/auth', authRoutes);
app.use('/api/goals', requireAuth, goalRoutes);
app.use('/api/proofs', requireAuth, proofRoutes);
app.use('/api', (_req, res) => res.status(404).json({ message: 'API route not found.' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.name === 'MulterError') return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? `File exceeds the ${process.env.MAX_UPLOAD_MB || 10} MB upload limit.` : err.message });
  if (err.message?.startsWith('Unsupported file type')) return res.status(400).json({ message: err.message });
  if (err.message?.includes('Origin not allowed')) return res.status(403).json({ message: 'This frontend origin is not allowed.' });
  if (err.name === 'ValidationError') return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(' ') });
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid id.' });
  return res.status(500).json({ message: isProd ? 'Unexpected server error.' : err.message || 'Unexpected server error.' });
});

async function start() {
  envWarnings.forEach((w) => console.warn(`[config] ${w}`));
  await connectDB();
  // Create collections + indexes right away so they appear in MongoDB Compass before the first write.
  await Promise.all([User.init(), Goal.init(), Proof.init()]);
  const [users, goals, proofs] = await Promise.all([User.countDocuments(), Goal.countDocuments(), Proof.countDocuments()]);
  console.log(`Collections ready - users: ${users}, goals: ${goals}, proofs: ${proofs}`);
  app.listen(port, () => console.log(`ProofLoop API listening at http://localhost:${port}  (health: /api/health)`));
}
start().catch((err) => { console.error('Could not start ProofLoop API:', err.message); console.error('Is MongoDB running? Check MONGODB_URI in apps/api/.env'); process.exit(1); });
