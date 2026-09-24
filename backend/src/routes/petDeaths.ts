import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

// ─────────────────────────────────────────────────────────────────────────
// Pet Death / Expired Reports — validation module for PETS ONLY.
// Livestock death reports are handled separately in routes/livestock.ts
// (/api/livestock/mortality) and never touch this table.
// ─────────────────────────────────────────────────────────────────────────
const router = Router();

const STAFF_ROLES = ['bahw', 'admin', 'superadmin', 'cvoStaff'];
const OWNER_ROLES = ['petOwner', 'livestockManager', 'both', 'owner'];

const isStaff = (req: AuthRequest) => STAFF_ROLES.includes(req.user?.role || '');
const today = () => new Date().toISOString().split('T')[0];

// GET all pet death reports.
// Staff: all (BAHW hard-scoped to their own barangay). Owners: only their own pets.
router.get('/all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role || '';
    let result;
    if (role === 'bahw') {
      result = await query(
        `SELECT * FROM pet_death_reports WHERE LOWER(barangay)=LOWER($1) ORDER BY created_at DESC`,
        [req.user?.barangay || '']
      );
    } else if (isStaff(req)) {
      result = await query(`SELECT * FROM pet_death_reports ORDER BY created_at DESC`);
    } else if (OWNER_ROLES.includes(role)) {
      result = await query(
        `SELECT d.* FROM pet_death_reports d
         JOIN pets p ON p.id = d.pet_id
         WHERE p.owner_id = $1 ORDER BY d.created_at DESC`,
        [req.user?.ownerId || '__none__']
      );
    } else {
      return res.status(403).json({ error: 'Not allowed' });
    }
    return res.json({ reports: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST — report a pet death / expired pet.
// Owner reports start as Pending and must be validated by BAHW/CVO staff.
// Staff reports require a photo document and are auto-verified.
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const d = req.body || {};
    const role = req.user?.role || '';
    const staff = isStaff(req);
    const isBahw = role === 'bahw';
    if (!staff && !OWNER_ROLES.includes(role)) {
      return res.status(403).json({ error: 'Not allowed to report a pet death' });
    }
    if (!d.cause) return res.status(400).json({ error: 'Cause of death is required' });
    if (staff && !d.photoUrl) {
      return res.status(400).json({ error: 'A photo document is required when reporting a death.' });
    }

    // Pull the pet's details from the registry when a pet is linked, so the
    // report can't be filed with mismatched/forged species or owner data.
    let pet: any = null;
    if (d.petId) {
      const p = await query('SELECT * FROM pets WHERE id=$1', [d.petId]);
      if (p.rows.length === 0) return res.status(404).json({ error: 'Pet not found' });
      pet = p.rows[0];
      if (!staff && pet.owner_id !== req.user?.ownerId) {
        return res.status(403).json({ error: 'You can only report deaths for your own pets' });
      }
      if (isBahw && req.user?.barangay &&
          (pet.barangay || '').toLowerCase() !== req.user.barangay.toLowerCase()) {
        return res.status(403).json({ error: 'You can only report pets in your assigned barangay' });
      }
    } else if (!staff) {
      return res.status(400).json({ error: 'Select the registered pet you are reporting' });
    }

    const species   = pet?.species   || d.species;
    const petName   = pet?.pet_name  || d.petName || null;
    const breed     = pet?.breed     || d.breed || null;
    const ownerName = pet?.owner_name || d.ownerName;
    const barangay  = isBahw ? req.user?.barangay : (pet?.barangay || d.barangay);
    if (!species)   return res.status(400).json({ error: 'Species is required' });
    if (!ownerName) return res.status(400).json({ error: 'Owner name is required' });
    if (!barangay)  return res.status(400).json({ error: 'Barangay is required' });
    const dateOfDeath = d.dateOfDeath || d.dateReported || today();

    // Prevent duplicate active reports for the same pet / same walk-in details.
    const dup = pet
      ? await query(
          `SELECT id FROM pet_death_reports WHERE pet_id=$1 AND validation_status <> 'Rejected'`, [pet.id])
      : await query(
          `SELECT id FROM pet_death_reports
           WHERE pet_id IS NULL AND species=$1 AND owner_name=$2 AND barangay=$3
             AND date_of_death=$4 AND validation_status <> 'Rejected'`,
          [species, ownerName, barangay, dateOfDeath]);
    if (dup.rows.length > 0) {
      return res.status(409).json({ error: 'A death report for this pet already exists' });
    }

    const status = staff ? 'Verified' : 'Pending';
    const result = await query(
      `INSERT INTO pet_death_reports
        (pet_id, pet_name, species, breed, owner_name, barangay, cause, date_of_death,
         notes, photo_url, reported_by, reported_by_role,
         validation_status, validated_by, validated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [pet?.id || null, petName, species, breed, ownerName, barangay, d.cause, dateOfDeath,
       d.notes || null, d.photoUrl || null, req.user?.username || null, role,
       status, staff ? (req.user?.username || null) : null, staff ? new Date().toISOString() : null]
    );

    // Mark the linked pet Deceased (reverted if the report is later rejected).
    if (pet) {
      await query(`UPDATE pets SET status='Deceased', updated_at=NOW() WHERE id=$1`, [pet.id]);
    }
    return res.json({ report: result.rows[0], success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /:id/validate — BAHW / CVO staff verify or reject a pet death report.
// BAHW can only act on reports in their own barangay. Rejecting restores the
// pet's Active status because the death isn't substantiated.
router.put('/:id/validate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isStaff(req)) {
      return res.status(403).json({ error: 'Only BAHW or CVO staff can validate pet death reports' });
    }
    const { validationStatus, validationNotes } = req.body || {};
    if (validationStatus !== 'Verified' && validationStatus !== 'Rejected') {
      return res.status(400).json({ error: "validationStatus must be 'Verified' or 'Rejected'" });
    }
    const existing = await query('SELECT * FROM pet_death_reports WHERE id=$1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    const report = existing.rows[0];

    if (req.user?.role === 'bahw' && req.user.barangay &&
        (report.barangay || '').toLowerCase() !== req.user.barangay.toLowerCase()) {
      return res.status(403).json({ error: 'You can only validate reports in your assigned barangay' });
    }

    const result = await query(
      `UPDATE pet_death_reports
       SET validation_status=$1, validation_notes=$2, validated_by=$3, validated_at=NOW(), updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [validationStatus, validationNotes || null, req.user!.username, req.params.id]
    );

    if (report.pet_id) {
      if (validationStatus === 'Rejected') {
        await query(`UPDATE pets SET status='Active', updated_at=NOW() WHERE id=$1 AND status='Deceased'`, [report.pet_id]);
      } else {
        // Re-verifying a previously rejected report puts the pet back to Deceased.
        await query(`UPDATE pets SET status='Deceased', updated_at=NOW() WHERE id=$1`, [report.pet_id]);
      }
    }
    return res.json({ report: result.rows[0], success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE — staff only. BAHW limited to own barangay. A deleted report that was
// still counting the pet as Deceased restores the pet to Active.
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isStaff(req)) return res.status(403).json({ error: 'Only staff can delete pet death reports' });
    const existing = await query('SELECT * FROM pet_death_reports WHERE id=$1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    const report = existing.rows[0];
    if (req.user?.role === 'bahw' && req.user.barangay &&
        (report.barangay || '').toLowerCase() !== req.user.barangay.toLowerCase()) {
      return res.status(403).json({ error: 'You can only delete reports in your assigned barangay' });
    }
    await query('DELETE FROM pet_death_reports WHERE id=$1', [req.params.id]);
    if (report.pet_id && report.validation_status !== 'Verified') {
      await query(`UPDATE pets SET status='Active', updated_at=NOW() WHERE id=$1 AND status='Deceased'`, [report.pet_id]);
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
