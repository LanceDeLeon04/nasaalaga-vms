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
