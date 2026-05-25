import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
  FlaskConical, Package, Plus, Search, Edit2, Trash2, AlertTriangle,
  CheckCircle, BarChart2, RefreshCw, X, Barcode, Calendar, Thermometer,
  Building2, Hash, ChevronDown, TrendingDown, TrendingUp, ShieldAlert,
  ArrowDown, ArrowUp, BookOpen, LogIn, LogOut, DollarSign, Layers,
  Activity, Info, Eye, Filter,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { api } from '../lib/api';
import type { UserRole } from '../App';

interface Props { userRole: UserRole }

const COLORS = ['#2B5EA6', '#60A85C', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
const MEDICINE_CATEGORIES = ['Vaccine', 'Antibiotic', 'Antiparasitic', 'Vitamin', 'Analgesic', 'Antifungal', 'Other'];
const SUPPLY_CATEGORIES = ['Medical Supplies', 'PPE', 'Diagnostic', 'Cold Chain', 'Wound Care', 'Disinfectant', 'Other'];
const PURPOSES_MED = [
  { value: 'program', label: 'Program (link to Budget Program)' },
  { value: 'office', label: 'Office / Operating' },
];
const PURPOSES_SUP = [
  { value: 'office', label: 'Office / Operating' },
  { value: 'program', label: 'Program (link to Budget Program)' },
];

function StatusBadge({ qty, reorder }: { qty: number; reorder: number }) {
  if (qty === 0) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">Out of Stock</span>;
  if (qty <= reorder) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Low Stock</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">In Stock</span>;
}

function ExpiryBadge({ date }: { date?: string }) {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const days = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">Expired</span>;
  if (days <= 90) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">Exp. {days}d</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600">{d.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })}</span>;
}

// ── Medicine Modal ──────────────────────────────────────────────────────────
function MedicineModal({ item, programs, onClose, onSave }: { item?: any; programs: any[]; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState(item ? {
    name: item.name, genericName: item.generic_name || '', category: item.category,
    type: item.type || '', lotNumber: item.lot_number || '', expiryDate: item.expiry_date?.split('T')[0] || '',
    manufactureDate: item.manufacture_date?.split('T')[0] || '', manufacturer: item.manufacturer || '',
    quantity: item.quantity, unit: item.unit || 'vials', reorderLevel: item.reorder_level,
    unitCost: item.unit_cost, storageCondition: item.storage_condition || '', description: item.description || '',
    barcode: item.barcode || '', status: item.status || 'Active',
    purpose: item.purpose || 'program', programId: item.program_id || '', lineItemId: item.line_item_id || '',
    fiscalYear: item.fiscal_year || new Date().getFullYear(), receivedBy: item.received_by || '',
  } : {
    name: '', genericName: '', category: 'Vaccine', type: '', lotNumber: '', expiryDate: '',
    manufactureDate: '', manufacturer: '', quantity: 0, unit: 'vials', reorderLevel: 10,
    unitCost: 0, storageCondition: '', description: '', barcode: '', status: 'Active',
    purpose: 'program', programId: '', lineItemId: '', fiscalYear: new Date().getFullYear(), receivedBy: '',
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const totalCost = (form.quantity || 0) * (form.unitCost || 0);
  const selectedProg = programs.find(p => p.id === form.programId);
  const lineItems = selectedProg?.line_items || [];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-[#2B5EA6]" />
            {item ? 'Edit Medicine / Vitamin' : 'Add Medicine / Vitamin'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Purpose */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <label className="block text-xs font-semibold text-blue-700 mb-2">Purpose *</label>
            <div className="flex gap-3">
              {PURPOSES_MED.map(p => (
                <button key={p.value} onClick={() => set('purpose', p.value)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${form.purpose === p.value ? 'bg-[#2B5EA6] text-white border-[#2B5EA6]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#2B5EA6]'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Program linkage */}
          {form.purpose === 'program' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Budget Program</label>
                <select value={form.programId} onChange={e => { set('programId', e.target.value); set('lineItemId', ''); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="">— Select Program —</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name} (FY{p.fiscal_year})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Line Item (charge to)</label>
                <select value={form.lineItemId} onChange={e => set('lineItemId', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" disabled={!lineItems.length}>
                  <option value="">— Select Line Item —</option>
                  {lineItems.map((li: any) => <option key={li.id} value={li.id}>{li.name} (₱{Number(li.allotment || 0).toLocaleString()} alloted)</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Received by */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Received By (name of recipient) *</label>
            <input value={form.receivedBy} onChange={e => set('receivedBy', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2B5EA6]/30 outline-none"
              placeholder="Full name of person who received this stock" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Product Name *', key: 'name', col: 2 },
              { label: 'Generic Name', key: 'genericName', col: 1 },
              { label: 'Manufacturer', key: 'manufacturer', col: 1 },
              { label: 'Lot / Batch Number', key: 'lotNumber', col: 1 },
              { label: 'Barcode', key: 'barcode', col: 1 },
              { label: 'Manufacture Date', key: 'manufactureDate', type: 'date', col: 1 },
              { label: 'Expiry Date', key: 'expiryDate', type: 'date', col: 1 },
              { label: 'Quantity', key: 'quantity', type: 'number', col: 1 },
              { label: 'Unit', key: 'unit', col: 1 },
              { label: 'Reorder Level', key: 'reorderLevel', type: 'number', col: 1 },
              { label: 'Unit Price (₱)', key: 'unitCost', type: 'number', step: '0.01', col: 1 },
              { label: 'Storage Condition', key: 'storageCondition', col: 2 },
              { label: 'Description', key: 'description', col: 2 },
            ].map(({ label, key, col, type, step }: any) => (
              <div key={key} className={col === 2 ? 'col-span-2' : ''}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                <input type={type || 'text'} step={step}
                  value={(form as any)[key]}
                  onChange={e => set(key, type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2B5EA6]/30 outline-none" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                {MEDICINE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Type / Subtype</label>
              <input value={form.type} onChange={e => set('type', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
          </div>

          {/* Total cost summary */}
          {totalCost > 0 && (
            <div className="bg-green-50 rounded-xl px-4 py-3 flex items-center justify-between border border-green-100">
              <span className="text-sm text-green-700 font-semibold">Total Cost (Qty × Unit Price)</span>
              <span className="text-lg font-black text-green-800">₱{totalCost.toLocaleString('en-PH', { maximumFractionDigits: 2 })}</span>
            </div>
          )}
          {form.lineItemId && totalCost > 0 && (
            <div className="bg-amber-50 rounded-xl px-4 py-3 text-sm text-amber-700 border border-amber-100">
              <strong>💡 Budget Impact:</strong> ₱{totalCost.toLocaleString('en-PH', { maximumFractionDigits: 2 })} will be automatically charged to the selected budget line item.
            </div>
          )}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 justify-end rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={() => onSave(form)} className="px-6 py-2 bg-[#2B5EA6] text-white rounded-xl text-sm font-semibold hover:bg-[#2B5EA6]/90">
            {item ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Supply Modal ─────────────────────────────────────────────────────────────
function SupplyModal({ item, programs, onClose, onSave }: { item?: any; programs: any[]; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState(item ? {
    name: item.name, category: item.category, type: item.type || '',
    quantity: item.quantity, unit: item.unit || 'pieces', reorderLevel: item.reorder_level,
    unitCost: item.unit_cost, supplier: item.supplier || '',
    lastRestocked: item.last_restocked?.split('T')[0] || '',
    description: item.description || '', barcode: item.barcode || '', status: item.status || 'Active',
    purpose: item.purpose || 'office', programId: item.program_id || '', lineItemId: item.line_item_id || '',
    fiscalYear: item.fiscal_year || new Date().getFullYear(), receivedBy: item.received_by || '',
  } : {
    name: '', category: 'Medical Supplies', type: '', quantity: 0, unit: 'pieces',
    reorderLevel: 5, unitCost: 0, supplier: '', lastRestocked: '', description: '', barcode: '', status: 'Active',
    purpose: 'office', programId: '', lineItemId: '', fiscalYear: new Date().getFullYear(), receivedBy: '',
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const totalCost = (form.quantity || 0) * (form.unitCost || 0);
  const lineItems = programs.find(p => p.id === form.programId)?.line_items || [];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-[#60A85C]" />{item ? 'Edit Supply' : 'Add Supply'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <label className="block text-xs font-semibold text-green-700 mb-2">Purpose *</label>
            <div className="flex gap-3">
              {PURPOSES_SUP.map(p => (
                <button key={p.value} onClick={() => set('purpose', p.value)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${form.purpose === p.value ? 'bg-[#60A85C] text-white border-[#60A85C]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#60A85C]'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {form.purpose === 'program' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Budget Program</label>
                <select value={form.programId} onChange={e => { set('programId', e.target.value); set('lineItemId', ''); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="">— Select Program —</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name} (FY{p.fiscal_year})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Line Item</label>
                <select value={form.lineItemId} onChange={e => set('lineItemId', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" disabled={!lineItems.length}>
                  <option value="">— Select Line Item —</option>
                  {lineItems.map((li: any) => <option key={li.id} value={li.id}>{li.name}</option>)}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Received By *</label>
            <input value={form.receivedBy} onChange={e => set('receivedBy', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
              placeholder="Full name of person who received this supply" />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Supply Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                {SUPPLY_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Barcode</label>
              <input value={form.barcode} onChange={e => set('barcode', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
            {[
              { label: 'Supplier', key: 'supplier', col: 1 },
              { label: 'Type', key: 'type', col: 1 },
              { label: 'Quantity', key: 'quantity', type: 'number', col: 1 },
              { label: 'Unit', key: 'unit', col: 1 },
              { label: 'Reorder Level', key: 'reorderLevel', type: 'number', col: 1 },
              { label: 'Unit Price (₱)', key: 'unitCost', type: 'number', step: '0.01', col: 1 },
              { label: 'Last Restocked', key: 'lastRestocked', type: 'date', col: 1 },
              { label: 'Description', key: 'description', col: 2 },
            ].map(({ label, key, col, type, step }: any) => (
              <div key={key} className={col === 2 ? 'col-span-2' : ''}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                <input type={type || 'text'} step={step}
                  value={(form as any)[key]}
                  onChange={e => set(key, type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
            ))}
          </div>
          {totalCost > 0 && (
            <div className="bg-green-50 rounded-xl px-4 py-3 flex items-center justify-between border border-green-100">
              <span className="text-sm text-green-700 font-semibold">Total Cost</span>
              <span className="text-lg font-black text-green-800">₱{totalCost.toLocaleString('en-PH', { maximumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 justify-end rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={() => onSave(form)} className="px-6 py-2 bg-[#60A85C] text-white rounded-xl text-sm font-semibold hover:bg-[#60A85C]/90">
            {item ? 'Save Changes' : 'Add Supply'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Movement Modal ─────────────────────────────────────────────────────────
function MovementModal({ item, itemType, onClose, onSave }: { item: any; itemType: string; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({ transaction_type: 'OUT', quantity: 1, reason: '', reference_person: '', notes: '' });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#2B5EA6]" /> Stock Movement
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p className="text-sm font-semibold text-gray-800">{item.name}</p>
            <p className="text-xs text-gray-500">Current stock: <strong>{item.quantity} {item.unit}</strong></p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => set('transaction_type', 'IN')}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border transition-all ${form.transaction_type === 'IN' ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'}`}>
              <ArrowDown className="w-4 h-4" /> Stock IN
            </button>
            <button onClick={() => set('transaction_type', 'OUT')}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border transition-all ${form.transaction_type === 'OUT' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-200 hover:border-red-400'}`}>
              <ArrowUp className="w-4 h-4" /> Stock OUT
            </button>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity *</label>
            <input type="number" min="1" value={form.quantity} onChange={e => set('quantity', parseInt(e.target.value) || 1)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              {form.transaction_type === 'IN' ? 'Received By (Name) *' : 'Requested/Used By (Name) *'}
            </label>
            <input value={form.reference_person} onChange={e => set('reference_person', e.target.value)}
              placeholder={form.transaction_type === 'IN' ? 'Full name of recipient' : 'Full name of person who requested/used this'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Reason *</label>
            <input value={form.reason} onChange={e => set('reason', e.target.value)}
              placeholder={form.transaction_type === 'IN' ? 'e.g. Restocking from PLGU delivery' : 'e.g. Used for vaccination drive'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes (optional)</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none resize-none" />
          </div>
        </div>
        <div className="border-t border-gray-100 px-6 py-4 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={() => onSave({ item_id: item.id, item_type: itemType, ...form })}
            className={`px-6 py-2 text-white rounded-xl text-sm font-semibold ${form.transaction_type === 'IN' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
            Record Movement
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Logbook Modal ─────────────────────────────────────────────────────────────
function LogbookModal({ transactions, itemName, onClose }: { transactions: any[]; itemName: string; onClose: () => void }) {
  const txColor = (t: string) => {
    if (t === 'IN') return 'bg-green-100 text-green-700';
    if (t === 'OUT') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-600';
  };
  const sourceLabel = (s: string) => {
    const map: any = { manual: 'Manual', purchase: 'Purchase/Receive', outbreak: 'Outbreak Dispatch', vaccination: 'Vaccination', update: 'Stock Update' };
    return map[s] || s;
  };
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#2B5EA6]" /> Digital Logbook — {itemName}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {!transactions.length ? (
            <p className="text-center text-gray-400 py-8">No movement records found.</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx: any) => (
                <div key={tx.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-start gap-4">
                  <div className={`flex-shrink-0 px-2 py-1 rounded-lg text-xs font-bold ${txColor(tx.transaction_type)}`}>
                    {tx.transaction_type === 'IN' ? '▲ IN' : tx.transaction_type === 'OUT' ? '▼ OUT' : tx.transaction_type}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-900">{tx.quantity} {tx.unit || 'units'}</span>
                      {tx.previous_qty != null && tx.new_qty != null && (
                        <span className="text-xs text-gray-400">{tx.previous_qty} → {tx.new_qty}</span>
                      )}
                      <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">{sourceLabel(tx.source_type)}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{tx.reason || '—'}</p>
                    <div className="flex gap-4 mt-2 flex-wrap">
                      {tx.reference_person && (
                        <span className="text-xs text-gray-500">👤 {tx.transaction_type === 'IN' ? 'Received by' : 'Used by'}: <strong>{tx.reference_person}</strong></span>
                      )}
                      <span className="text-xs text-gray-400">Recorded by: {tx.performed_by}</span>
                      {tx.total_cost > 0 && <span className="text-xs text-gray-400">Value: ₱{Number(tx.total_cost).toLocaleString()}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{new Date(tx.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
export function InventoryPage({ userRole }: Props) {
  const canEdit = ['admin', 'superadmin'].includes(userRole);
  const [tab, setTab] = useState<'overview' | 'medicines' | 'supplies' | 'logbook'>('overview');
  const [medicines, setMedicines] = useState<any[]>([]);
  const [supplies, setSupplies] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [purposeFilter, setPurposeFilter] = useState('All');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showMedModal, setShowMedModal] = useState(false);
  const [showSupModal, setShowSupModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState<{ item: any; type: string } | null>(null);
  const [showLogbook, setShowLogbook] = useState<{ item: any; txs: any[] } | null>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [error, setError] = useState('');
  const barcodeRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [meds, sups, txs, bps] = await Promise.all([
        api.getMedicines(),
        api.getSupplies(),
        api.getInventoryTransactions({ limit: 500 }),
        api.getBudgetPrograms(new Date().getFullYear()),
      ]);
      setMedicines(meds.medicines || []);
      setSupplies(sups.supplies || []);
      setTransactions(txs.transactions || []);
      setPrograms(bps.programs || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleBarcodeSearch = () => {
    if (!barcodeInput.trim()) return;
    const found = medicines.find(m => m.barcode === barcodeInput.trim()) ||
      supplies.find(s => s.barcode === barcodeInput.trim());
    if (found) {
      setTab(found.lot_number !== undefined ? 'medicines' : 'supplies');
      setSearch(barcodeInput.trim());
    } else { setError(`No item found with barcode: ${barcodeInput}`); }
    setBarcodeInput('');
  };

  const saveMedicine = async (form: any) => {
    try {
      if (editItem) await api.updateMedicine(editItem.id, form);
      else await api.createMedicine(form);
      setShowMedModal(false); setEditItem(null);
      await loadData();
    } catch (e: any) { setError(e.message); }
  };

  const saveSupply = async (form: any) => {
    try {
      if (editItem) await api.updateSupply(editItem.id, form);
      else await api.createSupply(form);
      setShowSupModal(false); setEditItem(null);
      await loadData();
    } catch (e: any) { setError(e.message); }
  };

  const deleteMedicine = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    try { await api.deleteMedicine(id); await loadData(); } catch (e: any) { setError(e.message); }
  };

  const deleteSupply = async (id: string) => {
    if (!confirm('Delete this supply?')) return;
    try { await api.deleteSupply(id); await loadData(); } catch (e: any) { setError(e.message); }
  };

  const handleMovement = async (data: any) => {
    try {
      // Validate quantity
      if (!data.quantity || data.quantity < 1) {
        toast.error('Please enter a valid quantity (minimum 1)');
        return;
      }
      // For OUT movements, ensure we don't exceed stock
      if (data.transaction_type === 'OUT' && showMoveModal) {
        if (data.quantity > showMoveModal.item.quantity) {
          toast.error(`Cannot dispatch ${data.quantity} — only ${showMoveModal.item.quantity} ${showMoveModal.item.unit} in stock`);
          return;
        }
      }
      if (!data.reference_person?.trim()) {
        toast.error('Please enter the name of the person receiving/requesting this item');
        return;
      }
      if (!data.reason?.trim()) {
        toast.error('Please enter a reason for this movement');
        return;
      }
      await api.inventoryMovement(data);
      toast.success(`Stock movement recorded — ${data.quantity} ${showMoveModal?.item?.unit || 'units'} ${data.transaction_type === 'IN' ? 'added' : 'dispatched'}`);
      setShowMoveModal(null);
      await loadData();
    } catch (e: any) { setError(e.message); }
  };

  const openLogbook = async (item: any, itemType: string) => {
    try {
      const res = await api.getInventoryTransactions({ item_id: item.id, limit: 200 });
      setShowLogbook({ item, txs: res.transactions || [] });
    } catch (e: any) { setError(e.message); }
  };

  // Derived stats
  const now = new Date();
  const in90 = new Date(now.getTime() + 90 * 24 * 3600 * 1000);
  const expired = medicines.filter(m => m.expiry_date && new Date(m.expiry_date) < now).length;
  const expiringSoon = medicines.filter(m => m.expiry_date && new Date(m.expiry_date) >= now && new Date(m.expiry_date) <= in90).length;
  const outOfStockMeds = medicines.filter(m => m.quantity === 0).length;
  const lowStockMeds = medicines.filter(m => m.quantity > 0 && m.quantity <= m.reorder_level).length;
  const lowStockSups = supplies.filter(s => s.quantity > 0 && s.quantity <= s.reorder_level).length;
  const totalMedValue = medicines.reduce((s, m) => s + (m.quantity || 0) * (parseFloat(m.unit_cost) || 0), 0);
  const totalSupValue = supplies.reduce((s, m) => s + (m.quantity || 0) * (parseFloat(m.unit_cost) || 0), 0);

  const medByCat = MEDICINE_CATEGORIES.map(c => ({ name: c, value: medicines.filter(m => m.category === c).reduce((s, m) => s + m.quantity, 0) })).filter(c => c.value > 0);
  const supByCat = SUPPLY_CATEGORIES.map(c => ({ name: c, qty: supplies.filter(s => s.category === c).length })).filter(c => c.qty > 0);

  const filteredMeds = medicines.filter(m => {
    const q = search.toLowerCase();
    const matchQ = !q || m.name?.toLowerCase().includes(q) || m.barcode?.includes(q) || m.generic_name?.toLowerCase().includes(q);
    const matchCat = catFilter === 'All' || m.category === catFilter;
    const matchPurpose = purposeFilter === 'All' || m.purpose === purposeFilter;
    return matchQ && matchCat && matchPurpose;
  });
  const filteredSups = supplies.filter(s => {
    const q = search.toLowerCase();
    const matchQ = !q || s.name?.toLowerCase().includes(q) || s.barcode?.includes(q);
    const matchCat = catFilter === 'All' || s.category === catFilter;
    const matchPurpose = purposeFilter === 'All' || s.purpose === purposeFilter;
    return matchQ && matchCat && matchPurpose;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <FlaskConical className="w-7 h-7 text-[#2B5EA6]" /> Inventory Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">Calaca CVO · Medicines, Vitamins & Supplies · Digital Logbook</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 shadow-sm">
            <Barcode className="w-4 h-4 text-gray-400" />
            <input ref={barcodeRef} value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleBarcodeSearch()}
              placeholder="Scan barcode..." className="text-sm py-2 outline-none w-36" />
            <button onClick={handleBarcodeSearch} className="text-xs text-[#2B5EA6] font-semibold hover:underline">Find</button>
          </div>
          <button onClick={loadData} className="p-2 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          {canEdit && tab === 'medicines' && (
            <button onClick={() => { setEditItem(null); setShowMedModal(true); }}
              className="flex items-center gap-2 bg-[#2B5EA6] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#2B5EA6]/90 shadow">
              <Plus className="w-4 h-4" /> Add Medicine
            </button>
          )}
          {canEdit && tab === 'supplies' && (
            <button onClick={() => { setEditItem(null); setShowSupModal(true); }}
              className="flex items-center gap-2 bg-[#60A85C] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#60A85C]/90 shadow">
              <Plus className="w-4 h-4" /> Add Supply
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between text-red-700">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Alerts */}
      {(expiringSoon > 0 || expired > 0 || outOfStockMeds > 0) && (
        <div className="flex flex-col gap-2">
          {expired > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 text-red-700">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-semibold">{expired} item(s) have expired — remove or replace immediately.</span>
            </div>
          )}
          {expiringSoon > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 text-amber-700">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-semibold">{expiringSoon} item(s) expiring within 90 days.</span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {([
            { id: 'overview', label: 'Overview', icon: BarChart2 },
            { id: 'medicines', label: `Medicines & Vitamins (${medicines.length})`, icon: FlaskConical },
            { id: 'supplies', label: `Supplies (${supplies.length})`, icon: Package },
            { id: 'logbook', label: 'Digital Logbook', icon: BookOpen },
          ] as any[]).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setTab(id); setSearch(''); setCatFilter('All'); setPurposeFilter('All'); }}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold whitespace-nowrap transition-all ${tab === id ? 'text-[#2B5EA6] border-b-2 border-[#2B5EA6] bg-blue-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Medicine Items', value: medicines.length, icon: FlaskConical, color: '#2B5EA6', sub: `₱${totalMedValue.toLocaleString('en-PH', { maximumFractionDigits: 0 })} total value` },
                { label: 'Supply Items', value: supplies.length, icon: Package, color: '#60A85C', sub: `₱${totalSupValue.toLocaleString('en-PH', { maximumFractionDigits: 0 })} total value` },
                { label: 'Low / Out of Stock', value: lowStockMeds + outOfStockMeds + lowStockSups, icon: AlertTriangle, color: '#f59e0b', sub: `${outOfStockMeds} out of stock` },
                { label: 'Expiring / Expired', value: expiringSoon + expired, icon: Calendar, color: '#ef4444', sub: `${expired} already expired` },
              ].map(({ label, value, icon: Icon, color, sub }) => (
                <div key={label} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-1">{sub}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FlaskConical className="w-4 h-4 text-[#2B5EA6]" /> Medicines by Category</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={medByCat}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Total Qty" fill="#2B5EA6" radius={[4, 4, 0, 0]}>
                      {medByCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Package className="w-4 h-4 text-[#60A85C]" /> Supplies by Category</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={supByCat} dataKey="qty" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {supByCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* MEDICINES TABLE */}
        {tab === 'medicines' && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, barcode..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2B5EA6]/30 outline-none" />
              </div>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                <option value="All">All Categories</option>
                {MEDICINE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={purposeFilter} onChange={e => setPurposeFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                <option value="All">All Purposes</option>
                <option value="program">Program</option>
                <option value="office">Office/Operating</option>
              </select>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Purpose</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Unit Price</th>
                    <th className="px-4 py-3 text-right">Total Value</th>
                    <th className="px-4 py-3 text-left">Expiry</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={9} className="text-center py-8 text-gray-400">Loading...</td></tr>
                  ) : filteredMeds.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-8 text-gray-400">No medicines found.</td></tr>
                  ) : filteredMeds.map(m => (
                    <tr key={m.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{m.name}</p>
                        {m.generic_name && <p className="text-xs text-gray-400">{m.generic_name}</p>}
                        {m.barcode && <p className="text-xs text-gray-300 flex items-center gap-1"><Barcode className="w-3 h-3" />{m.barcode}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{m.category}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${m.purpose === 'program' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          {m.purpose === 'program' ? '📋 Program' : '🏢 Office'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{m.quantity} <span className="text-xs text-gray-400">{m.unit}</span></td>
                      <td className="px-4 py-3 text-right text-gray-600">₱{Number(m.unit_cost || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">₱{((m.quantity || 0) * (parseFloat(m.unit_cost) || 0)).toLocaleString('en-PH', { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-3"><ExpiryBadge date={m.expiry_date} /></td>
                      <td className="px-4 py-3"><StatusBadge qty={m.quantity} reorder={m.reorder_level} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openLogbook(m, 'medicine')} className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-500" title="View Logbook"><BookOpen className="w-4 h-4" /></button>
                          {canEdit && (
                            <>
                              <button onClick={() => setShowMoveModal({ item: m, type: 'medicine' })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500" title="Record Movement"><Activity className="w-4 h-4" /></button>
                              <button onClick={() => { setEditItem(m); setShowMedModal(true); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => deleteMedicine(m.id)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUPPLIES TABLE */}
        {tab === 'supplies' && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search supplies..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#60A85C]/30 outline-none" />
              </div>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                <option value="All">All Categories</option>
                {SUPPLY_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={purposeFilter} onChange={e => setPurposeFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                <option value="All">All Purposes</option>
                <option value="program">Program</option>
                <option value="office">Office/Operating</option>
              </select>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Supply</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Purpose</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Unit Price</th>
                    <th className="px-4 py-3 text-right">Total Value</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={8} className="text-center py-8 text-gray-400">Loading...</td></tr>
                  ) : filteredSups.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-8 text-gray-400">No supplies found.</td></tr>
                  ) : filteredSups.map(s => (
                    <tr key={s.id} className="hover:bg-green-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{s.name}</p>
                        {s.supplier && <p className="text-xs text-gray-400">{s.supplier}</p>}
                        {s.barcode && <p className="text-xs text-gray-300 flex items-center gap-1"><Barcode className="w-3 h-3" />{s.barcode}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{s.category}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.purpose === 'program' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          {s.purpose === 'program' ? '📋 Program' : '🏢 Office'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{s.quantity} <span className="text-xs text-gray-400">{s.unit}</span></td>
                      <td className="px-4 py-3 text-right text-gray-600">₱{Number(s.unit_cost || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">₱{((s.quantity || 0) * (parseFloat(s.unit_cost) || 0)).toLocaleString('en-PH', { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-3"><StatusBadge qty={s.quantity} reorder={s.reorder_level} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openLogbook(s, 'supply')} className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-500" title="View Logbook"><BookOpen className="w-4 h-4" /></button>
                          {canEdit && (
                            <>
                              <button onClick={() => setShowMoveModal({ item: s, type: 'supply' })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500" title="Record Movement"><Activity className="w-4 h-4" /></button>
                              <button onClick={() => { setEditItem(s); setShowSupModal(true); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => deleteSupply(s.id)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DIGITAL LOGBOOK */}
        {tab === 'logbook' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800 flex items-center gap-2"><BookOpen className="w-5 h-5 text-[#2B5EA6]" /> Digital Logbook</h3>
                <p className="text-xs text-gray-500 mt-1">All inventory movements — IN, OUT, and adjustments. Shows who handled each transaction.</p>
              </div>
              <button onClick={loadData} className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {transactions.length === 0 ? (
                <p className="text-center text-gray-400 py-12">No transaction records yet.</p>
              ) : transactions.map(tx => {
                const isIn = tx.transaction_type === 'IN';
                const isOut = tx.transaction_type === 'OUT';
                const sourceColors: any = { purchase: 'bg-green-50 border-green-100', outbreak: 'bg-red-50 border-red-100', vaccination: 'bg-purple-50 border-purple-100', manual: 'bg-gray-50 border-gray-100' };
                const bg = sourceColors[tx.source_type] || 'bg-gray-50 border-gray-100';
                return (
                  <div key={tx.id} className={`rounded-xl p-4 border flex items-start gap-4 ${bg}`}>
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${isIn ? 'bg-green-100' : isOut ? 'bg-red-100' : 'bg-gray-100'}`}>
                      {isIn ? <LogIn className="w-5 h-5 text-green-600" /> : isOut ? <LogOut className="w-5 h-5 text-red-600" /> : <Activity className="w-5 h-5 text-gray-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{tx.item_name || tx.item_id}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isIn ? 'bg-green-100 text-green-700' : isOut ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                          {isIn ? '▲' : isOut ? '▼' : '⟳'} {tx.transaction_type} · {tx.quantity} {tx.unit || 'units'}
                        </span>
                        {tx.source_type && tx.source_type !== 'manual' && (
                          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full capitalize">{tx.source_type}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{tx.reason || '—'}</p>
                      <div className="flex gap-4 mt-1.5 flex-wrap text-xs text-gray-500">
                        {tx.reference_person && (
                          <span>👤 {isIn ? 'Received by' : 'Used by'}: <strong className="text-gray-700">{tx.reference_person}</strong></span>
                        )}
                        <span>🖊 Recorded by: {tx.performed_by}</span>
                        {tx.previous_qty != null && <span>📦 Stock: {tx.previous_qty} → {tx.new_qty}</span>}
                        {tx.total_cost > 0 && <span>💰 ₱{Number(tx.total_cost).toLocaleString()}</span>}
                      </div>
                      {tx.notes && <p className="text-xs text-gray-400 mt-1 italic">{tx.notes}</p>}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{new Date(tx.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showMedModal && <MedicineModal item={editItem} programs={programs} onClose={() => { setShowMedModal(false); setEditItem(null); }} onSave={saveMedicine} />}
      {showSupModal && <SupplyModal item={editItem} programs={programs} onClose={() => { setShowSupModal(false); setEditItem(null); }} onSave={saveSupply} />}
      {showMoveModal && <MovementModal item={showMoveModal.item} itemType={showMoveModal.type} onClose={() => setShowMoveModal(null)} onSave={handleMovement} />}
      {showLogbook && <LogbookModal transactions={showLogbook.txs} itemName={showLogbook.item.name} onClose={() => setShowLogbook(null)} />}
    </div>
  );
}

export default InventoryPage;
