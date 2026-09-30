import { useMemo, useState } from 'react';
import {
  Sparkles, TrendingUp, TrendingDown, AlertTriangle, ShieldAlert, Clock, DollarSign,
  ShoppingCart, Settings2, Activity, PackageX, Layers, ChevronDown, ChevronUp, Info, Target, X, ArrowLeft, MousePointerClick,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList } from 'recharts';
import {
  analyzeInventory, buildPurchasePlan, DEFAULT_OPTIONS,
  type AnalyticsOptions, type ItemInsight, type Severity,
} from '../lib/aiEngine';

interface Props {
  medicines: any[];
  supplies: any[];
  transactions: any[];
  programs: any[];
  onOrder: (prefill: any) => void;
  canEdit: boolean;
}

const SEV: Record<Severity, { label: string; chip: string; bar: string }> = {
  critical: { label: 'Critical', chip: 'bg-red-100 text-red-700', bar: '#ef4444' },
  high:     { label: 'High',     chip: 'bg-orange-100 text-orange-700', bar: '#f97316' },
  medium:   { label: 'Medium',   chip: 'bg-amber-100 text-amber-700', bar: '#f59e0b' },
  low:      { label: 'Low',      chip: 'bg-blue-100 text-blue-700', bar: '#60a5fa' },
  ok:       { label: 'Healthy',  chip: 'bg-green-100 text-green-700', bar: '#60A85C' },
};
const ABC_LEGEND = [
  { k: 'A', title: 'Most important — biggest share of usage. Never let these run out.', desc: 'About 80% of yearly usage value' },
  { k: 'B', title: 'Moderately important — keep an eye on them.', desc: 'About the next 15%' },
  { k: 'C', title: 'Least important — low usage or none. Simple reordering is fine.', desc: 'The last 5%, or no recent use' },
];
const SEV_LEGEND: { s: Severity; desc: string }[] = [
  { s: 'critical', desc: 'Out of stock or will run out before a delivery can arrive' },
  { s: 'high', desc: 'Order within days' },
  { s: 'medium', desc: 'Order within a week or two' },
  { s: 'low', desc: 'Minor watch item' },
  { s: 'ok', desc: 'Healthy' },
];
const peso = (n: number) => `₱${Math.round(n).toLocaleString('en-PH')}`;

function Spark({ data, color = '#2B5EA6' }: { data: number[]; color?: string }) {
  if (data.length < 2) return <span className="text-[10px] text-gray-300">no trend</span>;
  const max = Math.max(...data, 1), w = 64, h = 20;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 2) - 1}`).join(' ');
  return <svg width={w} height={h}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" /></svg>;
}

function Kpi({ icon: Icon, label, value, sub, tone }: { icon: any; label: string; value: string | number; sub?: string; tone: string }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${tone}`}>
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide opacity-80"><Icon className="w-3.5 h-3.5" />{label}</div>
      <p className="text-2xl font-black mt-1">{value}</p>
      {sub && <p className="text-[11px] opacity-70 mt-0.5">{sub}</p>}
    </div>
  );
}

export function InventoryAIAnalytics({ medicines, supplies, transactions, programs, onOrder, canEdit }: Props) {
  const [opts, setOpts] = useState<AnalyticsOptions>(DEFAULT_OPTIONS);
  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState<'attention' | 'all' | Severity>('attention');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ kind: 'item'; id: string; from?: 'A' | 'B' | 'C' } | { kind: 'class'; k: 'A' | 'B' | 'C' } | null>(null);

  const totalBalance = useMemo(
    () => programs.flatMap((p: any) => p.line_items || []).reduce((s: number, li: any) => s + Math.max(0, Number(li.allotment) - Number(li.utilized) - Number(li.obligated)), 0),
    [programs],
  );
  const [budgetOverride, setBudgetOverride] = useState<string>('');
  const budget = budgetOverride !== '' ? Number(budgetOverride) : totalBalance;

  const insights = useMemo(() => analyzeInventory(medicines, supplies, transactions, opts), [medicines, supplies, transactions, opts]);
  const plan = useMemo(() => buildPurchasePlan(insights, budget, opts), [insights, budget, opts]);

  const attention = insights.filter(i => i.severity === 'critical' || i.severity === 'high' || i.severity === 'medium');
  const stockout30 = insights.filter(i => i.daysOfCover !== null && i.daysOfCover <= 30 && i.qty >= 0);
  const valueAtRisk = insights.reduce((s, i) => s + i.valueAtRisk, 0);
  const anomalies = insights.filter(i => i.anomaly.flagged);
  const tuning = insights.filter(i => i.staticReorderMismatch);
  const overstock = insights.filter(i => i.daysOfCover !== null && i.daysOfCover > 240 && i.qty > 0);
  const totalNeed = insights.reduce((s, i) => s + (i.severity !== 'ok' && i.severity !== 'low' ? i.suggestedOrderCost : 0), 0);
  const withHistory = insights.filter(i => i.forecast.dataDays >= 14).length;

  const visible = insights.filter(i => filter === 'all' ? true : filter === 'attention' ? (i.severity === 'critical' || i.severity === 'high' || i.severity === 'medium') : i.severity === filter);

  const coverChart = [...insights].filter(i => i.daysOfCover !== null && i.qty > 0).sort((a, b) => (a.daysOfCover as number) - (b.daysOfCover as number)).slice(0, 10)
    .map(i => ({ id: i.id, name: i.name.length > 18 ? i.name.slice(0, 17) + '…' : i.name, days: Math.max(0, Math.round(i.daysOfCover as number)), label: `${Math.round(i.daysOfCover as number)} days`, fill: SEV[i.severity].bar }));
  const outOfStock = insights.filter(i => i.qty === 0);
  const annualValue = (i: ItemInsight) => i.forecast.dailyRate * 365 * (i.unitCost || 1);
  const totalAnnual = insights.reduce((s, i) => s + annualValue(i), 0) || 1;
  const abcInfo = (['A', 'B', 'C'] as const).map(k => {
    const items = insights.filter(i => i.abc === k).sort((a, b) => annualValue(b) - annualValue(a));
    return { k, items, share: (items.reduce((s, i) => s + annualValue(i), 0) / totalAnnual) * 100 };
  });
  const abcColors: Record<string, string> = { A: '#2B5EA6', B: '#60A85C', C: '#94a3b8' };
  const detailItem = detail && detail.kind === 'item' ? insights.find(i => i.id === detail.id) : null;

  // Plain-language executive summary
  const summary = useMemo(() => {
    const lines: string[] = [];
    const crit = insights.filter(i => i.severity === 'critical');
    if (crit.length) lines.push(`${crit.length} item${crit.length > 1 ? 's are' : ' is'} at critical risk — ${crit.slice(0, 3).map(i => i.name).join(', ')}${crit.length > 3 ? ' and more' : ''} could run out before a new order arrives.`);
    if (stockout30.length) lines.push(`${stockout30.length} item${stockout30.length > 1 ? 's are' : ' is'} projected to stock out within 30 days at the current usage rate.`);
    if (valueAtRisk > 0) lines.push(`About ${peso(valueAtRisk)} of stock is unlikely to be used before it expires — use it first or redistribute.`);
    if (anomalies.length) lines.push(`${anomalies.length} unusual usage pattern${anomalies.length > 1 ? 's' : ''} detected (${anomalies.filter(a => a.anomaly.direction === 'spike').length} spike${anomalies.filter(a => a.anomaly.direction === 'spike').length === 1 ? '' : 's'}).`);
    if (totalNeed > budget && budget > 0) lines.push(`Recommended purchases (${peso(totalNeed)}) exceed available budget (${peso(budget)}) — the plan below funds the most urgent items first.`);
    if (!lines.length) lines.push('No urgent problems detected. Inventory levels look healthy against current demand.');
    return lines;
  }, [insights, stockout30, valueAtRisk, anomalies, totalNeed, budget]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-[#2B5EA6] text-white"><Sparkles className="w-5 h-5" /></div>
          <div>
            <h3 className="font-bold text-gray-900">AI Inventory Analytics</h3>
            <p className="text-xs text-gray-500">Demand forecasting, stock-out prediction, expiry risk and smart reordering — learned from your dispensing history.</p>
          </div>
        </div>
        <button onClick={() => setShowSettings(s => !s)} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50">
          <Settings2 className="w-3.5 h-3.5" />Model settings{showSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {showSettings && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
          {[
            { k: 'leadTimeDays', label: 'Supplier lead time (days)', min: 1, max: 90 },
            { k: 'coverTargetDays', label: 'Target cover after reorder (days)', min: 14, max: 180 },
            { k: 'historyDays', label: 'History window (days)', min: 30, max: 365 },
          ].map(f => (
            <label key={f.k} className="text-xs font-semibold text-gray-600">{f.label}
              <input type="number" min={f.min} max={f.max} value={(opts as any)[f.k]}
                onChange={e => setOpts(o => ({ ...o, [f.k]: Math.max(f.min, Math.min(f.max, Number(e.target.value) || f.min)) }))}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none" />
            </label>
          ))}
          <label className="text-xs font-semibold text-gray-600">Service level
            <select value={opts.serviceLevelZ} onChange={e => setOpts(o => ({ ...o, serviceLevelZ: Number(e.target.value) }))} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none">
              <option value={1.28}>90% — lean</option><option value={1.65}>95% — balanced</option><option value={2.05}>98% — cautious (vaccines)</option>
            </select>
          </label>
        </div>
      )}

      {/* Executive summary */}
      <div className="bg-gradient-to-br from-violet-50 via-white to-blue-50 border border-violet-200 rounded-2xl p-5">
        <p className="text-xs font-bold text-violet-700 uppercase tracking-wide flex items-center gap-1.5 mb-2"><Sparkles className="w-3.5 h-3.5" />AI Summary</p>
        <ul className="space-y-1.5">{summary.map((s, i) => <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-violet-400">•</span>{s}</li>)}</ul>
        {withHistory < insights.length * 0.5 && (
          <p className="mt-3 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex gap-2"><Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />Only {withHistory} of {insights.length} items have 2+ weeks of dispensing history, so some forecasts have low confidence. Accuracy improves automatically as more transactions are logged.</p>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={ShieldAlert} label="Needs attention" value={attention.length} sub={`${insights.filter(i => i.severity === 'critical').length} critical`} tone="bg-red-50 border-red-100 text-red-700" />
        <Kpi icon={PackageX} label="Stock-out ≤ 30d" value={stockout30.length} sub="at current usage" tone="bg-orange-50 border-orange-100 text-orange-700" />
        <Kpi icon={Clock} label="Expiry waste risk" value={peso(valueAtRisk)} sub="unlikely to be used in time" tone="bg-amber-50 border-amber-100 text-amber-700" />
        <Kpi icon={DollarSign} label="Recommended buy" value={peso(totalNeed)} sub={`Budget ${peso(budget)}`} tone="bg-blue-50 border-blue-100 text-blue-700" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 border border-gray-100 rounded-xl p-4">
          <p className="text-sm font-bold text-gray-800">Which items will run out first?</p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Each bar shows <b>how many days the stock you have now will last</b>, based on how fast it is normally used.
            The <span className="text-red-600 font-semibold">red dashed line</span> is your supplier delivery time ({opts.leadTimeDays} days):
            a bar <b>shorter than the line</b> means it will run out <b>before a new order can arrive</b> — order it now.
          </p>
          <p className="text-[11px] text-[#2B5EA6] font-semibold mt-1 flex items-center gap-1"><MousePointerClick className="w-3 h-3" />Click any bar to see the details.</p>
          {coverChart.length === 0 ? <p className="text-xs text-gray-400 py-10 text-center">Not enough usage history yet to estimate how long stock will last.</p> : (
            <ResponsiveContainer width="100%" height={Math.max(220, coverChart.length * 30 + 40)}>
              <BarChart data={coverChart} layout="vertical" margin={{ left: 10, right: 60, top: 15 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, (max: number) => Math.max(max, opts.leadTimeDays * 1.5)]} label={{ value: 'Days the stock will last', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#9ca3af' }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: 'rgba(43,94,166,0.06)' }} formatter={(v: any) => [`${v} days left`, 'Stock will last']} />
                <ReferenceLine x={opts.leadTimeDays} stroke="#ef4444" strokeDasharray="5 4" label={{ value: `Delivery time ${opts.leadTimeDays}d`, position: 'top', fontSize: 10, fill: '#ef4444' }} />
                <Bar dataKey="days" radius={[0, 6, 6, 0]} cursor="pointer" onClick={(d: any) => setDetail({ kind: 'item', id: d.id ?? d.payload?.id })}>
                  {coverChart.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  <LabelList dataKey="label" position="right" style={{ fontSize: 11, fill: '#4b5563', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {outOfStock.length > 0 && (
            <button onClick={() => setFilter('critical')} className="mt-2 w-full text-left text-xs bg-red-50 border border-red-100 text-red-700 rounded-lg px-3 py-2">
              <b>{outOfStock.length} item{outOfStock.length > 1 ? 's are' : ' is'} already out of stock</b> and not shown above ({outOfStock.slice(0, 3).map(i => i.name).join(', ')}{outOfStock.length > 3 ? '…' : ''}). Click to see them below.
            </button>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-gray-50">
            {SEV_LEGEND.map(l => (
              <span key={l.s} title={l.desc} className="flex items-center gap-1.5 text-[11px] text-gray-500"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: SEV[l.s].bar }} />{SEV[l.s].label}</span>
            ))}
          </div>
        </div>

        <div className="border border-gray-100 rounded-xl p-4">
          <p className="text-sm font-bold text-gray-800">Which items matter most?</p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Items are grouped by how much of your yearly spending they use up. A few items usually account for most of it — <b>protect those first</b>.
          </p>
          <p className="text-[11px] text-[#2B5EA6] font-semibold mt-1 flex items-center gap-1"><MousePointerClick className="w-3 h-3" />Click a group to see its items.</p>
          <div className="space-y-2.5 mt-3">
            {abcInfo.map(g => {
              const l = ABC_LEGEND.find(x => x.k === g.k)!;
              return (
                <button key={g.k} onClick={() => setDetail({ kind: 'class', k: g.k })} className="w-full text-left border border-gray-100 rounded-xl p-3 hover:border-[#2B5EA6]/40 hover:bg-blue-50/30 transition">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg text-white font-black flex items-center justify-center flex-shrink-0" style={{ background: abcColors[g.k] }}>{g.k}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800">{g.items.length} item{g.items.length === 1 ? '' : 's'} <span className="text-xs font-semibold text-gray-400">· {Math.round(g.share)}% of yearly use</span></p>
                      <p className="text-[11px] text-gray-500">{l.title}</p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(100, g.share)}%`, background: abcColors[g.k] }} /></div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Priority actions */}
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm font-bold text-gray-800 flex items-center gap-2"><Target className="w-4 h-4 text-[#2B5EA6]" />Recommended actions</p>
          <div className="flex gap-1 flex-wrap">
            {(['attention', 'critical', 'high', 'medium', 'all'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${filter === f ? 'bg-[#2B5EA6] text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{f === 'attention' ? 'Needs attention' : f[0].toUpperCase() + f.slice(1)}</button>
            ))}
          </div>
        </div>
        <div className="px-4 py-2 border-b border-gray-100 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500 bg-white">
          {SEV_LEGEND.slice(0, 3).map(l => <span key={l.s} className="flex items-center gap-1"><span className={`px-1.5 py-0.5 rounded-full font-bold ${SEV[l.s].chip}`}>{SEV[l.s].label}</span>{l.desc}</span>)}
          <span>💊 medicine · 📦 supply · <b>Class A/B/C</b> = importance (A most) · <TrendingUp className="w-3 h-3 inline text-red-500" /> demand rising · <TrendingDown className="w-3 h-3 inline text-green-600" /> demand falling</span>
        </div>
        <div className="divide-y divide-gray-50 max-h-[520px] overflow-y-auto">
          {visible.length === 0 && <p className="text-sm text-gray-400 text-center py-10">Nothing in this category.</p>}
          {visible.slice(0, 60).map(i => (
            <div key={i.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${SEV[i.severity].chip}`}>{SEV[i.severity].label}</span>
                <div className="flex-1 min-w-0">
                  <p onClick={() => setDetail({ kind: 'item', id: i.id })} className="text-sm font-semibold text-gray-900 truncate cursor-pointer hover:text-[#2B5EA6] hover:underline">{i.name} <span className="text-[10px] font-bold text-gray-400 ml-1">{i.type === 'medicine' ? '💊' : '📦'} · Class {i.abc}</span></p>
                  <p className="text-xs text-gray-500 truncate">{i.action}</p>
                </div>
                <div className="hidden sm:block text-right w-24 flex-shrink-0">
                  <p className="text-xs font-bold text-gray-800">{i.daysOfCover === null ? '—' : `${Math.floor(i.daysOfCover)}d cover`}</p>
                  <p className="text-[10px] text-gray-400">{i.qty} on hand</p>
                </div>
                <div className="hidden md:flex items-center gap-1 w-24 flex-shrink-0">
                  <Spark data={i.forecast.series} color={SEV[i.severity].bar} />
                  {i.forecast.trendPct > 15 ? <TrendingUp className="w-3.5 h-3.5 text-red-500" /> : i.forecast.trendPct < -15 ? <TrendingDown className="w-3.5 h-3.5 text-green-600" /> : null}
                </div>
                {canEdit && i.suggestedOrderQty > 0 && i.severity !== 'ok' && i.severity !== 'low' && (
                  <button onClick={() => onOrder({ itemName: i.name, itemType: i.type, quantity: i.suggestedOrderQty, unitCost: i.unitCost })} className="flex-shrink-0 px-3 py-1.5 bg-[#2B5EA6] text-white text-[10px] font-bold rounded-lg hover:bg-[#2B5EA6]/90 flex items-center gap-1"><ShoppingCart className="w-3 h-3" />Order {i.suggestedOrderQty}</button>
                )}
                <button onClick={() => setExpanded(expanded === i.id ? null : i.id)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">{expanded === i.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
              </div>
              {expanded === i.id && (
                <div className="mt-3 ml-1 grid sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                    <p className="font-bold text-gray-700 mb-1">Why the AI says this</p>
                    {i.reasons.length ? i.reasons.map((r, k) => <p key={k} className="text-gray-600">• {r}</p>) : <p className="text-gray-400">No risk factors.</p>}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-gray-600">
                    <p className="font-bold text-gray-700 mb-1">Forecast details</p>
                    <p>Expected use: <b>{i.forecast.dailyRate.toFixed(2)}/day</b> (~{Math.round(i.forecast.dailyRate * 30)}/month)</p>
                    <p>Trend: <b>{i.forecast.trendPct >= 0 ? '+' : ''}{Math.round(i.forecast.trendPct)}%/month</b> · Confidence: <b>{i.forecast.confidence}%</b></p>
                    <p>Safety stock: <b>{i.safetyStock}</b> · AI reorder point: <b>{i.reorderPoint}</b> (current: {i.reorderLevel})</p>
                    {i.stockoutDate && <p>Projected stock-out: <b>{i.stockoutDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</b></p>}
                    {i.suggestedOrderQty > 0 && <p>Suggested order: <b>{i.suggestedOrderQty}</b> ≈ {peso(i.suggestedOrderCost)}</p>}
                    <p className="text-gray-400">Method: {i.forecast.method} · {i.forecast.dataDays}d of data</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Budget-aware purchase plan */}
      <div className="border border-blue-100 bg-blue-50/40 rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <p className="text-sm font-bold text-gray-800 flex items-center gap-2"><Layers className="w-4 h-4 text-[#2B5EA6]" />Smart purchase plan (budget-aware)</p>
          <label className="text-xs font-semibold text-gray-600 flex items-center gap-2">Budget ₱
            <input type="number" value={budgetOverride} placeholder={String(Math.round(totalBalance))} onChange={e => setBudgetOverride(e.target.value)} className="w-32 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white outline-none" />
          </label>
        </div>
        {plan.lines.length === 0 ? <p className="text-sm text-gray-500">No purchases recommended right now.</p> : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-3 text-center">
              <div className="bg-white rounded-lg border border-gray-100 py-2"><p className="text-sm font-black text-gray-800">{peso(plan.spent)}</p><p className="text-[10px] text-gray-400">Planned spend</p></div>
              <div className="bg-white rounded-lg border border-gray-100 py-2"><p className="text-sm font-black text-green-600">{peso(plan.remaining)}</p><p className="text-[10px] text-gray-400">Budget left</p></div>
              <div className="bg-white rounded-lg border border-gray-100 py-2"><p className="text-sm font-black text-red-600">{plan.unfunded}</p><p className="text-[10px] text-gray-400">Unfunded items</p></div>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {plan.lines.map(l => (
                <div key={l.insight.id} className="bg-white border border-gray-100 rounded-lg px-3 py-2 flex items-center gap-3 text-xs">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${l.funded === 'full' ? 'bg-green-100 text-green-700' : l.funded === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{l.funded === 'full' ? 'Funded' : l.funded === 'partial' ? 'Partial' : 'No budget'}</span>
                  <span className="flex-1 font-semibold text-gray-800 truncate">{l.insight.name}</span>
                  <span className="text-gray-500">{l.funded === 'none' ? `need ${l.insight.suggestedOrderQty}` : `${l.qty}${l.funded === 'partial' ? ` of ${l.insight.suggestedOrderQty}` : ''}`}</span>
                  <span className="font-bold text-gray-800 w-20 text-right">{l.funded === 'none' ? '—' : peso(l.cost)}</span>
                  {canEdit && l.qty > 0 && <button onClick={() => onOrder({ itemName: l.insight.name, itemType: l.insight.type, quantity: l.qty, unitCost: l.insight.unitCost })} className="px-2 py-1 bg-[#2B5EA6] text-white rounded text-[10px] font-bold">Order</button>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Secondary insights */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="border border-gray-100 rounded-xl p-4">
          <p className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500" />Expiry risk (FEFO)</p>
          {insights.filter(i => i.valueAtRisk > 0 && i.daysToExpiry !== null && i.daysToExpiry <= 180).sort((a, b) => b.valueAtRisk - a.valueAtRisk).slice(0, 6).map(i => (
            <div key={i.id} className="flex justify-between text-xs py-1.5 border-b border-gray-50 last:border-0"><span className="truncate pr-2 text-gray-700">{i.name}</span><span className="text-amber-700 font-bold whitespace-nowrap">{i.unitsAtRiskOfExpiry} u · {peso(i.valueAtRisk)}</span></div>
          )) || null}
          {insights.filter(i => i.valueAtRisk > 0 && i.daysToExpiry !== null && i.daysToExpiry <= 180).length === 0 && <p className="text-xs text-gray-400">No expiry waste predicted.</p>}
        </div>
        <div className="border border-gray-100 rounded-xl p-4">
          <p className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2"><Activity className="w-4 h-4 text-red-500" />Usage anomalies</p>
          {anomalies.length === 0 ? <p className="text-xs text-gray-400">No unusual usage detected.</p> : anomalies.slice(0, 5).map(i => (
            <div key={i.id} className="text-xs py-1.5 border-b border-gray-50 last:border-0"><p className="font-semibold text-gray-800 flex items-center gap-1.5">{i.anomaly.direction === 'spike' ? <TrendingUp className="w-3 h-3 text-red-500" /> : <TrendingDown className="w-3 h-3 text-blue-500" />}{i.name}</p><p className="text-gray-500">{i.anomaly.note}</p></div>
          ))}
        </div>
        <div className="border border-gray-100 rounded-xl p-4">
          <p className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-violet-500" />Reorder-level tuning</p>
          {tuning.length === 0 ? <p className="text-xs text-gray-400">Current reorder levels match observed demand.</p> : tuning.slice(0, 6).map(i => (
            <div key={i.id} className="text-xs py-1.5 border-b border-gray-50 last:border-0 flex justify-between gap-2"><span className="truncate text-gray-700">{i.name}</span><span className={`whitespace-nowrap font-bold ${i.staticReorderMismatch === 'too_low' ? 'text-red-600' : 'text-blue-600'}`}>{i.reorderLevel} → {i.reorderPoint}</span></div>
          ))}
          {overstock.length > 0 && <p className="text-[11px] text-gray-500 mt-2 pt-2 border-t border-gray-50">{overstock.length} overstocked item(s) — pause purchasing.</p>}
        </div>
      </div>

      {/* ── Detail modal ── */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {detail.kind === 'class' && (() => {
              const g = abcInfo.find(x => x.k === detail.k)!;
              const l = ABC_LEGEND.find(x => x.k === detail.k)!;
              return (
                <>
                  <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-3 sticky top-0 bg-white">
                    <span className="w-10 h-10 rounded-lg text-white font-black flex items-center justify-center" style={{ background: abcColors[g.k] }}>{g.k}</span>
                    <div className="flex-1"><h4 className="font-bold text-gray-900">Class {g.k} — {g.items.length} item{g.items.length === 1 ? '' : 's'}</h4><p className="text-xs text-gray-500">{l.title} ({Math.round(g.share)}% of yearly usage)</p></div>
                    <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-5">
                    {g.items.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No items in this group.</p> : (
                      <table className="w-full text-xs">
                        <thead><tr className="text-left text-gray-400 border-b border-gray-100"><th className="py-2 font-semibold">Item</th><th className="font-semibold text-right">Yearly use</th><th className="font-semibold text-right">Stock lasts</th><th className="font-semibold text-right">Status</th></tr></thead>
                        <tbody>
                          {g.items.map(i => (
                            <tr key={i.id} onClick={() => setDetail({ kind: 'item', id: i.id, from: g.k })} className="border-b border-gray-50 hover:bg-blue-50/40 cursor-pointer">
                              <td className="py-2 pr-2 font-semibold text-gray-800">{i.name}</td>
                              <td className="text-right text-gray-600">{peso(annualValue(i))}</td>
                              <td className="text-right text-gray-600">{i.daysOfCover === null ? '—' : `${Math.floor(i.daysOfCover)} days`}</td>
                              <td className="text-right"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${SEV[i.severity].chip}`}>{SEV[i.severity].label}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    <p className="text-[11px] text-gray-400 mt-3">Click an item to see its full details.</p>
                  </div>
                </>
              );
            })()}

            {detail.kind === 'item' && detailItem && (() => {
              const i = detailItem;
              const week = i.forecast.series.map((v, k, arr) => ({ w: k === arr.length - 1 ? 'This wk' : `${arr.length - 1 - k}w ago`, used: Math.round(v) }));
              const fmt = (d: Date | null) => d ? d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
              const sentence = i.qty === 0 ? `${i.name} is out of stock.`
                : i.daysOfCover === null ? `There is no recent usage recorded for ${i.name}, so the system cannot predict when it will run out.`
                : `At the normal pace of about ${i.forecast.dailyRate.toFixed(1)} per day, your ${i.qty} on hand will last about ${Math.floor(i.daysOfCover)} days (until ${fmt(i.stockoutDate)}). ${i.daysOfCover <= opts.leadTimeDays ? `A new order takes about ${opts.leadTimeDays} days to arrive, so it will run out first — order now.` : `A new order takes about ${opts.leadTimeDays} days to arrive, so there is still time.`}`;
              return (
                <>
                  <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-3 sticky top-0 bg-white">
                    {detail.from && <button onClick={() => setDetail({ kind: 'class', k: detail.from! })} className="text-gray-400 hover:text-gray-600 mt-1"><ArrowLeft className="w-4 h-4" /></button>}
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900">{i.name}</h4>
                      <p className="text-xs text-gray-500 mt-0.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold mr-2 ${SEV[i.severity].chip}`}>{SEV[i.severity].label}</span>{i.type === 'medicine' ? 'Medicine' : 'Supply'} · Class {i.abc} · {i.category}</p>
                    </div>
                    <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 text-sm text-violet-900"><b>In plain words:</b> {sentence}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      {[
                        { l: 'On hand', v: i.qty },
                        { l: 'Used per day', v: i.forecast.dailyRate > 0 ? i.forecast.dailyRate.toFixed(1) : '—' },
                        { l: 'Stock lasts', v: i.daysOfCover === null ? '—' : `${Math.floor(i.daysOfCover)}d` },
                        { l: 'Prediction confidence', v: `${i.forecast.confidence}%` },
                      ].map(x => <div key={x.l} className="border border-gray-100 rounded-lg py-2"><p className="text-base font-black text-gray-800">{x.v}</p><p className="text-[10px] text-gray-400">{x.l}</p></div>)}
                    </div>
                    {week.length > 1 && (
                      <div>
                        <p className="text-xs font-bold text-gray-700 mb-1">How much was used each week</p>
                        <ResponsiveContainer width="100%" height={130}>
                          <BarChart data={week}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="w" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} width={30} /><Tooltip formatter={(v: any) => [`${v} used`, 'Week total']} /><Bar dataKey="used" fill={SEV[i.severity].bar} radius={[4, 4, 0, 0]} /></BarChart>
                        </ResponsiveContainer>
                        <p className="text-[11px] text-gray-500">Trend: <b>{i.forecast.trendPct >= 0 ? 'rising' : 'falling'} about {Math.abs(Math.round(i.forecast.trendPct))}% per month</b>.</p>
                      </div>
                    )}
                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-gray-50 rounded-lg p-3 space-y-1"><p className="font-bold text-gray-700 mb-1">Why the AI says this</p>{i.reasons.length ? i.reasons.map((r, k) => <p key={k} className="text-gray-600">• {r}</p>) : <p className="text-gray-400">No risk factors.</p>}</div>
                      <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-gray-600">
                        <p className="font-bold text-gray-700 mb-1">Recommendation</p>
                        <p><b>{i.action}</b></p>
                        <p>Reorder when stock reaches <b>{i.reorderPoint}</b> (currently set to {i.reorderLevel})</p>
                        {i.suggestedOrderQty > 0 && <p>Suggested order: <b>{i.suggestedOrderQty}</b> ≈ {peso(i.suggestedOrderCost)}</p>}
                        {i.daysToExpiry !== null && <p>Expires in <b>{i.daysToExpiry} days</b>{i.unitsAtRiskOfExpiry > 0 ? ` — ~${i.unitsAtRiskOfExpiry} unit(s) may go unused` : ''}</p>}
                      </div>
                    </div>
                    {canEdit && i.suggestedOrderQty > 0 && (
                      <button onClick={() => { onOrder({ itemName: i.name, itemType: i.type, quantity: i.suggestedOrderQty, unitCost: i.unitCost }); setDetail(null); }} className="w-full py-2.5 bg-[#2B5EA6] text-white text-sm font-bold rounded-xl hover:bg-[#2B5EA6]/90 flex items-center justify-center gap-2"><ShoppingCart className="w-4 h-4" />Order {i.suggestedOrderQty} now</button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
      <p className="text-[10px] text-gray-400 text-center">Forecasts are statistical estimates from logged dispensing history. Always confirm with actual field needs before ordering.</p>
    </div>
  );
}

export default InventoryAIAnalytics;
