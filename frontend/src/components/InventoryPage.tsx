import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
  FlaskConical, Package, Plus, Search, Edit2, Trash2, AlertTriangle,
  CheckCircle, BarChart2, RefreshCw, X, Barcode, Calendar, Building2,
  ChevronDown, TrendingDown, ShieldAlert, BookOpen, LogIn, LogOut,
  DollarSign, Activity, Filter, Truck, ClipboardList, Users,
  ShoppingCart, ArrowRight, CheckSquare, FileText, LayoutGrid,
  Briefcase, ChevronRight, Hash, Layers, SendHorizonal, MapPin,
  Syringe, Stethoscope, PawPrint,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { api } from '../lib/api';
import type { UserRole } from '../App';
import { fetchCalacaBarangays, CALACA_BARANGAYS_FALLBACK } from '../utils/barangays';

interface Props { userRole: UserRole; currentUser?: { id?: string; username?: string; name?: string; role?: UserRole; barangay?: string; } }

const COLORS = ['#2B5EA6','#60A85C','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#14b8a6'];
const MEDICINE_CATEGORIES = ['Vaccine','Antibiotic','Antiparasitic','Vitamin','Analgesic','Antifungal','Other'];
const SUPPLY_CATEGORIES = ['Medical Supplies','PPE','Diagnostic','Cold Chain','Wound Care','Disinfectant','Other'];
const OFFICE_CATEGORIES = ['Paper & Stationery','Printer Supplies','Cleaning','Equipment','Storage','Computer Accessories','Other'];
const SUPPLIER_CATEGORIES = ['Medicine Supplier','Medical Supplies','Office Supplies','Equipment','General','Other'];

// ── Shared Badges ────────────────────────────────────────────────────────────
function StatusBadge({ qty, reorder }: { qty: number; reorder: number }) {
  if (qty === 0) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">Out of Stock</span>;
  if (qty <= reorder) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Low Stock</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">In Stock</span>;
}
function ExpiryBadge({ date }: { date?: string }) {
  if (!date) return null;
  const d = new Date(date), now = new Date();
  const days = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  if (days < 0) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">Expired</span>;
  if (days <= 90) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">Exp. {days}d</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600">{d.toLocaleDateString('en-PH',{month:'short',year:'numeric'})}</span>;
}

// ── Medicine Modal ───────────────────────────────────────────────────────────
function MedicineModal({ item, programs, suppliers, onClose, onSave }: {
  item?: any; programs: any[]; suppliers: any[]; onClose: () => void; onSave: (d: any) => void;
}) {
  const [form, setForm] = useState(item ? {
    name:item.name, genericName:item.generic_name||'', category:item.category,
    type:item.type||'', lotNumber:item.lot_number||'', expiryDate:item.expiry_date?.split('T')[0]||'',
    manufactureDate:item.manufacture_date?.split('T')[0]||'', manufacturer:item.manufacturer||'',
    quantity:item.quantity, unit:item.unit||'vials', reorderLevel:item.reorder_level,
    unitCost:item.unit_cost, storageCondition:item.storage_condition||'', description:item.description||'',
    barcode:item.barcode||'', status:item.status||'Active', supplierId:item.supplier_id||'',
    purpose:item.purpose||'program', programId:item.program_id||'', lineItemId:item.line_item_id||'',
    fiscalYear:item.fiscal_year||new Date().getFullYear(), receivedBy:item.received_by||'',
  } : {
    name:'', genericName:'', category:'Vaccine', type:'', lotNumber:'', expiryDate:'',
    manufactureDate:'', manufacturer:'', quantity:0, unit:'vials', reorderLevel:10,
    unitCost:0, storageCondition:'', description:'', barcode:'', status:'Active', supplierId:'',
    purpose:'program', programId:'', lineItemId:'', fiscalYear:new Date().getFullYear(), receivedBy:'',
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const totalCost = (form.quantity||0) * (form.unitCost||0);
  const lineItems = programs.find(p => p.id === form.programId)?.line_items || [];
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-[#2B5EA6]" />{item ? 'Edit Medicine' : 'Add Medicine / Vitamin'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <label className="block text-xs font-semibold text-blue-700 mb-2">Purpose *</label>
            <div className="flex gap-3">
              {[{value:'program',label:'Program'},{value:'office',label:'Office / Operating'}].map(p => (
                <button key={p.value} onClick={() => set('purpose', p.value)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${form.purpose===p.value?'bg-[#2B5EA6] text-white border-[#2B5EA6]':'bg-white text-gray-600 border-gray-200 hover:border-[#2B5EA6]'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {form.purpose === 'program' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Budget Program</label>
                <select value={form.programId} onChange={e => { set('programId',e.target.value); set('lineItemId',''); }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="">— Select Program —</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name} (FY{p.fiscal_year})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Line Item (charge to)</label>
                <select value={form.lineItemId} onChange={e => set('lineItemId',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" disabled={!lineItems.length}>
                  <option value="">— Select Line Item —</option>
                  {lineItems.map((li: any) => <option key={li.id} value={li.id}>{li.name} (₱{Number(li.allotment||0).toLocaleString()})</option>)}
                </select>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Supplier</label>
            <select value={form.supplierId} onChange={e => set('supplierId',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
              <option value="">— Select Supplier (optional) —</option>
              {suppliers.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Received By *</label>
            <input value={form.receivedBy} onChange={e => set('receivedBy',e.target.value)} placeholder="Full name of recipient" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2B5EA6]/30 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              {label:'Product Name *',key:'name',col:2},{label:'Generic Name',key:'genericName',col:1},
              {label:'Manufacturer',key:'manufacturer',col:1},{label:'Lot / Batch Number',key:'lotNumber',col:1},
              {label:'Barcode',key:'barcode',col:1},{label:'Manufacture Date',key:'manufactureDate',type:'date',col:1},
              {label:'Expiry Date',key:'expiryDate',type:'date',col:1},{label:'Quantity',key:'quantity',type:'number',col:1},
              {label:'Unit',key:'unit',col:1},{label:'Reorder Level',key:'reorderLevel',type:'number',col:1},
              {label:'Unit Price (₱)',key:'unitCost',type:'number',step:'0.01',col:1},
              {label:'Storage Condition',key:'storageCondition',col:2},{label:'Description',key:'description',col:2},
            ].map(({ label, key, col, type, step }: any) => (
              <div key={key} className={col===2?'col-span-2':''}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                <input type={type||'text'} step={step} value={(form as any)[key]}
                  onChange={e => set(key, type==='number'?parseFloat(e.target.value)||0:e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2B5EA6]/30 outline-none" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
              <select value={form.category} onChange={e => set('category',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                {MEDICINE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Type / Subtype</label>
              <input value={form.type} onChange={e => set('type',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
          </div>
          {totalCost > 0 && (
            <div className="bg-green-50 rounded-xl px-4 py-3 flex items-center justify-between border border-green-100">
              <span className="text-sm text-green-700 font-semibold">Total Cost (Qty × Unit Price)</span>
              <span className="text-lg font-black text-green-800">₱{totalCost.toLocaleString('en-PH',{maximumFractionDigits:2})}</span>
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
function SupplyModal({ item, programs, suppliers, onClose, onSave }: {
  item?: any; programs: any[]; suppliers: any[]; onClose: () => void; onSave: (d: any) => void;
}) {
  const [form, setForm] = useState(item ? {
    name:item.name, category:item.category, type:item.type||'',
    quantity:item.quantity, unit:item.unit||'pieces', reorderLevel:item.reorder_level,
    unitCost:item.unit_cost, supplierId:item.supplier_id||'',
    lastRestocked:item.last_restocked?.split('T')[0]||'',
    description:item.description||'', barcode:item.barcode||'', status:item.status||'Active',
    purpose:item.purpose||'office', programId:item.program_id||'', lineItemId:item.line_item_id||'',
    fiscalYear:item.fiscal_year||new Date().getFullYear(), receivedBy:item.received_by||'',
  } : {
    name:'', category:'Medical Supplies', type:'', quantity:0, unit:'pieces',
    reorderLevel:5, unitCost:0, supplierId:'', lastRestocked:'', description:'', barcode:'', status:'Active',
    purpose:'office', programId:'', lineItemId:'', fiscalYear:new Date().getFullYear(), receivedBy:'',
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const totalCost = (form.quantity||0) * (form.unitCost||0);
  const lineItems = programs.find(p => p.id === form.programId)?.line_items || [];
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-[#60A85C]" />{item ? 'Edit Supply' : 'Add Supply'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <label className="block text-xs font-semibold text-green-700 mb-2">Purpose *</label>
            <div className="flex gap-3">
              {[{value:'office',label:'Office / Operating'},{value:'program',label:'Program'}].map(p => (
                <button key={p.value} onClick={() => set('purpose',p.value)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${form.purpose===p.value?'bg-[#60A85C] text-white border-[#60A85C]':'bg-white text-gray-600 border-gray-200 hover:border-[#60A85C]'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {form.purpose === 'program' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Budget Program</label>
                <select value={form.programId} onChange={e => { set('programId',e.target.value); set('lineItemId',''); }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="">— Select Program —</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name} (FY{p.fiscal_year})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Line Item</label>
                <select value={form.lineItemId} onChange={e => set('lineItemId',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" disabled={!lineItems.length}>
                  <option value="">— Select Line Item —</option>
                  {lineItems.map((li: any) => <option key={li.id} value={li.id}>{li.name}</option>)}
                </select>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Supplier</label>
            <select value={form.supplierId} onChange={e => set('supplierId',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
              <option value="">— Select Supplier —</option>
              {suppliers.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Received By</label>
            <input value={form.receivedBy} onChange={e => set('receivedBy',e.target.value)} placeholder="Full name of recipient" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#60A85C]/30 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              {label:'Supply Name *',key:'name',col:2},{label:'Quantity',key:'quantity',type:'number',col:1},
              {label:'Unit',key:'unit',col:1},{label:'Reorder Level',key:'reorderLevel',type:'number',col:1},
              {label:'Unit Price (₱)',key:'unitCost',type:'number',step:'0.01',col:1},
              {label:'Barcode',key:'barcode',col:1},{label:'Last Restocked',key:'lastRestocked',type:'date',col:1},
              {label:'Description',key:'description',col:2},
            ].map(({ label, key, col, type, step }: any) => (
              <div key={key} className={col===2?'col-span-2':''}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                <input type={type||'text'} step={step} value={(form as any)[key]}
                  onChange={e => set(key, type==='number'?parseFloat(e.target.value)||0:e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#60A85C]/30 outline-none" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
              <select value={form.category} onChange={e => set('category',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                {SUPPLY_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {totalCost > 0 && (
            <div className="bg-green-50 rounded-xl px-4 py-3 flex items-center justify-between border border-green-100">
              <span className="text-sm text-green-700 font-semibold">Total Cost</span>
              <span className="text-lg font-black text-green-800">₱{totalCost.toLocaleString('en-PH',{maximumFractionDigits:2})}</span>
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

// ── Office Supply Modal ───────────────────────────────────────────────────────
function OfficeSupplyModal({ item, suppliers, onClose, onSave }: {
  item?: any; suppliers: any[]; onClose: () => void; onSave: (d: any) => void;
}) {
  const [form, setForm] = useState(item ? {
    name:item.name, category:item.category||'General', quantity:item.quantity, unit:item.unit||'pieces',
    reorderLevel:item.reorder_level||5, unitCost:item.unit_cost||0, supplierId:item.supplier_id||'',
    description:item.description||'', barcode:item.barcode||'', status:item.status||'Active',
  } : {
    name:'', category:'Paper & Stationery', quantity:0, unit:'pieces', reorderLevel:5,
    unitCost:0, supplierId:'', description:'', barcode:'', status:'Active',
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-amber-500" />{item ? 'Edit Office Supply' : 'Add Office Supply'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-700 font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Office supplies — no expiry date required
          </div>
          {[
            {label:'Item Name *',key:'name'},{label:'Barcode',key:'barcode'},
            {label:'Quantity',key:'quantity',type:'number'},{label:'Unit (pieces, reams, boxes...)',key:'unit'},
            {label:'Reorder Level',key:'reorderLevel',type:'number'},{label:'Unit Cost (₱)',key:'unitCost',type:'number',step:'0.01'},
            {label:'Description',key:'description'},
          ].map(({ label, key, type, step }: any) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
              <input type={type||'text'} step={step} value={(form as any)[key]}
                onChange={e => set(key, type==='number'?parseFloat(e.target.value)||0:e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400/30 outline-none" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
            <select value={form.category} onChange={e => set('category',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
              {OFFICE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Supplier</label>
            <select value={form.supplierId} onChange={e => set('supplierId',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
              <option value="">— Select Supplier —</option>
              {suppliers.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 justify-end rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={() => onSave(form)} className="px-6 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600">
            {item ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Supplier Modal ────────────────────────────────────────────────────────────
function SupplierModal({ item, onClose, onSave }: { item?: any; onClose: () => void; onSave: (d: any) => void; }) {
  const [form, setForm] = useState(item ? {
    name:item.name, contactPerson:item.contact_person||'', phone:item.phone||'',
    email:item.email||'', address:item.address||'', category:item.category||'General',
    notes:item.notes||'', isActive:item.is_active!==false,
  } : { name:'', contactPerson:'', phone:'', email:'', address:'', category:'General', notes:'', isActive:true });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-500" />{item ? 'Edit Supplier' : 'Add Supplier'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {[
            {label:'Supplier / Company Name *',key:'name'},{label:'Contact Person',key:'contactPerson'},
            {label:'Phone',key:'phone'},{label:'Email',key:'email'},{label:'Address',key:'address'},
            {label:'Notes',key:'notes'},
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
              <input value={(form as any)[key]} onChange={e => set(key,e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
            <select value={form.category} onChange={e => set('category',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
              {SUPPLIER_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={e => set('isActive',e.target.checked)} className="w-4 h-4 accent-indigo-500" />
            <span className="text-sm text-gray-700 font-semibold">Active supplier</span>
          </label>
        </div>
        <div className="border-t border-gray-100 px-6 py-4 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={() => onSave(form)} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">
            {item ? 'Save Changes' : 'Add Supplier'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Order Modal ───────────────────────────────────────────────────────────
function AddOrderModal({
  prefill, medicines, officeSupplies, supplies, suppliers, programs, onClose, onSave
}: {
  prefill?: any; medicines: any[]; officeSupplies: any[]; supplies: any[];
  suppliers: any[]; programs: any[]; onClose: () => void; onSave: (d: any) => void;
}) {
  const [form, setForm] = useState({
    itemName: prefill?.itemName || prefill?.name || '',
    itemType: prefill?.itemType || 'medicine',
    category: prefill?.category || '',
    quantity: prefill?.quantity || 1,
    unit: prefill?.unit || 'vials',
    unitCost: prefill?.unit_cost || prefill?.unitCost || 0,
    supplierId: prefill?.supplierId || '',
    programId: prefill?.programId || '',
    lineItemId: prefill?.lineItemId || '',
    fiscalYear: new Date().getFullYear(),
    notes: prefill?.notes || '',
  });
  const [nameQuery, setNameQuery] = useState(form.itemName);
  const [showDropdown, setShowDropdown] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const allItems = [
    ...medicines.map(m => ({ ...m, _type: 'medicine' })),
    ...supplies.map(s => ({ ...s, _type: 'supply' })),
    ...officeSupplies.map(o => ({ ...o, _type: 'office' })),
  ];

  const suggestions = nameQuery.length > 1
    ? allItems.filter(i => i.name.toLowerCase().includes(nameQuery.toLowerCase())).slice(0, 8)
    : [];

  const lineItems = programs.find(p => p.id === form.programId)?.line_items || [];

  const typeUnits: Record<string, string> = { medicine: 'vials', supply: 'pieces', office: 'pieces' };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#2B5EA6]" /> Add Pending Order
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Item type */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Item Type</label>
            <div className="flex gap-2">
              {[{v:'medicine',l:'Medicine',c:'bg-[#2B5EA6]'},{v:'supply',l:'Supply',c:'bg-[#60A85C]'},{v:'office',l:'Office Supply',c:'bg-amber-500'}].map(t => (
                <button key={t.v} onClick={() => { set('itemType',t.v); set('unit',typeUnits[t.v]); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${form.itemType===t.v?`${t.c} text-white border-transparent`:'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                  {t.l}
                </button>
              ))}
            </div>
          </div>

          {/* Item name with suggestion dropdown */}
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Item Name *</label>
            <input value={nameQuery} onFocus={() => setShowDropdown(true)}
              onChange={e => { setNameQuery(e.target.value); set('itemName',e.target.value); setShowDropdown(true); }}
              placeholder="Type to search or enter new item..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2B5EA6]/30 outline-none" />
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl mt-1 overflow-hidden">
                {suggestions.map(item => (
                  <button key={item.id} onClick={() => {
                    setNameQuery(item.name); set('itemName',item.name);
                    set('category',item.category||''); set('unit',item.unit||'pieces');
                    set('unitCost',item.unit_cost||0); set('itemType',item._type);
                    setShowDropdown(false);
                  }} className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center gap-3 border-b border-gray-50 last:border-b-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${item._type==='medicine'?'bg-blue-100 text-blue-700':item._type==='supply'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>{item._type}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                      {item.category && <p className="text-xs text-gray-400">{item.category}</p>}
                    </div>
                    <span className="ml-auto text-xs text-gray-400">{item.quantity} {item.unit} in stock</span>
                  </button>
                ))}
              </div>
            )}
            {showDropdown && suggestions.length === 0 && nameQuery.length > 1 && (
              <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl mt-1 p-3">
                <p className="text-xs text-gray-500 text-center">No match — will be added as new item</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
              <input value={form.category} onChange={e => set('category',e.target.value)} placeholder="Category" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Unit</label>
              <input value={form.unit} onChange={e => set('unit',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity *</label>
              <input type="number" value={form.quantity} onChange={e => set('quantity',parseInt(e.target.value)||1)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Estimated Unit Cost (₱)</label>
              <input type="number" step="0.01" value={form.unitCost} onChange={e => set('unitCost',parseFloat(e.target.value)||0)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
          </div>

          {/* Supplier — 1 item, 1 supplier */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Supplier *</label>
            <select value={form.supplierId} onChange={e => set('supplierId',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
              <option value="">— Select Supplier —</option>
              {suppliers.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>{s.name} ({s.category})</option>)}
            </select>
          </div>

          {/* Budget deduction */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-xs font-bold text-blue-700 mb-3">💰 Budget Deduction — where to charge this?</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Budget Program</label>
                <select value={form.programId} onChange={e => { set('programId',e.target.value); set('lineItemId',''); }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white">
                  <option value="">— Not linked —</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name} (FY{p.fiscal_year})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Line Item</label>
                <select value={form.lineItemId} onChange={e => set('lineItemId',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white" disabled={!lineItems.length}>
                  <option value="">— Select —</option>
                  {lineItems.map((li: any) => <option key={li.id} value={li.id}>{li.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
            <input value={form.notes} onChange={e => set('notes',e.target.value)} placeholder="Any notes for this order..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
          </div>

          {form.unitCost > 0 && form.quantity > 0 && (
            <div className="bg-green-50 rounded-xl px-4 py-3 flex items-center justify-between border border-green-100">
              <span className="text-sm text-green-700 font-semibold">Estimated Total</span>
              <span className="text-lg font-black text-green-800">₱{(form.unitCost*form.quantity).toLocaleString('en-PH',{maximumFractionDigits:2})}</span>
            </div>
          )}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 justify-end rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={() => { if (!form.itemName.trim()) { toast.error('Item name required'); return; } onSave({ ...form, source: 'manual' }); }}
            className="px-6 py-2 bg-[#2B5EA6] text-white rounded-xl text-sm font-semibold hover:bg-[#2B5EA6]/90 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" /> Place Order
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Receive Order Modal ───────────────────────────────────────────────────────
function ReceiveOrderModal({ order, medicines, supplies, officeSupplies, onClose, onReceive }: {
  order: any; medicines: any[]; supplies: any[]; officeSupplies: any[];
  onClose: () => void; onReceive: (orderId: string, data: any) => void;
}) {
  const [barcode, setBarcode] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [form, setForm] = useState({
    quantity: order.quantity,
    unitCost: parseFloat(order.unit_cost) || 0,
    lotNumber: '',
    expiryDate: '',
    receivedBy: '',
    barcode: '',
    matchItemId: '',
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const isPerishable = order.item_type === 'medicine';
  const isOffice = order.item_type === 'office';

  const handleBarcodeScan = async () => {
    if (!barcode.trim()) return;
    setScanLoading(true);
    try {
      const res = await api.barcodeInventoryLookup(barcode.trim());
      setScanResult(res);
      set('barcode', barcode.trim());
      if (res.found) {
        set('matchItemId', res.item.id);
        toast.success(`Found: ${res.item.name} — will add to existing stock`);
      } else {
        set('matchItemId', '');
        toast.info('New item — will create entry in inventory');
      }
    } catch { toast.error('Barcode lookup failed'); }
    finally { setScanLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-green-600" /> Receive Order
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Order summary */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="font-bold text-gray-900">{order.item_name}</p>
            <p className="text-sm text-gray-500 mt-1">Ordered: {order.quantity} {order.unit} · {order.supplier_name || 'No supplier'}</p>
          </div>

          {/* Barcode scan */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Scan / Enter Barcode</label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-lg px-3">
                <Barcode className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input value={barcode} onChange={e => setBarcode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleBarcodeScan()}
                  placeholder="Scan barcode or type and press Enter..."
                  className="flex-1 py-2 text-sm outline-none" />
              </div>
              <button onClick={handleBarcodeScan} disabled={scanLoading}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-700 disabled:opacity-50">
                {scanLoading ? '...' : 'Lookup'}
              </button>
            </div>
            {scanResult && (
              <div className={`mt-2 px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${scanResult.found ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                {scanResult.found ? <CheckCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {scanResult.found ? `Match: ${scanResult.item.name} (${scanResult.item.quantity} in stock)` : 'New item — will create new inventory entry'}
              </div>
            )}
          </div>

          {/* Quantity & cost */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Actual Qty Received *</label>
              <input type="number" value={form.quantity} onChange={e => set('quantity',parseInt(e.target.value)||1)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Actual Unit Cost (₱)</label>
              <input type="number" step="0.01" value={form.unitCost} onChange={e => set('unitCost',parseFloat(e.target.value)||0)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
          </div>

          {/* Medicine-only fields */}
          {isPerishable && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Lot Number</label>
                <input value={form.lotNumber} onChange={e => set('lotNumber',e.target.value)}
                  placeholder="Lot / Batch #" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Expiry Date *</label>
                <input type="date" value={form.expiryDate} onChange={e => set('expiryDate',e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
            </div>
          )}
          {isOffice && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-700 font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Office supply — no lot number or expiry required
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Received By *</label>
            <input value={form.receivedBy} onChange={e => set('receivedBy',e.target.value)}
              placeholder="Name of person receiving this order"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
          </div>

          {/* Total & budget impact */}
          {form.unitCost > 0 && (
            <div className="bg-green-50 rounded-xl px-4 py-3 border border-green-100 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700 font-semibold">Total Cost</span>
                <span className="text-lg font-black text-green-800">₱{(form.unitCost*form.quantity).toLocaleString('en-PH',{maximumFractionDigits:2})}</span>
              </div>
              {order.line_item_id && (
                <p className="text-xs text-green-600">Will be deducted from linked budget line item</p>
              )}
            </div>
          )}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 justify-end rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={() => {
            if (!form.receivedBy.trim()) { toast.error('Please enter who received this order'); return; }
            if (isPerishable && !form.expiryDate) { toast.error('Expiry date is required for medicines'); return; }
            onReceive(order.id, form);
          }} className="px-6 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 flex items-center gap-2">
            <CheckSquare className="w-4 h-4" /> Confirm Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Dispatch / Release Medicine Modal ────────────────────────────────────────
function DispatchMedicineModal({
  medicines, currentUser, onClose, onSave
}: {
  medicines: any[];
  currentUser?: { id?: string; username?: string; name?: string; role?: UserRole; barangay?: string; };
  onClose: () => void;
  onSave: (d: any) => void;
}) {
  const isAdmin = ['admin','superadmin'].includes(currentUser?.role || '');
  const userBarangay = currentUser?.barangay || '';

  const [barangays, setBarangays] = useState<string[]>(CALACA_BARANGAYS_FALLBACK);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userPets, setUserPets] = useState<any[]>([]);
  const [userLivestock, setUserLivestock] = useState<any[]>([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
  const [barcodeRaw, setBarcodeRaw] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    itemId: '',
    itemName: '',
    genericName: '',
    lotNumber: '',
    quantity: 1,
    toName: '',
    toUserId: '',
    purpose: '',
    animalId: '',
    animalLabel: '',
    barangay: isAdmin ? '' : userBarangay,
    notes: '',
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  // Load barangays and users on mount
  useEffect(() => {
    fetchCalacaBarangays().then(setBarangays).catch(() => {});
    api.getUsers().then((res: any) => setAllUsers(res.users || [])).catch(() => {});
    barcodeInputRef.current?.focus();
  }, []);

  // When a recipient is selected, load their pets/livestock
  const handleRecipientSelect = async (u: any) => {
    set('toName', u.name || u.username);
    set('toUserId', u.id);
    set('barangay', u.barangay || (isAdmin ? form.barangay : userBarangay));
    set('animalId', '');
    set('animalLabel', '');
    setRecipientSearch(u.name || u.username);
    setShowRecipientDropdown(false);
    // Fetch pets and livestock for this user
    try {
      const [petsRes, lsRes] = await Promise.all([
        api.getPets(u.id).catch(() => ({ pets: [] })),
        api.getLivestock({ ownerId: u.id }).catch(() => ({ livestock: [] })),
      ]);
      setUserPets((petsRes as any).pets || []);
      setUserLivestock((lsRes as any).livestock || []);
    } catch { setUserPets([]); setUserLivestock([]); }
  };

  // Resolve animal options based on recipient's role
  const selectedUser = allUsers.find((u: any) => u.id === form.toUserId);
  const recipientRole: string = selectedUser?.role || '';
  let animalOptions: { id: string; label: string }[] = [];
  if (recipientRole === 'petOwner') {
    animalOptions = userPets.map((p: any) => ({ id: p.id, label: `🐾 ${p.name} (${p.species}${p.breed ? ', '+p.breed : ''})` }));
  } else if (recipientRole === 'livestockManager') {
    animalOptions = userLivestock.map((l: any) => ({ id: l.id, label: `🐄 ${l.tag_id || l.id} — ${l.species || l.type || 'Livestock'} (${l.name || ''})` }));
  } else if (recipientRole === 'both') {
    animalOptions = [
      ...userPets.map((p: any) => ({ id: 'pet-'+p.id, label: `🐾 ${p.name} (${p.species})` })),
      ...userLivestock.map((l: any) => ({ id: 'ls-'+l.id, label: `🐄 ${l.tag_id || l.id} — ${l.species || 'Livestock'}` })),
    ];
  }
  const showAnimalSelect = animalOptions.length > 0 || ['petOwner','livestockManager','both'].includes(recipientRole);
  const purposeNeedsAnimal = ['petOwner','livestockManager','both'].includes(recipientRole) && !isAdmin;

  // Barcode lookup
  const handleBarcodeSearch = () => {
    const code = barcodeRaw.trim();
    if (!code) return;
    const found = medicines.find(m => m.barcode === code || m.lot_number === code || m.name?.toLowerCase() === code.toLowerCase());
    if (found) {
      set('itemId', found.id);
      set('itemName', found.name);
      set('genericName', found.generic_name || '');
      set('lotNumber', found.lot_number || '');
    } else {
      set('itemName', '');
      set('itemId', '');
    }
  };

  // Filtered recipient list
  const filteredUsers = recipientSearch.length >= 1
    ? allUsers.filter((u: any) =>
        (u.name || u.username || '').toLowerCase().includes(recipientSearch.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(recipientSearch.toLowerCase())
      ).slice(0, 8)
    : [];

  const canSubmit = form.itemId && form.toName.trim() && form.purpose.trim() && form.barangay && form.quantity >= 1;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#2B5EA6] to-[#1a3d70] px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <SendHorizonal className="w-5 h-5" /> Dispatch / Release Medicine
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><X className="w-4 h-4 text-white" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* ── Barcode ── */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <label className="block text-xs font-bold text-blue-700 mb-2 flex items-center gap-1.5">
              <Barcode className="w-3.5 h-3.5" /> BARCODE — Scan or Manual Input
            </label>
            <div className="flex gap-2">
              <input
                ref={barcodeInputRef}
                value={barcodeRaw}
                onChange={e => setBarcodeRaw(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleBarcodeSearch()}
                placeholder="Scan barcode or type Lot No / Name..."
                className="flex-1 border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2B5EA6]/30 outline-none bg-white"
              />
              <button onClick={handleBarcodeSearch}
                className="px-3 py-2 bg-[#2B5EA6] text-white text-xs font-bold rounded-lg hover:bg-[#1a3d70] transition-colors">
                Lookup
              </button>
            </div>
            {form.itemId && (
              <div className="mt-2 bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm">
                <p className="font-bold text-gray-900">{form.itemName}</p>
                {form.genericName && <p className="text-xs text-gray-500">{form.genericName}</p>}
                {form.lotNumber && <p className="text-xs text-gray-400 flex items-center gap-1"><Hash className="w-3 h-3" />Lot: {form.lotNumber}</p>}
              </div>
            )}
            {!form.itemId && barcodeRaw && (
              <p className="mt-1.5 text-xs text-red-500">No match found. Select manually below.</p>
            )}
            {/* Manual select fallback */}
            {!form.itemId && (
              <div className="mt-2">
                <label className="block text-xs font-semibold text-blue-700 mb-1">Or select medicine manually</label>
                <select
                  value={form.itemId}
                  onChange={e => {
                    const m = medicines.find(x => x.id === e.target.value);
                    if (m) { set('itemId', m.id); set('itemName', m.name); set('genericName', m.generic_name || ''); set('lotNumber', m.lot_number || ''); }
                    else { set('itemId',''); set('itemName',''); }
                  }}
                  className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm outline-none bg-white"
                >
                  <option value="">— Select Medicine —</option>
                  {medicines.filter(m => m.quantity > 0).map(m => (
                    <option key={m.id} value={m.id}>{m.name}{m.lot_number ? ` [Lot: ${m.lot_number}]` : ''} · {m.quantity} {m.unit}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ── Product Name (auto-detect read-only) ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Product Name <span className="text-gray-400 font-normal">(Auto-detected)</span></label>
            <input
              value={form.itemName}
              readOnly
              placeholder="Auto-filled from barcode scan..."
              className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 cursor-not-allowed outline-none"
            />
          </div>

          {/* ── Lot/Batch No ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Lot / Batch No.</label>
            <input
              value={form.lotNumber}
              onChange={e => set('lotNumber', e.target.value)}
              placeholder="e.g. LOT-2024-001"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2B5EA6]/30 outline-none"
            />
          </div>

          {/* ── Quantity ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity to Dispatch *</label>
            <input
              type="number" min={1}
              value={form.quantity}
              onChange={e => set('quantity', parseInt(e.target.value) || 1)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2B5EA6]/30 outline-none"
            />
          </div>

          {/* ── TO: Recipient ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">TO: Recipient *</label>
            <div className="relative">
              <input
                value={recipientSearch}
                onChange={e => { setRecipientSearch(e.target.value); set('toName', e.target.value); set('toUserId', ''); setShowRecipientDropdown(true); setUserPets([]); setUserLivestock([]); }}
                onFocus={() => setShowRecipientDropdown(true)}
                onBlur={() => setTimeout(() => setShowRecipientDropdown(false), 150)}
                placeholder="Type name or search registered users..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2B5EA6]/30 outline-none"
              />
              {showRecipientDropdown && filteredUsers.length > 0 && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {filteredUsers.map((u: any) => (
                    <button key={u.id} onMouseDown={() => handleRecipientSelect(u)}
                      className="w-full px-3 py-2.5 hover:bg-blue-50 text-left flex items-center gap-2 transition-colors">
                      <div className="w-7 h-7 rounded-full bg-[#2B5EA6]/10 flex items-center justify-center text-xs font-bold text-[#2B5EA6]">
                        {(u.name || u.username || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{u.name || u.username}</p>
                        <p className="text-xs text-gray-400">{u.role}{u.barangay ? ` · ${u.barangay}` : ''}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {form.toUserId && (
              <p className="mt-1 text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Linked to registered user</p>
            )}
          </div>

          {/* ── PURPOSE ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Purpose *</label>
            {(showAnimalSelect) ? (
              <div className="space-y-2">
                <input
                  value={form.purpose}
                  onChange={e => set('purpose', e.target.value)}
                  placeholder="e.g. Rabies vaccination, deworming, treatment..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2B5EA6]/30 outline-none"
                />
                {/* Animal select */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                    <PawPrint className="w-3 h-3" /> For Animal (select from tagged animals)
                  </label>
                  {animalOptions.length > 0 ? (
                    <select
                      value={form.animalId}
                      onChange={e => {
                        const opt = animalOptions.find(a => a.id === e.target.value);
                        set('animalId', e.target.value);
                        set('animalLabel', opt?.label || '');
                      }}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
                    >
                      <option value="">— Select Animal (optional) —</option>
                      {animalOptions.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                  ) : (
                    <p className="text-xs text-gray-400 italic px-1">No tagged animals found for this user — loading...</p>
                  )}
                </div>
              </div>
            ) : (
              <input
                value={form.purpose}
                onChange={e => set('purpose', e.target.value)}
                placeholder={isAdmin || !form.toUserId ? 'Type purpose (e.g. Routine vaccination, outbreak response...)' : 'e.g. Deworming, rabies vaccine...'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2B5EA6]/30 outline-none"
              />
            )}
          </div>

          {/* ── BARANGAY ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#2B5EA6]" /> Barangay * <span className="text-gray-400 font-normal">(for usage tracking)</span>
            </label>
            {isAdmin ? (
              <select
                value={form.barangay}
                onChange={e => set('barangay', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2B5EA6]/30 outline-none"
              >
                <option value="">— Select Barangay —</option>
                {barangays.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            ) : (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <MapPin className="w-4 h-4 text-[#2B5EA6]" />
                <span className="text-sm text-gray-700 font-semibold">{form.barangay || 'Barangay not set on profile'}</span>
                <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Auto-filled</span>
              </div>
            )}
          </div>

          {/* ── Notes ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Additional notes..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2B5EA6]/30 outline-none"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-3 justify-end rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => {
              if (!form.itemId) return;
              onSave({
                item_id: form.itemId,
                item_type: 'medicine',
                transaction_type: 'OUT',
                quantity: form.quantity,
                lot_number: form.lotNumber,
                reference_person: form.toName,
                to_user_id: form.toUserId || undefined,
                reason: form.purpose + (form.animalLabel ? ` [Animal: ${form.animalLabel}]` : ''),
                barangay: form.barangay,
                notes: form.notes,
                dispatch_type: 'dispatch',
              });
            }}
            disabled={!canSubmit}
            className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${canSubmit ? 'bg-[#2B5EA6] text-white hover:bg-[#1a3d70]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            <SendHorizonal className="w-4 h-4" /> Dispatch Medicine
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Movement Modal ────────────────────────────────────────────────────────────
function MovementModal({ item, itemType, onClose, onSave }: { item: any; itemType: string; onClose: () => void; onSave: (d: any) => void; }) {
  const [form, setForm] = useState({ item_id:item.id, item_type:itemType, transaction_type:'OUT', quantity:1, reason:'', reference_person:'', notes:'' });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#2B5EA6]" /> Record Movement
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p className="font-bold text-gray-900">{item.name}</p>
            <p className="text-sm text-gray-500">Current stock: {item.quantity} {item.unit}</p>
          </div>
          <div className="flex gap-3">
            {[{v:'IN',l:'Add Stock (IN)',c:'bg-green-600'},{v:'OUT',l:'Dispatch (OUT)',c:'bg-red-500'},{v:'ADJUST',l:'Adjust',c:'bg-gray-600'}].map(t => (
              <button key={t.v} onClick={() => set('transaction_type',t.v)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${form.transaction_type===t.v?`${t.c} text-white border-transparent`:'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                {t.l}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity *</label>
            <input type="number" value={form.quantity} onChange={e => set('quantity',parseInt(e.target.value)||1)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{form.transaction_type==='IN'?'Received By':'Issued To / Used By'} *</label>
            <input value={form.reference_person} onChange={e => set('reference_person',e.target.value)} placeholder="Full name" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Reason *</label>
            <input value={form.reason} onChange={e => set('reason',e.target.value)} placeholder="Reason for movement..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
            <input value={form.notes} onChange={e => set('notes',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
        </div>
        <div className="border-t border-gray-100 px-6 py-4 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={() => onSave(form)} className="px-6 py-2 bg-[#2B5EA6] text-white rounded-xl text-sm font-semibold hover:bg-[#2B5EA6]/90">Record</button>
        </div>
      </div>
    </div>
  );
}

// ── Logbook Modal ─────────────────────────────────────────────────────────────
function LogbookModal({ transactions, itemName, onClose }: { transactions: any[]; itemName: string; onClose: () => void; }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#2B5EA6]" /> Logbook: {itemName}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-3">
          {transactions.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No transactions recorded.</p>
          ) : transactions.map(tx => {
            const isIn = tx.transaction_type === 'IN';
            return (
              <div key={tx.id} className={`rounded-xl p-4 border flex items-start gap-4 ${isIn?'bg-green-50 border-green-100':'bg-red-50 border-red-100'}`}>
                <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${isIn?'bg-green-100':'bg-red-100'}`}>
                  {isIn?<LogIn className="w-4 h-4 text-green-600"/>:<LogOut className="w-4 h-4 text-red-600"/>}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isIn?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{tx.transaction_type}</span>
                    <span className="text-sm font-bold text-gray-900">{tx.quantity} {tx.unit||'units'}</span>
                    {tx.previous_qty!=null&&<span className="text-xs text-gray-400">{tx.previous_qty} → {tx.new_qty}</span>}
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{tx.reason||'—'}</p>
                  <div className="flex gap-4 mt-1.5 flex-wrap text-xs text-gray-500">
                    {tx.reference_person&&<span>👤 {isIn?'Received by':'Used by'}: <strong>{tx.reference_person}</strong></span>}
                    {tx.barangay&&<span>📍 {tx.barangay}</span>}
                    <span>🖊 {tx.performed_by}</span>
                    {tx.total_cost>0&&<span>💰 ₱{Number(tx.total_cost).toLocaleString()}</span>}
                  </div>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{new Date(tx.created_at).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
export function InventoryPage({ userRole, currentUser }: Props) {
  const canEdit = ['admin','superadmin'].includes(userRole);
  type TabId = 'overview'|'medicines'|'supplies'|'office'|'orders'|'logbook'|'suppliers';
  const [tab, setTab] = useState<TabId>('overview');
  const [medicines, setMedicines] = useState<any[]>([]);
  const [supplies, setSupplies] = useState<any[]>([]);
  const [officeSupplies, setOfficeSupplies] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [orderFilter, setOrderFilter] = useState('pending');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showMedModal, setShowMedModal] = useState(false);
  const [showSupModal, setShowSupModal] = useState(false);
  const [showOfficModal, setShowOfficModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState<any>(null);
  const [showMoveModal, setShowMoveModal] = useState<{ item: any; type: string } | null>(null);
  const [showLogbook, setShowLogbook] = useState<{ item: any; txs: any[] } | null>(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [addOrderPrefill, setAddOrderPrefill] = useState<any>(null);
  const [error, setError] = useState('');
  const barcodeRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [meds, sups, os, supls, orders, txs, bps] = await Promise.all([
        api.getMedicines(),
        api.getSupplies(),
        api.getOfficeSupplies().catch(() => ({ items: [] })),
        api.getSuppliers().catch(() => ({ suppliers: [] })),
        api.getPendingOrders().catch(() => ({ orders: [] })),
        api.getInventoryTransactions({ limit: 500 }),
        api.getBudgetPrograms(new Date().getFullYear()),
      ]);
      setMedicines(meds.medicines || []);
      setSupplies(sups.supplies || []);
      setOfficeSupplies(os.items || []);
      setSuppliers(supls.suppliers || []);
      setPendingOrders(orders.orders || []);
      setTransactions(txs.transactions || []);
      setPrograms(bps.programs || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Check for order prefill from MedicineIntelligence navigation
  useEffect(() => {
    const stored = sessionStorage.getItem('inventory_order_prefill');
    if (stored) {
      try {
        const prefill = JSON.parse(stored);
        sessionStorage.removeItem('inventory_order_prefill');
        setAddOrderPrefill(prefill);
        setShowAddOrderModal(true);
        setTab('orders');
      } catch { /* ignore */ }
    }
  }, []);

  const handleBarcodeSearch = () => {
    if (!barcodeInput.trim()) return;
    const found = medicines.find(m => m.barcode === barcodeInput.trim()) ||
      supplies.find(s => s.barcode === barcodeInput.trim()) ||
      officeSupplies.find(o => o.barcode === barcodeInput.trim());
    if (found) {
      if (found.lot_number !== undefined) setTab('medicines');
      else if (found.unit_cost !== undefined) setTab('supplies');
      else setTab('office');
      setSearch(barcodeInput.trim());
    } else { setError(`No item found with barcode: ${barcodeInput}`); }
    setBarcodeInput('');
  };

  const saveMedicine = async (form: any) => {
    try {
      if (editItem) await api.updateMedicine(editItem.id, form);
      else await api.createMedicine(form);
      setShowMedModal(false); setEditItem(null); await loadData();
      toast.success(editItem ? 'Medicine updated' : 'Medicine added to inventory');
    } catch (e: any) { setError(e.message); }
  };

  const saveSupply = async (form: any) => {
    try {
      if (editItem) await api.updateSupply(editItem.id, form);
      else await api.createSupply(form);
      setShowSupModal(false); setEditItem(null); await loadData();
      toast.success(editItem ? 'Supply updated' : 'Supply added to inventory');
    } catch (e: any) { setError(e.message); }
  };

  const saveOfficeSupply = async (form: any) => {
    try {
      if (editItem) await api.updateOfficeSupply(editItem.id, form);
      else await api.createOfficeSupply(form);
      setShowOfficModal(false); setEditItem(null); await loadData();
      toast.success(editItem ? 'Office supply updated' : 'Office supply added');
    } catch (e: any) { setError(e.message); }
  };

  const saveSupplier = async (form: any) => {
    try {
      if (editItem) await api.updateSupplier(editItem.id, form);
      else await api.createSupplier(form);
      setShowSupplierModal(false); setEditItem(null); await loadData();
      toast.success(editItem ? 'Supplier updated' : 'Supplier added');
    } catch (e: any) { setError(e.message); }
  };

  const saveOrder = async (form: any) => {
    try {
      await api.createPendingOrder(form);
      setShowAddOrderModal(false); setAddOrderPrefill(null);
      await loadData(); setTab('orders');
      toast.success('Order placed — now pending receipt');
    } catch (e: any) { setError(e.message); }
  };

  const receiveOrder = async (orderId: string, data: any) => {
    try {
      await api.receivePendingOrder(orderId, data);
      setShowReceiveModal(null); await loadData();
      toast.success('Order received! Inventory updated and budget deducted.');
    } catch (e: any) { setError(e.message); }
  };

  const handleMovement = async (data: any) => {
    try {
      if (!data.quantity || data.quantity < 1) { toast.error('Enter a valid quantity'); return; }
      if (data.transaction_type === 'OUT' && showMoveModal && data.quantity > showMoveModal.item.quantity) {
        toast.error(`Cannot dispatch ${data.quantity} — only ${showMoveModal.item.quantity} in stock`); return;
      }
      if (!data.reference_person?.trim()) { toast.error('Enter the name of recipient/requestor'); return; }
      if (!data.reason?.trim()) { toast.error('Please enter a reason'); return; }
      await api.inventoryMovement(data);
      toast.success('Movement recorded');
      setShowMoveModal(null); await loadData();
    } catch (e: any) { setError(e.message); }
  };

  const handleDispatch = async (data: any) => {
    try {
      const med = medicines.find(m => m.id === data.item_id);
      if (!med) { toast.error('Medicine not found'); return; }
      if (data.quantity < 1) { toast.error('Enter a valid quantity'); return; }
      if (data.quantity > med.quantity) { toast.error(`Cannot dispatch ${data.quantity} — only ${med.quantity} in stock`); return; }
      if (!data.reference_person?.trim()) { toast.error('Enter recipient name'); return; }
      if (!data.reason?.trim()) { toast.error('Enter a purpose'); return; }
      if (!data.barangay?.trim()) { toast.error('Select a barangay'); return; }
      await api.inventoryMovement({ ...data, source: 'dispatch' });
      toast.success(`Dispatched ${data.quantity} unit(s) of ${med.name} to ${data.reference_person} (${data.barangay})`);
      setShowDispatchModal(false);
      await loadData();
    } catch (e: any) { setError(e.message); }
  };

  const openLogbook = async (item: any, itemType: string) => {
    try {
      const res = await api.getInventoryTransactions({ item_id: item.id, limit: 200 });
      setShowLogbook({ item, txs: res.transactions || [] });
    } catch (e: any) { setError(e.message); }
  };

  // Stats
  const now = new Date(), in90 = new Date(now.getTime() + 90 * 86400000);
  const expired = medicines.filter(m => m.expiry_date && new Date(m.expiry_date) < now).length;
  const expiringSoon = medicines.filter(m => m.expiry_date && new Date(m.expiry_date) >= now && new Date(m.expiry_date) <= in90).length;
  const outOfStockMeds = medicines.filter(m => m.quantity === 0).length;
  const lowStockMeds = medicines.filter(m => m.quantity > 0 && m.quantity <= m.reorder_level).length;
  const lowStockSups = supplies.filter(s => s.quantity > 0 && s.quantity <= s.reorder_level).length;
  const lowStockOffice = officeSupplies.filter(o => o.quantity > 0 && o.quantity <= o.reorder_level).length;
  const totalMedValue = medicines.reduce((s, m) => s + (m.quantity||0) * (parseFloat(m.unit_cost)||0), 0);
  const totalSupValue = supplies.reduce((s, m) => s + (m.quantity||0) * (parseFloat(m.unit_cost)||0), 0);
  const pendingCount = pendingOrders.filter(o => o.status === 'pending').length;

  const medByCat = MEDICINE_CATEGORIES.map(c => ({ name:c, value:medicines.filter(m=>m.category===c).reduce((s,m)=>s+m.quantity,0) })).filter(c=>c.value>0);
  const supByCat = SUPPLY_CATEGORIES.map(c => ({ name:c, qty:supplies.filter(s=>s.category===c).length })).filter(c=>c.qty>0);

  const filteredMeds = medicines.filter(m => {
    const q = search.toLowerCase();
    return (!q || m.name?.toLowerCase().includes(q) || m.barcode?.includes(q) || m.generic_name?.toLowerCase().includes(q))
      && (catFilter === 'All' || m.category === catFilter);
  });
  const filteredSups = supplies.filter(s => {
    const q = search.toLowerCase();
    return (!q || s.name?.toLowerCase().includes(q) || s.barcode?.includes(q))
      && (catFilter === 'All' || s.category === catFilter);
  });
  const filteredOffice = officeSupplies.filter(o => {
    const q = search.toLowerCase();
    return (!q || o.name?.toLowerCase().includes(q) || o.barcode?.includes(q))
      && (catFilter === 'All' || o.category === catFilter);
  });
  const filteredOrders = pendingOrders.filter(o =>
    (orderFilter === 'all' || o.status === orderFilter) &&
    (!search || o.item_name?.toLowerCase().includes(search.toLowerCase()) || o.supplier_name?.toLowerCase().includes(search.toLowerCase()))
  );
  const filteredSuppliers = suppliers.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.category?.toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { id:'overview', label:'Overview', icon:BarChart2 },
    { id:'medicines', label:`Medicines (${medicines.length})`, icon:FlaskConical },
    { id:'supplies', label:`Supplies (${supplies.length})`, icon:Package },
    { id:'office', label:`Office (${officeSupplies.length})`, icon:Briefcase },
    { id:'orders', label:`Orders${pendingCount>0?` (${pendingCount} pending)`:''}`, icon:ShoppingCart },
    { id:'logbook', label:'Logbook', icon:BookOpen },
    { id:'suppliers', label:`Suppliers (${suppliers.length})`, icon:Building2 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <FlaskConical className="w-7 h-7 text-[#2B5EA6]" /> Inventory Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">Calaca CVO · Medicines, Supplies, Office & Orders</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
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
          {canEdit && (
            <button onClick={() => { setAddOrderPrefill(null); setShowAddOrderModal(true); }}
              className="flex items-center gap-2 bg-[#2B5EA6] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#2B5EA6]/90 shadow">
              <ShoppingCart className="w-4 h-4" /> New Order
            </button>
          )}
          {canEdit && tab === 'medicines' && (
            <>
              <button onClick={() => setShowDispatchModal(true)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow">
                <SendHorizonal className="w-4 h-4" /> Dispatch
              </button>
              <button onClick={() => { setEditItem(null); setShowMedModal(true); }}
                className="flex items-center gap-2 bg-[#2B5EA6]/10 text-[#2B5EA6] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#2B5EA6]/20">
                <Plus className="w-4 h-4" /> Add Medicine
              </button>
            </>
          )}
          {canEdit && tab === 'supplies' && (
            <button onClick={() => { setEditItem(null); setShowSupModal(true); }}
              className="flex items-center gap-2 bg-[#60A85C]/10 text-[#60A85C] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#60A85C]/20">
              <Plus className="w-4 h-4" /> Add Supply
            </button>
          )}
          {canEdit && tab === 'office' && (
            <button onClick={() => { setEditItem(null); setShowOfficModal(true); }}
              className="flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-amber-200">
              <Plus className="w-4 h-4" /> Add Office Item
            </button>
          )}
          {canEdit && tab === 'suppliers' && (
            <button onClick={() => { setEditItem(null); setShowSupplierModal(true); }}
              className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-200">
              <Plus className="w-4 h-4" /> Add Supplier
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
      {(expiringSoon > 0 || expired > 0 || pendingCount > 0) && (
        <div className="flex flex-col gap-2">
          {expired > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 text-red-700">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-semibold">{expired} medicine(s) expired — remove or replace immediately.</span>
            </div>
          )}
          {expiringSoon > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 text-amber-700">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-semibold">{expiringSoon} item(s) expiring within 90 days.</span>
            </div>
          )}
          {pendingCount > 0 && (
            <button onClick={() => setTab('orders')} className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3 text-blue-700 hover:bg-blue-100 text-left">
              <Truck className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-semibold">{pendingCount} pending order(s) awaiting receipt. <span className="underline">Click to view →</span></span>
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setTab(id as TabId); setSearch(''); setCatFilter('All'); }}
              className={`flex items-center gap-2 px-4 py-4 text-sm font-semibold whitespace-nowrap transition-all ${tab===id?'text-[#2B5EA6] border-b-2 border-[#2B5EA6] bg-blue-50/50':'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ─────────────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label:'Medicine Items', value:medicines.length, icon:FlaskConical, color:'#2B5EA6', sub:`₱${totalMedValue.toLocaleString('en-PH',{maximumFractionDigits:0})} value` },
                { label:'Supply Items', value:supplies.length, icon:Package, color:'#60A85C', sub:`₱${totalSupValue.toLocaleString('en-PH',{maximumFractionDigits:0})} value` },
                { label:'Office Supplies', value:officeSupplies.length, icon:Briefcase, color:'#f59e0b', sub:`${lowStockOffice} low stock` },
                { label:'Pending Orders', value:pendingCount, icon:ShoppingCart, color:'#8b5cf6', sub:`${pendingOrders.filter(o=>o.status==='received').length} received` },
                { label:'Low / Out of Stock', value:lowStockMeds+outOfStockMeds+lowStockSups, icon:AlertTriangle, color:'#ef4444', sub:`${outOfStockMeds} out of stock` },
                { label:'Expiring / Expired', value:expiringSoon+expired, icon:Calendar, color:'#ef4444', sub:`${expired} already expired` },
                { label:'Suppliers', value:suppliers.length, icon:Building2, color:'#6366f1', sub:`${suppliers.filter(s=>s.is_active).length} active` },
                { label:'Total Items', value:medicines.length+supplies.length+officeSupplies.length, icon:Layers, color:'#14b8a6', sub:'across all categories' },
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
                  <BarChart data={medByCat}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip />
                    <Bar dataKey="value" name="Total Qty" fill="#2B5EA6" radius={[4,4,0,0]}>
                      {medByCat.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Bar></BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Package className="w-4 h-4 text-[#60A85C]" /> Supplies by Category</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart><Pie data={supByCat} dataKey="qty" nameKey="name" cx="50%" cy="50%" outerRadius={75}
                    label={({ name, percent }: any) => `${name} ${(percent*100).toFixed(0)}%`}>
                    {supByCat.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Pie><Tooltip /><Legend /></PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── MEDICINES TABLE ─────────────────────────────────────────────────── */}
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
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Item</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Supplier</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Total Value</th>
                  <th className="px-4 py-3 text-left">Expiry</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? <tr><td colSpan={9} className="text-center py-8 text-gray-400">Loading...</td></tr>
                  : filteredMeds.length === 0 ? <tr><td colSpan={9} className="text-center py-8 text-gray-400">No medicines found.</td></tr>
                  : filteredMeds.map(m => {
                    const sup = suppliers.find(s => s.id === m.supplier_id);
                    return (
                    <tr key={m.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{m.name}</p>
                        {m.generic_name && <p className="text-xs text-gray-400">{m.generic_name}</p>}
                        {m.barcode && <p className="text-xs text-gray-300 flex items-center gap-1"><Barcode className="w-3 h-3" />{m.barcode}</p>}
                        {m.lot_number && <p className="text-xs text-gray-300">Lot: {m.lot_number}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{m.category}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{sup?.name || '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{m.quantity} <span className="text-xs text-gray-400">{m.unit}</span></td>
                      <td className="px-4 py-3 text-right text-gray-600">₱{Number(m.unit_cost||0).toLocaleString('en-PH',{maximumFractionDigits:2})}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">₱{((m.quantity||0)*(parseFloat(m.unit_cost)||0)).toLocaleString('en-PH',{maximumFractionDigits:0})}</td>
                      <td className="px-4 py-3"><ExpiryBadge date={m.expiry_date} /></td>
                      <td className="px-4 py-3"><StatusBadge qty={m.quantity} reorder={m.reorder_level} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openLogbook(m,'medicine')} className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-500" title="Logbook"><BookOpen className="w-4 h-4" /></button>
                          {canEdit && <>
                            <button onClick={() => setShowMoveModal({ item:m, type:'medicine' })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500" title="Movement"><Activity className="w-4 h-4" /></button>
                            <button onClick={() => { setEditItem(m); setShowMedModal(true); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={async () => { if(confirm('Delete?')) { await api.deleteMedicine(m.id); loadData(); } }} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SUPPLIES TABLE ──────────────────────────────────────────────────── */}
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
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Supply</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Supplier</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Total Value</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? <tr><td colSpan={8} className="text-center py-8 text-gray-400">Loading...</td></tr>
                  : filteredSups.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-400">No supplies found.</td></tr>
                  : filteredSups.map(s => {
                    const sup = suppliers.find(x => x.id === s.supplier_id);
                    return (
                    <tr key={s.id} className="hover:bg-green-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{s.name}</p>
                        {s.barcode && <p className="text-xs text-gray-300 flex items-center gap-1"><Barcode className="w-3 h-3" />{s.barcode}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{s.category}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{sup?.name || s.supplier || '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{s.quantity} <span className="text-xs text-gray-400">{s.unit}</span></td>
                      <td className="px-4 py-3 text-right text-gray-600">₱{Number(s.unit_cost||0).toLocaleString('en-PH',{maximumFractionDigits:2})}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">₱{((s.quantity||0)*(parseFloat(s.unit_cost)||0)).toLocaleString('en-PH',{maximumFractionDigits:0})}</td>
                      <td className="px-4 py-3"><StatusBadge qty={s.quantity} reorder={s.reorder_level} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openLogbook(s,'supply')} className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-500"><BookOpen className="w-4 h-4" /></button>
                          {canEdit && <>
                            <button onClick={() => setShowMoveModal({ item:s, type:'supply' })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Activity className="w-4 h-4" /></button>
                            <button onClick={() => { setEditItem(s); setShowSupModal(true); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={async () => { if(confirm('Delete?')) { await api.deleteSupply(s.id); loadData(); } }} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── OFFICE SUPPLIES ─────────────────────────────────────────────────── */}
        {tab === 'office' && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search office supplies..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400/30 outline-none" />
              </div>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                <option value="All">All Categories</option>
                {OFFICE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead><tr className="bg-amber-50 text-gray-600 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Item</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Supplier</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Total Value</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? <tr><td colSpan={8} className="text-center py-8 text-gray-400">Loading...</td></tr>
                  : filteredOffice.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-400">No office supplies found.</td></tr>
                  : filteredOffice.map(o => {
                    const sup = suppliers.find(x => x.id === o.supplier_id);
                    return (
                    <tr key={o.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{o.name}</p>
                        {o.barcode && <p className="text-xs text-gray-300 flex items-center gap-1"><Barcode className="w-3 h-3" />{o.barcode}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{o.category}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{sup?.name || '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{o.quantity} <span className="text-xs text-gray-400">{o.unit}</span></td>
                      <td className="px-4 py-3 text-right text-gray-600">₱{Number(o.unit_cost||0).toLocaleString('en-PH',{maximumFractionDigits:2})}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">₱{((o.quantity||0)*(parseFloat(o.unit_cost)||0)).toLocaleString('en-PH',{maximumFractionDigits:0})}</td>
                      <td className="px-4 py-3"><StatusBadge qty={o.quantity} reorder={o.reorder_level} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {canEdit && <>
                            <button onClick={() => { setEditItem(o); setShowOfficModal(true); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={async () => { if(confirm('Delete?')) { await api.deleteOfficeSupply(o.id); loadData(); } }} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PENDING ORDERS ──────────────────────────────────────────────────── */}
        {tab === 'orders' && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none" />
              </div>
              <select value={orderFilter} onChange={e => setOrderFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="received">Received</option>
              </select>
              {canEdit && (
                <button onClick={() => { setAddOrderPrefill(null); setShowAddOrderModal(true); }}
                  className="flex items-center gap-2 bg-[#2B5EA6] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#2B5EA6]/90">
                  <Plus className="w-4 h-4" /> Add Order
                </button>
              )}
            </div>

            {filteredOrders.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No orders found</p>
                <p className="text-sm mt-1">Create an order using "New Order" or "Add Order" above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map(order => (
                  <div key={order.id} className={`rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${order.status==='received'?'bg-green-50 border-green-100':'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${order.item_type==='medicine'?'bg-blue-100 text-blue-700':order.item_type==='supply'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>
                          {order.item_type}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${order.status==='pending'?'bg-orange-100 text-orange-700':'bg-green-100 text-green-700'}`}>
                          {order.status === 'pending' ? '⏳ Pending' : '✅ Received'}
                        </span>
                        <span className="text-xs text-gray-400">{order.id}</span>
                      </div>
                      <p className="font-bold text-gray-900 text-base">{order.item_name}</p>
                      <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-gray-500">
                        <span>Qty: <strong className="text-gray-800">{order.quantity} {order.unit}</strong></span>
                        {order.unit_cost > 0 && <span>Est. Cost: <strong className="text-gray-800">₱{(order.unit_cost*order.quantity).toLocaleString('en-PH',{maximumFractionDigits:2})}</strong></span>}
                        <span>Supplier: <strong className="text-gray-800">{order.supplier_name || '—'}</strong></span>
                        {order.supplier_name && <span className="text-xs text-gray-400">{order.contact_person} · {order.supplier_phone}</span>}
                      </div>
                      {order.notes && <p className="text-xs text-gray-400 mt-1 italic">{order.notes}</p>}
                      <p className="text-xs text-gray-300 mt-1">Created: {new Date(order.created_at).toLocaleDateString('en-PH')} by {order.created_by}</p>
                      {order.status === 'received' && order.received_at && (
                        <p className="text-xs text-green-600 mt-0.5">Received: {new Date(order.received_at).toLocaleDateString('en-PH')} by {order.received_by}</p>
                      )}
                    </div>
                    {canEdit && order.status === 'pending' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => setShowReceiveModal(order)}
                          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-700 shadow">
                          <CheckSquare className="w-4 h-4" /> Receive
                        </button>
                        <button onClick={async () => { if(confirm('Cancel this order?')) { await api.updatePendingOrder(order.id, { ...order, status:'cancelled' }); loadData(); } }}
                          className="p-2 hover:bg-red-100 rounded-xl text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── LOGBOOK ─────────────────────────────────────────────────────────── */}
        {tab === 'logbook' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800 flex items-center gap-2"><BookOpen className="w-5 h-5 text-[#2B5EA6]" /> Digital Logbook</h3>
                <p className="text-xs text-gray-500 mt-1">All inventory movements — IN, OUT, and adjustments.</p>
              </div>
              <button onClick={loadData} className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {transactions.length === 0 ? (
                <p className="text-center text-gray-400 py-12">No transaction records yet.</p>
              ) : transactions.map(tx => {
                const isIn = tx.transaction_type === 'IN', isOut = tx.transaction_type === 'OUT';
                return (
                  <div key={tx.id} className={`rounded-xl p-4 border flex items-start gap-4 ${isIn?'bg-green-50 border-green-100':isOut?'bg-red-50 border-red-100':'bg-gray-50 border-gray-100'}`}>
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${isIn?'bg-green-100':isOut?'bg-red-100':'bg-gray-100'}`}>
                      {isIn?<LogIn className="w-5 h-5 text-green-600"/>:isOut?<LogOut className="w-5 h-5 text-red-600"/>:<Activity className="w-5 h-5 text-gray-500"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{tx.item_name||tx.item_id}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isIn?'bg-green-100 text-green-700':isOut?'bg-red-100 text-red-700':'bg-gray-100 text-gray-600'}`}>
                          {isIn?'▲':'▼'} {tx.transaction_type} · {tx.quantity} units
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{tx.reason||'—'}</p>
                      <div className="flex gap-4 mt-1.5 flex-wrap text-xs text-gray-500">
                        {tx.reference_person&&<span>👤 {tx.reference_person}</span>}
                        {tx.barangay&&<span>📍 {tx.barangay}</span>}
                        <span>🖊 {tx.performed_by}</span>
                        {tx.previous_qty!=null&&<span>📦 {tx.previous_qty} → {tx.new_qty}</span>}
                        {tx.total_cost>0&&<span>💰 ₱{Number(tx.total_cost).toLocaleString()}</span>}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{new Date(tx.created_at).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SUPPLIERS ───────────────────────────────────────────────────────── */}
        {tab === 'suppliers' && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none" />
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead><tr className="bg-indigo-50 text-gray-600 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Supplier</th>
                  <th className="px-4 py-3 text-left">Contact</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
                  : filteredSuppliers.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-400">No suppliers found. Add one using the button above.</td></tr>
                  : filteredSuppliers.map(s => (
                    <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{s.name}</p>
                        {s.address && <p className="text-xs text-gray-400">{s.address}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-700">{s.contact_person || '—'}</p>
                        {s.phone && <p className="text-xs text-gray-400">{s.phone}</p>}
                      </td>
                      <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">{s.category}</span></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{s.email || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${s.is_active?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>
                          {s.is_active ? '● Active' : '○ Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {canEdit && <>
                            <button onClick={() => { setEditItem(s); setShowSupplierModal(true); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={async () => { if(confirm('Delete supplier?')) { await api.deleteSupplier(s.id); loadData(); } }} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showMedModal && <MedicineModal item={editItem} programs={programs} suppliers={suppliers} onClose={() => { setShowMedModal(false); setEditItem(null); }} onSave={saveMedicine} />}
      {showSupModal && <SupplyModal item={editItem} programs={programs} suppliers={suppliers} onClose={() => { setShowSupModal(false); setEditItem(null); }} onSave={saveSupply} />}
      {showOfficModal && <OfficeSupplyModal item={editItem} suppliers={suppliers} onClose={() => { setShowOfficModal(false); setEditItem(null); }} onSave={saveOfficeSupply} />}
      {showSupplierModal && <SupplierModal item={editItem} onClose={() => { setShowSupplierModal(false); setEditItem(null); }} onSave={saveSupplier} />}
      {showAddOrderModal && <AddOrderModal prefill={addOrderPrefill} medicines={medicines} supplies={supplies} officeSupplies={officeSupplies} suppliers={suppliers} programs={programs} onClose={() => { setShowAddOrderModal(false); setAddOrderPrefill(null); }} onSave={saveOrder} />}
      {showReceiveModal && <ReceiveOrderModal order={showReceiveModal} medicines={medicines} supplies={supplies} officeSupplies={officeSupplies} onClose={() => setShowReceiveModal(null)} onReceive={receiveOrder} />}
      {showMoveModal && <MovementModal item={showMoveModal.item} itemType={showMoveModal.type} onClose={() => setShowMoveModal(null)} onSave={handleMovement} />}
      {showLogbook && <LogbookModal transactions={showLogbook.txs} itemName={showLogbook.item.name} onClose={() => setShowLogbook(null)} />}
      {showDispatchModal && <DispatchMedicineModal medicines={medicines} currentUser={currentUser} onClose={() => setShowDispatchModal(false)} onSave={handleDispatch} />}
    </div>
  );
}

export default InventoryPage;
