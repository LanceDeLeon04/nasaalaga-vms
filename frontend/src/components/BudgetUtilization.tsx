import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Plus, Edit2, Trash2, ChevronRight, ChevronDown, ChevronUp,
  RefreshCw, BarChart2, Target, Brain, ArrowRight, Zap,
  Calendar, Receipt, FileText, Download, X, Save, AlertCircle,
  Package, Syringe, Activity, Info, PlusCircle, Eye,
} from 'lucide-react';
import type { UserRole } from '../App';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface LineItem {
  id: string; name: string; category: string; expenditure_type: 'capex' | 'opex';
  allotment: number; utilized: number; obligated: number; program_id: string;
  fiscal_year: number; notes?: string;
}
interface Program {
  id: string; name: string; description?: string; total_allotment: number;
  fiscal_year: number; color: string; line_items: LineItem[];
}
interface Expenditure {
  id: number; line_item_id: string; amount: number; expenditure_type: string;
  description: string; reference_no: string; vendor: string;
  expenditure_date: string; recorded_by: string; line_item_name?: string;
}
interface AIRec {
  id: string; type: string; priority: string; title: string; narrative: string;
  from_program?: string; to_program?: string; suggested_pct: number;
  suggested_amount: number; justification: string; data_points: string[];
  confidence: number; generated_at: string; status?: string;
}

interface Props { userRole?: UserRole; }

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n);
const fmtM = (n: number) => `₱${(n / 1_000_000).toFixed(2)}M`;
const pct = (a: number, b: number) => (b > 0 ? Math.min(Math.round((a / b) * 100), 100) : 0);
const PROG_COLORS = ['#2B5EA6', '#60A85C', '#e8a838', '#e05252', '#7c3aed', '#0891b2', '#db2777', '#14b8a6'];

function utilColor(rate: number) {
  if (rate >= 95) return 'text-red-600';
  if (rate >= 80) return 'text-amber-600';
  if (rate >= 50) return 'text-green-600';
  return 'text-blue-600';
}
function utilBg(rate: number) {
  if (rate >= 95) return '#ef4444';
  if (rate >= 80) return '#f59e0b';
  if (rate >= 50) return '#22c55e';
  return '#3b82f6';
}

function UtilBar({ utilized, allotment, obligated }: { utilized: number; allotment: number; obligated: number }) {
  const u = pct(utilized, allotment);
  const o = Math.min(pct(obligated, allotment), 100 - u);
  const col = utilBg(u);
  return (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden flex">
      <div className="h-full rounded-l-full transition-all" style={{ width: `${u}%`, backgroundColor: col }} />
      <div className="h-full transition-all opacity-40" style={{ width: `${o}%`, backgroundColor: col }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Program Modal
// ─────────────────────────────────────────────────────────────────────────────
function ProgramModal({ program, onClose, onSave }: { program?: Program | null; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    name: program?.name || '',
    description: program?.description || '',
    total_allotment: program?.total_allotment?.toString() || '',
    color: program?.color || PROG_COLORS[0],
    fiscal_year: program?.fiscal_year || 2025,
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#2B5EA6]" />
            {program ? 'Edit Program' : 'Add Budget Program'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Program Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]/30"
              placeholder="e.g. Rabies Control Program" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]/30 resize-none"
              rows={2} placeholder="Brief description..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Allotment (₱) *</label>
              <input type="number" value={form.total_allotment} onChange={e => set('total_allotment', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]/30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Fiscal Year</label>
              <select value={form.fiscal_year} onChange={e => set('fiscal_year', Number(e.target.value))}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]/30 bg-white">
                {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Color Tag</label>
            <div className="flex gap-2 flex-wrap">
              {PROG_COLORS.map(c => (
                <button key={c} onClick={() => set('color', c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-gray-100 px-6 py-4 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={() => onSave({ ...form, total_allotment: parseFloat(form.total_allotment) || 0 })}
            className="px-5 py-2 bg-[#2B5EA6] text-white text-sm font-semibold rounded-xl hover:bg-[#2B5EA6]/90">
            {program ? 'Save Changes' : 'Add Program'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Line Item Modal
// ─────────────────────────────────────────────────────────────────────────────
function LineItemModal({ item, programId, fy, onClose, onSave }: { item?: LineItem | null; programId: string; fy: number; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    name: item?.name || '', category: item?.category || 'Vaccines',
    expenditure_type: item?.expenditure_type || 'opex',
    allotment: item?.allotment?.toString() || '', notes: item?.notes || '',
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const CATS = ['Vaccines', 'Medicines', 'Supplies', 'Equipment', 'Operations', 'Communication', 'Training', 'Facilities', 'Diagnostics', 'Other'];
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{item ? 'Edit Line Item' : 'Add Line Item'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]/30 bg-white">
                {CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</label>
              <select value={form.expenditure_type} onChange={e => set('expenditure_type', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]/30 bg-white">
                <option value="opex">OPEX</option>
                <option value="capex">CAPEX</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Allotment (₱) *</label>
            <input type="number" value={form.allotment} onChange={e => set('allotment', e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]/30" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Notes</label>
            <input value={form.notes} onChange={e => set('notes', e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]/30" />
          </div>
        </div>
        <div className="border-t border-gray-100 px-6 py-4 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={() => onSave({ ...form, allotment: parseFloat(form.allotment) || 0, program_id: programId, fiscal_year: fy })}
            className="px-5 py-2 bg-[#2B5EA6] text-white text-sm font-semibold rounded-xl hover:bg-[#2B5EA6]/90">
            {item ? 'Save Changes' : 'Add Line Item'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Expenditure Modal
// ─────────────────────────────────────────────────────────────────────────────
function ExpenditureModal({ lineItem, onClose, onSave }: { lineItem: LineItem; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    amount: '', expenditure_type: 'utilized', description: '',
    reference_no: '', vendor: '',
    expenditure_date: new Date().toISOString().split('T')[0],
  });
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [loadingExps, setLoadingExps] = useState(true);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    api.getBudgetExpenditures(lineItem.id).then((r: any) => {
      setExpenditures(r.expenditures || []);
    }).catch(() => {}).finally(() => setLoadingExps(false));
  }, [lineItem.id]);

  const handleDelete = async (id: number) => {
    await api.deleteBudgetExpenditure(id);
    setExpenditures(prev => prev.filter(e => e.id !== id));
    onSave(null); // trigger parent refresh
  };

  const balance = lineItem.allotment - lineItem.utilized - lineItem.obligated;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#2B5EA6]" />
              Expenditures — {lineItem.name}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Balance: <span className={balance < 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>{fmt(balance)}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">
          {/* Summary bars */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Allotment', val: lineItem.allotment, color: 'bg-blue-50 text-blue-700' },
              { label: 'Utilized', val: lineItem.utilized, color: 'bg-green-50 text-green-700' },
              { label: 'Obligated', val: lineItem.obligated, color: 'bg-amber-50 text-amber-700' },
            ].map(({ label, val, color }) => (
              <div key={label} className={`${color} rounded-xl p-3 text-center`}>
                <div className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</div>
                <div className="text-base font-bold mt-0.5">{fmt(val)}</div>
              </div>
            ))}
          </div>

          {/* Add expenditure form */}
          <div className="bg-gray-50 rounded-xl p-4 mb-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Add Expenditure</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-semibold">Amount (₱) *</label>
                <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]/30" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold">Type</label>
                <select value={form.expenditure_type} onChange={e => set('expenditure_type', e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]/30 bg-white">
                  <option value="utilized">Utilized (Actual Spend)</option>
                  <option value="obligated">Obligated (Committed)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold">Reference No.</label>
                <input value={form.reference_no} onChange={e => set('reference_no', e.target.value)}
                  placeholder="PO/OR/JEV number"
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]/30" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold">Vendor/Payee</label>
                <input value={form.vendor} onChange={e => set('vendor', e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]/30" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold">Date</label>
                <input type="date" value={form.expenditure_date} onChange={e => set('expenditure_date', e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]/30" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold">Description</label>
                <input value={form.description} onChange={e => set('description', e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]/30" />
              </div>
            </div>
            <button
              onClick={() => {
                if (!form.amount) return;
                onSave({ ...form, amount: parseFloat(form.amount), line_item_id: lineItem.id });
                set('amount', ''); set('description', ''); set('reference_no', ''); set('vendor', '');
              }}
              className="mt-3 flex items-center gap-2 px-4 py-2 bg-[#2B5EA6] text-white text-sm font-semibold rounded-xl hover:bg-[#2B5EA6]/90"
            >
              <PlusCircle className="w-4 h-4" /> Add Expenditure
            </button>
          </div>

          {/* Expenditure history */}
          <h3 className="text-sm font-bold text-gray-700 mb-2">Expenditure History</h3>
          {loadingExps ? (
            <div className="text-center py-6 text-gray-400 text-sm">Loading…</div>
          ) : expenditures.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">No expenditures recorded yet.</div>
          ) : (
            <div className="space-y-2">
              {expenditures.map(e => (
                <div key={e.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${e.expenditure_type === 'utilized' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {e.expenditure_type}
                      </span>
                      <span className="text-sm font-bold text-gray-900">{fmt(e.amount)}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {new Date(e.expenditure_date).toLocaleDateString('en-PH')}
                      {e.reference_no && ` · ${e.reference_no}`}
                      {e.vendor && ` · ${e.vendor}`}
                      {e.description && ` · ${e.description}`}
                      {(e as any).source_type && (e as any).source_type !== 'manual' && (
                        <span className="ml-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs font-semibold">📦 From Inventory: {(e as any).inventory_item_name}</span>
                      )}
                    </div>
                  </div>
                  {!(e as any).inventory_item_id && (
                    <button onClick={() => handleDelete(e.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {(e as any).inventory_item_id && (
                    <span className="text-xs text-indigo-400 px-2" title="Auto-deducted from inventory purchase">🔒 Auto</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Recommendation Card
// ─────────────────────────────────────────────────────────────────────────────
function RecCard({ rec, onStatusChange }: { rec: AIRec; onStatusChange: (id: string, status: string) => void | Promise<void> }) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig: Record<string, { icon: any; bg: string; text: string; label: string }> = {
    realignment: { icon: ArrowRight, bg: 'bg-purple-100', text: 'text-purple-700', label: 'Budget Realignment' },
    reallocation: { icon: TrendingUp, bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Reallocation' },
    next_fy: { icon: Calendar, bg: 'bg-green-100', text: 'text-green-700', label: 'Next FY Planning' },
    warning: { icon: AlertTriangle, bg: 'bg-red-100', text: 'text-red-700', label: 'Warning' },
    infrastructure: { icon: Package, bg: 'bg-orange-100', text: 'text-orange-700', label: 'Infrastructure' },
    program: { icon: Activity, bg: 'bg-blue-100', text: 'text-blue-700', label: 'Program Adjustment' },
  };
  const tc = typeConfig[rec.type] || typeConfig.realignment;
  const Icon = tc.icon;
  const priColor: Record<string, string> = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-blue-100 text-blue-700' };

  if (rec.status === 'dismissed') return null;

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden shadow-sm ${rec.status === 'applied' ? 'border-green-200 opacity-70' : 'border-gray-200'}`}>
      <button className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className={`p-2 rounded-xl ${tc.bg} flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${tc.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tc.bg} ${tc.text}`}>{tc.label}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${priColor[rec.priority] || priColor.low}`}>{rec.priority} priority</span>
            <span className="text-xs text-gray-400">Confidence: {rec.confidence}%</span>
            {rec.status === 'applied' && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ Applied</span>}
          </div>
          <p className="text-sm font-bold text-gray-900">{rec.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{rec.narrative}</p>
        </div>
        <div className="flex-shrink-0 text-right ml-2">
          <p className="text-base font-black text-gray-900">{fmt(rec.suggested_amount)}</p>
          <p className="text-xs text-gray-400">{rec.suggested_pct}% shift</p>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 mt-1 ml-auto" /> : <ChevronDown className="w-4 h-4 text-gray-400 mt-1 ml-auto" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-gray-100 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Justification</p>
            <p className="text-sm text-gray-700">{rec.justification}</p>
            {(rec.from_program || rec.to_program) && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {rec.from_program && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 text-xs text-red-700 font-medium">↑ {rec.from_program}</div>}
                <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-900">{fmt(rec.suggested_amount)}</div>
                {rec.to_program && <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                {rec.to_program && <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-xs text-green-700 font-medium">{rec.to_program} ↓</div>}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Data Evidence</p>
            <ul className="space-y-1">
              {(rec.data_points || []).map((dp, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />{dp}
                </li>
              ))}
            </ul>
            {/* Confidence bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>AI confidence</span><span>{rec.confidence}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#2B5EA6] rounded-full" style={{ width: `${rec.confidence}%` }} />
              </div>
            </div>
          </div>
          {rec.status !== 'applied' && (
            <div className="md:col-span-2 flex gap-2 pt-2 border-t border-gray-100">
              <button onClick={() => onStatusChange(rec.id, 'applied')}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#2B5EA6] text-white text-xs font-bold rounded-xl hover:bg-[#2B5EA6]/90">
                <CheckCircle className="w-3.5 h-3.5" /> Mark as Applied
              </button>
              <button onClick={() => onStatusChange(rec.id, 'dismissed')}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-200">
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Report Generator
// ─────────────────────────────────────────────────────────────────────────────
function generateReport(programs: Program[], fy: number) {
  const allItems = programs.flatMap(p => p.line_items);
  const totalAllot = programs.reduce((s, p) => s + Number(p.total_allotment), 0);
  const totalUsed = allItems.reduce((s, li) => s + Number(li.utilized), 0);
  const totalObl = allItems.reduce((s, li) => s + Number(li.obligated), 0);
  const totalFree = totalAllot - totalUsed - totalObl;

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Budget Utilization Report FY${fy}</title>
<style>
  body{font-family:Arial,sans-serif;margin:40px;color:#1e293b;font-size:12px}
  h1{color:#2B5EA6;font-size:22px;border-bottom:3px solid #2B5EA6;padding-bottom:8px}
  h2{color:#374151;font-size:14px;margin-top:24px;background:#f1f5f9;padding:6px 10px;border-radius:6px}
  table{width:100%;border-collapse:collapse;margin-top:10px}
  th{background:#2B5EA6;color:white;padding:8px;text-align:left;font-size:11px}
  td{padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:11px}
  tr:nth-child(even)td{background:#f8fafc}
  .summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}
  .stat{background:#f1f5f9;border-radius:8px;padding:12px;text-align:center}
  .stat-val{font-size:18px;font-weight:bold;color:#2B5EA6}
  .stat-lbl{font-size:10px;color:#64748b;text-transform:uppercase}
  .prog-header{background:#60A85C;color:white;padding:6px 10px;border-radius:6px;margin-top:20px;font-size:13px;font-weight:bold}
  @media print{body{margin:20px}}
</style></head><body>
<h1>Budget Utilization Report — Fiscal Year ${fy}</h1>
<p style="color:#64748b;font-size:11px">Generated: ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · Calaca City Veterinary Management System</p>

<div class="summary-grid">
  <div class="stat"><div class="stat-val">${fmtM(totalAllot)}</div><div class="stat-lbl">Total Allotment</div></div>
  <div class="stat"><div class="stat-val" style="color:#22c55e">${fmtM(totalUsed)}</div><div class="stat-lbl">Utilized (${pct(totalUsed, totalAllot)}%)</div></div>
  <div class="stat"><div class="stat-val" style="color:#f59e0b">${fmtM(totalObl)}</div><div class="stat-lbl">Obligated</div></div>
  <div class="stat"><div class="stat-val" style="color:#64748b">${fmtM(totalFree)}</div><div class="stat-lbl">Available Balance</div></div>
</div>

<h2>Summary by Program</h2>
<table><thead><tr><th>Program</th><th>Allotment</th><th>Utilized</th><th>Obligated</th><th>Balance</th><th>Rate</th></tr></thead><tbody>
${programs.map(p => {
    const pu = p.line_items.reduce((s, li) => s + Number(li.utilized), 0);
    const po = p.line_items.reduce((s, li) => s + Number(li.obligated), 0);
    const pb = Number(p.total_allotment) - pu - po;
    const pr = pct(pu, Number(p.total_allotment));
    return `<tr><td><strong>${p.name}</strong></td><td>${fmt(Number(p.total_allotment))}</td><td>${fmt(pu)}</td><td>${fmt(po)}</td><td>${fmt(pb)}</td><td><strong>${pr}%</strong></td></tr>`;
  }).join('')}
</tbody></table>

${programs.map(p => `
<div class="prog-header">${p.name}</div>
${p.description ? `<p style="color:#475569;font-size:11px;margin:4px 0 8px">${p.description}</p>` : ''}
<table><thead><tr><th>Line Item</th><th>Category</th><th>Type</th><th>Allotment</th><th>Utilized</th><th>Obligated</th><th>Balance</th><th>%</th></tr></thead><tbody>
${p.line_items.map(li => {
    const r = pct(Number(li.utilized), Number(li.allotment));
    const b = Number(li.allotment) - Number(li.utilized) - Number(li.obligated);
    return `<tr><td>${li.name}</td><td>${li.category}</td><td style="text-transform:uppercase;font-size:10px;font-weight:bold">${li.expenditure_type}</td><td>${fmt(Number(li.allotment))}</td><td>${fmt(Number(li.utilized))}</td><td>${fmt(Number(li.obligated))}</td><td style="color:${b < 0 ? '#dc2626' : '#374151'}">${fmt(b)}</td><td><strong style="color:${r >= 95 ? '#dc2626' : r >= 80 ? '#d97706' : '#16a34a'}">${r}%</strong></td></tr>`;
  }).join('')}
</tbody></table>`).join('')}

<p style="margin-top:32px;font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;padding-top:12px">
  NASaAlaga VMS · Calaca City Veterinary Office · Confidential Budget Document
</p>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `Budget_Report_FY${fy}.html`;
  a.click(); URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export function BudgetUtilization({ userRole }: Props) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [recs, setRecs] = useState<AIRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'programs' | 'lineitems' | 'ai'>('overview');
  const [selectedProgId, setSelectedProgId] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'capex' | 'opex'>('all');
  const [fy, setFy] = useState(2025);
  const [showProgModal, setShowProgModal] = useState(false);
  const [editingProg, setEditingProg] = useState<Program | null>(null);
  const [showLIModal, setShowLIModal] = useState(false);
  const [editingLI, setEditingLI] = useState<LineItem | null>(null);
  const [expenditureTarget, setExpenditureTarget] = useState<LineItem | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadPrograms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getBudgetPrograms(fy);
      const progs = (res.programs || []).map((p: any) => ({
        ...p,
        total_allotment: Number(p.total_allotment),
        line_items: (p.line_items || []).map((li: any) => ({
          ...li,
          allotment: Number(li.allotment),
          utilized: Number(li.utilized),
          obligated: Number(li.obligated),
        })),
      }));
      setPrograms(progs);
      if (!selectedProgId && progs.length) setSelectedProgId(progs[0].id);
    } catch (e) { showToast('Failed to load budget data', 'error'); }
    setLoading(false);
  }, [fy, selectedProgId]);

  const loadSavedRecs = useCallback(async () => {
    try {
      const res = await api.getBudgetAIRecs(fy);
      if (res.recommendations?.length) setRecs(res.recommendations.map((r: any) => ({ ...r, data_points: r.data_points || [] })));
    } catch { /* silent */ }
  }, [fy]);

  useEffect(() => { loadPrograms(); loadSavedRecs(); }, [fy]);

  // ── AI Analysis ──────────────────────────────────────────────────────────
  const runAI = useCallback(async () => {
    setAiLoading(true);
    setActiveTab('ai');
    try {
      const ctx = await api.getBudgetContext(fy);
      const prompt = buildAIPrompt(ctx);
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await response.json();
      const text = (data.content || []).map((c: any) => c.text || '').join('');
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed: AIRec[] = JSON.parse(clean);
      if (Array.isArray(parsed)) {
        setRecs(parsed);
        await api.saveBudgetAIRecs({ recommendations: parsed, fiscal_year: fy });
        showToast(`AI generated ${parsed.length} recommendations`);
      }
    } catch (e) {
      showToast('AI analysis failed. Check API connection.', 'error');
    }
    setAiLoading(false);
  }, [fy, programs]);

  // ── Program CRUD ─────────────────────────────────────────────────────────
  const saveProgram = async (data: any) => {
    try {
      if (editingProg) {
        await api.updateBudgetProgram(editingProg.id, data);
        showToast('Program updated');
      } else {
        await api.createBudgetProgram({ ...data, fiscal_year: fy });
        showToast('Program created');
      }
      setShowProgModal(false); setEditingProg(null);
      loadPrograms();
    } catch { showToast('Save failed', 'error'); }
  };

  const deleteProgram = async (id: string) => {
    if (!confirm('Delete this program and all its line items?')) return;
    try {
      await api.deleteBudgetProgram(id);
      showToast('Program deleted');
      loadPrograms();
    } catch { showToast('Delete failed', 'error'); }
  };

  // ── Line Item CRUD ───────────────────────────────────────────────────────
  const saveLineItem = async (data: any) => {
    try {
      if (editingLI?.id) {
        await api.updateBudgetLineItem(editingLI.id, data);
        showToast('Line item updated');
      } else {
        await api.createBudgetLineItem(data);
        showToast('Line item added');
      }
      setShowLIModal(false); setEditingLI(null);
      loadPrograms();
    } catch { showToast('Save failed', 'error'); }
  };

  const deleteLineItem = async (id: string) => {
    if (!confirm('Delete this line item and all its expenditures?')) return;
    try {
      await api.deleteBudgetLineItem(id);
      showToast('Line item deleted');
      loadPrograms();
    } catch { showToast('Delete failed', 'error'); }
  };

  // ── Expenditures ─────────────────────────────────────────────────────────
  const addExpenditure = async (data: any) => {
    if (!data) { loadPrograms(); return; }
    try {
      await api.addBudgetExpenditure(data);
      showToast(`Expenditure of ${fmt(data.amount)} recorded`);
      loadPrograms();
    } catch { showToast('Failed to add expenditure', 'error'); }
  };

  // ── Rec status ───────────────────────────────────────────────────────────
  const updateRecStatus = async (id: string, status: string) => {
    try {
      await api.updateBudgetRecStatus(id, status);
      setRecs(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      showToast(status === 'applied' ? 'Marked as applied' : 'Recommendation dismissed');
    } catch { showToast('Update failed', 'error'); }
  };

  // ── Derived numbers ───────────────────────────────────────────────────────
  const allItems = programs.flatMap(p => p.line_items);
  const totalAllot = programs.reduce((s, p) => s + Number(p.total_allotment), 0);
  const totalUsed = allItems.reduce((s, li) => s + Number(li.utilized), 0);
  const totalObl = allItems.reduce((s, li) => s + Number(li.obligated), 0);
  const totalFree = totalAllot - totalUsed - totalObl;
  const overallRate = pct(totalUsed, totalAllot);
  const selectedProg = programs.find(p => p.id === selectedProgId) || programs[0];
  const filteredItems = (selectedProg?.line_items || []).filter(li => filterType === 'all' || li.expenditure_type === filterType);

  const barData = programs.map(p => ({
    name: p.name.split(' ').slice(0, 2).join(' '),
    Allotment: Number(p.total_allotment),
    Utilized: p.line_items.reduce((s, li) => s + Number(li.utilized), 0),
    Obligated: p.line_items.reduce((s, li) => s + Number(li.obligated), 0),
  }));

  const pieData = programs.map((p, i) => ({
    name: p.name.split(' ').slice(0, 3).join(' '),
    value: Number(p.total_allotment),
    color: p.color || PROG_COLORS[i % PROG_COLORS.length],
  }));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-6 h-6 animate-spin text-[#2B5EA6] mr-3" />
      <span className="text-gray-500">Loading budget data…</span>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-[#60A85C]" />
            Budget Utilization
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">FY{fy} · Real-time budget tracking &amp; AI planning</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={fy} onChange={e => setFy(Number(e.target.value))}
            className="border border-gray-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]/30 bg-white">
            {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
          </select>
          <button onClick={() => generateReport(programs, fy)}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-sm font-semibold px-3 py-2 rounded-xl hover:bg-gray-50">
            <Download className="w-4 h-4" /> Report
          </button>
          {isAdmin && (
            <button onClick={() => { setEditingProg(null); setShowProgModal(true); }}
              className="flex items-center gap-1.5 bg-[#2B5EA6] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#2B5EA6]/90">
              <Plus className="w-4 h-4" /> Add Program
            </button>
          )}
          <button onClick={runAI} disabled={aiLoading}
            className="flex items-center gap-1.5 bg-[#60A85C]/10 border border-[#60A85C]/30 text-[#60A85C] text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#60A85C]/20 disabled:opacity-50">
            {aiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            {aiLoading ? 'Analyzing…' : 'AI Analysis'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Allotment', val: fmtM(totalAllot), sub: `FY${fy}`, icon: DollarSign, color: 'text-[#2B5EA6]', bg: 'bg-blue-50' },
          { label: 'Utilized', val: fmtM(totalUsed), sub: `${overallRate}% utilization`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Obligated', val: fmtM(totalObl), sub: 'Committed, not paid', icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Available Balance', val: fmtM(totalFree), sub: `${pct(totalFree, totalAllot)}% free`, icon: Target, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${k.bg}`}>
              <k.icon className={`w-5 h-5 ${k.color}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{k.label}</p>
              <p className="text-lg font-black text-gray-900 mt-0.5">{k.val}</p>
              <p className="text-xs text-gray-400">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { key: 'overview', label: 'Overview', icon: BarChart2 },
          { key: 'programs', label: 'Programs', icon: FileText },
          { key: 'lineitems', label: 'Line Items', icon: Package },
          { key: 'ai', label: `AI Insights${recs.filter(r => r.status !== 'dismissed').length > 0 ? ` (${recs.filter(r => r.status !== 'dismissed').length})` : ''}`, icon: Brain },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.key ? 'bg-white shadow text-[#2B5EA6]' : 'text-gray-500 hover:text-gray-700'}`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* ─── OVERVIEW ─── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Budget vs Utilization by Program</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData} margin={{ bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" interval={0} />
                <YAxis tickFormatter={v => `₱${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Allotment" fill="#bfdbfe" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Utilized" fill="#2B5EA6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Obligated" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Allotment Share by Program</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value"
                  label={({ name, percent }: any) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* CAPEX/OPEX */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">CAPEX vs OPEX</h3>
            <div className="grid grid-cols-2 gap-4">
              {(['capex', 'opex'] as const).map(t => {
                const its = allItems.filter(li => li.expenditure_type === t);
                const a = its.reduce((s, li) => s + Number(li.allotment), 0);
                const u = its.reduce((s, li) => s + Number(li.utilized), 0);
                const r = pct(u, a);
                return (
                  <div key={t} className="bg-gray-50 rounded-xl p-4">
                    <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${t === 'capex' ? 'text-purple-600' : 'text-blue-600'}`}>{t.toUpperCase()}</p>
                    <p className="text-base font-black text-gray-900">{fmt(a)}</p>
                    <p className="text-xs text-gray-400 mb-2">Total Allotment</p>
                    <UtilBar utilized={u} allotment={a} obligated={0} />
                    <div className="flex justify-between mt-1 text-xs">
                      <span className="text-gray-600">{fmt(u)} used</span>
                      <span className={`font-bold ${utilColor(r)}`}>{r}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Line item health */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Line Item Health (sorted by utilization)</h3>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {allItems.sort((a, b) => pct(Number(b.utilized), Number(b.allotment)) - pct(Number(a.utilized), Number(a.allotment))).map(li => {
                const r = pct(Number(li.utilized), Number(li.allotment));
                const prog = programs.find(p => p.id === li.program_id);
                return (
                  <div key={li.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700 font-medium truncate" style={{ maxWidth: 220 }}>{li.name}</span>
                      <span className={`font-bold ml-2 ${utilColor(r)}`}>{r}%</span>
                    </div>
                    <UtilBar utilized={Number(li.utilized)} allotment={Number(li.allotment)} obligated={Number(li.obligated)} />
                    <p className="text-[10px] text-gray-400 mt-0.5">{prog?.name}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── PROGRAMS ─── */}
      {activeTab === 'programs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {programs.map((prog, pi) => {
            const pu = prog.line_items.reduce((s, li) => s + Number(li.utilized), 0);
            const po = prog.line_items.reduce((s, li) => s + Number(li.obligated), 0);
            const pr = pct(pu, Number(prog.total_allotment));
            return (
              <div key={prog.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 hover:border-gray-300 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: prog.color || PROG_COLORS[pi % PROG_COLORS.length] }} />
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{prog.name}</h3>
                      {prog.description && <p className="text-xs text-gray-500 mt-0.5">{prog.description}</p>}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingProg(prog); setShowProgModal(true); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteProgram(prog.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
                <UtilBar utilized={pu} allotment={Number(prog.total_allotment)} obligated={po} />
                <div className="flex justify-between mt-1.5 text-xs">
                  <span className="text-gray-500">{fmt(pu)} of {fmt(Number(prog.total_allotment))}</span>
                  <span className={`font-bold ${utilColor(pr)}`}>{pr}%</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[
                    { label: 'Allotment', val: fmt(Number(prog.total_allotment)), color: 'text-blue-600' },
                    { label: 'Obligated', val: fmt(po), color: 'text-amber-600' },
                    { label: 'Line Items', val: String(prog.line_items.length), color: 'text-gray-700' },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-lg p-2 text-center">
                      <p className={`text-xs font-bold ${s.color}`}>{s.val}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
                <button onClick={() => { setSelectedProgId(prog.id); setActiveTab('lineitems'); }}
                  className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-[#2B5EA6] font-semibold hover:bg-blue-50 rounded-xl py-1.5 transition-colors">
                  View Line Items <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── LINE ITEMS ─── */}
      {activeTab === 'lineitems' && (
        <div className="space-y-4">
          {/* Program selector */}
          <div className="flex gap-2 flex-wrap items-center">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-wrap">
              {programs.map((p, pi) => (
                <button key={p.id} onClick={() => setSelectedProgId(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedProgId === p.id ? 'text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}
                  style={selectedProgId === p.id ? { backgroundColor: p.color || PROG_COLORS[pi % PROG_COLORS.length] } : {}}>
                  {p.name.split(' ').slice(0, 2).join(' ')}
                </button>
              ))}
            </div>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              {(['all', 'capex', 'opex'] as const).map(t => (
                <button key={t} onClick={() => setFilterType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${filterType === t ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>
                  {t === 'all' ? 'All' : t.toUpperCase()}
                </button>
              ))}
            </div>
            {isAdmin && selectedProg && (
              <button onClick={() => { setEditingLI(null); setShowLIModal(true); }}
                className="flex items-center gap-1 bg-[#2B5EA6]/10 text-[#2B5EA6] border border-[#2B5EA6]/20 text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-[#2B5EA6]/20">
                <Plus className="w-3.5 h-3.5" /> Add Line Item
              </button>
            )}
          </div>

          {/* Program total */}
          {selectedProg && (() => {
            const pu = selectedProg.line_items.reduce((s, li) => s + Number(li.utilized), 0);
            const po = selectedProg.line_items.reduce((s, li) => s + Number(li.obligated), 0);
            const pr = pct(pu, Number(selectedProg.total_allotment));
            return (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-900">{selectedProg.name}</h3>
                  <span className={`text-lg font-black ${utilColor(pr)}`}>{pr}%</span>
                </div>
                <UtilBar utilized={pu} allotment={Number(selectedProg.total_allotment)} obligated={po} />
                <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                  <span>Allotment: <strong className="text-gray-900">{fmt(Number(selectedProg.total_allotment))}</strong></span>
                  <span>Utilized: <strong className="text-green-600">{fmt(pu)}</strong></span>
                  <span>Obligated: <strong className="text-amber-600">{fmt(po)}</strong></span>
                  <span>Balance: <strong className={Number(selectedProg.total_allotment) - pu - po < 0 ? 'text-red-600' : 'text-gray-700'}>{fmt(Number(selectedProg.total_allotment) - pu - po)}</strong></span>
                </div>
              </div>
            );
          })()}

          {/* Line items table */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Line Item</th>
                    <th className="text-left px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="text-right px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Allotment</th>
                    <th className="text-right px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Utilized</th>
                    <th className="text-right px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Obligated</th>
                    <th className="text-right px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Balance</th>
                    <th className="px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Progress</th>
                    <th className="px-3 py-3 w-28" />
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-sm">No line items found.</td></tr>
                  ) : filteredItems.map(li => {
                    const r = pct(Number(li.utilized), Number(li.allotment));
                    const bal = Number(li.allotment) - Number(li.utilized) - Number(li.obligated);
                    return (
                      <tr key={li.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900 text-xs">{li.name}</p>
                          <p className="text-gray-400 text-[10px]">{li.category}</p>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${li.expenditure_type === 'capex' ? 'bg-purple-100 text-purple-700' : 'bg-cyan-100 text-cyan-700'}`}>
                            {li.expenditure_type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-xs font-semibold text-gray-900">{fmt(Number(li.allotment))}</td>
                        <td className="px-3 py-3 text-right text-xs font-semibold text-green-600">{fmt(Number(li.utilized))}</td>
                        <td className="px-3 py-3 text-right text-xs font-semibold text-amber-600">{fmt(Number(li.obligated))}</td>
                        <td className={`px-3 py-3 text-right text-xs font-semibold ${bal < 0 ? 'text-red-600' : 'text-gray-600'}`}>{fmt(bal)}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1"><UtilBar utilized={Number(li.utilized)} allotment={Number(li.allotment)} obligated={Number(li.obligated)} /></div>
                            <span className={`text-[10px] font-bold w-8 text-right ${utilColor(r)}`}>{r}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => setExpenditureTarget(li)} title="Add expenditure"
                              className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><Receipt className="w-3.5 h-3.5" /></button>
                            {isAdmin && <>
                              <button onClick={() => { setEditingLI(li); setShowLIModal(true); }}
                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => deleteLineItem(li.id)}
                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                            </>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── AI INSIGHTS ─── */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm flex-shrink-0">
              <Brain className="w-6 h-6 text-[#2B5EA6]" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">AI-Powered Budget Intelligence</h3>
              <p className="text-sm text-gray-600 mt-1">
                Claude analyzes your <strong>real live data</strong> — budget utilization rates, medicine inventory, expiry dates,
                biting incidents, impounding records, spay/neuter counts, livestock disease events, and vaccination coverage — to produce
                objective, data-driven recommendations with quantified justifications.
              </p>
            </div>
            <button onClick={runAI} disabled={aiLoading}
              className="flex-shrink-0 flex items-center gap-1.5 border border-[#60A85C]/40 bg-white text-[#60A85C] text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#60A85C]/10 disabled:opacity-50">
              {aiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {aiLoading ? 'Analyzing…' : 'Refresh Analysis'}
            </button>
          </div>

          {aiLoading && (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Claude AI is analyzing your live database data…</span>
            </div>
          )}

          {!aiLoading && recs.length === 0 && (
            <div className="text-center py-16">
              <Brain className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500">No recommendations yet. Click "AI Analysis" to analyze your budget and operations data.</p>
            </div>
          )}

          {!aiLoading && recs.filter(r => r.status !== 'dismissed').map(rec => (
            <div key={rec.id}>
              <RecCard rec={rec} onStatusChange={updateRecStatus} />
            </div>
          ))}

          {recs.some(r => r.status === 'dismissed') && (
            <p className="text-xs text-center text-gray-400">
              {recs.filter(r => r.status === 'dismissed').length} dismissed recommendation(s) hidden.
            </p>
          )}
        </div>
      )}

      {/* Modals */}
      {showProgModal && <ProgramModal program={editingProg} onClose={() => { setShowProgModal(false); setEditingProg(null); }} onSave={saveProgram} />}
      {showLIModal && selectedProg && <LineItemModal item={editingLI} programId={selectedProg.id} fy={fy} onClose={() => { setShowLIModal(false); setEditingLI(null); }} onSave={saveLineItem} />}
      {expenditureTarget && <ExpenditureModal lineItem={expenditureTarget} onClose={() => setExpenditureTarget(null)} onSave={(d) => { addExpenditure(d); if (d) setExpenditureTarget(null); }} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Prompt Builder
// ─────────────────────────────────────────────────────────────────────────────
function buildAIPrompt(ctx: any): string {
  const programs = (ctx.programs || []).map((p: any) => ({
    program: p.name,
    allotment: Number(p.total_allotment),
    line_items: (p.line_items || []).map((li: any) => ({
      name: li.name, category: li.category, type: li.expenditure_type,
      allotment: Number(li.allotment), utilized: Number(li.utilized),
      obligated: Number(li.obligated),
      util_pct: Number(li.allotment) > 0 ? Math.round(Number(li.utilized) / Number(li.allotment) * 100) : 0,
      free: Number(li.allotment) - Number(li.utilized) - Number(li.obligated),
    })),
  }));

  const inventory = (ctx.inventory || []).slice(0, 25).map((m: any) => ({
    name: m.name, category: m.category, qty: m.quantity,
    reorder: m.reorder_level, status: m.stock_status,
    expiry: m.expiry_date ? m.expiry_date.split('T')[0] : null,
    unit_cost: Number(m.unit_cost),
    value: Math.round(Number(m.unit_cost) * Number(m.quantity)),
  }));

  return `You are a veterinary office fiscal analyst for Calaca City's Veterinary Management System. Analyze the live data below and generate 5–8 OBJECTIVE, DATA-DRIVEN budget recommendations.

BUDGET DATA (FY${ctx.fiscal_year}):
${JSON.stringify(programs, null, 2)}

MEDICINE INVENTORY:
${JSON.stringify(inventory, null, 2)}

OPERATIONAL STATS (last 6 months):
- Pets: ${ctx.pet_stats?.total || 0} total, ${ctx.pet_stats?.vaccinated || 0} vaccinated
- Livestock: ${ctx.livestock_stats?.total_animals || 0} animals, ${ctx.livestock_stats?.sick || 0} sick
- Biting incidents: ${ctx.biting_incidents_6mo?.total || 0} total, ${ctx.biting_incidents_6mo?.rabies_confirmed || 0} rabies confirmed
- Impounding operations: ${ctx.impounding_6mo || 0}
- Spay/Neuter procedures: ${ctx.spay_neuter_6mo || 0}

RULES:
1. Base ALL recommendations strictly on numbers above — no invented data
2. Types: "realignment" (move within FY), "reallocation" (between programs), "next_fy" (plan for next FY), "warning" (critical), "infrastructure" (facility/equipment), "program" (new or expanded program)
3. For infrastructure: if impounding is >20 in 6 months, recommend shelter expansion; if spay/neuter >30, recommend budget increase
4. For inventory: compare expiring items (within 90 days) vs critical stock items — recommend procurement plan adjustment
5. Suggested_pct must be computed from actual gaps, not arbitrary — max 60%
6. Confidence: 85–95 for clear data signals, 65–80 for trends, <65 for weak signals
7. Include at minimum 3 data_points per recommendation quoting actual numbers

Return ONLY valid JSON array — no markdown, no preamble:
[
  {
    "id": "REC-${Date.now()}-001",
    "type": "realignment",
    "priority": "high",
    "title": "Short specific title",
    "narrative": "2–3 sentence plain-language explanation referencing actual numbers",
    "from_program": "Source program name or null",
    "to_program": "Destination program name or null",
    "suggested_pct": 25,
    "suggested_amount": 50000,
    "justification": "1–2 sentences referencing specific utilization rates and figures",
    "data_points": ["evidence 1 with numbers", "evidence 2 with numbers", "evidence 3 with numbers"],
    "confidence": 82,
    "generated_at": "${new Date().toISOString()}"
  }
]`;
}

export default BudgetUtilization;
