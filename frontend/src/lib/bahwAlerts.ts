// ============================================================
// BAHW Alert Engine
// Turns the data a barangay health worker already has access to
// into a prioritised list of alerts. Pure functions, no network.
// Every alert has a stable `id` (what it is about) and a `signature`
// (its current state) so an acknowledged alert stays hidden until
// the situation actually changes (e.g. more cases, new deadline).
// ============================================================

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertCategory = 'outbreak' | 'health' | 'vaccination' | 'task' | 'schedule';

export interface BAHWAlert {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  message: string;
  items?: string[];          // short detail lines (e.g. pet names)
  count?: number;
  actionView?: string;       // ActiveView to open
  actionLabel?: string;
  signature: string;         // changes when the underlying situation changes
  score: number;             // for sorting (higher = more urgent)
}

export interface AlertInput {
  barangay: string;
  now?: number;
  pets?: any[];
  livestock?: any[];
  outbreaks?: any[];
  diseaseAlerts?: any[];
  diseaseEvents?: any[];
  biting?: any[];
  schedules?: any[];
  petPreRegs?: any[];
  livestockPreRegs?: any[];
  petDeaths?: any[];
  livestockDeaths?: any[];
  lostReports?: any[];
}

const DAY = 86400000;
const norm = (s: any) => String(s ?? '').trim().toLowerCase();
const same = (a: any, b: any) => norm(a) === norm(b);
const ts = (d: any) => { const t = d ? new Date(d).getTime() : NaN; return isFinite(t) ? t : NaN; };
const fmtDate = (d: any) => { const t = ts(d); return isFinite(t) ? new Date(t).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : ''; };
const plural = (n: number, w: string, p = w + 's') => `${n} ${n === 1 ? w : p}`;
const list = (a: string[], max = 4) => a.slice(0, max).concat(a.length > max ? [`+${a.length - max} more`] : []);
const isActive = (s: any) => !/resolv|closed|complete|cancel|archiv|inactive|done/i.test(String(s ?? 'Active'));
const SEV_BASE: Record<AlertSeverity, number> = { critical: 100, warning: 60, info: 20 };

function sevFromText(s: any): AlertSeverity {
  const t = norm(s);
  if (/critical|high|severe/.test(t)) return 'critical';
  if (/med|moder/.test(t)) return 'warning';
  return t ? 'info' : 'warning';
}

export function computeBAHWAlerts(inp: AlertInput): BAHWAlert[] {
  const now = inp.now ?? Date.now();
  const b = inp.barangay;
  const out: BAHWAlert[] = [];
  const push = (a: Omit<BAHWAlert, 'score'> & { bonus?: number }) => {
    const { bonus, ...rest } = a as any;
    out.push({ ...rest, score: SEV_BASE[a.severity] + Math.min(30, bonus ?? 0) });
  };

  // ── 1. Outbreaks ──────────────────────────────────────────
  const outbreaks = (inp.outbreaks || []).filter(o => isActive(o.status));
  for (const o of outbreaks.filter(o => same(o.barangay, b))) {
    const cases = Number(o.cases) || 1;
    const sev: AlertSeverity = sevFromText(o.severity) === 'info' ? 'warning' : sevFromText(o.severity);
    push({
      id: `outbreak:${o.id}`, category: 'outbreak', severity: sev === 'warning' && cases >= 5 ? 'critical' : sev,
      title: `Active outbreak in your barangay: ${o.disease}`,
      message: `${plural(cases, 'case')} recorded${o.date_created ? ` since ${fmtDate(o.date_created)}` : ''}. ${o.timetable ? `Plan: ${o.timetable}. ` : ''}Follow the CVO response plan and report new cases.`,
      actionView: 'outbreak', actionLabel: 'Open outbreak monitor', signature: `${o.status}|${cases}|${o.severity}|${(o.updates || []).length}`, bonus: cases,
    });
  }
  const elsewhere = outbreaks.filter(o => !same(o.barangay, b) && o.barangay);
  if (elsewhere.length) {
    const byBrgy = Array.from(new Set(elsewhere.map(o => `${o.disease} — Brgy. ${o.barangay}`)));
    push({
      id: 'outbreak:elsewhere', category: 'outbreak', severity: 'info',
      title: `${plural(byBrgy.length, 'active outbreak')} elsewhere in the city`,
      message: 'Not in your barangay yet. Watch for the same signs in animals here and report early.',
      items: list(byBrgy), count: byBrgy.length, actionView: 'outbreak', actionLabel: 'View map', signature: byBrgy.sort().join('|'),
    });
  }

  // ── 2. Disease alerts issued by the CVO ───────────────────
  for (const a of (inp.diseaseAlerts || []).filter(a => isActive(a.status))) {
    const loc = norm(a.location || a.barangay);
    const relevant = !loc || same(loc, b) || /calaca|city|all|lahat/.test(loc);
    if (!relevant) continue;
    push({
      id: `dalert:${a.id}`, category: 'health', severity: sevFromText(a.severity),
      title: `Disease alert: ${a.disease}`,
      message: `${a.location ? `Area: ${a.location}. ` : ''}${Number(a.cases) ? `${plural(Number(a.cases), 'case')} reported. ` : ''}Check animals in your barangay for symptoms.`,
      actionView: 'outbreak', actionLabel: 'Details', signature: `${a.status}|${a.cases}|${a.severity}|${a.last_update}`,
    });
  }

  // ── 3. Livestock disease events ───────────────────────────
  for (const e of (inp.diseaseEvents || []).filter(e => isActive(e.status) && same(e.barangay, b))) {
    const deaths = Number(e.deaths) || 0;
    push({
      id: `devent:${e.id}`, category: 'health', severity: deaths > 0 ? 'critical' : 'warning',
      title: `Livestock disease: ${e.disease}${e.animal_type ? ` (${e.animal_type})` : ''}`,
      message: `${plural(Number(e.cases) || 0, 'case')}${deaths ? `, ${plural(deaths, 'death')}` : ''} in your barangay. Isolate sick animals and inform the owners.`,
      actionView: 'livestock', actionLabel: 'View livestock', signature: `${e.status}|${e.cases}|${deaths}`, bonus: deaths * 5,
    });
  }

  // ── 4. Biting incidents ───────────────────────────────────
  const biting = (inp.biting || []).filter(x => !x.barangay || same(x.barangay, b));
  const recentBites = biting.filter(x => now - ts(x.incident_date) <= 30 * DAY);
  const rabies = recentBites.filter(x => x.confirmed_rabies);
  if (rabies.length) push({
    id: 'bite:rabies', category: 'health', severity: 'critical',
    title: `${plural(rabies.length, 'confirmed rabies case')} (last 30 days)`,
    message: 'Make sure bitten persons received post-exposure treatment, and vaccinate animals around the incident location right away.',
    items: list(rabies.map(x => `${x.pet_name || 'Animal'} — ${x.location || 'location n/a'} (${fmtDate(x.incident_date)})`)), count: rabies.length,
    actionView: 'outbreak', actionLabel: 'Open incidents', signature: rabies.map(x => x.id).sort().join('|'), bonus: rabies.length * 5,
  });
  const observing = biting.filter(x => !x.confirmed_rabies && isActive(x.status) && String(x.status).toLowerCase() !== 'closed' && x.observation_end && ts(x.observation_end) >= now - DAY);
  if (observing.length) push({
    id: 'bite:observing', category: 'health', severity: 'warning',
    title: `${plural(observing.length, 'biting animal')} under observation`,
    message: 'Check on each animal daily and log its condition until the observation period ends.',
    items: list(observing.map(x => `${x.pet_name || 'Animal'} — until ${fmtDate(x.observation_end)}`)), count: observing.length,
    actionView: 'outbreak', actionLabel: 'Update observation', signature: observing.map(x => `${x.id}:${x.observation_update || ''}`).sort().join('|'),
  });
  const needsOutcome = biting.filter(x => isActive(x.status) && String(x.status).toLowerCase() !== 'closed' && x.observation_end && ts(x.observation_end) < now - DAY);
  if (needsOutcome.length) push({
    id: 'bite:outcome', category: 'task', severity: 'warning',
    title: `${plural(needsOutcome.length, 'bite case')} ${needsOutcome.length === 1 ? 'needs' : 'need'} a final outcome`,
    message: 'The observation period has ended. Record whether the animal stayed healthy and close the case.',
    items: list(needsOutcome.map(x => `${x.pet_name || 'Animal'} — ended ${fmtDate(x.observation_end)}`)), count: needsOutcome.length,
    actionView: 'outbreak', actionLabel: 'Close cases', signature: needsOutcome.map(x => x.id).sort().join('|'),
  });

  // ── 5. Livestock health clusters ──────────────────────────
  const sick = (inp.livestock || []).filter(l => /sick|diseas|ill|infect/i.test(String(l.health_status || '')));
  const sickByType: Record<string, number> = {};
  for (const l of sick) sickByType[l.animal_type || 'Livestock'] = (sickByType[l.animal_type || 'Livestock'] || 0) + (parseInt(l.quantity) || 1);
  for (const [type, n] of Object.entries(sickByType)) {
    if (n >= 3) push({
      id: `sick:${type}`, category: 'health', severity: 'warning',
      title: `${n} sick ${type.toLowerCase()} recorded`,
      message: 'Several sick animals of the same kind can be an early outbreak sign. Visit the farms and report to the CVO if symptoms match.',
      count: n, actionView: 'livestock', actionLabel: 'View livestock', signature: `${type}|${n}`, bonus: n,
    });
  }
  const deaths = (inp.livestockDeaths || []).filter(d => now - ts(d.date_reported) <= 14 * DAY);
  const deathsByType: Record<string, number> = {};
  for (const d of deaths) deathsByType[d.animal_type || 'Livestock'] = (deathsByType[d.animal_type || 'Livestock'] || 0) + (Number(d.quantity) || 1);
  for (const [type, n] of Object.entries(deathsByType)) {
    if (n >= 2) push({
      id: `deathcluster:${type}`, category: 'health', severity: 'critical',
      title: `${n} ${type.toLowerCase()} deaths in the last 14 days`,
      message: 'Repeated deaths in the same kind of animal may mean an outbreak. Verify the causes and notify the CVO.',
      count: n, actionView: 'livestock-death-validation', actionLabel: 'Review reports', signature: `${type}|${n}`, bonus: n * 3,
    });
  }

  // ── 6. Vaccination ────────────────────────────────────────
  const pets = (inp.pets || []).filter(p => !/dead|deceased|archiv/i.test(String(p.status || '')));
  if (pets.length) {
    const overdue = pets.filter(p => (p.next_vaccination_date && ts(p.next_vaccination_date) < now) || (p.vaccination_status && p.vaccination_status !== 'Vaccinated'));
    const dueSoon = pets.filter(p => p.next_vaccination_date && ts(p.next_vaccination_date) >= now && ts(p.next_vaccination_date) <= now + 14 * DAY);
    const vaccinated = pets.filter(p => p.vaccination_status === 'Vaccinated' && !(p.next_vaccination_date && ts(p.next_vaccination_date) < now)).length;
    const rate = Math.round((vaccinated / pets.length) * 100);
    if (overdue.length) push({
      id: 'vax:overdue', category: 'vaccination', severity: overdue.length / pets.length >= 0.5 ? 'warning' : 'info',
      title: `${plural(overdue.length, 'pet')} unvaccinated or overdue`,
      message: 'Remind the owners and bring them to the next vaccination drive.',
      items: list(overdue.map(p => `${p.pet_name || p.name || 'Pet'} — ${p.owner_name || 'owner n/a'}`)), count: overdue.length,
      actionView: 'vaccination', actionLabel: 'Vaccination records', signature: `${overdue.length}`, bonus: overdue.length / 2,
    });
    if (dueSoon.length) push({
      id: 'vax:duesoon', category: 'vaccination', severity: 'info',
      title: `${plural(dueSoon.length, 'pet')} due for vaccination within 14 days`,
      message: 'Give the owners an early reminder.',
      items: list(dueSoon.map(p => `${p.pet_name || 'Pet'} — due ${fmtDate(p.next_vaccination_date)}`)), count: dueSoon.length,
      actionView: 'vaccination', actionLabel: 'View', signature: `${dueSoon.length}`,
    });
    if (pets.length >= 5 && rate < 80) push({
      id: 'vax:coverage', category: 'vaccination', severity: rate < 50 ? 'warning' : 'info',
      title: `Vaccination coverage is ${rate}% (target 80%)`,
      message: `${Math.max(0, Math.ceil(pets.length * 0.8) - vaccinated)} more pets need vaccination to reach the target.`,
      actionView: 'schedule', actionLabel: 'See drives', signature: `${Math.floor(rate / 10)}`,
    });
  }

  // ── 7. Vaccination drives ─────────────────────────────────
  for (const s of (inp.schedules || []).filter(s => isActive(s.status) && (!s.barangay || same(s.barangay, b)))) {
    const t = ts(s.date); if (!isFinite(t)) continue;
    const days = Math.floor((t - new Date(new Date(now).toDateString()).getTime()) / DAY);
    if (days < 0 || days > 3) continue;
    const when = days === 0 ? 'TODAY' : days === 1 ? 'tomorrow' : `in ${days} days`;
    push({
      id: `drive:${s.id}`, category: 'schedule', severity: days === 0 ? 'warning' : 'info',
      title: `Vaccination drive ${when}${s.venue ? ` — ${s.venue}` : ''}`,
      message: `${fmtDate(s.date)}${s.time_start ? `, ${s.time_start}${s.time_end ? '–' + s.time_end : ''}` : ''}. ${Number(s.registered) || 0}/${Number(s.capacity) || 0} registered. Remind pet owners in your barangay.`,
      actionView: 'schedule', actionLabel: 'Open schedule', signature: `${s.date}|${s.registered}|${s.status}`,
    });
  }

  // ── 8. Pending validations (work waiting for the BAHW) ────
  const age = (d: any) => Math.floor((now - ts(d)) / DAY);
  const taskAlert = (id: string, rows: any[], noun: string, view: string, dateOf: (r: any) => any, nameOf: (r: any) => string, extraUrgent?: (r: any) => boolean) => {
    if (!rows.length) return;
    const old = rows.filter(r => (isFinite(ts(dateOf(r))) && age(dateOf(r)) >= 3) || (extraUrgent && extraUrgent(r)));
    push({
      id, category: 'task', severity: old.length ? 'warning' : 'info',
      title: `${plural(rows.length, noun)} waiting for your review`,
      message: old.length ? `${old.length} ${old.length === 1 ? 'has' : 'have'} been waiting 3+ days or ${old.length === 1 ? 'is' : 'are'} about to expire.` : 'Review and approve or reject them.',
      items: list(rows.map(nameOf)), count: rows.length, actionView: view, actionLabel: 'Review now', signature: `${rows.length}|${old.length}`, bonus: old.length * 3,
    });
  };
  taskAlert('task:petprereg', (inp.petPreRegs || []).filter(p => norm(p.status) === 'pending'), 'pet pre-registration', 'preregistered',
    r => r.submitted_date, r => `${r.pet_name || 'Pet'} — ${r.owner_name || ''}`.trim(),
    r => r.expires_at && ts(r.expires_at) - now <= 3 * DAY);
  taskAlert('task:lvprereg', (inp.livestockPreRegs || []).filter(p => norm(p.status) === 'pending'), 'livestock pre-registration', 'livestock-prereg',
    r => r.submitted_date, r => `${r.animal_type || 'Livestock'} ×${r.quantity || 1} — ${r.owner_name || ''}`.trim());
  taskAlert('task:petdeath', (inp.petDeaths || []).filter(p => norm(p.validation_status || 'pending') === 'pending'), 'pet death report', 'pet-death-validation',
    r => r.created_at, r => `${r.pet_name || r.species || 'Pet'} — ${r.owner_name || ''}`.trim());
  taskAlert('task:lvdeath', (inp.livestockDeaths || []).filter(p => norm(p.validation_status || 'pending') === 'pending'), 'livestock death report', 'livestock-death-validation',
    r => r.created_at || r.date_reported, r => `${r.animal_type || 'Livestock'} ×${r.quantity || 1} — ${r.owner_name || ''}`.trim());

  const lost = (inp.lostReports || []).filter(r => norm(r.type) === 'lost' && ['open', 'pending'].includes(norm(r.status)) && now - ts(r.date_reported) <= 14 * DAY);
  if (lost.length) push({
    id: 'task:lost', category: 'task', severity: 'info',
    title: `${plural(lost.length, 'lost animal report')} in your barangay`,
    message: 'Help look out for them and validate the reports.',
    items: list(lost.map(r => `${r.pet_name || r.species || 'Animal'}${r.last_seen_location ? ` — last seen ${r.last_seen_location}` : ''}`)), count: lost.length,
    actionView: 'lost-livestock', actionLabel: 'Review', signature: lost.map(r => r.id).sort().join('|'),
  });

  return out.sort((a, b2) => b2.score - a.score);
}

export const CATEGORY_LABEL: Record<AlertCategory, string> = {
  outbreak: 'Outbreak', health: 'Animal health', vaccination: 'Vaccination', task: 'To review', schedule: 'Drives',
};
