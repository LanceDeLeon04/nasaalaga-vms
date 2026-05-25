import { pool } from './index';
import dotenv from 'dotenv';

dotenv.config();

const createTables = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        password_hash VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'owner',
        owner_id VARCHAR(100),
        barangay VARCHAR(255),
        address TEXT,
        verified BOOLEAN DEFAULT true,
        barcode_hash VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS barcode_hash VARCHAR(255);`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS calacazen_id VARCHAR(100);`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS household_number VARCHAR(100);`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS temp_id VARCHAR(100);`);

    // OTP store table
    await client.query(`
      CREATE TABLE IF NOT EXISTS otp_store (
        key VARCHAR(255) PRIMARY KEY,
        otp VARCHAR(10) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        method VARCHAR(20),
        verified BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        verified_at TIMESTAMPTZ
      );
    `);

    // Barangays table
    await client.query(`
      CREATE TABLE IF NOT EXISTS barangays (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        zone VARCHAR(50),
        zone_color VARCHAR(20),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Pets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS pets (
        id VARCHAR(50) PRIMARY KEY,
        owner_id VARCHAR(100),
        pet_name VARCHAR(255) NOT NULL,
        species VARCHAR(100) NOT NULL,
        breed VARCHAR(255),
        age INTEGER,
        color VARCHAR(100),
        gender VARCHAR(20),
        owner_name VARCHAR(255),
        contact_number VARCHAR(50),
        barangay VARCHAR(255),
        address TEXT,
        photo TEXT,
        vaccination_status VARCHAR(50) DEFAULT 'Not Vaccinated',
        last_vaccination_date DATE,
        next_vaccination_date DATE,
        status VARCHAR(50) DEFAULT 'Active',
        pre_reg_number VARCHAR(100),
        registration_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);


    // Patch vaccination_schedules notes column
    await client.query(`ALTER TABLE vaccination_schedules ADD COLUMN IF NOT EXISTS notes TEXT`);
    await client.query(`ALTER TABLE vaccination_schedules ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Scheduled'`);


    // ── Livestock table enhancements ──────────────────────────────────────
    await client.query(`ALTER TABLE livestock ADD COLUMN IF NOT EXISTS gender VARCHAR(20)`);
    await client.query(`ALTER TABLE livestock ADD COLUMN IF NOT EXISTS age VARCHAR(50)`);
    await client.query(`ALTER TABLE livestock ADD COLUMN IF NOT EXISTS color_markings VARCHAR(255)`);
    await client.query(`ALTER TABLE livestock ADD COLUMN IF NOT EXISTS purpose VARCHAR(100)`);
    await client.query(`ALTER TABLE livestock ADD COLUMN IF NOT EXISTS source VARCHAR(100)`);
    await client.query(`ALTER TABLE livestock ADD COLUMN IF NOT EXISTS notes TEXT`);
    await client.query(`ALTER TABLE livestock ADD COLUMN IF NOT EXISTS tag_number VARCHAR(100)`);
    await client.query(`ALTER TABLE livestock ADD COLUMN IF NOT EXISTS quarantine_date DATE`);
    await client.query(`ALTER TABLE livestock ADD COLUMN IF NOT EXISTS quarantine_reason TEXT`);
    await client.query(`ALTER TABLE livestock ADD COLUMN IF NOT EXISTS farm_type VARCHAR(50) DEFAULT 'Backyard'`);
    await client.query(`ALTER TABLE livestock ALTER COLUMN owner_id DROP NOT NULL`);

    // ── Health records table ───────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS health_records (
        id SERIAL PRIMARY KEY,
        livestock_id VARCHAR(50) NOT NULL,
        record_type VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        diagnosis TEXT,
        treatment TEXT,
        medicine_used TEXT,
        veterinarian VARCHAR(255),
        next_due_date DATE,
        notes TEXT,
        created_by VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── Livestock mortality table ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS livestock_mortality (
        id SERIAL PRIMARY KEY,
        livestock_id VARCHAR(50),
        animal_type VARCHAR(100) NOT NULL,
        breed VARCHAR(255),
        owner_name VARCHAR(255),
        barangay VARCHAR(255),
        quantity INTEGER DEFAULT 1,
        cause VARCHAR(255),
        date_reported DATE DEFAULT CURRENT_DATE,
        investigation_status VARCHAR(50) DEFAULT 'Pending',
        notes TEXT,
        created_by VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── Livestock disease alerts table ─────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS livestock_disease_events (
        id VARCHAR(50) PRIMARY KEY,
        animal_type VARCHAR(100),
        disease VARCHAR(255) NOT NULL,
        barangay VARCHAR(255),
        cases INTEGER DEFAULT 0,
        deaths INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Active',
        date_reported DATE DEFAULT CURRENT_DATE,
        resolved_date DATE,
        notes TEXT,
        created_by VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Make owner_id nullable (pets registered by admin may not have a portal user)
    await client.query(`ALTER TABLE pets ALTER COLUMN owner_id DROP NOT NULL`);

    // Patch new pet columns (safe to run multiple times)
    await client.query(`ALTER TABLE pets ADD COLUMN IF NOT EXISTS is_spayed BOOLEAN DEFAULT false`);
    await client.query(`ALTER TABLE pets ADD COLUMN IF NOT EXISTS is_neutered BOOLEAN DEFAULT false`);
    await client.query(`ALTER TABLE pets ADD COLUMN IF NOT EXISTS impound_status VARCHAR(50) DEFAULT 'None'`);
    await client.query(`ALTER TABLE pets ADD COLUMN IF NOT EXISTS impound_date DATE`);
    await client.query(`ALTER TABLE pets ADD COLUMN IF NOT EXISTS impound_reason TEXT`);
    await client.query(`ALTER TABLE pets ADD COLUMN IF NOT EXISTS release_date DATE`);
    await client.query(`ALTER TABLE pets ADD COLUMN IF NOT EXISTS pet_tag_id VARCHAR(100)`);
    await client.query(`ALTER TABLE pets ADD COLUMN IF NOT EXISTS owner_email VARCHAR(255)`);
    await client.query(`ALTER TABLE pets ADD COLUMN IF NOT EXISTS temp_id VARCHAR(100)`);

    // ── Enforce uniqueness of color-coded pet tag IDs ──────────────────────
    // Drop any old column-level unique constraint if it exists (from prior migrations)
    // then create a partial unique index so NULL values are excluded.
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'pets_pet_tag_id_unique' AND contype = 'u'
        ) THEN
          ALTER TABLE pets DROP CONSTRAINT pets_pet_tag_id_unique;
        END IF;
      END$$;
    `);
    await client.query(`
      DROP INDEX IF EXISTS pets_pet_tag_id_unique;
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS pets_pet_tag_id_idx
      ON pets (pet_tag_id)
      WHERE pet_tag_id IS NOT NULL;
    `);

    // ── Backfill existing pets that have PET-NNN / TAG- style ids ───────────
    // Clear old-format tag IDs first so the renumbering CTE has no conflicts.
    await client.query(`
      UPDATE pets
      SET pet_tag_id = NULL
      WHERE pet_tag_id LIKE 'PET-%'
         OR pet_tag_id LIKE 'TAG-%';
    `);

    // Re-generate tag IDs from barangay zone for rows that still lack one.
    await client.query(`
      WITH ranked AS (
        SELECT p.id,
          CASE b.zone
            WHEN 'East'           THEN 'BLU'
            WHEN 'West'           THEN 'PRP'
            WHEN 'North'          THEN 'GRY'
            WHEN 'Baybay-Highway' THEN 'RED'
            ELSE 'BLU'
          END AS prefix,
          ROW_NUMBER() OVER (
            PARTITION BY
              CASE b.zone
                WHEN 'East'           THEN 'BLU'
                WHEN 'West'           THEN 'PRP'
                WHEN 'North'          THEN 'GRY'
                WHEN 'Baybay-Highway' THEN 'RED'
                ELSE 'BLU'
              END
            ORDER BY p.registration_date, p.id
          ) AS rn
        FROM pets p
        LEFT JOIN barangays b ON LOWER(b.name) = LOWER(p.barangay)
        WHERE p.pet_tag_id IS NULL
      )
      UPDATE pets p
      SET pet_tag_id = r.prefix || '-' || LPAD(r.rn::TEXT, 4, '0')
      FROM ranked r
      WHERE p.id = r.id;
    `);

    // Pet pre-registrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS pet_pre_registrations (
        pre_reg_number VARCHAR(100) PRIMARY KEY,
        owner_id VARCHAR(100),
        pet_name VARCHAR(255) NOT NULL,
        species VARCHAR(100) NOT NULL,
        breed VARCHAR(255),
        age VARCHAR(50),
        color VARCHAR(100),
        gender VARCHAR(20),
        owner_name VARCHAR(255),
        contact_number VARCHAR(50),
        owner_email VARCHAR(255),
        barangay VARCHAR(255),
        address TEXT,
        photo TEXT,
        status VARCHAR(50) DEFAULT 'Pending',
        denial_reason TEXT,
        pet_id VARCHAR(50),
        pet_tag_id VARCHAR(100),
        email_sent BOOLEAN DEFAULT false,
        expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
        submitted_date TIMESTAMPTZ DEFAULT NOW(),
        approved_date TIMESTAMPTZ,
        denied_date TIMESTAMPTZ
      );
    `);
    await client.query(`ALTER TABLE pet_pre_registrations ADD COLUMN IF NOT EXISTS owner_email VARCHAR(255);`);
    await client.query(`ALTER TABLE pet_pre_registrations ADD COLUMN IF NOT EXISTS pet_tag_id VARCHAR(100);`);
    await client.query(`ALTER TABLE pet_pre_registrations ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false;`);
    await client.query(`ALTER TABLE pet_pre_registrations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days');`);
    await client.query(`ALTER TABLE pet_pre_registrations ALTER COLUMN age TYPE VARCHAR(50) USING age::VARCHAR;`);

    // Livestock table
    await client.query(`
      CREATE TABLE IF NOT EXISTS livestock (
        id VARCHAR(50) PRIMARY KEY,
        owner_id VARCHAR(100),
        animal_type VARCHAR(100) NOT NULL,
        breed VARCHAR(255),
        quantity INTEGER DEFAULT 1,
        owner_name VARCHAR(255),
        contact_number VARCHAR(50),
        barangay VARCHAR(255),
        farm_address TEXT,
        health_status VARCHAR(50) DEFAULT 'Healthy',
        last_checkup_date DATE,
        vaccination_status VARCHAR(50) DEFAULT 'Not Vaccinated',
        registration_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Lost & Found reports table
    await client.query(`
      CREATE TABLE IF NOT EXISTS lost_found_reports (
        id VARCHAR(50) PRIMARY KEY,
        pet_id VARCHAR(50),
        pet_name VARCHAR(255),
        species VARCHAR(100),
        breed VARCHAR(255),
        color VARCHAR(100),
        type VARCHAR(20) NOT NULL, -- Lost, Found, Impounded
        reported_by VARCHAR(255),
        reported_by_role VARCHAR(50),
        owner_id VARCHAR(100),
        contact_number VARCHAR(50),
        last_seen_location TEXT,
        barangay VARCHAR(255),
        date_reported DATE DEFAULT CURRENT_DATE,
        description TEXT,
        status VARCHAR(50) DEFAULT 'Open',
        impound_location TEXT,
        impound_date DATE,
        impound_officer VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    // Add impound columns if not exist
    await client.query(`ALTER TABLE lost_found_reports ADD COLUMN IF NOT EXISTS impound_location TEXT`);
    await client.query(`ALTER TABLE lost_found_reports ADD COLUMN IF NOT EXISTS impound_date DATE`);
    await client.query(`ALTER TABLE lost_found_reports ADD COLUMN IF NOT EXISTS impound_officer VARCHAR(255)`);

    // Vaccination schedules table
    await client.query(`
      CREATE TABLE IF NOT EXISTS vaccination_schedules (
        id VARCHAR(50) PRIMARY KEY,
        barangay VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        time_start VARCHAR(10),
        time_end VARCHAR(10),
        venue VARCHAR(255),
        capacity INTEGER DEFAULT 50,
        registered INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Scheduled',
        created_by VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Livestock stats by barangay table
    await client.query(`
      CREATE TABLE IF NOT EXISTS livestock_stats (
        id SERIAL PRIMARY KEY,
        barangay VARCHAR(255) UNIQUE NOT NULL,
        cattle INTEGER DEFAULT 0,
        swine INTEGER DEFAULT 0,
        poultry INTEGER DEFAULT 0,
        goats INTEGER DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Vaccination trends table
    await client.query(`
      CREATE TABLE IF NOT EXISTS vaccination_trends (
        id SERIAL PRIMARY KEY,
        month VARCHAR(10) NOT NULL,
        year INTEGER NOT NULL,
        vaccination_rate INTEGER DEFAULT 0,
        diseases INTEGER DEFAULT 0,
        vaccinated_pets INTEGER DEFAULT 0,
        vaccinated_livestock INTEGER DEFAULT 0,
        UNIQUE(month, year)
      );
    `);

    // Budget allocation table
    await client.query(`
      CREATE TABLE IF NOT EXISTS budget_allocation (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        amount NUMERIC(15,2) DEFAULT 0,
        percentage NUMERIC(5,2) DEFAULT 0,
        color VARCHAR(20),
        fiscal_year INTEGER DEFAULT 2025
      );
    `);

    // Disease alerts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS disease_alerts (
        id VARCHAR(50) PRIMARY KEY,
        disease VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        severity VARCHAR(50),
        cases INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Active',
        reported_date DATE DEFAULT CURRENT_DATE,
        last_update DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Outbreak data table
    await client.query(`
      CREATE TABLE IF NOT EXISTS outbreak_data (
        id VARCHAR(50) PRIMARY KEY,
        disease VARCHAR(255) NOT NULL,
        barangay VARCHAR(255),
        cases INTEGER DEFAULT 0,
        date_reported DATE DEFAULT CURRENT_DATE,
        status VARCHAR(50) DEFAULT 'Active',
        affected_animals VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Audit logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50),
        username VARCHAR(255),
        action VARCHAR(255) NOT NULL,
        resource VARCHAR(100),
        resource_id VARCHAR(100),
        details JSONB,
        ip_address VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Feedback table
    await client.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50),
        username VARCHAR(255),
        category VARCHAR(100),
        subject VARCHAR(255),
        message TEXT,
        status VARCHAR(50) DEFAULT 'Open',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Personnel / Resource Deployments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS deployments (
        id VARCHAR(50) PRIMARY KEY,
        barangay VARCHAR(255) NOT NULL,
        priority INTEGER DEFAULT 1,
        urgency VARCHAR(50) DEFAULT 'Within 1 Week',
        reason TEXT,
        staff_needed INTEGER DEFAULT 1,
        deployed_staff TEXT[],
        medicine_vaccines INTEGER DEFAULT 0,
        medicine_antibiotics INTEGER DEFAULT 0,
        medicine_vitamins INTEGER DEFAULT 0,
        equipment TEXT[],
        estimated_duration VARCHAR(100),
        target_animals INTEGER DEFAULT 0,
        risk_score INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        deployed_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        notes TEXT,
        created_by VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // System settings table (for maintenance mode and other global settings)
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        updated_by VARCHAR(255),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Admin settings table (persistent)
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id SERIAL PRIMARY KEY,
        system_name VARCHAR(255) DEFAULT 'NASaAlaga VMS',
        city VARCHAR(100) DEFAULT 'Calaca',
        province VARCHAR(100) DEFAULT 'Batangas',
        email_notifications BOOLEAN DEFAULT true,
        sms_notifications BOOLEAN DEFAULT false,
        auto_backup BOOLEAN DEFAULT true,
        backup_frequency VARCHAR(50) DEFAULT 'daily',
        session_timeout INTEGER DEFAULT 480,
        max_login_attempts INTEGER DEFAULT 5,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Thresholds table (persistent)
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_thresholds (
        id SERIAL PRIMARY KEY,
        livestock_critical_drop INTEGER DEFAULT 30,
        livestock_warning_drop INTEGER DEFAULT 15,
        livestock_high_density INTEGER DEFAULT 500,
        livestock_low_vacc_rate INTEGER DEFAULT 60,
        pets_unvaccinated_threshold INTEGER DEFAULT 40,
        pets_registration_target INTEGER DEFAULT 85,
        pets_missing_spike INTEGER DEFAULT 10,
        outbreak_warning_cases INTEGER DEFAULT 3,
        outbreak_critical_cases INTEGER DEFAULT 10,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Recommendations table (persistent)
    await client.query(`
      CREATE TABLE IF NOT EXISTS recommendations (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        priority VARCHAR(50) DEFAULT 'Medium',
        status VARCHAR(50) DEFAULT 'Active',
        category VARCHAR(100),
        description TEXT,
        created_by VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Rules table (persistent)
    await client.query(`
      CREATE TABLE IF NOT EXISTS rules (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        priority VARCHAR(50),
        status VARCHAR(50) DEFAULT 'active',
        conditions JSONB,
        actions JSONB,
        zones TEXT[],
        created_by VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── INVENTORY TABLES ──────────────────────────────────────────────────

    // Medicine inventory table
    await client.query(`
      CREATE TABLE IF NOT EXISTS medicine_inventory (
        id VARCHAR(50) PRIMARY KEY,
        barcode VARCHAR(100) UNIQUE,
        name VARCHAR(255) NOT NULL,
        generic_name VARCHAR(255),
        category VARCHAR(100) NOT NULL,
        type VARCHAR(100),
        lot_number VARCHAR(100),
        expiry_date DATE,
        manufacture_date DATE,
        manufacturer VARCHAR(255),
        quantity INTEGER DEFAULT 0,
        unit VARCHAR(50) DEFAULT 'pieces',
        reorder_level INTEGER DEFAULT 10,
        unit_cost NUMERIC(10,2) DEFAULT 0,
        storage_condition VARCHAR(255),
        description TEXT,
        status VARCHAR(50) DEFAULT 'Active',
        barangay_stock JSONB DEFAULT '{}',
        created_by VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Supplies inventory table
    await client.query(`
      CREATE TABLE IF NOT EXISTS supplies_inventory (
        id VARCHAR(50) PRIMARY KEY,
        barcode VARCHAR(100) UNIQUE,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        type VARCHAR(100),
        quantity INTEGER DEFAULT 0,
        unit VARCHAR(50) DEFAULT 'pieces',
        reorder_level INTEGER DEFAULT 5,
        unit_cost NUMERIC(10,2) DEFAULT 0,
        supplier VARCHAR(255),
        last_restocked DATE,
        description TEXT,
        status VARCHAR(50) DEFAULT 'Active',
        created_by VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Inventory transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id SERIAL PRIMARY KEY,
        item_id VARCHAR(50) NOT NULL,
        item_type VARCHAR(20) NOT NULL,
        transaction_type VARCHAR(50) NOT NULL,
        quantity INTEGER NOT NULL,
        previous_qty INTEGER,
        new_qty INTEGER,
        reason TEXT,
        performed_by VARCHAR(255),
        barangay VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Biting Incidents table ──────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS biting_incidents (
        id VARCHAR(50) PRIMARY KEY,
        pet_id VARCHAR(50),
        pet_name VARCHAR(255) NOT NULL,
        incident_date DATE NOT NULL,
        location TEXT NOT NULL,
        bitten_person VARCHAR(255) NOT NULL,
        owner_name VARCHAR(255),
        confirmed_rabies BOOLEAN DEFAULT false,
        vaccinated BOOLEAN DEFAULT false,
        remarks TEXT,
        observation_start DATE,
        observation_end DATE,
        observation_update TEXT,
        status VARCHAR(50) DEFAULT 'Open',
        reported_by VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Add horse to livestock_stats ────────────────────────────────────────
    await client.query(`ALTER TABLE livestock_stats ADD COLUMN IF NOT EXISTS horses INTEGER DEFAULT 0`);

    // ── Ensure cityHealth role is valid (no constraint change needed — role is free-text VARCHAR) ──
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100)`);

    // ── Veterinarian license number on users ────────────────────────────────
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS vet_license VARCHAR(100)`);

    // ── Outbreak Records table ────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS outbreak_records (
        id VARCHAR(100) PRIMARY KEY,
        type VARCHAR(50) NOT NULL DEFAULT 'livestock',
        disease VARCHAR(255) NOT NULL,
        barangay VARCHAR(255),
        source_id VARCHAR(100),
        cases INTEGER DEFAULT 1,
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        radius_km NUMERIC DEFAULT 10,
        status VARCHAR(50) DEFAULT 'Active',
        severity VARCHAR(50) DEFAULT 'High',
        assigned_to VARCHAR(255),
        resolve_date DATE,
        timetable TEXT,
        updates JSONB DEFAULT '[]',
        pet_name VARCHAR(255),
        owner_name VARCHAR(255),
        date_created TIMESTAMPTZ DEFAULT NOW(),
        date_updated TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── Add lat/lng/source_id to biting_incidents if not exists ──────────────
    await client.query(`ALTER TABLE biting_incidents ADD COLUMN IF NOT EXISTS outbreak_id VARCHAR(100)`);


    await client.query(`
      CREATE TABLE IF NOT EXISTS vaccination_history (
        id VARCHAR(50) PRIMARY KEY,
        pet_id VARCHAR(50) NOT NULL,
        date_of_vaccination DATE NOT NULL DEFAULT CURRENT_DATE,
        vaccine_name VARCHAR(255) NOT NULL,
        lot_number VARCHAR(100),
        batch_number VARCHAR(100),
        vaccine_barcode VARCHAR(100),
        veterinarian VARCHAR(255),
        vet_license VARCHAR(100),
        medicine_id VARCHAR(50),
        notes TEXT,
        administered_by VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`ALTER TABLE vaccination_history ADD COLUMN IF NOT EXISTS vaccine_barcode VARCHAR(100)`);
    await client.query(`ALTER TABLE vaccination_history ADD COLUMN IF NOT EXISTS medicine_id VARCHAR(50)`);
    // ── CVO Forms table ────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS cvo_forms (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        requirements JSONB DEFAULT '[]',
        procedure_steps JSONB DEFAULT '[]',
        processing_fee NUMERIC(10,2) DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        uploaded_by VARCHAR(255),
        file_name VARCHAR(255),
        file_data TEXT,
        file_type VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    // ── Add admin response columns to feedback ─────────────────────────────
    await client.query(`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS admin_response TEXT`);
    await client.query(`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS responded_by VARCHAR(255)`);
    await client.query(`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ`);
    await client.query(`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Medium'`);
    await client.query(`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS barangay VARCHAR(255)`);

    // ── Seed demo medicine inventory (anti-rabies vaccine) ─────────────────
    await client.query(`
      INSERT INTO medicine_inventory (id, barcode, name, generic_name, category, type, lot_number, expiry_date, quantity, unit, reorder_level, unit_cost, description, created_by)
      VALUES
        ('MED-DEMO-001','RABVAC-2025-001','Rabisin Anti-Rabies Vaccine','Rabies Vaccine Inactivated','Vaccine','Anti-Rabies','LOT-RABVAC-2025','2026-12-31',500,'vials',50,100.00,'Inactivated rabies vaccine for dogs and cats. 1ml per dose.','system'),
        ('MED-DEMO-002','RABVAC-2025-002','Nobivac Rabies','Rabies Vaccine','Vaccine','Anti-Rabies','LOT-NOBIVAC-2025','2026-06-30',300,'vials',50,120.00,'Single dose rabies vaccine. Store at 2-8°C.','system'),
        ('MED-DEMO-003','DISTEMPER-2025','Canigen DHPPiL','Distemper/Parvo/Leptospira','Vaccine','Multi-Valent','LOT-DHTPPIL-2025','2026-09-30',150,'vials',30,250.00,'5-in-1 vaccine for dogs.','system')
      ON CONFLICT (id) DO NOTHING;
    `);
    await client.query(`
      INSERT INTO medicine_inventory (id, barcode, name, generic_name, category, type, lot_number, expiry_date, quantity, unit, reorder_level, unit_cost, description, created_by)
      VALUES
        ('MED-DEMO-001','RABVAC-2025-001','Rabisin Anti-Rabies Vaccine','Rabies Vaccine Inactivated','Vaccine','Anti-Rabies','LOT-RABVAC-2025','2026-12-31',500,'vials',50,100.00,'Inactivated rabies vaccine for dogs and cats. 1ml per dose.','system'),
        ('MED-DEMO-002','RABVAC-2025-002','Nobivac Rabies','Rabies Vaccine','Vaccine','Anti-Rabies','LOT-NOBIVAC-2025','2026-06-30',300,'vials',50,120.00,'Single dose rabies vaccine. Store at 2-8°C.','system'),
        ('MED-DEMO-003','DISTEMPER-2025','Canigen DHPPiL','Distemper/Parvo/Leptospira','Vaccine','Multi-Valent','LOT-DHTPPIL-2025','2026-09-30',150,'vials',30,250.00,'5-in-1 vaccine for dogs.','system')
      ON CONFLICT (barcode) DO NOTHING;
    `);

    // ── Seed demo vaccination history for existing pets ─────────────────────
    await client.query(`
      INSERT INTO vaccination_history (id, pet_id, date_of_vaccination, vaccine_name, lot_number, batch_number, vaccine_barcode, veterinarian, vet_license, medicine_id, administered_by)
      SELECT
        'VAX-SEED-' || p.id || '-001',
        p.id,
        CURRENT_DATE - INTERVAL '180 days',
        'Rabisin Anti-Rabies Vaccine',
        'LOT-RABVAC-2025',
        'BATCH-001',
        'RABVAC-2025-001',
        'Dr. Roberto Santos',
        'VET-LIC-2024-001',
        'MED-DEMO-001',
        'Dr. Roberto Santos'
      FROM pets p
      WHERE p.status = 'Active'
      LIMIT 10
      ON CONFLICT (id) DO NOTHING;
    `);
    await client.query(`
      INSERT INTO vaccination_history (id, pet_id, date_of_vaccination, vaccine_name, lot_number, batch_number, vaccine_barcode, veterinarian, vet_license, medicine_id, administered_by)
      SELECT
        'VAX-SEED-' || p.id || '-002',
        p.id,
        CURRENT_DATE - INTERVAL '30 days',
        'Rabisin Anti-Rabies Vaccine',
        'LOT-RABVAC-2025',
        'BATCH-002',
        'RABVAC-2025-001',
        'Dr. Roberto Santos',
        'VET-LIC-2024-001',
        'MED-DEMO-001',
        'Dr. Roberto Santos'
      FROM pets p
      WHERE p.status = 'Active'
      LIMIT 5
      ON CONFLICT (id) DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('✅ All tables created successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

// ── Budget Utilization Module ─────────────────────────────────────────────
export async function migrateBudget() {
  const { pool } = await import('./index');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS budget_programs (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        total_allotment NUMERIC(15,2) DEFAULT 0,
        fiscal_year INTEGER DEFAULT 2025,
        color VARCHAR(20) DEFAULT '#2B5EA6',
        is_active BOOLEAN DEFAULT true,
        created_by VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS budget_line_items (
        id VARCHAR(50) PRIMARY KEY,
        program_id VARCHAR(50) REFERENCES budget_programs(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        expenditure_type VARCHAR(10) CHECK(expenditure_type IN ('capex','opex')) DEFAULT 'opex',
        allotment NUMERIC(15,2) DEFAULT 0,
        utilized NUMERIC(15,2) DEFAULT 0,
        obligated NUMERIC(15,2) DEFAULT 0,
        fiscal_year INTEGER DEFAULT 2025,
        notes TEXT,
        created_by VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS budget_expenditures (
        id SERIAL PRIMARY KEY,
        line_item_id VARCHAR(50) REFERENCES budget_line_items(id) ON DELETE CASCADE,
        amount NUMERIC(15,2) NOT NULL,
        expenditure_type VARCHAR(20) DEFAULT 'utilized',
        description TEXT,
        reference_no VARCHAR(100),
        vendor VARCHAR(255),
        expenditure_date DATE DEFAULT CURRENT_DATE,
        recorded_by VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS budget_ai_recommendations (
        id VARCHAR(50) PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        priority VARCHAR(20) NOT NULL,
        title VARCHAR(255) NOT NULL,
        narrative TEXT,
        from_program VARCHAR(255),
        to_program VARCHAR(255),
        suggested_pct NUMERIC(5,2),
        suggested_amount NUMERIC(15,2),
        justification TEXT,
        data_points JSONB DEFAULT '[]',
        confidence INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        fiscal_year INTEGER DEFAULT 2025,
        generated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Seed default budget programs for FY2025 if not exists
    const existing = await client.query(`SELECT COUNT(*) FROM budget_programs WHERE fiscal_year=2025`);
    if (parseInt(existing.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO budget_programs (id,name,description,total_allotment,fiscal_year,color,created_by) VALUES
          ('PROG-2025-001','Rabies Control Program','Anti-rabies vaccination, PEP biologics, and community awareness campaigns.',1200000,2025,'#2B5EA6','system'),
          ('PROG-2025-002','Avian Influenza Preparedness','Bird flu surveillance, rapid response kits, containment, and response teams.',800000,2025,'#e8a838','system'),
          ('PROG-2025-003','Livestock Health Program','Vaccines, treatments, and health monitoring for all livestock species.',950000,2025,'#60A85C','system'),
          ('PROG-2025-004','Animal Welfare & Impounding','Impounding operations, spaying/neutering, and animal shelter maintenance.',600000,2025,'#7c3aed','system'),
          ('PROG-2025-005','Administrative & Operations','Office supplies, fuel, IT infrastructure, personnel training, and communications.',500000,2025,'#0891b2','system')
        ON CONFLICT (id) DO NOTHING;
      `);

      await client.query(`
        INSERT INTO budget_line_items (id,program_id,name,category,expenditure_type,allotment,fiscal_year,created_by) VALUES
          ('LI-2025-001','PROG-2025-001','Anti-Rabies Vaccines (Dogs & Cats)','Vaccines','opex',600000,2025,'system'),
          ('LI-2025-002','PROG-2025-001','Human PEP Biologics (Verorab/Rabipur)','Vaccines','opex',300000,2025,'system'),
          ('LI-2025-003','PROG-2025-001','Syringes & Injection Supplies','Supplies','opex',150000,2025,'system'),
          ('LI-2025-004','PROG-2025-001','IEC Materials & Advocacy','Communication','opex',100000,2025,'system'),
          ('LI-2025-005','PROG-2025-001','Cold Chain Equipment & Maintenance','Equipment','capex',50000,2025,'system'),
          ('LI-2025-006','PROG-2025-002','AI Surveillance & Diagnostic Kits','Diagnostics','opex',250000,2025,'system'),
          ('LI-2025-007','PROG-2025-002','Avian Flu Antiviral Medications','Medicines','opex',300000,2025,'system'),
          ('LI-2025-008','PROG-2025-002','PPE & Protective Equipment','Supplies','opex',150000,2025,'system'),
          ('LI-2025-009','PROG-2025-002','Response Vehicle Operations','Operations','opex',100000,2025,'system'),
          ('LI-2025-010','PROG-2025-003','FMD Vaccines (Cattle/Carabao)','Vaccines','opex',300000,2025,'system'),
          ('LI-2025-011','PROG-2025-003','Hog Cholera & ASF Vaccines','Vaccines','opex',250000,2025,'system'),
          ('LI-2025-012','PROG-2025-003','Newcastle Disease & Poultry Vaccines','Vaccines','opex',200000,2025,'system'),
          ('LI-2025-013','PROG-2025-003','Antiparasitics & Dewormers','Medicines','opex',150000,2025,'system'),
          ('LI-2025-014','PROG-2025-003','Veterinary Instruments & Equipment','Equipment','capex',50000,2025,'system'),
          ('LI-2025-015','PROG-2025-004','Impounding Operations & Transport','Operations','opex',200000,2025,'system'),
          ('LI-2025-016','PROG-2025-004','Spaying & Neutering Procedures','Medical Procedures','opex',250000,2025,'system'),
          ('LI-2025-017','PROG-2025-004','Animal Shelter Maintenance & Feed','Facilities','opex',100000,2025,'system'),
          ('LI-2025-018','PROG-2025-004','Shelter Construction/Expansion','Facilities','capex',50000,2025,'system'),
          ('LI-2025-019','PROG-2025-005','Office Supplies & Materials','Supplies','opex',100000,2025,'system'),
          ('LI-2025-020','PROG-2025-005','Fuel & Transportation','Operations','opex',200000,2025,'system'),
          ('LI-2025-021','PROG-2025-005','IT Equipment & System Maintenance','Equipment','capex',150000,2025,'system'),
          ('LI-2025-022','PROG-2025-005','Staff Training & Capacity Building','Training','opex',50000,2025,'system')
        ON CONFLICT (id) DO NOTHING;
      `);
    }

    await client.query('COMMIT');
    console.log('✅ Budget module tables created');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Budget migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

async function migrateInventoryV2() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add purpose and related fields to medicine_inventory
    await client.query(`ALTER TABLE medicine_inventory ADD COLUMN IF NOT EXISTS purpose VARCHAR(50) DEFAULT 'program'`);
    await client.query(`ALTER TABLE medicine_inventory ADD COLUMN IF NOT EXISTS program_id VARCHAR(50)`);
    await client.query(`ALTER TABLE medicine_inventory ADD COLUMN IF NOT EXISTS line_item_id VARCHAR(50)`);
    await client.query(`ALTER TABLE medicine_inventory ADD COLUMN IF NOT EXISTS fiscal_year INTEGER`);
    await client.query(`ALTER TABLE medicine_inventory ADD COLUMN IF NOT EXISTS received_by VARCHAR(255)`);

    // Add purpose fields to supplies_inventory
    await client.query(`ALTER TABLE supplies_inventory ADD COLUMN IF NOT EXISTS purpose VARCHAR(50) DEFAULT 'office'`);
    await client.query(`ALTER TABLE supplies_inventory ADD COLUMN IF NOT EXISTS program_id VARCHAR(50)`);
    await client.query(`ALTER TABLE supplies_inventory ADD COLUMN IF NOT EXISTS line_item_id VARCHAR(50)`);
    await client.query(`ALTER TABLE supplies_inventory ADD COLUMN IF NOT EXISTS fiscal_year INTEGER`);
    await client.query(`ALTER TABLE supplies_inventory ADD COLUMN IF NOT EXISTS received_by VARCHAR(255)`);

    // Expand inventory_transactions with richer log fields
    await client.query(`ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS reference_person VARCHAR(255)`);
    await client.query(`ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'manual'`);
    await client.query(`ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS source_id VARCHAR(100)`);
    await client.query(`ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS item_name VARCHAR(255)`);
    await client.query(`ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(10,2) DEFAULT 0`);
    await client.query(`ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS total_cost NUMERIC(12,2) DEFAULT 0`);
    await client.query(`ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS notes TEXT`);

    // Add medicines_dispatched to outbreak_records for tracking what was given out
    await client.query(`ALTER TABLE outbreak_records ADD COLUMN IF NOT EXISTS medicines_dispatched JSONB DEFAULT '[]'`);

    // Budget: track inventory-sourced expenditures 
    await client.query(`ALTER TABLE budget_expenditures ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'manual'`);
    await client.query(`ALTER TABLE budget_expenditures ADD COLUMN IF NOT EXISTS inventory_item_id VARCHAR(50)`);
    await client.query(`ALTER TABLE budget_expenditures ADD COLUMN IF NOT EXISTS inventory_item_name VARCHAR(255)`);
    await client.query(`ALTER TABLE budget_expenditures ADD COLUMN IF NOT EXISTS quantity_used INTEGER DEFAULT 0`);

    await client.query('COMMIT');
    console.log('✅ Inventory V2 migration complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Inventory V2 migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

async function migrateLivestockPreReg() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS livestock_pre_registrations (
        id VARCHAR(50) PRIMARY KEY DEFAULT ('LPRE-' || substring(gen_random_uuid()::text, 1, 8)),
        owner_id VARCHAR(100),
        owner_name VARCHAR(255) NOT NULL,
        contact_number VARCHAR(50),
        owner_email VARCHAR(255),
        barangay VARCHAR(255),
        address TEXT,
        animal_type VARCHAR(100) NOT NULL,
        breed VARCHAR(100),
        quantity INTEGER DEFAULT 1,
        farm_type VARCHAR(50) DEFAULT 'Backyard',
        farm_address TEXT,
        health_status VARCHAR(50) DEFAULT 'Healthy',
        vaccination_status VARCHAR(50) DEFAULT 'Unknown',
        notes TEXT,
        status VARCHAR(30) DEFAULT 'Pending',
        denial_reason TEXT,
        livestock_id VARCHAR(100),
        submitted_date TIMESTAMPTZ DEFAULT NOW(),
        approved_date TIMESTAMPTZ,
        denied_date TIMESTAMPTZ,
        expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
      )
    `);
    await client.query('COMMIT');
    console.log('✅ Livestock pre-registration table created');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Livestock pre-reg migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

createTables()
  .then(() => migrateBudget())
  .then(() => migrateInventoryV2())
  .then(() => migrateLivestockPreReg())
  .then(() => migrateProfileColumns())
  .then(() => {
    console.log('Migration complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration error:', err);
    process.exit(1);
  });

// Run avatar + phone column additions
export async function migrateProfileColumns() {
  const client = await pool.connect();
  try {
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);`);
    console.log('✅ Profile columns (avatar, phone) ensured');
  } catch (err) {
    console.error('❌ Profile column migration failed:', err);
  } finally {
    client.release();
  }
}
