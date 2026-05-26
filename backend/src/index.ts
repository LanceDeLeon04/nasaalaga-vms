import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import { verifyEmailConnection } from './services/email';
import petsRoutes from './routes/pets';
import livestockRoutes from './routes/livestock';
import lostFoundRoutes from './routes/lostFound';
import apiRoutes from './routes/api';
import { createTables, migrateBudget, migrateInventoryV2, migrateLivestockPreReg, migrateProfileColumns, migrateInventoryV3 } from './db/migrate';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Request logger ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── API Routes ─────────────────────────────────────────────────────────────
const API = '/api';

app.use(`${API}/auth`, authRoutes);
app.use(`${API}/pets`, petsRoutes);
app.use(`${API}/livestock`, livestockRoutes);
app.use(`${API}/lost-found`, lostFoundRoutes);
app.use(`${API}`, apiRoutes);

// ── Serve frontend in production ───────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// ── Error handler ──────────────────────────────────────────────────────────
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, async () => {
  console.log(`\n🐾 NASaAlaga API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
  await verifyEmailConnection();

  // Run full migration chain on every startup (all are idempotent)
  const runMigrations = async () => {
    await createTables();
    await migrateBudget();
    await migrateInventoryV2();
    await migrateLivestockPreReg();
    await migrateProfileColumns();
    await migrateInventoryV3();
  };

  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await runMigrations();
      console.log('✅ Database ready');
      break;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        console.warn(`⚠️  Migration attempt ${attempt} failed, retrying in 3s...`);
        await new Promise(r => setTimeout(r, 3000));
      } else {
        console.error('⚠️  Migration warning (non-fatal):', err);
      }
    }
  }

  console.log('');
});

export default app;
