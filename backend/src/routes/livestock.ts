import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ── GET all livestock ─────────────────────────────────────────────────────
// BAHW accounts are hard-scoped to their assigned barangay: any barangay
// passed in the query string is ignored for that role, so a BAHW account
// can never page through another barangay's records by tampering with the URL.
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { ownerId, type, status } = req.query;
    const barangay = req.user?.role === 'bahw' ? req.user?.barangay : req.query.barangay;
    let sql = 'SELECT * FROM livestock WHERE 1=1';
    const params: any[] = [];
    let i = 1;
    if (ownerId)  { sql += ` AND owner_id=$${i++}`;    params.push(ownerId); }
    if (barangay) { sql += ` AND barangay=$${i++}`;    params.push(barangay); }
    if (type)     { sql += ` AND animal_type=$${i++}`; params.push(type); }
    if (status)   { sql += ` AND health_status=$${i++}`; params.push(status); }
    sql += ' ORDER BY registration_date DESC';
    const result = await query(sql, params);
    return res.json({ livestock: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET summary stats ─────────────────────────────────────────────────────
// BAHW accounts are hard-scoped to their own assigned barangay, same as the
// list endpoint above — a BAHW must never see city-wide totals or other
// barangays' breakdowns in their Overview tab.
router.get('/summary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const isBahw = req.user?.role === 'bahw';
    const brgy = req.user?.barangay;
    const brgyClause = isBahw && brgy ? 'WHERE barangay=$1' : '';
    const brgyParams = isBahw && brgy ? [brgy] : [];

    const totals = await query(`
      SELECT animal_type,
             SUM(quantity) as total,
             COUNT(*) as records,
             SUM(CASE WHEN health_status='Healthy'    THEN quantity ELSE 0 END) as healthy,
             SUM(CASE WHEN health_status='Sick'       THEN quantity ELSE 0 END) as sick,
             SUM(CASE WHEN health_status='Quarantine' THEN quantity ELSE 0 END) as quarantine,
             SUM(CASE WHEN vaccination_status='Vaccinated' THEN quantity ELSE 0 END) as vaccinated
      FROM livestock ${brgyClause} GROUP BY animal_type
    `, brgyParams);
    const barangayTotals = await query(`
      SELECT barangay,
             SUM(CASE WHEN animal_type='Cattle'  THEN quantity ELSE 0 END) as cattle,
             SUM(CASE WHEN animal_type='Swine'   THEN quantity ELSE 0 END) as swine,
             SUM(CASE WHEN animal_type='Poultry' THEN quantity ELSE 0 END) as poultry,
             SUM(CASE WHEN animal_type='Goats'   THEN quantity ELSE 0 END) as goats,
             SUM(CASE WHEN animal_type='Carabao' THEN quantity ELSE 0 END) as carabao,
             SUM(quantity) as total
      FROM livestock ${brgyClause} GROUP BY barangay ORDER BY total DESC
    `, brgyParams);
    const recentActivity = await query(`
      SELECT * FROM livestock ${brgyClause} ORDER BY updated_at DESC LIMIT 10
    `, brgyParams);
    return res.json({
      byType: totals.rows,
      byBarangay: barangayTotals.rows,
      recentActivity: recentActivity.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Owner search (autocomplete) ───────────────────────────────────────────
router.get('/owner-search', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ users: [] });
    const result = await query(
      `SELECT id, username, owner_id, email, phone, barangay, address
       FROM users
       WHERE LOWER(username) LIKE LOWER($1)
          OR LOWER(owner_id) LIKE LOWER($1)
          OR phone LIKE $1
       ORDER BY username LIMIT 10`,
      [`%${q}%`]
    );
    return res.json({ users: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST create livestock ─────────────────────────────────────────────────
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const d = req.body;
    const countResult = await query('SELECT COUNT(*) FROM livestock');
    const count = parseInt(countResult.rows[0].count);
    const newId = `LS-${String(count + 1).padStart(3, '0')}`;

    // Handle temp ID for unregistered owners (mirrors pets module)
    let tempId: string | null = null;
    if (d.isUnregistered) {
      tempId = `TEMP-${uuidv4().slice(0, 8).toUpperCase()}`;
    }

    // BAHW accounts can only register livestock within their own assigned barangay.
    const barangay = req.user?.role === 'bahw' ? req.user?.barangay : d.barangay;
    const result = await query(
      `INSERT INTO livestock
        (id, owner_id, animal_type, breed, quantity, gender, age, color_markings,
         purpose, source, tag_number, owner_name, contact_number, barangay, farm_address,
         health_status, farm_type, notes, registration_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,CURRENT_DATE)
       RETURNING *`,
      [newId, d.ownerId || null, d.animalType, d.breed || null, d.quantity || 1,
       d.gender || null, d.age || null, d.colorMarkings || null,
       d.purpose || 'Mixed', d.source || null, d.tagNumber || null,
       d.ownerName, d.contactNumber || null, barangay, d.farmAddress || null,
       d.healthStatus || 'Healthy', d.farmType || 'Backyard', d.notes || null]
    );
    return res.json({ livestock: result.rows[0], success: true, tempId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── PUT update livestock ──────────────────────────────────────────────────
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const fieldMap: Record<string, string> = {
      animalType: 'animal_type', breed: 'breed', quantity: 'quantity',
      gender: 'gender', age: 'age', colorMarkings: 'color_markings',
      purpose: 'purpose', source: 'source', tagNumber: 'tag_number',
      ownerName: 'owner_name', contactNumber: 'contact_number',
      barangay: 'barangay', farmAddress: 'farm_address',
      healthStatus: 'health_status', farmType: 'farm_type',
      lastCheckupDate: 'last_checkup_date', notes: 'notes',
      quarantineDate: 'quarantine_date', quarantineReason: 'quarantine_reason',
    };
    const setClauses: string[] = ['updated_at=NOW()'];
    const values: any[] = [];
    let idx = 1;
    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in updates) { setClauses.push(`${col}=$${idx++}`); values.push(updates[key]); }
    }
    values.push(id);
    const result = await query(
      `UPDATE livestock SET ${setClauses.join(',')} WHERE id=$${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Livestock not found' });
    return res.json({ livestock: result.rows[0], success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── DELETE livestock ──────────────────────────────────────────────────────
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await query('DELETE FROM health_records WHERE livestock_id=$1', [req.params.id]);
    await query('DELETE FROM livestock WHERE id=$1', [req.params.id]);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Health Records ────────────────────────────────────────────────────────
router.get('/:id/health-records', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM health_records WHERE livestock_id=$1 ORDER BY date DESC',
      [req.params.id]
    );
    return res.json({ records: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/health-records', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const d = req.body;
    const result = await query(
      `INSERT INTO health_records
        (livestock_id, record_type, date, diagnosis, treatment, medicine_used,
         veterinarian, next_due_date, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.params.id, d.recordType, d.date || new Date().toISOString().split('T')[0],
       d.diagnosis || null, d.treatment || null, d.medicineUsed || null,
       d.veterinarian || null, d.nextDueDate || null, d.notes || null,
       d.createdBy || 'Admin']
    );
    // Update last_checkup_date on livestock record
    await query('UPDATE livestock SET last_checkup_date=$1, updated_at=NOW() WHERE id=$2',
      [d.date || new Date().toISOString().split('T')[0], req.params.id]);
    return res.json({ record: result.rows[0], success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Mortality / Death Reports (livestock AND pets, with photo document) ───
// BAHW is scoped to records reported in their own barangay.
router.get('/mortality/all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const isBahw = req.user?.role === 'bahw';
    const sql = isBahw
      ? 'SELECT * FROM livestock_mortality WHERE barangay=$1 ORDER BY date_reported DESC'
      : 'SELECT * FROM livestock_mortality ORDER BY date_reported DESC';
    const result = await query(sql, isBahw ? [req.user?.barangay] : []);
    return res.json({ mortality: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Report a death (livestock) or an expired/deceased pet, with an optional
// photo document. Kind is 'Livestock' (default) or 'Pet'.
// BAHW accounts are always pinned to their own assigned barangay, and must
// attach a photo document to substantiate the report.
router.post('/mortality', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const d = req.body;
    const isBahw = req.user?.role === 'bahw';
    const recordKind = d.recordKind === 'Pet' ? 'Pet' : 'Livestock';
    const barangay = isBahw ? req.user?.barangay : d.barangay;
    if (!barangay) return res.status(400).json({ error: 'Barangay is required' });
    if (isBahw && !d.photoUrl) {
      return res.status(400).json({ error: 'A photo document is required when reporting a death.' });
    }

    const result = await query(
      `INSERT INTO livestock_mortality
        (livestock_id, animal_type, breed, owner_name, barangay, quantity,
         cause, date_reported, investigation_status, notes, created_by,
         photo_url, record_kind, pet_id, reported_by, reported_by_role)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (animal_type, owner_name, barangay, cause, date_reported)
       DO UPDATE SET quantity = EXCLUDED.quantity, notes = EXCLUDED.notes,
         photo_url = COALESCE(EXCLUDED.photo_url, livestock_mortality.photo_url), updated_at = NOW()
       RETURNING *`,
      [d.livestockId || null, d.animalType, d.breed || null, d.ownerName, barangay,
       d.quantity || 1, d.cause, d.dateReported || new Date().toISOString().split('T')[0],
       d.investigationStatus || 'Pending', d.notes || null, req.user?.username || d.createdBy || 'Admin',
       d.photoUrl || null, recordKind, d.petId || null, req.user?.username || null, req.user?.role || null]
    );
    // If linked to a livestock record, update its health status
    if (d.livestockId) {
      await query('UPDATE livestock SET health_status=$1, updated_at=NOW() WHERE id=$2',
        ['Dead', d.livestockId]);
    }
    // If linked to a registered pet, mark it Deceased
    if (recordKind === 'Pet' && d.petId) {
      await query(`UPDATE pets SET status='Deceased', updated_at=NOW() WHERE id=$1`, [d.petId]);
    }
    return res.json({ record: result.rows[0], success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/mortality/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await query('DELETE FROM livestock_mortality WHERE id=$1', [req.params.id]);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/mortality/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const d = req.body;
    const result = await query(
      `UPDATE livestock_mortality SET investigation_status=$1, notes=$2, updated_at=NOW()
       WHERE id=$3 RETURNING *`,
      [d.investigationStatus, d.notes || null, req.params.id]
    );
    return res.json({ record: result.rows[0], success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Cleanup duplicate mortality records — keeps only the earliest per unique (animal_type, owner_name, barangay, cause, date_reported)
router.delete('/mortality/cleanup/duplicates', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      DELETE FROM livestock_mortality
      WHERE id NOT IN (
        SELECT MIN(id) FROM livestock_mortality
        GROUP BY animal_type, owner_name, barangay, cause, date_reported
      )
    `);
    return res.json({ success: true, deleted: result.rowCount });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Disease Events ────────────────────────────────────────────────────────
router.get('/disease-events/all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const isBahw = req.user?.role === 'bahw';
    const sql = isBahw
      ? 'SELECT * FROM livestock_disease_events WHERE barangay=$1 ORDER BY date_reported DESC'
      : 'SELECT * FROM livestock_disease_events ORDER BY date_reported DESC';
    const result = await query(sql, isBahw ? [req.user?.barangay] : []);
    return res.json({ events: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/disease-events', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const d = req.body;
    const countResult = await query('SELECT COUNT(*) FROM livestock_disease_events');
    const count = parseInt(countResult.rows[0].count);
    const newId = `DE-${String(count + 1).padStart(3, '0')}`;
    const result = await query(
      `INSERT INTO livestock_disease_events
        (id, animal_type, disease, barangay, cases, deaths, status, date_reported, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [newId, d.animalType, d.disease, d.barangay, d.cases || 0, d.deaths || 0,
       d.status || 'Active', d.dateReported || new Date().toISOString().split('T')[0],
       d.notes || null, d.createdBy || 'Admin']
    );
    return res.json({ event: result.rows[0], success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/disease-events/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const d = req.body;
    // Support partial updates — COALESCE keeps existing values when fields are not provided
    const result = await query(
      `UPDATE livestock_disease_events
         SET status=COALESCE($1, status),
             cases=COALESCE($2, cases),
             deaths=COALESCE($3, deaths),
             resolved_date=COALESCE($4, resolved_date),
             notes=COALESCE($5, notes)
       WHERE id=$6 RETURNING *`,
      [
        d.status ?? null,
        d.cases !== undefined ? d.cases : null,
        d.deaths !== undefined ? d.deaths : null,
        d.resolvedDate ?? d.resolved_date ?? null,
        d.notes !== undefined ? d.notes : null,
        req.params.id,
      ]
    );
    return res.json({ event: result.rows[0], success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
