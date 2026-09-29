# NASaAlaga VMS — Updated Build

## What's New in This Build

### ✅ Database-Backed Everything
- **Deployments** are now fully persistent in PostgreSQL — changes survive page reloads
- **Dashboard** loads live data (livestock stats, vaccination trends, budget) from DB
- **Settings, thresholds, recommendations, rules** all stored in DB
- **Barangays** aligned to the 40 real barangays of Calaca, Batangas

### ✅ Inventory Page (New)
- Three tabs: **Overview**, **Medicine & Vitamins Inventory**, **Supplies Inventory**
- Barcode search/scan support (type or scan barcode to find items)
- Medicine fields: Name, Generic Name, Lot Number, Expiry Date, Manufacture Date, Manufacturer, Barcode, Category, Type, Storage Condition, Unit Cost
- Supplies fields: Name, Barcode, Category, Type, Quantity, Supplier, Last Restocked
- Data visualizations: bar chart (medicines by category), pie chart (supplies by category)
- Alerts for expired items, expiring-soon items, and out-of-stock items
- Seeded with 8 medicines and 8 supplies

### ✅ SuperAdmin Panel (Fully Unlocked)
- **Maintenance Mode**: toggle switch — when ON, non-superadmin users see a beautiful animated maintenance page and cannot log in. SuperAdmins are unaffected.
- **Clear Records**: delete pet records, livestock records, or all animal records — requires OTP verification
  - `deleonlance@nexgov.ph` → OTP sent to `deleonlancewinalexandrei@gmail.com`
  - `parkarel@nexgov.ph` → OTP sent to `__karelannepar@gmail.com`
- **Alert Thresholds**: configure all system alert limits, stored in DB
- **Recommendations**: full CRUD, stored in DB
- **Rules Engine**: real algorithms evaluating live DB data
- **System Settings**: all settings persisted to DB
- Admins cannot access the SuperAdmin panel

### ✅ Maintenance Mode
- Beautiful animated maintenance page with status cards and gradient design
- Checked on every app load via `/api/system/maintenance`
- Login also blocked server-side for non-superadmins during maintenance

### ✅ Decision Support (Real Algorithms)
- Rules engine evaluates actual pet/livestock counts from DB
- Detects overdue vaccinations, low vaccination rates, ASF outbreak thresholds
- ResourceDeployment persists all deployments to DB

## Database Tables Added
- `system_settings` — maintenance mode and global settings
- `admin_settings` — general system config
- `admin_thresholds` — alert threshold values
- `recommendations` — action items
- `rules` — rule engine definitions
- `deployments` — persistent deployment records
- `medicine_inventory` — medicines and vitamins with lot/expiry tracking
- `supplies_inventory` — veterinary supplies with barcode
- `inventory_transactions` — audit log for inventory changes

## Migrations
Run `npm run db:migrate` then `npm run db:seed` for new tables and initial data.

## Backup & Restore

Super Admin → **Backup & Restore** (Control Panel).

- **Automatic backups** run inside the API server (hourly / every 6 h / daily / weekly, configurable, with retention). The job checks every 5 minutes and catches up after a restart or redeploy; a Postgres advisory lock keeps multiple instances from running it twice.
- **Manual backups**, **download** (`.json.gz`), **upload**, **verify** (checksum + structure) and **restore**.
- **Restore is atomic** — one transaction; any failure rolls back and leaves data untouched. A safety snapshot is taken before every restore and before *Clear Records*.
- Header/sidebar badges show live backup health (Active / Overdue / Failing / None yet).
- No `pg_dump` needed. Optional `BACKUP_DIR` mirrors files to a Railway volume.
- Backups live in the same database by default — **download copies regularly** or enable Railway's own Postgres backups for disaster recovery.

API: `GET /api/backup/status` (admin+), everything else under `/api/backup` is superadmin-only.

## Pet registration renewal & auto-archive

- A pet registration is valid **12 months** (`PET_RENEWAL_MONTHS` env var to change) from `registration_date`, or from the due date set by the latest renewal.
- **Not renewed by the due date → auto-archived.** An hourly job archives expired registrations (skips pets that are Deceased, reported Lost, or impounded). Archiving is a soft-hide: nothing is deleted, and archived pets disappear from lists, dashboards and analytics (`active_pets` view).
- **Safety:** a `pre-archive` backup is taken before every bulk archive; if it fails, nothing is archived.
- **One-time 30-day grace period** after deployment so existing old registrations can be renewed first. A Super Admin can end it early (`POST /api/pets/archive/run {"endGrace":true}`); preview with `{"dryRun":true}`.
- **Renew / Restore:** staff (Admin, Super Admin, CVO Staff, BAHW for their barangay) use *Renew* on the Pet Records tab or pet detail. Early renewals keep unused time. Restoring an archived pet renews it. History is stored in `pet_renewals`.
- Auto-archive can be switched off in Super Admin → System Settings.
- Pet owners see a renewal warning (≤30 days) or an "archived" notice on their dashboard.

## Offline mode (PWA)

NASaAlaga works with no connection once it has been opened at least once online:

- **App shell** — the service worker (`vite-plugin-pwa`, see `frontend/vite.config.ts`) precaches the built
  JS/CSS/HTML, icons, and pins fonts/Leaflet/map-tile/PSGC assets, so the UI itself loads offline.
- **Cached data** — successful `GET` responses (pets, livestock, barangays, schedules, inventory, dashboard
  summary, …) are copied into IndexedDB per signed-in account and served back when the network is down.
  Right after sign-in the app also quietly pre-fetches the main lists in the background for staff roles
  (BAHW/admin/CVO staff) so they're ready even for screens not yet opened.
- **Offline writes** — field data entry (pet/livestock registration and updates, health/vaccination records,
  death reports, disease events) is saved to an on-device **outbox** while offline and shows up immediately
  (marked "pending") in the current list. It **uploads automatically**, in order, the moment the connection
  returns — no user action required. A status pill at the top of the screen shows what's waiting and lets
  staff retry or discard anything the server rejects (e.g. a duplicate tag ID) without losing the record.
  Every queued write carries an `Idempotency-Key` (backend: `middleware/idempotency.ts`,
  table `idempotency_keys`) so a retried upload can never be applied twice.
  Not deferrable — these still require a live connection: login, OTP, admin/user management, backup &
  restore, inventory/budget/finance changes, and any delete/approve/reject action.
- **Offline session** — if the connection drops mid-shift, the signed-in session survives (an idle time-out
  keeps it; only an explicit **Log out** clears it and wipes cached data from the device — queued uploads
  are kept either way and go up under the same account next time it's online). The login screen offers
  **"Resume offline session"** when the device has no connection and a session was saved on it.

See `frontend/src/offline/` for the implementation (`config.ts` lists exactly which writes are queued).
