/**
 * Schedule sync — the single calendar rule.
 *
 * Every dated thing the admin side creates (interventions, outbreak target resolutions,
 * expected deliveries, deployments, rabies observation periods) is mirrored as a row in
 * `appointment_schedules`, so the Schedule module is the one place that shows all of it.
 *
 * Source records stay the single source of truth. A mirrored row is identified by
 * (source_type, source_id, source_kind) and is rewritten from its source every time the source
 * is saved, and removed when the source is deleted. Staff cannot edit a mirrored row directly
 * (the appointment-schedules routes refuse), so the calendar can never disagree with its source.
 *
 * All sync calls are best-effort: a failure here is logged and never blocks saving the source record.
 */
import { query } from '../db';

export type SourceType = 'intervention' | 'outbreak' | 'order' | 'deployment' | 'observation';

/** Schedule types that are only ever mirrored from other modules and are always staff-only. */
export const STAFF_ONLY_TYPES = ['Intervention', 'Outbreak', 'Delivery', 'Deployment', 'Observation'];

/** Human label + where the source lives, used by the UI for "Managed in …". */
export const SOURCE_LABELS: Record<SourceType, string> = {
  intervention: 'Smart Alerts & Interventions',
  outbreak: 'Outbreak Monitoring',
  order: 'Inventory › Orders',
  deployment: 'Resource Deployment',
  observation: 'Biting Incidents',
};

type SchedStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

interface LinkedEvent {
  sourceType: SourceType;
  sourceId: string;
  kind: string;                 // e.g. 'start' | 'due' | 'resolve' | 'delivery' | 'deploy' | 'observation-end'
  scheduleType: string;
  title: string;
  date: string | null;          // YYYY-MM-DD; null/empty removes the mirrored row
  timeSlot?: string;
  status: SchedStatus;
  barangay?: string | null;
  venue?: string | null;
  notes?: string | null;
  createdBy?: string | null;
}

const clip = (s: string, n = 250) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const ymd = (v: any): string | null => {
  if (!v) return null;
  const s = String(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};
const mkId = (e: LinkedEvent) =>
  `LNK-${e.sourceType.slice(0, 3).toUpperCase()}-${e.kind.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase()}-${e.sourceId.replace(/[^a-z0-9]/gi, '').slice(-20)}`.slice(0, 50);

async function upsert(e: LinkedEvent) {
  if (!e.date) { await removeKind(e.sourceType, e.sourceId, e.kind); return; }
  await query(
    `INSERT INTO appointment_schedules
       (id, schedule_type, title, date, time_slot, status, requested_by, requested_by_name, notes,
        barangay, venue, capacity, is_admin_created, visibility, source_type, source_id, source_kind, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,NULL,$7,$8,$9,$10,NULL,true,'staff',$11,$12,$13,$7)
     ON CONFLICT (source_type, source_id, source_kind) WHERE source_type IS NOT NULL DO UPDATE SET
       schedule_type=EXCLUDED.schedule_type, title=EXCLUDED.title, date=EXCLUDED.date,
       time_slot=EXCLUDED.time_slot, status=EXCLUDED.status, notes=EXCLUDED.notes,
       barangay=EXCLUDED.barangay, venue=EXCLUDED.venue, updated_at=NOW()`,
    [mkId(e), e.scheduleType, clip(e.title), e.date, e.timeSlot || '08:00', e.status,
     e.createdBy || 'System', e.notes || null, e.barangay || null, e.venue || null,
     e.sourceType, e.sourceId, e.kind]
  );
}

async function removeKind(sourceType: SourceType, sourceId: string, kind: string) {
  await query(`DELETE FROM appointment_schedules WHERE source_type=$1 AND source_id=$2 AND source_kind=$3`, [sourceType, sourceId, kind]);
}

/** Remove every mirrored row for a source record (call when the source is deleted). */
export async function removeLinked(sourceType: SourceType, sourceId: string) {
  try {
    await query(`DELETE FROM appointment_schedules WHERE source_type=$1 AND source_id=$2`, [sourceType, sourceId]);
  } catch (err) { console.error('⚠ schedule sync (remove) failed:', err); }
}

// ── Interventions: start date + target end date ──────────────────────────────
export async function syncIntervention(id: string) {
  try {
    const r = await query(
      `SELECT id, title, barangay, type, status, goal, notes, is_outbreak,
              to_char(start_date,'YYYY-MM-DD') AS start_d, to_char(end_date,'YYYY-MM-DD') AS end_d,
              to_char(created_at AT TIME ZONE 'Asia/Manila','YYYY-MM-DD') AS created_d
         FROM intervention_tickets WHERE id=$1`, [id]);
    const iv = r.rows[0];
    if (!iv) { await removeLinked('intervention', id); return; }
    const status: SchedStatus = iv.status === 'pending' ? 'Pending' : iv.status === 'in-progress' ? 'Confirmed' : 'Completed';
    const start = ymd(iv.start_d) || ymd(iv.created_d);
    const end = ymd(iv.end_d);
    const base = { sourceType: 'intervention' as const, sourceId: id, scheduleType: 'Intervention', status, barangay: iv.barangay, notes: iv.goal || iv.notes || null };
    const label = iv.is_outbreak ? 'Outbreak response' : 'Intervention';
    if (end && end !== start) {
      await upsert({ ...base, kind: 'start', title: `${label} starts: ${iv.title}`, date: start });
      await upsert({ ...base, kind: 'due', title: `${label} target end: ${iv.title}`, date: end });
    } else {
      await upsert({ ...base, kind: 'start', title: `${label}: ${iv.title}`, date: start });
      await removeKind('intervention', id, 'due');
    }
  } catch (err) { console.error('⚠ schedule sync (intervention) failed:', err); }
}

// ── Outbreaks: target resolution date ────────────────────────────────────────
export async function syncOutbreak(id: string) {
  try {
    const r = await query(
      `SELECT id, disease, barangay, status, severity, assigned_to, timetable, is_deleted,
              to_char(resolve_date,'YYYY-MM-DD') AS resolve_d
         FROM outbreak_records WHERE id=$1`, [id]);
    const o = r.rows[0];
    if (!o || o.is_deleted) { await removeLinked('outbreak', id); return; }
    const resolved = o.status === 'Resolved';
    await upsert({
      sourceType: 'outbreak', sourceId: id, kind: 'resolve', scheduleType: 'Outbreak',
      title: resolved ? `Outbreak resolved: ${o.disease} — ${o.barangay || 'City-wide'}`
                      : `Target resolution: ${o.disease} — ${o.barangay || 'City-wide'}`,
      date: ymd(o.resolve_d), status: resolved ? 'Completed' : 'Confirmed', barangay: o.barangay,
      notes: [o.assigned_to ? `Assigned: ${o.assigned_to}` : '', o.timetable || ''].filter(Boolean).join(' · ') || null,
    });
  } catch (err) { console.error('⚠ schedule sync (outbreak) failed:', err); }
}

/** An outbreak linked to a biting incident is addressed by its source incident id. */
export async function syncOutbreaksBySource(sourceId: string) {
  try {
    const r = await query(`SELECT id FROM outbreak_records WHERE source_id=$1`, [sourceId]);
    for (const row of r.rows) await syncOutbreak(row.id);
  } catch (err) { console.error('⚠ schedule sync (outbreak by source) failed:', err); }
}

// ── Orders: expected delivery date ───────────────────────────────────────────
export async function syncOrder(id: string) {
  try {
    const r = await query(
      `SELECT po.id, po.item_name, po.quantity, po.unit, po.status, po.notes, s.name AS supplier_name,
              to_char(po.expected_delivery_date,'YYYY-MM-DD') AS expected_d
         FROM pending_orders po LEFT JOIN suppliers s ON s.id = po.supplier_id WHERE po.id=$1`, [id]);
    const o = r.rows[0];
    if (!o) { await removeLinked('order', id); return; }
    const status: SchedStatus = o.status === 'received' ? 'Completed' : o.status === 'cancelled' ? 'Cancelled' : 'Confirmed';
    await upsert({
      sourceType: 'order', sourceId: id, kind: 'delivery', scheduleType: 'Delivery',
      title: `${status === 'Completed' ? 'Delivered' : 'Expected delivery'}: ${o.quantity} ${o.unit || ''} ${o.item_name}`.replace(/\s+/g, ' '),
      date: ymd(o.expected_d), status, venue: o.supplier_name ? `Supplier: ${o.supplier_name}` : null,
      notes: `Order ${o.id}${o.notes ? ' · ' + o.notes : ''}`,
    });
  } catch (err) { console.error('⚠ schedule sync (order) failed:', err); }
}

// ── Deployments: scheduled date (or derived from urgency when none was chosen) ──
export async function syncDeployment(id: string) {
  try {
    const r = await query(
      `SELECT id, barangay, urgency, reason, status, estimated_duration, staff_needed, target_animals,
              to_char(COALESCE(
                scheduled_date,
                (deployed_at AT TIME ZONE 'Asia/Manila')::date,
                (created_at AT TIME ZONE 'Asia/Manila')::date +
                  (CASE urgency WHEN 'Immediate' THEN 0 WHEN 'Within 3 Days' THEN 3 ELSE 7 END)
              ),'YYYY-MM-DD') AS plan_d
         FROM deployments WHERE id=$1`, [id]);
    const d = r.rows[0];
    if (!d) { await removeLinked('deployment', id); return; }
    const status: SchedStatus = d.status === 'completed' ? 'Completed' : d.status === 'deployed' ? 'Confirmed' : 'Pending';
    await upsert({
      sourceType: 'deployment', sourceId: id, kind: 'deploy', scheduleType: 'Deployment',
      title: `Deployment: ${d.barangay}${d.reason ? ' — ' + d.reason : ''}`,
      date: ymd(d.plan_d), status, barangay: d.barangay,
      notes: `${d.urgency || ''} · ${d.staff_needed || 1} staff · ${d.target_animals || 0} animals · ~${d.estimated_duration || '1 day'}`,
    });
  } catch (err) { console.error('⚠ schedule sync (deployment) failed:', err); }
}

// ── Biting incidents: end of the rabies observation period ──────────────────
export async function syncObservation(id: string) {
  try {
    const r = await query(
      `SELECT id, pet_name, barangay, status, confirmed_rabies, observation_update,
              to_char(observation_start,'YYYY-MM-DD') AS start_d, to_char(observation_end,'YYYY-MM-DD') AS end_d
         FROM biting_incidents WHERE id=$1`, [id]);
    const b = r.rows[0];
    if (!b) { await removeLinked('observation', id); return; }
    await upsert({
      sourceType: 'observation', sourceId: id, kind: 'observation-end', scheduleType: 'Observation',
      title: `Rabies observation ends: ${b.pet_name}${b.confirmed_rabies ? ' (confirmed rabies)' : ''}`,
      date: ymd(b.end_d), status: b.status === 'Open' ? 'Confirmed' : 'Completed', barangay: b.barangay,
      notes: [b.start_d ? `Observation began ${b.start_d}` : '', b.observation_update || ''].filter(Boolean).join(' · ') || null,
    });
  } catch (err) { console.error('⚠ schedule sync (observation) failed:', err); }
}

/** One-time + every-startup catch-up so records that existed before this feature (or were
 *  written by another path) are on the calendar too. Safe to run repeatedly. */
export async function backfillScheduleLinks() {
  const run = async (sql: string, fn: (id: string) => Promise<void>) => {
    const r = await query(sql).catch(() => ({ rows: [] as any[] }));
    for (const row of r.rows) await fn(row.id);
  };
  await run(`SELECT id FROM intervention_tickets`, syncIntervention);
  await run(`SELECT id FROM outbreak_records WHERE is_deleted IS NOT TRUE`, syncOutbreak);
  await run(`SELECT id FROM pending_orders`, syncOrder);
  await run(`SELECT id FROM deployments`, syncDeployment);
  await run(`SELECT id FROM biting_incidents`, syncObservation);
  console.log('✅ Schedule calendar linked to interventions, outbreaks, deliveries, deployments and observations');
}
