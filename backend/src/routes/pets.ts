import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

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

    return res.json({ success: true, preRegNumber, message: 'Pet pre-registration submitted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/pre-registered', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM pet_pre_registrations';
    const params: any[] = [];
    if (status) {
      sql += ' WHERE status=$1';
      params.push(status);
    }
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
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const fieldMap: Record<string, string> = {
      status: 'status',
      denialReason: 'denial_reason',
      petId: 'pet_id',
      approvedDate: 'approved_date',
      deniedDate: 'denied_date',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in updates) {
        setClauses.push(`${col}=$${idx++}`);
        values.push(updates[key]);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(preRegNumber);
    const result = await query(
      `UPDATE pet_pre_registrations SET ${setClauses.join(',')} WHERE pre_reg_number=$${idx} RETURNING *`,
      values
    );

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

      await query(
        `UPDATE pet_pre_registrations SET status='Approved', pet_id=$1, approved_date=NOW() WHERE pre_reg_number=$2`,
        [newPetId, preRegNumber]
      );

      const pet = (await query('SELECT * FROM pets WHERE id=$1', [newPetId])).rows[0];
      return res.json({ success: true, message: 'Pet validated and registered successfully', pet });
    } else if (action === 'deny') {
      await query(
        `UPDATE pet_pre_registrations SET status='Denied', denial_reason=$1, denied_date=NOW() WHERE pre_reg_number=$2`,
        [denialReason, preRegNumber]
      );
      return res.json({ success: true, message: 'Pre-registration denied' });
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
    if (ownerId) {
      sql += ' WHERE owner_id=$1';
      params.push(ownerId);
    }
    sql += ' ORDER BY registration_date DESC';
    const result = await query(sql, params);
    return res.json({ pets: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petData = req.body;
    const countResult = await query('SELECT COUNT(*) FROM pets');
    const count = parseInt(countResult.rows[0].count);
    const newId = `PET-${String(count + 1).padStart(3, '0')}`;

    const result = await query(
      `INSERT INTO pets (id, owner_id, pet_name, species, breed, age, color, gender, owner_name, contact_number, barangay, address, vaccination_status, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'Active') RETURNING *`,
      [newId, petData.ownerId, petData.petName, petData.species, petData.breed, petData.age, petData.color, petData.gender, petData.ownerName, petData.contactNumber, petData.barangay, petData.address, petData.vaccinationStatus || 'Not Vaccinated']
    );

    return res.json({ pet: result.rows[0] });
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
      status: 'status', photo: 'photo',
    };

    const setClauses: string[] = ['updated_at=NOW()'];
    const values: any[] = [];
    let idx = 1;

    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in updates) {
        setClauses.push(`${col}=$${idx++}`);
        values.push(updates[key]);
      }
    }

    values.push(id);
    const result = await query(
      `UPDATE pets SET ${setClauses.join(',')} WHERE id=$${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Pet not found' });
    return res.json({ pet: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
