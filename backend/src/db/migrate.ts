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

    // ── Vaccination History table ───────────────────────────────────────────
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

createTables()
  .then(() => {
    console.log('Migration complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration error:', err);
    process.exit(1);
  });
