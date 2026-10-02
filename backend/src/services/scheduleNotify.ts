/**
 * Mass-schedule notifications. Every public-facing (non-staff-only) schedule that staff creates,
 * reschedules, cancels or deletes — Vaccination, Spay/Neuter, Checkup, drives, anything —
 * notifies the affected residents in-app AND by email. No barangay = city-wide = every resident.
 */
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';
import { sendScheduleNoticeEmails, scheduleNoticeText, ScheduleNoticeInfo } from './email';

const OWNER_ROLES = ['petOwner', 'livestockManager', 'owner', 'both'];
const nid = () => `NOTIF-${uuidv4().replace(/-/g, '').slice(0, 8).toUpperCase()}`;

export async function notifyMassSchedule(scheduleId: string | null, info: ScheduleNoticeInfo): Promise<{ recipients: number }> {
  try {
    const brgy = (info.barangay || '').trim();
    const users = await query(
      `SELECT id, LOWER(email) AS email, role FROM users
        WHERE (role = ANY($1) OR (role = 'bahw' AND $2 <> ''))
          AND ($2 = '' OR LOWER(TRIM(barangay)) = LOWER($2))`,
      [OWNER_ROLES, brgy]
    );
    const { title, message } = scheduleNoticeText(info);
    const type = info.kind === 'new' ? 'schedule' : `schedule_${info.kind}`;
    for (const u of users.rows) {
      await query(
        `INSERT INTO user_notifications (id, user_id, type, title, message, barangay, schedule_id, is_read, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,false,NOW())`,
        [nid(), u.id, type, title, message, brgy || null, scheduleId]
      ).catch(e => console.error('[Notify] insert failed:', e.message));
    }
    const emails = users.rows.filter((u: any) => OWNER_ROLES.includes(u.role) && u.email).map((u: any) => u.email);
    if (emails.length) sendScheduleNoticeEmails(emails, info).catch(e => console.error('[Email] schedule notice error:', e.message));
    return { recipients: users.rows.length };
  } catch (e: any) {
    console.error('⚠ Mass-schedule notification error:', e.message);   // non-fatal
    return { recipients: 0 };
  }
}

/** Personal appointment: tell just that owner when staff confirm, move or cancel it. */
export async function notifyAppointmentOwner(row: any, kind: 'rescheduled' | 'cancelled') {
  try {
    const u = await query(`SELECT id, LOWER(email) AS email FROM users WHERE id=$1 OR owner_id=$1 OR LOWER(email)=LOWER($1) LIMIT 1`, [row.requested_by]);
    if (!u.rows[0]) return;
    const info: ScheduleNoticeInfo = { kind, scheduleType: row.schedule_type, barangay: row.barangay, date: String(row.date).slice(0, 10), timeStart: row.time_slot, venue: row.venue };
    const t = scheduleNoticeText(info);
    const title = t.title.replace(/ — .*$/, ` — ${row.pet_name || 'your appointment'}`);
    await query(
      `INSERT INTO user_notifications (id, user_id, type, title, message, barangay, schedule_id, is_read, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,false,NOW())`,
      [nid(), u.rows[0].id, `schedule_${kind}`, title, t.message.replace(/ for .*? on /, ` for ${row.pet_name || 'your pet'} on `), row.barangay || null, row.id]);
    if (u.rows[0].email) sendScheduleNoticeEmails([u.rows[0].email], info).catch(() => {});
  } catch (e: any) { console.error('⚠ Owner appointment notice error:', e.message); }
}
