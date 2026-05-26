import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// ── GET all livestock ─────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { ownerId, barangay, type, status } = req.query;
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
router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const totals = await query(`
      SELECT animal_type,
             SUM(quantity) as total,
             COUNT(*) as records,
             SUM(CASE WHEN health_status='Healthy'    THEN quantity ELSE 0 END) as healthy,
             SUM(CASE WHEN health_status='Sick'       THEN quantity ELSE 0 END) as sick,
             SUM(CASE WHEN health_status='Quarantine' THEN quantity ELSE 0 END) as quarantine,
             SUM(CASE WHEN vaccination_status='Vaccinated' THEN quantity ELSE 0 END) as vaccinated
      FROM livestock GROUP BY animal_type
    `);
    const barangayTotals = await query(`
      SELECT barangay,
             SUM(CASE WHEN animal_type='Cattle'  THEN quantity ELSE 0 END) as cattle,
             SUM(CASE WHEN animal_type='Swine'   THEN quantity ELSE 0 END) as swine,
             SUM(CASE WHEN animal_type='Poultry' THEN quantity ELSE 0 END) as poultry,
             SUM(CASE WHEN animal_type='Goats'   THEN quantity ELSE 0 END) as goats,
             SUM(CASE WHEN animal_type='Carabao' THEN quantity ELSE 0 END) as carabao,
             SUM(quantity) as total
      FROM livestock GROUP BY barangay ORDER BY total DESC
    `);
    const recentActivity = await query(`
      SELECT * FROM livestock ORDER BY updated_at DESC LIMIT 10
    `);
    return res.json({
      byType: totals.rows,
      byBarangay: barangayTotals.rows,
      recentActivity: recentActivity.rows,
    });
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
       d.ownerName, d.contactNumber || null, d.barangay, d.farmAddress || null,
       d.healthStatus || 'Healthy', d.farmType || 'Backyard', d.notes || null]
    );
    return res.json({ livestock: result.rows[0], success: true });
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

// ── Mortality Records ─────────────────────────────────────────────────────
router.get('/mortality/all', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM livestock_mortality ORDER BY date_reported DESC');
    return res.json({ mortality: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/mortality', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const d = req.body;
    const result = await query(
      `INSERT INTO livestock_mortality
        (livestock_id, animal_type, breed, owner_name, barangay, quantity,
         cause, date_reported, investigation_status, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [d.livestockId || null, d.animalType, d.breed || null, d.ownerName, d.barangay,
       d.quantity || 1, d.cause, d.dateReported || new Date().toISOString().split('T')[0],
       d.investigationStatus || 'Pending', d.notes || null, d.createdBy || 'Admin']
    );
    // If linked to a record, update health status
    if (d.livestockId) {
      await query('UPDATE livestock SET health_status=$1, updated_at=NOW() WHERE id=$2',
        ['Dead', d.livestockId]);
    }
    return res.json({ record: result.rows[0], success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Disease Events ────────────────────────────────────────────────────────
router.get('/disease-events/all', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM livestock_disease_events ORDER BY date_reported DESC'
    );
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
