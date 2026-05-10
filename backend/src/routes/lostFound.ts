import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { type, ownerId } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (type && type !== 'all') {
      conditions.push(`type=$${idx++}`);
      params.push(type);
    }
    if (ownerId) {
      conditions.push(`owner_id=$${idx++}`);
      params.push(ownerId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT * FROM lost_found_reports ${where} ORDER BY date_reported DESC`,
      params
    );

    return res.json({ reports: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const d = req.body;
    const countResult = await query('SELECT COUNT(*) FROM lost_found_reports');
    const count = parseInt(countResult.rows[0].count);
    const newId = `LF-${String(count + 1).padStart(3, '0')}`;

    await query(
      `INSERT INTO lost_found_reports (id, pet_id, pet_name, species, breed, color, type, reported_by, reported_by_role, owner_id, contact_number, last_seen_location, barangay, description, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'Open')`,
      [newId, d.petId || 'UNKNOWN', d.petName, d.species, d.breed, d.color, d.type, d.reportedBy, d.reportedByRole, d.ownerId || null, d.contactNumber, d.lastSeenLocation, d.barangay, d.description]
    );

    // If lost registered pet, mark as Lost
    if (d.type === 'Lost' && d.petId && d.petId !== 'UNKNOWN') {
      await query(`UPDATE pets SET status='Lost' WHERE id=$1`, [d.petId]);
    }

    const result = await query('SELECT * FROM lost_found_reports WHERE id=$1', [newId]);
    return res.json({ report: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const fieldMap: Record<string, string> = {
      status: 'status', description: 'description',
      lastSeenLocation: 'last_seen_location',
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
      `UPDATE lost_found_reports SET ${setClauses.join(',')} WHERE id=$${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Report not found' });

    const report = result.rows[0];

    // If resolved lost pet, mark as Found
    if (updates.status === 'Resolved' && report.type === 'Lost' && report.pet_id && report.pet_id !== 'UNKNOWN') {
      await query(`UPDATE pets SET status='Found' WHERE id=$1`, [report.pet_id]);
    }

    return res.json({ report });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
