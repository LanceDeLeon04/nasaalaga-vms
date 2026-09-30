// ============================================================
// NASaAlaga AI Engine
// Lightweight, explainable, offline-capable analytics.
// No external API needed — runs entirely in the browser on
// data the system already has (inventory, transactions,
// deployments, coverage). Every output carries a plain-language
// "why" so staff can verify the recommendation.
// ============================================================

// ── Small stats helpers ──────────────────────────────────────
const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);
const mean = (a: number[]) => (a.length ? sum(a) / a.length : 0);
const std = (a: number[]) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(sum(a.map(x => (x - m) ** 2)) / (a.length - 1));
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const DAY = 86400000;

/** Simple linear regression slope/intercept for y over index x */
function linreg(y: number[]) {
  const n = y.length;
  if (n < 2) return { slope: 0, intercept: y[0] || 0 };
  const xs = y.map((_, i) => i);
  const mx = mean(xs), my = mean(y);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (y[i] - my); den += (xs[i] - mx) ** 2; }
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: my - slope * mx };
}

// ── Types ────────────────────────────────────────────────────
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'ok';

export interface ForecastResult {
  dailyRate: number;        // expected units/day going forward
  trendPct: number;         // % change per 30d vs. prior baseline
  volatility: number;       // std of daily usage
  confidence: number;       // 0-100
  dataDays: number;         // days of history used
  totalUsed: number;
  series: number[];         // weekly buckets (oldest → newest) for sparkline
  method: string;
}

export interface ItemInsight {
  id: string;
  name: string;
  type: 'medicine' | 'supply';
  category: string;
  qty: number;
  unitCost: number;
  reorderLevel: number;
  forecast: ForecastResult;
  daysOfCover: number | null;       // null = no measurable usage
  stockoutDate: Date | null;
  safetyStock: number;
  reorderPoint: number;             // AI-derived (replaces static reorder level)
  suggestedOrderQty: number;
  suggestedOrderCost: number;
  expiryDate: Date | null;
  daysToExpiry: number | null;
  unitsAtRiskOfExpiry: number;      // units unlikely to be used before expiry
  valueAtRisk: number;
  anomaly: { flagged: boolean; direction: 'spike' | 'drop' | null; z: number; note: string };
  abc: 'A' | 'B' | 'C';
  severity: Severity;
  riskScore: number;                // 0-100
  action: string;                   // headline recommendation
  reasons: string[];                // explainability
  staticReorderMismatch: 'too_low' | 'too_high' | null;
}

export interface AnalyticsOptions {
  leadTimeDays: number;     // supplier lead time
  coverTargetDays: number;  // how many days of stock to hold after reorder
  serviceLevelZ: number;    // 1.28 = 90%, 1.65 = 95%, 2.05 = 98%
  historyDays: number;      // lookback window
}
export const DEFAULT_OPTIONS: AnalyticsOptions = {
  leadTimeDays: 14, coverTargetDays: 60, serviceLevelZ: 1.65, historyDays: 90,
};

// ── Consumption extraction ───────────────────────────────────
const OUT_TYPES = new Set(['OUT', 'out', 'dispense', 'dispense_pet', 'dispense_livestock', 'outbreak_dispatch', 'dispatch', 'expired', 'disposal']);
const isOut = (t: any) => OUT_TYPES.has(String(t?.transaction_type || '')) || /out|dispens|dispatch/i.test(String(t?.transaction_type || ''));
// Expired/disposal removals are waste, not demand — don't let them inflate the forecast
const isWaste = (t: any) => /expire|dispos|waste|damag/i.test(String(t?.transaction_type || '') + ' ' + String(t?.reason || ''));

export function dailyUsageSeries(transactions: any[], itemId: string, days: number, now = Date.now()): number[] {
  const buckets = new Array(days).fill(0);
  for (const t of transactions) {
    if (String(t.item_id) !== String(itemId) || !isOut(t) || isWaste(t)) continue;
    const ts = new Date(t.created_at).getTime();
    if (!isFinite(ts)) continue;
    const ago = Math.floor((now - ts) / DAY);
    if (ago >= 0 && ago < days) buckets[days - 1 - ago] += Math.abs(Number(t.quantity) || 0);
  }
  return buckets;
}

/**
 * Demand forecast: blends an exponentially-weighted moving average (recent
 * behaviour) with a regression trend on weekly buckets (direction).
 * Confidence falls with sparse data and high volatility.
 */
export function forecastDemand(daily: number[]): ForecastResult {
  const n = daily.length;
  // trim leading zero-days so new items don't look artificially slow
  const firstNonZero = daily.findIndex(v => v > 0);
  const used = firstNonZero === -1 ? [] : daily.slice(firstNonZero);
  const dataDays = used.length;
  const totalUsed = sum(daily);

  if (dataDays === 0) {
    return { dailyRate: 0, trendPct: 0, volatility: 0, confidence: 0, dataDays: 0, totalUsed: 0, series: [], method: 'No usage history' };
  }

  // Weekly buckets
  const weeks: number[] = [];
  for (let i = used.length; i > 0; i -= 7) weeks.unshift(sum(used.slice(Math.max(0, i - 7), i)));
  const weeklyPerDay = weeks.map((w, i) => w / (i === 0 ? Math.min(7, used.length - (weeks.length - 1) * 7 || 7) || 7 : 7));

  // Winsorize: cap any week at 2.5× the median week so one outbreak/campaign spike
  // can't dominate the baseline (spikes are reported separately as anomalies).
  const sortedW = [...weeklyPerDay].sort((a, b) => a - b);
  const med = sortedW[Math.floor(sortedW.length / 2)] || 0;
  const cap = weeklyPerDay.length >= 4 && med > 0 ? med * 2.5 : Infinity;
  const wk = weeklyPerDay.map(v => Math.min(v, cap));

  // EWMA over weekly rate (alpha favours recent weeks)
  const alpha = 0.4;
  let ew = wk[0];
  for (let i = 1; i < wk.length; i++) ew = alpha * wk[i] + (1 - alpha) * ew;

  // Trend (damped so one noisy week can't explode the forecast)
  const { slope } = linreg(wk);
  const baseline = mean(wk) || 1e-9;
  const trendPerWeek = clamp(slope / baseline, -0.25, 0.25);
  const trendPct = weeks.length >= 3 ? trendPerWeek * 4.3 * 100 : 0; // ≈ per 30 days

  const dampedTrend = weeks.length >= 3 ? 1 + trendPerWeek * 2 : 1; // look ~2 weeks ahead
  const dailyRate = Math.max(0, ew * dampedTrend);

  const vol = std(used);
  const cv = dailyRate > 0 ? vol / (mean(used) || 1) : 0;
  const dataScore = clamp(dataDays / 60, 0, 1) * 60;          // up to 60 pts for history depth
  const stabilityScore = clamp(1 - cv / 3, 0, 1) * 40;         // up to 40 pts for low noise
  const confidence = Math.round(dataScore + stabilityScore);

  return {
    dailyRate, trendPct, volatility: vol, confidence, dataDays, totalUsed,
    series: weeks.slice(-12),
    method: weeks.length >= 3 ? 'EWMA + damped trend' : 'Average (limited history)',
  };
}

// ── Per-item analysis ────────────────────────────────────────
function severityFrom(score: number): Severity {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 35) return 'medium';
  if (score >= 15) return 'low';
  return 'ok';
}

export function analyzeItem(
  item: any, type: 'medicine' | 'supply', transactions: any[],
  opts: AnalyticsOptions = DEFAULT_OPTIONS, now = Date.now(),
): ItemInsight {
  const qty = Number(item.quantity) || 0;
  const unitCost = Number(item.unit_cost) || 0;
  const reorderLevel = Number(item.reorder_level) || 0;
  const daily = dailyUsageSeries(transactions, item.id, opts.historyDays, now);
  const fc = forecastDemand(daily);
  const reasons: string[] = [];

  // Days of cover / stockout
  const daysOfCover = fc.dailyRate > 0.001 ? qty / fc.dailyRate : null;
  const stockoutDate = daysOfCover !== null ? new Date(now + daysOfCover * DAY) : null;

  // Safety stock & AI reorder point (standard: demand during lead time + z·σ·√L)
  const sigma = fc.volatility;
  const safetyStock = Math.ceil(opts.serviceLevelZ * sigma * Math.sqrt(opts.leadTimeDays));
  const reorderPoint = Math.ceil(fc.dailyRate * opts.leadTimeDays + safetyStock);

  // Suggested order to reach target cover, net of what's already on hand
  const targetStock = Math.ceil(fc.dailyRate * (opts.leadTimeDays + opts.coverTargetDays) + safetyStock);
  let suggestedOrderQty = Math.max(0, targetStock - qty);
  if (fc.dailyRate === 0 && qty <= reorderLevel && reorderLevel > 0) suggestedOrderQty = Math.max(reorderLevel * 2 - qty, reorderLevel);

  // Expiry waste risk (FEFO): what can't be consumed before expiry?
  const expiryDate = item.expiry_date ? new Date(item.expiry_date) : null;
  const daysToExpiry = expiryDate && isFinite(expiryDate.getTime()) ? Math.ceil((expiryDate.getTime() - now) / DAY) : null;
  let unitsAtRiskOfExpiry = 0;
  if (daysToExpiry !== null) {
    if (daysToExpiry <= 0) unitsAtRiskOfExpiry = qty;
    else unitsAtRiskOfExpiry = Math.max(0, Math.ceil(qty - fc.dailyRate * daysToExpiry));
  }
  const valueAtRisk = unitsAtRiskOfExpiry * unitCost;

  // Anomaly: last 7 days vs. prior baseline (z-score on daily usage)
  const recent = daily.slice(-7), base = daily.slice(0, -7);
  const baseMean = mean(base), baseStd = std(base);
  const recentMean = mean(recent);
  const z = baseStd > 0 ? (recentMean - baseMean) / (baseStd / Math.sqrt(7)) : 0;
  let anomaly: ItemInsight['anomaly'] = { flagged: false, direction: null, z: 0, note: '' };
  if (fc.dataDays >= 21 && baseMean > 0) {
    if (z >= 3 && recentMean > baseMean * 1.5) anomaly = { flagged: true, direction: 'spike', z, note: `Usage last 7d is ${(recentMean / baseMean).toFixed(1)}× the normal rate — possible outbreak, campaign, or mis-logged dispense.` };
    else if (z <= -3 && recentMean < baseMean * 0.4) anomaly = { flagged: true, direction: 'drop', z, note: `Usage dropped to ${Math.round((recentMean / baseMean) * 100)}% of normal — check for missed logging or a paused program.` };
  }

  // Scoring
  let risk = 0;
  if (qty === 0) { risk += 60; reasons.push('Out of stock.'); }
  if (daysOfCover !== null) {
    if (daysOfCover <= opts.leadTimeDays) { risk += 50; reasons.push(`Only ${Math.floor(daysOfCover)} days of cover — less than the ${opts.leadTimeDays}-day supplier lead time.`); }
    else if (daysOfCover <= opts.leadTimeDays + 14) { risk += 30; reasons.push(`${Math.floor(daysOfCover)} days of cover — order soon to avoid a gap.`); }
    else if (daysOfCover <= opts.leadTimeDays + opts.coverTargetDays / 2) { risk += 12; }
  } else if (qty <= reorderLevel && reorderLevel > 0) { risk += 25; reasons.push('Below static reorder level (no recent usage to forecast from).'); }
  if (fc.trendPct > 20 && fc.dataDays >= 21) { risk += 10; reasons.push(`Demand rising ~${Math.round(fc.trendPct)}%/month.`); }
  if (anomaly.flagged && anomaly.direction === 'spike') { risk += 15; reasons.push(anomaly.note); }
  if (daysToExpiry !== null && daysToExpiry <= 0 && qty > 0) { risk += 40; reasons.push('Stock is expired — quarantine and dispose.'); }
  else if (unitsAtRiskOfExpiry > 0 && daysToExpiry !== null && daysToExpiry <= 120) {
    const share = qty > 0 ? unitsAtRiskOfExpiry / qty : 0;
    risk += Math.round(clamp(share, 0, 1) * 30);
    reasons.push(`~${unitsAtRiskOfExpiry} unit(s) (₱${Math.round(valueAtRisk).toLocaleString()}) unlikely to be used before expiry in ${daysToExpiry}d.`);
  }
  const riskScore = clamp(Math.round(risk), 0, 100);

  // Recommended action (most urgent first)
  let action = 'Stock healthy — no action needed.';
  if (daysToExpiry !== null && daysToExpiry <= 0 && qty > 0) action = 'Remove expired stock';
  else if (qty === 0 || (daysOfCover !== null && daysOfCover <= opts.leadTimeDays)) action = suggestedOrderQty > 0 ? `Order ${suggestedOrderQty} now` : 'Reorder now';
  else if (daysOfCover !== null && daysOfCover <= opts.leadTimeDays + 14) action = `Order ${suggestedOrderQty} within a week`;
  else if (unitsAtRiskOfExpiry > 0 && daysToExpiry !== null && daysToExpiry <= 120 && unitsAtRiskOfExpiry >= qty * 0.25) action = 'Redistribute / use first (FEFO) — expiry risk';
  else if (anomaly.flagged) action = anomaly.direction === 'spike' ? 'Investigate usage spike' : 'Verify usage logging';
  else if (qty > 0 && daysOfCover !== null && daysOfCover > 240) { action = 'Overstocked — pause purchasing'; reasons.push(`${Math.round(daysOfCover)} days of cover is far above the ${opts.coverTargetDays}-day target.`); }
  if (reasons.length === 0 && fc.dailyRate > 0) reasons.push(`Using ~${fc.dailyRate.toFixed(1)}/day; ${daysOfCover !== null ? Math.round(daysOfCover) : '—'} days of cover.`);

  // Compare to the static reorder level
  let staticReorderMismatch: ItemInsight['staticReorderMismatch'] = null;
  if (fc.confidence >= 40 && fc.dailyRate > 0) {
    if (reorderPoint > reorderLevel * 1.5 + 2) staticReorderMismatch = 'too_low';
    else if (reorderLevel > reorderPoint * 2 + 5) staticReorderMismatch = 'too_high';
  }

  return {
    id: item.id, name: item.name, type, category: item.category || item.type || 'General',
    qty, unitCost, reorderLevel, forecast: fc, daysOfCover, stockoutDate,
    safetyStock, reorderPoint, suggestedOrderQty, suggestedOrderCost: suggestedOrderQty * unitCost,
    expiryDate: expiryDate && isFinite(expiryDate.getTime()) ? expiryDate : null,
    daysToExpiry, unitsAtRiskOfExpiry, valueAtRisk, anomaly,
    abc: 'C', severity: severityFrom(riskScore), riskScore, action, reasons, staticReorderMismatch,
  };
}

/** Analyse a whole catalogue and assign ABC classes by annual consumption value (Pareto 80/15/5). */
export function analyzeInventory(
  medicines: any[], supplies: any[], transactions: any[],
  opts: AnalyticsOptions = DEFAULT_OPTIONS,
): ItemInsight[] {
  const now = Date.now();
  const all = [
    ...medicines.filter(m => m.status !== 'Inactive').map(m => analyzeItem(m, 'medicine', transactions, opts, now)),
    ...supplies.filter(s => s.status !== 'Inactive').map(s => analyzeItem(s, 'supply', transactions, opts, now)),
  ];
  const annual = (i: ItemInsight) => i.forecast.dailyRate * 365 * (i.unitCost || 1);
  const sorted = [...all].sort((a, b) => annual(b) - annual(a));
  const total = sum(sorted.map(annual)) || 1;
  let cum = 0;
  for (const i of sorted) {
    const before = cum / total;
    cum += annual(i);
    i.abc = annual(i) === 0 ? 'C' : before < 0.8 ? 'A' : before < 0.95 ? 'B' : 'C';
  }
  return all.sort((a, b) => b.riskScore - a.riskScore);
}

// ── Budget-aware purchase plan ───────────────────────────────
export interface PurchaseLine { insight: ItemInsight; qty: number; cost: number; funded: 'full' | 'partial' | 'none'; }
/**
 * Fund the most urgent lines first within a budget. Critical/high items get
 * priority; partial funding covers at least the lead-time demand when possible.
 */
export function buildPurchasePlan(insights: ItemInsight[], budget: number, opts: AnalyticsOptions = DEFAULT_OPTIONS) {
  const needs = insights
    .filter(i => i.suggestedOrderQty > 0 && (i.severity === 'critical' || i.severity === 'high' || i.severity === 'medium'))
    .sort((a, b) => b.riskScore - a.riskScore || (a.daysOfCover ?? 1e9) - (b.daysOfCover ?? 1e9));
  let remaining = budget;
  const lines: PurchaseLine[] = [];
  for (const i of needs) {
    const full = i.suggestedOrderCost;
    if (i.unitCost <= 0 || full <= remaining) { lines.push({ insight: i, qty: i.suggestedOrderQty, cost: full, funded: 'full' }); remaining -= full; continue; }
    const minQty = Math.ceil(i.forecast.dailyRate * opts.leadTimeDays) + i.safetyStock;
    const affordable = Math.floor(remaining / i.unitCost);
    const urgent = i.severity === 'critical' || i.severity === 'high';
    if (affordable > 0 && (urgent || affordable >= Math.min(minQty, i.suggestedOrderQty) * 0.5)) {
      lines.push({ insight: i, qty: affordable, cost: affordable * i.unitCost, funded: 'partial' }); remaining -= affordable * i.unitCost;
    } else lines.push({ insight: i, qty: 0, cost: 0, funded: 'none' });
  }
  return { lines, spent: budget - remaining, remaining, unfunded: lines.filter(l => l.funded === 'none').length };
}

// ── Smart Allocation (resource deployment) ───────────────────
export interface AllocDeployment {
  id: string; barangay: string; riskScore: number; urgency: string;
  targetAnimals: number; staffNeeded: number;
  medicineEstimate: { vaccines: number; antibiotics: number; vitamins: number };
  status: string;
}
export interface AllocContext {
  stock: { vaccines: number; antibiotics: number; vitamins: number };
  staffAvailable: number;
  reservePct: number;                          // % of stock held back for emergencies
  coverageByBarangay: Record<string, number>;  // vaccination rate 0-100 (optional)
  usageByBarangay: Record<string, number>;     // recent medicine usage (optional)
}
export interface AllocResult {
  id: string; barangay: string; priorityScore: number; rank: number;
  staff: number; staffNeeded: number;
  vaccines: number; antibiotics: number; vitamins: number;
  fillRate: number;                            // % of requested resources granted
  shortfall: { staff: number; vaccines: number; antibiotics: number; vitamins: number };
  factors: { label: string; value: string; weight: number }[];
  rationale: string;
}

const URGENCY_W: Record<string, number> = { 'Immediate': 1, 'Within 3 Days': 0.6, 'Within 1 Week': 0.3 };

/** Priority-weighted water-filling with largest-remainder rounding; each area capped at its demand. */
function waterFill(demands: number[], weights: number[], supply: number): number[] {
  const n = demands.length;
  const alloc = new Array(n).fill(0);
  let remaining = Math.floor(supply);
  let active = demands.map((d, i) => (d > 0 ? i : -1)).filter(i => i >= 0);
  while (remaining > 0 && active.length) {
    const wSum = sum(active.map(i => weights[i])) || 1;
    let given = 0;
    const capped: number[] = [];
    for (const i of active) {
      const share = (remaining * weights[i]) / wSum;
      const room = demands[i] - alloc[i];
      const g = Math.min(share, room);
      alloc[i] += g; given += g;
      if (alloc[i] >= demands[i] - 1e-9) capped.push(i);
    }
    remaining -= given;
    active = active.filter(i => !capped.includes(i));
    if (given < 1e-6) break;
  }
  // largest-remainder rounding, never exceeding demand or supply
  const floors = alloc.map(Math.floor);
  let left = Math.min(Math.floor(supply), Math.round(sum(alloc))) - sum(floors);
  const order = alloc.map((a, i) => ({ i, r: a - Math.floor(a) })).sort((x, y) => y.r - x.r);
  for (const { i } of order) { if (left <= 0) break; if (floors[i] < demands[i]) { floors[i]++; left--; } }
  return floors;
}

export function smartAllocate(deps: AllocDeployment[], ctx: AllocContext): AllocResult[] {
  const active = deps.filter(d => d.status !== 'completed');
  if (!active.length) return [];

  const maxAnimals = Math.max(...active.map(d => d.targetAnimals), 1);
  const maxUsage = Math.max(...active.map(d => ctx.usageByBarangay[d.barangay] || 0), 1);

  // Priority score (0-100): risk, coverage gap, animal population, urgency, recent demand
  const scored = active.map(d => {
    const cov = ctx.coverageByBarangay[d.barangay];
    const gap = cov === undefined ? 0.5 : clamp(1 - cov / 100, 0, 1);
    const f = [
      { label: 'Outbreak risk', raw: clamp(d.riskScore / 100, 0, 1), weight: 0.40, value: `${d.riskScore}/100` },
      { label: 'Vaccination gap', raw: gap, weight: 0.25, value: cov === undefined ? 'unknown' : `${Math.round(cov)}% covered` },
      { label: 'Animals at stake', raw: d.targetAnimals / maxAnimals, weight: 0.15, value: d.targetAnimals.toLocaleString() },
      { label: 'Urgency', raw: URGENCY_W[d.urgency] ?? 0.3, weight: 0.12, value: d.urgency },
      { label: 'Recent demand', raw: (ctx.usageByBarangay[d.barangay] || 0) / maxUsage, weight: 0.08, value: `${ctx.usageByBarangay[d.barangay] || 0} used` },
    ];
    const priorityScore = Math.round(sum(f.map(x => x.raw * x.weight)) * 100);
    return { d, f, priorityScore };
  }).sort((a, b) => b.priorityScore - a.priorityScore);

  // Weights sharpen the ranking so high-priority areas are filled first
  const weights = scored.map(s => Math.pow(Math.max(s.priorityScore, 5) / 100, 2));
  const usable = (n: number) => Math.floor(n * (1 - clamp(ctx.reservePct, 0, 60) / 100));

  const staff = waterFill(scored.map(s => s.d.staffNeeded), weights, ctx.staffAvailable);
  const vax = waterFill(scored.map(s => s.d.medicineEstimate.vaccines), weights, usable(ctx.stock.vaccines));
  const abx = waterFill(scored.map(s => s.d.medicineEstimate.antibiotics), weights, usable(ctx.stock.antibiotics));
  const vit = waterFill(scored.map(s => s.d.medicineEstimate.vitamins), weights, usable(ctx.stock.vitamins));

  return scored.map((s, idx) => {
    const d = s.d, m = d.medicineEstimate;
    const requested = d.staffNeeded + m.vaccines + m.antibiotics + m.vitamins;
    const granted = staff[idx] + vax[idx] + abx[idx] + vit[idx];
    const fillRate = requested > 0 ? Math.round((granted / requested) * 100) : 100;
    const shortfall = {
      staff: d.staffNeeded - staff[idx], vaccines: m.vaccines - vax[idx],
      antibiotics: m.antibiotics - abx[idx], vitamins: m.vitamins - vit[idx],
    };
    const top = [...s.f].sort((a, b) => b.raw * b.weight - a.raw * a.weight).slice(0, 2).map(x => x.label.toLowerCase());
    const short = shortfall.staff > 0 || shortfall.vaccines > 0 || shortfall.antibiotics > 0 || shortfall.vitamins > 0;
    return {
      id: d.id, barangay: d.barangay, priorityScore: s.priorityScore, rank: idx + 1,
      staff: staff[idx], staffNeeded: d.staffNeeded, vaccines: vax[idx], antibiotics: abx[idx], vitamins: vit[idx],
      fillRate, shortfall,
      factors: s.f.map(x => ({ label: x.label, value: x.value, weight: x.weight })),
      rationale: `Ranked #${idx + 1} mainly due to ${top.join(' and ')}. ${short ? `Only ${fillRate}% of the request can be met from current stock/staff — top up before deployment.` : 'Fully supplied from current stock and staff.'}`,
    };
  });
}
