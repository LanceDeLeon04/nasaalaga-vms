import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { ownerId } = req.query;
    let sql = 'SELECT * FROM livestock';
    const params: any[] = [];
    if (ownerId) {
      sql += ' WHERE owner_id=$1';
      params.push(ownerId);
    }
    sql += ' ORDER BY registration_date DESC';
    const result = await query(sql, params);
    return res.json({ livestock: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const d = req.body;
    const countResult = await query('SELECT COUNT(*) FROM livestock');
    const count = parseInt(countResult.rows[0].count);
    const newId = `LS-${String(count + 1).padStart(3, '0')}`;

    const result = await query(
      `INSERT INTO livestock (id, owner_id, animal_type, breed, quantity, owner_name, contact_number, barangay, farm_address, health_status, vaccination_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [newId, d.ownerId, d.animalType, d.breed, d.quantity || 1, d.ownerName, d.contactNumber, d.barangay, d.farmAddress, d.healthStatus || 'Healthy', d.vaccinationStatus || 'Not Vaccinated']
    );

    return res.json({ livestock: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const fieldMap: Record<string, string> = {
      animalType: 'animal_type', breed: 'breed', quantity: 'quantity',
      ownerName: 'owner_name', contactNumber: 'contact_number',
      barangay: 'barangay', farmAddress: 'farm_address',
      healthStatus: 'health_status', vaccinationStatus: 'vaccination_status',
      lastCheckupDate: 'last_checkup_date',
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
      `UPDATE livestock SET ${setClauses.join(',')} WHERE id=$${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Livestock not found' });
    return res.json({ livestock: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
