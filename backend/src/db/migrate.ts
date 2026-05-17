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
        owner_id VARCHAR(100) NOT NULL,
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


    // Patch new pet columns (safe to run multiple times)
    await client.query(`ALTER TABLE pets ADD COLUMN IF NOT EXISTS is_spayed BOOLEAN DEFAULT false`);
    await client.query(`ALTER TABLE pets ADD COLUMN IF NOT EXISTS is_neutered BOOLEAN DEFAULT false`);
    await client.query(`ALTER TABLE pets ADD COLUMN IF NOT EXISTS impound_status VARCHAR(50) DEFAULT 'None'`);
    await client.query(`ALTER TABLE pets ADD COLUMN IF NOT EXISTS impound_date DATE`);
    await client.query(`ALTER TABLE pets ADD COLUMN IF NOT EXISTS impound_reason TEXT`);
    await client.query(`ALTER TABLE pets ADD COLUMN IF NOT EXISTS release_date DATE`);

    // Pet pre-registrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS pet_pre_registrations (
        pre_reg_number VARCHAR(100) PRIMARY KEY,
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
        status VARCHAR(50) DEFAULT 'Pending',
        denial_reason TEXT,
        pet_id VARCHAR(50),
        submitted_date TIMESTAMPTZ DEFAULT NOW(),
        approved_date TIMESTAMPTZ,
        denied_date TIMESTAMPTZ
      );
    `);

    // Livestock table
    await client.query(`
      CREATE TABLE IF NOT EXISTS livestock (
        id VARCHAR(50) PRIMARY KEY,
        owner_id VARCHAR(100) NOT NULL,
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
        type VARCHAR(20) NOT NULL,
        reported_by VARCHAR(255),
        reported_by_role VARCHAR(50),
        owner_id VARCHAR(100),
        contact_number VARCHAR(50),
        last_seen_location TEXT,
        barangay VARCHAR(255),
        date_reported DATE DEFAULT CURRENT_DATE,
        description TEXT,
        status VARCHAR(50) DEFAULT 'Open',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

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
