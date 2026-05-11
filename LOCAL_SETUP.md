# LOCAL SETUP GUIDE — NASaAlaga VMS
# Read this top to bottom before running anything.
# ─────────────────────────────────────────────────────────────────────────────

WHAT YOU NEED INSTALLED
────────────────────────
  1. Node.js 20+     → https://nodejs.org  (choose LTS)
  2. PostgreSQL 16   → https://www.postgresql.org/download/
     (Windows: use the installer, keep default port 5432, set a password you'll remember)
     (Mac: use https://postgresapp.com — easiest option)
  3. Git             → https://git-scm.com/downloads

CHECK YOUR VERSIONS (open a terminal and run these):
  node -v       → should show v20.x.x or higher
  npm -v        → should show 10.x.x or higher
  psql --version → should show 16.x or similar
  git --version  → any version is fine


STEP 1 — CREATE THE DATABASE
──────────────────────────────
Open a terminal and connect to PostgreSQL:

  Windows (run in Command Prompt):
    psql -U postgres

  Mac:
    psql postgres

Then inside psql, run these two lines:
  CREATE DATABASE nasaalaga;
  \q

That creates the database and exits psql.


STEP 2 — CREATE YOUR .env FILE
────────────────────────────────
Inside the project folder, copy the example file:

  Windows:  copy .env.example .env
  Mac/Linux: cp .env.example .env

Now open .env in any text editor (Notepad, VS Code, etc.)
Change the DATABASE_URL line to match your PostgreSQL setup:

  If you used the default postgres user and set a password:
    DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/nasaalaga

  If you're on Mac with Postgres.app (no password):
    DATABASE_URL=postgresql://localhost:5432/nasaalaga

  If you set a custom user:
    DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/nasaalaga

Also set a JWT secret (can be anything locally):
  JWT_SECRET=local-dev-secret-change-in-prod

Leave everything else as-is.


STEP 3 — INSTALL DEPENDENCIES
───────────────────────────────
In a terminal, navigate to the project folder:
  cd path/to/nasaalaga

Then run:
  npm install

This installs everything for backend AND frontend at once (it's a monorepo).
Wait for it to finish — may take 1-2 minutes.


STEP 4 — MIGRATE THE DATABASE (create tables)
───────────────────────────────────────────────
  npm run db:migrate

You should see:
  ✅ All tables created successfully
  Migration complete


STEP 5 — SEED THE DATABASE (load all data)
────────────────────────────────────────────
  npm run db:seed

You should see:
  ✓ Barangays seeded (39)
  ✓ Users seeded (4)
  ✓ Pets seeded (3)
  ... etc
  ✅ Seed complete!


STEP 6 — START THE APP
────────────────────────
You need TWO terminals open at the same time.

  Terminal 1 — Backend:
    npm run dev:backend

  You should see:
    🐾 NASaAlaga API running on port 3001
    Health check: http://localhost:3001/api/health

  Terminal 2 — Frontend:
    npm run dev:frontend

  You should see:
    VITE v6.x ready
    ➜ Local: http://localhost:3000/


STEP 7 — OPEN THE APP
───────────────────────
Go to: http://localhost:3000

You should see the NASaAlaga login page.

Login with any of these demo accounts:

  ADMIN:          amie.vergara@nexgov.ph    / Vergara$2026
  BAHW OFFICER:   miguel.sanchez@nexgov.ph  / Sanchez$2026
  PET OWNER:      cyrus.cruz@gmail.com      / Cruz$2026
  LIVESTOCK:      aeden.aranez@gmail.com    / Aranez$2026


─────────────────────────────────────────────────────────────────────────────
TROUBLESHOOTING
─────────────────────────────────────────────────────────────────────────────

ERROR: "DATABASE_URL environment variable is required"
  → You forgot to create the .env file. Go back to Step 2.
  → Or you created it in the wrong folder. It must be inside the nasaalaga/ folder (same level as package.json).

ERROR: "password authentication failed for user postgres"
  → Wrong password in DATABASE_URL. Double-check what you set when installing PostgreSQL.

ERROR: "database nasaalaga does not exist"
  → You skipped Step 1. Create the database first.

ERROR: "EADDRINUSE: address already in use :::3001"
  → Something else is running on port 3001. Kill it or change PORT=3002 in .env and update vite.config.ts target accordingly.

ERROR: "Cannot find module ..."
  → You skipped npm install. Run it from the nasaalaga/ root folder.

ERROR: Frontend loads but API calls fail (network error in browser console)
  → Backend is not running. Make sure Terminal 1 (dev:backend) is still active.

ERROR: Login says "Invalid credentials"
  → Seed hasn't been run yet. Run npm run db:seed (Step 5).
  → Or the seed failed partway. Check the terminal output for errors.

PSQL won't open on Windows:
  → Add PostgreSQL to PATH. Open System Properties → Environment Variables →
    Path → Add: C:\Program Files\PostgreSQL\16\bin

─────────────────────────────────────────────────────────────────────────────
QUICK REFERENCE — commands you'll use daily
─────────────────────────────────────────────────────────────────────────────
  npm install            Install/update all dependencies
  npm run dev:backend    Start the API server (port 3001)
  npm run dev:frontend   Start the React app (port 3000)
  npm run db:migrate     Create/update database tables
  npm run db:seed        Load seed data into the database
  npm run build          Build everything for production
