import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Sparkles, Users, Syringe, Pill, Package, RefreshCw, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Wand2, Info } from 'lucide-react';
import { api } from '../lib/api';
import { smartAllocate, type AllocDeployment, type AllocResult } from '../lib/aiEngine';

interface Props {
  deployments: AllocDeployment[];
  onApplied?: () => void;
}

const norm = (s: string) => (s || '').trim().toLowerCase();

function Bar({ value, granted, need, color }: { value: number; granted: number; need: number; color: string }) {
  return (
    <div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, background: color }} /></div>
      <p className="text-[10px] text-gray-500 mt-0.5">{granted.toLocaleString()} / {need.toLocaleString()}</p>
    </div>
  );
}

export function SmartAllocation({ deployments, onApplied }: Props) {
  const [loading, setLoading] = useState(true);
  const [stock, setStock] = useState({ vaccines: 0, antibiotics: 0, vitamins: 0 });
  const [coverage, setCoverage] = useState<Record<string, number>>({});
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [staffAvailable, setStaffAvailable] = useState<number>(0);
  const [staffTouched, setStaffTouched] = useState(false);
  const [reservePct, setReservePct] = useState(15);
  const [open, setOpen] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [dataNote, setDataNote] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    const notes: string[] = [];
    try {
      const [medsRes, popRes, useRes]: any[] = await Promise.all([
        api.getMedicines().catch(() => null),
        (api as any).getDashboardAnimalPopulation().catch(() => null),
        (api as any).getDashboardMedicineUsageAnalytics(90).catch(() => null),
      ]);

      // Stock by category (expired stock is not deployable)
      const s = { vaccines: 0, antibiotics: 0, vitamins: 0 };
      const now = Date.now();
      for (const m of medsRes?.medicines || []) {
        if (m.expiry_date && new Date(m.expiry_date).getTime() < now) continue;
        const units = Number(m.total_doses) || (Number(m.quantity) || 0) * (Number(m.doses_per_container) || 1);
        const c = String(m.category || '').toLowerCase();
        if (c.includes('vaccine')) s.vaccines += units;
        else if (c.includes('antibiotic')) s.antibiotics += units;
        else if (c.includes('vitamin')) s.vitamins += units;
      }
      setStock(s);
      if (!medsRes) notes.push('Could not load inventory — stock assumed 0.');

      const cov: Record<string, number> = {};
      for (const r of popRes?.vaccinationRates || []) if (r.barangay) cov[norm(r.barangay)] = Number(r.rate) || 0;
      setCoverage(cov);
      if (!Object.keys(cov).length) notes.push('No vaccination-coverage data — coverage gap treated as neutral.');

      const use: Record<string, number> = {};
      for (const r of useRes?.barangayRanking || []) if (r.barangay) use[norm(r.barangay)] = Number(r.total_qty) || 0;
      setUsage(use);
    } finally { setDataNote(notes); setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const staffNeededTotal = deployments.filter(d => d.status !== 'completed').reduce((s, d) => s + d.staffNeeded, 0);
  useEffect(() => { if (!staffTouched) setStaffAvailable(Math.max(1, Math.ceil(staffNeededTotal * 0.8))); }, [staffNeededTotal, staffTouched]);

  const results: AllocResult[] = useMemo(() => {
    const cv: Record<string, number> = {}, us: Record<string, number> = {};
    for (const d of deployments) { cv[d.barangay] = coverage[norm(d.barangay)] as number; us[d.barangay] = usage[norm(d.barangay)] || 0; }
    Object.keys(cv).forEach(k => cv[k] === undefined && delete cv[k]);
    return smartAllocate(deployments, { stock, staffAvailable, reservePct, coverageByBarangay: cv, usageByBarangay: us });
  }, [deployments, stock, staffAvailable, reservePct, coverage, usage]);

  const demand = deployments.filter(d => d.status !== 'completed').reduce((a, d) => ({
    vaccines: a.vaccines + d.medicineEstimate.vaccines, antibiotics: a.antibiotics + d.medicineEstimate.antibiotics, vitamins: a.vitamins + d.medicineEstimate.vitamins,
  }), { vaccines: 0, antibiotics: 0, vitamins: 0 });
  const shortCats = (['vaccines', 'antibiotics', 'vitamins'] as const).filter(k => demand[k] > stock[k] * (1 - reservePct / 100));
  const staffShort = staffNeededTotal > staffAvailable;
  const fullyServed = results.filter(r => r.fillRate >= 100).length;

  const applyPlan = async () => {
    setApplying(true);
    try {
      await Promise.all(results.map(r => {
        const d = deployments.find(x => x.id === r.id) as any;
        const note = `[AI Smart Allocation] Priority #${r.rank} (${r.priorityScore}/100). Allocated: ${r.staff}/${r.staffNeeded} staff, ${r.vaccines} vaccines, ${r.antibiotics} antibiotics, ${r.vitamins} vitamins (${r.fillRate}% of request).`;
        const prior = String(d?.notes || '').replace(/\[AI Smart Allocation\][^\n]*\n?/g, '').trim();
        return api.updateDeployment(r.id, { status: d.status, deployedStaff: d.deployedStaff || [], notes: prior ? `${note}\n${prior}` : note });
      }));
      toast.success('Smart allocation saved to each deployment plan');
      onApplied?.();
    } catch (e: any) { toast.error(e.message || 'Failed to save allocation'); }
    finally { setApplying(false); }
  };

  if (!deployments.filter(d => d.status !== 'completed').length) return null;

  return (
    <div className="m-5 border border-violet-200 rounded-2xl overflow-hidden bg-white">
      <div className="px-5 py-4 bg-gradient-to-r from-violet-600 to-[#2B5EA6] text-white flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><Wand2 className="w-5 h-5" /></div>
          <div><h4 className="font-bold">Smart Allocation</h4><p className="text-xs text-white/70">Splits limited staff and stock across barangays by risk, coverage gap and need.</p></div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-semibold disabled:opacity-60"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh data</button>
          <button onClick={applyPlan} disabled={applying || loading} className="flex items-center gap-1.5 px-4 py-2 bg-white text-violet-700 rounded-lg text-xs font-bold hover:bg-violet-50 disabled:opacity-60"><CheckCircle className="w-3.5 h-3.5" />{applying ? 'Saving…' : 'Apply to plans'}</button>
        </div>
      </div>

      {/* Constraints */}
      <div className="p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 border-b border-gray-100 bg-gray-50/50">
        <label className="text-xs font-semibold text-gray-600">Staff available
          <input type="number" min={1} value={staffAvailable} onChange={e => { setStaffTouched(true); setStaffAvailable(Math.max(0, Number(e.target.value) || 0)); }} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none" />
          <span className="text-[10px] font-normal text-gray-400">Plans request {staffNeededTotal}</span>
        </label>
        <label className="text-xs font-semibold text-gray-600">Emergency reserve: {reservePct}%
          <input type="range" min={0} max={40} step={5} value={reservePct} onChange={e => setReservePct(Number(e.target.value))} className="mt-2 w-full" />
          <span className="text-[10px] font-normal text-gray-400">Stock held back for outbreaks</span>
        </label>
        <div className="lg:col-span-2 grid grid-cols-3 gap-2">
          {([['vaccines', Syringe, 'Vaccines'], ['antibiotics', Pill, 'Antibiotics'], ['vitamins', Package, 'Vitamins']] as const).map(([k, Icon, label]) => (
            <div key={k} className={`rounded-lg border px-3 py-2 ${shortCats.includes(k) ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
              <p className="text-[10px] font-bold text-gray-500 flex items-center gap-1"><Icon className="w-3 h-3" />{label}</p>
              <p className="text-sm font-black text-gray-800">{stock[k].toLocaleString()}<span className="text-[10px] font-normal text-gray-400"> in stock</span></p>
              <p className={`text-[10px] ${shortCats.includes(k) ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>Requested {demand[k].toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="px-5 pt-4">
        <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 text-sm text-violet-900 flex gap-2">
          <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-violet-500" />
          <p>
            {results.length} area{results.length === 1 ? '' : 's'} ranked; <b>{fullyServed}</b> can be fully supplied.
            {staffShort && <> Staff is short by <b>{staffNeededTotal - staffAvailable}</b> — lowest-priority teams are reduced first.</>}
            {shortCats.length > 0 && <> Stock is insufficient for <b>{shortCats.join(', ')}</b>{reservePct > 0 ? ` (after the ${reservePct}% reserve)` : ''}; consider ordering or lowering the reserve.</>}
            {!staffShort && shortCats.length === 0 && ' Current resources cover every requested deployment.'}
          </p>
        </div>
        {dataNote.map((n, i) => <p key={i} className="text-[11px] text-amber-700 mt-2 flex gap-1.5"><Info className="w-3 h-3 mt-0.5" />{n}</p>)}
      </div>

      {/* Ranked results */}
      <div className="p-5 space-y-2">
        {results.map(r => (
          <div key={r.id} className="border border-gray-100 rounded-xl">
            <button onClick={() => setOpen(open === r.id ? null : r.id)} className="w-full px-4 py-3 flex items-center gap-3 text-left">
              <span className="w-7 h-7 rounded-full bg-[#2B5EA6] text-white text-xs font-black flex items-center justify-center flex-shrink-0">{r.rank}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">{r.barangay}</p>
                <p className="text-[11px] text-gray-500">Priority {r.priorityScore}/100 · <Users className="w-3 h-3 inline -mt-0.5" /> {r.staff}/{r.staffNeeded} staff</p>
              </div>
              <div className="hidden sm:grid grid-cols-3 gap-3 w-64">
                <Bar value={(r.vaccines / Math.max(1, r.vaccines + r.shortfall.vaccines)) * 100} granted={r.vaccines} need={r.vaccines + r.shortfall.vaccines} color="#2B5EA6" />
                <Bar value={(r.antibiotics / Math.max(1, r.antibiotics + r.shortfall.antibiotics)) * 100} granted={r.antibiotics} need={r.antibiotics + r.shortfall.antibiotics} color="#60A85C" />
                <Bar value={(r.vitamins / Math.max(1, r.vitamins + r.shortfall.vitamins)) * 100} granted={r.vitamins} need={r.vitamins + r.shortfall.vitamins} color="#f59e0b" />
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${r.fillRate >= 100 ? 'bg-green-100 text-green-700' : r.fillRate >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{r.fillRate}% filled</span>
              {open === r.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {open === r.id && (
              <div className="px-4 pb-4 grid sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="font-bold text-gray-700 mb-2">Priority factors</p>
                  {r.factors.map(f => (
                    <div key={f.label} className="flex justify-between py-0.5 text-gray-600"><span>{f.label} <span className="text-gray-400">({Math.round(f.weight * 100)}%)</span></span><span className="font-semibold">{f.value}</span></div>
                  ))}
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-gray-600 space-y-1">
                  <p className="font-bold text-gray-700 mb-1">Allocation</p>
                  <p>Vaccines: <b>{r.vaccines}</b> · Antibiotics: <b>{r.antibiotics}</b> · Vitamins: <b>{r.vitamins}</b></p>
                  {(r.shortfall.staff + r.shortfall.vaccines + r.shortfall.antibiotics + r.shortfall.vitamins) > 0 && (
                    <p className="text-red-600 flex gap-1"><AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />Short: {[r.shortfall.staff && `${r.shortfall.staff} staff`, r.shortfall.vaccines && `${r.shortfall.vaccines} vaccines`, r.shortfall.antibiotics && `${r.shortfall.antibiotics} antibiotics`, r.shortfall.vitamins && `${r.shortfall.vitamins} vitamins`].filter(Boolean).join(', ')}</p>
                  )}
                  <p className="pt-1 text-gray-500">{r.rationale}</p>
                </div>
              </div>
            )}
          </div>
        ))}
        <p className="text-[10px] text-gray-400 text-center pt-1">Recommendation only — “Apply to plans” records it in each deployment’s notes; staff and stock are not moved until you deploy.</p>
      </div>
    </div>
  );
}

export default SmartAllocation;
