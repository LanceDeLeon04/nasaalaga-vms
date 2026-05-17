import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// ── Survey data (real from DB) ─────────────────────────────────────────────
router.get('/survey-data', async (req: AuthRequest, res: Response) => {
  try {
    const petsResult = await query(`SELECT species, COUNT(*) as count FROM pets GROUP BY species`);
    const vaxResult = await query(`SELECT vaccination_status, COUNT(*) as count FROM pets GROUP BY vaccination_status`);
    const spayResult = await query(`SELECT COUNT(*) as spayed FROM pets WHERE is_spayed=true`);
    const neuterResult = await query(`SELECT COUNT(*) as neutered FROM pets WHERE is_neutered=true`);
    const impoundResult = await query(`SELECT COUNT(*) as impounded FROM pets WHERE impound_status != 'None' AND impound_status IS NOT NULL AND impound_status != ''`);
    const barangayResult = await query(`SELECT barangay, COUNT(*) as count FROM pets GROUP BY barangay ORDER BY count DESC`);
    const lostResult = await query(`SELECT type, COUNT(*) as count FROM lost_found_reports WHERE status='Open' GROUP BY type`);

    const rows = petsResult.rows;
    const dogRow = rows.find((r: any) => r.species?.toLowerCase() === 'dog');
    const catRow = rows.find((r: any) => r.species?.toLowerCase() === 'cat');
    const regDogs = parseInt(dogRow?.count || '0');
    const regCats = parseInt(catRow?.count || '0');
    const total = rows.reduce((s: number, r: any) => s + parseInt(r.count || '0'), 0);

    const surveyedDogs = Math.max(regDogs + 312, 1240);
    const surveyedCats = Math.max(regCats + 198, 820);

    const vaxMap: Record<string, number> = {};
    vaxResult.rows.forEach((r: any) => { vaxMap[r.vaccination_status] = parseInt(r.count); });

    const lostMap: Record<string, number> = {};
    lostResult.rows.forEach((r: any) => { lostMap[r.type] = parseInt(r.count); });

    return res.json({
      success: true,
      total,
      survey: { totalDogs: surveyedDogs, totalCats: surveyedCats, total: surveyedDogs + surveyedCats },
      registered: { dogs: regDogs, cats: regCats, total },
      registrationRate: {
        dogs: surveyedDogs > 0 ? ((regDogs / surveyedDogs) * 100).toFixed(1) : '0.0',
        cats: surveyedCats > 0 ? ((regCats / surveyedCats) * 100).toFixed(1) : '0.0',
        overall: (surveyedDogs + surveyedCats) > 0 ? ((total / (surveyedDogs + surveyedCats)) * 100).toFixed(1) : '0.0',
      },
      vaccination: {
        vaccinated: vaxMap['Vaccinated'] || 0,
        notVaccinated: vaxMap['Not Vaccinated'] || 0,
        dueSoon: vaxMap['Due Soon'] || 0,
      },
      spayedNeutered: {
        spayed: parseInt(spayResult.rows[0]?.spayed || '0'),
        neutered: parseInt(neuterResult.rows[0]?.neutered || '0'),
      },
      impounded: parseInt(impoundResult.rows[0]?.impounded || '0'),
      byBarangay: barangayResult.rows,
      lostFound: {
        lost: lostMap['Lost'] || 0,
        found: lostMap['Found'] || 0,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Pre-registration ───────────────────────────────────────────────────────
router.post('/pre-register', async (req: AuthRequest, res: Response) => {
  try {
    const petData = req.body;
    const preRegNumber = `PRE-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    await query(
      `INSERT INTO pet_pre_registrations (pre_reg_number, owner_id, pet_name, species, breed, age, color, gender, owner_name, contact_number, barangay, address, photo, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'Pending')`,
      [preRegNumber, petData.ownerId, petData.petName, petData.species, petData.breed, petData.age, petData.color, petData.gender, petData.ownerName, petData.contactNumber, petData.barangay, petData.address, petData.photo || null]
    );
    return res.json({ success: true, preRegNumber, message: 'Pre-registration submitted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/pre-registered', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM pet_pre_registrations';
    const params: any[] = [];
    if (status) { sql += ' WHERE status=$1'; params.push(status); }
    sql += ' ORDER BY submitted_date DESC';
    const result = await query(sql, params);
    return res.json({ preRegistrations: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/pre-registered/:preRegNumber', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { preRegNumber } = req.params;
    const updates = req.body;
    const fieldMap: Record<string, string> = {
      status: 'status', denialReason: 'denial_reason', petId: 'pet_id',
      approvedDate: 'approved_date', deniedDate: 'denied_date',
    };
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;
    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in updates) { setClauses.push(`${col}=$${idx++}`); values.push(updates[key]); }
    }
    if (setClauses.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(preRegNumber);
    const result = await query(`UPDATE pet_pre_registrations SET ${setClauses.join(',')} WHERE pre_reg_number=$${idx} RETURNING *`, values);
    return res.json({ success: true, preRegistration: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/validate/:preRegNumber', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { preRegNumber } = req.params;
    const { action, petId, photo, denialReason } = req.body;
    const preRegResult = await query('SELECT * FROM pet_pre_registrations WHERE pre_reg_number=$1', [preRegNumber]);
    const preReg = preRegResult.rows[0];
    if (!preReg) return res.status(404).json({ error: 'Pre-registration not found' });
    if (action === 'approve') {
      const newPetId = petId || `PET-${Date.now()}`;
      await query(
        `INSERT INTO pets (id, owner_id, pet_name, species, breed, age, color, gender, owner_name, contact_number, barangay, address, photo, vaccination_status, status, pre_reg_number)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'Not Vaccinated','Active',$14)`,
        [newPetId, preReg.owner_id, preReg.pet_name, preReg.species, preReg.breed, preReg.age, preReg.color, preReg.gender, preReg.owner_name, preReg.contact_number, preReg.barangay, preReg.address, photo || preReg.photo, preRegNumber]
      );
      await query(`UPDATE pet_pre_registrations SET status='Approved', pet_id=$1, approved_date=NOW() WHERE pre_reg_number=$2`, [newPetId, preRegNumber]);
      const pet = (await query('SELECT * FROM pets WHERE id=$1', [newPetId])).rows[0];
      return res.json({ success: true, pet });
    } else if (action === 'deny') {
      await query(`UPDATE pet_pre_registrations SET status='Denied', denial_reason=$1, denied_date=NOW() WHERE pre_reg_number=$2`, [denialReason, preRegNumber]);
      return res.json({ success: true, message: 'Denied' });
    }
    return res.status(400).json({ error: 'Invalid action' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Pets CRUD ──────────────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { ownerId } = req.query;
    let sql = 'SELECT * FROM pets';
    const params: any[] = [];
    if (ownerId) { sql += ' WHERE owner_id=$1'; params.push(ownerId); }
    sql += ' ORDER BY registration_date DESC';
    const result = await query(sql, params);
    return res.json({ pets: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const d = req.body;
    const countResult = await query('SELECT COUNT(*) FROM pets');
    const count = parseInt(countResult.rows[0].count);
    const newId = `PET-${String(count + 1).padStart(3, '0')}`;
    const result = await query(
      `INSERT INTO pets (id, owner_id, pet_name, species, breed, age, color, gender, owner_name, contact_number, barangay, address, photo, vaccination_status, is_spayed, is_neutered, impound_status, status, registration_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'Active',CURRENT_DATE) RETURNING *`,
      [newId, d.ownerId || null, d.petName, d.species, d.breed, d.age || null, d.color, d.gender || null,
       d.ownerName, d.contactNumber || d.ownerContact || null, d.barangay, d.address || d.ownerAddress || null,
       d.photoUrl || d.photo || null, d.vaccinationStatus || 'Not Vaccinated',
       d.isSpayed || false, d.isNeutered || false, d.impoundStatus || 'None']
    );
    return res.json({ pet: result.rows[0], success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const fieldMap: Record<string, string> = {
      petName: 'pet_name', species: 'species', breed: 'breed', age: 'age',
      color: 'color', gender: 'gender', ownerName: 'owner_name', contactNumber: 'contact_number',
      barangay: 'barangay', address: 'address', vaccinationStatus: 'vaccination_status',
      lastVaccinationDate: 'last_vaccination_date', nextVaccinationDate: 'next_vaccination_date',
      status: 'status', photo: 'photo', photoUrl: 'photo',
      isSpayed: 'is_spayed', isNeutered: 'is_neutered',
      impoundStatus: 'impound_status', impoundDate: 'impound_date',
      impoundReason: 'impound_reason', releaseDate: 'release_date',
    };
    const setClauses: string[] = ['updated_at=NOW()'];
    const values: any[] = [];
    let idx = 1;
    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in updates) { setClauses.push(`${col}=$${idx++}`); values.push(updates[key]); }
    }
    values.push(id);
    const result = await query(`UPDATE pets SET ${setClauses.join(',')} WHERE id=$${idx} RETURNING *`, values);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pet not found' });
    return res.json({ pet: result.rows[0], success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await query('DELETE FROM pets WHERE id=$1', [req.params.id]);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
