import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import { verifyEmailConnection } from './services/email';
import petsRoutes from './routes/pets';
import livestockRoutes from './routes/livestock';
import petDeathRoutes from './routes/petDeaths';
import lostFoundRoutes from './routes/lostFound';
import backupRoutes from './routes/backup';
import apiRoutes from './routes/api';
import { startBackupScheduler, stopBackupScheduler } from './services/backup';
import { startPetArchiveScheduler, stopPetArchiveScheduler } from './services/petArchive';
import { createTables, migrateBudget, migrateInventoryV2, migrateLivestockPreReg, migrateProfileColumns, migrateInventoryV3, migrateDispatch, migrateInventoryDosage, migrateInventoryLotColumns, migrateNotifications, migrateOfficeBudgetColumns, migrateBackups, migratePetArchive } from './db/migrate';

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
app.use(`${API}/pet-deaths`, petDeathRoutes);
app.use(`${API}/lost-found`, lostFoundRoutes);
app.use(`${API}/backup`, backupRoutes);
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

// ── Startup ───────────────────────────────────────────────────────────────
// IMPORTANT: migrations must finish BEFORE the server accepts traffic.
// Previously app.listen() started routing requests immediately, and the
// migration chain ran afterward (gated behind an awaited Gmail SMTP check
// that can hang for a long time on its default timeouts) — so early
// requests (e.g. login) could hit tables that didn't exist yet, throwing
// "relation \"users\" does not exist". Fix: run migrations first, listen
// second, and never let email verification block startup.
const runMigrations = async () => {
  await createTables();
  await migrateBudget();
  await migrateInventoryV2();
  await migrateLivestockPreReg();
  await migrateProfileColumns();
  await migrateInventoryV3();
  await migrateOfficeBudgetColumns();
  await migrateDispatch();
  await migrateInventoryDosage();
  await migrateInventoryLotColumns();
  await migrateNotifications();
  await migrateBackups();
  await migratePetArchive();
};

async function start() {
  console.log('🐾 NASaAlaga API starting…');
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);

  const MAX_RETRIES = 3;
  let migrated = false;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await runMigrations();
      console.log('✅ Database ready');
      migrated = true;
      break;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        console.warn(`⚠️  Migration attempt ${attempt} failed, retrying in 3s...`, err);
        await new Promise(r => setTimeout(r, 3000));
      } else {
        console.error('❌ Migration failed after retries — refusing to start (DB would serve broken requests):', err);
      }
    }
  }

  if (!migrated) {
    // Do not open the port with a half-migrated (or unmigrated) database —
    // that's exactly how "relation users does not exist" reaches users.
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🐾 NASaAlaga API running on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health\n`);

    // Fire-and-forget: Gmail connectivity must never gate startup or block
    // request handling. verifyEmailConnection() now also has short timeouts
    // (see services/email.ts) so a bad SMTP path fails fast in the logs
    // instead of hanging.
    verifyEmailConnection().catch((err) => {
      console.error('[Email] verification threw unexpectedly:', err);
    });

    // Auto-backup job (reads admin_settings each tick, so toggling in the UI takes effect without a restart).
    startBackupScheduler();
    // Pet registration expiry → auto-archive job.
    startPetArchiveScheduler();
  });
}

start();

// Let an in-flight backup/restore finish its DB statements before Railway kills the container.
for (const sig of ['SIGTERM', 'SIGINT'] as const) {
  process.on(sig, () => { stopBackupScheduler(); stopPetArchiveScheduler(); setTimeout(() => process.exit(0), 3000).unref(); });
}

export default app;
