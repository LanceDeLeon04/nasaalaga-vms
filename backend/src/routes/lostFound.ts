import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, optionalAuthenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
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
    // BAHW accounts only see lost/found reports for their assigned barangay.
    if (req.user?.role === 'bahw' && req.user?.barangay) {
      conditions.push(`barangay=$${idx++}`);
      params.push(req.user.barangay);
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

router.post('/', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
  try {
    const d = req.body;
    // Lost-livestock reports must come from a signed-in owner (pet/guest reports stay public).
    if (d.reportedByRole === 'livestockOwner') {
      if (!req.user) return res.status(401).json({ error: 'Please sign in to report lost livestock' });
      d.ownerId = req.user.ownerId || d.ownerId;
    }
    const maxResult = await query(
      `SELECT MAX(CAST(SUBSTRING(id FROM 4) AS INTEGER)) AS max_num FROM lost_found_reports WHERE id ~ '^LF-[0-9]+$'`
    );
    const maxNum = parseInt(maxResult.rows[0].max_num ?? '0') || 0;
    const newId = `LF-${String(maxNum + 1).padStart(3, '0')}`;

    await query(
      `INSERT INTO lost_found_reports (id, pet_id, pet_name, species, breed, color, type, reported_by, reported_by_role, owner_id, contact_number, last_seen_location, barangay, description, status, impound_location, impound_date, impound_officer)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'Open',$15,$16,$17)`,
      [newId, d.petId || 'UNKNOWN', d.petName, d.species, d.breed, d.color, d.type, d.reportedBy, d.reportedByRole, d.ownerId || null, d.contactNumber, d.lastSeenLocation, d.barangay, d.description, d.impoundLocation || null, d.impoundDate || null, d.impoundOfficer || null]
    );

    // If lost registered pet, mark as Lost
    if (d.type === 'Lost' && d.petId && d.petId !== 'UNKNOWN') {
      await query(`UPDATE pets SET status='Lost' WHERE id=$1`, [d.petId]);
    }

    const result = await query('SELECT * FROM lost_found_reports WHERE id=$1', [newId]);
    const report = result.rows[0];

    // ── Alert the BAHW(s) assigned to this barangay when a pet is reported Lost ──
    if (d.type === 'Lost' && d.barangay) {
      try {
        const bahws = await query(
          `SELECT id FROM users WHERE role='bahw' AND LOWER(barangay) = LOWER($1)`,
          [d.barangay]
        );
        if (bahws.rows.length > 0) {
          const countRes = await query('SELECT COUNT(*) FROM user_notifications');
          let notifIdx = parseInt(countRes.rows[0].count || '0');
          const isLivestock = d.reportedByRole === 'livestockOwner';
          const notifType = isLivestock ? 'lost_livestock' : 'lost_pet';
          const title = isLivestock
            ? `🐄 Lost Livestock Reported — Brgy. ${d.barangay}`
            : `🐾 Lost Pet Reported — Brgy. ${d.barangay}`;
          const message = isLivestock
            ? `${d.species || 'Livestock'} (${d.petId}) was reported lost in Barangay ${d.barangay}${d.lastSeenLocation ? ' near ' + d.lastSeenLocation : ''}. Please review and validate the report.`
            : `${d.petName || 'A pet'} (${d.species || 'unknown species'}) was reported lost in Barangay ${d.barangay}${d.lastSeenLocation ? ' near ' + d.lastSeenLocation : ''}. Please help watch out for this pet.`;
          for (const u of bahws.rows) {
            notifIdx++;
            const nid = `NOTIF-${String(notifIdx).padStart(5, '0')}`;
            await query(
              `INSERT INTO user_notifications (id, user_id, type, title, message, barangay, is_read, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,false,NOW())`,
              [nid, u.id, notifType, title, message, d.barangay]
            );
          }
        }
      } catch (notifErr) {
        // Non-fatal: report was saved even if the alert fanout fails
        console.error('⚠ Lost-pet BAHW notification error:', notifErr);
      }
    }
    query(
      `INSERT INTO audit_logs (user_id, username, user_role, action, resource, resource_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [(req as any).user?.id, d.reportedBy, (req as any).user?.role || d.reportedByRole, 'Create', 'Lost/Found Report', newId,
        JSON.stringify({ type: d.type, petName: d.petName, species: d.species, barangay: d.barangay }),
        req.ip]
    ).catch(() => {});
    return res.json({ report });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Roles allowed to validate (verify/reject) a lost-livestock report.
const VALIDATOR_ROLES = ['bahw', 'admin', 'superadmin', 'cvoStaff'];

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // A "Verified" / "Rejected" status change is a BAHW/staff validation
    // action, not a plain field edit — gate it accordingly.
    const isValidationAction = updates.status === 'Verified' || updates.status === 'Rejected';
    if (isValidationAction) {
      if (!req.user || !VALIDATOR_ROLES.includes(req.user.role)) {
        return res.status(403).json({ error: 'Only BAHW or CVO staff can validate lost-livestock reports' });
      }
      // A BAHW can only validate reports filed in their own assigned barangay.
      if (req.user.role === 'bahw' && req.user.barangay) {
        const existing = await query('SELECT barangay FROM lost_found_reports WHERE id=$1', [id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
        if ((existing.rows[0].barangay || '').toLowerCase() !== req.user.barangay.toLowerCase()) {
          return res.status(403).json({ error: 'You can only validate reports in your assigned barangay' });
        }
      }
      // Server sets who validated it and when — not trusted from the client.
      updates.validatedBy = req.user.username;
      updates.validatedAt = new Date().toISOString();
    }

    const fieldMap: Record<string, string> = {
      status: 'status', description: 'description',
      lastSeenLocation: 'last_seen_location',
      impoundLocation: 'impound_location',
      impoundDate: 'impound_date',
      impoundOfficer: 'impound_officer',
      validatedBy: 'validated_by',
      validatedAt: 'validated_at',
      validationNotes: 'validation_notes',
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

    query(
      `INSERT INTO audit_logs (user_id, username, user_role, action, resource, resource_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [(req as any).user?.id, (req as any).user?.username, (req as any).user?.role, 'Update', 'Lost/Found Report', id,
        JSON.stringify({ updatedFields: Object.keys(updates), newStatus: updates.status }),
        req.ip]
    ).catch(() => {});

    return res.json({ report });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
