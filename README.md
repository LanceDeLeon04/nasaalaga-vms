# 🐾 NASaAlaga — Calaca City Veterinary Management System

A full-stack web application for the City Veterinarian's Office (CVO) of Calaca, Batangas. It manages pet registrations, livestock records, vaccination schedules, lost & found reports, and multi-role dashboards for Admin, BAHW officers, and pet owners.

---

## 🚀 Quick Deploy to Railway

### 1. Create a GitHub Repository

```bash
git init
git add .
git commit -m "Initial commit – NASaAlaga VMS"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nasaalaga-vms.git
git push -u origin main
```

### 2. Deploy on Railway

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select your `nasaalaga-vms` repo
3. Railway will auto-detect the `railway.toml` config

### 3. Add a PostgreSQL Database

In your Railway project:
1. Click **+ New** → **Database** → **Add PostgreSQL**
2. Railway will automatically inject `DATABASE_URL` into your app

### 4. Set Environment Variables

In Railway → your service → **Variables**, add:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | A long random string (run `openssl rand -hex 64`) |
| `FRONTEND_URL` | Your Railway app URL (e.g. `https://nasaalaga.up.railway.app`) |
| `BREVO_API_KEY` | *(Optional)* Your [Brevo](https://brevo.com) API key for OTP emails |

> `DATABASE_URL` is injected automatically when you add the PostgreSQL service.

### 5. Run Database Migrations & Seed

After first deploy, open Railway's **Shell** tab in your service and run:

```bash
npm run db:migrate
npm run db:seed
```

Or trigger it via the DebugEnv panel in the Admin dashboard.

---

## 💻 Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ (local or via [Railway local](https://docs.railway.app/develop/cli))

### Setup

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/nasaalaga-vms.git
cd nasaalaga-vms
npm install

# Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL to your local PostgreSQL connection string

# Migrate and seed the database
npm run db:migrate
npm run db:seed

# Start both frontend and backend
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/health

---

## 🔑 Demo Accounts (created by seed)

| Role | Email | Password |
|---|---|---|
| **Admin (CVO)** | amie.vergara@nexgov.ph | Vergara$2026 |
| **BAHW Officer** | miguel.sanchez@nexgov.ph | Sanchez$2026 |
| **Pet Owner** | cyrus.cruz@gmail.com | Cruz$2026 |
| **Livestock Owner** | aeden.aranez@gmail.com | Aranez$2026 |

---

## 🏗️ Project Structure

```
nasaalaga/
├── backend/                  # Express + TypeScript API
│   ├── src/
│   │   ├── db/
│   │   │   ├── index.ts      # PostgreSQL pool
│   │   │   ├── migrate.ts    # Creates all tables
│   │   │   └── seed.ts       # Seeds all real data
│   │   ├── middleware/
│   │   │   └── auth.ts       # JWT middleware
│   │   ├── routes/
│   │   │   ├── auth.ts       # Login, signup, OTP
│   │   │   ├── pets.ts       # Pets + pre-registration
│   │   │   ├── livestock.ts  # Livestock CRUD
│   │   │   ├── lostFound.ts  # Lost & found reports
│   │   │   └── api.ts        # Barangays, schedules, stats
│   │   └── index.ts          # Express server entry
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                 # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/       # All UI components
│   │   ├── lib/
│   │   │   └── api.ts        # Typed API client
│   │   ├── styles/           # Tailwind + global CSS
│   │   ├── App.tsx
│   │   ├── routes.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── .env.example              # Environment variable template
├── .gitignore
├── railway.toml              # Railway deployment config
├── nixpacks.toml             # Build instructions
└── package.json              # Monorepo root
```

---

## 🧩 Features

### Admin (CVO)
- Dashboard overview with live stats
- Pet & livestock management across all barangays
- Pre-registration validation (approve / deny)
- Vaccination schedule management
- Disease alerts & outbreak monitoring
- Lost & found tracking
- Audit logs & user management
- Comparative analytics & reports

### BAHW Officers
- Barangay-level pet & livestock registry
- Vaccination drive scheduling
- Lost & found reporting
- Intervention recommendations

### Pet / Livestock Owners
- Online pet pre-registration (no account needed)
- View registered pets & vaccination status
- Report lost pets
- View nearby vaccination schedules

### Guest
- Public view of vaccination schedules
- Lost & found board

---

## 📡 API Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | — | Login |
| POST | `/api/auth/signup` | — | Register new owner |
| POST | `/api/auth/send-otp` | — | Send OTP |
| POST | `/api/auth/verify-otp` | — | Verify OTP |
| GET | `/api/barangays` | — | All Calaca barangays |
| GET | `/api/pets` | — | List pets (filter by ownerId) |
| POST | `/api/pets` | JWT | Create pet |
| PUT | `/api/pets/:id` | JWT | Update pet |
| POST | `/api/pets/pre-register` | — | Pet pre-registration |
| GET | `/api/pets/pre-registered` | JWT | List pre-registrations |
| POST | `/api/pets/validate/:id` | JWT | Approve/deny pre-reg |
| GET | `/api/livestock` | — | List livestock |
| POST | `/api/livestock` | JWT | Add livestock |
| GET | `/api/lost-found` | — | List lost & found |
| POST | `/api/lost-found` | — | File report |
| GET | `/api/schedules` | — | Vaccination schedules |
| POST | `/api/schedules` | JWT | Create schedule |
| GET | `/api/statistics/*` | — | Analytics endpoints |
| GET | `/api/health` | — | Health check |

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS v4, Recharts, Radix UI
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL (via `pg` driver)
- **Auth:** JWT (jsonwebtoken) + bcrypt
- **Email:** Brevo (Sendinblue) API *(optional)*
- **Deployment:** Railway (monorepo)
