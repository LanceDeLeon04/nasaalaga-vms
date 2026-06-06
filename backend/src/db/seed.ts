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
      { name: 'Camastilisan', zone: 'Baybay-Highway', color: '#E85D3B' },
      { name: 'Coral Ni Bacal', zone: 'East', color: '#2B5EA6' },
      { name: 'Coral Ni Lopez', zone: 'West', color: '#8B5CF6' },
      { name: 'Dacanlao', zone: 'West', color: '#8B5CF6' },
      { name: 'Dila', zone: 'East', color: '#2B5EA6' },
      { name: 'Loma', zone: 'West', color: '#8B5CF6' },
      { name: 'Lumbang Calzada', zone: 'Baybay-Highway', color: '#E85D3B' },
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
      { name: 'Poblacion 5', zone: 'Baybay-Highway', color: '#E85D3B' },
      { name: 'Poblacion 6', zone: 'East', color: '#2B5EA6' },
      { name: 'Puting Bato East', zone: 'Baybay-Highway', color: '#E85D3B' },
      { name: 'Puting Bato West', zone: 'Baybay-Highway', color: '#E85D3B' },
      { name: 'Quisumbing', zone: 'Baybay-Highway', color: '#E85D3B' },
      { name: 'Salong', zone: 'Baybay-Highway', color: '#E85D3B' },
      { name: 'San Rafael', zone: 'Baybay-Highway', color: '#E85D3B' },
      { name: 'Sinisian', zone: 'Baybay-Highway', color: '#E85D3B' },
      { name: 'Taklang Anak', zone: 'West', color: '#8B5CF6' },
      { name: 'Talisay', zone: 'Baybay-Highway', color: '#E85D3B' },
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
      { id:'BLU-000-00001', owner_id:'OWNER-001', pet_name:'Max', species:'Dog', breed:'Golden Retriever', age:3, color:'Golden', gender:'Male', is_spayed:false, is_neutered:true, owner_name:'Cyrus Cruz', contact_number:'0917-123-4567', barangay:'Poblacion 1', address:'123 Main Street', vaccination_status:'Vaccinated', last_vaccination_date:'2025-01-15', next_vaccination_date:'2026-01-15', status:'Active', impound_status:'None', registration_date:'2024-06-10' , pet_tag_id:'BLU-000-00001' },
      { id:'BLU-000-00002', owner_id:'OWNER-001', pet_name:'Bella', species:'Dog', breed:'Labrador', age:2, color:'Black', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Cyrus Cruz', contact_number:'0917-123-4567', barangay:'Poblacion 1', address:'123 Main Street', vaccination_status:'Vaccinated', last_vaccination_date:'2025-02-01', next_vaccination_date:'2026-02-01', status:'Active', impound_status:'None', registration_date:'2024-08-15' , pet_tag_id:'BLU-000-00002' },
      { id:'BLU-000-00003', owner_id:'OWNER-001', pet_name:'Charlie', species:'Cat', breed:'Persian', age:1, color:'White', gender:'Male', is_spayed:false, is_neutered:false, owner_name:'Cyrus Cruz', contact_number:'0917-123-4567', barangay:'Poblacion 1', address:'123 Main Street', vaccination_status:'Not Vaccinated', status:'Active', impound_status:'None', registration_date:'2025-01-20' , pet_tag_id:'BLU-000-00003' },
      { id:'BLU-000-00004', owner_id:null, pet_name:'Brownie', species:'Dog', breed:'Aspin', age:4, color:'Brown', gender:'Male', is_spayed:false, is_neutered:false, owner_name:'Maria Reyes', contact_number:'0918-234-5678', barangay:'Poblacion 2', address:'Zone 3', vaccination_status:'Vaccinated', last_vaccination_date:'2024-11-10', next_vaccination_date:'2025-11-10', status:'Active', impound_status:'None', registration_date:'2024-05-12' , pet_tag_id:'BLU-000-00004' },
      { id:'BLU-000-00005', owner_id:null, pet_name:'Luna', species:'Cat', breed:'Puspin', age:2, color:'Gray/White', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Pedro Santos', contact_number:'0919-345-6789', barangay:'Poblacion 3', address:'Purok 2', vaccination_status:'Vaccinated', last_vaccination_date:'2025-01-05', next_vaccination_date:'2026-01-05', status:'Active', impound_status:'None', registration_date:'2024-09-20' , pet_tag_id:'BLU-000-00005' },
      { id:'BLU-000-00006', owner_id:null, pet_name:'Lucky', species:'Dog', breed:'Shih Tzu', age:1, color:'Gray', gender:'Male', is_spayed:false, is_neutered:false, owner_name:'Carlos Lopez', contact_number:'0921-567-8901', barangay:'Poblacion 4', address:'Purok 5', vaccination_status:'Not Vaccinated', status:'Lost', impound_status:'None', registration_date:'2025-01-08' , pet_tag_id:'BLU-000-00006' },
      { id:'RED-000-00001', owner_id:null, pet_name:'Rocky', species:'Dog', breed:'German Shepherd', age:5, color:'Black/Tan', gender:'Male', is_spayed:false, is_neutered:true, owner_name:'Ana Garcia', contact_number:'0922-678-9012', barangay:'Poblacion 5', address:'Phase 1', vaccination_status:'Due Soon', last_vaccination_date:'2024-06-15', next_vaccination_date:'2025-06-15', status:'Active', impound_status:'None', registration_date:'2024-04-18' , pet_tag_id:'RED-000-00001' },
      { id:'BLU-000-00007', owner_id:null, pet_name:'Mimi', species:'Cat', breed:'Siamese', age:3, color:'Cream/Brown', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Jose Bautista', contact_number:'0923-789-0123', barangay:'Poblacion 6', address:'Block 4', vaccination_status:'Vaccinated', last_vaccination_date:'2024-12-20', next_vaccination_date:'2025-12-20', status:'Active', impound_status:'None', registration_date:'2024-07-22' , pet_tag_id:'BLU-000-00007' },
      { id:'GRY-000-00001', owner_id:null, pet_name:'Choco', species:'Dog', breed:'Aspin', age:2, color:'Chocolate', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Rosa Mendoza', contact_number:'0924-890-1234', barangay:'Balimbing', address:'Sitio 1', vaccination_status:'Not Vaccinated', status:'Active', impound_status:'Impounded', impound_reason:'Roaming without owner', impound_date:'2025-01-10', registration_date:'2024-10-05' , pet_tag_id:'GRY-000-00001' },
      { id:'GRY-000-00002', owner_id:null, pet_name:'Whiskers', species:'Cat', breed:'Domestic Shorthair', age:4, color:'Orange/White', gender:'Male', is_spayed:false, is_neutered:true, owner_name:'Mario Cruz', contact_number:'0925-901-2345', barangay:'Baclas', address:'Zone 2', vaccination_status:'Vaccinated', last_vaccination_date:'2024-10-01', next_vaccination_date:'2025-10-01', status:'Active', impound_status:'None', registration_date:'2024-06-30' , pet_tag_id:'GRY-000-00002' },
      { id:'GRY-000-00003', owner_id:null, pet_name:'Duke', species:'Dog', breed:'Labrador Mix', age:3, color:'Yellow', gender:'Male', is_spayed:false, is_neutered:false, owner_name:'Elena Ramos', contact_number:'0926-012-3456', barangay:'Bambang', address:'Purok 3', vaccination_status:'Vaccinated', last_vaccination_date:'2025-01-20', next_vaccination_date:'2026-01-20', status:'Active', impound_status:'None', registration_date:'2024-08-14' , pet_tag_id:'GRY-000-00003' },
      { id:'GRY-000-00004', owner_id:null, pet_name:'Snowball', species:'Cat', breed:'Persian Mix', age:2, color:'White', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Benjamin Torres', contact_number:'0927-123-4567', barangay:'Bisaya', address:'Sitio Bayanan', vaccination_status:'Vaccinated', last_vaccination_date:'2024-11-15', next_vaccination_date:'2025-11-15', status:'Active', impound_status:'None', registration_date:'2024-07-01' , pet_tag_id:'GRY-000-00004' },
      { id:'PRP-000-00001', owner_id:null, pet_name:'Rex', species:'Dog', breed:'Rottweiler', age:4, color:'Black/Tan', gender:'Male', is_spayed:false, is_neutered:false, owner_name:'Carla Dela Cruz', contact_number:'0928-234-5678', barangay:'Cahil', address:'Zone 4', vaccination_status:'Due Soon', last_vaccination_date:'2024-05-10', next_vaccination_date:'2025-05-10', status:'Active', impound_status:'None', registration_date:'2024-03-22' , pet_tag_id:'PRP-000-00001' },
      { id:'PRP-000-00002', owner_id:null, pet_name:'Cleo', species:'Cat', breed:'Siamese Mix', age:1, color:'Cream', gender:'Female', is_spayed:false, is_neutered:false, owner_name:'Fernando Aquino', contact_number:'0929-345-6789', barangay:'Calantas', address:'Purok 1', vaccination_status:'Not Vaccinated', status:'Active', impound_status:'None', registration_date:'2025-02-01' , pet_tag_id:'PRP-000-00002' },
      { id:'BLU-000-00008', owner_id:null, pet_name:'Buddy', species:'Dog', breed:'Beagle', age:2, color:'Tricolor', gender:'Male', is_spayed:false, is_neutered:true, owner_name:'Gloria Navarro', contact_number:'0930-456-7890', barangay:'Caluangan', address:'Phase 2', vaccination_status:'Vaccinated', last_vaccination_date:'2024-09-05', next_vaccination_date:'2025-09-05', status:'Active', impound_status:'None', registration_date:'2024-05-18' , pet_tag_id:'BLU-000-00008' },
      { id:'RED-000-00002', owner_id:null, pet_name:'Pepper', species:'Cat', breed:'Puspin', age:3, color:'Black', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Hector Villanueva', contact_number:'0931-567-8901', barangay:'Camastilisan', address:'Sitio 3', vaccination_status:'Vaccinated', last_vaccination_date:'2024-12-01', next_vaccination_date:'2025-12-01', status:'Active', impound_status:'None', registration_date:'2024-08-10' , pet_tag_id:'RED-000-00002' },
      { id:'BLU-000-00009', owner_id:null, pet_name:'Goldie', species:'Dog', breed:'Aspin', age:5, color:'Golden', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Imelda Soriano', contact_number:'0932-678-9012', barangay:'Coral Ni Bacal', address:'Zone 1', vaccination_status:'Not Vaccinated', status:'Active', impound_status:'None', registration_date:'2024-04-25' , pet_tag_id:'BLU-000-00009' },
      { id:'PRP-000-00003', owner_id:null, pet_name:'Tigger', species:'Cat', breed:'Tabby', age:2, color:'Orange Striped', gender:'Male', is_spayed:false, is_neutered:true, owner_name:'Jaime Mercado', contact_number:'0933-789-0123', barangay:'Coral Ni Lopez', address:'Purok 4', vaccination_status:'Vaccinated', last_vaccination_date:'2025-01-08', next_vaccination_date:'2026-01-08', status:'Active', impound_status:'None', registration_date:'2024-10-12' , pet_tag_id:'PRP-000-00003' },
      { id:'PRP-000-00004', owner_id:null, pet_name:'Bolt', species:'Dog', breed:'Dalmatian Mix', age:3, color:'White/Black Spotted', gender:'Male', is_spayed:false, is_neutered:false, owner_name:'Karen Espiritu', contact_number:'0934-890-1234', barangay:'Dacanlao', address:'Block 7', vaccination_status:'Due Soon', last_vaccination_date:'2024-08-20', next_vaccination_date:'2025-08-20', status:'Active', impound_status:'None', registration_date:'2024-06-05' , pet_tag_id:'PRP-000-00004' },
      { id:'BLU-000-00010', owner_id:null, pet_name:'Shadow', species:'Dog', breed:'Labrador', age:4, color:'Black', gender:'Male', is_spayed:false, is_neutered:false, owner_name:'Lorenzo Bautista', contact_number:'0935-901-2345', barangay:'Dila', address:'Sitio Pulo', vaccination_status:'Vaccinated', last_vaccination_date:'2024-10-15', next_vaccination_date:'2025-10-15', status:'Active', impound_status:'None', registration_date:'2024-07-19' , pet_tag_id:'BLU-000-00010' },
      { id:'PRP-000-00005', owner_id:null, pet_name:'Misty', species:'Cat', breed:'Puspin', age:1, color:'Gray', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Marilou Fernandez', contact_number:'0936-012-3456', barangay:'Loma', address:'Zone 2', vaccination_status:'Not Vaccinated', status:'Active', impound_status:'None', registration_date:'2025-01-15' , pet_tag_id:'PRP-000-00005' },
      { id:'RED-000-00003', owner_id:null, pet_name:'Zeus', species:'Dog', breed:'German Shepherd Mix', age:6, color:'Black/Tan', gender:'Male', is_spayed:false, is_neutered:false, owner_name:'Napoleon Castro', contact_number:'0937-123-4567', barangay:'Lumbang Calzada', address:'Purok 6', vaccination_status:'Not Vaccinated', status:'Active', impound_status:'Impounded', impound_reason:'Aggressive behavior', impound_date:'2025-01-08', registration_date:'2024-02-28' , pet_tag_id:'RED-000-00003' },
      { id:'BLU-000-00011', owner_id:null, pet_name:'Coco', species:'Cat', breed:'Domestic Shorthair', age:2, color:'Brown Tabby', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Olivia Santos', contact_number:'0938-234-5678', barangay:'Lumbang Na Bata', address:'Zone 3', vaccination_status:'Vaccinated', last_vaccination_date:'2024-11-20', next_vaccination_date:'2025-11-20', status:'Active', impound_status:'None', registration_date:'2024-09-08' , pet_tag_id:'BLU-000-00011' },
      { id:'BLU-000-00012', owner_id:null, pet_name:'Max Jr', species:'Dog', breed:'Shih Tzu', age:2, color:'White/Brown', gender:'Male', is_spayed:false, is_neutered:true, owner_name:'Pablo Reyes', contact_number:'0939-345-6789', barangay:'Lumbang Na Matanda', address:'Purok 2', vaccination_status:'Vaccinated', last_vaccination_date:'2025-02-05', next_vaccination_date:'2026-02-05', status:'Active', impound_status:'None', registration_date:'2024-11-30' , pet_tag_id:'BLU-000-00012' },
      { id:'GRY-000-00005', owner_id:null, pet_name:'Lily', species:'Cat', breed:'Persian', age:3, color:'White', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Queenie Villanueva', contact_number:'0940-456-7890', barangay:'Madalunot', address:'Block 1', vaccination_status:'Vaccinated', last_vaccination_date:'2024-12-10', next_vaccination_date:'2025-12-10', status:'Active', impound_status:'None', registration_date:'2024-08-25' , pet_tag_id:'GRY-000-00005' },
      { id:'PRP-000-00006', owner_id:null, pet_name:'Ranger', species:'Dog', breed:'Aspin', age:3, color:'Brown/White', gender:'Male', is_spayed:false, is_neutered:false, owner_name:'Rodrigo Martinez', contact_number:'0941-567-8901', barangay:'Makina', address:'Sitio 2', vaccination_status:'Due Soon', last_vaccination_date:'2024-07-01', next_vaccination_date:'2025-07-01', status:'Active', impound_status:'None', registration_date:'2024-05-10' , pet_tag_id:'PRP-000-00006' },
      { id:'GRY-000-00006', owner_id:null, pet_name:'Princess', species:'Cat', breed:'Siamese', age:4, color:'Cream/Chocolate', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Susan Dela Rosa', contact_number:'0942-678-9012', barangay:'Matipok', address:'Zone 5', vaccination_status:'Vaccinated', last_vaccination_date:'2024-09-18', next_vaccination_date:'2025-09-18', status:'Active', impound_status:'None', registration_date:'2024-06-14' , pet_tag_id:'GRY-000-00006' },
      { id:'GRY-000-00007', owner_id:null, pet_name:'Samson', species:'Dog', breed:'Labrador', age:5, color:'Chocolate', gender:'Male', is_spayed:false, is_neutered:false, owner_name:'Teresita Cruz', contact_number:'0943-789-0123', barangay:'Munting Coral', address:'Purok 7', vaccination_status:'Vaccinated', last_vaccination_date:'2025-01-25', next_vaccination_date:'2026-01-25', status:'Active', impound_status:'None', registration_date:'2024-04-02' , pet_tag_id:'GRY-000-00007' },
      { id:'GRY-000-00008', owner_id:null, pet_name:'Kitty', species:'Cat', breed:'Puspin', age:1, color:'Black/White', gender:'Female', is_spayed:false, is_neutered:false, owner_name:'Ulysses Ramos', contact_number:'0944-890-1234', barangay:'Niyugan', address:'Phase 3', vaccination_status:'Not Vaccinated', status:'Active', impound_status:'None', registration_date:'2025-02-10' , pet_tag_id:'GRY-000-00008' },
      { id:'PRP-000-00007', owner_id:null, pet_name:'Scout', species:'Dog', breed:'Beagle Mix', age:2, color:'Brown/White', gender:'Male', is_spayed:false, is_neutered:true, owner_name:'Victoria Flores', contact_number:'0945-901-2345', barangay:'Pantay', address:'Zone 1', vaccination_status:'Vaccinated', last_vaccination_date:'2024-10-30', next_vaccination_date:'2025-10-30', status:'Active', impound_status:'None', registration_date:'2024-07-08' , pet_tag_id:'PRP-000-00007' },
      { id:'RED-000-00004', owner_id:null, pet_name:'Oreo', species:'Cat', breed:'Domestic Shorthair', age:3, color:'Black/White', gender:'Male', is_spayed:false, is_neutered:true, owner_name:'Wanda Diaz', contact_number:'0946-012-3456', barangay:'Puting Bato East', address:'Block 5', vaccination_status:'Vaccinated', last_vaccination_date:'2024-11-05', next_vaccination_date:'2025-11-05', status:'Active', impound_status:'None', registration_date:'2024-09-01' , pet_tag_id:'RED-000-00004' },
      { id:'RED-000-00005', owner_id:null, pet_name:'Hazel', species:'Dog', breed:'Aspin', age:4, color:'Hazel/Brown', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Xavier Santiago', contact_number:'0947-123-4567', barangay:'Puting Bato West', address:'Purok 3', vaccination_status:'Not Vaccinated', status:'Active', impound_status:'Impounded', impound_reason:'Found roaming near highway', impound_date:'2025-01-15', registration_date:'2024-05-22' , pet_tag_id:'RED-000-00005' },
      { id:'RED-000-00006', owner_id:null, pet_name:'Amber', species:'Cat', breed:'Puspin', age:2, color:'Orange', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Yvonne Torres', contact_number:'0948-234-5678', barangay:'Quisumbing', address:'Sitio 4', vaccination_status:'Vaccinated', last_vaccination_date:'2025-01-12', next_vaccination_date:'2026-01-12', status:'Active', impound_status:'None', registration_date:'2024-10-18' , pet_tag_id:'RED-000-00006' },
      { id:'RED-000-00007', owner_id:null, pet_name:'Bruno', species:'Dog', breed:'Rottweiler Mix', age:3, color:'Black', gender:'Male', is_spayed:false, is_neutered:false, owner_name:'Zenaida Perez', contact_number:'0949-345-6789', barangay:'Salong', address:'Zone 2', vaccination_status:'Due Soon', last_vaccination_date:'2024-06-20', next_vaccination_date:'2025-06-20', status:'Active', impound_status:'None', registration_date:'2024-04-10' , pet_tag_id:'RED-000-00007' },
      { id:'RED-000-00008', owner_id:null, pet_name:'Mittens', species:'Cat', breed:'Domestic Longhair', age:5, color:'Calico', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Adolfo Aquino', contact_number:'0950-456-7890', barangay:'San Rafael', address:'Purok 8', vaccination_status:'Vaccinated', last_vaccination_date:'2024-08-14', next_vaccination_date:'2025-08-14', status:'Active', impound_status:'None', registration_date:'2024-03-30' , pet_tag_id:'RED-000-00008' },
      { id:'RED-000-00009', owner_id:null, pet_name:'Ace', species:'Dog', breed:'Aspin', age:1, color:'White', gender:'Male', is_spayed:false, is_neutered:false, owner_name:'Brigida Navarro', contact_number:'0951-567-8901', barangay:'Sinisian', address:'Block 2', vaccination_status:'Not Vaccinated', status:'Active', impound_status:'None', registration_date:'2025-02-05' , pet_tag_id:'RED-000-00009' },
      { id:'PRP-000-00008', owner_id:null, pet_name:'Pearl', species:'Cat', breed:'Ragdoll Mix', age:3, color:'White/Gray', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Cornelio Bautista', contact_number:'0952-678-9012', barangay:'Taklang Anak', address:'Zone 3', vaccination_status:'Vaccinated', last_vaccination_date:'2024-12-22', next_vaccination_date:'2025-12-22', status:'Active', impound_status:'None', registration_date:'2024-09-12' , pet_tag_id:'PRP-000-00008' },
      { id:'RED-000-00010', owner_id:null, pet_name:'Cooper', species:'Dog', breed:'Labrador Mix', age:2, color:'Brown', gender:'Male', is_spayed:false, is_neutered:true, owner_name:'Dolores Cruz', contact_number:'0953-789-0123', barangay:'Talisay', address:'Purok 9', vaccination_status:'Vaccinated', last_vaccination_date:'2025-01-18', next_vaccination_date:'2026-01-18', status:'Active', impound_status:'None', registration_date:'2024-11-08' , pet_tag_id:'RED-000-00010' },
      { id:'GRY-000-00009', owner_id:null, pet_name:'Dusty', species:'Cat', breed:'Puspin', age:4, color:'Gray', gender:'Male', is_spayed:false, is_neutered:true, owner_name:'Ernesto Santos', contact_number:'0954-890-1234', barangay:'Tamayo', address:'Sitio 5', vaccination_status:'Due Soon', last_vaccination_date:'2024-09-01', next_vaccination_date:'2025-09-01', status:'Active', impound_status:'None', registration_date:'2024-06-20' , pet_tag_id:'GRY-000-00009' },
      { id:'PRP-000-00009', owner_id:null, pet_name:'Ginger', species:'Dog', breed:'Chow Chow Mix', age:3, color:'Red/Orange', gender:'Female', is_spayed:true, is_neutered:false, owner_name:'Felicitas Reyes', contact_number:'0955-901-2345', barangay:'Timbain', address:'Zone 4', vaccination_status:'Vaccinated', last_vaccination_date:'2024-10-28', next_vaccination_date:'2025-10-28', status:'Active', impound_status:'None', registration_date:'2024-07-15' , pet_tag_id:'PRP-000-00009' },
      { id:'PRP-000-00010', owner_id:null, pet_name:'Sparky', species:'Dog', breed:'Aspin', age:2, color:'Black', gender:'Male', is_spayed:false, is_neutered:false, owner_name:'Gregorio Flores', contact_number:'0956-012-3456', barangay:'Bagong Tubig', address:'Block 6', vaccination_status:'Not Vaccinated', status:'Active', impound_status:'For Adoption', impound_reason:'Owner surrendered', impound_date:'2025-01-20', registration_date:'2024-12-01' , pet_tag_id:'PRP-000-00010' },
    ];

    // Delete existing seed pets first to avoid both id and pet_tag_id unique conflicts
    const seedPetIds = pets.map(p => p.id);
    const seedTagIds = pets.map(p => (p as any).pet_tag_id).filter(Boolean);
    if (seedPetIds.length > 0) {
      await client.query(`DELETE FROM pets WHERE id = ANY($1::text[])`, [seedPetIds]);
    }
    if (seedTagIds.length > 0) {
      await client.query(`DELETE FROM pets WHERE pet_tag_id = ANY($1::text[])`, [seedTagIds]);
    }

    for (const p of pets) {
      await client.query(
        `INSERT INTO pets (id, owner_id, pet_name, species, breed, age, color, gender, is_spayed, is_neutered, owner_name, contact_number, barangay, address, vaccination_status, last_vaccination_date, next_vaccination_date, status, impound_status, impound_reason, impound_date, registration_date, pet_tag_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
        [p.id, p.owner_id, p.pet_name, p.species, p.breed, p.age, p.color, p.gender || null,
         (p as any).is_spayed || false, (p as any).is_neutered || false,
         p.owner_name, p.contact_number, p.barangay, p.address, p.vaccination_status,
         (p as any).last_vaccination_date || null, (p as any).next_vaccination_date || null, p.status,
         (p as any).impound_status || 'None', (p as any).impound_reason || null, (p as any).impound_date || null,
         p.registration_date, (p as any).pet_tag_id || null]
      );
    }
    console.log(`  ✓ Pets seeded (${pets.length})`);

    // ── Livestock ──────────────────────────────────────────────────────────
    const livestock = [
      { id:'LS-001', owner_id:'OWNER-002', animal_type:'Cattle',  breed:'Brahman',       quantity:5,   gender:'Mixed', age:'3-5 years', purpose:'Dairy/Beef', color_markings:'Gray',       owner_name:'Aeden Aranez',      contact_number:'0918-234-5678', barangay:'Poblacion 5',       farm_address:'Farm Road, Brgy 5',       health_status:'Healthy',    last_checkup_date:'2025-02-01', farm_type:'Backyard',     tag_number:'CTL-0001', registration_date:'2024-05-10' },
      { id:'LS-002', owner_id:'OWNER-002', animal_type:'Swine',   breed:'Large White',   quantity:15,  gender:'Mixed', age:'6-18 months',purpose:'Meat',       color_markings:'Pink/White', owner_name:'Aeden Aranez',      contact_number:'0918-234-5678', barangay:'Poblacion 5',       farm_address:'Farm Road, Brgy 5',       health_status:'Healthy',    last_checkup_date:'2025-01-25', farm_type:'Backyard',     tag_number:'SWN-0015', registration_date:'2024-07-15' },
      { id:'LS-003', owner_id:null,        animal_type:'Carabao', breed:'Native',        quantity:3,   gender:'Male',  age:'4-6 years',  purpose:'Draft',      color_markings:'Gray/Black', owner_name:'Jose Dela Cruz',    contact_number:'0919-345-6789', barangay:'Balimbing',         farm_address:'Sitio Kaingin, Balimbing',health_status:'Healthy',    last_checkup_date:'2025-01-10', farm_type:'Backyard',     tag_number:'CAR-0003', registration_date:'2024-03-22' },
      { id:'LS-004', owner_id:null,        animal_type:'Poultry', breed:'Native/Broiler',quantity:350, gender:'Mixed', age:'2-6 months', purpose:'Egg/Meat',   color_markings:'Mixed',      owner_name:'Maria Santos',      contact_number:'0920-456-7890', barangay:'Bambang',           farm_address:'Purok 3, Bambang',        health_status:'Healthy',    last_checkup_date:'2025-02-05', farm_type:'Commercial Farm',     tag_number:null,       registration_date:'2024-06-01' },
      { id:'LS-005', owner_id:null,        animal_type:'Swine',   breed:'Landrace',      quantity:22,  gender:'Mixed', age:'4-12 months',purpose:'Meat',       color_markings:'White',      owner_name:'Pedro Reyes',       contact_number:'0921-567-8901', barangay:'Bisaya',            farm_address:'Zone 2, Bisaya',          health_status:'Quarantine', last_checkup_date:'2025-01-28', farm_type:'Semi-Commercial', tag_number:'SWN-0022', registration_date:'2024-08-10', quarantine_date:'2025-01-28', quarantine_reason:'ASF suspect - pending confirmation' },
      { id:'LS-006', owner_id:null,        animal_type:'Goats',   breed:'Anglo-Nubian',  quantity:12,  gender:'Mixed', age:'1-3 years',  purpose:'Dairy/Meat', color_markings:'Brown/White',owner_name:'Ana Garcia',        contact_number:'0922-678-9012', barangay:'Cahil',             farm_address:'Purok 1, Cahil',          health_status:'Healthy',    last_checkup_date:'2025-01-15', farm_type:'Backyard',     tag_number:'GT-0012',  registration_date:'2024-04-18' },
      { id:'LS-007', owner_id:null,        animal_type:'Cattle',  breed:'Crossbreed',    quantity:8,   gender:'Mixed', age:'2-4 years',  purpose:'Beef',       color_markings:'Brown',      owner_name:'Roberto Cruz',      contact_number:'0923-789-0123', barangay:'Dacanlao',          farm_address:'Farm Lot, Dacanlao',      health_status:'Healthy',    last_checkup_date:'2025-02-08', farm_type:'Backyard',     tag_number:'CTL-0008', registration_date:'2024-05-25' },
      { id:'LS-008', owner_id:null,        animal_type:'Poultry', breed:'Rhode Island Red',quantity:200,gender:'Mixed', age:'1-12 months',purpose:'Egg',        color_markings:'Red/Brown',  owner_name:'Elena Flores',      contact_number:'0924-890-1234', barangay:'Dila',              farm_address:'Sitio Pulo, Dila',        health_status:'Healthy',    last_checkup_date:'2025-01-20', farm_type:'Commercial Farm',     tag_number:null,       registration_date:'2024-07-08' },
      { id:'LS-009', owner_id:null,        animal_type:'Swine',   breed:'Duroc',         quantity:8,   gender:'Mixed', age:'3-8 months', purpose:'Meat',       color_markings:'Red',        owner_name:'Carlos Mendoza',    contact_number:'0925-901-2345', barangay:'Loma',              farm_address:'Zone 3, Loma',            health_status:'Sick',       last_checkup_date:'2025-02-01', farm_type:'Backyard', tag_number:'SWN-0008', registration_date:'2024-09-12' },
      { id:'LS-010', owner_id:null,        animal_type:'Goats',   breed:'Native',        quantity:18,  gender:'Mixed', age:'1-4 years',  purpose:'Meat',       color_markings:'Black/Brown',owner_name:'Gloria Navarro',    contact_number:'0926-012-3456', barangay:'Lumbang Calzada',   farm_address:'Purok 6, Lmbg Calzada',   health_status:'Healthy',    last_checkup_date:'2025-01-30', farm_type:'Backyard',     tag_number:'GT-0018',  registration_date:'2024-06-14' },
      { id:'LS-011', owner_id:null,        animal_type:'Cattle',  breed:'Brahman Cross', quantity:6,   gender:'Mixed', age:'3-5 years',  purpose:'Beef',       color_markings:'Spotted',    owner_name:'Hector Santos',     contact_number:'0927-123-4567', barangay:'Matipok',           farm_address:'Farm Rd, Matipok',        health_status:'Healthy',    last_checkup_date:'2025-01-12', farm_type:'Backyard',     tag_number:'CTL-0006', registration_date:'2024-04-05' },
      { id:'LS-012', owner_id:null,        animal_type:'Poultry', breed:'Leghorn',       quantity:500, gender:'Mixed', age:'1-18 months',purpose:'Egg',        color_markings:'White',      owner_name:'Imelda Torres',     contact_number:'0928-234-5678', barangay:'Munting Coral',     farm_address:'Phase 2, Munting Coral',  health_status:'Healthy',    last_checkup_date:'2025-02-10', farm_type:'Commercial Farm',     tag_number:null,       registration_date:'2024-05-30' },
      { id:'LS-013', owner_id:null,        animal_type:'Carabao', breed:'Murrah',        quantity:2,   gender:'Female','age':'5-7 years', purpose:'Dairy/Draft',color_markings:'Black',      owner_name:'Jaime Aquino',      contact_number:'0929-345-6789', barangay:'Niyugan',           farm_address:'Sitio 2, Niyugan',        health_status:'Healthy',    last_checkup_date:'2025-01-22', farm_type:'Backyard',     tag_number:'CAR-0002', registration_date:'2024-08-18' },
      { id:'LS-014', owner_id:null,        animal_type:'Swine',   breed:'Large White',   quantity:30,  gender:'Mixed', age:'2-10 months',purpose:'Meat',       color_markings:'Pink',       owner_name:'Karen Bautista',    contact_number:'0930-456-7890', barangay:'Pantay',            farm_address:'Zone 1, Pantay',          health_status:'Healthy',    last_checkup_date:'2025-02-03', farm_type:'Semi-Commercial',     tag_number:'SWN-0030', registration_date:'2024-07-22' },
      { id:'LS-015', owner_id:null,        animal_type:'Goats',   breed:'Boer',          quantity:7,   gender:'Mixed', age:'1-2 years',  purpose:'Meat',       color_markings:'White/Brown',owner_name:'Lorenzo Garcia',    contact_number:'0931-567-8901', barangay:'Quisumbing',        farm_address:'Sitio 4, Quisumbing',     health_status:'Healthy',    last_checkup_date:'2025-01-18', farm_type:'Backyard',     tag_number:'GT-0007',  registration_date:'2024-09-05' },
      { id:'LS-016', owner_id:null,        animal_type:'Poultry', breed:'Native',        quantity:150, gender:'Mixed', age:'Mixed',       purpose:'Egg/Meat',   color_markings:'Mixed',      owner_name:'Marilou Dela Rosa', contact_number:'0932-678-9012', barangay:'San Rafael',        farm_address:'Purok 8, San Rafael',     health_status:'Healthy',    last_checkup_date:'2025-01-08', farm_type:'Commercial Farm', tag_number:null,       registration_date:'2024-06-20' },
      { id:'LS-017', owner_id:null,        animal_type:'Cattle',  breed:'Sahiwal',       quantity:4,   gender:'Female','age':'3-6 years', purpose:'Dairy',      color_markings:'Red/Brown',  owner_name:'Napoleon Reyes',    contact_number:'0933-789-0123', barangay:'Sinisian',          farm_address:'Zone 2, Sinisian',        health_status:'Healthy',    last_checkup_date:'2025-02-06', farm_type:'Backyard',     tag_number:'CTL-0004', registration_date:'2024-04-28' },
      { id:'LS-018', owner_id:null,        animal_type:'Swine',   breed:'Berkshire',     quantity:12,  gender:'Mixed', age:'4-9 months', purpose:'Meat',       color_markings:'Black/White',owner_name:'Olivia Cruz',       contact_number:'0934-890-1234', barangay:'Talisay',           farm_address:'Purok 9, Talisay',        health_status:'Healthy',    last_checkup_date:'2025-01-14', farm_type:'Backyard',     tag_number:'SWN-0012', registration_date:'2024-08-02' },
      { id:'LS-019', owner_id:null,        animal_type:'Goats',   breed:'Native Cross',  quantity:14,  gender:'Mixed', age:'1-3 years',  purpose:'Meat/Dairy', color_markings:'Brown',      owner_name:'Pablo Santos',      contact_number:'0935-901-2345', barangay:'Tamayo',            farm_address:'Sitio 5, Tamayo',         health_status:'Healthy',    last_checkup_date:'2025-01-26', farm_type:'Backyard',     tag_number:'GT-0014',  registration_date:'2024-07-10' },
      { id:'LS-020', owner_id:null,        animal_type:'Poultry', breed:'Broiler',       quantity:800, gender:'Mixed', age:'1-3 months', purpose:'Meat',       color_markings:'White',      owner_name:'Queenie Ramos',     contact_number:'0936-012-3456', barangay:'Timbain',           farm_address:'Zone 4, Timbain',         health_status:'Healthy',    last_checkup_date:'2025-02-12', farm_type:'Commercial Farm',     tag_number:null,       registration_date:'2024-09-18' },
    ];

    for (const l of livestock) {
      await client.query(
        `INSERT INTO livestock (id, owner_id, animal_type, breed, quantity, gender, age, color_markings, purpose, owner_name, contact_number, barangay, farm_address, health_status, last_checkup_date, farm_type, tag_number, registration_date, quarantine_date, quarantine_reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
         ON CONFLICT (id) DO NOTHING`,
        [l.id, l.owner_id, l.animal_type, l.breed, l.quantity, l.gender, l.age,
         l.color_markings, l.purpose, l.owner_name, l.contact_number, l.barangay,
         l.farm_address, l.health_status, l.last_checkup_date, l.farm_type,
         l.tag_number || null, l.registration_date,
         (l as any).quarantine_date || null, (l as any).quarantine_reason || null]
      );
    }
    console.log(`  ✓ Livestock seeded (${livestock.length})`);

    // ── Health Records ─────────────────────────────────────────────────────
    const healthRecs = [
      { livestock_id:'LS-001', record_type:'Vaccination', date:'2025-02-01', diagnosis:null, treatment:'FMD + HS Vaccine', medicine_used:'Bi-Valent FMD Vaccine', veterinarian:'Dr. Amalia Vergara', next_due_date:'2026-02-01', notes:'Annual booster. Animal in good condition.', created_by:'Dr. Amalia Vergara' },
      { livestock_id:'LS-002', record_type:'Vaccination', date:'2025-01-25', diagnosis:null, treatment:'Hog Cholera Vaccine', medicine_used:'Lapinized Hog Cholera Vaccine', veterinarian:'Dr. Amalia Vergara', next_due_date:'2025-07-25', notes:'Semi-annual booster administered.', created_by:'Dr. Amalia Vergara' },
      { livestock_id:'LS-005', record_type:'Checkup',     date:'2025-01-28', diagnosis:'ASF Suspect - Symptoms: high fever, skin discoloration', treatment:'Isolation, Supportive therapy', medicine_used:'Electrolytes, Vitamins', veterinarian:'Dr. Amalia Vergara', next_due_date:'2025-02-04', notes:'Samples sent to RVL for confirmation. Farm quarantined.', created_by:'Dr. Amalia Vergara' },
      { livestock_id:'LS-009', record_type:'Treatment',   date:'2025-02-01', diagnosis:'Respiratory infection - suspected PED', treatment:'Antibiotic therapy', medicine_used:'Amoxicillin 500mg + Vitamin B Complex', veterinarian:'Dr. Amalia Vergara', next_due_date:'2025-02-08', notes:'3 animals showing symptoms. Treatment started.', created_by:'Dr. Amalia Vergara' },
      { livestock_id:'LS-003', record_type:'Vaccination', date:'2025-01-10', diagnosis:null, treatment:'HS + BQ Vaccine', medicine_used:'HS-BQ Bivalent Vaccine', veterinarian:'Dr. Amalia Vergara', next_due_date:'2026-01-10', notes:'Annual vaccination completed.', created_by:'BAHW Miguel Sanchez' },
    ];
    for (const h of healthRecs) {
      await client.query(
        `INSERT INTO health_records (livestock_id, record_type, date, diagnosis, treatment, medicine_used, veterinarian, next_due_date, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
        [h.livestock_id, h.record_type, h.date, h.diagnosis, h.treatment, h.medicine_used, h.veterinarian, h.next_due_date, h.notes, h.created_by]
      );
    }
    console.log(`  ✓ Health records seeded (${healthRecs.length})`);

    // ── Livestock Disease Events ────────────────────────────────────────────
    const diseaseEvents = [
      { id:'DE-001', animal_type:'Swine',   disease:'African Swine Fever (ASF)', barangay:'Bisaya',     cases:22, deaths:0, status:'Active',   date_reported:'2025-01-28', notes:'Quarantine enforced. Pending RVL confirmation.', created_by:'Dr. Amalia Vergara' },
      { id:'DE-002', animal_type:'Poultry', disease:'Newcastle Disease',          barangay:'Bambang',    cases:80, deaths:15,status:'Active',   date_reported:'2025-01-15', notes:'Mass vaccination of nearby farms ordered.', created_by:'Dr. Amalia Vergara' },
      { id:'DE-003', animal_type:'Cattle',  disease:'Foot and Mouth Disease',    barangay:'Dacanlao',   cases:4,  deaths:0, status:'Resolved', date_reported:'2024-11-10', notes:'All cases treated. Farm cleared Dec 2024.', created_by:'Dr. Amalia Vergara' },
    ];
    for (const de of diseaseEvents) {
      await client.query(
        `INSERT INTO livestock_disease_events (id, animal_type, disease, barangay, cases, deaths, status, date_reported, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
        [de.id, de.animal_type, de.disease, de.barangay, de.cases, de.deaths, de.status, de.date_reported, de.notes, de.created_by]
      );
    }
    console.log(`  ✓ Disease events seeded (${diseaseEvents.length})`);

    // ── Livestock Mortality ─────────────────────────────────────────────────
    const mortality = [
      { livestock_id:'LS-009', animal_type:'Swine', breed:'Duroc', owner_name:'Carlos Mendoza', barangay:'Loma', quantity:2, cause:'Respiratory infection (suspected PED)', date_reported:'2025-02-02', investigation_status:'Ongoing', notes:'Two pigs found dead. Samples collected for lab.', created_by:'Dr. Amalia Vergara' },
    ];
    for (const m of mortality) {
      await client.query(
        `INSERT INTO livestock_mortality (livestock_id, animal_type, breed, owner_name, barangay, quantity, cause, date_reported, investigation_status, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO NOTHING`,
        [m.livestock_id, m.animal_type, m.breed, m.owner_name, m.barangay, m.quantity, m.cause, m.date_reported, m.investigation_status, m.notes, m.created_by]
      );
    }
    console.log(`  ✓ Mortality records seeded (${mortality.length})`);

    // ── Lost & Found ───────────────────────────────────────────────────────
    const lostFound = [
      { id: 'LF-001', pet_id: 'BLU-000-00006', pet_name: 'Lucky', species: 'Dog', breed: 'Shih Tzu', color: 'Gray', type: 'Lost', reported_by: 'Carlos Lopez', reported_by_role: 'owner', contact_number: '0921-567-8901', last_seen_location: 'Near Public Market', barangay: 'Poblacion 4', date_reported: '2025-02-10', description: 'Small gray Shih Tzu, wearing red collar with name tag. Very friendly.', status: 'Open' },
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
      { id: 'SCH-001', barangay: 'Poblacion 1',      date: '2025-05-15', time_start: '08:00 AM', time_end: '12:00 PM', venue: 'Barangay Hall',             capacity: 50, registered: 12, status: 'Scheduled', created_by: 'BAHW Miguel Sanchez' },
      { id: 'SCH-002', barangay: 'Poblacion 3',      date: '2025-05-20', time_start: '09:00 AM', time_end: '01:00 PM', venue: 'Community Center',           capacity: 40, registered:  8, status: 'Scheduled', created_by: 'BAHW Miguel Sanchez' },
      { id: 'SCH-003', barangay: 'Balimbing',        date: '2025-05-22', time_start: '08:00 AM', time_end: '11:00 AM', venue: 'Sitio Covered Court',        capacity: 30, registered:  5, status: 'Scheduled', created_by: 'BAHW Miguel Sanchez' },
      { id: 'SCH-004', barangay: 'Bambang',          date: '2025-05-25', time_start: '01:00 PM', time_end: '05:00 PM', venue: 'Multi-Purpose Hall',         capacity: 35, registered:  7, status: 'Scheduled', created_by: 'BAHW Miguel Sanchez' },
      { id: 'SCH-005', barangay: 'Poblacion 5',      date: '2025-06-05', time_start: '08:00 AM', time_end: '12:00 PM', venue: 'Health Center Compound',    capacity: 60, registered: 22, status: 'Scheduled', created_by: 'Dr. Amalia Vergara' },
      { id: 'SCH-006', barangay: 'Quisumbing',       date: '2025-04-10', time_start: '08:00 AM', time_end: '11:00 AM', venue: 'Barangay Plaza',             capacity: 25, registered: 25, status: 'Completed', created_by: 'BAHW Miguel Sanchez' },
      { id: 'SCH-007', barangay: 'Salong',           date: '2025-04-12', time_start: '09:00 AM', time_end: '12:00 PM', venue: 'Elementary School Grounds', capacity: 30, registered: 28, status: 'Completed', created_by: 'Dr. Amalia Vergara' },
      { id: 'SCH-008', barangay: 'Dacanlao',         date: '2025-05-28', time_start: '08:00 AM', time_end: '12:00 PM', venue: 'Barangay Hall',             capacity: 30, registered:  4, status: 'Scheduled', created_by: 'Dr. Amalia Vergara' },
      { id: 'SCH-009', barangay: 'Bisaya',           date: '2025-05-29', time_start: '09:00 AM', time_end: '01:00 PM', venue: 'Covered Court',             capacity: 25, registered:  6, status: 'Scheduled', created_by: 'BAHW Miguel Sanchez' },
      { id: 'SCH-010', barangay: 'Cahil',            date: '2025-06-02', time_start: '08:00 AM', time_end: '11:00 AM', venue: 'Multi-Purpose Hall',        capacity: 20, registered:  3, status: 'Scheduled', created_by: 'Dr. Amalia Vergara' },
      { id: 'SCH-011', barangay: 'Talisay',          date: '2025-06-07', time_start: '08:00 AM', time_end: '12:00 PM', venue: 'Barangay Plaza',            capacity: 40, registered: 11, status: 'Scheduled', created_by: 'Dr. Amalia Vergara' },
      { id: 'SCH-012', barangay: 'San Rafael',       date: '2025-06-10', time_start: '09:00 AM', time_end: '01:00 PM', venue: 'Barangay Hall',             capacity: 30, registered:  8, status: 'Scheduled', created_by: 'BAHW Miguel Sanchez' },
      { id: 'SCH-013', barangay: 'Sinisian',         date: '2025-06-12', time_start: '08:00 AM', time_end: '11:00 AM', venue: 'Purok 2 Covered Court',    capacity: 25, registered:  2, status: 'Scheduled', created_by: 'Dr. Amalia Vergara' },
      { id: 'SCH-014', barangay: 'Poblacion 2',      date: '2025-04-05', time_start: '08:00 AM', time_end: '12:00 PM', venue: 'Covered Basketball Court', capacity: 45, registered: 45, status: 'Completed', created_by: 'Dr. Amalia Vergara' },
      { id: 'SCH-015', barangay: 'Puting Bato East',date: '2025-04-18', time_start: '08:00 AM', time_end: '11:00 AM', venue: 'Barangay Hall',             capacity: 20, registered: 17, status: 'Completed', created_by: 'BAHW Miguel Sanchez' },
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

    // ── Appointment Schedules (individual + admin events) ─────────────────
    const today = new Date();
    const addDays = (n: number) => {
      const d = new Date(today); d.setDate(d.getDate() + n);
      return d.toISOString().split('T')[0];
    };

    const appointmentSchedules = [
      // Admin-created community vaccination drives (upcoming)
      { id: 'APPT-001', schedule_type: 'Vaccination', title: 'Rabies Vaccination Drive — Poblacion 1',       date: addDays(3),  time_slot: '08:00', status: 'Confirmed', is_admin_created: true, barangay: 'Poblacion 1',   venue: 'Barangay Hall', capacity: 30, requested_by_name: 'Admin' },
      { id: 'APPT-002', schedule_type: 'Vaccination', title: 'Anti-Rabies Drive — Bambang',                  date: addDays(5),  time_slot: '09:00', status: 'Confirmed', is_admin_created: true, barangay: 'Bambang',       venue: 'Covered Court', capacity: 25, requested_by_name: 'Admin' },
      { id: 'APPT-003', schedule_type: 'Vaccination', title: 'Vaccination Drive — Balimbing',                date: addDays(7),  time_slot: '08:00', status: 'Confirmed', is_admin_created: true, barangay: 'Balimbing',     venue: 'Sitio Covered Court', capacity: 20, requested_by_name: 'Dr. Amalia Vergara' },
      { id: 'APPT-004', schedule_type: 'Intervention', title: 'North Zone Intervention Response',            date: addDays(4),  time_slot: '07:00', status: 'Confirmed', is_admin_created: true, barangay: 'Niyugan',       venue: 'Barangay Plaza', capacity: null, requested_by_name: 'Admin' },
      { id: 'APPT-005', schedule_type: 'Outbreak',    title: 'Rabies Outbreak Response — Dacanlao',          date: addDays(1),  time_slot: '08:00', status: 'Confirmed', is_admin_created: true, barangay: 'Dacanlao',      venue: 'Barangay Hall', capacity: null, notes: 'Rapid response team deployed', requested_by_name: 'Admin' },
      // Pet owner appointment requests
      { id: 'APPT-006', schedule_type: 'Vaccination', title: 'Anti-Rabies Vaccine — Brownie',                date: addDays(2),  time_slot: '10:00', status: 'Pending',   is_admin_created: false, pet_name: 'Brownie', requested_by_name: 'Maria Santos' },
      { id: 'APPT-007', schedule_type: 'Checkup',     title: 'Regular Checkup — Buddy',                      date: addDays(3),  time_slot: '08:00', status: 'Confirmed', is_admin_created: false, pet_name: 'Buddy',   requested_by_name: 'Juan dela Cruz' },
      { id: 'APPT-008', schedule_type: 'Spay/Neuter', title: 'Spay Operation — Kitty',                       date: addDays(6),  time_slot: '09:15', status: 'Pending',   is_admin_created: false, pet_name: 'Kitty',   requested_by_name: 'Maria Santos' },
      { id: 'APPT-009', schedule_type: 'Vaccination', title: 'Anti-Rabies Vaccine — Puffy',                  date: addDays(2),  time_slot: '09:15', status: 'Pending',   is_admin_created: false, pet_name: 'Puffy',   requested_by_name: 'Ana Reyes' },
      { id: 'APPT-010', schedule_type: 'Checkup',     title: 'Wellness Check — Max',                         date: addDays(5),  time_slot: '14:00', status: 'Pending',   is_admin_created: false, pet_name: 'Max',     requested_by_name: 'Pedro Garcia' },
      { id: 'APPT-011', schedule_type: 'Vaccination', title: 'Annual Vaccine — Choco',                       date: addDays(8),  time_slot: '11:00', status: 'Pending',   is_admin_created: false, pet_name: 'Choco',   requested_by_name: 'Rosa Dela Cruz' },
      // Completed
      { id: 'APPT-012', schedule_type: 'Vaccination', title: 'Rabies Vaccine — Lucky',                       date: addDays(-5), time_slot: '09:00', status: 'Completed', is_admin_created: false, pet_name: 'Lucky',   requested_by_name: 'Carlos Mendoza' },
      { id: 'APPT-013', schedule_type: 'Checkup',     title: 'Annual Checkup — Snowy',                       date: addDays(-3), time_slot: '08:00', status: 'Completed', is_admin_created: false, pet_name: 'Snowy',   requested_by_name: 'Elena Santos' },
      // Admin vaccination drive — today
      { id: 'APPT-014', schedule_type: 'Vaccination', title: 'Today Vaccination Drive — Poblacion 3',        date: addDays(0),  time_slot: '08:00', status: 'Confirmed', is_admin_created: true, barangay: 'Poblacion 3', venue: 'Community Center', capacity: 40, requested_by_name: 'BAHW Miguel Sanchez' },
    ];

    for (const s of appointmentSchedules) {
      await client.query(
        `INSERT INTO appointment_schedules
          (id, schedule_type, title, date, time_slot, status, requested_by, requested_by_name,
           notes, pet_name, pet_id, barangay, venue, capacity, is_admin_created, linked_record_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (id) DO NOTHING`,
        [
          s.id, s.schedule_type, s.title, s.date, s.time_slot, s.status,
          (s as any).requested_by || null, (s as any).requested_by_name || null,
          (s as any).notes || null, (s as any).pet_name || null, (s as any).pet_id || null,
          (s as any).barangay || null, (s as any).venue || null,
          (s as any).capacity || null, s.is_admin_created, null, (s as any).requested_by_name || null
        ]
      );
    }
    console.log(`  ✓ Appointment schedules seeded (${appointmentSchedules.length})`);


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

    // ── Budget Programs & Line Items (must exist before inventory so program_id/line_item_id resolve) ──
    await client.query(`
      INSERT INTO budget_programs (id,name,description,total_allotment,fiscal_year,color,created_by) VALUES
        ('PROG-2025-001','Rabies Control Program','Anti-rabies vaccination, PEP biologics, and community awareness campaigns.',1200000,2025,'#2B5EA6','system'),
        ('PROG-2025-002','Avian Influenza Preparedness','Bird flu surveillance, rapid response kits, containment, and response teams.',800000,2025,'#e8a838','system'),
        ('PROG-2025-003','Livestock Health Program','Vaccines, treatments, and health monitoring for all livestock species.',950000,2025,'#60A85C','system'),
        ('PROG-2025-004','Animal Welfare & Impounding','Impounding operations, spaying/neutering, and animal shelter maintenance.',600000,2025,'#7c3aed','system'),
        ('PROG-2025-005','Administrative & Operations','Office supplies, fuel, IT infrastructure, personnel training, and communications.',500000,2025,'#0891b2','system')
      ON CONFLICT (id) DO NOTHING
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
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('  ✓ Budget programs & line items ensured (upsert)');

        // ── Medicine Inventory ────────────────────────────────────────────────
    const medicines = [
      // purpose/program_id/line_item_id/fiscal_year added so filtering by Budget program works out-of-the-box
      { id: 'MED-001', barcode: '8901234567890', name: 'Rabies Vaccine (Rabisin)', generic_name: 'Inactivated Rabies Virus', category: 'Vaccine', type: 'Viral Vaccine', lot_number: 'LT2025-R01', expiry_date: '2026-06-30', manufacture_date: '2024-06-01', manufacturer: 'Merial Philippines', quantity: 250, unit: 'vials', reorder_level: 50, unit_cost: 185.00, storage_condition: 'Refrigerate 2-8°C', description: 'Anti-rabies vaccine for dogs and cats', purpose: 'program', program_id: 'PROG-2025-001', line_item_id: 'LI-2025-001', fiscal_year: 2025 },
      { id: 'MED-002', barcode: '8901234567891', name: 'Amoxicillin 500mg', generic_name: 'Amoxicillin Trihydrate', category: 'Antibiotic', type: 'Broad Spectrum', lot_number: 'LT2025-A02', expiry_date: '2026-12-31', manufacture_date: '2024-01-15', manufacturer: 'Intervet Philippines', quantity: 800, unit: 'tablets', reorder_level: 100, unit_cost: 12.50, storage_condition: 'Store below 25°C', description: 'Broad-spectrum antibiotic for bacterial infections', purpose: 'program', program_id: 'PROG-2025-003', line_item_id: 'LI-2025-013', fiscal_year: 2025 },
      { id: 'MED-003', barcode: '8901234567892', name: 'Ivermectin 1%', generic_name: 'Ivermectin', category: 'Antiparasitic', type: 'Endectocide', lot_number: 'LT2025-I03', expiry_date: '2027-01-31', manufacture_date: '2025-01-10', manufacturer: 'Elanco Philippines', quantity: 120, unit: 'vials', reorder_level: 20, unit_cost: 320.00, storage_condition: 'Store below 30°C, away from light', description: 'Broad-spectrum antiparasitic for livestock', purpose: 'program', program_id: 'PROG-2025-003', line_item_id: 'LI-2025-013', fiscal_year: 2025 },
      { id: 'MED-004', barcode: '8901234567893', name: 'Vitamin B Complex', generic_name: 'Thiamine/Riboflavin/Niacin/B6/B12', category: 'Vitamin', type: 'Multivitamin', lot_number: 'LT2025-V04', expiry_date: '2026-09-30', manufacture_date: '2024-09-01', manufacturer: 'Pfizer Animal Health', quantity: 350, unit: 'ampoules', reorder_level: 50, unit_cost: 45.00, storage_condition: 'Store below 25°C', description: 'Essential B vitamins for animal health and recovery', purpose: 'program', program_id: 'PROG-2025-003', line_item_id: 'LI-2025-013', fiscal_year: 2025 },
      { id: 'MED-005', barcode: '8901234567894', name: 'Newcastle Disease Vaccine', generic_name: 'Live ND Virus (La Sota strain)', category: 'Vaccine', type: 'Viral Vaccine', lot_number: 'LT2025-N05', expiry_date: '2025-12-31', manufacture_date: '2024-12-01', manufacturer: 'BIAH Philippines', quantity: 45, unit: 'vials', reorder_level: 30, unit_cost: 220.00, storage_condition: 'Refrigerate 2-8°C, protect from light', description: 'Vaccine for Newcastle Disease in poultry', purpose: 'program', program_id: 'PROG-2025-003', line_item_id: 'LI-2025-012', fiscal_year: 2025 },
      { id: 'MED-006', barcode: '8901234567895', name: 'Oxytetracycline 20%', generic_name: 'Oxytetracycline HCl', category: 'Antibiotic', type: 'Tetracycline', lot_number: 'LT2025-O06', expiry_date: '2026-08-31', manufacture_date: '2024-08-15', manufacturer: 'Zoetis Philippines', quantity: 60, unit: 'vials', reorder_level: 15, unit_cost: 480.00, storage_condition: 'Refrigerate 2-8°C', description: 'Injectable antibiotic for livestock infections', purpose: 'program', program_id: 'PROG-2025-003', line_item_id: 'LI-2025-013', fiscal_year: 2025 },
      { id: 'MED-007', barcode: '8901234567896', name: 'Vitamin E + Selenium', generic_name: 'Alpha-tocopherol + Sodium Selenite', category: 'Vitamin', type: 'Antioxidant Supplement', lot_number: 'LT2025-SE07', expiry_date: '2026-11-30', manufacture_date: '2024-11-01', manufacturer: 'Intervet Philippines', quantity: 90, unit: 'vials', reorder_level: 20, unit_cost: 280.00, storage_condition: 'Store below 30°C', description: 'Vitamin E and selenium supplement for cattle and swine', purpose: 'program', program_id: 'PROG-2025-003', line_item_id: 'LI-2025-013', fiscal_year: 2025 },
      { id: 'MED-008', barcode: '8901234567897', name: 'Anti-Rabies Serum (Equine)', generic_name: 'Equine Rabies Immunoglobulin', category: 'Vaccine', type: 'Immunoglobulin', lot_number: 'LT2025-ARS08', expiry_date: '2026-03-31', manufacture_date: '2024-03-15', manufacturer: 'Instituto Pasteur', quantity: 30, unit: 'ampoules', reorder_level: 10, unit_cost: 1200.00, storage_condition: 'Refrigerate 2-8°C strictly', description: 'Post-exposure prophylaxis for rabies', purpose: 'program', program_id: 'PROG-2025-001', line_item_id: 'LI-2025-002', fiscal_year: 2025 },
    ];
    for (const m of medicines) {
      await client.query(
        `INSERT INTO medicine_inventory (id, barcode, name, generic_name, category, type, lot_number, expiry_date, manufacture_date, manufacturer, quantity, unit, reorder_level, unit_cost, storage_condition, description, purpose, program_id, line_item_id, fiscal_year, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'Dr. Amalia Vergara')
         ON CONFLICT (id) DO NOTHING`,
        [m.id, m.barcode, m.name, m.generic_name, m.category, m.type, m.lot_number, m.expiry_date, m.manufacture_date, m.manufacturer, m.quantity, m.unit, m.reorder_level, m.unit_cost, m.storage_condition, m.description, m.purpose ?? 'program', m.program_id ?? null, m.line_item_id ?? null, m.fiscal_year ?? null]
      );
    }
    console.log(`  ✓ Medicine inventory seeded (${medicines.length})`);

    // ── Supplies Inventory ────────────────────────────────────────────────
    const supplies = [
      { id: 'SUP-001', barcode: '7890123456789', name: 'Disposable Syringes 5ml', category: 'Medical Supplies', type: 'Injection Equipment', quantity: 2000, unit: 'pieces', reorder_level: 300, unit_cost: 8.50, supplier: 'MedSource PH', last_restocked: '2025-03-01', description: 'Single-use syringes for vaccine administration', purpose: 'program', program_id: 'PROG-2025-001', line_item_id: 'LI-2025-003', fiscal_year: 2025 },
      { id: 'SUP-002', barcode: '7890123456790', name: 'Examination Gloves (Large)', category: 'PPE', type: 'Protective Equipment', quantity: 500, unit: 'pairs', reorder_level: 100, unit_cost: 15.00, supplier: 'SafePro Philippines', last_restocked: '2025-02-15', description: 'Latex examination gloves for veterinary procedures', purpose: 'program', program_id: 'PROG-2025-002', line_item_id: 'LI-2025-008', fiscal_year: 2025 },
      { id: 'SUP-003', barcode: '7890123456791', name: 'Specimen Collection Tubes', category: 'Diagnostic', type: 'Laboratory Supplies', quantity: 300, unit: 'pieces', reorder_level: 50, unit_cost: 25.00, supplier: 'LabMed PH', last_restocked: '2025-01-20', description: 'EDTA tubes for blood sample collection', purpose: 'program', program_id: 'PROG-2025-002', line_item_id: 'LI-2025-006', fiscal_year: 2025 },
      { id: 'SUP-004', barcode: '7890123456792', name: 'Thermometer (Digital Rectal)', category: 'Diagnostic', type: 'Instruments', quantity: 15, unit: 'pieces', reorder_level: 3, unit_cost: 650.00, supplier: 'VetEquip Philippines', last_restocked: '2025-01-10', description: 'Digital rectal thermometer for livestock', purpose: 'program', program_id: 'PROG-2025-003', line_item_id: 'LI-2025-014', fiscal_year: 2025 },
      { id: 'SUP-005', barcode: '7890123456793', name: 'Vaccine Carrier / Cold Box', category: 'Cold Chain', type: 'Storage Equipment', quantity: 8, unit: 'pieces', reorder_level: 2, unit_cost: 1800.00, supplier: 'ColdChain PH', last_restocked: '2024-12-01', description: 'Insulated carrier for vaccine field transport', purpose: 'program', program_id: 'PROG-2025-001', line_item_id: 'LI-2025-005', fiscal_year: 2025 },
      { id: 'SUP-006', barcode: '7890123456794', name: 'Gauze Bandage 4 inch', category: 'Wound Care', type: 'First Aid', quantity: 400, unit: 'rolls', reorder_level: 60, unit_cost: 18.00, supplier: 'MedSource PH', last_restocked: '2025-02-28', description: 'Sterile gauze bandage rolls for wound dressing', purpose: 'program', program_id: 'PROG-2025-004', line_item_id: 'LI-2025-016', fiscal_year: 2025 },
      { id: 'SUP-007', barcode: '7890123456795', name: 'Disposable Needles 18G', category: 'Medical Supplies', type: 'Injection Equipment', quantity: 1500, unit: 'pieces', reorder_level: 200, unit_cost: 4.50, supplier: 'MedSource PH', last_restocked: '2025-03-05', description: '18-gauge needles for livestock injections', purpose: 'program', program_id: 'PROG-2025-001', line_item_id: 'LI-2025-003', fiscal_year: 2025 },
      { id: 'SUP-008', barcode: '7890123456796', name: 'Stethoscope (Veterinary)', category: 'Diagnostic', type: 'Instruments', quantity: 6, unit: 'pieces', reorder_level: 2, unit_cost: 2200.00, supplier: 'VetEquip Philippines', last_restocked: '2024-11-15', description: 'Dual-head veterinary stethoscope', purpose: 'program', program_id: 'PROG-2025-003', line_item_id: 'LI-2025-014', fiscal_year: 2025 },
    ];
    for (const s of supplies) {
      await client.query(
        `INSERT INTO supplies_inventory (id, barcode, name, category, type, quantity, unit, reorder_level, unit_cost, supplier, last_restocked, description, purpose, program_id, line_item_id, fiscal_year, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'Dr. Amalia Vergara')
         ON CONFLICT (id) DO NOTHING`,
        [s.id, s.barcode, s.name, s.category, s.type, s.quantity, s.unit, s.reorder_level, s.unit_cost, s.supplier, s.last_restocked, s.description, s.purpose ?? 'office', s.program_id ?? null, s.line_item_id ?? null, s.fiscal_year ?? null]
      );
    }
    console.log(`  ✓ Supplies inventory seeded (${supplies.length})`);

    // ── Suppliers ────────────────────────────────────────────────────────────
    const suppliers = [
      { id: 'SUPL-001', name: 'MedSource Philippines, Inc.', contact_person: 'Ramon dela Cruz', phone: '0917-555-1001', email: 'orders@medsource.com.ph', address: 'Unit 4B, Bridgeway Business Park, Caloocan City', category: 'Medical Supplies', notes: 'Primary supplier for syringes, needles, wound care. Delivers weekly Wednesdays.' },
      { id: 'SUPL-002', name: 'Zoetis Philippines Inc.', contact_person: 'Maria Santos', phone: '0918-555-2002', email: 'ph.orders@zoetis.com', address: '16F Philplans Corporate Center, 1148 EDSA, Mandaluyong City', category: 'Medicine Supplier', notes: 'Official distributor of Zoetis vet pharmaceuticals. Lead time: 5–7 business days.' },
      { id: 'SUPL-003', name: 'BIAH Philippines (BAI Accredited)', contact_person: 'Dr. Elena Ramos', phone: '(02) 8527-1001', email: 'biahphilippines@gmail.com', address: 'BAI Compound, Visayas Avenue, Diliman, Quezon City', category: 'Medicine Supplier', notes: 'Government-accredited biological products: Newcastle Disease, Hog Cholera vaccines.' },
      { id: 'SUPL-004', name: 'VetEquip Philippines Corp.', contact_person: 'Jose Enriquez', phone: '0919-555-4004', email: 'sales@vetequip.ph', address: '88 Timog Avenue, Quezon City', category: 'Equipment', notes: 'Veterinary instruments and diagnostic equipment. Offers calibration services.' },
      { id: 'SUPL-005', name: 'SafePro Safety Solutions PH', contact_person: 'Ana Reyes', phone: '0920-555-5005', email: 'orders@safepro.com.ph', address: '234 Shaw Boulevard, Mandaluyong City', category: 'Medical Supplies', notes: 'PPE and safety consumables. Bulk discount for orders over ₱10,000.' },
      { id: 'SUPL-006', name: 'ColdChain Logistics PH', contact_person: 'Benjamin Tan', phone: '0921-555-6006', email: 'coldchain@logistics.ph', address: 'PEZA Zone, Calamba, Laguna', category: 'Equipment', notes: 'Cold chain equipment. Also provides dry ice and refrigerant packs on request.' },
      { id: 'SUPL-007', name: 'LabMed Diagnostics Corp.', contact_person: 'Christine Uy', phone: '0922-555-7007', email: 'orders@labmed.com.ph', address: 'Laguna Technopark, Biñan, Laguna', category: 'Medical Supplies', notes: 'Laboratory consumables and diagnostic reagents. ISO-certified.' },
      { id: 'SUPL-008', name: 'Intervet/MSD Animal Health PH', contact_person: 'Richard Lim', phone: '0923-555-8008', email: 'ph.animalhealth@msd.com', address: '8F 8 Rockwell, Rockwell Center, Makati City', category: 'Medicine Supplier', notes: 'MSD Animal Health products including Vitamin E+Se and antiparasitic lines.' },
      { id: 'SUPL-009', name: 'National Book Store (Calaca Branch)', contact_person: 'Lorna Bustamante', phone: '0924-555-9009', email: 'calaca@nationalbookstore.com.ph', address: 'National Highway, Calaca, Batangas 4212', category: 'Office Supplies', notes: 'Office and school supplies. Walk-in purchases accepted. Accepts PhilGEPS.' },
      { id: 'SUPL-010', name: 'Batangas Provincial Government Supply Office', contact_person: 'Eduardo Manalo', phone: '(043) 980-0100', email: 'supply@batangas.gov.ph', address: 'Capitol Compound, Kumintang Ibaba, Batangas City', category: 'General', notes: 'Procures office equipment and computer supplies through BAC. Requires PR/PO documentation.' },
    ];
    for (const s of suppliers) {
      await client.query(
        `INSERT INTO suppliers (id, name, contact_person, phone, email, address, category, notes, is_active, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,'system')
         ON CONFLICT (id) DO NOTHING`,
        [s.id, s.name, s.contact_person, s.phone, s.email, s.address, s.category, s.notes]
      );
    }
    console.log(`  ✓ Suppliers seeded (${suppliers.length})`);

    // ── Link medicine_inventory to suppliers ──────────────────────────────────
    const medLinks: [string, string][] = [
      ['MED-001', 'SUPL-002'], ['MED-002', 'SUPL-002'], ['MED-003', 'SUPL-002'],
      ['MED-004', 'SUPL-002'], ['MED-005', 'SUPL-003'], ['MED-006', 'SUPL-002'],
      ['MED-007', 'SUPL-008'], ['MED-008', 'SUPL-002'],
      ['MED-DEMO-001', 'SUPL-002'], ['MED-DEMO-002', 'SUPL-002'], ['MED-DEMO-003', 'SUPL-002'],
    ];
    for (const [itemId, supplierId] of medLinks) {
      await client.query(`UPDATE medicine_inventory SET supplier_id=$1 WHERE id=$2`, [supplierId, itemId]);
    }

    // ── Link supplies_inventory to suppliers ──────────────────────────────────
    const supLinks: [string, string][] = [
      ['SUP-001', 'SUPL-001'], ['SUP-002', 'SUPL-005'], ['SUP-003', 'SUPL-007'],
      ['SUP-004', 'SUPL-004'], ['SUP-005', 'SUPL-006'], ['SUP-006', 'SUPL-001'],
      ['SUP-007', 'SUPL-001'], ['SUP-008', 'SUPL-004'],
    ];
    for (const [itemId, supplierId] of supLinks) {
      await client.query(`UPDATE supplies_inventory SET supplier_id=$1 WHERE id=$2`, [supplierId, itemId]);
    }
    console.log('  ✓ Supplier FK links applied to medicine and supply inventory');

    // ── Office Supplies ───────────────────────────────────────────────────────
    const officeSupplies = [
      { id: 'OS-001', barcode: 'OS-BAR-001', name: 'A4 Bond Paper (500 sheets/ream)', category: 'Paper & Stationery', quantity: 20, unit: 'reams', reorder_level: 5, unit_cost: 275.00, supplier_id: 'SUPL-009', description: '80gsm A4 bond paper for official documents and reports', purpose: 'office', program_id: 'PROG-2025-005', line_item_id: 'LI-2025-019', fiscal_year: 2025 },
      { id: 'OS-002', barcode: 'OS-BAR-002', name: 'Ballpen Blue (Box of 12)', category: 'Paper & Stationery', quantity: 8, unit: 'boxes', reorder_level: 2, unit_cost: 120.00, supplier_id: 'SUPL-009', description: 'Standard blue ballpoint pens for office use', purpose: 'office', program_id: 'PROG-2025-005', line_item_id: 'LI-2025-019', fiscal_year: 2025 },
      { id: 'OS-003', barcode: 'OS-BAR-003', name: 'Stamp Pad (Violet)', category: 'Paper & Stationery', quantity: 6, unit: 'pieces', reorder_level: 2, unit_cost: 85.00, supplier_id: 'SUPL-009', description: 'Violet ink stamp pad for official stamps and certifications', purpose: 'office', program_id: 'PROG-2025-005', line_item_id: 'LI-2025-019', fiscal_year: 2025 },
      { id: 'OS-004', barcode: 'OS-BAR-004', name: 'Stapler Heavy Duty', category: 'Paper & Stationery', quantity: 4, unit: 'pieces', reorder_level: 1, unit_cost: 450.00, supplier_id: 'SUPL-009', description: 'Heavy duty stapler for thick document binding', purpose: 'office', program_id: 'PROG-2025-005', line_item_id: 'LI-2025-019', fiscal_year: 2025 },
      { id: 'OS-005', barcode: 'OS-BAR-005', name: 'Staple Wire No. 35 (Box)', category: 'Paper & Stationery', quantity: 10, unit: 'boxes', reorder_level: 3, unit_cost: 55.00, supplier_id: 'SUPL-009', description: 'Standard staple wire refill No. 35', purpose: 'office', program_id: 'PROG-2025-005', line_item_id: 'LI-2025-019', fiscal_year: 2025 },
      { id: 'OS-006', barcode: 'OS-BAR-006', name: 'Ink Cartridge Black Canon PG-745', category: 'Printer Supplies', quantity: 5, unit: 'pieces', reorder_level: 2, unit_cost: 650.00, supplier_id: 'SUPL-010', description: 'Black ink cartridge for Canon office printer', purpose: 'office', program_id: 'PROG-2025-005', line_item_id: 'LI-2025-021', fiscal_year: 2025 },
      { id: 'OS-007', barcode: 'OS-BAR-007', name: 'Ink Cartridge Color Canon CL-746', category: 'Printer Supplies', quantity: 3, unit: 'pieces', reorder_level: 1, unit_cost: 780.00, supplier_id: 'SUPL-010', description: 'Tri-color ink cartridge for Canon office printer', purpose: 'office', program_id: 'PROG-2025-005', line_item_id: 'LI-2025-021', fiscal_year: 2025 },
      { id: 'OS-008', barcode: 'OS-BAR-008', name: 'Photocopy Paper Legal (ream)', category: 'Paper & Stationery', quantity: 10, unit: 'reams', reorder_level: 3, unit_cost: 320.00, supplier_id: 'SUPL-009', description: 'Legal size bond paper for forms and records', purpose: 'office', program_id: 'PROG-2025-005', line_item_id: 'LI-2025-019', fiscal_year: 2025 },
      { id: 'OS-009', barcode: 'OS-BAR-009', name: 'Long Folder Pressboard (10 pcs/pack)', category: 'Storage', quantity: 15, unit: 'packs', reorder_level: 3, unit_cost: 180.00, supplier_id: 'SUPL-009', description: 'Long pressboard folders for filing official documents', purpose: 'office', program_id: 'PROG-2025-005', line_item_id: 'LI-2025-019', fiscal_year: 2025 },
      { id: 'OS-010', barcode: 'OS-BAR-010', name: 'Record Book 500 pages', category: 'Paper & Stationery', quantity: 12, unit: 'pieces', reorder_level: 2, unit_cost: 145.00, supplier_id: 'SUPL-009', description: 'Logbook for daily transaction entries', purpose: 'office', program_id: 'PROG-2025-005', line_item_id: 'LI-2025-019', fiscal_year: 2025 },
      { id: 'OS-011', barcode: 'OS-BAR-011', name: 'Rubber Band Box 350g', category: 'Paper & Stationery', quantity: 4, unit: 'boxes', reorder_level: 1, unit_cost: 110.00, supplier_id: 'SUPL-009', description: 'Assorted rubber bands for bundling documents', purpose: 'office', program_id: 'PROG-2025-005', line_item_id: 'LI-2025-019', fiscal_year: 2025 },
      { id: 'OS-012', barcode: 'OS-BAR-012', name: 'Flash Drive 32GB USB 3.0', category: 'Computer Accessories', quantity: 5, unit: 'pieces', reorder_level: 2, unit_cost: 380.00, supplier_id: 'SUPL-010', description: 'USB 3.0 flash drives for data backup and transfers', purpose: 'office', program_id: 'PROG-2025-005', line_item_id: 'LI-2025-021', fiscal_year: 2025 },
      { id: 'OS-013', barcode: 'OS-BAR-013', name: 'Dishwashing Liquid 500ml', category: 'Cleaning', quantity: 8, unit: 'bottles', reorder_level: 3, unit_cost: 68.00, supplier_id: 'SUPL-009', description: 'Dishwashing liquid for pantry and glassware cleaning', purpose: 'office', program_id: 'PROG-2025-005', line_item_id: 'LI-2025-019', fiscal_year: 2025 },
      { id: 'OS-014', barcode: 'OS-BAR-014', name: 'Tissue Paper (12 rolls/pack)', category: 'Cleaning', quantity: 10, unit: 'packs', reorder_level: 3, unit_cost: 195.00, supplier_id: 'SUPL-009', description: 'Multi-purpose tissue paper for restrooms and reception', purpose: 'office', program_id: 'PROG-2025-005', line_item_id: 'LI-2025-019', fiscal_year: 2025 },
      { id: 'OS-015', barcode: 'OS-BAR-015', name: 'Whiteboard Marker Set (4 colors)', category: 'Paper & Stationery', quantity: 6, unit: 'sets', reorder_level: 2, unit_cost: 160.00, supplier_id: 'SUPL-009', description: 'Dry-erase markers for conference room whiteboard', purpose: 'office', program_id: 'PROG-2025-005', line_item_id: 'LI-2025-019', fiscal_year: 2025 },
    ];
    for (const o of officeSupplies) {
      await client.query(
        `INSERT INTO office_supplies (id, barcode, name, category, quantity, unit, reorder_level, unit_cost, supplier_id, description, purpose, program_id, line_item_id, fiscal_year, status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'Active','system')
         ON CONFLICT (id) DO NOTHING`,
        [o.id, o.barcode, o.name, o.category, o.quantity, o.unit, o.reorder_level, o.unit_cost, o.supplier_id, o.description, o.purpose ?? 'office', o.program_id ?? null, o.line_item_id ?? null, o.fiscal_year ?? null]
      );
    }
    console.log(`  ✓ Office supplies seeded (${officeSupplies.length})`);

    // ── Budget Expenditures — one row per seeded inventory item ──────────────
    // Each row records the procurement cost (qty × unit_cost) as a 'utilized' expenditure
    // against its assigned budget line item, so the Budget module reflects real spending.
    const inventoryExpenditures = [
      // Medicines
      { id:'EXP-SEED-001', line_item_id:'LI-2025-001', amount:46250.00, item_id:'MED-001', item_name:'Rabies Vaccine (Rabisin)',        qty:250,  desc:'Initial stock procurement — Rabies Vaccine (Rabisin) × 250 vials' },
      { id:'EXP-SEED-002', line_item_id:'LI-2025-002', amount:36000.00, item_id:'MED-008', item_name:'Anti-Rabies Serum (Equine)',       qty:30,   desc:'Initial stock procurement — Anti-Rabies Serum (Equine) × 30 ampoules' },
      { id:'EXP-SEED-003', line_item_id:'LI-2025-012', amount: 9900.00, item_id:'MED-005', item_name:'Newcastle Disease Vaccine',        qty:45,   desc:'Initial stock procurement — Newcastle Disease Vaccine × 45 vials' },
      { id:'EXP-SEED-004', line_item_id:'LI-2025-013', amount:10000.00, item_id:'MED-002', item_name:'Amoxicillin 500mg',                qty:800,  desc:'Initial stock procurement — Amoxicillin 500mg × 800 tablets' },
      { id:'EXP-SEED-005', line_item_id:'LI-2025-013', amount:38400.00, item_id:'MED-003', item_name:'Ivermectin 1%',                   qty:120,  desc:'Initial stock procurement — Ivermectin 1% × 120 vials' },
      { id:'EXP-SEED-006', line_item_id:'LI-2025-013', amount:15750.00, item_id:'MED-004', item_name:'Vitamin B Complex',               qty:350,  desc:'Initial stock procurement — Vitamin B Complex × 350 ampoules' },
      { id:'EXP-SEED-007', line_item_id:'LI-2025-013', amount:28800.00, item_id:'MED-006', item_name:'Oxytetracycline 20%',             qty:60,   desc:'Initial stock procurement — Oxytetracycline 20% × 60 vials' },
      { id:'EXP-SEED-008', line_item_id:'LI-2025-013', amount:25200.00, item_id:'MED-007', item_name:'Vitamin E + Selenium',            qty:90,   desc:'Initial stock procurement — Vitamin E + Selenium × 90 vials' },
      // Supplies
      { id:'EXP-SEED-009', line_item_id:'LI-2025-003', amount:17000.00, item_id:'SUP-001', item_name:'Disposable Syringes 5ml',         qty:2000, desc:'Initial stock procurement — Disposable Syringes 5ml × 2000 pcs' },
      { id:'EXP-SEED-010', line_item_id:'LI-2025-003', amount: 6750.00, item_id:'SUP-007', item_name:'Disposable Needles 18G',          qty:1500, desc:'Initial stock procurement — Disposable Needles 18G × 1500 pcs' },
      { id:'EXP-SEED-011', line_item_id:'LI-2025-005', amount:14400.00, item_id:'SUP-005', item_name:'Vaccine Carrier / Cold Box',      qty:8,    desc:'Initial stock procurement — Vaccine Carrier / Cold Box × 8 pcs' },
      { id:'EXP-SEED-012', line_item_id:'LI-2025-006', amount: 7500.00, item_id:'SUP-003', item_name:'Specimen Collection Tubes',       qty:300,  desc:'Initial stock procurement — Specimen Collection Tubes × 300 pcs' },
      { id:'EXP-SEED-013', line_item_id:'LI-2025-008', amount: 7500.00, item_id:'SUP-002', item_name:'Examination Gloves (Large)',      qty:500,  desc:'Initial stock procurement — Examination Gloves × 500 pairs' },
      { id:'EXP-SEED-014', line_item_id:'LI-2025-014', amount: 9750.00, item_id:'SUP-004', item_name:'Thermometer (Digital Rectal)',    qty:15,   desc:'Initial stock procurement — Thermometer (Digital Rectal) × 15 pcs' },
      { id:'EXP-SEED-015', line_item_id:'LI-2025-014', amount:13200.00, item_id:'SUP-008', item_name:'Stethoscope (Veterinary)',        qty:6,    desc:'Initial stock procurement — Stethoscope (Veterinary) × 6 pcs' },
      { id:'EXP-SEED-016', line_item_id:'LI-2025-016', amount: 7200.00, item_id:'SUP-006', item_name:'Gauze Bandage 4 inch',           qty:400,  desc:'Initial stock procurement — Gauze Bandage 4 inch × 400 rolls' },
      // Office Supplies
      { id:'EXP-SEED-017', line_item_id:'LI-2025-019', amount: 5500.00, item_id:'OS-001', item_name:'A4 Bond Paper (500 sheets/ream)',  qty:20,   desc:'Initial stock procurement — A4 Bond Paper × 20 reams' },
      { id:'EXP-SEED-018', line_item_id:'LI-2025-019', amount:  960.00, item_id:'OS-002', item_name:'Ballpen Blue (Box of 12)',         qty:8,    desc:'Initial stock procurement — Ballpen Blue (Box of 12) × 8 boxes' },
      { id:'EXP-SEED-019', line_item_id:'LI-2025-019', amount:  510.00, item_id:'OS-003', item_name:'Stamp Pad (Violet)',              qty:6,    desc:'Initial stock procurement — Stamp Pad (Violet) × 6 pcs' },
      { id:'EXP-SEED-020', line_item_id:'LI-2025-019', amount: 1800.00, item_id:'OS-004', item_name:'Stapler Heavy Duty',              qty:4,    desc:'Initial stock procurement — Stapler Heavy Duty × 4 pcs' },
      { id:'EXP-SEED-021', line_item_id:'LI-2025-019', amount:  550.00, item_id:'OS-005', item_name:'Staple Wire No. 35 (Box)',        qty:10,   desc:'Initial stock procurement — Staple Wire × 10 boxes' },
      { id:'EXP-SEED-022', line_item_id:'LI-2025-019', amount: 3200.00, item_id:'OS-008', item_name:'Photocopy Paper Legal (ream)',    qty:10,   desc:'Initial stock procurement — Photocopy Paper Legal × 10 reams' },
      { id:'EXP-SEED-023', line_item_id:'LI-2025-019', amount: 2700.00, item_id:'OS-009', item_name:'Long Folder Pressboard',         qty:15,   desc:'Initial stock procurement — Long Folder Pressboard × 15 packs' },
      { id:'EXP-SEED-024', line_item_id:'LI-2025-019', amount: 1740.00, item_id:'OS-010', item_name:'Record Book 500 pages',          qty:12,   desc:'Initial stock procurement — Record Book 500 pages × 12 pcs' },
      { id:'EXP-SEED-025', line_item_id:'LI-2025-019', amount:  440.00, item_id:'OS-011', item_name:'Rubber Band Box 350g',           qty:4,    desc:'Initial stock procurement — Rubber Band Box × 4 boxes' },
      { id:'EXP-SEED-026', line_item_id:'LI-2025-019', amount:  544.00, item_id:'OS-013', item_name:'Dishwashing Liquid 500ml',       qty:8,    desc:'Initial stock procurement — Dishwashing Liquid × 8 bottles' },
      { id:'EXP-SEED-027', line_item_id:'LI-2025-019', amount: 1950.00, item_id:'OS-014', item_name:'Tissue Paper (12 rolls/pack)',   qty:10,   desc:'Initial stock procurement — Tissue Paper × 10 packs' },
      { id:'EXP-SEED-028', line_item_id:'LI-2025-019', amount:  960.00, item_id:'OS-015', item_name:'Whiteboard Marker Set (4 colors)',qty:6,   desc:'Initial stock procurement — Whiteboard Marker Set × 6 sets' },
      { id:'EXP-SEED-029', line_item_id:'LI-2025-021', amount: 3250.00, item_id:'OS-006', item_name:'Ink Cartridge Black Canon PG-745',qty:5,   desc:'Initial stock procurement — Ink Cartridge Black × 5 pcs' },
      { id:'EXP-SEED-030', line_item_id:'LI-2025-021', amount: 2340.00, item_id:'OS-007', item_name:'Ink Cartridge Color Canon CL-746',qty:3,   desc:'Initial stock procurement — Ink Cartridge Color × 3 pcs' },
      { id:'EXP-SEED-031', line_item_id:'LI-2025-021', amount: 1900.00, item_id:'OS-012', item_name:'Flash Drive 32GB USB 3.0',       qty:5,   desc:'Initial stock procurement — Flash Drive 32GB × 5 pcs' },
    ];
    for (const e of inventoryExpenditures) {
      await client.query(
        `INSERT INTO budget_expenditures
           (ref_id, line_item_id, amount, expenditure_type, description, expenditure_date,
            recorded_by, source_type, inventory_item_id, inventory_item_name, quantity_used)
         VALUES ($1,$2,$3,'utilized',$4,'2025-01-15','system','inventory',$5,$6,$7)
         ON CONFLICT (ref_id) DO UPDATE SET
           amount = EXCLUDED.amount,
           description = EXCLUDED.description,
           inventory_item_name = EXCLUDED.inventory_item_name,
           quantity_used = EXCLUDED.quantity_used`,
        [e.id, e.line_item_id, e.amount, e.desc, e.item_id, e.item_name, e.qty]
      );
    }
    // Recalculate utilized totals on all affected line items from actual expenditures
    const affectedLineItems = [...new Set(inventoryExpenditures.map(e => e.line_item_id))];
    for (const liId of affectedLineItems) {
      await client.query(
        `UPDATE budget_line_items
         SET utilized = COALESCE((SELECT SUM(amount) FROM budget_expenditures WHERE line_item_id=$1 AND expenditure_type='utilized'),0),
             updated_at = NOW()
         WHERE id = $1`,
        [liId]
      );
    }
    console.log(`  ✓ Budget expenditures seeded (${inventoryExpenditures.length} items) — utilized totals updated on ${affectedLineItems.length} line items`);

    // ── Sample Pending Orders ─────────────────────────────────────────────────
    const pendingOrders = [
      { id: 'PO-SEED-001', item_name: 'Rabisin Anti-Rabies Vaccine', item_type: 'medicine', category: 'Vaccine', quantity: 200, unit: 'vials', unit_cost: 100.00, supplier_id: 'SUPL-002', notes: 'Q3 quarterly restock for mass vaccination drive', status: 'pending', source: 'manual' },
      { id: 'PO-SEED-002', item_name: 'Disposable Syringes 5ml', item_type: 'supply', category: 'Medical Supplies', quantity: 1000, unit: 'pieces', unit_cost: 8.50, supplier_id: 'SUPL-001', notes: 'Replenishment for upcoming vaccination campaigns', status: 'pending', source: 'manual' },
      { id: 'PO-SEED-003', item_name: 'A4 Bond Paper (500 sheets/ream)', item_type: 'office', category: 'Paper & Stationery', quantity: 10, unit: 'reams', unit_cost: 275.00, supplier_id: 'SUPL-009', notes: 'Monthly office supply replenishment', status: 'received', source: 'manual' },
    ];
    for (const p of pendingOrders) {
      await client.query(
        `INSERT INTO pending_orders (id, item_name, item_type, category, quantity, unit, unit_cost, supplier_id, notes, status, source, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'system')
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.item_name, p.item_type, p.category, p.quantity, p.unit, p.unit_cost, p.supplier_id, p.notes, p.status, p.source]
      );
    }
    console.log(`  ✓ Pending orders seeded (${pendingOrders.length})`);

    // ── Inventory Transactions (medicine movements) ──────────────────────────
    const inventoryTxns = [
      { item_id: 'MED-DEMO-001', item_type: 'medicine', transaction_type: 'Dispensed', quantity: 10, previous_qty: 510, new_qty: 500, reason: 'Rabies vaccination drive - Poblacion 1', performed_by: 'Dr. Amalia Vergara', barangay: 'Poblacion 1' },
      { item_id: 'MED-DEMO-001', item_type: 'medicine', transaction_type: 'Dispensed', quantity: 8, previous_qty: 500, new_qty: 492, reason: 'Vaccination - Balimbing', performed_by: 'BAHW Miguel Sanchez', barangay: 'Balimbing' },
      { item_id: 'MED-DEMO-002', item_type: 'medicine', transaction_type: 'Dispensed', quantity: 15, previous_qty: 315, new_qty: 300, reason: 'Mass vaccination Poblacion 3', performed_by: 'Dr. Amalia Vergara', barangay: 'Poblacion 3' },
      { item_id: 'MED-DEMO-003', item_type: 'medicine', transaction_type: 'Dispensed', quantity: 5, previous_qty: 155, new_qty: 150, reason: 'Distemper/parvo vaccination', performed_by: 'Dr. Amalia Vergara', barangay: 'Poblacion 5' },
      { item_id: 'MED-DEMO-001', item_type: 'medicine', transaction_type: 'Restocked', quantity: 100, previous_qty: 400, new_qty: 500, reason: 'Monthly restock from DA Region IV-A', performed_by: 'Dr. Amalia Vergara', barangay: null },
    ];
    for (const t of inventoryTxns) {
      await client.query(
        `INSERT INTO inventory_transactions (item_id, item_type, transaction_type, quantity, previous_qty, new_qty, reason, performed_by, barangay)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [t.item_id, t.item_type, t.transaction_type, t.quantity, t.previous_qty, t.new_qty, t.reason, t.performed_by, t.barangay]
      );
    }
    console.log(`  ✓ Inventory transactions seeded (${inventoryTxns.length})`);

    // ── Audit Logs (seed real initial entries) ─────────────────────────────
    const auditEntries = [
      { user_id: 'USER-001', username: 'Dr. Amalia Vergara', action: 'Login', resource: 'Authentication', details: JSON.stringify({ role: 'admin' }), ip_address: '192.168.1.100' },
      { user_id: 'USER-002', username: 'BAHW Miguel Sanchez', action: 'Login', resource: 'Authentication', details: JSON.stringify({ role: 'bahw' }), ip_address: '192.168.1.105' },
      { user_id: 'USER-001', username: 'Dr. Amalia Vergara', action: 'Create', resource: 'Livestock', resource_id: 'LS-001', details: JSON.stringify({ animal_type: 'Cattle', barangay: 'Poblacion 5' }), ip_address: '192.168.1.100' },
      { user_id: 'USER-001', username: 'Dr. Amalia Vergara', action: 'Create', resource: 'Disease Event', resource_id: 'DE-001', details: JSON.stringify({ disease: 'ASF', barangay: 'Bisaya' }), ip_address: '192.168.1.100' },
      { user_id: 'USER-002', username: 'BAHW Miguel Sanchez', action: 'Update', resource: 'Vaccination Schedule', resource_id: 'SCH-001', details: JSON.stringify({ action: 'Updated attendance' }), ip_address: '192.168.1.105' },
      { user_id: 'USER-001', username: 'Dr. Amalia Vergara', action: 'Upload', resource: 'CVO Form', resource_id: 'FORM-001', details: JSON.stringify({ title: 'Pet Registration Form' }), ip_address: '192.168.1.100' },
      { user_id: null, username: 'unknown@test.com', action: 'Login Failed', resource: 'Authentication', details: JSON.stringify({ reason: 'User not found' }), ip_address: '203.125.45.78' },
    ];
    for (const e of auditEntries) {
      await client.query(
        `INSERT INTO audit_logs (user_id, username, action, resource, resource_id, details, ip_address)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [e.user_id, e.username, e.action, e.resource, (e as any).resource_id || null, e.details, e.ip_address]
      );
    }
    console.log(`  ✓ Audit logs seeded (${auditEntries.length})`);

    // ── CVO Forms ──────────────────────────────────────────────────────────
    const cvoForms = [
      {
        id: 'FORM-001', title: 'Pet Registration Form', category: 'Pet Services',
        description: 'Official registration form for companion animals in compliance with RA 8485 (Animal Welfare Act). Required for all pet owners in Calaca City.',
        requirements: ['Valid ID of owner','Recent photo of pet (3x3)','Proof of residence','Vaccination records (if available)'],
        procedureSteps: [
          'Download and print the Pet Registration Form',
          'Fill out all required information completely',
          'Attach a recent 3x3 photo of your pet',
          'Bring the completed form with required documents to the CVO office',
          'CVO staff will verify submitted documents',
          'Pay the registration fee (if applicable)',
          'Receive your Pet Registration Certificate and Tag'
        ],
        processingFee: 0, sortOrder: 1,
        fileName: 'Pet_Registration_Form.pdf'
      },
      {
        id: 'FORM-002', title: 'Anti-Rabies Vaccination Appointment Form', category: 'Vaccination Services',
        description: 'Schedule your pet for free anti-rabies vaccination. Available for all dogs and cats in Calaca City as part of the Rabies Prevention Program.',
        requirements: ['Pet registration number (if already registered)','Valid ID of owner','Pet vaccination booklet (if available)'],
        procedureSteps: [
          'Download and fill out the Vaccination Appointment Form',
          'Choose your preferred vaccination schedule and venue',
          'Bring the completed form to the designated vaccination site',
          'Present the form and valid ID upon arrival',
          'Wait for your pet to be assessed by the CVO staff',
          'Anti-rabies vaccine will be administered',
          'Receive vaccination certificate and next due date'
        ],
        processingFee: 0, sortOrder: 2,
        fileName: 'Vaccination_Appointment_Form.pdf'
      },
      {
        id: 'FORM-003', title: 'Veterinary Health Certificate Application', category: 'Certificate Services',
        description: 'Official health certificate for travel, sale, or transport of animals. Required for inter-provincial or international transport. Valid for 30 days from issuance.',
        requirements: ['Pet/livestock registration certificate','Updated vaccination records','Physical examination by city veterinarian','Processing fee: ₱200','Valid ID of owner'],
        procedureSteps: [
          'Download and complete the VHC Application Form',
          'Gather all required supporting documents',
          'Submit the application form and documents to CVO office',
          'Schedule physical examination appointment',
          'Bring animal to CVO for physical examination',
          'Pay the processing fee of ₱200',
          'Receive Veterinary Health Certificate within 1-3 working days'
        ],
        processingFee: 200, sortOrder: 3,
        fileName: 'VHC_Application_Form.pdf'
      },
      {
        id: 'FORM-004', title: 'Livestock Registration Form', category: 'Livestock Services',
        description: 'Mandatory registration for all livestock owners in Calaca City. Enables disease monitoring, outbreak prevention, and facilitates animal insurance programs.',
        requirements: ['Valid ID of farm owner','Proof of land ownership or lease','Recent photos of animals','Branding/marking documentation (if applicable)','Barangay clearance'],
        procedureSteps: [
          'Download the Livestock Registration Form',
          'Fill out animal details (type, breed, quantity, age)',
          'Attach required supporting documents',
          'Submit to CVO office or your BAHW',
          'CVO/BAHW will schedule farm visit for verification',
          'Animals will be tagged/branded upon verification',
          'Receive Livestock Registration Certificate'
        ],
        processingFee: 0, sortOrder: 4,
        fileName: 'Livestock_Registration_Form.pdf'
      },
      {
        id: 'FORM-005', title: 'Animal Health Certificate for Transport', category: 'Livestock Services',
        description: 'Required for movement of livestock between municipalities or provinces. Must be secured 3 days before transport. Valid for 3 days from issuance.',
        requirements: ['Livestock registration certificate','Updated vaccination records','Destination address and purpose of transport','Buyer/receiver information','Valid ID'],
        procedureSteps: [
          'Fill out the Transport Permit Application Form',
          'Specify destination and purpose of animal movement',
          'Submit application at least 3 days before transport date',
          'CVO staff will inspect animals for health clearance',
          'Pay applicable fees',
          'Receive Animal Health Certificate valid for 3 days',
          'Present certificate at all checkpoints during transport'
        ],
        processingFee: 150, sortOrder: 5,
        fileName: 'Animal_Transport_Certificate_Form.pdf'
      },
      {
        id: 'FORM-006', title: 'Hog Raiser Registration Form', category: 'Livestock Services',
        description: 'Registration form for all hog raisers in Calaca City. Mandatory for ASF prevention and monitoring. Enables access to government support programs.',
        requirements: ['Valid ID','Farm location details','Current hog inventory count','Proof of land ownership or lease','Biosecurity measures certification'],
        procedureSteps: [
          'Download and complete the Hog Raiser Registration Form',
          'Attach inventory list of all hogs with age and breed',
          'Include farm biosecurity plan',
          'Submit to CVO office or BAHW',
          'Farm inspection will be conducted within 5 working days',
          'Complete ASF biosecurity training (if not yet completed)',
          'Receive Hog Raiser Certificate'
        ],
        processingFee: 0, sortOrder: 6,
        fileName: 'Hog_Raiser_Registration_Form.pdf'
      },
    ];

    for (const f of cvoForms) {
      await client.query(
        `INSERT INTO cvo_forms (id, title, description, category, requirements, procedure_steps, processing_fee, sort_order, is_active, uploaded_by, file_name)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,'system',$9)
         ON CONFLICT (id) DO UPDATE SET title=$2,description=$3,category=$4,requirements=$5,procedure_steps=$6,processing_fee=$7,sort_order=$8,file_name=$9`,
        [f.id, f.title, f.description, f.category, JSON.stringify(f.requirements),
         JSON.stringify(f.procedureSteps), f.processingFee, f.sortOrder, f.fileName]
      );
    }
    console.log(`  ✓ CVO Forms seeded (${cvoForms.length})`);

    // ── Seed feedback data ─────────────────────────────────────────────────
    const feedbacks = [
      { id: 101, user_id: 'USER-003', username: 'Cyrus Cruz', category: 'feedback', subject: 'Excellent vaccination drive in Poblacion 1', message: 'The BAHW staff was very professional and accommodating during the recent vaccination drive. My pets were well taken care of.', status: 'Resolved', priority: 'Low', barangay: 'Poblacion 1', admin_response: 'Thank you for your kind words! We will continue to improve our services.', responded_by: 'Dr. Amalia Vergara' },
      { id: 102, user_id: 'USER-004', username: 'Aeden Aranez', category: 'complaint', subject: 'Delayed processing of livestock health certificate', message: 'I applied for a health certificate for my cattle 5 days ago but it has not been processed yet. I need it urgently for a sale transaction.', status: 'Under Review', priority: 'High', barangay: 'Poblacion 5', admin_response: null, responded_by: null },
      { id: 103, user_id: null, username: 'Anonymous', category: 'suggestion', subject: 'Request for weekend vaccination schedule', message: 'Many working pet owners cannot come to CVO on weekdays. Please consider having vaccination schedules on Saturdays at least twice a month.', status: 'Under Review', priority: 'Medium', barangay: 'Poblacion 3', admin_response: null, responded_by: null },
    ];

    for (const fb of feedbacks) {
      await client.query(
        `INSERT INTO feedback (id, user_id, username, category, subject, message, status, priority, barangay, admin_response, responded_by, responded_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (id) DO NOTHING`,
        [fb.id, fb.user_id, fb.username, fb.category, fb.subject, fb.message, fb.status,
         fb.priority, fb.barangay, fb.admin_response, fb.responded_by,
         fb.admin_response ? new Date() : null]
      );
    }
    console.log(`  ✓ Feedback seeded (${feedbacks.length})`);

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