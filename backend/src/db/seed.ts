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
    // Regular users
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

    // SuperAdmin users (require barcode scan after password login)
    const superAdmins = [
      {
        id: 'SADMIN-001',
        email: 'deleonlance@nexgov.ph',
        password: 'DeLeon!0445',
        username: 'Lance Win Alexandrei De Leon',
        role: 'superadmin',
        barcode: '2026-0001',
      },
      {
        id: 'SADMIN-002',
        email: 'parkrel@nexgov.ph',
        password: 'Par!0119',
        username: 'Karel Anne Par',
        role: 'superadmin',
        barcode: '2026-0002',
      },
    ];

    for (const sa of superAdmins) {
      const passwordHash = await bcrypt.hash(sa.password, 10);
      const barcodeHash = await bcrypt.hash(sa.barcode, 10);
      await client.query(
        `INSERT INTO users (id, email, password_hash, username, role, barcode_hash, verified)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         ON CONFLICT (id) DO UPDATE
           SET password_hash = $3,
               barcode_hash  = $6`,
        [sa.id, sa.email, passwordHash, sa.username, sa.role, barcodeHash]
      );
    }
    console.log(`  ✓ SuperAdmins seeded (${superAdmins.length})`);

    // ── Pets (rich dataset covering all barangays with spayed/neutered/impound) ──
    const pets = [
      { id:'PET-001', owner_id:'OWNER-001', pet_name:'Max', species:'Dog', breed:'Golden Retriever', age:3, color:'Golden', gender:'Male', is_spayed:false, is_neutered:true, owner_name:'Cyrus Cruz', contact_number:'0917-123-4567', barangay:'Poblacion 1', address:'123 Main Street', vaccination_status:'Vaccinated', last_vaccination_date:'2025-01-15', next_vaccination_date:'2026-01-15', status:'Active', impound_status:'None', registration_date:'2024-06-10' },
      { id:'PET-002', owner_id:'OWNER-001', pet_name:'Bella', species:'Dog', breed:'Labrador', age:2, color:'Black', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Cyrus Cruz', contact_number:'0917-123-4567', barangay:'Poblacion 1', address:'123 Main Street', vaccination_status:'Vaccinated', last_vaccination_date:'2025-02-01', next_vaccination_date:'2026-02-01', status:'Active', impound_status:'None', registration_date:'2024-08-15' },
      { id:'PET-003', owner_id:'OWNER-001', pet_name:'Charlie', species:'Cat', breed:'Persian', age:1, color:'White', gender:'Male', is_spayed:false, is_neutered:false, owner_name:'Cyrus Cruz', contact_number:'0917-123-4567', barangay:'Poblacion 1', address:'123 Main Street', vaccination_status:'Not Vaccinated', status:'Active', impound_status:'None', registration_date:'2025-01-20' },
      { id:'PET-004', owner_id:null, pet_name:'Brownie', species:'Dog', breed:'Aspin', age:4, color:'Brown', gender:'Male', is_spayed:false, is_neutered:false, owner_name:'Maria Reyes', contact_number:'0918-234-5678', barangay:'Poblacion 2', address:'Zone 3', vaccination_status:'Vaccinated', last_vaccination_date:'2024-11-10', next_vaccination_date:'2025-11-10', status:'Active', impound_status:'None', registration_date:'2024-05-12' },
      { id:'PET-005', owner_id:null, pet_name:'Luna', species:'Cat', breed:'Puspin', age:2, color:'Gray/White', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Pedro Santos', contact_number:'0919-345-6789', barangay:'Poblacion 3', address:'Purok 2', vaccination_status:'Vaccinated', last_vaccination_date:'2025-01-05', next_vaccination_date:'2026-01-05', status:'Active', impound_status:'None', registration_date:'2024-09-20' },
      { id:'PET-006', owner_id:null, pet_name:'Lucky', species:'Dog', breed:'Shih Tzu', age:1, color:'Gray', gender:'Male', is_spayed:false, is_neutered:false, owner_name:'Carlos Lopez', contact_number:'0921-567-8901', barangay:'Poblacion 4', address:'Purok 5', vaccination_status:'Not Vaccinated', status:'Lost', impound_status:'None', registration_date:'2025-01-08' },
      { id:'PET-007', owner_id:null, pet_name:'Rocky', species:'Dog', breed:'German Shepherd', age:5, color:'Black/Tan', gender:'Male', is_spayed:false, is_neutered:true, owner_name:'Ana Garcia', contact_number:'0922-678-9012', barangay:'Poblacion 5', address:'Phase 1', vaccination_status:'Due Soon', last_vaccination_date:'2024-06-15', next_vaccination_date:'2025-06-15', status:'Active', impound_status:'None', registration_date:'2024-04-18' },
      { id:'PET-008', owner_id:null, pet_name:'Mimi', species:'Cat', breed:'Siamese', age:3, color:'Cream/Brown', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Jose Bautista', contact_number:'0923-789-0123', barangay:'Poblacion 6', address:'Block 4', vaccination_status:'Vaccinated', last_vaccination_date:'2024-12-20', next_vaccination_date:'2025-12-20', status:'Active', impound_status:'None', registration_date:'2024-07-22' },
      { id:'PET-009', owner_id:null, pet_name:'Choco', species:'Dog', breed:'Aspin', age:2, color:'Chocolate', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Rosa Mendoza', contact_number:'0924-890-1234', barangay:'Balimbing', address:'Sitio 1', vaccination_status:'Not Vaccinated', status:'Active', impound_status:'Impounded', impound_reason:'Roaming without owner', impound_date:'2025-01-10', registration_date:'2024-10-05' },
      { id:'PET-010', owner_id:null, pet_name:'Whiskers', species:'Cat', breed:'Domestic Shorthair', age:4, color:'Orange/White', gender:'Male', is_spayed:false, is_neutered:true, owner_name:'Mario Cruz', contact_number:'0925-901-2345', barangay:'Baclas', address:'Zone 2', vaccination_status:'Vaccinated', last_vaccination_date:'2024-10-01', next_vaccination_date:'2025-10-01', status:'Active', impound_status:'None', registration_date:'2024-06-30' },
      { id:'PET-011', owner_id:null, pet_name:'Duke', species:'Dog', breed:'Labrador Mix', age:3, color:'Yellow', gender:'Male', is_spayed:false, is_neutered:false, owner_name:'Elena Ramos', contact_number:'0926-012-3456', barangay:'Bambang', address:'Purok 3', vaccination_status:'Vaccinated', last_vaccination_date:'2025-01-20', next_vaccination_date:'2026-01-20', status:'Active', impound_status:'None', registration_date:'2024-08-14' },
      { id:'PET-012', owner_id:null, pet_name:'Snowball', species:'Cat', breed:'Persian Mix', age:2, color:'White', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Benjamin Torres', contact_number:'0927-123-4567', barangay:'Bisaya', address:'Sitio Bayanan', vaccination_status:'Vaccinated', last_vaccination_date:'2024-11-15', next_vaccination_date:'2025-11-15', status:'Active', impound_status:'None', registration_date:'2024-07-01' },
      { id:'PET-013', owner_id:null, pet_name:'Rex', species:'Dog', breed:'Rottweiler', age:4, color:'Black/Tan', gender:'Male', is_spayed:false, is_neutered:false, owner_name:'Carla Dela Cruz', contact_number:'0928-234-5678', barangay:'Cahil', address:'Zone 4', vaccination_status:'Due Soon', last_vaccination_date:'2024-05-10', next_vaccination_date:'2025-05-10', status:'Active', impound_status:'None', registration_date:'2024-03-22' },
      { id:'PET-014', owner_id:null, pet_name:'Cleo', species:'Cat', breed:'Siamese Mix', age:1, color:'Cream', gender:'Female', is_spayed:false, is_neutered:false, owner_name:'Fernando Aquino', contact_number:'0929-345-6789', barangay:'Calantas', address:'Purok 1', vaccination_status:'Not Vaccinated', status:'Active', impound_status:'None', registration_date:'2025-02-01' },
      { id:'PET-015', owner_id:null, pet_name:'Buddy', species:'Dog', breed:'Beagle', age:2, color:'Tricolor', gender:'Male', is_spayed:false, is_neutered:true, owner_name:'Gloria Navarro', contact_number:'0930-456-7890', barangay:'Caluangan', address:'Phase 2', vaccination_status:'Vaccinated', last_vaccination_date:'2024-09-05', next_vaccination_date:'2025-09-05', status:'Active', impound_status:'None', registration_date:'2024-05-18' },
      { id:'PET-016', owner_id:null, pet_name:'Pepper', species:'Cat', breed:'Puspin', age:3, color:'Black', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Hector Villanueva', contact_number:'0931-567-8901', barangay:'Camastilisan', address:'Sitio 3', vaccination_status:'Vaccinated', last_vaccination_date:'2024-12-01', next_vaccination_date:'2025-12-01', status:'Active', impound_status:'None', registration_date:'2024-08-10' },
      { id:'PET-017', owner_id:null, pet_name:'Goldie', species:'Dog', breed:'Aspin', age:5, color:'Golden', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Imelda Soriano', contact_number:'0932-678-9012', barangay:'Coral Ni Bacal', address:'Zone 1', vaccination_status:'Not Vaccinated', status:'Active', impound_status:'None', registration_date:'2024-04-25' },
      { id:'PET-018', owner_id:null, pet_name:'Tigger', species:'Cat', breed:'Tabby', age:2, color:'Orange Striped', gender:'Male', is_spayed:false, is_neutered:true, owner_name:'Jaime Mercado', contact_number:'0933-789-0123', barangay:'Coral Ni Lopez', address:'Purok 4', vaccination_status:'Vaccinated', last_vaccination_date:'2025-01-08', next_vaccination_date:'2026-01-08', status:'Active', impound_status:'None', registration_date:'2024-10-12' },
      { id:'PET-019', owner_id:null, pet_name:'Bolt', species:'Dog', breed:'Dalmatian Mix', age:3, color:'White/Black Spotted', gender:'Male', is_spayed:false, is_neutered:false, owner_name:'Karen Espiritu', contact_number:'0934-890-1234', barangay:'Dacanlao', address:'Block 7', vaccination_status:'Due Soon', last_vaccination_date:'2024-08-20', next_vaccination_date:'2025-08-20', status:'Active', impound_status:'None', registration_date:'2024-06-05' },
      { id:'PET-020', owner_id:null, pet_name:'Shadow', species:'Dog', breed:'Labrador', age:4, color:'Black', gender:'Male', is_spayed:false, is_neutered:false, owner_name:'Lorenzo Bautista', contact_number:'0935-901-2345', barangay:'Dila', address:'Sitio Pulo', vaccination_status:'Vaccinated', last_vaccination_date:'2024-10-15', next_vaccination_date:'2025-10-15', status:'Active', impound_status:'None', registration_date:'2024-07-19' },
      { id:'PET-021', owner_id:null, pet_name:'Misty', species:'Cat', breed:'Puspin', age:1, color:'Gray', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Marilou Fernandez', contact_number:'0936-012-3456', barangay:'Loma', address:'Zone 2', vaccination_status:'Not Vaccinated', status:'Active', impound_status:'None', registration_date:'2025-01-15' },
      { id:'PET-022', owner_id:null, pet_name:'Zeus', species:'Dog', breed:'German Shepherd Mix', age:6, color:'Black/Tan', gender:'Male', is_spayed:false, is_neutered:false, owner_name:'Napoleon Castro', contact_number:'0937-123-4567', barangay:'Lumbang Calzada', address:'Purok 6', vaccination_status:'Not Vaccinated', status:'Active', impound_status:'Impounded', impound_reason:'Aggressive behavior', impound_date:'2025-01-08', registration_date:'2024-02-28' },
      { id:'PET-023', owner_id:null, pet_name:'Coco', species:'Cat', breed:'Domestic Shorthair', age:2, color:'Brown Tabby', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Olivia Santos', contact_number:'0938-234-5678', barangay:'Lumbang Na Bata', address:'Zone 3', vaccination_status:'Vaccinated', last_vaccination_date:'2024-11-20', next_vaccination_date:'2025-11-20', status:'Active', impound_status:'None', registration_date:'2024-09-08' },
      { id:'PET-024', owner_id:null, pet_name:'Max Jr', species:'Dog', breed:'Shih Tzu', age:2, color:'White/Brown', gender:'Male', is_spayed:false, is_neutered:true, owner_name:'Pablo Reyes', contact_number:'0939-345-6789', barangay:'Lumbang Na Matanda', address:'Purok 2', vaccination_status:'Vaccinated', last_vaccination_date:'2025-02-05', next_vaccination_date:'2026-02-05', status:'Active', impound_status:'None', registration_date:'2024-11-30' },
      { id:'PET-025', owner_id:null, pet_name:'Lily', species:'Cat', breed:'Persian', age:3, color:'White', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Queenie Villanueva', contact_number:'0940-456-7890', barangay:'Madalunot', address:'Block 1', vaccination_status:'Vaccinated', last_vaccination_date:'2024-12-10', next_vaccination_date:'2025-12-10', status:'Active', impound_status:'None', registration_date:'2024-08-25' },
      { id:'PET-026', owner_id:null, pet_name:'Ranger', species:'Dog', breed:'Aspin', age:3, color:'Brown/White', gender:'Male', is_spayed:false, is_neutered:false, owner_name:'Rodrigo Martinez', contact_number:'0941-567-8901', barangay:'Makina', address:'Sitio 2', vaccination_status:'Due Soon', last_vaccination_date:'2024-07-01', next_vaccination_date:'2025-07-01', status:'Active', impound_status:'None', registration_date:'2024-05-10' },
      { id:'PET-027', owner_id:null, pet_name:'Princess', species:'Cat', breed:'Siamese', age:4, color:'Cream/Chocolate', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Susan Dela Rosa', contact_number:'0942-678-9012', barangay:'Matipok', address:'Zone 5', vaccination_status:'Vaccinated', last_vaccination_date:'2024-09-18', next_vaccination_date:'2025-09-18', status:'Active', impound_status:'None', registration_date:'2024-06-14' },
      { id:'PET-028', owner_id:null, pet_name:'Samson', species:'Dog', breed:'Labrador', age:5, color:'Chocolate', gender:'Male', is_spayed:false, is_neutered:false, owner_name:'Teresita Cruz', contact_number:'0943-789-0123', barangay:'Munting Coral', address:'Purok 7', vaccination_status:'Vaccinated', last_vaccination_date:'2025-01-25', next_vaccination_date:'2026-01-25', status:'Active', impound_status:'None', registration_date:'2024-04-02' },
      { id:'PET-029', owner_id:null, pet_name:'Kitty', species:'Cat', breed:'Puspin', age:1, color:'Black/White', gender:'Female', is_spayed:false, is_neutered:false, owner_name:'Ulysses Ramos', contact_number:'0944-890-1234', barangay:'Niyugan', address:'Phase 3', vaccination_status:'Not Vaccinated', status:'Active', impound_status:'None', registration_date:'2025-02-10' },
      { id:'PET-030', owner_id:null, pet_name:'Scout', species:'Dog', breed:'Beagle Mix', age:2, color:'Brown/White', gender:'Male', is_spayed:false, is_neutered:true, owner_name:'Victoria Flores', contact_number:'0945-901-2345', barangay:'Pantay', address:'Zone 1', vaccination_status:'Vaccinated', last_vaccination_date:'2024-10-30', next_vaccination_date:'2025-10-30', status:'Active', impound_status:'None', registration_date:'2024-07-08' },
      { id:'PET-031', owner_id:null, pet_name:'Oreo', species:'Cat', breed:'Domestic Shorthair', age:3, color:'Black/White', gender:'Male', is_spayed:false, is_neutered:true, owner_name:'Wanda Diaz', contact_number:'0946-012-3456', barangay:'Putting Bato East', address:'Block 5', vaccination_status:'Vaccinated', last_vaccination_date:'2024-11-05', next_vaccination_date:'2025-11-05', status:'Active', impound_status:'None', registration_date:'2024-09-01' },
      { id:'PET-032', owner_id:null, pet_name:'Hazel', species:'Dog', breed:'Aspin', age:4, color:'Hazel/Brown', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Xavier Santiago', contact_number:'0947-123-4567', barangay:'Putting Bato West', address:'Purok 3', vaccination_status:'Not Vaccinated', status:'Active', impound_status:'Impounded', impound_reason:'Found roaming near highway', impound_date:'2025-01-15', registration_date:'2024-05-22' },
      { id:'PET-033', owner_id:null, pet_name:'Amber', species:'Cat', breed:'Puspin', age:2, color:'Orange', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Yvonne Torres', contact_number:'0948-234-5678', barangay:'Quisumbing', address:'Sitio 4', vaccination_status:'Vaccinated', last_vaccination_date:'2025-01-12', next_vaccination_date:'2026-01-12', status:'Active', impound_status:'None', registration_date:'2024-10-18' },
      { id:'PET-034', owner_id:null, pet_name:'Bruno', species:'Dog', breed:'Rottweiler Mix', age:3, color:'Black', gender:'Male', is_spayed:false, is_neutered:false, owner_name:'Zenaida Perez', contact_number:'0949-345-6789', barangay:'Salong', address:'Zone 2', vaccination_status:'Due Soon', last_vaccination_date:'2024-06-20', next_vaccination_date:'2025-06-20', status:'Active', impound_status:'None', registration_date:'2024-04-10' },
      { id:'PET-035', owner_id:null, pet_name:'Mittens', species:'Cat', breed:'Domestic Longhair', age:5, color:'Calico', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Adolfo Aquino', contact_number:'0950-456-7890', barangay:'San Rafael', address:'Purok 8', vaccination_status:'Vaccinated', last_vaccination_date:'2024-08-14', next_vaccination_date:'2025-08-14', status:'Active', impound_status:'None', registration_date:'2024-03-30' },
      { id:'PET-036', owner_id:null, pet_name:'Ace', species:'Dog', breed:'Aspin', age:1, color:'White', gender:'Male', is_spayed:false, is_neutered:false, owner_name:'Brigida Navarro', contact_number:'0951-567-8901', barangay:'Sinisian', address:'Block 2', vaccination_status:'Not Vaccinated', status:'Active', impound_status:'None', registration_date:'2025-02-05' },
      { id:'PET-037', owner_id:null, pet_name:'Pearl', species:'Cat', breed:'Ragdoll Mix', age:3, color:'White/Gray', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Cornelio Bautista', contact_number:'0952-678-9012', barangay:'Taklang Anak', address:'Zone 3', vaccination_status:'Vaccinated', last_vaccination_date:'2024-12-22', next_vaccination_date:'2025-12-22', status:'Active', impound_status:'None', registration_date:'2024-09-12' },
      { id:'PET-038', owner_id:null, pet_name:'Cooper', species:'Dog', breed:'Labrador Mix', age:2, color:'Brown', gender:'Male', is_spayed:false, is_neutered:true, owner_name:'Dolores Cruz', contact_number:'0953-789-0123', barangay:'Talisay', address:'Purok 9', vaccination_status:'Vaccinated', last_vaccination_date:'2025-01-18', next_vaccination_date:'2026-01-18', status:'Active', impound_status:'None', registration_date:'2024-11-08' },
      { id:'PET-039', owner_id:null, pet_name:'Dusty', species:'Cat', breed:'Puspin', age:4, color:'Gray', gender:'Male', is_spayed:false, is_neutered:true, owner_name:'Ernesto Santos', contact_number:'0954-890-1234', barangay:'Tamayo', address:'Sitio 5', vaccination_status:'Due Soon', last_vaccination_date:'2024-09-01', next_vaccination_date:'2025-09-01', status:'Active', impound_status:'None', registration_date:'2024-06-20' },
      { id:'PET-040', owner_id:null, pet_name:'Ginger', species:'Dog', breed:'Chow Chow Mix', age:3, color:'Red/Orange', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Felicitas Reyes', contact_number:'0955-901-2345', barangay:'Timbain', address:'Zone 4', vaccination_status:'Vaccinated', last_vaccination_date:'2024-10-28', next_vaccination_date:'2025-10-28', status:'Active', impound_status:'None', registration_date:'2024-07-15' },
      { id:'PET-041', owner_id:null, pet_name:'Sparky', species:'Dog', breed:'Aspin', age:2, color:'Black', gender:'Male', is_spayed:false, is_neutered:false, owner_name:'Gregorio Flores', contact_number:'0956-012-3456', barangay:'Bagong Tubig', address:'Block 6', vaccination_status:'Not Vaccinated', status:'Active', impound_status:'For Adoption', impound_reason:'Owner surrendered', impound_date:'2025-01-20', registration_date:'2024-12-01' },
    ];

    for (const p of pets) {
      await client.query(
        `INSERT INTO pets (id, owner_id, pet_name, species, breed, age, color, gender, is_spayed, is_neutered, owner_name, contact_number, barangay, address, vaccination_status, last_vaccination_date, next_vaccination_date, status, impound_status, impound_reason, impound_date, registration_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.owner_id, p.pet_name, p.species, p.breed, p.age, p.color, p.gender || null,
         (p as any).is_spayed || false, (p as any).is_neutered || false,
         p.owner_name, p.contact_number, p.barangay, p.address, p.vaccination_status,
         (p as any).last_vaccination_date || null, (p as any).next_vaccination_date || null, p.status,
         (p as any).impound_status || 'None', (p as any).impound_reason || null, (p as any).impound_date || null,
         p.registration_date]
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
      { id: 'LF-001', pet_id: 'PET-006', pet_name: 'Lucky', species: 'Dog', breed: 'Shih Tzu', color: 'Gray', type: 'Lost', reported_by: 'Carlos Lopez', reported_by_role: 'owner', contact_number: '0921-567-8901', last_seen_location: 'Near Public Market', barangay: 'Poblacion 4', date_reported: '2025-02-10', description: 'Small gray Shih Tzu, wearing red collar with name tag. Very friendly.', status: 'Open' },
      { id: 'LF-002', pet_id: 'UNKNOWN', pet_name: 'Unknown Dog', species: 'Dog', breed: 'Shih Tzu Mix', color: 'Light Gray', type: 'Found', reported_by: 'BAHW Miguel Sanchez', reported_by_role: 'bahw', contact_number: '0922-678-9012', last_seen_location: 'Poblacion 4 Public Market area', barangay: 'Poblacion 4', date_reported: '2025-02-11', description: 'Small gray dog, possibly Shih Tzu mix, no collar but very friendly and well-groomed.', status: 'Open' },
      { id: 'LF-003', pet_id: 'UNKNOWN', pet_name: 'Unknown Cat', species: 'Cat', breed: 'Siamese', color: 'Cream/Brown', type: 'Found', reported_by: 'Mario Bautista', reported_by_role: 'guest', contact_number: '0923-789-0123', last_seen_location: 'Barangay Hall premises', barangay: 'Poblacion 2', date_reported: '2025-01-28', description: 'Friendly Siamese cat, no collar, appears well-fed and domesticated.', status: 'Open' },
      { id: 'LF-004', pet_id: 'UNKNOWN', pet_name: 'Unknown Dog', species: 'Dog', breed: 'Aspin', color: 'Brown', type: 'Lost', reported_by: 'Lina Santos', reported_by_role: 'guest', contact_number: '0924-890-1234', last_seen_location: 'Near elementary school', barangay: 'Balimbing', date_reported: '2025-02-05', description: 'Medium-sized brown dog, answers to Rex, has a scar on left leg. No collar.', status: 'Open' },
      { id: 'LF-005', pet_id: 'UNKNOWN', pet_name: 'Unknown Cat', species: 'Cat', breed: 'Tabby', color: 'Orange Striped', type: 'Found', reported_by: 'Dr. Amalia Vergara', reported_by_role: 'admin', contact_number: '0925-901-2345', last_seen_location: 'CVO compound', barangay: 'Poblacion 3', date_reported: '2025-02-08', description: 'Orange tabby cat found near CVO, very friendly, appears to be well cared for. No collar.', status: 'Open' },
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
      { id: 'SCH-003', barangay: 'Balimbing', date: '2025-05-22', time_start: '08:00', time_end: '11:00', venue: 'Sitio Covered Court', capacity: 30, registered: 5, status: 'Scheduled', created_by: 'BAHW Miguel Sanchez' },
      { id: 'SCH-004', barangay: 'Bambang', date: '2025-05-25', time_start: '13:00', time_end: '17:00', venue: 'Multi-Purpose Hall', capacity: 35, registered: 7, status: 'Scheduled', created_by: 'BAHW Miguel Sanchez' },
      { id: 'SCH-005', barangay: 'Poblacion 5', date: '2025-06-05', time_start: '08:00', time_end: '12:00', venue: 'Health Center Compound', capacity: 60, registered: 22, status: 'Scheduled', created_by: 'Dr. Amalia Vergara' },
      { id: 'SCH-006', barangay: 'Quisumbing', date: '2025-04-10', time_start: '08:00', time_end: '11:00', venue: 'Barangay Plaza', capacity: 25, registered: 25, status: 'Completed', created_by: 'BAHW Miguel Sanchez' },
      { id: 'SCH-007', barangay: 'Salong', date: '2025-04-12', time_start: '09:00', time_end: '12:00', venue: 'Elementary School Grounds', capacity: 30, registered: 28, status: 'Completed', created_by: 'Dr. Amalia Vergara' },
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

    await client.query(`DELETE FROM budget_allocation`);
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


    // ── System Settings (Maintenance Mode) ───────────────────────────────
    await client.query(`
      INSERT INTO system_settings (key, value, updated_by) 
      VALUES ('maintenance_mode', 'false', 'system')
      ON CONFLICT (key) DO NOTHING
    `);
    console.log(`  ✓ System settings seeded`);

    // ── Admin Settings (default) ──────────────────────────────────────────
    const settingsExists = await client.query('SELECT 1 FROM admin_settings LIMIT 1');
    if (settingsExists.rows.length === 0) {
      await client.query(`INSERT INTO admin_settings (system_name, city, province) VALUES ('NASaAlaga VMS', 'Calaca', 'Batangas')`);
    }
    console.log(`  ✓ Admin settings seeded`);

    // ── Admin Thresholds (default) ────────────────────────────────────────
    const threshExists = await client.query('SELECT 1 FROM admin_thresholds LIMIT 1');
    if (threshExists.rows.length === 0) {
      await client.query(`INSERT INTO admin_thresholds DEFAULT VALUES`);
    }
    console.log(`  ✓ Admin thresholds seeded`);

    // ── Recommendations ───────────────────────────────────────────────────
    const recs = [
      { id: 'REC-001', title: 'Increase Vaccination Coverage in Zone Red', priority: 'High', status: 'Active', category: 'Vaccination', description: 'Zone Red barangays (Quisumbing, Salong, Sinisian, Talisay) have vaccination rates below 70%. Deploy BAHW teams for mass vaccination drives.' },
      { id: 'REC-002', title: 'Deploy BAHW to Balimbing for ASF Monitoring', priority: 'Critical', status: 'Active', category: 'Disease Control', description: 'ASF cases in Balimbing have exceeded threshold (15 cases). Immediate quarantine and BAHW deployment required.' },
      { id: 'REC-003', title: 'Restock Rabies Vaccines Before May Drive', priority: 'Medium', status: 'Pending', category: 'Resources', description: 'Current rabies vaccine stock at 250 vials. Projected need for May drive: 400+ vials. Procurement must be initiated.' },
    ];
    for (const r of recs) {
      await client.query(
        `INSERT INTO recommendations (id, title, priority, status, category, description, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,'Dr. Amalia Vergara')
         ON CONFLICT (id) DO NOTHING`,
        [r.id, r.title, r.priority, r.status, r.category, r.description]
      );
    }
    console.log(`  ✓ Recommendations seeded (${recs.length})`);

    // ── Rules ─────────────────────────────────────────────────────────────
    const rules = [
      {
        id: 'RULE-001', name: 'Rabies Vaccination Overdue Alert',
        description: 'Triggers when a registered pet has passed its next vaccination due date.',
        category: 'alert', priority: 'high', status: 'active',
        conditions: JSON.stringify([{ id: 'C1', dataSource: 'pets', field: 'nextVaccinationDate', operator: 'less_than', value: 'today' }]),
        actions: JSON.stringify([{ id: 'A1', type: 'create_alert', config: { alertLevel: 'warning', message: 'Pet vaccination overdue — contact owner immediately.' } }]),
        zones: ['Poblacion 1', 'Poblacion 2', 'Poblacion 3'],
        created_by: 'Dr. Amalia Vergara',
      },
      {
        id: 'RULE-002', name: 'ASF Outbreak Quarantine Trigger',
        description: 'Triggers a critical alert and intervention when ASF cases exceed threshold.',
        category: 'intervention', priority: 'critical', status: 'active',
        conditions: JSON.stringify([{ id: 'C2', dataSource: 'livestock', field: 'asfCases', operator: 'greater_than', value: 3 }]),
        actions: JSON.stringify([{ id: 'A2', type: 'escalate', config: { alertLevel: 'critical', message: 'ASF cases exceed threshold — initiate quarantine protocol.' } }]),
        zones: ['Balimbing', 'Bisaya', 'Cahil'],
        created_by: 'Dr. Amalia Vergara',
      },
      {
        id: 'RULE-003', name: 'Low Vaccination Rate Warning',
        description: 'Flags barangays where vaccination coverage drops below the 70% target.',
        category: 'analytics', priority: 'medium', status: 'active',
        conditions: JSON.stringify([{ id: 'C3', dataSource: 'pets', field: 'vaccinationRate', operator: 'less_than', value: 70 }]),
        actions: JSON.stringify([{ id: 'A4', type: 'create_alert', config: { alertLevel: 'warning', message: 'Vaccination rate below 70% — schedule community drive.' } }]),
        zones: [],
        created_by: 'BAHW Miguel Sanchez',
      },
      {
        id: 'RULE-004', name: 'High Pet Population Density Alert',
        description: 'Detects barangays with high unregistered pet density based on survey vs registration gap.',
        category: 'analytics', priority: 'low', status: 'testing',
        conditions: JSON.stringify([{ id: 'C4', dataSource: 'survey_gap', field: 'unregisteredPets', operator: 'gap_threshold', value: 40 }]),
        actions: JSON.stringify([{ id: 'A5', type: 'update_analytics', config: { analyticsMetric: 'registrationGapScore' } }]),
        zones: [],
        created_by: 'Dr. Amalia Vergara',
      },
    ];
    for (const rule of rules) {
      await client.query(
        `INSERT INTO rules (id, name, description, category, priority, status, conditions, actions, zones, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [rule.id, rule.name, rule.description, rule.category, rule.priority, rule.status, rule.conditions, rule.actions, rule.zones, rule.created_by]
      );
    }
    console.log(`  ✓ Rules seeded (${rules.length})`);

    // ── Medicine Inventory ────────────────────────────────────────────────
    const medicines = [
      { id: 'MED-001', barcode: '8901234567890', name: 'Rabies Vaccine (Rabisin)', generic_name: 'Inactivated Rabies Virus', category: 'Vaccine', type: 'Viral Vaccine', lot_number: 'LT2025-R01', expiry_date: '2026-06-30', manufacture_date: '2024-06-01', manufacturer: 'Merial Philippines', quantity: 250, unit: 'vials', reorder_level: 50, unit_cost: 185.00, storage_condition: 'Refrigerate 2-8°C', description: 'Anti-rabies vaccine for dogs and cats' },
      { id: 'MED-002', barcode: '8901234567891', name: 'Amoxicillin 500mg', generic_name: 'Amoxicillin Trihydrate', category: 'Antibiotic', type: 'Broad Spectrum', lot_number: 'LT2025-A02', expiry_date: '2026-12-31', manufacture_date: '2024-01-15', manufacturer: 'Intervet Philippines', quantity: 800, unit: 'tablets', reorder_level: 100, unit_cost: 12.50, storage_condition: 'Store below 25°C', description: 'Broad-spectrum antibiotic for bacterial infections' },
      { id: 'MED-003', barcode: '8901234567892', name: 'Ivermectin 1%', generic_name: 'Ivermectin', category: 'Antiparasitic', type: 'Endectocide', lot_number: 'LT2025-I03', expiry_date: '2027-01-31', manufacture_date: '2025-01-10', manufacturer: 'Elanco Philippines', quantity: 120, unit: 'vials', reorder_level: 20, unit_cost: 320.00, storage_condition: 'Store below 30°C, away from light', description: 'Broad-spectrum antiparasitic for livestock' },
      { id: 'MED-004', barcode: '8901234567893', name: 'Vitamin B Complex', generic_name: 'Thiamine/Riboflavin/Niacin/B6/B12', category: 'Vitamin', type: 'Multivitamin', lot_number: 'LT2025-V04', expiry_date: '2026-09-30', manufacture_date: '2024-09-01', manufacturer: 'Pfizer Animal Health', quantity: 350, unit: 'ampoules', reorder_level: 50, unit_cost: 45.00, storage_condition: 'Store below 25°C', description: 'Essential B vitamins for animal health and recovery' },
      { id: 'MED-005', barcode: '8901234567894', name: 'Newcastle Disease Vaccine', generic_name: 'Live ND Virus (La Sota strain)', category: 'Vaccine', type: 'Viral Vaccine', lot_number: 'LT2025-N05', expiry_date: '2025-12-31', manufacture_date: '2024-12-01', manufacturer: 'BIAH Philippines', quantity: 45, unit: 'vials', reorder_level: 30, unit_cost: 220.00, storage_condition: 'Refrigerate 2-8°C, protect from light', description: 'Vaccine for Newcastle Disease in poultry' },
      { id: 'MED-006', barcode: '8901234567895', name: 'Oxytetracycline 20%', generic_name: 'Oxytetracycline HCl', category: 'Antibiotic', type: 'Tetracycline', lot_number: 'LT2025-O06', expiry_date: '2026-08-31', manufacture_date: '2024-08-15', manufacturer: 'Zoetis Philippines', quantity: 60, unit: 'vials', reorder_level: 15, unit_cost: 480.00, storage_condition: 'Refrigerate 2-8°C', description: 'Injectable antibiotic for livestock infections' },
      { id: 'MED-007', barcode: '8901234567896', name: 'Vitamin E + Selenium', generic_name: 'Alpha-tocopherol + Sodium Selenite', category: 'Vitamin', type: 'Antioxidant Supplement', lot_number: 'LT2025-SE07', expiry_date: '2026-11-30', manufacture_date: '2024-11-01', manufacturer: 'Intervet Philippines', quantity: 90, unit: 'vials', reorder_level: 20, unit_cost: 280.00, storage_condition: 'Store below 30°C', description: 'Vitamin E and selenium supplement for cattle and swine' },
      { id: 'MED-008', barcode: '8901234567897', name: 'Anti-Rabies Serum (Equine)', generic_name: 'Equine Rabies Immunoglobulin', category: 'Vaccine', type: 'Immunoglobulin', lot_number: 'LT2025-ARS08', expiry_date: '2026-03-31', manufacture_date: '2024-03-15', manufacturer: 'Instituto Pasteur', quantity: 30, unit: 'ampoules', reorder_level: 10, unit_cost: 1200.00, storage_condition: 'Refrigerate 2-8°C strictly', description: 'Post-exposure prophylaxis for rabies' },
    ];
    for (const m of medicines) {
      await client.query(
        `INSERT INTO medicine_inventory (id, barcode, name, generic_name, category, type, lot_number, expiry_date, manufacture_date, manufacturer, quantity, unit, reorder_level, unit_cost, storage_condition, description, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'Dr. Amalia Vergara')
         ON CONFLICT (id) DO NOTHING`,
        [m.id, m.barcode, m.name, m.generic_name, m.category, m.type, m.lot_number, m.expiry_date, m.manufacture_date, m.manufacturer, m.quantity, m.unit, m.reorder_level, m.unit_cost, m.storage_condition, m.description]
      );
    }
    console.log(`  ✓ Medicine inventory seeded (${medicines.length})`);

    // ── Supplies Inventory ────────────────────────────────────────────────
    const supplies = [
      { id: 'SUP-001', barcode: '7890123456789', name: 'Disposable Syringes 5ml', category: 'Medical Supplies', type: 'Injection Equipment', quantity: 2000, unit: 'pieces', reorder_level: 300, unit_cost: 8.50, supplier: 'MedSource PH', last_restocked: '2025-03-01', description: 'Single-use syringes for vaccine administration' },
      { id: 'SUP-002', barcode: '7890123456790', name: 'Examination Gloves (Large)', category: 'PPE', type: 'Protective Equipment', quantity: 500, unit: 'pairs', reorder_level: 100, unit_cost: 15.00, supplier: 'SafePro Philippines', last_restocked: '2025-02-15', description: 'Latex examination gloves for veterinary procedures' },
      { id: 'SUP-003', barcode: '7890123456791', name: 'Specimen Collection Tubes', category: 'Diagnostic', type: 'Laboratory Supplies', quantity: 300, unit: 'pieces', reorder_level: 50, unit_cost: 25.00, supplier: 'LabMed PH', last_restocked: '2025-01-20', description: 'EDTA tubes for blood sample collection' },
      { id: 'SUP-004', barcode: '7890123456792', name: 'Thermometer (Digital Rectal)', category: 'Diagnostic', type: 'Instruments', quantity: 15, unit: 'pieces', reorder_level: 3, unit_cost: 650.00, supplier: 'VetEquip Philippines', last_restocked: '2025-01-10', description: 'Digital rectal thermometer for livestock' },
      { id: 'SUP-005', barcode: '7890123456793', name: 'Vaccine Carrier / Cold Box', category: 'Cold Chain', type: 'Storage Equipment', quantity: 8, unit: 'pieces', reorder_level: 2, unit_cost: 1800.00, supplier: 'ColdChain PH', last_restocked: '2024-12-01', description: 'Insulated carrier for vaccine field transport' },
      { id: 'SUP-006', barcode: '7890123456794', name: 'Gauze Bandage 4 inch', category: 'Wound Care', type: 'First Aid', quantity: 400, unit: 'rolls', reorder_level: 60, unit_cost: 18.00, supplier: 'MedSource PH', last_restocked: '2025-02-28', description: 'Sterile gauze bandage rolls for wound dressing' },
      { id: 'SUP-007', barcode: '7890123456795', name: 'Disposable Needles 18G', category: 'Medical Supplies', type: 'Injection Equipment', quantity: 1500, unit: 'pieces', reorder_level: 200, unit_cost: 4.50, supplier: 'MedSource PH', last_restocked: '2025-03-05', description: '18-gauge needles for livestock injections' },
      { id: 'SUP-008', barcode: '7890123456796', name: 'Stethoscope (Veterinary)', category: 'Diagnostic', type: 'Instruments', quantity: 6, unit: 'pieces', reorder_level: 2, unit_cost: 2200.00, supplier: 'VetEquip Philippines', last_restocked: '2024-11-15', description: 'Dual-head veterinary stethoscope' },
    ];
    for (const s of supplies) {
      await client.query(
        `INSERT INTO supplies_inventory (id, barcode, name, category, type, quantity, unit, reorder_level, unit_cost, supplier, last_restocked, description, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'Dr. Amalia Vergara')
         ON CONFLICT (id) DO NOTHING`,
        [s.id, s.barcode, s.name, s.category, s.type, s.quantity, s.unit, s.reorder_level, s.unit_cost, s.supplier, s.last_restocked, s.description]
      );
    }
    console.log(`  ✓ Supplies inventory seeded (${supplies.length})`);

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
