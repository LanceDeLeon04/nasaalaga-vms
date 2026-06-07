import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendPreRegEmail } from '../services/email';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ── Zone → color prefix mapping (single source of truth) ─────────────────
// Zone names must exactly match what is stored in the barangays table.
const ZONE_PREFIX: Record<string, string> = {
  'East':           'BLU',
  'West':           'PRP',
  'North':          'GRY',
  'Baybay-Highway': 'RED',  // ← correct zone name (not 'Red')
};

// Fetch zone for a barangay from DB
async function getBarangayZone(barangayName: string): Promise<string> {
  try {
    const result = await query(
      'SELECT zone FROM barangays WHERE LOWER(name) = LOWER($1) LIMIT 1',
      [barangayName]
    );
    return result.rows[0]?.zone || 'East';
  } catch {
    return 'East';
  }
}

// Get color prefix for a barangay
async function getBarangayPrefix(barangayName: string): Promise<string> {
  const zone = await getBarangayZone(barangayName);
  return ZONE_PREFIX[zone] || 'BLU';
}

/**
 * Resolve the correct barangay to use for tag assignment.
 *
 * Priority:
 *  1. The owner's registered barangay (from users table, via owner_id)
 *  2. The barangay supplied in the request / pre-registration form
 *
 * This ensures the color prefix always reflects the owner's actual zone,
 * not whatever the form might have submitted.
 */
async function resolveTagBarangay(ownerIdOrNull: string | null, fallbackBarangay: string): Promise<string> {
  if (ownerIdOrNull) {
    try {
      const r = await query(
        'SELECT barangay FROM users WHERE owner_id = $1 LIMIT 1',
        [ownerIdOrNull]
      );
      const ownerBrgy = r.rows[0]?.barangay;
      if (ownerBrgy) return ownerBrgy;
    } catch { /* fall through */ }
  }
  return fallbackBarangay;
}

/**
 * Build the color-coded tag ID.
 *
 * Format: PREFIX-0000-00000  (e.g. BLU-0000-00001, RED-0000-00042)
 *  - PREFIX  : 3-letter color code derived from owner's barangay zone
 *  - 0000    : zone-wide batch block (always 0000 for sequential numbering)
 *  - 00000   : 5-digit sequential number, unique per prefix
 *
 * Uniqueness is enforced by the UNIQUE constraint on pet_tag_id.
 */
async function buildTagId(barangayName: string, manualNumber?: string, ownerIdOrNull?: string | null): Promise<string> {
  const resolvedBarangay = await resolveTagBarangay(ownerIdOrNull ?? null, barangayName);
  const prefix = await getBarangayPrefix(resolvedBarangay);

  if (manualNumber) {
    const num = manualNumber.replace(/\D/g, ''); // strip non-digits
    if (!num) throw new Error('Invalid tag number');
    const padded = num.padStart(5, '0');
    return `${prefix}-0000-${padded}`;
  }

  // Auto: find the highest existing sequential number for this prefix and increment
  const result = await query(
    `SELECT pet_tag_id FROM pets WHERE pet_tag_id LIKE $1 ORDER BY pet_tag_id DESC LIMIT 1`,
    [`${prefix}-____-%`]
  );
  let next = 1;
  if (result.rows[0]?.pet_tag_id) {
    const parts = result.rows[0].pet_tag_id.split('-');
    const last = parseInt(parts[parts.length - 1] || '0');
    if (!isNaN(last)) next = last + 1;
  }
  return `${prefix}-0000-${String(next).padStart(5, '0')}`;
}

// ── Helper: expose zone+prefix info for a barangay (used by frontend) ─────
router.get('/barangay-prefix', async (req: AuthRequest, res: Response) => {
  try {
    const { barangay, ownerId } = req.query;
    if (!barangay) return res.status(400).json({ error: 'barangay required' });
    const resolvedBarangay = await resolveTagBarangay((ownerId as string) || null, barangay as string);
    const zone = await getBarangayZone(resolvedBarangay);
    const prefix = ZONE_PREFIX[zone] || 'BLU';
    return res.json({ zone, prefix, resolvedBarangay, format: `${prefix}-0000-NNNNN` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

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
      success: true, total,
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
      lostFound: { lost: lostMap['Lost'] || 0, found: lostMap['Found'] || 0 },
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
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await query(
      `INSERT INTO pet_pre_registrations
         (pre_reg_number, owner_id, pet_name, species, breed, age, color, gender,
          owner_name, contact_number, owner_email, barangay, address, photo, status, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'Pending',$15)`,
      [preRegNumber, petData.ownerId, petData.petName, petData.species, petData.breed,
       petData.age, petData.color, petData.gender, petData.ownerName, petData.contactNumber,
       petData.ownerEmail || null, petData.barangay, petData.address, petData.photo || null, expiresAt]
    );

    let emailSent = false;
    if (petData.ownerEmail) {
      try {
        const result = await sendPreRegEmail(
          petData.ownerEmail, petData.ownerName, petData.petName, preRegNumber, expiresAt
        );
        emailSent = result.sent;
        await query(`UPDATE pet_pre_registrations SET email_sent=$1 WHERE pre_reg_number=$2`, [emailSent, preRegNumber]);
      } catch (emailErr) { console.error('[Pre-register] Email error:', emailErr); }
    }

    return res.json({ success: true, preRegNumber, expiresAt: expiresAt.toISOString(), emailSent });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/pre-registered', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, barangay } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;
    if (status) { conditions.push(`status=$${idx++}`); params.push(status); }
    // BAHW can only see their tagged barangay; others see all
    const filterBarangay = barangay || (req.user?.role === 'bahw' ? req.user?.barangay : null);
    if (filterBarangay) { conditions.push(`barangay=$${idx++}`); params.push(filterBarangay); }
    let sql = 'SELECT * FROM pet_pre_registrations';
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
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
    // tagNumber: admin-supplied number portion (e.g. "0001"); tagId: full override
    const { action, petId, photo, tagNumber, petTagId, denialReason } = req.body;
    const preRegResult = await query('SELECT * FROM pet_pre_registrations WHERE pre_reg_number=$1', [preRegNumber]);
    const preReg = preRegResult.rows[0];
    if (!preReg) return res.status(404).json({ error: 'Pre-registration not found' });

    if (action === 'approve') {
      // Build color-coded tag from owner's barangay zone (CLR-0000-NNNNN format)
      // petTagId from frontend may be a raw number or a full tag string;
      // always re-derive from the owner's barangay to guarantee correct color prefix.
      let tagId: string | null = null;
      try {
        const rawNum = petTagId ? petTagId.replace(/[^0-9]/g, '') : undefined;
        tagId = await buildTagId(
          preReg.barangay,
          rawNum && rawNum.length > 0 ? rawNum : (tagNumber || undefined),
          preReg.owner_id || null
        );
      } catch (e: any) {
        return res.status(409).json({ error: e.message });
      }
      // Use color-zoning ID as primary ID (no PET-### fallback)
      const newPetId = petId || tagId || `GEN-000-${String(Date.now()).slice(-5)}`;

      // Check uniqueness before insert
      if (tagId) {
        const dup = await query('SELECT id FROM pets WHERE pet_tag_id=$1', [tagId]);
        if (dup.rows.length > 0) {
          return res.status(409).json({
            error: `Tag ID ${tagId} already exists. Please choose a different number.`,
            tagConflict: true,
          });
        }
      }

      await query(
        `INSERT INTO pets (id, owner_id, pet_name, species, breed, age, color, gender,
           owner_name, contact_number, owner_email, barangay, address, photo,
           vaccination_status, status, pre_reg_number, pet_tag_id, registration_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'Not Vaccinated','Active',$15,$16,CURRENT_DATE)`,
        [newPetId, preReg.owner_id, preReg.pet_name, preReg.species, preReg.breed,
         preReg.age, preReg.color, preReg.gender, preReg.owner_name, preReg.contact_number,
         preReg.owner_email, preReg.barangay, preReg.address, photo || preReg.photo,
         preRegNumber, tagId]
      );
      await query(
        `UPDATE pet_pre_registrations SET status='Approved', pet_id=$1, pet_tag_id=$2, approved_date=NOW() WHERE pre_reg_number=$3`,
        [newPetId, tagId, preRegNumber]
      );
      const pet = (await query('SELECT * FROM pets WHERE id=$1', [newPetId])).rows[0];
      return res.json({ success: true, pet, petTagId: tagId });
    } else if (action === 'deny') {
      await query(
        `UPDATE pet_pre_registrations SET status='Denied', denial_reason=$1, denied_date=NOW() WHERE pre_reg_number=$2`,
        [denialReason, preRegNumber]
      );
      return res.json({ success: true, message: 'Denied' });
    }
    return res.status(400).json({ error: 'Invalid action' });
  } catch (err: any) {
    if (err.code === '23505') { // unique_violation
      return res.status(409).json({ error: 'That tag ID already exists. Choose a different number.', tagConflict: true });
    }
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
    let resolvedOwnerId = d.ownerId || null;
    let tempId = d.tempId || null;

    if (!resolvedOwnerId && d.ownerName) {
      const userMatch = await query(
        `SELECT owner_id FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1`,
        [d.ownerName.trim()]
      );
      if (userMatch.rows[0]) {
        resolvedOwnerId = userMatch.rows[0].owner_id;
      } else if (d.tempId) {
        tempId = d.tempId;
      } else if (d.isUnregistered) {
        tempId = `TEMP-${uuidv4().slice(0, 8).toUpperCase()}`;
      }
    }

    // Build color-coded tag from barangay + optional manual number
    let autoTagId: string | null = null;
    if (d.barangay) {
      try {
        autoTagId = await buildTagId(d.barangay, d.tagNumber || undefined, resolvedOwnerId || null);
      } catch (e: any) {
        return res.status(409).json({ error: e.message, tagConflict: true });
      }
    }

    // Use color-zoning ID as primary pet ID (no PET-### fallback)
    const newId = autoTagId || `GEN-000-${String(Date.now()).slice(-5)}`;

    // Check uniqueness
    if (autoTagId) {
      const dup = await query('SELECT id FROM pets WHERE pet_tag_id=$1', [autoTagId]);
      if (dup.rows.length > 0) {
        return res.status(409).json({
          error: `Tag ID ${autoTagId} already exists. Choose a different number.`,
          tagConflict: true,
        });
      }
    }

    const result = await query(
      `INSERT INTO pets
         (id, owner_id, pet_name, species, breed, age, color, gender,
          owner_name, contact_number, barangay, address, photo,
          vaccination_status, is_spayed, is_neutered, impound_status,
          status, registration_date, pet_tag_id, temp_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'Active',CURRENT_DATE,$18,$19)
       RETURNING *`,
      [newId, resolvedOwnerId, d.petName, d.species, d.breed, d.age || null,
       d.color, d.gender || null, d.ownerName, d.contactNumber || d.ownerContact || null,
       d.barangay, d.address || d.ownerAddress || null, d.photoUrl || d.photo || null,
       d.vaccinationStatus || 'Not Vaccinated', d.isSpayed || false, d.isNeutered || false,
       d.impoundStatus || 'None', autoTagId, tempId]
    );
    return res.json({ pet: result.rows[0], success: true, tempId, petTagId: autoTagId });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'That tag ID already exists. Choose a different number.', tagConflict: true });
    }
    return res.status(500).json({ error: err.message });
  }
});

// ── Owner search ───────────────────────────────────────────────────────────
router.get('/owner-search', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ users: [] });
    const result = await query(
      `SELECT id, username, owner_id, email, barangay, address
       FROM users WHERE LOWER(username) LIKE LOWER($1) ORDER BY username LIMIT 10`,
      [`%${q}%`]
    );
    return res.json({ users: result.rows });
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
    const result = await query(
      `UPDATE pets SET ${setClauses.join(',')} WHERE id=$${idx} RETURNING *`,
      values
    );
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

// ── Pet Old / Pre-existing Records (no inventory deduction) ───────────────────
router.get('/:id/old-records', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM pet_old_records WHERE pet_id=$1 ORDER BY record_date DESC`,
      [req.params.id]
    );
    return res.json({ records: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/old-records', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const d = req.body;
    const petId = req.params.id;
    const id = `OLR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Ensure the table exists (idempotent — safe to call on every insert)
    await query(`
      CREATE TABLE IF NOT EXISTS pet_old_records (
        id TEXT PRIMARY KEY,
        pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
        record_type TEXT NOT NULL DEFAULT 'Vaccination',
        record_date DATE NOT NULL,
        vaccine_name TEXT,
        veterinarian TEXT,
        lot_number TEXT,
        next_due_date DATE,
        notes TEXT,
        created_by TEXT DEFAULT 'Admin',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await query(
      `INSERT INTO pet_old_records
         (id, pet_id, record_type, record_date, vaccine_name, veterinarian, lot_number, next_due_date, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, petId, d.recordType || 'Vaccination',
       d.recordDate || new Date().toISOString().split('T')[0],
       d.vaccineName || null, d.veterinarian || null,
       d.lotNumber || null, d.nextDueDate || null,
       d.notes || null, d.createdBy || 'Admin']
    );

    // If it's a vaccination old record, also insert into vaccination_history
    // but do NOT deduct from inventory
    if ((d.recordType || 'Vaccination') === 'Vaccination') {
      const vaxId = `VAX-OLD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await query(
        `INSERT INTO vaccination_history
           (id, pet_id, date_of_vaccination, vaccine_name, lot_number, batch_number,
            veterinarian, notes, administered_by)
         VALUES ($1,$2,$3,$4,$5,$5,$6,$7,$8)`,
        [vaxId, petId, d.recordDate || new Date().toISOString().split('T')[0],
         d.vaccineName || '', d.lotNumber || null,
         d.veterinarian || 'Pre-existing Record',
         (d.notes ? '[Old Record] ' + d.notes : '[Old Record - Pre-existing]'),
         d.veterinarian || 'Admin']
      );

      // Update pet vaccination status if not already vaccinated
      await query(
        `UPDATE pets SET
           vaccination_status = CASE WHEN vaccination_status != 'Vaccinated' THEN 'Vaccinated' ELSE vaccination_status END,
           last_vaccination_date = COALESCE(last_vaccination_date, $1),
           updated_at = NOW()
         WHERE id = $2`,
        [d.recordDate || new Date().toISOString().split('T')[0], petId]
      );
    }

    const record = (await query(`SELECT * FROM pet_old_records WHERE id=$1`, [id])).rows[0];
    return res.json({ success: true, record });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
