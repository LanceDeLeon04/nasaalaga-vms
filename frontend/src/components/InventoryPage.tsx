import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
  FlaskConical, Package, Plus, Search, Edit2, Trash2, AlertTriangle,
  CheckCircle, BarChart2, RefreshCw, X, Barcode, Calendar, Building2,
  ShieldAlert, BookOpen, LogIn, LogOut, DollarSign, Activity, Truck,
  ShoppingCart, ArrowRight, CheckSquare, Briefcase, Hash,
  SendHorizonal, MapPin, Syringe, PawPrint, Archive, Info,
} from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api';
import type { UserRole } from '../App';
import { fetchCalacaBarangays, CALACA_BARANGAYS_FALLBACK } from '../utils/barangays';

interface Props { userRole: UserRole; currentUser?: { id?: string; username?: string; name?: string; role?: UserRole; barangay?: string; } }
const COLORS = ['#2B5EA6','#60A85C','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#14b8a6'];
const MEDICINE_CATEGORIES = ['Vaccine','Antibiotic','Antiparasitic','Vitamin','Analgesic','Antifungal','Other'];
const SUPPLY_CATEGORIES = ['Medical Supplies','PPE','Diagnostic','Cold Chain','Wound Care','Disinfectant','Other'];
const OFFICE_CATEGORIES = ['Paper & Stationery','Printer Supplies','Cleaning','Equipment','Storage','Computer Accessories','Other'];
const SUPPLIER_CATEGORIES = ['Medicine Supplier','Medical Supplies','Office Supplies','Equipment','General','Other'];
const UNIT_TYPES = [
  { value:'Vial', label:'Vial', icon:'💉', desc:'Injectable liquid in glass/plastic vials' },
  { value:'Bottle', label:'Bottle', icon:'🍶', desc:'Liquid medicine in a bottle' },
  { value:'Ampoule', label:'Ampoule', icon:'⚗️', desc:'Sealed glass ampoule' },
  { value:'Box', label:'Box', icon:'📦', desc:'Box containing tablets, capsules or sachets' },
  { value:'Tablet', label:'Tablet', icon:'💊', desc:'Loose tablets / capsules (not boxed)' },
  { value:'Other', label:'Other', icon:'🗃️', desc:'Any other unit type' },
];
const CONC_UNITS = ['mg','mcg','g','IU','mEq','mg/ml','mcg/ml','IU/ml','%'];
const VOL_UNITS = ['ml','L','cc'];

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
function computeDosage(unitType: string, doseType: string, dosesPerContainer: number, qty: number) {
  const isContainer = ['Vial','Bottle','Ampoule'].includes(unitType);
  const isBox = unitType === 'Box';
  const isMultiDose = isContainer && doseType === 'multi';
  const dosesPerUnit = isMultiDose ? (dosesPerContainer||1) : isBox ? (dosesPerContainer||1) : 1;
  const totalDoses = (qty||0) * dosesPerUnit;
  const unitLabel = unitType === 'Other' ? 'units' : unitType.toLowerCase()+'s';
  return { isContainer, isBox, isMultiDose, dosesPerUnit, totalDoses, unitLabel };
}
function blankItemForm(overrides?: any) {
  return {
    name:'', genericName:'', category:'Vaccine', type:'', lotNumber:'', expiryDate:'',
    manufactureDate:'', manufacturer:'', quantity:0, reorderLevel:10, unitCost:0,
    storageCondition:'', description:'', barcode:'', status:'Active', supplierId:'',
    purpose:'program', programId:'', lineItemId:'', fiscalYear:new Date().getFullYear(), receivedBy:'',
    unitType:'Vial', doseType:'single', dosesPerContainer:1,
    concentrationValue:'', concentrationUnit:'mg', volumePerContainer:'', volumeUnit:'ml',
    ...overrides,
  };
}

// ── Inline new-supplier form (used inside item/order modals) ─────────────────
function InlineSupplierForm({ onSave, onCancel }: { onSave:(d:any)=>Promise<string|void>; onCancel:()=>void }) {
  const [form,setForm] = useState({name:'',contactPerson:'',phone:'',email:'',address:'',category:'General',notes:''});
  const [saving,setSaving] = useState(false);
  const set = (k:string,v:string)=>setForm(f=>({...f,[k]:v}));
  const handleSave = async()=>{
    if(!form.name.trim()){toast.error('Supplier name required');return;}
    setSaving(true); try{await onSave(form);}finally{setSaving(false);}
  };
  return(
    <div className="mt-2 bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
      <p className="text-xs font-bold text-indigo-700 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5"/>Add New Supplier</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1">Company Name *</label>
          <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Pharma Inc." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Contact Person</label>
          <input value={form.contactPerson} onChange={e=>set('contactPerson',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
          <input value={form.phone} onChange={e=>set('phone',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
          <input value={form.email} onChange={e=>set('email',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
          <select value={form.category} onChange={e=>set('category',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
            {SUPPLIER_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
        <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1">Address</label>
          <input value={form.address} onChange={e=>set('address',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-60">
          {saving?'Saving...':'Save & Select'}</button>
      </div>
    </div>
  );
}
function SupplierSelector({ supplierId, suppliers, onSelect, onNewSupplier }:{supplierId:string;suppliers:any[];onSelect:(id:string)=>void;onNewSupplier:(data:any)=>Promise<string|void>;}) {
  const [showAdd,setShowAdd] = useState(false);
  const handleNewSave = async(data:any)=>{const newId=await onNewSupplier(data);if(newId)onSelect(newId);setShowAdd(false);toast.success('New supplier added and selected');};
  return(
    <div>
      {!showAdd&&(
        <div className="flex gap-2">
          <select value={supplierId} onChange={e=>onSelect(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
            <option value="">— Select Supplier (optional) —</option>
            {suppliers.filter(s=>s.is_active).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button type="button" onClick={()=>setShowAdd(true)} className="px-3 py-2 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 whitespace-nowrap flex items-center gap-1">
            <Plus className="w-3 h-3"/>New</button>
        </div>
      )}
      {showAdd&&<InlineSupplierForm onSave={handleNewSave} onCancel={()=>setShowAdd(false)}/>}
      {supplierId&&!showAdd&&(
        <p className="text-xs text-teal-600 font-semibold mt-1 flex items-center gap-1">
          <CheckCircle className="w-3 h-3"/>{suppliers.find(s=>s.id===supplierId)?.name||'Selected'}
        </p>
      )}
    </div>
  );
}

// ── Shared item detail fields ─────────────────────────────────────────────────
function ItemDetailFields({ form, setField, suppliers, programs, onNewSupplier, showQty=true, showPurpose=true }:{
  form:any; setField:(k:string,v:any)=>void; suppliers:any[]; programs:any[];
  onNewSupplier:(data:any)=>Promise<string|void>; showQty?:boolean; showPurpose?:boolean;
}) {
  const { isContainer, isBox, isMultiDose, totalDoses, unitLabel } = computeDosage(form.unitType,form.doseType,form.dosesPerContainer,form.quantity);
  const lineItems = programs.find((p:any)=>p.id===form.programId)?.line_items||[];
  const concentrationStr = form.concentrationValue?`${form.concentrationValue} ${form.concentrationUnit}`:'';
  const volumeStr = form.volumePerContainer?`${form.volumePerContainer} ${form.volumeUnit}`:'';
  return(
    <div className="space-y-4">
      {showPurpose&&(
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <label className="block text-xs font-semibold text-blue-700 mb-2">Purpose *</label>
          <div className="flex gap-3">
            {[{value:'program',label:'Program'},{value:'office',label:'Office / Operating'}].map(p=>(
              <button key={p.value} type="button" onClick={()=>setField('purpose',p.value)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${form.purpose===p.value?'bg-[#2B5EA6] text-white border-[#2B5EA6]':'bg-white text-gray-600 border-gray-200 hover:border-[#2B5EA6]'}`}>
                {p.label}</button>
            ))}
          </div>
        </div>
      )}
      {form.purpose==='program'&&(
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs font-semibold text-gray-600 mb-1">Budget Program</label>
            <select value={form.programId} onChange={e=>{setField('programId',e.target.value);setField('lineItemId','');}} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
              <option value="">— Select Program —</option>
              {programs.map((p:any)=><option key={p.id} value={p.id}>{p.name} (FY{p.fiscal_year})</option>)}
            </select></div>
          <div><label className="block text-xs font-semibold text-gray-600 mb-1">Line Item</label>
            <select value={form.lineItemId} onChange={e=>setField('lineItemId',e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${!form.programId?'border-gray-100 text-gray-400':lineItems.length?'border-gray-200':'border-yellow-200'}`}
              disabled={!form.programId||!lineItems.length}>
              <option value="">{!form.programId?'— Select a program first —':lineItems.length===0?'— No line items —':'— Select Line Item —'}</option>
              {lineItems.map((li:any)=><option key={li.id} value={li.id}>{li.name} (₱{Number(li.allotment||0).toLocaleString()})</option>)}
            </select></div>
        </div>
      )}
      <div><label className="block text-xs font-semibold text-gray-600 mb-1">Default Supplier</label>
        <SupplierSelector supplierId={form.supplierId} suppliers={suppliers} onSelect={v=>setField('supplierId',v)} onNewSupplier={onNewSupplier}/></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1">Product Name *</label>
          <input value={form.name} onChange={e=>setField('name',e.target.value)} placeholder="e.g. Rabies Vaccine (Rabisin)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2B5EA6]/30 outline-none"/></div>
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Generic Name</label>
          <input value={form.genericName} onChange={e=>setField('genericName',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Manufacturer</label>
          <input value={form.manufacturer} onChange={e=>setField('manufacturer',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
          <select value={form.category} onChange={e=>setField('category',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
            {MEDICINE_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Type / Subtype</label>
          <input value={form.type} onChange={e=>setField('type',e.target.value)} placeholder="e.g. Live Attenuated" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Lot / Batch Number</label>
          <input value={form.lotNumber} onChange={e=>setField('lotNumber',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Barcode</label>
          <input value={form.barcode} onChange={e=>setField('barcode',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Manufacture Date</label>
          <input type="date" value={form.manufactureDate} onChange={e=>setField('manufactureDate',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Expiry Date</label>
          <input type="date" value={form.expiryDate} onChange={e=>setField('expiryDate',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Storage Condition</label>
          <input value={form.storageCondition} onChange={e=>setField('storageCondition',e.target.value)} placeholder="e.g. Refrigerate 2-8°C" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Reorder Level</label>
          <input type="number" min={0} value={form.reorderLevel} onChange={e=>setField('reorderLevel',parseInt(e.target.value)||0)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
        <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1">Description / Notes</label>
          <input value={form.description} onChange={e=>setField('description',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
      </div>
      <div className="rounded-xl border border-purple-100 bg-purple-50 p-4">
        <label className="block text-xs font-semibold text-purple-700 mb-3 flex items-center gap-1"><Syringe className="w-3.5 h-3.5"/>Strength / Concentration (optional)</label>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs text-gray-500 mb-1">Concentration</label>
            <div className="flex gap-2">
              <input type="number" step="0.001" value={form.concentrationValue} onChange={e=>setField('concentrationValue',e.target.value)} placeholder="e.g. 500" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none min-w-0"/>
              <select value={form.concentrationUnit} onChange={e=>setField('concentrationUnit',e.target.value)} className="border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none">
                {CONC_UNITS.map(u=><option key={u}>{u}</option>)}</select>
            </div></div>
          <div><label className="block text-xs text-gray-500 mb-1">Volume per Container</label>
            <div className="flex gap-2">
              <input type="number" step="0.01" value={form.volumePerContainer} onChange={e=>setField('volumePerContainer',e.target.value)} placeholder="e.g. 1" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none min-w-0"/>
              <select value={form.volumeUnit} onChange={e=>setField('volumeUnit',e.target.value)} className="border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none">
                {VOL_UNITS.map(u=><option key={u}>{u}</option>)}</select>
            </div></div>
        </div>
      </div>
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <label className="block text-xs font-semibold text-blue-700 mb-3">Unit Type *</label>
        <div className="grid grid-cols-3 gap-2">
          {UNIT_TYPES.map(ut=>(
            <button key={ut.value} type="button"
              onClick={()=>{setField('unitType',ut.value);if(!['Vial','Bottle','Ampoule'].includes(ut.value)){setField('doseType','single');setField('dosesPerContainer',1);}}}
              className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all text-center ${form.unitType===ut.value?'border-[#2B5EA6] bg-[#2B5EA6] text-white shadow-md':'border-gray-200 bg-white text-gray-600 hover:border-[#2B5EA6]/60'}`}>
              <span className="text-xl">{ut.icon}</span><span className="text-xs font-bold">{ut.label}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-500 mt-2">{UNIT_TYPES.find(u=>u.value===form.unitType)?.desc}</p>
      </div>
      {isContainer&&(
        <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-4 space-y-3">
          <label className="block text-xs font-semibold text-teal-700">Dosage Type per {form.unitType} *</label>
          <div className="flex gap-3">
            {[{value:'single',label:'Single-Dose',desc:`Each ${form.unitType.toLowerCase()} = 1 dose`},{value:'multi',label:'Multi-Dose',desc:`Each ${form.unitType.toLowerCase()} contains multiple doses`}].map(dt=>(
              <button key={dt.value} type="button" onClick={()=>setField('doseType',dt.value)}
                className={`flex-1 py-3 px-3 rounded-xl border-2 transition-all text-left ${form.doseType===dt.value?'border-teal-500 bg-teal-500 text-white':'border-gray-200 bg-white text-gray-600 hover:border-teal-400'}`}>
                <p className="text-sm font-bold">{dt.label}</p>
                <p className={`text-[11px] mt-0.5 ${form.doseType===dt.value?'text-teal-100':'text-gray-400'}`}>{dt.desc}</p>
              </button>
            ))}
          </div>
          {isMultiDose&&(
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Doses per {form.unitType} *</label>
              <input type="number" min={2} value={form.dosesPerContainer} onChange={e=>setField('dosesPerContainer',parseInt(e.target.value)||1)}
                className="w-full border-2 border-teal-200 rounded-lg px-3 py-2 text-sm outline-none font-semibold"/></div>
          )}
        </div>
      )}
      {isBox&&(
        <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-4 space-y-3">
          <label className="block text-xs font-semibold text-orange-700">Box Contents *</label>
          <div><label className="block text-xs text-gray-600 mb-1">Tablets / Capsules / Sachets per Box *</label>
            <input type="number" min={1} value={form.dosesPerContainer} onChange={e=>setField('dosesPerContainer',parseInt(e.target.value)||1)}
              className="w-full border-2 border-orange-200 rounded-lg px-3 py-2 text-sm outline-none font-semibold"/></div>
        </div>
      )}
      <div><label className="block text-xs font-semibold text-gray-600 mb-1">Unit Price per {form.unitType} (₱)</label>
        <input type="number" step="0.01" min={0} value={form.unitCost} onChange={e=>setField('unitCost',parseFloat(e.target.value)||0)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
      {showQty&&(
        <div><label className="block text-xs font-semibold text-gray-600 mb-1">Quantity ({form.unitType==='Other'?'units':form.unitType.toLowerCase()+'s'}) *</label>
          <input type="number" min={0} value={form.quantity} onChange={e=>setField('quantity',parseInt(e.target.value)||0)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2B5EA6]/30 outline-none font-semibold"/></div>
      )}
      {showQty&&form.quantity>0&&(
        <div className="rounded-xl bg-gradient-to-r from-[#2B5EA6]/10 to-teal-50 border border-[#2B5EA6]/20 p-4">
          <p className="text-xs font-bold text-[#2B5EA6] uppercase tracking-wide mb-3">📊 Summary</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Containers</p>
              <p className="text-xl font-black text-gray-900">{(form.quantity||0).toLocaleString()}</p>
              <p className="text-[10px] text-gray-500">{unitLabel}</p>
            </div>
            {(isContainer||isBox)&&(
              <div className="bg-white rounded-lg p-3 border border-teal-200">
                <p className="text-[10px] text-teal-600 font-semibold uppercase">Total {isBox?'Tablets':'Doses'}</p>
                <p className="text-xl font-black text-teal-700">{totalDoses.toLocaleString()}</p>
                <p className="text-[10px] text-teal-500">{isBox?`${form.dosesPerContainer} tablets × ${form.quantity} boxes`:form.doseType==='multi'?`${form.dosesPerContainer} doses × ${form.quantity} ${unitLabel}`:`1 dose × ${form.quantity} ${unitLabel}`}</p>
              </div>
            )}
            {concentrationStr&&(
              <div className="bg-white rounded-lg p-3 border border-purple-100">
                <p className="text-[10px] text-purple-500 font-semibold uppercase">Strength</p>
                <p className="text-base font-black text-purple-700">{concentrationStr}</p>
                {volumeStr&&<p className="text-[10px] text-gray-400">per {volumeStr}</p>}
              </div>
            )}
            {form.unitCost>0&&(
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <p className="text-[10px] text-green-600 font-semibold uppercase">Total Cost</p>
                <p className="text-xl font-black text-green-700">₱{((form.quantity||0)*(form.unitCost||0)).toLocaleString('en-PH',{maximumFractionDigits:0})}</p>
                <p className="text-[10px] text-gray-400">₱{Number(form.unitCost).toLocaleString('en-PH',{maximumFractionDigits:2})} / {form.unitType.toLowerCase()}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Catalogue-only Add Modals (NO qty on new) ─────────────────────────────────
function MedicineModal({ item, programs, suppliers, onClose, onSave, onNewSupplier }:{
  item?:any; programs:any[]; suppliers:any[]; onClose:()=>void; onSave:(d:any)=>void; onNewSupplier:(data:any)=>Promise<string|void>;
}) {
  const [form,setForm] = useState(item?{
    name:item.name,genericName:item.generic_name||'',category:item.category,type:item.type||'',
    lotNumber:item.lot_number||'',expiryDate:item.expiry_date?.split('T')[0]||'',
    manufactureDate:item.manufacture_date?.split('T')[0]||'',manufacturer:item.manufacturer||'',
    quantity:item.quantity,reorderLevel:item.reorder_level,unitCost:item.unit_cost,
    storageCondition:item.storage_condition||'',description:item.description||'',
    barcode:item.barcode||'',status:item.status||'Active',supplierId:item.supplier_id||'',
    purpose:item.purpose||'program',programId:item.program_id||'',lineItemId:item.line_item_id||'',
    fiscalYear:item.fiscal_year||new Date().getFullYear(),receivedBy:item.received_by||'',
    unitType:item.unit_type||'Vial',doseType:item.dose_type||'single',dosesPerContainer:item.doses_per_container||1,
    concentrationValue:item.concentration_value||'',concentrationUnit:item.concentration_unit||'mg',
    volumePerContainer:item.volume_per_container||'',volumeUnit:item.volume_unit||'ml',
  }:blankItemForm());
  const setField=(k:string,v:any)=>setForm(f=>({...f,[k]:v}));
  const {unitLabel,totalDoses}=computeDosage(form.unitType,form.doseType,form.dosesPerContainer,form.quantity);
  return(
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><FlaskConical className="w-5 h-5 text-[#2B5EA6]"/>{item?'Edit Medicine':'Add Medicine to Catalogue'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5"/></button>
        </div>
        {!item&&(
          <div className="mx-6 mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"/>
            <div><p className="text-xs font-bold text-amber-800">Adding to catalogue only — no stock added</p>
              <p className="text-xs text-amber-700 mt-0.5">To add actual stock, use <strong>New Order</strong> (order → receive) or <strong>Add Old Stocks</strong> (admin migration).</p></div>
          </div>
        )}
        <div className="p-6"><ItemDetailFields form={form} setField={setField} suppliers={suppliers} programs={programs} onNewSupplier={onNewSupplier} showQty={!!item}/></div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 justify-end rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={()=>onSave({...form,unit:unitLabel,totalDoses})} className="px-6 py-2 bg-[#2B5EA6] text-white rounded-xl text-sm font-semibold hover:bg-[#2B5EA6]/90">
            {item?'Save Changes':'Add to Catalogue'}</button>
        </div>
      </div>
    </div>
  );
}

function SupplyModal({ item, programs, suppliers, onClose, onSave, onNewSupplier }:{
  item?:any; programs:any[]; suppliers:any[]; onClose:()=>void; onSave:(d:any)=>void; onNewSupplier:(data:any)=>Promise<string|void>;
}) {
  const [form,setForm] = useState(item?{
    name:item.name,category:item.category,type:item.type||'',quantity:item.quantity,unit:item.unit||'pieces',
    reorderLevel:item.reorder_level,unitCost:item.unit_cost,supplierId:item.supplier_id||'',
    lastRestocked:item.last_restocked?.split('T')[0]||'',description:item.description||'',
    barcode:item.barcode||'',status:item.status||'Active',purpose:item.purpose||'office',
    programId:item.program_id||'',lineItemId:item.line_item_id||'',
    fiscalYear:item.fiscal_year||new Date().getFullYear(),receivedBy:item.received_by||'',
  }:{name:'',category:'Medical Supplies',type:'',quantity:0,unit:'pieces',reorderLevel:5,unitCost:0,
     supplierId:'',lastRestocked:'',description:'',barcode:'',status:'Active',purpose:'office',
     programId:'',lineItemId:'',fiscalYear:new Date().getFullYear(),receivedBy:''});
  const set=(k:string,v:any)=>setForm(f=>({...f,[k]:v}));
  const lineItems=programs.find(p=>p.id===form.programId)?.line_items||[];
  return(
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Package className="w-5 h-5 text-[#60A85C]"/>{item?'Edit Supply':'Add Supply to Catalogue'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5"/></button>
        </div>
        {!item&&(<div className="mx-6 mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3"><Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"/><p className="text-xs text-amber-700">Catalogue only — stock added via <strong>New Order</strong> or <strong>Add Old Stocks</strong>.</p></div>)}
        <div className="p-6 space-y-5">
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <label className="block text-xs font-semibold text-green-700 mb-2">Purpose *</label>
            <div className="flex gap-3">
              {[{value:'office',label:'Office / Operating'},{value:'program',label:'Program'}].map(p=>(
                <button key={p.value} onClick={()=>set('purpose',p.value)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${form.purpose===p.value?'bg-[#60A85C] text-white border-[#60A85C]':'bg-white text-gray-600 border-gray-200 hover:border-[#60A85C]'}`}>{p.label}</button>
              ))}
            </div>
          </div>
          {form.purpose==='program'&&(
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Budget Program</label>
                <select value={form.programId} onChange={e=>{set('programId',e.target.value);set('lineItemId','');}} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="">— Select Program —</option>{programs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Line Item</label>
                <select value={form.lineItemId} onChange={e=>set('lineItemId',e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${!form.programId?'border-gray-100 text-gray-400':'border-gray-200'}`} disabled={!form.programId||!lineItems.length}>
                  <option value="">{!form.programId?'— Select program first —':lineItems.length===0?'— No line items —':'— Select Line Item —'}</option>
                  {lineItems.map((li:any)=><option key={li.id} value={li.id}>{li.name}</option>)}</select></div>
            </div>
          )}
          <div><label className="block text-xs font-semibold text-gray-600 mb-1">Default Supplier</label>
            <SupplierSelector supplierId={form.supplierId} suppliers={suppliers} onSelect={v=>set('supplierId',v)} onNewSupplier={onNewSupplier}/></div>
          <div className="grid grid-cols-2 gap-4">
            {[{label:'Supply Name *',key:'name',col:2},{label:'Unit',key:'unit',col:1},{label:'Reorder Level',key:'reorderLevel',type:'number',col:1},{label:'Unit Price (₱)',key:'unitCost',type:'number',step:'0.01',col:1},{label:'Barcode',key:'barcode',col:1},{label:'Description',key:'description',col:2}].map(({label,key,col,type,step}:any)=>(
              <div key={key} className={col===2?'col-span-2':''}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                <input type={type||'text'} step={step} value={(form as any)[key]} onChange={e=>set(key,type==='number'?parseFloat(e.target.value)||0:e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/>
              </div>
            ))}
            {item&&(<div><label className="block text-xs font-semibold text-gray-600 mb-1">Quantity</label><input type="number" value={form.quantity} onChange={e=>set('quantity',parseInt(e.target.value)||0)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none font-semibold"/></div>)}
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
              <select value={form.category} onChange={e=>set('category',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                {SUPPLY_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 justify-end rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={()=>onSave(form)} className="px-6 py-2 bg-[#60A85C] text-white rounded-xl text-sm font-semibold hover:bg-[#60A85C]/90">{item?'Save Changes':'Add to Catalogue'}</button>
        </div>
      </div>
    </div>
  );
}

function OfficeSupplyModal({ item, suppliers, programs, onClose, onSave, onNewSupplier }:{
  item?:any; suppliers:any[]; programs:any[]; onClose:()=>void; onSave:(d:any)=>void; onNewSupplier:(data:any)=>Promise<string|void>;
}) {
  const [form,setForm]=useState(item?{name:item.name,category:item.category||'General',quantity:item.quantity,unit:item.unit||'pieces',reorderLevel:item.reorder_level||5,unitCost:item.unit_cost||0,supplierId:item.supplier_id||'',description:item.description||'',barcode:item.barcode||'',status:item.status||'Active',purpose:item.purpose||'office',programId:item.program_id||'',lineItemId:item.line_item_id||'',fiscalYear:item.fiscal_year||new Date().getFullYear()}:{name:'',category:'Paper & Stationery',quantity:0,unit:'pieces',reorderLevel:5,unitCost:0,supplierId:'',description:'',barcode:'',status:'Active',purpose:'office',programId:'',lineItemId:'',fiscalYear:new Date().getFullYear()});
  const set=(k:string,v:any)=>setForm(f=>({...f,[k]:v}));
  return(
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Briefcase className="w-5 h-5 text-amber-500"/>{item?'Edit Office Supply':'Add Office Supply to Catalogue'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5"/></button>
        </div>
        {!item&&(<div className="mx-6 mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3"><Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"/><p className="text-xs text-amber-700">Catalogue only — add stock via <strong>New Order</strong> or <strong>Add Old Stocks</strong>.</p></div>)}
        <div className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-700 font-semibold flex items-center gap-2"><CheckCircle className="w-4 h-4"/>Office supplies — no expiry date required</div>
          {[{label:'Item Name *',key:'name'},{label:'Barcode',key:'barcode'},{label:'Unit (pieces, reams...)',key:'unit'},{label:'Reorder Level',key:'reorderLevel',type:'number'},{label:'Unit Cost (₱)',key:'unitCost',type:'number',step:'0.01'},{label:'Description',key:'description'}].map(({label,key,type,step}:any)=>(
            <div key={key}><label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
              <input type={type||'text'} step={step} value={(form as any)[key]} onChange={e=>set(key,type==='number'?parseFloat(e.target.value)||0:e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
          ))}
          {item&&(<div><label className="block text-xs font-semibold text-gray-600 mb-1">Quantity</label><input type="number" value={form.quantity} onChange={e=>set('quantity',parseInt(e.target.value)||0)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none font-semibold"/></div>)}
          <div><label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
            <select value={form.category} onChange={e=>set('category',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">{OFFICE_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
          <div><label className="block text-xs font-semibold text-gray-600 mb-1">Default Supplier</label>
            <SupplierSelector supplierId={form.supplierId} suppliers={suppliers} onSelect={v=>set('supplierId',v)} onNewSupplier={onNewSupplier}/></div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-3">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Budget Program</p>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Program</label>
              <select value={form.programId} onChange={e=>{set('programId',e.target.value);set('lineItemId','');}} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white">
                <option value="">— No Program —</option>{programs.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Line Item</label>
              <select value={form.lineItemId} onChange={e=>set('lineItemId',e.target.value)} disabled={!form.programId} className={`w-full border rounded-lg px-3 py-2 text-sm outline-none bg-white ${!form.programId?'border-gray-100 text-gray-400':'border-gray-200'}`}>
                <option value="">{!form.programId?'— Select a program first —':'— Select Line Item —'}</option>
                {(programs.find((p:any)=>p.id===form.programId)?.line_items||[]).map((li:any)=><option key={li.id} value={li.id}>{li.name}</option>)}</select></div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 justify-end rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={()=>onSave(form)} className="px-6 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600">{item?'Save Changes':'Add to Catalogue'}</button>
        </div>
      </div>
    </div>
  );
}

function SupplierModal({ item, onClose, onSave }:{ item?:any; onClose:()=>void; onSave:(d:any)=>void; }) {
  const [form,setForm]=useState(item?{name:item.name,contactPerson:item.contact_person||'',phone:item.phone||'',email:item.email||'',address:item.address||'',category:item.category||'General',notes:item.notes||'',isActive:item.is_active!==false}:{name:'',contactPerson:'',phone:'',email:'',address:'',category:'General',notes:'',isActive:true});
  const set=(k:string,v:any)=>setForm(f=>({...f,[k]:v}));
  return(
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Building2 className="w-5 h-5 text-indigo-500"/>{item?'Edit Supplier':'Add Supplier'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 space-y-4">
          {[{label:'Supplier / Company Name *',key:'name'},{label:'Contact Person',key:'contactPerson'},{label:'Phone',key:'phone'},{label:'Email',key:'email'},{label:'Address',key:'address'},{label:'Notes',key:'notes'}].map(({label,key})=>(
            <div key={key}><label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
              <input value={(form as any)[key]} onChange={e=>set(key,e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"/></div>
          ))}
          <div><label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
            <select value={form.category} onChange={e=>set('category',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">{SUPPLIER_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isActive} onChange={e=>set('isActive',e.target.checked)} className="w-4 h-4 accent-indigo-500"/><span className="text-sm text-gray-700 font-semibold">Active supplier</span></label>
        </div>
        <div className="border-t border-gray-100 px-6 py-4 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={()=>onSave(form)} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">{item?'Save Changes':'Add Supplier'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Budget affordability check ────────────────────────────────────────────────
function BudgetCheck({ programs, programId, lineItemId, orderCost }:{programs:any[];programId:string;lineItemId:string;orderCost:number;}) {
  if(!lineItemId||orderCost<=0) return null;
  const selectedLI=(programs.find((p:any)=>p.id===programId)?.line_items||[]).find((li:any)=>li.id===lineItemId);
  if(!selectedLI) return null;
  const balance=Number(selectedLI.allotment)-Number(selectedLI.utilized)-Number(selectedLI.obligated);
  const canAfford=balance>=orderCost;
  const pctOfBalance=balance>0?Math.round((orderCost/balance)*100):999;
  return(
    <div className={`rounded-xl px-4 py-3 border flex items-start gap-3 ${canAfford?'bg-green-50 border-green-200':'bg-red-50 border-red-200'}`}>
      {canAfford?<CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5"/>:<AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"/>}
      <div>
        <p className={`text-sm font-bold ${canAfford?'text-green-800':'text-red-800'}`}>{canAfford?'✅ Budget Sufficient':'❌ Budget Shortfall'}</p>
        <p className={`text-xs mt-0.5 ${canAfford?'text-green-700':'text-red-700'}`}>
          Balance: ₱{balance.toLocaleString('en-PH',{maximumFractionDigits:0})} · Order: ₱{orderCost.toLocaleString('en-PH',{maximumFractionDigits:0})} ({pctOfBalance}%)
          {!canAfford&&` · Shortfall: ₱${(orderCost-balance).toLocaleString('en-PH',{maximumFractionDigits:0})}`}
        </p>
      </div>
    </div>
  );
}

// ── Order Creation Modal ──────────────────────────────────────────────────────
function AddOrderModal({ prefill, medicines, officeSupplies, supplies, suppliers, programs, onClose, onSave, onNewSupplier }:{
  prefill?:any; medicines:any[]; officeSupplies:any[]; supplies:any[]; suppliers:any[]; programs:any[];
  onClose:()=>void; onSave:(d:any)=>void; onNewSupplier:(data:any)=>Promise<string|void>;
}) {
  const [productMode,setProductMode]=useState<'existing'|'new'>(prefill?.itemName?'existing':'existing');
  const [selectedExisting,setSelectedExisting]=useState<any>(null);
  const [qty,setQty]=useState(prefill?.quantity||1);
  const [notes,setNotes]=useState(prefill?.notes||'');
  const [programId,setProgramId]=useState(prefill?.programId||'');
  const [lineItemId,setLineItemId]=useState(prefill?.lineItemId||'');
  const [supplierId,setSupplierId]=useState(prefill?.supplierId||'');
  const [supplierAutoDetected,setSupplierAutoDetected]=useState(!!prefill?.supplierId);
  const [newProdForm,setNewProdForm]=useState(blankItemForm({unitCost:prefill?.unitCost||0}));
  const setNewField=(k:string,v:any)=>setNewProdForm(f=>({...f,[k]:v}));
  const [nameQuery,setNameQuery]=useState(prefill?.itemName||'');
  const [showDropdown,setShowDropdown]=useState(false);
  const allItems=[...medicines.map(m=>({...m,_type:'medicine'})),...supplies.map(s=>({...s,_type:'supply'})),...officeSupplies.map(o=>({...o,_type:'office'}))];
  const suggestions=nameQuery.length>1?allItems.filter(i=>i.name.toLowerCase().includes(nameQuery.toLowerCase())).slice(0,8):[];
  const lineItems=programs.find(p=>p.id===programId)?.line_items||[];
  const activeUnitType=productMode==='existing'?(selectedExisting?.unit_type||'Vial'):newProdForm.unitType;
  const activeDoseType=productMode==='existing'?(selectedExisting?.dose_type||'single'):newProdForm.doseType;
  const activeDPC=productMode==='existing'?(selectedExisting?.doses_per_container||1):newProdForm.dosesPerContainer;
  const activeUnitCost=productMode==='existing'?(parseFloat(selectedExisting?.unit_cost)||0):(newProdForm.unitCost||0);
  const {isContainer,isBox,isMultiDose,totalDoses,unitLabel}=computeDosage(activeUnitType,activeDoseType,activeDPC,qty);
  const totalCost=activeUnitCost*qty;
  const concentrationStr=productMode==='new'&&newProdForm.concentrationValue?`${newProdForm.concentrationValue} ${newProdForm.concentrationUnit}`:(selectedExisting?.concentration_value?`${selectedExisting.concentration_value} ${selectedExisting.concentration_unit||''}`:'');

  const selectExistingItem=(item:any)=>{
    setSelectedExisting(item);setNameQuery(item.name);setShowDropdown(false);
    if(item.supplier_id){setSupplierId(item.supplier_id);setSupplierAutoDetected(true);}else{setSupplierAutoDetected(false);}
    if(item.program_id)setProgramId(item.program_id);
    if(item.line_item_id)setLineItemId(item.line_item_id);
  };
  const handleSave=()=>{
    if(productMode==='existing'){
      if(!selectedExisting){toast.error('Select an existing product');return;}
      onSave({itemName:selectedExisting.name,itemType:selectedExisting._type,category:selectedExisting.category,unit:unitLabel,unitCost:activeUnitCost,quantity:qty,supplierId,programId,lineItemId,notes,existingItemId:selectedExisting.id,dosesPerContainer:activeDPC,totalDoses,source:'order'});
    }else{
      if(!newProdForm.name.trim()){toast.error('Product name required');return;}
      onSave({itemName:newProdForm.name,itemType:'medicine',category:newProdForm.category,unit:unitLabel,unitCost:newProdForm.unitCost,quantity:qty,supplierId:newProdForm.supplierId||supplierId,programId:newProdForm.programId||programId,lineItemId:newProdForm.lineItemId||lineItemId,notes,newProductDetails:newProdForm,dosesPerContainer:newProdForm.dosesPerContainer,totalDoses,source:'order'});
    }
  };
  return(
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-[#2B5EA6]"/>Create Order</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Product</label>
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
              {[{v:'existing',l:'Select Existing Product'},{v:'new',l:'New Product'}].map(m=>(
                <button key={m.v} onClick={()=>{setProductMode(m.v as any);setSelectedExisting(null);setNameQuery('');}}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${productMode===m.v?'bg-white text-[#2B5EA6] shadow':'text-gray-500 hover:text-gray-700'}`}>{m.l}</button>
              ))}
            </div>
          </div>

          {productMode==='existing'&&(
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Search Product *</label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 focus-within:ring-2 focus-within:ring-[#2B5EA6]/30">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0"/>
                <input value={nameQuery} onFocus={()=>setShowDropdown(true)} onChange={e=>{setNameQuery(e.target.value);setSelectedExisting(null);setShowDropdown(true);}} placeholder="Type to search by name, barcode, generic..." className="flex-1 py-2.5 text-sm outline-none"/>
                {nameQuery&&<button onClick={()=>{setNameQuery('');setSelectedExisting(null);setShowDropdown(false);}}><X className="w-3.5 h-3.5 text-gray-300"/></button>}
              </div>
              {showDropdown&&suggestions.length>0&&(
                <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl mt-1 overflow-hidden">
                  {suggestions.map(item=>(
                    <button key={item.id} onMouseDown={()=>selectExistingItem(item)} className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-3 border-b border-gray-50 last:border-b-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${item._type==='medicine'?'bg-blue-100 text-blue-700':item._type==='supply'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>{item._type}</span>
                      <div className="flex-1"><p className="text-sm font-semibold text-gray-900">{item.name}</p>
                        {item.generic_name&&<p className="text-xs text-gray-400">{item.generic_name} · {item.category}</p>}
                        {item.concentration_value&&<p className="text-xs text-purple-500">{item.concentration_value}{item.concentration_unit}</p>}</div>
                      <div className="text-right shrink-0 text-xs text-gray-400">
                        <p>{item.quantity} in stock</p>
                        {item.unit_type&&<p className="text-blue-400">{item.unit_type}{item.doses_per_container>1?` · ${item.doses_per_container} doses`:''}</p>}
                        {item.supplier_id&&suppliers.find((s:any)=>s.id===item.supplier_id)&&<p className="text-teal-500 font-semibold">📦 {suppliers.find((s:any)=>s.id===item.supplier_id)?.name}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {showDropdown&&suggestions.length===0&&nameQuery.length>1&&(
                <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl mt-1 p-3 text-center">
                  <p className="text-xs text-gray-500">No match — switch to <button onClick={()=>setProductMode('new')} className="text-[#2B5EA6] font-bold underline">New Product</button></p>
                </div>
              )}
              {selectedExisting&&(
                <div className="mt-3 bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-start justify-between">
                    <div><p className="font-bold text-blue-900">{selectedExisting.name}</p>
                      {selectedExisting.generic_name&&<p className="text-xs text-blue-500">{selectedExisting.generic_name}</p>}</div>
                    <button onClick={()=>{setSelectedExisting(null);setNameQuery('');}} className="p-1 hover:bg-blue-100 rounded-lg"><X className="w-3.5 h-3.5 text-blue-400"/></button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {selectedExisting.unit_type&&<span className="bg-white border border-blue-200 rounded px-2 py-0.5 text-blue-700 font-semibold">{selectedExisting.unit_type}</span>}
                    {selectedExisting.dose_type==='multi'&&<span className="bg-teal-100 rounded px-2 py-0.5 text-teal-700">{selectedExisting.doses_per_container} doses/{selectedExisting.unit_type?.toLowerCase()}</span>}
                    {selectedExisting.concentration_value&&<span className="bg-purple-100 rounded px-2 py-0.5 text-purple-700">{selectedExisting.concentration_value}{selectedExisting.concentration_unit}</span>}
                    {selectedExisting.unit_cost>0&&<span className="bg-green-100 rounded px-2 py-0.5 text-green-700 font-semibold">₱{Number(selectedExisting.unit_cost).toLocaleString()}/{selectedExisting.unit_type?.toLowerCase()}</span>}
                  </div>
                </div>
              )}
            </div>
          )}

          {productMode==='new'&&(
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-800 mb-4 flex items-center gap-2"><Plus className="w-3.5 h-3.5"/>New Product — will be added to catalogue then ordered</p>
              <ItemDetailFields form={newProdForm} setField={setNewField} suppliers={suppliers} programs={programs} onNewSupplier={onNewSupplier} showQty={false}/>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity to Order ({activeUnitType==='Other'?'units':activeUnitType.toLowerCase()+'s'}) *</label>
              <input type="number" min={1} value={qty} onChange={e=>setQty(parseInt(e.target.value)||1)} className="w-full border-2 border-[#2B5EA6] rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#2B5EA6]/30 outline-none font-bold text-gray-900"/>
            </div>
            {qty>0&&(
              <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-4 border border-teal-200">
                <p className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-3">📊 Computed Dosage</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase">Containers</p>
                    <p className="text-2xl font-black text-gray-900">{qty.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400">{unitLabel}</p>
                  </div>
                  {(isContainer||isBox)&&(
                    <div className="bg-white rounded-lg p-3 border border-teal-200 text-center">
                      <p className="text-[10px] text-teal-600 font-semibold uppercase">Total {isBox?'Tablets':'Doses'}</p>
                      <p className="text-2xl font-black text-teal-700">{totalDoses.toLocaleString()}</p>
                      <p className="text-[10px] text-teal-500">{activeDoseType==='multi'?`${activeDPC}×/unit`:'1/unit'}</p>
                    </div>
                  )}
                  {concentrationStr&&(
                    <div className="bg-white rounded-lg p-3 border border-purple-100 text-center">
                      <p className="text-[10px] text-purple-500 font-semibold uppercase">Strength</p>
                      <p className="text-base font-black text-purple-700">{concentrationStr}</p>
                    </div>
                  )}
                  {activeUnitCost>0&&(
                    <div className="bg-white rounded-lg p-3 border border-green-100 text-center">
                      <p className="text-[10px] text-green-600 font-semibold uppercase">Total Cost</p>
                      <p className="text-xl font-black text-green-700">₱{totalCost.toLocaleString('en-PH',{maximumFractionDigits:0})}</p>
                      <p className="text-[10px] text-gray-400">₱{activeUnitCost.toLocaleString()} / {activeUnitType.toLowerCase()}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {productMode==='existing'&&(
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-2">Supplier *
                {supplierAutoDetected&&supplierId&&<span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">✨ Auto-detected</span>}
              </label>
              {supplierAutoDetected&&supplierId&&suppliers.find((s:any)=>s.id===supplierId)?(
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-3 bg-teal-50 border-2 border-teal-300 rounded-lg px-3 py-2.5">
                    <Building2 className="w-4 h-4 text-teal-600"/>
                    <div><p className="text-sm font-bold text-teal-800">{suppliers.find((s:any)=>s.id===supplierId)?.name}</p><p className="text-[10px] text-teal-500">Default supplier</p></div>
                  </div>
                  <button type="button" onClick={()=>setSupplierAutoDetected(false)} className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Change</button>
                </div>
              ):(
                <SupplierSelector supplierId={supplierId} suppliers={suppliers} onSelect={v=>{setSupplierId(v);setSupplierAutoDetected(false);}} onNewSupplier={onNewSupplier}/>
              )}
            </div>
          )}

          {productMode==='existing'&&(
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-xs font-bold text-blue-700 mb-3">💰 Budget Deduction</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Budget Program</label>
                  <select value={programId} onChange={e=>{setProgramId(e.target.value);setLineItemId('');}} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white">
                    <option value="">— Not linked —</option>{programs.map(p=><option key={p.id} value={p.id}>{p.name} (FY{p.fiscal_year})</option>)}</select></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Line Item</label>
                  <select value={lineItemId} onChange={e=>setLineItemId(e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-sm outline-none bg-white ${!programId?'border-gray-100 text-gray-400':lineItems.length?'border-gray-200':'border-yellow-200 text-yellow-700'}`} disabled={!programId||!lineItems.length}>
                    <option value="">{!programId?'— Select a program first —':lineItems.length===0?'— No line items —':'— Select Line Item —'}</option>
                    {lineItems.map((li:any)=><option key={li.id} value={li.id}>{li.name} {li.allotment?`(₱${Number(li.allotment).toLocaleString()})`:''}</option>)}</select></div>
              </div>
            </div>
          )}

          <BudgetCheck programs={programs} programId={productMode==='existing'?programId:newProdForm.programId} lineItemId={productMode==='existing'?lineItemId:newProdForm.lineItemId} orderCost={totalCost}/>

          <div><label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
            <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any notes for this order..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 justify-end rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} className="px-6 py-2 bg-[#2B5EA6] text-white rounded-xl text-sm font-semibold hover:bg-[#2B5EA6]/90 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4"/>Place Order</button>
        </div>
      </div>
    </div>
  );
}

// ── Receive Order Modal ───────────────────────────────────────────────────────
function ReceiveOrderModal({ order, medicines, supplies, officeSupplies, onClose, onReceive }:{
  order:any; medicines:any[]; supplies:any[]; officeSupplies:any[];
  onClose:()=>void; onReceive:(orderId:string,data:any)=>void;
}) {
  const [barcode,setBarcode]=useState('');
  const [scanResult,setScanResult]=useState<any>(null);
  const [scanLoading,setScanLoading]=useState(false);
  const [form,setForm]=useState({quantity:order.quantity,unitCost:parseFloat(order.unit_cost)||0,lotNumber:'',expiryDate:'',receivedBy:'',barcode:'',matchItemId:''});
  const set=(k:string,v:any)=>setForm(f=>({...f,[k]:v}));
  const isPerishable=order.item_type==='medicine';
  const isOffice=order.item_type==='office';
  const unitType=order.unit_type||'Vial';
  const dpc=order.doses_per_container||1;
  const doseType=order.dose_type||'single';
  const {isContainer,isBox,totalDoses,unitLabel}=computeDosage(unitType,doseType,dpc,form.quantity);
  const totalCost=form.unitCost*form.quantity;
  const concentrationStr=order.concentration_value?`${order.concentration_value} ${order.concentration_unit||''}`:'';
  const handleBarcodeScan=async()=>{
    if(!barcode.trim())return; setScanLoading(true);
    try{const res=await api.barcodeInventoryLookup(barcode.trim());setScanResult(res);set('barcode',barcode.trim());
      if(res.found){set('matchItemId',res.item.id);toast.success(`Found: ${res.item.name}`);}else{set('matchItemId','');toast.info('New item — will create entry');}}
    catch{toast.error('Barcode lookup failed');}finally{setScanLoading(false);}
  };
  return(
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><CheckSquare className="w-5 h-5 text-green-600"/>Receive Order</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="font-bold text-gray-900">{order.item_name}</p>
            <p className="text-sm text-gray-500 mt-1">Ordered: {order.quantity} {order.unit} · {order.supplier_name||'No supplier'}</p>
            {order.unit_type&&(<div className="flex flex-wrap gap-2 mt-2">
              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold">{order.unit_type}</span>
              {order.dose_type==='multi'&&<span className="text-[10px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded font-semibold">{order.doses_per_container} doses/{order.unit_type?.toLowerCase()}</span>}
              {concentrationStr&&<span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-semibold">{concentrationStr}</span>}
            </div>)}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Scan / Enter Barcode</label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-lg px-3">
                <Barcode className="w-4 h-4 text-gray-400 flex-shrink-0"/>
                <input value={barcode} onChange={e=>setBarcode(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleBarcodeScan()} placeholder="Scan barcode or type and press Enter..." className="flex-1 py-2 text-sm outline-none"/>
              </div>
              <button onClick={handleBarcodeScan} disabled={scanLoading} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-700 disabled:opacity-50">{scanLoading?'...':'Lookup'}</button>
            </div>
            {scanResult&&(<div className={`mt-2 px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${scanResult.found?'bg-green-50 text-green-700':'bg-blue-50 text-blue-700'}`}>
              {scanResult.found?<CheckCircle className="w-4 h-4"/>:<Plus className="w-4 h-4"/>}
              {scanResult.found?`Match: ${scanResult.item.name} (${scanResult.item.quantity} in stock)`:'New item — will create new inventory entry'}
            </div>)}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Actual Qty Received ({unitType==='Other'?'units':unitType.toLowerCase()+'s'}) *</label>
              <input type="number" value={form.quantity} onChange={e=>set('quantity',parseInt(e.target.value)||1)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none font-bold"/></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Actual Unit Cost (₱)</label>
              <input type="number" step="0.01" value={form.unitCost} onChange={e=>set('unitCost',parseFloat(e.target.value)||0)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
          </div>
          {form.quantity>0&&(isContainer||isBox)&&(
            <div className="bg-teal-50 rounded-xl p-3 border border-teal-100 flex items-center gap-6">
              <div className="text-center">
                <p className="text-[10px] text-teal-600 font-semibold uppercase">{isBox?'Total Tablets':'Total Doses'}</p>
                <p className="text-2xl font-black text-teal-700">{totalDoses.toLocaleString()}</p>
                <p className="text-[10px] text-teal-500">{dpc>1?`${dpc}×/unit`:'1/unit'}</p>
              </div>
              {form.unitCost>0&&(
                <div className="text-center border-l border-teal-200 pl-6">
                  <p className="text-[10px] text-green-600 font-semibold uppercase">Total Cost</p>
                  <p className="text-2xl font-black text-green-700">₱{totalCost.toLocaleString('en-PH',{maximumFractionDigits:0})}</p>
                  <p className="text-[10px] text-gray-400">Budget deducted on receive</p>
                </div>
              )}
            </div>
          )}
          {isPerishable&&(<div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Lot Number</label>
              <input value={form.lotNumber} onChange={e=>set('lotNumber',e.target.value)} placeholder="Lot / Batch #" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Expiry Date *</label>
              <input type="date" value={form.expiryDate} onChange={e=>set('expiryDate',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
          </div>)}
          {isOffice&&(<div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-700 font-semibold flex items-center gap-2"><CheckCircle className="w-4 h-4"/>Office supply — no lot number or expiry required</div>)}
          <div><label className="block text-xs font-semibold text-gray-600 mb-1">Received By *</label>
            <input value={form.receivedBy} onChange={e=>set('receivedBy',e.target.value)} placeholder="Name of person receiving this order" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
          {form.unitCost>0&&!isContainer&&!isBox&&(
            <div className="bg-green-50 rounded-xl px-4 py-3 border border-green-100">
              <div className="flex items-center justify-between"><span className="text-sm text-green-700 font-semibold">Total Cost</span><span className="text-lg font-black text-green-800">₱{totalCost.toLocaleString('en-PH',{maximumFractionDigits:2})}</span></div>
              {order.line_item_id&&<p className="text-xs text-green-600">Will be deducted from linked budget line item</p>}
            </div>
          )}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 justify-end rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={()=>{if(!form.receivedBy.trim()){toast.error('Please enter who received this order');return;}if(isPerishable&&!form.expiryDate){toast.error('Expiry date is required for medicines');return;}onReceive(order.id,form);}}
            className="px-6 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 flex items-center gap-2">
            <CheckSquare className="w-4 h-4"/>Confirm Receipt</button>
        </div>
      </div>
    </div>
  );
}

// ── Add Old Stocks Modal (Admin only — direct inventory migration) ─────────────
function AddOldStocksModal({ medicines, supplies, officeSupplies, suppliers, programs, onClose, onSave, onNewSupplier }:{
  medicines:any[]; supplies:any[]; officeSupplies:any[]; suppliers:any[]; programs:any[];
  onClose:()=>void; onSave:(d:any)=>void; onNewSupplier:(data:any)=>Promise<string|void>;
}) {
  const [productMode,setProductMode]=useState<'existing'|'new'>('existing');
  const [selectedExisting,setSelectedExisting]=useState<any>(null);
  const [qty,setQty]=useState(1);
  const [notes,setNotes]=useState('');
  const [programId,setProgramId]=useState('');
  const [lineItemId,setLineItemId]=useState('');
  const [supplierId,setSupplierId]=useState('');
  const [receivedBy,setReceivedBy]=useState('');
  const [dateReceived,setDateReceived]=useState('');
  const [expiryDate,setExpiryDate]=useState('');
  const [lotNumber,setLotNumber]=useState('');
  const [newProdForm,setNewProdForm]=useState(blankItemForm());
  const setNewField=(k:string,v:any)=>setNewProdForm(f=>({...f,[k]:v}));
  const [nameQuery,setNameQuery]=useState('');
  const [showDropdown,setShowDropdown]=useState(false);
  const allItems=[...medicines.map(m=>({...m,_type:'medicine'})),...supplies.map(s=>({...s,_type:'supply'})),...officeSupplies.map(o=>({...o,_type:'office'}))];
  const suggestions=nameQuery.length>1?allItems.filter(i=>i.name.toLowerCase().includes(nameQuery.toLowerCase())).slice(0,8):[];
  const lineItems=programs.find(p=>p.id===programId)?.line_items||[];
  const activeUnitType=productMode==='existing'?(selectedExisting?.unit_type||'Vial'):newProdForm.unitType;
  const activeDoseType=productMode==='existing'?(selectedExisting?.dose_type||'single'):newProdForm.doseType;
  const activeDPC=productMode==='existing'?(selectedExisting?.doses_per_container||1):newProdForm.dosesPerContainer;
  const activeUnitCost=productMode==='existing'?(parseFloat(selectedExisting?.unit_cost)||0):(newProdForm.unitCost||0);
  const {isContainer,isBox,totalDoses,unitLabel}=computeDosage(activeUnitType,activeDoseType,activeDPC,qty);
  const totalCost=activeUnitCost*qty;
  const handleSave=()=>{
    if(qty<1){toast.error('Quantity must be at least 1');return;}
    if(!receivedBy.trim()){toast.error('Recorded by is required');return;}
    if(productMode==='existing'){
      if(!selectedExisting){toast.error('Select an existing product');return;}
      onSave({itemName:selectedExisting.name,itemType:selectedExisting._type,existingItemId:selectedExisting.id,unit:unitLabel,unitCost:activeUnitCost,quantity:qty,supplierId,programId,lineItemId,notes,receivedBy,dateReceived,expiryDate,lotNumber,totalDoses,source:'old_stocks'});
    }else{
      if(!newProdForm.name.trim()){toast.error('Product name required');return;}
      onSave({itemName:newProdForm.name,itemType:'medicine',newProductDetails:newProdForm,unit:unitLabel,unitCost:newProdForm.unitCost,quantity:qty,supplierId:newProdForm.supplierId||supplierId,programId:newProdForm.programId||programId,lineItemId:newProdForm.lineItemId||lineItemId,notes,receivedBy,dateReceived,expiryDate,lotNumber,totalDoses,source:'old_stocks'});
    }
  };
  return(
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Archive className="w-5 h-5 text-orange-500"/>Add Old Stocks
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">Admin Migration</span>
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5"/></button>
        </div>
        <div className="mx-6 mt-4 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <Archive className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5"/>
          <div><p className="text-xs font-bold text-orange-800">Manual-to-Digital Migration</p>
            <p className="text-xs text-orange-700 mt-0.5">Existing physical stocks not yet recorded digitally. These are <strong>directly added</strong> to inventory — no order process needed.</p></div>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Product</label>
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
              {[{v:'existing',l:'Existing Product'},{v:'new',l:'New Product'}].map(m=>(
                <button key={m.v} onClick={()=>{setProductMode(m.v as any);setSelectedExisting(null);setNameQuery('');}}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${productMode===m.v?'bg-white text-orange-600 shadow':'text-gray-500 hover:text-gray-700'}`}>{m.l}</button>
              ))}
            </div>
          </div>

          {productMode==='existing'&&(
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Search Product *</label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 focus-within:ring-2 focus-within:ring-orange-400/30">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0"/>
                <input value={nameQuery} onFocus={()=>setShowDropdown(true)} onChange={e=>{setNameQuery(e.target.value);setSelectedExisting(null);setShowDropdown(true);}} placeholder="Type to search..." className="flex-1 py-2.5 text-sm outline-none"/>
              </div>
              {showDropdown&&suggestions.length>0&&(
                <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl mt-1 overflow-hidden">
                  {suggestions.map(item=>(
                    <button key={item.id} onMouseDown={()=>{setSelectedExisting(item);setNameQuery(item.name);setShowDropdown(false);if(item.supplier_id)setSupplierId(item.supplier_id);}}
                      className="w-full text-left px-4 py-3 hover:bg-orange-50 flex items-center gap-3 border-b border-gray-50 last:border-b-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${item._type==='medicine'?'bg-blue-100 text-blue-700':item._type==='supply'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>{item._type}</span>
                      <div><p className="text-sm font-semibold text-gray-900">{item.name}</p>{item.generic_name&&<p className="text-xs text-gray-400">{item.generic_name}</p>}</div>
                      <div className="ml-auto text-right shrink-0 text-xs text-gray-400"><p>{item.quantity} in stock</p>{item.unit_type&&<span className="text-blue-400">{item.unit_type}</span>}</div>
                    </button>
                  ))}
                </div>
              )}
              {selectedExisting&&(
                <div className="mt-3 bg-orange-50 rounded-xl p-3 border border-orange-200 flex items-center justify-between">
                  <div><p className="font-bold text-orange-900">{selectedExisting.name}</p>
                    <div className="flex gap-2 mt-1">
                      {selectedExisting.unit_type&&<span className="text-[10px] bg-white border border-orange-200 rounded px-2 py-0.5 text-orange-700 font-semibold">{selectedExisting.unit_type}</span>}
                      {selectedExisting.concentration_value&&<span className="text-[10px] bg-purple-100 rounded px-2 py-0.5 text-purple-700">{selectedExisting.concentration_value}{selectedExisting.concentration_unit}</span>}
                      {selectedExisting.unit_cost>0&&<span className="text-[10px] bg-green-100 rounded px-2 py-0.5 text-green-700 font-semibold">₱{Number(selectedExisting.unit_cost).toLocaleString()}/{selectedExisting.unit_type?.toLowerCase()}</span>}
                    </div>
                  </div>
                  <button onClick={()=>{setSelectedExisting(null);setNameQuery('');}} className="p-1 hover:bg-orange-100 rounded-lg"><X className="w-3.5 h-3.5 text-orange-400"/></button>
                </div>
              )}
            </div>
          )}

          {productMode==='new'&&(
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <p className="text-xs font-bold text-orange-800 mb-4">New Product — added to catalogue and stock immediately</p>
              <ItemDetailFields form={newProdForm} setField={setNewField} suppliers={suppliers} programs={programs} onNewSupplier={onNewSupplier} showQty={false}/>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity ({activeUnitType==='Other'?'units':activeUnitType.toLowerCase()+'s'}) *</label>
            <input type="number" min={1} value={qty} onChange={e=>setQty(parseInt(e.target.value)||1)} className="w-full border-2 border-orange-400 rounded-lg px-3 py-2.5 text-sm outline-none font-bold"/>
          </div>

          {qty>0&&(
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200">
              <p className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-3">📊 Stock Being Added Directly</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">Containers</p>
                  <p className="text-2xl font-black text-gray-900">{qty.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400">{unitLabel}</p>
                </div>
                {(isContainer||isBox)&&(<div className="bg-white rounded-lg p-3 border border-teal-200 text-center">
                  <p className="text-[10px] text-teal-600 font-semibold uppercase">Total {isBox?'Tablets':'Doses'}</p>
                  <p className="text-2xl font-black text-teal-700">{totalDoses.toLocaleString()}</p>
                  <p className="text-[10px] text-teal-500">{activeDPC>1?`${activeDPC}×/unit`:'1/unit'}</p>
                </div>)}
                {activeUnitCost>0&&(<div className="bg-white rounded-lg p-3 border border-green-100 text-center">
                  <p className="text-[10px] text-green-600 font-semibold uppercase">Est. Value</p>
                  <p className="text-xl font-black text-green-700">₱{totalCost.toLocaleString('en-PH',{maximumFractionDigits:0})}</p>
                </div>)}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Lot / Batch Number</label>
              <input value={lotNumber} onChange={e=>setLotNumber(e.target.value)} placeholder="Lot #" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Expiry Date</label>
              <input type="date" value={expiryDate} onChange={e=>setExpiryDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Date Received (if known)</label>
              <input type="date" value={dateReceived} onChange={e=>setDateReceived(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Recorded By *</label>
              <input value={receivedBy} onChange={e=>setReceivedBy(e.target.value)} placeholder="Name of admin recording" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
          </div>

          {productMode==='existing'&&(<div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Supplier (if known)</label>
            <SupplierSelector supplierId={supplierId} suppliers={suppliers} onSelect={setSupplierId} onNewSupplier={onNewSupplier}/>
          </div>)}

          {productMode==='existing'&&(
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-xs font-bold text-blue-700 mb-3">💰 Budget Program (optional — record-keeping)</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Program</label>
                  <select value={programId} onChange={e=>{setProgramId(e.target.value);setLineItemId('');}} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white">
                    <option value="">— Not linked —</option>{programs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Line Item</label>
                  <select value={lineItemId} onChange={e=>setLineItemId(e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-sm outline-none bg-white ${!programId?'border-gray-100 text-gray-400':lineItems.length?'border-gray-200':'border-yellow-200 text-yellow-700'}`} disabled={!programId||!lineItems.length}>
                    <option value="">{!programId?'— Select program first —':lineItems.length===0?'— No line items —':'— Select Line Item —'}</option>
                    {lineItems.map((li:any)=><option key={li.id} value={li.id}>{li.name}</option>)}</select></div>
              </div>
            </div>
          )}

          <div><label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
            <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="e.g. From previous physical count, January 2024 stocks..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 justify-end rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} className="px-6 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 flex items-center gap-2">
            <Archive className="w-4 h-4"/>Add to Inventory Directly</button>
        </div>
      </div>
    </div>
  );
}

// ── Dispatch Modal ────────────────────────────────────────────────────────────
function DispatchModal({ medicines, supplies, officeSupplies, currentUser, onClose, onSave }:{
  medicines:any[]; supplies:any[]; officeSupplies:any[];
  currentUser?:{ id?:string; username?:string; name?:string; role?:UserRole; barangay?:string; };
  onClose:()=>void; onSave:(d:any)=>void;
}) {
  const isAdmin=['admin','superadmin'].includes(currentUser?.role||'');
  const userBarangay=currentUser?.barangay||'';
  const [barangays,setBarangays]=useState<string[]>(CALACA_BARANGAYS_FALLBACK);
  const [allUsers,setAllUsers]=useState<any[]>([]);
  const [userPets,setUserPets]=useState<any[]>([]);
  const [userLivestock,setUserLivestock]=useState<any[]>([]);
  const [recipientSearch,setRecipientSearch]=useState('');
  const [showRecipientDropdown,setShowRecipientDropdown]=useState(false);
  const [searchQuery,setSearchQuery]=useState('');
  const [searchResults,setSearchResults]=useState<any[]>([]);
  const [showSearchDrop,setShowSearchDrop]=useState(false);
  const [notFound,setNotFound]=useState(false);
  const searchInputRef=useRef<HTMLInputElement>(null);
  const [itemType,setItemType]=useState<'medicine'|'supply'|'office'|null>(null);
  const [form,setForm]=useState({itemId:'',itemName:'',genericName:'',lotNumber:'',unit:'',stockQty:0,quantity:1,toName:'',toUserId:'',purpose:'',animalId:'',animalLabel:'',barangay:isAdmin?'':userBarangay,notes:''});
  const set=(k:string,v:any)=>setForm(f=>({...f,[k]:v}));
  const allItems=[...medicines.map(m=>({...m,_type:'medicine'})),...supplies.map(s=>({...s,_type:'supply'})),...officeSupplies.map(o=>({...o,_type:'office'}))];
  useEffect(()=>{
    fetchCalacaBarangays().then(setBarangays).catch(()=>{});
    api.getUsers().then((res:any)=>setAllUsers(res.users||[])).catch(()=>{});
    searchInputRef.current?.focus();
  },[]);
  useEffect(()=>{
    const q=searchQuery.trim().toLowerCase();
    if(!q){setSearchResults([]);setShowSearchDrop(false);setNotFound(false);return;}
    const hits=allItems.filter(i=>i.name?.toLowerCase().includes(q)||i.barcode?.toLowerCase().includes(q)||i.lot_number?.toLowerCase().includes(q)||i.generic_name?.toLowerCase().includes(q)).slice(0,10);
    setSearchResults(hits);setShowSearchDrop(hits.length>0);setNotFound(hits.length===0);
  },[searchQuery,medicines,supplies,officeSupplies]);
  const selectItem=(item:any)=>{
    setItemType(item._type);setSearchQuery(item.name);setShowSearchDrop(false);setNotFound(false);
    setForm(f=>({...f,itemId:item.id,itemName:item.name,genericName:item.generic_name||'',lotNumber:item.lot_number||'',unit:item.unit||'',stockQty:item.quantity||0,quantity:1}));
  };
  const clearItem=()=>{setItemType(null);setSearchQuery('');setSearchResults([]);setShowSearchDrop(false);setNotFound(false);setForm(f=>({...f,itemId:'',itemName:'',genericName:'',lotNumber:'',unit:'',stockQty:0,quantity:1}));setTimeout(()=>searchInputRef.current?.focus(),50);};
  const handleRecipientSelect=async(u:any)=>{
    set('toName',u.name||u.username);set('toUserId',u.id);set('barangay',u.barangay||(isAdmin?form.barangay:userBarangay));set('animalId','');set('animalLabel','');
    setRecipientSearch(u.name||u.username);setShowRecipientDropdown(false);
    try{const[petsRes,lsRes]=await Promise.all([api.getPets(u.id).catch(()=>({pets:[]})),api.getLivestock({ownerId:u.id}).catch(()=>({livestock:[]}))]);setUserPets((petsRes as any).pets||[]);setUserLivestock((lsRes as any).livestock||[]);}catch{setUserPets([]);setUserLivestock([]);}
  };
  const selectedUser=allUsers.find((u:any)=>u.id===form.toUserId);
  const recipientRole:string=selectedUser?.role||'';
  let animalOptions:{id:string;label:string}[]=[];
  if(recipientRole==='petOwner')animalOptions=userPets.map((p:any)=>({id:p.id,label:`🐾 ${p.name} (${p.species}${p.breed?', '+p.breed:''})`}));
  else if(recipientRole==='livestockManager')animalOptions=userLivestock.map((l:any)=>({id:l.id,label:`🐄 ${l.tag_id||l.id} — ${l.species||'Livestock'} (${l.name||''})`}));
  else if(recipientRole==='both')animalOptions=[...userPets.map((p:any)=>({id:'pet-'+p.id,label:`🐾 ${p.name} (${p.species})`})),...userLivestock.map((l:any)=>({id:'ls-'+l.id,label:`🐄 ${l.tag_id||l.id} — ${l.species||'Livestock'}`}))];
  const isMedicine=itemType==='medicine';
  const isOffice=itemType==='office';
  const showAnimalSelect=isMedicine&&(animalOptions.length>0||['petOwner','livestockManager','both'].includes(recipientRole));
  const filteredUsers=recipientSearch.length>=1?allUsers.filter((u:any)=>(u.name||u.username||'').toLowerCase().includes(recipientSearch.toLowerCase())||(u.email||'').toLowerCase().includes(recipientSearch.toLowerCase())).slice(0,8):[];
  const typeColor=!itemType?'#6b7280':itemType==='medicine'?'#2B5EA6':itemType==='supply'?'#60A85C':'#f59e0b';
  const typeLabel=!itemType?'Item':itemType==='medicine'?'Medicine':itemType==='supply'?'Supply':'Office Supply';
  const typeBadgeCls=!itemType?'bg-gray-100 text-gray-500':itemType==='medicine'?'bg-blue-100 text-blue-700':itemType==='supply'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700';
  const canSubmit=!!form.itemId&&form.toName.trim()!==''&&form.purpose.trim()!==''&&form.quantity>=1&&(!isMedicine||form.barangay!=='');
  return(
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 px-6 py-4 flex items-center justify-between rounded-t-2xl" style={{background:`linear-gradient(to right, ${typeColor}, ${typeColor}cc)`}}>
          <h2 className="text-base font-bold text-white flex items-center gap-2"><SendHorizonal className="w-5 h-5"/>Dispatch / Release{itemType&&<span className="text-xs px-2 py-0.5 rounded-full font-bold bg-white/20">{typeLabel}</span>}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg"><X className="w-4 h-4 text-white"/></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 flex items-center gap-1.5"><Barcode className="w-3.5 h-3.5"/>Search Item / Scan Barcode</label>
            {form.itemId?(
              <div className="flex items-center gap-3 rounded-xl border-2 px-4 py-3" style={{borderColor:typeColor,backgroundColor:typeColor+'0d'}}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${typeBadgeCls}`}>{typeLabel}</span>
                    <p className="font-bold text-gray-900 text-sm">{form.itemName}</p>
                  </div>
                  {form.genericName&&<p className="text-xs text-gray-500 mt-0.5">{form.genericName}</p>}
                  <p className="text-xs font-semibold mt-1" style={{color:typeColor}}>{form.stockQty} {form.unit} in stock</p>
                </div>
                <button onClick={clearItem} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><X className="w-4 h-4"/></button>
              </div>
            ):(
              <div className="relative">
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 focus-within:ring-2 focus-within:ring-[#2B5EA6]/30 bg-white">
                  <Search className="w-4 h-4 text-gray-400 flex-shrink-0"/>
                  <input ref={searchInputRef} value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onFocus={()=>searchQuery&&setShowSearchDrop(searchResults.length>0)} onBlur={()=>setTimeout(()=>setShowSearchDrop(false),150)} placeholder="Type name, barcode, lot number..." className="flex-1 py-2.5 text-sm outline-none bg-transparent"/>
                  {searchQuery&&<button onClick={()=>{setSearchQuery('');setSearchResults([]);setShowSearchDrop(false);setNotFound(false);}} className="text-gray-300 hover:text-gray-500"><X className="w-3.5 h-3.5"/></button>}
                </div>
                {showSearchDrop&&(
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                    {searchResults.map(item=>(
                      <button key={item.id+item._type} onMouseDown={()=>selectItem(item)} className="w-full px-4 py-3 hover:bg-gray-50 text-left flex items-center gap-3 border-b border-gray-50 last:border-b-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${item._type==='medicine'?'bg-blue-100 text-blue-700':item._type==='supply'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>{item._type==='medicine'?'Med':item._type==='supply'?'Supply':'Office'}</span>
                        <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p><p className="text-xs text-gray-400 truncate">{item.category}{item.lot_number&&` · Lot: ${item.lot_number}`}</p></div>
                        <div className="text-right flex-shrink-0"><p className="text-xs font-bold" style={{color:item._type==='medicine'?'#2B5EA6':item._type==='supply'?'#60A85C':'#f59e0b'}}>{item.quantity} {item.unit}</p><p className="text-xs text-gray-400">in stock</p></div>
                      </button>
                    ))}
                  </div>
                )}
                {notFound&&searchQuery&&<p className="mt-2 text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5"/>No item found matching "{searchQuery}"</p>}
              </div>
            )}
          </div>
          {form.itemId&&(<>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Quantity to Dispatch *{form.stockQty>0&&<span className="ml-2 text-gray-400 font-normal">({form.stockQty} {form.unit} available)</span>}</label>
              <input type="number" min={1} max={form.stockQty||undefined} value={form.quantity} onChange={e=>set('quantity',parseInt(e.target.value)||1)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/>
              {form.quantity>form.stockQty&&form.stockQty>0&&<p className="mt-1 text-xs text-red-500">⚠ Exceeds available stock ({form.stockQty})</p>}
            </div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">TO: Recipient *</label>
              <div className="relative">
                <input value={recipientSearch} onChange={e=>{setRecipientSearch(e.target.value);set('toName',e.target.value);set('toUserId','');setShowRecipientDropdown(true);setUserPets([]);setUserLivestock([]);}} onFocus={()=>setShowRecipientDropdown(true)} onBlur={()=>setTimeout(()=>setShowRecipientDropdown(false),150)} placeholder="Type name or search registered users..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/>
                {showRecipientDropdown&&filteredUsers.length>0&&(
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {filteredUsers.map((u:any)=>(
                      <button key={u.id} onMouseDown={()=>handleRecipientSelect(u)} className="w-full px-3 py-2.5 hover:bg-gray-50 text-left flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{backgroundColor:typeColor}}>{(u.name||u.username||'?')[0].toUpperCase()}</div>
                        <div><p className="text-sm font-semibold text-gray-900">{u.name||u.username}</p><p className="text-xs text-gray-400">{u.role}{u.barangay?` · ${u.barangay}`:''}</p></div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {form.toUserId&&<p className="mt-1 text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3"/>Linked to registered user</p>}
            </div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Purpose *</label>
              {showAnimalSelect?(
                <div className="space-y-2">
                  <input value={form.purpose} onChange={e=>set('purpose',e.target.value)} placeholder="e.g. Rabies vaccination, deworming..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/>
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1"><PawPrint className="w-3 h-3"/>For Animal (optional)</label>
                    {animalOptions.length>0?(
                      <select value={form.animalId} onChange={e=>{const opt=animalOptions.find(a=>a.id===e.target.value);set('animalId',e.target.value);set('animalLabel',opt?.label||'');}} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                        <option value="">— Select Animal —</option>{animalOptions.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select>
                    ):<p className="text-xs text-gray-400 italic px-1">Loading tagged animals...</p>}
                  </div>
                </div>
              ):(
                <input value={form.purpose} onChange={e=>set('purpose',e.target.value)} placeholder={isOffice?'e.g. Office use, staff request...':'e.g. Routine vaccination, outbreak response...'} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/>
              )}
            </div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" style={{color:typeColor}}/>Barangay {isMedicine?'*':'(optional)'}</label>
              {isAdmin?(
                <select value={form.barangay} onChange={e=>set('barangay',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="">— Select Barangay —</option>{barangays.map(b=><option key={b} value={b}>{b}</option>)}</select>
              ):(
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <MapPin className="w-4 h-4" style={{color:typeColor}}/><span className="text-sm text-gray-700 font-semibold">{form.barangay||'Barangay not set on profile'}</span>
                  <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Auto-filled</span>
                </div>
              )}
            </div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Notes (optional)</label>
              <input value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Additional notes..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
          </>)}
          {!form.itemId&&!searchQuery&&(<div className="text-center py-8 text-gray-400"><Barcode className="w-10 h-10 mx-auto mb-2 opacity-30"/><p className="text-sm font-semibold">Scan a barcode or search above</p></div>)}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-3 justify-end rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={()=>{if(!form.itemId||!itemType)return;onSave({item_id:form.itemId,item_type:itemType,transaction_type:'OUT',quantity:form.quantity,lot_number:form.lotNumber,reference_person:form.toName,to_user_id:form.toUserId||undefined,reason:form.purpose+(form.animalLabel?` [Animal: ${form.animalLabel}]`:''),barangay:form.barangay,notes:form.notes,dispatch_type:'dispatch'});}} disabled={!canSubmit}
            className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${canSubmit?'text-white hover:opacity-90':'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            style={canSubmit?{backgroundColor:typeColor}:{}}><SendHorizonal className="w-4 h-4"/>Dispatch {typeLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Movement Modal ────────────────────────────────────────────────────────────
function MovementModal({ item, itemType, onClose, onSave }:{item:any;itemType:string;onClose:()=>void;onSave:(d:any)=>void;}) {
  const [form,setForm]=useState({item_id:item.id,item_type:itemType,transaction_type:'OUT',quantity:1,reason:'',reference_person:'',notes:''});
  const set=(k:string,v:any)=>setForm(f=>({...f,[k]:v}));
  return(
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Activity className="w-5 h-5 text-[#2B5EA6]"/>Record Movement</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100"><p className="font-bold text-gray-900">{item.name}</p><p className="text-sm text-gray-500">Current stock: {item.quantity} {item.unit}</p></div>
          <div className="flex gap-3">
            {[{v:'IN',l:'Add Stock (IN)',c:'bg-green-600'},{v:'OUT',l:'Dispatch (OUT)',c:'bg-red-500'},{v:'ADJUST',l:'Adjust',c:'bg-gray-600'}].map(t=>(
              <button key={t.v} onClick={()=>set('transaction_type',t.v)} className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${form.transaction_type===t.v?`${t.c} text-white border-transparent`:'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>{t.l}</button>
            ))}
          </div>
          {[{label:'Quantity *',key:'quantity',type:'number'},{label:form.transaction_type==='IN'?'Received By':'Issued To / Used By',key:'reference_person'},{label:'Reason *',key:'reason'},{label:'Notes',key:'notes'}].map(({label,key,type}:any)=>(
            <div key={key}><label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
              <input type={type||'text'} value={(form as any)[key]} onChange={e=>set(key,type==='number'?parseInt(e.target.value)||1:e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"/></div>
          ))}
        </div>
        <div className="border-t border-gray-100 px-6 py-4 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={()=>onSave(form)} className="px-6 py-2 bg-[#2B5EA6] text-white rounded-xl text-sm font-semibold hover:bg-[#2B5EA6]/90">Record</button>
        </div>
      </div>
    </div>
  );
}

// ── Logbook Modal ─────────────────────────────────────────────────────────────
function LogbookModal({ transactions, itemName, onClose }:{transactions:any[];itemName:string;onClose:()=>void;}) {
  return(
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><BookOpen className="w-5 h-5 text-[#2B5EA6]"/>Logbook: {itemName}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 space-y-3">
          {transactions.length===0?(<p className="text-center text-gray-400 py-12">No transactions recorded.</p>):transactions.map(tx=>{
            const isIn=tx.transaction_type==='IN';
            return(
              <div key={tx.id} className={`rounded-xl p-4 border flex items-start gap-4 ${isIn?'bg-green-50 border-green-100':'bg-red-50 border-red-100'}`}>
                <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${isIn?'bg-green-100':'bg-red-100'}`}>
                  {isIn?<LogIn className="w-4 h-4 text-green-600"/>:<LogOut className="w-4 h-4 text-red-600"/>}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isIn?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{tx.transaction_type}</span>
                    <span className="text-sm font-bold text-gray-900">{tx.quantity} {tx.unit||'units'}</span>
                    {tx.previous_qty!=null&&<span className="text-xs text-gray-400">{tx.previous_qty} → {tx.new_qty}</span>}
                    {tx.source==='old_stocks'&&<span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">Migration</span>}
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{tx.reason||'—'}</p>
                  <div className="flex gap-4 mt-1.5 flex-wrap text-xs text-gray-500">
                    {tx.reference_person&&<span>👤 {tx.reference_person}</span>}
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

// ── Batch Detail Modal (grouped items by name) ────────────────────────────────
function BatchDetailModal({ group, suppliers, programs, onClose, onEdit, onDelete, canEdit }: {
  group: any[]; suppliers: any[]; programs: any[]; onClose: () => void;
  onEdit: (item: any) => void; onDelete: (item: any) => void; canEdit: boolean;
}) {
  const rep = group[0];
  const totalQty = group.reduce((s, m) => s + (m.quantity || 0), 0);
  const totalValue = group.reduce((s, m) => s + (m.quantity || 0) * (parseFloat(m.unit_cost) || 0), 0);
  const sup = suppliers.find(s => s.id === rep.supplier_id);
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-gray-900 leading-tight">{rep.name}</h2>
              {rep.generic_name && <p className="text-sm text-gray-400 mt-0.5">{rep.generic_name}</p>}
              <div className="flex flex-wrap gap-2 mt-2">
                {rep.barcode && <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono"><Barcode className="w-3 h-3"/>{rep.barcode}</span>}
                {rep.category && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold">{rep.category}</span>}
                {rep.manufacturer && <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{rep.manufacturer}</span>}
                {rep.storage_condition && <span className="text-xs bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full">🌡 {rep.storage_condition}</span>}
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"><X className="w-5 h-5"/></button>
          </div>
          {sup && <p className="text-xs text-gray-400 mt-2 flex items-center gap-1"><Truck className="w-3 h-3"/>Supplier: <span className="font-semibold text-gray-600">{sup.name}</span></p>}
          <div className="flex gap-4 mt-3 pt-3 border-t border-gray-50">
            <div className="text-center"><p className="text-xs text-gray-400">Batches</p><p className="text-xl font-black text-[#2B5EA6]">{group.length}</p></div>
            <div className="text-center"><p className="text-xs text-gray-400">Total Qty</p><p className="text-xl font-black text-gray-900">{totalQty} <span className="text-xs font-normal text-gray-400">{rep.unit}</span></p></div>
            <div className="text-center"><p className="text-xs text-gray-400">Total Value</p><p className="text-xl font-black text-green-700">₱{totalValue.toLocaleString('en-PH', { maximumFractionDigits: 0 })}</p></div>
          </div>
        </div>
        {/* Supplies list */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-3">Supplies / Batches</p>
          {group.map((m, i) => {
            const days = m.expiry_date ? Math.ceil((new Date(m.expiry_date).getTime() - Date.now()) / 86400000) : null;
            const expired = days !== null && days < 0;
            const nearExp = days !== null && days >= 0 && days <= 90;
            return (
              <div key={m.id} className={`rounded-xl border p-4 transition-colors ${expired ? 'bg-red-50 border-red-200' : nearExp ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-xs font-black text-gray-400">#{i + 1}</span>
                      {m.lot_number ? <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Lot: {m.lot_number}</span> : <span className="text-xs text-gray-300 italic">No lot #</span>}
                      <StatusBadge qty={m.quantity} reorder={m.reorder_level} />
                      {expired && <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">EXPIRED</span>}
                      {nearExp && !expired && <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Exp in {days}d</span>}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <p className="text-gray-400 font-semibold">Purchase Date</p>
                        <p className="text-gray-700 font-bold">{m.created_at ? new Date(m.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-semibold">Expiry Date</p>
                        <p className={`font-bold ${expired ? 'text-red-600' : nearExp ? 'text-orange-600' : 'text-gray-700'}`}>{m.expiry_date ? new Date(m.expiry_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-semibold">Qty</p>
                        <p className="text-gray-900 font-black">{m.quantity} <span className="text-gray-400 font-normal">{m.unit}</span></p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-semibold">Unit Cost</p>
                        <p className="text-gray-700 font-bold">₱{Number(m.unit_cost || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => onEdit(m)} className="p-1.5 hover:bg-white rounded-lg text-gray-500 border border-transparent hover:border-gray-200" title="Edit"><Edit2 className="w-3.5 h-3.5"/></button>
                      <button onClick={() => onDelete(m)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-400 border border-transparent hover:border-red-200" title="Delete"><Trash2 className="w-3.5 h-3.5"/></button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export function InventoryPage({ userRole, currentUser }: Props) {
  const canEdit=['admin','superadmin','cvoStaff'].includes(userRole);
  const isAdmin=['admin','superadmin'].includes(userRole);
  type TabId='overview'|'medicines'|'supplies'|'office'|'orders'|'logbook'|'suppliers';
  const [tab,setTab]=useState<TabId>('overview');
  const [medicines,setMedicines]=useState<any[]>([]);
  const [supplies,setSupplies]=useState<any[]>([]);
  const [officeSupplies,setOfficeSupplies]=useState<any[]>([]);
  const [suppliers,setSuppliers]=useState<any[]>([]);
  const [pendingOrders,setPendingOrders]=useState<any[]>([]);
  const [transactions,setTransactions]=useState<any[]>([]);
  const [programs,setPrograms]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState('');
  const [catFilter,setCatFilter]=useState('All');
  const [programFilter,setProgramFilter]=useState('All');
  const [lineItemFilter,setLineItemFilter]=useState('All');
  const [orderFilter,setOrderFilter]=useState('pending');
  const [barcodeInput,setBarcodeInput]=useState('');
  const [showMedModal,setShowMedModal]=useState(false);
  const [showSupModal,setShowSupModal]=useState(false);
  const [showOfficModal,setShowOfficModal]=useState(false);
  const [showSupplierModal,setShowSupplierModal]=useState(false);
  const [showAddOrderModal,setShowAddOrderModal]=useState(false);
  const [showOldStocksModal,setShowOldStocksModal]=useState(false);
  const [showReceiveModal,setShowReceiveModal]=useState<any>(null);
  const [showMoveModal,setShowMoveModal]=useState<{item:any;type:string}|null>(null);
  const [showLogbook,setShowLogbook]=useState<{item:any;txs:any[]}|null>(null);
  const [showDispatchModal,setShowDispatchModal]=useState(false);
  const [showBatchModal,setShowBatchModal]=useState<any[]|null>(null);
  const [editItem,setEditItem]=useState<any>(null);
  const [addOrderPrefill,setAddOrderPrefill]=useState<any>(null);
  const [error,setError]=useState('');
  const barcodeRef=useRef<HTMLInputElement>(null);

  const loadData=useCallback(async()=>{
    setLoading(true);
    try{
      const [meds,sups,os,supls,orders,txs,bps]=await Promise.all([
        api.getMedicines(),api.getSupplies(),
        api.getOfficeSupplies().catch(()=>({items:[]})),
        api.getSuppliers().catch(()=>({suppliers:[]})),
        api.getPendingOrders().catch(()=>({orders:[]})),
        api.getInventoryTransactions({limit:500}),
        api.getBudgetPrograms(),
      ]);
      setMedicines(meds.medicines||[]);setSupplies(sups.supplies||[]);
      setOfficeSupplies(os.items||[]);setSuppliers(supls.suppliers||[]);
      setPendingOrders(orders.orders||[]);setTransactions(txs.transactions||[]);
      setPrograms(bps.programs||[]);
    }catch(e:any){setError(e.message);}finally{setLoading(false);}
  },[]);

  useEffect(()=>{loadData();},[loadData]);

  useEffect(()=>{
    const stored=sessionStorage.getItem('inventory_order_prefill');
    if(stored){try{const pf=JSON.parse(stored);sessionStorage.removeItem('inventory_order_prefill');setAddOrderPrefill(pf);setShowAddOrderModal(true);setTab('orders');}catch{}}
  },[]);

  const createSupplierInline=async(data:any):Promise<string>=>{
    const res=await api.createSupplier({...data,isActive:true});
    await loadData();
    return (res as any).supplier?.id||(res as any).id||'';
  };

  const handleBarcodeSearch=()=>{
    if(!barcodeInput.trim())return;
    const found=medicines.find(m=>m.barcode===barcodeInput.trim())||supplies.find(s=>s.barcode===barcodeInput.trim())||officeSupplies.find(o=>o.barcode===barcodeInput.trim());
    if(found){setSearch(barcodeInput.trim());}else{setError(`No item found with barcode: ${barcodeInput}`);}
    setBarcodeInput('');
  };

  const saveMedicine=async(form:any)=>{
    try{
      if(editItem)await api.updateMedicine(editItem.id,form);
      else await api.createMedicine({...form,quantity:0});
      setShowMedModal(false);setEditItem(null);await loadData();
      toast.success(editItem?'Medicine updated':'Medicine added to catalogue — add stock via New Order or Add Old Stocks');
    }catch(e:any){setError(e.message);}
  };
  const saveSupply=async(form:any)=>{
    try{
      if(editItem)await api.updateSupply(editItem.id,form);
      else await api.createSupply({...form,quantity:0});
      setShowSupModal(false);setEditItem(null);await loadData();
      toast.success(editItem?'Supply updated':'Supply added to catalogue');
    }catch(e:any){setError(e.message);}
  };
  const saveOfficeSupply=async(form:any)=>{
    try{
      if(editItem)await api.updateOfficeSupply(editItem.id,form);
      else await api.createOfficeSupply({...form,quantity:0});
      setShowOfficModal(false);setEditItem(null);await loadData();
      toast.success(editItem?'Office supply updated':'Office supply added to catalogue');
    }catch(e:any){setError(e.message);}
  };
  const saveSupplier=async(form:any)=>{
    try{
      if(editItem)await api.updateSupplier(editItem.id,form);
      else await api.createSupplier(form);
      setShowSupplierModal(false);setEditItem(null);await loadData();
      toast.success(editItem?'Supplier updated':'Supplier added');
    }catch(e:any){setError(e.message);}
  };
  const saveOrder=async(form:any)=>{
    try{
      if(form.newProductDetails)await api.createMedicine({...form.newProductDetails,quantity:0,supplierId:form.supplierId});
      await api.createPendingOrder(form);
      setShowAddOrderModal(false);setAddOrderPrefill(null);await loadData();setTab('orders');
      toast.success('Order placed — receive it to add to inventory and deduct budget');
    }catch(e:any){setError(e.message);}
  };
  const saveOldStocks=async(form:any)=>{
    try{
      let itemId=form.existingItemId;
      if(form.newProductDetails){
        const res=await api.createMedicine({...form.newProductDetails,quantity:0,supplierId:form.supplierId||form.newProductDetails.supplierId});
        itemId=(res as any).medicine?.id||(res as any).id;
      }
      await api.inventoryMovement({item_id:itemId,item_type:form.itemType||'medicine',transaction_type:'IN',quantity:form.quantity,lot_number:form.lotNumber||'',expiry_date:form.expiryDate||'',unit_cost:form.unitCost||0,reference_person:form.receivedBy,reason:`Old stock migration${form.notes?': '+form.notes:''}`,notes:form.notes||'',program_id:form.programId||'',line_item_id:form.lineItemId||'',supplier_id:form.supplierId||'',source:'old_stocks',total_doses:form.totalDoses});
      setShowOldStocksModal(false);await loadData();
      toast.success(`Old stocks added: ${form.quantity} ${form.unit||'units'} of ${form.itemName} added directly to inventory`);
    }catch(e:any){setError(e.message);}
  };
  const receiveOrder=async(orderId:string,data:any)=>{
    try{await api.receivePendingOrder(orderId,data);setShowReceiveModal(null);await loadData();toast.success('Order received! Inventory updated and budget deducted.');}
    catch(e:any){setError(e.message);}
  };
  const handleMovement=async(data:any)=>{
    try{
      if(!data.quantity||data.quantity<1){toast.error('Enter a valid quantity');return;}
      if(data.transaction_type==='OUT'&&showMoveModal&&data.quantity>showMoveModal.item.quantity){toast.error(`Cannot dispatch ${data.quantity} — only ${showMoveModal.item.quantity} in stock`);return;}
      if(!data.reference_person?.trim()){toast.error('Enter recipient/requestor name');return;}
      if(!data.reason?.trim()){toast.error('Please enter a reason');return;}
      await api.inventoryMovement(data);toast.success('Movement recorded');setShowMoveModal(null);await loadData();
    }catch(e:any){setError(e.message);}
  };
  const handleDispatch=async(data:any)=>{
    try{
      let item:any=null;
      if(data.item_type==='medicine')item=medicines.find(m=>m.id===data.item_id);
      else if(data.item_type==='supply')item=supplies.find(s=>s.id===data.item_id);
      else if(data.item_type==='office')item=officeSupplies.find(o=>o.id===data.item_id);
      if(!item){toast.error('Item not found');return;}
      if(data.quantity<1){toast.error('Enter a valid quantity');return;}
      if(data.quantity>item.quantity){toast.error(`Cannot dispatch ${data.quantity} — only ${item.quantity} in stock`);return;}
      if(!data.reference_person?.trim()){toast.error('Enter recipient name');return;}
      if(!data.reason?.trim()){toast.error('Enter a purpose');return;}
      if(data.item_type==='medicine'&&!data.barangay?.trim()){toast.error('Select a barangay');return;}
      await api.inventoryMovement({...data,source:'dispatch'});
      toast.success(`Dispatched ${data.quantity} unit(s) of ${item.name} to ${data.reference_person}${data.barangay?' ('+data.barangay+')':''}`);
      setShowDispatchModal(false);await loadData();
    }catch(e:any){setError(e.message);}
  };
  const openLogbook=async(item:any,itemType:string)=>{
    try{const res=await api.getInventoryTransactions({item_id:item.id,limit:200});setShowLogbook({item,txs:res.transactions||[]});}
    catch(e:any){setError(e.message);}
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const now=new Date(),in90=new Date(now.getTime()+90*86400000);
  const expired=medicines.filter(m=>m.expiry_date&&new Date(m.expiry_date)<now).length;
  const expiringSoon=medicines.filter(m=>m.expiry_date&&new Date(m.expiry_date)>=now&&new Date(m.expiry_date)<=in90).length;
  const outOfStockMeds=medicines.filter(m=>m.quantity===0).length;
  const lowStockMeds=medicines.filter(m=>m.quantity>0&&m.quantity<=m.reorder_level).length;
  const lowStockSups=supplies.filter(s=>s.quantity>0&&s.quantity<=s.reorder_level).length;
  const lowStockOffice=officeSupplies.filter(o=>o.quantity>0&&o.quantity<=o.reorder_level).length;
  const totalMedValue=medicines.reduce((s,m)=>s+(m.quantity||0)*(parseFloat(m.unit_cost)||0),0);
  const totalSupValue=supplies.reduce((s,m)=>s+(m.quantity||0)*(parseFloat(m.unit_cost)||0),0);
  const totalDosesAvailable=medicines.reduce((s,m)=>s+(m.total_doses||(m.quantity*(m.doses_per_container||1))||0),0);
  const pendingCount=pendingOrders.filter(o=>o.status==='pending').length;
  const medByCat=MEDICINE_CATEGORIES.map(c=>({name:c,value:medicines.filter(m=>m.category===c).reduce((s,m)=>s+m.quantity,0)})).filter(c=>c.value>0);
  const supByCat=SUPPLY_CATEGORIES.map(c=>({name:c,qty:supplies.filter(s=>s.category===c).length})).filter(c=>c.qty>0);
  const dosesByItem=medicines.filter(m=>['Vial','Bottle','Ampoule','Box'].includes(m.unit_type)).map(m=>({name:m.name.length>20?m.name.slice(0,18)+'…':m.name,doses:m.total_doses||m.quantity*(m.doses_per_container||1),unit:m.unit_type==='Box'?'tablets':'doses',qty:m.quantity,unitType:m.unit_type})).sort((a,b)=>b.doses-a.doses).slice(0,8);

  // ── Filters ────────────────────────────────────────────────────────────────
  const filteredMeds=medicines.filter(m=>{const q=search.toLowerCase();return(!q||m.name?.toLowerCase().includes(q)||m.barcode?.includes(q)||m.generic_name?.toLowerCase().includes(q))&&(catFilter==='All'||m.category===catFilter)&&(programFilter==='All'||m.program_id===programFilter)&&(lineItemFilter==='All'||m.line_item_id===lineItemFilter);});
  // Group medicines by name so duplicates (same product, different lots) collapse into one row
  const groupedMeds:(()=>Map<string,any[]>)=()=>{const map=new Map<string,any[]>();filteredMeds.forEach(m=>{const key=m.name?.trim().toLowerCase()||m.id;if(!map.has(key))map.set(key,[]);map.get(key)!.push(m);});return map;};
  const groupedMedsMap=groupedMeds();
  const filteredSups=supplies.filter(s=>{const q=search.toLowerCase();return(!q||s.name?.toLowerCase().includes(q)||s.barcode?.includes(q))&&(catFilter==='All'||s.category===catFilter)&&(programFilter==='All'||s.program_id===programFilter)&&(lineItemFilter==='All'||s.line_item_id===lineItemFilter);});
  const filteredOffice=officeSupplies.filter(o=>{const q=search.toLowerCase();return(!q||o.name?.toLowerCase().includes(q)||o.barcode?.includes(q))&&(catFilter==='All'||o.category===catFilter)&&(programFilter==='All'||o.program_id===programFilter)&&(lineItemFilter==='All'||o.line_item_id===lineItemFilter);});
  const filteredOrders=pendingOrders.filter(o=>(orderFilter==='all'||o.status===orderFilter)&&(!search||o.item_name?.toLowerCase().includes(search.toLowerCase())||o.supplier_name?.toLowerCase().includes(search.toLowerCase())));
  const filteredSuppliers=suppliers.filter(s=>!search||s.name?.toLowerCase().includes(search.toLowerCase())||s.category?.toLowerCase().includes(search.toLowerCase()));

  const tabs=[
    {id:'overview',label:'Overview',icon:BarChart2},
    {id:'medicines',label:`Medicines (${medicines.length})`,icon:FlaskConical},
    {id:'supplies',label:`Supplies (${supplies.length})`,icon:Package},
    {id:'office',label:`Office (${officeSupplies.length})`,icon:Briefcase},
    {id:'orders',label:`Orders${pendingCount>0?` (${pendingCount} pending)`:''}`,icon:ShoppingCart},
    {id:'logbook',label:'Logbook',icon:BookOpen},
    {id:'suppliers',label:`Suppliers (${suppliers.length})`,icon:Building2},
  ];

  return(
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><FlaskConical className="w-7 h-7 text-[#2B5EA6]"/>Inventory Management</h1>
          <p className="text-gray-500 text-sm mt-1">Calaca CVO · Medicines, Supplies, Office & Orders</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 shadow-sm">
            <Barcode className="w-4 h-4 text-gray-400"/>
            <input ref={barcodeRef} value={barcodeInput} onChange={e=>setBarcodeInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleBarcodeSearch()} placeholder="Scan barcode..." className="text-sm py-2 outline-none w-36"/>
            <button onClick={handleBarcodeSearch} className="text-xs text-[#2B5EA6] font-semibold hover:underline">Find</button>
          </div>
          <button onClick={loadData} className="p-2 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50"><RefreshCw className="w-4 h-4 text-gray-500"/></button>
          {canEdit&&(<button onClick={()=>{setAddOrderPrefill(null);setShowAddOrderModal(true);}} className="flex items-center gap-2 bg-[#2B5EA6] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#2B5EA6]/90 shadow"><ShoppingCart className="w-4 h-4"/>New Order</button>)}
          {canEdit&&(<button onClick={()=>setShowDispatchModal(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 shadow"><SendHorizonal className="w-4 h-4"/>Dispatch</button>)}
          {isAdmin&&(<button onClick={()=>setShowOldStocksModal(true)} className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-600 shadow"><Archive className="w-4 h-4"/>Add Old Stocks</button>)}
          {canEdit&&tab==='medicines'&&(<button onClick={()=>{setEditItem(null);setShowMedModal(true);}} className="flex items-center gap-2 bg-[#2B5EA6]/10 text-[#2B5EA6] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#2B5EA6]/20"><Plus className="w-4 h-4"/>Add to Catalogue</button>)}
          {canEdit&&tab==='supplies'&&(<button onClick={()=>{setEditItem(null);setShowSupModal(true);}} className="flex items-center gap-2 bg-[#60A85C]/10 text-[#60A85C] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#60A85C]/20"><Plus className="w-4 h-4"/>Add to Catalogue</button>)}
          {canEdit&&tab==='office'&&(<button onClick={()=>{setEditItem(null);setShowOfficModal(true);}} className="flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-amber-200"><Plus className="w-4 h-4"/>Add to Catalogue</button>)}
          {canEdit&&tab==='suppliers'&&(<button onClick={()=>{setEditItem(null);setShowSupplierModal(true);}} className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-200"><Plus className="w-4 h-4"/>Add Supplier</button>)}
        </div>
      </div>

      {/* Flow info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"/>
        <p className="text-xs text-blue-700">
          <strong>Inventory flow:</strong> Add items to the <em>catalogue</em> first (defines the product, no qty). Stock is only added via
          <span className="mx-1 inline-flex items-center gap-1 bg-[#2B5EA6] text-white px-1.5 py-0.5 rounded text-[10px] font-bold"><ShoppingCart className="w-3 h-3"/>New Order</span> (order → receive → budget deducted)
          {isAdmin&&<><span className="mx-1 inline-flex items-center gap-1 bg-orange-500 text-white px-1.5 py-0.5 rounded text-[10px] font-bold"><Archive className="w-3 h-3"/>Add Old Stocks</span> (admin migration, adds directly)</>}.
        </p>
      </div>

      {error&&(<div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between text-red-700"><span className="text-sm">{error}</span><button onClick={()=>setError('')}><X className="w-4 h-4"/></button></div>)}

      {/* Alerts */}
      {(expiringSoon>0||expired>0||pendingCount>0)&&(
        <div className="flex flex-col gap-2">
          {expired>0&&(<div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 text-red-700"><ShieldAlert className="w-5 h-5 flex-shrink-0"/><span className="text-sm font-semibold">{expired} medicine(s) expired — remove or replace immediately.</span></div>)}
          {expiringSoon>0&&(<div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 text-amber-700"><AlertTriangle className="w-5 h-5 flex-shrink-0"/><span className="text-sm font-semibold">{expiringSoon} item(s) expiring within 90 days.</span></div>)}
          {pendingCount>0&&(<button onClick={()=>setTab('orders')} className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3 text-blue-700 hover:bg-blue-100 text-left"><Truck className="w-5 h-5 flex-shrink-0"/><span className="text-sm font-semibold">{pendingCount} pending order(s) awaiting receipt. <span className="underline">Click to view →</span></span></button>)}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {tabs.map(({id,label,icon:Icon})=>(
            <button key={id} onClick={()=>{setTab(id as TabId);setSearch('');setCatFilter('All');setProgramFilter('All');setLineItemFilter('All');}}
              className={`flex items-center gap-2 px-4 py-4 text-sm font-semibold whitespace-nowrap transition-all ${tab===id?'text-[#2B5EA6] border-b-2 border-[#2B5EA6] bg-blue-50/50':'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
              <Icon className="w-4 h-4"/>{label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab==='overview'&&(
          <div className="p-6 space-y-6">
            {programs.length>0&&(()=>{
              const allLineItems=programs.flatMap((p:any)=>(p.line_items||[]).map((li:any)=>({...li,programName:p.name,programColor:p.color||'#2B5EA6',balance:Number(li.allotment)-Number(li.utilized)-Number(li.obligated)})));
              const restockNeeded=[
                ...medicines.filter(m=>m.quantity<=m.reorder_level).map(m=>({name:m.name,type:'medicine' as const,qty:m.quantity,reorder:m.reorder_level,restockQty:Math.max(m.reorder_level*2-m.quantity,m.reorder_level),unitCost:Number(m.unit_cost)||0,lineItemId:m.line_item_id,programId:m.program_id,supplierId:m.supplier_id||''})),
                ...supplies.filter(s=>s.quantity<=s.reorder_level).map(s=>({name:s.name,type:'supply' as const,qty:s.quantity,reorder:s.reorder_level,restockQty:Math.max(s.reorder_level*2-s.quantity,s.reorder_level),unitCost:Number(s.unit_cost)||0,lineItemId:s.line_item_id,programId:s.program_id,supplierId:s.supplier_id||''})),
              ].map(item=>{const linkedLI=allLineItems.find(li=>li.id===item.lineItemId);const estimatedCost=item.restockQty*item.unitCost;const canAfford=linkedLI?linkedLI.balance>=estimatedCost:null;return{...item,linkedLI,estimatedCost,canAfford};});
              const totalRestockCost=restockNeeded.reduce((s,i)=>s+i.estimatedCost,0);
              const affordableCount=restockNeeded.filter(i=>i.canAfford===true).length;
              const unaffordableCount=restockNeeded.filter(i=>i.canAfford===false).length;
              const navigateToBudget=()=>{sessionStorage.setItem('nasaalaga_nav_request',JSON.stringify({view:'budget'}));window.dispatchEvent(new Event('nasaalaga_nav_request'));};
              return(
                <div className="bg-gradient-to-br from-blue-50 via-white to-green-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2"><div className="p-2 bg-[#2B5EA6]/10 rounded-xl"><DollarSign className="w-5 h-5 text-[#2B5EA6]"/></div>
                      <div><h3 className="font-bold text-gray-900 text-sm">Budget × Inventory Decision Support</h3><p className="text-xs text-gray-500">Restock needs vs. available budget balance</p></div>
                    </div>
                    <button onClick={navigateToBudget} className="flex items-center gap-1.5 text-xs text-[#2B5EA6] font-semibold hover:underline">Open Budget<ArrowRight className="w-3.5 h-3.5"/></button>
                  </div>
                  {restockNeeded.length===0?(
                    <div className="flex items-center gap-3 bg-green-50 rounded-xl px-4 py-3 border border-green-100"><CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0"/><p className="text-sm text-green-700 font-semibold">All inventory items are above reorder levels.</p></div>
                  ):(
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        {[{label:'Items Needing Restock',value:restockNeeded.length,color:'bg-red-50 text-red-700 border-red-100'},{label:'Est. Total Restock Cost',value:`₱${totalRestockCost.toLocaleString('en-PH',{maximumFractionDigits:0})}`,color:'bg-blue-50 text-blue-700 border-blue-100'},{label:'Budget Sufficient',value:`${affordableCount} items`,color:'bg-green-50 text-green-700 border-green-100'},{label:'Shortfall / Unlinked',value:`${unaffordableCount+restockNeeded.filter(i=>i.canAfford===null).length} items`,color:unaffordableCount>0?'bg-red-50 text-red-700 border-red-100':'bg-amber-50 text-amber-700 border-amber-100'}].map(s=>(
                          <div key={s.label} className={`rounded-xl px-3 py-2.5 border text-center ${s.color}`}><p className="text-base font-black">{s.value}</p><p className="text-[10px] font-semibold opacity-80 mt-0.5">{s.label}</p></div>
                        ))}
                      </div>
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {restockNeeded.slice(0,10).map((item,i)=>(
                          <div key={i} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${item.type==='medicine'?'bg-blue-100 text-blue-700':'bg-green-100 text-green-700'}`}>{item.type==='medicine'?'💊':'📦'} {item.type}</span>
                            <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p><p className="text-xs text-gray-400">{item.qty} in stock · Reorder at {item.reorder} · Need ~{item.restockQty}{item.unitCost>0?` · ₱${item.unitCost.toLocaleString()} ea`:''}</p>
                              {item.supplierId&&suppliers.find((s:any)=>s.id===item.supplierId)&&(<p className="text-[10px] text-teal-600 font-semibold mt-0.5 flex items-center gap-1"><Building2 className="w-3 h-3"/>{suppliers.find((s:any)=>s.id===item.supplierId)?.name}</p>)}
                            </div>
                            <div className="text-right flex-shrink-0">
                              {item.estimatedCost>0&&<p className="text-xs font-bold text-gray-800">₱{item.estimatedCost.toLocaleString('en-PH',{maximumFractionDigits:0})}</p>}
                              {item.linkedLI?(<div className={`text-[10px] font-semibold mt-0.5 ${item.canAfford?'text-green-600':'text-red-600'}`}>{item.canAfford?'✅ OK':'❌ Short'}<span className="block text-gray-400 font-normal">{item.linkedLI.programName}</span><span className="block text-gray-400 font-normal">Bal: ₱{item.linkedLI.balance.toLocaleString('en-PH',{maximumFractionDigits:0})}</span></div>):<span className="text-[10px] text-amber-600 font-semibold mt-0.5 block">⚠️ Not linked</span>}
                            </div>
                            <button onClick={()=>{setAddOrderPrefill({itemName:item.name,itemType:item.type,quantity:item.restockQty,unitCost:item.unitCost,programId:item.programId,lineItemId:item.lineItemId,supplierId:item.supplierId});setShowAddOrderModal(true);setTab('orders');}} className="flex-shrink-0 px-3 py-1.5 bg-[#2B5EA6] text-white text-[10px] font-bold rounded-lg hover:bg-[#2B5EA6]/90">Order</button>
                          </div>
                        ))}
                        {restockNeeded.length>10&&<p className="text-xs text-center text-gray-400 py-1">+{restockNeeded.length-10} more items need restocking</p>}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {label:'Medicine Items',value:medicines.length,icon:FlaskConical,color:'#2B5EA6',sub:`₱${totalMedValue.toLocaleString('en-PH',{maximumFractionDigits:0})} value`},
                {label:'Total Doses Available',value:totalDosesAvailable.toLocaleString(),icon:Syringe,color:'#0891b2',sub:'across all vials/bottles/ampoules'},
                {label:'Supply Items',value:supplies.length,icon:Package,color:'#60A85C',sub:`₱${totalSupValue.toLocaleString('en-PH',{maximumFractionDigits:0})} value`},
                {label:'Office Supplies',value:officeSupplies.length,icon:Briefcase,color:'#f59e0b',sub:`${lowStockOffice} low stock`},
                {label:'Pending Orders',value:pendingCount,icon:ShoppingCart,color:'#8b5cf6',sub:`${pendingOrders.filter(o=>o.status==='received').length} received`},
                {label:'Low / Out of Stock',value:lowStockMeds+outOfStockMeds+lowStockSups,icon:AlertTriangle,color:'#ef4444',sub:`${outOfStockMeds} out of stock`},
                {label:'Expiring / Expired',value:expiringSoon+expired,icon:Calendar,color:'#ef4444',sub:`${expired} already expired`},
                {label:'Suppliers',value:suppliers.length,icon:Building2,color:'#6366f1',sub:`${suppliers.filter(s=>s.is_active).length} active`},
              ].map(({label,value,icon:Icon,color,sub})=>(
                <div key={label} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center justify-between mb-3"><span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span><div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{backgroundColor:color+'18'}}><Icon className="w-5 h-5" style={{color}}/></div></div>
                  <p className="text-3xl font-black text-gray-900">{value}</p><p className="text-xs text-gray-500 mt-1">{sub}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FlaskConical className="w-4 h-4 text-[#2B5EA6]"/>Medicines by Category</h3>
                <ResponsiveContainer width="100%" height={200}><BarChart data={medByCat}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/><XAxis dataKey="name" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip/><Bar dataKey="value" name="Total Qty" fill="#2B5EA6" radius={[4,4,0,0]}>{medByCat.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Bar></BarChart></ResponsiveContainer>
              </div>
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Package className="w-4 h-4 text-[#60A85C]"/>Supplies by Category</h3>
                <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={supByCat} dataKey="qty" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({name,percent}:any)=>`${name} ${(percent*100).toFixed(0)}%`}>{supByCat.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer>
              </div>
              {dosesByItem.length>0&&(
                <div className="bg-teal-50/60 rounded-2xl p-5 border border-teal-100 lg:col-span-2">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Syringe className="w-4 h-4 text-teal-600"/>Doses / Tablets Available by Medicine</h3>
                  <div className="space-y-2">
                    {dosesByItem.map((d, i) => {
                      const max = dosesByItem[0]?.doses || 1;
                      const pct = Math.round((d.doses / max) * 100);
                      const barColor = COLORS[i % COLORS.length] + 'cc';
                      const unitLabel = (d.unitType?.toLowerCase() ?? '') + 's';
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-gray-600 w-36 truncate shrink-0">{d.name}</span>
                          <div className="flex-1 bg-white rounded-full h-5 overflow-hidden border border-teal-100">
                            <div
                              className="h-full rounded-full flex items-center px-2"
                              style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: barColor }}
                            >
                              <span className="text-[10px] font-bold text-white whitespace-nowrap">
                                {d.doses.toLocaleString()} {d.unit}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-gray-400 w-20 text-right shrink-0">
                            {d.qty} {unitLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MEDICINES ── */}
        {tab==='medicines'&&(
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[180px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, barcode..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none"/></div>
              <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"><option value="All">All Categories</option>{MEDICINE_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
              {programs.length>0&&(<select value={programFilter} onChange={e=>{setProgramFilter(e.target.value);setLineItemFilter('All');}} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-blue-50 text-blue-800 font-medium"><option value="All">All Programs</option>{programs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>)}
              {programs.length>0&&programFilter!=='All'&&(<select value={lineItemFilter} onChange={e=>setLineItemFilter(e.target.value)} className="border border-blue-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-blue-50 text-blue-700"><option value="All">All Line Items</option>{(programs.find(p=>p.id===programFilter)?.line_items||[]).map((li:any)=><option key={li.id} value={li.id}>{li.name}</option>)}</select>)}
              {(programFilter!=='All'||lineItemFilter!=='All')&&<button onClick={()=>{setProgramFilter('All');setLineItemFilter('All');}} className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 rounded-xl px-3 py-2.5 whitespace-nowrap">✕ Clear</button>}
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Item</th><th className="px-4 py-3 text-left">Category</th><th className="px-4 py-3 text-left">Supplier</th><th className="px-4 py-3 text-left">Program</th><th className="px-4 py-3 text-right">Qty / Doses</th><th className="px-4 py-3 text-right">Unit Price</th><th className="px-4 py-3 text-right">Total Value</th><th className="px-4 py-3 text-left">Expiry</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-center">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {loading?<tr><td colSpan={10} className="text-center py-8 text-gray-400">Loading...</td></tr>
                  :groupedMedsMap.size===0?<tr><td colSpan={10} className="text-center py-8 text-gray-400">No medicines found.</td></tr>
                  :Array.from(groupedMedsMap.entries()).map(([,group])=>{
                    const m=group[0];
                    const totalQty=group.reduce((s,x)=>s+(x.quantity||0),0);
                    const totalValue=group.reduce((s,x)=>s+(x.quantity||0)*(parseFloat(x.unit_cost)||0),0);
                    const batchCount=group.length;
                    const sup=suppliers.find(s=>s.id===m.supplier_id);
                    const prog=programs.find((p:any)=>p.id===m.program_id);
                    const lineItem=prog?.line_items?.find((li:any)=>li.id===m.line_item_id);
                    const nearestExpiry=group.map(x=>x.expiry_date).filter(Boolean).sort()[0];
                    return(<tr key={m.id} onClick={()=>setShowBatchModal(group)} className="hover:bg-blue-50/50 transition-colors cursor-pointer group">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 group-hover:text-[#2B5EA6] transition-colors">{m.name}</p>
                            {m.generic_name&&<p className="text-xs text-gray-400">{m.generic_name}</p>}
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {m.unit_type&&m.unit_type!=='Other'&&<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">{m.unit_type}</span>}
                              {m.dose_type==='multi'&&<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-100 text-teal-600">{m.doses_per_container}×dose</span>}
                              {m.concentration_value&&<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-600">{m.concentration_value}{m.concentration_unit}</span>}
                              {batchCount>1&&<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{batchCount} batches · click to view</span>}
                            </div>
                            {m.barcode&&<p className="text-xs text-gray-300 flex items-center gap-1"><Barcode className="w-3 h-3"/>{m.barcode}</p>}
                          </div>
                          <Info className="w-4 h-4 text-gray-300 group-hover:text-[#2B5EA6] flex-shrink-0 mt-0.5 transition-colors"/>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{m.category}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{sup?.name||'—'}</td>
                      <td className="px-4 py-3">{prog?(<div><span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{backgroundColor:(prog.color||'#2B5EA6')+'18',color:prog.color||'#2B5EA6'}}>{prog.name}</span>{lineItem&&<p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[160px]">{lineItem.name}</p>}</div>):<span className="text-xs text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        <span>{totalQty} <span className="text-xs text-gray-400">{m.unit}</span></span>
                        {['Vial','Bottle','Ampoule','Box'].includes(m.unit_type)&&group.reduce((s,x)=>s+(x.total_doses||x.quantity*(x.doses_per_container||1)),0)>0?(<span className="block text-xs font-semibold text-teal-600 mt-0.5">{group.reduce((s,x)=>s+(x.total_doses||x.quantity*(x.doses_per_container||1)),0).toLocaleString()} {m.unit_type==='Box'?'tablets':'doses'}</span>):null}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">₱{Number(m.unit_cost||0).toLocaleString('en-PH',{maximumFractionDigits:2})}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">₱{totalValue.toLocaleString('en-PH',{maximumFractionDigits:0})}</td>
                      <td className="px-4 py-3"><ExpiryBadge date={nearestExpiry}/></td>
                      <td className="px-4 py-3"><StatusBadge qty={totalQty} reorder={m.reorder_level}/></td>
                      <td className="px-4 py-3" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-center gap-1">
                        <button onClick={()=>openLogbook(m,'medicine')} className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-500" title="Logbook"><BookOpen className="w-4 h-4"/></button>
                        {canEdit&&<><button onClick={()=>setShowMoveModal({item:m,type:'medicine'})} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500" title="Movement"><Activity className="w-4 h-4"/></button>
                        <button onClick={()=>{setEditItem(m);setShowMedModal(true);}} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Edit2 className="w-4 h-4"/></button>
                        <button onClick={async()=>{if(confirm('Delete?')){await api.deleteMedicine(m.id);loadData();}}} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500"><Trash2 className="w-4 h-4"/></button></>}
                      </div></td>
                    </tr>);
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SUPPLIES ── */}
        {tab==='supplies'&&(
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[180px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search supplies..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none"/></div>
              <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"><option value="All">All Categories</option>{SUPPLY_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
              {programs.length>0&&(<select value={programFilter} onChange={e=>{setProgramFilter(e.target.value);setLineItemFilter('All');}} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-green-50 text-green-800 font-medium"><option value="All">All Programs</option>{programs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>)}
              {programs.length>0&&programFilter!=='All'&&(<select value={lineItemFilter} onChange={e=>setLineItemFilter(e.target.value)} className="border border-green-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-green-50 text-green-700"><option value="All">All Line Items</option>{(programs.find(p=>p.id===programFilter)?.line_items||[]).map((li:any)=><option key={li.id} value={li.id}>{li.name}</option>)}</select>)}
              {(programFilter!=='All'||lineItemFilter!=='All')&&<button onClick={()=>{setProgramFilter('All');setLineItemFilter('All');}} className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 rounded-xl px-3 py-2.5 whitespace-nowrap">✕ Clear</button>}
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide"><th className="px-4 py-3 text-left">Supply</th><th className="px-4 py-3 text-left">Category</th><th className="px-4 py-3 text-left">Supplier</th><th className="px-4 py-3 text-left">Program</th><th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Unit Price</th><th className="px-4 py-3 text-right">Total Value</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-center">Actions</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {loading?<tr><td colSpan={9} className="text-center py-8 text-gray-400">Loading...</td></tr>
                  :filteredSups.length===0?<tr><td colSpan={9} className="text-center py-8 text-gray-400">No supplies found.</td></tr>
                  :filteredSups.map(s=>{const sup=suppliers.find(x=>x.id===s.supplier_id);const prog=programs.find((p:any)=>p.id===s.program_id);const lineItem=prog?.line_items?.find((li:any)=>li.id===s.line_item_id);return(<tr key={s.id} className="hover:bg-green-50/30 transition-colors">
                    <td className="px-4 py-3"><p className="font-semibold text-gray-900">{s.name}</p>{s.barcode&&<p className="text-xs text-gray-300 flex items-center gap-1"><Barcode className="w-3 h-3"/>{s.barcode}</p>}</td>
                    <td className="px-4 py-3 text-gray-600">{s.category}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{sup?.name||s.supplier||'—'}</td>
                    <td className="px-4 py-3">{prog?(<div><span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{backgroundColor:(prog.color||'#60A85C')+'18',color:prog.color||'#60A85C'}}>{prog.name}</span>{lineItem&&<p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[120px]">{lineItem.name}</p>}</div>):<span className="text-xs text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{s.quantity} <span className="text-xs text-gray-400">{s.unit}</span></td>
                    <td className="px-4 py-3 text-right text-gray-600">₱{Number(s.unit_cost||0).toLocaleString('en-PH',{maximumFractionDigits:2})}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">₱{((s.quantity||0)*(parseFloat(s.unit_cost)||0)).toLocaleString('en-PH',{maximumFractionDigits:0})}</td>
                    <td className="px-4 py-3"><StatusBadge qty={s.quantity} reorder={s.reorder_level}/></td>
                    <td className="px-4 py-3"><div className="flex items-center justify-center gap-1"><button onClick={()=>openLogbook(s,'supply')} className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-500"><BookOpen className="w-4 h-4"/></button>{canEdit&&<><button onClick={()=>setShowMoveModal({item:s,type:'supply'})} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Activity className="w-4 h-4"/></button><button onClick={()=>{setEditItem(s);setShowSupModal(true);}} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Edit2 className="w-4 h-4"/></button><button onClick={async()=>{if(confirm('Delete?')){await api.deleteSupply(s.id);loadData();}}} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500"><Trash2 className="w-4 h-4"/></button></>}</div></td>
                  </tr>);})}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── OFFICE SUPPLIES ── */}
        {tab==='office'&&(
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[180px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search office supplies..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none"/></div>
              <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"><option value="All">All Categories</option>{OFFICE_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
              {programs.length>0&&(<select value={programFilter} onChange={e=>{setProgramFilter(e.target.value);setLineItemFilter('All');}} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-amber-50 text-amber-800 font-medium"><option value="All">All Programs</option>{programs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>)}
              {programs.length>0&&programFilter!=='All'&&(<select value={lineItemFilter} onChange={e=>setLineItemFilter(e.target.value)} className="border border-amber-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-amber-50 text-amber-700"><option value="All">All Line Items</option>{(programs.find(p=>p.id===programFilter)?.line_items||[]).map((li:any)=><option key={li.id} value={li.id}>{li.name}</option>)}</select>)}
              {(programFilter!=='All'||lineItemFilter!=='All')&&<button onClick={()=>{setProgramFilter('All');setLineItemFilter('All');}} className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 rounded-xl px-3 py-2.5 whitespace-nowrap">✕ Clear</button>}
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead><tr className="bg-amber-50 text-gray-600 text-xs uppercase tracking-wide"><th className="px-4 py-3 text-left">Item</th><th className="px-4 py-3 text-left">Category</th><th className="px-4 py-3 text-left">Supplier</th><th className="px-4 py-3 text-left">Program</th><th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Unit Price</th><th className="px-4 py-3 text-right">Total Value</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-center">Actions</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {loading?<tr><td colSpan={9} className="text-center py-8 text-gray-400">Loading...</td></tr>
                  :filteredOffice.length===0?<tr><td colSpan={9} className="text-center py-8 text-gray-400">No office supplies found.</td></tr>
                  :filteredOffice.map(o=>{const sup=suppliers.find(x=>x.id===o.supplier_id);const prog=programs.find((p:any)=>p.id===o.program_id);const lineItem=prog?.line_items?.find((li:any)=>li.id===o.line_item_id);return(<tr key={o.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="px-4 py-3"><p className="font-semibold text-gray-900">{o.name}</p>{o.barcode&&<p className="text-xs text-gray-300 flex items-center gap-1"><Barcode className="w-3 h-3"/>{o.barcode}</p>}</td>
                    <td className="px-4 py-3 text-gray-600">{o.category}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{sup?.name||'—'}</td>
                    <td className="px-4 py-3">{prog?(<div><span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{backgroundColor:(prog.color||'#f59e0b')+'18',color:prog.color||'#f59e0b'}}>{prog.name}</span>{lineItem&&<p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[120px]">{lineItem.name}</p>}</div>):<span className="text-xs text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{o.quantity} <span className="text-xs text-gray-400">{o.unit}</span></td>
                    <td className="px-4 py-3 text-right text-gray-600">₱{Number(o.unit_cost||0).toLocaleString('en-PH',{maximumFractionDigits:2})}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">₱{((o.quantity||0)*(parseFloat(o.unit_cost)||0)).toLocaleString('en-PH',{maximumFractionDigits:0})}</td>
                    <td className="px-4 py-3"><StatusBadge qty={o.quantity} reorder={o.reorder_level}/></td>
                    <td className="px-4 py-3"><div className="flex items-center justify-center gap-1">{canEdit&&<><button onClick={()=>{setEditItem(o);setShowOfficModal(true);}} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Edit2 className="w-4 h-4"/></button><button onClick={async()=>{if(confirm('Delete?')){await api.deleteOfficeSupply(o.id);loadData();}}} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500"><Trash2 className="w-4 h-4"/></button></>}</div></td>
                  </tr>);})}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ORDERS ── */}
        {tab==='orders'&&(
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search orders..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none"/></div>
              <select value={orderFilter} onChange={e=>setOrderFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"><option value="all">All Orders</option><option value="pending">Pending</option><option value="received">Received</option></select>
              {canEdit&&(<button onClick={()=>{setAddOrderPrefill(null);setShowAddOrderModal(true);}} className="flex items-center gap-2 bg-[#2B5EA6] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#2B5EA6]/90"><Plus className="w-4 h-4"/>Add Order</button>)}
            </div>
            {filteredOrders.length===0?(
              <div className="text-center py-16 text-gray-400"><ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30"/><p className="font-semibold">No orders found</p><p className="text-sm mt-1">Create an order using "New Order" above</p></div>
            ):(
              <div className="space-y-3">{filteredOrders.map(order=>(
                <div key={order.id} className={`rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${order.status==='received'?'bg-green-50 border-green-100':'bg-white border-gray-100 shadow-sm'}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${order.item_type==='medicine'?'bg-blue-100 text-blue-700':order.item_type==='supply'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>{order.item_type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${order.status==='pending'?'bg-orange-100 text-orange-700':'bg-green-100 text-green-700'}`}>{order.status==='pending'?'⏳ Pending':'✅ Received'}</span>
                    </div>
                    <p className="font-bold text-gray-900 text-base">{order.item_name}</p>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-gray-500">
                      <span>Qty: <strong className="text-gray-800">{order.quantity} {order.unit}</strong></span>
                      {order.unit_cost>0&&<span>Est. Cost: <strong className="text-gray-800">₱{(order.unit_cost*order.quantity).toLocaleString('en-PH',{maximumFractionDigits:2})}</strong></span>}
                      {order.doses_per_container>1&&<span className="text-teal-600 font-semibold">~{(order.quantity*(order.doses_per_container||1)).toLocaleString()} {order.unit_type==='Box'?'tablets':'doses'}</span>}
                      <span>Supplier: <strong className="text-gray-800">{order.supplier_name||'—'}</strong></span>
                    </div>
                    {order.notes&&<p className="text-xs text-gray-400 mt-1 italic">{order.notes}</p>}
                    <p className="text-xs text-gray-300 mt-1">Created: {new Date(order.created_at).toLocaleDateString('en-PH')} by {order.created_by}</p>
                    {order.status==='received'&&order.received_at&&<p className="text-xs text-green-600 mt-0.5">Received: {new Date(order.received_at).toLocaleDateString('en-PH')} by {order.received_by}</p>}
                  </div>
                  {canEdit&&order.status==='pending'&&(
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={()=>setShowReceiveModal(order)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-700 shadow"><CheckSquare className="w-4 h-4"/>Receive</button>
                      <button onClick={async()=>{if(confirm('Cancel this order?')){await api.updatePendingOrder(order.id,{...order,status:'cancelled'});loadData();}}} className="p-2 hover:bg-red-100 rounded-xl text-red-500"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  )}
                </div>
              ))}</div>
            )}
          </div>
        )}

        {/* ── LOGBOOK ── */}
        {tab==='logbook'&&(
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div><h3 className="font-bold text-gray-800 flex items-center gap-2"><BookOpen className="w-5 h-5 text-[#2B5EA6]"/>Digital Logbook</h3><p className="text-xs text-gray-500 mt-1">All inventory movements — IN, OUT, adjustments.</p></div>
              <button onClick={loadData} className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200"><RefreshCw className="w-4 h-4 text-gray-500"/></button>
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {transactions.length===0?(<p className="text-center text-gray-400 py-12">No transaction records yet.</p>):transactions.map(tx=>{
                const isIn=tx.transaction_type==='IN',isOut=tx.transaction_type==='OUT';
                return(<div key={tx.id} className={`rounded-xl p-4 border flex items-start gap-4 ${isIn?'bg-green-50 border-green-100':isOut?'bg-red-50 border-red-100':'bg-gray-50 border-gray-100'}`}>
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${isIn?'bg-green-100':isOut?'bg-red-100':'bg-gray-100'}`}>{isIn?<LogIn className="w-5 h-5 text-green-600"/>:isOut?<LogOut className="w-5 h-5 text-red-600"/>:<Activity className="w-5 h-5 text-gray-500"/>}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{tx.item_name||tx.item_id}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isIn?'bg-green-100 text-green-700':isOut?'bg-red-100 text-red-700':'bg-gray-100 text-gray-600'}`}>{isIn?'▲':'▼'} {tx.transaction_type} · {tx.quantity} units</span>
                      {tx.source==='old_stocks'&&<span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">Migration</span>}
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
                </div>);
              })}
            </div>
          </div>
        )}

        {/* ── SUPPLIERS ── */}
        {tab==='suppliers'&&(
          <div className="p-6 space-y-4">
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search suppliers..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none"/></div>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead><tr className="bg-indigo-50 text-gray-600 text-xs uppercase tracking-wide"><th className="px-4 py-3 text-left">Supplier</th><th className="px-4 py-3 text-left">Contact</th><th className="px-4 py-3 text-left">Category</th><th className="px-4 py-3 text-left">Email</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-center">Actions</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {loading?<tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
                  :filteredSuppliers.length===0?<tr><td colSpan={6} className="text-center py-8 text-gray-400">No suppliers found.</td></tr>
                  :filteredSuppliers.map(s=>(<tr key={s.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-4 py-3"><p className="font-semibold text-gray-900">{s.name}</p>{s.address&&<p className="text-xs text-gray-400">{s.address}</p>}</td>
                    <td className="px-4 py-3"><p className="text-gray-700">{s.contact_person||'—'}</p>{s.phone&&<p className="text-xs text-gray-400">{s.phone}</p>}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">{s.category}</span></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{s.email||'—'}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-bold ${s.is_active?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{s.is_active?'● Active':'○ Inactive'}</span></td>
                    <td className="px-4 py-3"><div className="flex items-center justify-center gap-1">{canEdit&&<><button onClick={()=>{setEditItem(s);setShowSupplierModal(true);}} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Edit2 className="w-4 h-4"/></button><button onClick={async()=>{if(confirm('Delete supplier?')){await api.deleteSupplier(s.id);loadData();}}} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500"><Trash2 className="w-4 h-4"/></button></>}</div></td>
                  </tr>))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── All Modals ── */}
      {showMedModal&&<MedicineModal item={editItem} programs={programs} suppliers={suppliers} onClose={()=>{setShowMedModal(false);setEditItem(null);}} onSave={saveMedicine} onNewSupplier={createSupplierInline}/>}
      {showSupModal&&<SupplyModal item={editItem} programs={programs} suppliers={suppliers} onClose={()=>{setShowSupModal(false);setEditItem(null);}} onSave={saveSupply} onNewSupplier={createSupplierInline}/>}
      {showOfficModal&&<OfficeSupplyModal item={editItem} suppliers={suppliers} programs={programs} onClose={()=>{setShowOfficModal(false);setEditItem(null);}} onSave={saveOfficeSupply} onNewSupplier={createSupplierInline}/>}
      {showSupplierModal&&<SupplierModal item={editItem} onClose={()=>{setShowSupplierModal(false);setEditItem(null);}} onSave={saveSupplier}/>}
      {showAddOrderModal&&<AddOrderModal prefill={addOrderPrefill} medicines={medicines} supplies={supplies} officeSupplies={officeSupplies} suppliers={suppliers} programs={programs} onClose={()=>{setShowAddOrderModal(false);setAddOrderPrefill(null);}} onSave={saveOrder} onNewSupplier={createSupplierInline}/>}
      {showOldStocksModal&&<AddOldStocksModal medicines={medicines} supplies={supplies} officeSupplies={officeSupplies} suppliers={suppliers} programs={programs} onClose={()=>setShowOldStocksModal(false)} onSave={saveOldStocks} onNewSupplier={createSupplierInline}/>}
      {showReceiveModal&&<ReceiveOrderModal order={showReceiveModal} medicines={medicines} supplies={supplies} officeSupplies={officeSupplies} onClose={()=>setShowReceiveModal(null)} onReceive={receiveOrder}/>}
      {showMoveModal&&<MovementModal item={showMoveModal.item} itemType={showMoveModal.type} onClose={()=>setShowMoveModal(null)} onSave={handleMovement}/>}
      {showLogbook&&<LogbookModal transactions={showLogbook.txs} itemName={showLogbook.item.name} onClose={()=>setShowLogbook(null)}/>}
      {showBatchModal&&<BatchDetailModal group={showBatchModal} suppliers={suppliers} programs={programs} canEdit={canEdit} onClose={()=>setShowBatchModal(null)} onEdit={item=>{setShowBatchModal(null);setEditItem(item);setShowMedModal(true);}} onDelete={async item=>{if(confirm('Delete this batch entry?')){await api.deleteMedicine(item.id);const updated=showBatchModal.filter(x=>x.id!==item.id);if(updated.length===0){setShowBatchModal(null);}else{setShowBatchModal(updated);}loadData();}}}/>}
      {showDispatchModal&&<DispatchModal medicines={medicines} supplies={supplies} officeSupplies={officeSupplies} currentUser={currentUser} onClose={()=>setShowDispatchModal(false)} onSave={handleDispatch}/>}
    </div>
  );
}

export default InventoryPage;
