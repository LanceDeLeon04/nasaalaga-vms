import { pool } from './index';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const seed = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── Barangays ──────────────────────────────────────────────────────────
    const barangays = [
      { name: 'Baclas', zone: 'North', color: '#6B7280' },
      { name: 'Bagong Tubig', zone: 'West', color: '#8B5CF6' },
      { name: 'Balimbing', zone: 'North', color: '#6B7280' },
      { name: 'Bambang', zone: 'North', color: '#6B7280' },
      { name: 'Bisaya', zone: 'North', color: '#6B7280' },
      { name: 'Cahil', zone: 'West', color: '#8B5CF6' },
      { name: 'Calantas', zone: 'West', color: '#8B5CF6' },
      { name: 'Caluangan', zone: 'East', color: '#2B5EA6' },
      { name: 'Camastilisan', zone: 'Red', color: '#E85D3B' },
      { name: 'Coral Ni Bacal', zone: 'East', color: '#2B5EA6' },
      { name: 'Coral Ni Lopez', zone: 'West', color: '#8B5CF6' },
      { name: 'Dacanlao', zone: 'West', color: '#8B5CF6' },
      { name: 'Dila', zone: 'East', color: '#2B5EA6' },
      { name: 'Loma', zone: 'West', color: '#8B5CF6' },
      { name: 'Lumbang Calzada', zone: 'Red', color: '#E85D3B' },
      { name: 'Lumbang Na Bata', zone: 'East', color: '#2B5EA6' },
      { name: 'Lumbang Na Matanda', zone: 'East', color: '#2B5EA6' },
      { name: 'Madalunot', zone: 'North', color: '#6B7280' },
      { name: 'Makina', zone: 'West', color: '#8B5CF6' },
      { name: 'Matipok', zone: 'North', color: '#6B7280' },
      { name: 'Munting Coral', zone: 'North', color: '#6B7280' },
      { name: 'Niyugan', zone: 'North', color: '#6B7280' },
      { name: 'Pantay', zone: 'West', color: '#8B5CF6' },
      { name: 'Poblacion 1', zone: 'East', color: '#2B5EA6' },
      { name: 'Poblacion 2', zone: 'East', color: '#2B5EA6' },
      { name: 'Poblacion 3', zone: 'East', color: '#2B5EA6' },
      { name: 'Poblacion 4', zone: 'East', color: '#2B5EA6' },
      { name: 'Poblacion 5', zone: 'Red', color: '#E85D3B' },
      { name: 'Poblacion 6', zone: 'East', color: '#2B5EA6' },
      { name: 'Putting Bato East', zone: 'Red', color: '#E85D3B' },
      { name: 'Putting Bato West', zone: 'Red', color: '#E85D3B' },
      { name: 'Quisumbing', zone: 'Red', color: '#E85D3B' },
      { name: 'Salong', zone: 'Red', color: '#E85D3B' },
      { name: 'San Rafael', zone: 'Red', color: '#E85D3B' },
      { name: 'Sinisian', zone: 'Red', color: '#E85D3B' },
      { name: 'Taklang Anak', zone: 'West', color: '#8B5CF6' },
      { name: 'Talisay', zone: 'Red', color: '#E85D3B' },
      { name: 'Tamayo', zone: 'North', color: '#6B7280' },
      { name: 'Timbain', zone: 'West', color: '#8B5CF6' },
    ];

    for (const b of barangays) {
      await client.query(
        `INSERT INTO barangays (name, zone, zone_color)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        [b.name, b.zone, b.color]
      );
    }
    console.log(`  ✓ Barangays seeded (${barangays.length})`);

    // ── Users ──────────────────────────────────────────────────────────────
    const usersData = [
      { id: 'USER-001', email: 'amie.vergara@nexgov.ph', password: 'Vergara$2026', username: 'Dr. Amalia Vergara', role: 'admin', owner_id: null, barangay: null },
      { id: 'USER-002', email: 'miguel.sanchez@nexgov.ph', password: 'Sanchez$2026', username: 'BAHW Miguel Sanchez', role: 'bahw', owner_id: null, barangay: 'Poblacion 1' },
      { id: 'USER-003', email: 'cyrus.cruz@gmail.com', password: 'Cruz$2026', username: 'Cyrus Cruz', role: 'owner', owner_id: 'OWNER-001', barangay: 'Poblacion 1', address: '123 Main Street', phone: '09171234567' },
      { id: 'USER-004', email: 'aeden.aranez@gmail.com', password: 'Aranez$2026', username: 'Aeden Aranez', role: 'owner', owner_id: 'OWNER-002', barangay: 'Poblacion 5', address: 'Farm Road, Barangay 5', phone: '09182345678' },
    ];

    for (const u of usersData) {
      const hash = await bcrypt.hash(u.password, 10);
      await client.query(
        `INSERT INTO users (id, email, phone, password_hash, username, role, owner_id, barangay, address, verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
         ON CONFLICT (id) DO NOTHING`,
        [u.id, u.email, (u as any).phone || null, hash, u.username, u.role, u.owner_id, u.barangay, (u as any).address || null]
      );
    }
    console.log(`  ✓ Users seeded (${usersData.length})`);

    // ── Pets ───────────────────────────────────────────────────────────────
    const pets = [
      { id: 'PET-001', owner_id: 'OWNER-001', pet_name: 'Max', species: 'Dog', breed: 'Golden Retriever', age: 3, color: 'Golden', gender: 'Male', owner_name: 'Cyrus Cruz', contact_number: '0917-123-4567', barangay: 'Poblacion 1', address: '123 Main Street', vaccination_status: 'Vaccinated', last_vaccination_date: '2025-01-15', next_vaccination_date: '2026-01-15', status: 'Active', registration_date: '2024-06-10' },
      { id: 'PET-002', owner_id: 'OWNER-001', pet_name: 'Bella', species: 'Dog', breed: 'Labrador', age: 2, color: 'Black', gender: 'Female', owner_name: 'Cyrus Cruz', contact_number: '0917-123-4567', barangay: 'Poblacion 1', address: '123 Main Street', vaccination_status: 'Vaccinated', last_vaccination_date: '2025-02-01', next_vaccination_date: '2026-02-01', status: 'Active', registration_date: '2024-08-15' },
      { id: 'PET-003', owner_id: 'OWNER-001', pet_name: 'Charlie', species: 'Cat', breed: 'Persian', age: 1, color: 'White', gender: 'Male', owner_name: 'Cyrus Cruz', contact_number: '0917-123-4567', barangay: 'Poblacion 1', address: '123 Main Street', vaccination_status: 'Not Vaccinated', status: 'Active', registration_date: '2025-01-20' },
    ];

    for (const p of pets) {
      await client.query(
        `INSERT INTO pets (id, owner_id, pet_name, species, breed, age, color, gender, owner_name, contact_number, barangay, address, vaccination_status, last_vaccination_date, next_vaccination_date, status, registration_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.owner_id, p.pet_name, p.species, p.breed, p.age, p.color, p.gender, p.owner_name, p.contact_number, p.barangay, p.address, p.vaccination_status, (p as any).last_vaccination_date || null, (p as any).next_vaccination_date || null, p.status, p.registration_date]
      );
    }
    console.log(`  ✓ Pets seeded (${pets.length})`);

    // ── Livestock ──────────────────────────────────────────────────────────
    const livestock = [
      { id: 'LS-001', owner_id: 'OWNER-002', animal_type: 'Cattle', breed: 'Brahman', quantity: 5, owner_name: 'Aeden Aranez', contact_number: '0918-234-5678', barangay: 'Poblacion 5', farm_address: 'Farm Road, Barangay 5', health_status: 'Healthy', last_checkup_date: '2025-02-01', vaccination_status: 'Vaccinated', registration_date: '2024-05-10' },
      { id: 'LS-002', owner_id: 'OWNER-002', animal_type: 'Swine', breed: 'Large White', quantity: 15, owner_name: 'Aeden Aranez', contact_number: '0918-234-5678', barangay: 'Poblacion 5', farm_address: 'Farm Road, Barangay 5', health_status: 'Healthy', last_checkup_date: '2025-01-25', vaccination_status: 'Vaccinated', registration_date: '2024-07-15' },
    ];

    for (const l of livestock) {
      await client.query(
        `INSERT INTO livestock (id, owner_id, animal_type, breed, quantity, owner_name, contact_number, barangay, farm_address, health_status, last_checkup_date, vaccination_status, registration_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (id) DO NOTHING`,
        [l.id, l.owner_id, l.animal_type, l.breed, l.quantity, l.owner_name, l.contact_number, l.barangay, l.farm_address, l.health_status, l.last_checkup_date, l.vaccination_status, l.registration_date]
      );
    }
    console.log(`  ✓ Livestock seeded (${livestock.length})`);

    // ── Lost & Found ───────────────────────────────────────────────────────
    const lostFound = [
      { id: 'LF-001', pet_id: 'UNKNOWN', pet_name: 'Lucky', species: 'Dog', breed: 'Shih Tzu', color: 'Gray', type: 'Lost', reported_by: 'Carlos Lopez', reported_by_role: 'owner', owner_id: 'OWNER-003', contact_number: '0921-567-8901', last_seen_location: 'Near Public Market', barangay: 'Poblacion 4', date_reported: '2025-02-10', description: 'Small gray Shih Tzu, wearing red collar with name tag. Very friendly.', status: 'Open' },
      { id: 'LF-002', pet_id: 'UNKNOWN', pet_name: 'Unknown', species: 'Dog', breed: 'Shih Tzu Mix', color: 'Light Gray', type: 'Found', reported_by: 'BAHW Miguel Sanchez', reported_by_role: 'bahw', contact_number: '0922-678-9012', last_seen_location: 'Barangay 4 Public Market area', barangay: 'Poblacion 4', date_reported: '2025-02-11', description: 'Small gray dog, possibly Shih Tzu mix, no collar but very friendly and well-groomed.', status: 'Open' },
    ];

    for (const r of lostFound) {
      await client.query(
        `INSERT INTO lost_found_reports (id, pet_id, pet_name, species, breed, color, type, reported_by, reported_by_role, owner_id, contact_number, last_seen_location, barangay, date_reported, description, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO NOTHING`,
        [r.id, r.pet_id, r.pet_name, r.species, r.breed, r.color, r.type, r.reported_by, r.reported_by_role, (r as any).owner_id || null, r.contact_number, r.last_seen_location, r.barangay, r.date_reported, r.description, r.status]
      );
    }
    console.log(`  ✓ Lost & Found reports seeded (${lostFound.length})`);

    // ── Vaccination Schedules ──────────────────────────────────────────────
    const schedules = [
      { id: 'SCH-001', barangay: 'Poblacion 1', date: '2025-05-15', time_start: '08:00', time_end: '12:00', venue: 'Barangay Hall', capacity: 50, registered: 12, status: 'Scheduled', created_by: 'BAHW Miguel Sanchez' },
      { id: 'SCH-002', barangay: 'Poblacion 3', date: '2025-05-20', time_start: '09:00', time_end: '13:00', venue: 'Community Center', capacity: 40, registered: 8, status: 'Scheduled', created_by: 'BAHW Miguel Sanchez' },
    ];

    for (const s of schedules) {
      await client.query(
        `INSERT INTO vaccination_schedules (id, barangay, date, time_start, time_end, venue, capacity, registered, status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [s.id, s.barangay, s.date, s.time_start, s.time_end, s.venue, s.capacity, s.registered, s.status, s.created_by]
      );
    }
    console.log(`  ✓ Vaccination schedules seeded (${schedules.length})`);

    // ── Livestock Stats by Barangay ────────────────────────────────────────
    const livestockStats = [
      { barangay: 'Poblacion 1', cattle: 120, swine: 450, poultry: 2300, goats: 80 },
      { barangay: 'Poblacion 2', cattle: 95, swine: 380, poultry: 1900, goats: 60 },
      { barangay: 'Poblacion 3', cattle: 150, swine: 520, poultry: 2800, goats: 110 },
      { barangay: 'Poblacion 4', cattle: 85, swine: 290, poultry: 1600, goats: 45 },
      { barangay: 'Poblacion 5', cattle: 110, swine: 410, poultry: 2100, goats: 70 },
      { barangay: 'Bagong Tubig', cattle: 75, swine: 320, poultry: 1400, goats: 50 },
      { barangay: 'Balimbing', cattle: 130, swine: 480, poultry: 2500, goats: 95 },
      { barangay: 'Bisaya', cattle: 90, swine: 350, poultry: 1800, goats: 65 },
      { barangay: 'Cahil', cattle: 105, swine: 420, poultry: 2200, goats: 80 },
      { barangay: 'Calantas', cattle: 88, swine: 310, poultry: 1650, goats: 55 },
      { barangay: 'Caluangan', cattle: 92, swine: 340, poultry: 1750, goats: 58 },
      { barangay: 'Camastilisan', cattle: 78, swine: 280, poultry: 1500, goats: 42 },
      { barangay: 'Dacanlao', cattle: 115, swine: 430, poultry: 2300, goats: 85 },
      { barangay: 'Dila', cattle: 98, swine: 370, poultry: 1850, goats: 62 },
      { barangay: 'Loma', cattle: 72, swine: 260, poultry: 1350, goats: 38 },
      { barangay: 'Makina', cattle: 125, swine: 460, poultry: 2400, goats: 90 },
      { barangay: 'Matipok', cattle: 83, swine: 300, poultry: 1550, goats: 48 },
      { barangay: 'Niyugan', cattle: 67, swine: 240, poultry: 1200, goats: 35 },
      { barangay: 'Tamayo', cattle: 102, swine: 390, poultry: 1950, goats: 68 },
      { barangay: 'Talisay', cattle: 119, swine: 445, poultry: 2280, goats: 78 },
    ];

    for (const s of livestockStats) {
      await client.query(
        `INSERT INTO livestock_stats (barangay, cattle, swine, poultry, goats)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (barangay) DO UPDATE SET cattle=$2, swine=$3, poultry=$4, goats=$5`,
        [s.barangay, s.cattle, s.swine, s.poultry, s.goats]
      );
    }
    console.log(`  ✓ Livestock stats seeded (${livestockStats.length})`);

    // ── Vaccination Trends ─────────────────────────────────────────────────
    const trends = [
      { month: 'Jan', year: 2025, vaccination_rate: 85, diseases: 12, vaccinated_pets: 340, vaccinated_livestock: 120 },
      { month: 'Feb', year: 2025, vaccination_rate: 88, diseases: 8, vaccinated_pets: 352, vaccinated_livestock: 130 },
      { month: 'Mar', year: 2025, vaccination_rate: 92, diseases: 5, vaccinated_pets: 368, vaccinated_livestock: 145 },
      { month: 'Apr', year: 2025, vaccination_rate: 90, diseases: 7, vaccinated_pets: 360, vaccinated_livestock: 135 },
      { month: 'May', year: 2025, vaccination_rate: 94, diseases: 4, vaccinated_pets: 376, vaccinated_livestock: 150 },
      { month: 'Jun', year: 2025, vaccination_rate: 96, diseases: 3, vaccinated_pets: 384, vaccinated_livestock: 155 },
    ];

    for (const t of trends) {
      await client.query(
        `INSERT INTO vaccination_trends (month, year, vaccination_rate, diseases, vaccinated_pets, vaccinated_livestock)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (month, year) DO UPDATE SET vaccination_rate=$3, diseases=$4, vaccinated_pets=$5, vaccinated_livestock=$6`,
        [t.month, t.year, t.vaccination_rate, t.diseases, t.vaccinated_pets, t.vaccinated_livestock]
      );
    }
    console.log(`  ✓ Vaccination trends seeded (${trends.length})`);

    // ── Budget Allocation ──────────────────────────────────────────────────
    const budget = [
      { category: 'Vaccines', amount: 450000, percentage: 37.5, color: '#3b82f6' },
      { category: 'Equipment', amount: 250000, percentage: 20.8, color: '#10b981' },
      { category: 'Training', amount: 150000, percentage: 12.5, color: '#f59e0b' },
      { category: 'Operations', amount: 350000, percentage: 29.2, color: '#ef4444' },
    ];

    for (const b of budget) {
      await client.query(
        `INSERT INTO budget_allocation (category, amount, percentage, color) VALUES ($1,$2,$3,$4)`,
        [b.category, b.amount, b.percentage, b.color]
      );
    }
    console.log(`  ✓ Budget allocation seeded (${budget.length})`);

    // ── Disease Alerts ─────────────────────────────────────────────────────
    const diseaseAlerts = [
      { id: 'DA-001', disease: 'Canine Distemper', location: 'Poblacion 3', severity: 'High', cases: 8, status: 'Active', reported_date: '2025-04-10', last_update: '2025-04-18' },
      { id: 'DA-002', disease: 'African Swine Fever (ASF)', location: 'Balimbing', severity: 'Critical', cases: 15, status: 'Contained', reported_date: '2025-04-05', last_update: '2025-04-17' },
      { id: 'DA-003', disease: 'Avian Influenza', location: 'Bisaya', severity: 'Moderate', cases: 5, status: 'Monitoring', reported_date: '2025-04-12', last_update: '2025-04-18' },
    ];

    for (const d of diseaseAlerts) {
      await client.query(
        `INSERT INTO disease_alerts (id, disease, location, severity, cases, status, reported_date, last_update)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (id) DO NOTHING`,
        [d.id, d.disease, d.location, d.severity, d.cases, d.status, d.reported_date, d.last_update]
      );
    }
    console.log(`  ✓ Disease alerts seeded (${diseaseAlerts.length})`);

    // ── Outbreak Data ──────────────────────────────────────────────────────
    const outbreakData = [
      { id: 'OUT-001', disease: 'Rabies', barangay: 'Poblacion 1', cases: 2, date_reported: '2025-03-15', status: 'Contained', affected_animals: 'Dogs' },
      { id: 'OUT-002', disease: 'African Swine Fever', barangay: 'Balimbing', cases: 15, date_reported: '2025-04-05', status: 'Active', affected_animals: 'Swine' },
      { id: 'OUT-003', disease: 'Canine Distemper', barangay: 'Poblacion 3', cases: 8, date_reported: '2025-04-10', status: 'Active', affected_animals: 'Dogs' },
      { id: 'OUT-004', disease: 'Avian Influenza', barangay: 'Bisaya', cases: 5, date_reported: '2025-04-12', status: 'Monitoring', affected_animals: 'Poultry' },
      { id: 'OUT-005', disease: 'Foot and Mouth Disease', barangay: 'Cahil', cases: 3, date_reported: '2025-03-20', status: 'Resolved', affected_animals: 'Cattle' },
    ];

    for (const o of outbreakData) {
      await client.query(
        `INSERT INTO outbreak_data (id, disease, barangay, cases, date_reported, status, affected_animals)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO NOTHING`,
        [o.id, o.disease, o.barangay, o.cases, o.date_reported, o.status, o.affected_animals]
      );
    }
    console.log(`  ✓ Outbreak data seeded (${outbreakData.length})`);

    await client.query('COMMIT');
    console.log('\n✅ Seed complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
