import { useState, useEffect } from 'react';
import {
  Plus, Search, Download, Eye, RefreshCw, X, CheckCircle,
  AlertTriangle, Activity, BarChart3, TrendingUp, Shield, MapPin,
  Phone, FileText, Users, Syringe, Skull, Tag,
  ClipboardList, Stethoscope, TriangleAlert, Info, Edit2, Home
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { api } from '../lib/api';

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface Livestock {
  id: string; owner_id?: string; animal_type: string; breed?: string;
  quantity: number; gender?: string; age?: string; color_markings?: string;
  purpose?: string; source?: string; tag_number?: string;
  owner_name: string; contact_number?: string; barangay: string;
  farm_address?: string; farm_type?: string; health_status: string; vaccination_status: string;
  last_checkup_date?: string; registration_date?: string;
  quarantine_date?: string; quarantine_reason?: string; notes?: string;
}

interface HealthRecord {
  id: number; livestock_id: string; record_type: string; date: string;
  diagnosis?: string; treatment?: string; medicine_used?: string;
  veterinarian?: string; next_due_date?: string; notes?: string; created_by?: string;
}

interface MortalityRecord {
  id: number; livestock_id?: string; animal_type: string; breed?: string;
  owner_name: string; barangay: string; quantity: number; cause: string;
  date_reported: string; investigation_status: string; notes?: string;
}

interface DiseaseEvent {
  id: string; animal_type: string; disease: string; barangay: string;
  cases: number; deaths: number; status: string; date_reported: string; notes?: string;
}

interface Summary {
  byType: Array<{ animal_type:string; total:string; healthy:string; sick:string; quarantine:string; vaccinated:string }>;
  byBarangay: Array<{ barangay:string; cattle:string; swine:string; poultry:string; goats:string; carabao:string; total:string }>;
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const CALACA_BARANGAYS = [
  'Baclas','Bagong Tubig','Balimbing','Bambang','Bisaya','Cahil','Calantas',
  'Caluangan','Camastilisan','Coral Ni Bacal','Coral Ni Lopez','Dacanlao','Dila',
  'Loma','Lumbang Calzada','Lumbang Na Bata','Lumbang Na Matanda','Madalunot',
  'Makina','Matipok','Munting Coral','Niyugan','Pantay','Poblacion 1','Poblacion 2',
  'Poblacion 3','Poblacion 4','Poblacion 5','Poblacion 6','Putting Bato East',
  'Putting Bato West','Quisumbing','Salong','San Rafael','Sinisian','Taklang Anak',
  'Talisay','Tamayo','Timbain',
];

const ANIMAL_TYPES  = ['Cattle','Swine','Poultry','Goats','Carabao','Horse','Sheep','Duck','Rabbit'];
const HEALTH_STATUSES = ['Healthy','Sick','Quarantine','Dead','Recovered'];
const PURPOSES      = ['Meat','Dairy','Draft','Egg','Mixed','Breeding','Pet'];
const RECORD_TYPES  = ['Vaccination','Checkup','Treatment','Deworming','Dehorning','Castration','Other'];

const TYPE_ICON: Record<string,string> = {
  Cattle:'🐄', Swine:'🐷', Poultry:'🐔', Goats:'🐐', Carabao:'🦬',
  Horse:'🐴', Sheep:'🐑', Duck:'🦆', Rabbit:'🐰',
};
const TYPE_COLOR: Record<string,string> = {
  Cattle:'#2B5EA6', Swine:'#f59e0b', Poultry:'#e68a00', Goats:'#8b5cf6',
  Carabao:'#6b7280', Horse:'#b45309', Sheep:'#60A85C', Duck:'#06b6d4', Rabbit:'#ec4899',
};
const HEALTH_COLOR: Record<string,string> = {
  Healthy:'#60A85C', Sick:'#ef4444', Quarantine:'#f59e0b', Dead:'#374151', Recovered:'#06b6d4',
};
const PIE_COLORS = ['#2B5EA6','#60A85C','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#14b8a6','#f97316'];

const INPUT = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent bg-white transition-all';

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'});
}
function fmtNum(n: string|number) { return Number(n).toLocaleString('en-PH'); }

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, color, bg, onClick }: any) {
  return (
    <div onClick={onClick}
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 ${onClick?'cursor-pointer hover:shadow-md hover:scale-[1.02]':''} transition-all group`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        <div className={`${bg} ${color} w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>{icon}</div>
      </div>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function SelectField({ label, value, onChange, options, className = '' }: any) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className={INPUT}>
        {options.map((o: any) => typeof o === 'string' ? <option key={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── REGISTER MODAL ───────────────────────────────────────────────────────────

function RegisterModal({ onClose, onSave }: { onClose:()=>void; onSave:(d:any)=>Promise<void> }) {
  const [f, setF] = useState({
    animalType:'', breed:'', quantity:'1', gender:'', age:'', colorMarkings:'',
    purpose:'Mixed', source:'', tagNumber:'', ownerName:'', contactNumber:'',
    barangay:'', farmAddress:'', farmType:'Backyard', healthStatus:'Healthy',
    notes:'', quarantineDate:'', quarantineReason:'',
  });
  const [saving, setSaving] = useState(false);
  const s = (k:string) => (v:string) => setF(p=>({...p,[k]:v}));
  const t = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => setF(p=>({...p,[k]:e.target.value}));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-[#1e4080] to-[#2B5EA6] px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🐄</div>
            <div><p className="font-bold text-white">Register New Livestock</p><p className="text-white/60 text-xs">Fields marked * are required</p></div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Animal Info */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 border-b pb-2">Animal Information</p>
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Animal Type *" value={f.animalType} onChange={s('animalType')} options={['',  ...ANIMAL_TYPES]}/>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Breed</label><input value={f.breed} onChange={t('breed')} className={INPUT} placeholder="e.g., Brahman, Native"/></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Quantity *</label><input type="number" min="1" value={f.quantity} onChange={t('quantity')} className={INPUT}/></div>
              <SelectField label="Gender" value={f.gender} onChange={s('gender')} options={['','Male','Female','Mixed']}/>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Age / Range</label><input value={f.age} onChange={t('age')} className={INPUT} placeholder="e.g., 2-4 years"/></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Color / Markings</label><input value={f.colorMarkings} onChange={t('colorMarkings')} className={INPUT} placeholder="e.g., Gray, Brown/White"/></div>
              <SelectField label="Purpose" value={f.purpose} onChange={s('purpose')} options={PURPOSES}/>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Tag / Ear Number</label><input value={f.tagNumber} onChange={t('tagNumber')} className={INPUT} placeholder="e.g., CTL-0001"/></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Source</label><input value={f.source} onChange={t('source')} className={INPUT} placeholder="e.g., Local farm"/></div>
            </div>
          </div>
          {/* Owner Info */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 border-b pb-2">Owner / Farm</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Owner Name *</label><input value={f.ownerName} onChange={t('ownerName')} className={INPUT} placeholder="Full name"/></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Contact Number</label><input value={f.contactNumber} onChange={t('contactNumber')} className={INPUT} placeholder="0917-xxx-xxxx"/></div>
              <SelectField label="Barangay *" value={f.barangay} onChange={s('barangay')} options={['', ...CALACA_BARANGAYS]}/>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Farm Address</label><input value={f.farmAddress} onChange={t('farmAddress')} className={INPUT} placeholder="Purok / Zone / Sitio"/></div>
            </div>
          </div>
          {/* Health */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 border-b pb-2">Health Status</p>
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Health Status" value={f.healthStatus} onChange={s('healthStatus')} options={HEALTH_STATUSES}/>
              <SelectField label="Farm Type" value={f.farmType} onChange={s('farmType')} options={['Backyard','Commercial Farm','Semi-Commercial']}/>
              {(f.healthStatus === 'Quarantine' || f.healthStatus === 'Sick') && (
                <>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Quarantine Date</label><input type="date" value={f.quarantineDate} onChange={t('quarantineDate')} className={INPUT}/></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Reason</label><input value={f.quarantineReason} onChange={t('quarantineReason')} className={INPUT} placeholder="Reason…"/></div>
                </>
              )}
              <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label><textarea value={f.notes} onChange={t('notes')} rows={2} className={INPUT+' resize-none'} placeholder="Additional remarks…"/></div>
            </div>
          </div>
        </div>
        <div className="shrink-0 px-6 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
          <button
            onClick={async()=>{if(!f.animalType||!f.ownerName||!f.barangay)return;setSaving(true);await onSave({...f,quantity:parseInt(f.quantity)||1});setSaving(false);}}
            disabled={!f.animalType||!f.ownerName||!f.barangay||saving}
            className="flex-1 py-2.5 bg-[#2B5EA6] text-white rounded-xl text-sm font-bold hover:bg-[#234a85] disabled:opacity-40 flex items-center justify-center gap-2">
            {saving?<><RefreshCw className="w-4 h-4 animate-spin"/>Saving…</>:'Register Livestock'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────

function DetailModal({ item, onClose, onUpdate }: { item:Livestock; onClose:()=>void; onUpdate:()=>void }) {
  const [tab, setTab] = useState<'info'|'health'|'edit'>('info');
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loadingRec, setLoadingRec] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [hr, setHr] = useState({
    recordType:'Vaccination', date:new Date().toISOString().split('T')[0],
    diagnosis:'', treatment:'', medicineUsed:'', veterinarian:'Dr. Amalia Vergara',
    nextDueDate:'', notes:'',
  });
  const [ef, setEf] = useState({
    quantity:String(item.quantity), healthStatus:item.health_status,
    farmType:(item as any).farm_type||'Backyard',
    lastCheckupDate:item.last_checkup_date?.split('T')[0]||'',
    notes:item.notes||'', quarantineDate:item.quarantine_date?.split('T')[0]||'',
    quarantineReason:item.quarantine_reason||'',
  });
  const [saving, setSaving] = useState(false);

  useEffect(()=>{
    if(tab==='health'){
      setLoadingRec(true);
      api.getHealthRecords(item.id).then(r=>{ setRecords(r.records||[]); setLoadingRec(false); }).catch(()=>setLoadingRec(false));
    }
  },[tab,item.id]);

  const saveHR = async()=>{
    setSaving(true);
    try {
      await api.addHealthRecord(item.id, hr);
      const r = await api.getHealthRecords(item.id);
      setRecords(r.records||[]);
      setShowAdd(false);
      setHr({recordType:'Vaccination',date:new Date().toISOString().split('T')[0],diagnosis:'',treatment:'',medicineUsed:'',veterinarian:'Dr. Amalia Vergara',nextDueDate:'',notes:''});
      onUpdate();
    } catch(e:any){ alert('Error: '+e.message); }
    setSaving(false);
  };

  const saveEdit = async()=>{
    setSaving(true);
    try {
      await api.updateLivestock(item.id,{
        quantity:parseInt(ef.quantity)||item.quantity,
        healthStatus:ef.healthStatus, farmType:ef.farmType,
        lastCheckupDate:ef.lastCheckupDate||null, notes:ef.notes,
        quarantineDate:ef.quarantineDate||null, quarantineReason:ef.quarantineReason||null,
      });
      onUpdate(); onClose();
    } catch(e:any){ alert('Error: '+e.message); }
    setSaving(false);
  };

  const hc = HEALTH_COLOR[item.health_status]||'#374151';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between shrink-0" style={{background:`linear-gradient(135deg,${hc}cc,${hc})`}}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">{TYPE_ICON[item.animal_type]||item.animal_type.charAt(0)}</div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-white/25 text-white text-xs font-bold rounded-full font-mono">{item.id}</span>
                {item.tag_number&&<span className="px-2 py-0.5 bg-white/20 text-white text-xs rounded-full flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>{item.tag_number}</span>}
              </div>
              <p className="font-black text-white text-xl">{item.animal_type} · {item.breed||'Unspecified'}</p>
              <p className="text-white/80 text-sm">{fmtNum(item.quantity)} head · {item.barangay}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1"><X className="w-5 h-5"/></button>
        </div>
        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0">
          {([['info','Details',<Info className="w-4 h-4"/>],['health','Health Records',<Stethoscope className="w-4 h-4"/>],['edit','Update',<Edit2 className="w-4 h-4"/>]] as any[]).map(([id,label,icon])=>(
            <button key={id} onClick={()=>setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-all ${tab===id?'border-b-2 border-[#2B5EA6] text-[#2B5EA6] bg-blue-50/50':'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
              {icon}{label}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          {/* INFO */}
          {tab==='info'&&(
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[['Type',item.animal_type],['Breed',item.breed||'—'],['Qty',`${fmtNum(item.quantity)} head`],['Gender',item.gender||'—'],['Age',item.age||'—'],['Purpose',item.purpose||'—'],['Color',item.color_markings||'—'],['Source',item.source||'—'],['Registered',fmtDate(item.registration_date)],['Last Checkup',fmtDate(item.last_checkup_date)]].map(([k,v])=>(
                  <div key={k} className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{k}</p><p className="text-sm font-semibold text-gray-800">{v}</p></div>
                ))}
              </div>
              <div className="border-t pt-4 space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Owner / Farm</p>
                <div className="flex items-center gap-3"><div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><Users className="w-4 h-4 text-blue-600"/></div><div><p className="text-xs text-gray-400">Owner</p><p className="text-sm font-semibold">{item.owner_name}</p></div></div>
                <div className="flex items-center gap-3"><div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center"><Phone className="w-4 h-4 text-green-600"/></div><div><p className="text-xs text-gray-400">Contact</p><p className="text-sm font-semibold">{item.contact_number||'—'}</p></div></div>
                <div className="flex items-center gap-3"><div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center"><MapPin className="w-4 h-4 text-purple-600"/></div><div><p className="text-xs text-gray-400">Farm</p><p className="text-sm font-semibold">{item.farm_address||'—'}, {item.barangay}</p></div></div>
              </div>
              <div className={`rounded-xl p-4 border ${item.health_status==='Healthy'?'bg-green-50 border-green-200':item.health_status==='Quarantine'?'bg-amber-50 border-amber-200':item.health_status==='Sick'?'bg-red-50 border-red-200':'bg-gray-50 border-gray-200'}`}>
                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{color:hc}}>Health</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{background:hc}}>{item.health_status}</span>
<span className={`px-3 py-1 rounded-full text-xs font-bold ${(item as any).farm_type==='Commercial Farm'?'bg-blue-100 text-blue-700':(item as any).farm_type==='Semi-Commercial'?'bg-purple-100 text-purple-700':'bg-amber-100 text-amber-700'}`}>{(item as any).farm_type||'Backyard'}</span>
                </div>
                {item.quarantine_reason&&<p className="text-sm mt-2" style={{color:hc}}>{item.quarantine_reason}</p>}
                {item.notes&&<p className="text-xs text-gray-600 mt-2 italic">{item.notes}</p>}
              </div>
            </div>
          )}
          {/* HEALTH RECORDS */}
          {tab==='health'&&(
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-bold text-gray-800 flex items-center gap-2"><Stethoscope className="w-4 h-4 text-[#2B5EA6]"/>Health Records</p>
                <button onClick={()=>setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 bg-[#2B5EA6] text-white rounded-xl text-xs font-bold hover:bg-[#234a85]"><Plus className="w-3.5 h-3.5"/>Add Record</button>
              </div>
              {showAdd&&(
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">New Health Record</p>
                  <div className="grid grid-cols-2 gap-3">
                    <SelectField label="Record Type" value={hr.recordType} onChange={(v:string)=>setHr(p=>({...p,recordType:v}))} options={RECORD_TYPES}/>
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Date</label><input type="date" value={hr.date} onChange={e=>setHr(p=>({...p,date:e.target.value}))} className={INPUT}/></div>
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Veterinarian</label><input value={hr.veterinarian} onChange={e=>setHr(p=>({...p,veterinarian:e.target.value}))} className={INPUT}/></div>
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Next Due Date</label><input type="date" value={hr.nextDueDate} onChange={e=>setHr(p=>({...p,nextDueDate:e.target.value}))} className={INPUT}/></div>
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Diagnosis</label><input value={hr.diagnosis} onChange={e=>setHr(p=>({...p,diagnosis:e.target.value}))} className={INPUT} placeholder="Optional"/></div>
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Medicine Used</label><input value={hr.medicineUsed} onChange={e=>setHr(p=>({...p,medicineUsed:e.target.value}))} className={INPUT} placeholder="Drug/vaccine name"/></div>
                    <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes / Treatment</label><textarea value={hr.notes} onChange={e=>setHr(p=>({...p,notes:e.target.value}))} rows={2} className={INPUT+' resize-none'}/></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>setShowAdd(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
                    <button onClick={saveHR} disabled={saving} className="flex-1 py-2 bg-[#2B5EA6] text-white rounded-xl text-sm font-bold hover:bg-[#234a85] disabled:opacity-60 flex items-center justify-center gap-2">
                      {saving?<><RefreshCw className="w-3.5 h-3.5 animate-spin"/>Saving…</>:'Save Record'}
                    </button>
                  </div>
                </div>
              )}
              {loadingRec?<div className="flex items-center justify-center py-8"><div className="w-8 h-8 border-4 border-[#2B5EA6] border-t-transparent rounded-full animate-spin"/></div>
              :records.length===0?<div className="text-center py-10 text-gray-400"><Stethoscope className="w-8 h-8 mx-auto mb-2 opacity-30"/><p className="text-sm">No health records yet</p></div>
              :<div className="space-y-3">
                {records.map(r=>(
                  <div key={r.id} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${r.record_type==='Vaccination'?'bg-green-100 text-green-700':r.record_type==='Treatment'?'bg-red-100 text-red-700':'bg-blue-100 text-blue-700'}`}>{r.record_type}</span>
                      <p className="text-xs text-gray-400">{fmtDate(r.date)}</p>
                    </div>
                    {r.diagnosis&&<p className="text-sm text-gray-700 mb-1"><span className="font-semibold">Dx:</span> {r.diagnosis}</p>}
                    {r.medicine_used&&<p className="text-sm text-gray-600 mb-1"><span className="font-semibold">Medicine:</span> {r.medicine_used}</p>}
                    {r.notes&&<p className="text-xs text-gray-500 italic mt-1">{r.notes}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-400">By: {r.veterinarian||r.created_by}</p>
                      {r.next_due_date&&<p className="text-xs text-blue-600 font-semibold">Next: {fmtDate(r.next_due_date)}</p>}
                    </div>
                  </div>
                ))}
              </div>}
            </div>
          )}
          {/* EDIT */}
          {tab==='edit'&&(
            <div className="space-y-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide border-b pb-2">Update Record</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Quantity</label><input type="number" min="0" value={ef.quantity} onChange={e=>setEf(p=>({...p,quantity:e.target.value}))} className={INPUT}/></div>
                <SelectField label="Health Status" value={ef.healthStatus} onChange={(v:string)=>setEf(p=>({...p,healthStatus:v}))} options={HEALTH_STATUSES}/>
                <SelectField label="Farm Type" value={ef.farmType} onChange={(v:string)=>setEf(p=>({...p,farmType:v}))} options={['Backyard','Commercial Farm','Semi-Commercial']}/>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Last Checkup Date</label><input type="date" value={ef.lastCheckupDate} onChange={e=>setEf(p=>({...p,lastCheckupDate:e.target.value}))} className={INPUT}/></div>
                {(ef.healthStatus==='Quarantine'||ef.healthStatus==='Sick')&&<>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Quarantine Date</label><input type="date" value={ef.quarantineDate} onChange={e=>setEf(p=>({...p,quarantineDate:e.target.value}))} className={INPUT}/></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Quarantine Reason</label><input value={ef.quarantineReason} onChange={e=>setEf(p=>({...p,quarantineReason:e.target.value}))} className={INPUT}/></div>
                </>}
                <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label><textarea value={ef.notes} onChange={e=>setEf(p=>({...p,notes:e.target.value}))} rows={2} className={INPUT+' resize-none'}/></div>
              </div>
              <button onClick={saveEdit} disabled={saving}
                className="w-full py-2.5 bg-[#2B5EA6] text-white rounded-xl text-sm font-bold hover:bg-[#234a85] disabled:opacity-60 flex items-center justify-center gap-2">
                {saving?<><RefreshCw className="w-4 h-4 animate-spin"/>Saving…</>:'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

type MainTab = 'overview'|'records'|'health'|'disease'|'mortality';

export function LivestockManagement() {
  const [tab, setTab]           = useState<MainTab>('overview');
  const [livestock, setLivestock] = useState<Livestock[]>([]);
  const [summary, setSummary]   = useState<Summary|null>(null);
  const [mortality, setMort]    = useState<MortalityRecord[]>([]);
  const [disease, setDisease]   = useState<DiseaseEvent[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [fType, setFType]       = useState('all');
  const [fBrgy, setFBrgy]       = useState('all');
  const [fHealth, setFHealth]   = useState('all');
  const [showReg, setShowReg]   = useState(false);
  const [viewItem, setViewItem] = useState<Livestock|null>(null);
  const [showMF, setShowMF]     = useState(false);
  const [showDF, setShowDF]     = useState(false);
  const [mf, setMf] = useState({ animalType:'', breed:'', ownerName:'', barangay:'', quantity:'1', cause:'', dateReported:new Date().toISOString().split('T')[0], notes:'' });
  const [df, setDf] = useState({ animalType:'', disease:'', barangay:'', cases:'1', deaths:'0', dateReported:new Date().toISOString().split('T')[0], notes:'' });
  const [saving, setSaving]     = useState(false);

  useEffect(()=>{ loadAll(); },[]);

  const loadAll = async()=>{
    setLoading(true);
    try {
      const [lsR, sumR, mR, dR] = await Promise.all([
        api.getLivestock(), api.getLivestockSummary(), api.getMortality(), api.getDiseaseEvents()
      ]);
      setLivestock(lsR.livestock||[]);
      setSummary(sumR);
      setMort(mR.mortality||[]);
      setDisease(dR.events||[]);
    } catch(e){ console.error(e); }
    setLoading(false);
  };

  const handleRegister = async(data:any)=>{ try { await api.createLivestock(data); await loadAll(); setShowReg(false); } catch(e:any){ alert('Error: '+e.message); } };

  const handleDelete = async(id:string)=>{
    if(!confirm('Delete this livestock record?')) return;
    try { await api.deleteLivestock(id); await loadAll(); } catch(e:any){ alert('Error: '+e.message); }
  };

  const handleAddMortality = async()=>{
    if(!mf.animalType||!mf.ownerName||!mf.barangay||!mf.cause) return;
    setSaving(true);
    try { await api.addMortality({...mf,quantity:parseInt(mf.quantity)||1}); await loadAll(); setShowMF(false); setMf({animalType:'',breed:'',ownerName:'',barangay:'',quantity:'1',cause:'',dateReported:new Date().toISOString().split('T')[0],notes:''}); }
    catch(e:any){ alert('Error: '+e.message); }
    setSaving(false);
  };

  const handleAddDisease = async()=>{
    if(!df.animalType||!df.disease||!df.barangay) return;
    setSaving(true);
    try { await api.addDiseaseEvent({...df,cases:parseInt(df.cases)||1,deaths:parseInt(df.deaths)||0}); await loadAll(); setShowDF(false); setDf({animalType:'',disease:'',barangay:'',cases:'1',deaths:'0',dateReported:new Date().toISOString().split('T')[0],notes:''}); }
    catch(e:any){ alert('Error: '+e.message); }
    setSaving(false);
  };

  const handleResolveDisease = async(id:string, ev:DiseaseEvent)=>{
    try { await api.updateDiseaseEvent(id,{...ev,status:'Resolved',resolvedDate:new Date().toISOString().split('T')[0]}); await loadAll(); }
    catch(e:any){ alert('Error: '+e.message); }
  };

  const handleExport = ()=>{
    const csv = ['ID,Type,Breed,Qty,Owner,Contact,Barangay,Health,Vaccination,Last Checkup',
      ...filteredLivestock.map(l=>`${l.id},${l.animal_type},${l.breed||''},${l.quantity},${l.owner_name},${l.contact_number||''},${l.barangay},${l.health_status},${(l as any).farm_type||'Backyard'},${l.last_checkup_date||''}`)
    ].join('\n');
    const a = document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='livestock.csv'; a.click();
  };

  // ── computed ──
  const totals = summary?.byType.reduce((acc:any,r)=>{
    const t = parseInt(r.total||'0');
    acc[r.animal_type.toLowerCase()]=(acc[r.animal_type.toLowerCase()]||0)+t;
    acc.total=(acc.total||0)+t;
    acc.healthy=(acc.healthy||0)+parseInt(r.healthy||'0');
    acc.sick=(acc.sick||0)+parseInt(r.sick||'0');
    acc.quarantine=(acc.quarantine||0)+parseInt(r.quarantine||'0');
    return acc;
  },{}) || {};

  const pieData = summary?.byType.map(r=>({ name:r.animal_type, value:parseInt(r.total||'0') })).filter(d=>d.value>0) || [];
  const healthPie = [
    {name:'Healthy',value:totals.healthy||0,fill:'#60A85C'},
    {name:'Sick',value:totals.sick||0,fill:'#ef4444'},
    {name:'Quarantine',value:totals.quarantine||0,fill:'#f59e0b'},
  ].filter(d=>d.value>0);

  const topBrgy = (summary?.byBarangay||[]).slice(0,8).map(b=>({
    name:b.barangay.replace('Poblacion','Pob.').replace('Putting Bato','PB').replace('Lumbang','Lmb').replace('Coral Ni ','CN '),
    cattle:parseInt(b.cattle||'0'), swine:parseInt(b.swine||'0'),
    poultry:parseInt(b.poultry||'0'), goats:parseInt(b.goats||'0'), carabao:parseInt(b.carabao||'0'),
  }));

  const filteredLivestock = livestock.filter(l=>{
    const s=search.toLowerCase();
    const m=!s||l.owner_name.toLowerCase().includes(s)||l.id.toLowerCase().includes(s)||l.barangay.toLowerCase().includes(s)||(l.breed||'').toLowerCase().includes(s)||(l.tag_number||'').toLowerCase().includes(s);
    return m&&(fType==='all'||l.animal_type===fType)&&(fBrgy==='all'||l.barangay===fBrgy)&&(fHealth==='all'||l.health_status===fHealth);
  });

  const activeDisease = disease.filter(e=>e.status==='Active').length;
  const mt = (k:MainTab) => setTab(k);

  if(loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center"><div className="w-12 h-12 border-4 border-[#2B5EA6] border-t-transparent rounded-full animate-spin mx-auto mb-3"/><p className="text-gray-500 text-sm">Loading livestock data…</p></div>
    </div>
  );

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><circle cx="12" cy="13" r="3"/></svg>Livestock Management</h2>
          <p className="text-gray-500 text-sm mt-0.5">Calaca CVO · Registration · Health Records · Disease Monitoring</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={loadAll} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500"><RefreshCw className="w-4 h-4"/></button>
          <button onClick={()=>setShowReg(true)} className="flex items-center gap-2 px-4 py-2 bg-[#2B5EA6] text-white rounded-xl font-semibold text-sm hover:bg-[#234a85] shadow-sm"><Plus className="w-4 h-4"/>Register</button>
          <button onClick={()=>setShowMF(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 shadow-sm"><Skull className="w-4 h-4"/>Mortality</button>
          <button onClick={()=>setShowDF(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 shadow-sm"><TriangleAlert className="w-4 h-4"/>Disease Alert</button>
        </div>
      </div>

      {/* Active disease banner */}
      {activeDisease>0&&(
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5 text-white"/></div>
          <div className="flex-1"><p className="font-bold text-red-800">{activeDisease} Active Disease Alert{activeDisease>1?'s':''}</p><p className="text-sm text-red-600">Immediate action may be required.</p></div>
          <button onClick={()=>mt('disease')} className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 shrink-0">View →</button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 flex gap-1 flex-wrap">
        {([
          ['overview', 'Overview', <BarChart3 className="w-4 h-4"/>],
          ['records',  `Records (${livestock.length})`, <ClipboardList className="w-4 h-4"/>],
          ['health',   'Health Records', <Stethoscope className="w-4 h-4"/>],
          ['disease',  `Disease (${activeDisease})`, <Shield className="w-4 h-4"/>],
          ['mortality',`Mortality (${mortality.length})`, <Skull className="w-4 h-4"/>],
        ] as [MainTab,string,any][]).map(([key,label,icon])=>(
          <button key={key} onClick={()=>mt(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${tab===key?'bg-[#2B5EA6] text-white shadow-sm':'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW ══ */}
      {tab==='overview'&&(
        <div className="space-y-5">
          {/* Animal count cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {(['Cattle','Swine','Poultry','Goats','Carabao','Horse'] as const).map(type=>(
              <div key={type} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all cursor-pointer" onClick={()=>{setFType(type);mt('records');}}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{type}</p>
<span className="text-2xl">{TYPE_ICON[type]||type.charAt(0)}</span>
                </div>
                <p className="text-3xl font-black text-gray-900">{fmtNum(totals[type.toLowerCase()]||0)}</p>
              </div>
            ))}
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Head" value={fmtNum(totals.total||0)} sub="All species combined" icon="" color="text-blue-600" bg="bg-blue-100"/>
            <StatCard label="Healthy" value={fmtNum(totals.healthy||0)} sub={totals.total?`${Math.round(((totals.healthy||0)/totals.total)*100)}% of herd`:''} icon={<CheckCircle className="w-5 h-5"/>} color="text-green-600" bg="bg-green-100"/>
            <StatCard label="Sick / Quarantine" value={fmtNum((totals.sick||0)+(totals.quarantine||0))} sub="Needs attention" icon={<AlertTriangle className="w-5 h-5"/>} color="text-red-600" bg="bg-red-100" onClick={()=>{setFHealth('Sick');mt('records');}}/>
<StatCard label="Registered Farms" value={fmtNum(livestock.length)} sub="All farm types" icon={<Users className="w-5 h-5"/>} color="text-purple-600" bg="bg-purple-100"/>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="font-bold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[#2B5EA6]"/>By Animal Type</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={32} label={({name,percent})=>`${(percent*100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((_,i)=><Cell key={i} fill={Object.values(TYPE_COLOR)[i]||PIE_COLORS[i%PIE_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v:any,n:any)=>[fmtNum(v),n]}/>
                  <Legend/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-green-600"/>Health Status</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={healthPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={32} label={({name,percent})=>`${(percent*100).toFixed(0)}%`} labelLine={false}>
                    {healthPie.map((d,i)=><Cell key={i} fill={d.fill}/>)}
                  </Pie>
                  <Tooltip formatter={(v:any,n:any)=>[fmtNum(v),n]}/>
                  <Legend/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="font-bold text-gray-800 mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-purple-600"/>Top Barangays</p>
              <div className="space-y-2.5">
                {(summary?.byBarangay||[]).slice(0,7).map(b=>{
                  const t=parseInt(b.total||'0');
                  const mx=parseInt(summary?.byBarangay?.[0]?.total||'1');
                  return (
                    <div key={b.barangay}>
                      <div className="flex justify-between text-xs mb-0.5"><span className="font-semibold text-gray-700 truncate">{b.barangay}</span><span className="text-gray-500 ml-2 shrink-0">{fmtNum(t)}</span></div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-[#2B5EA6] to-[#60A85C] rounded-full" style={{width:`${(t/mx)*100}%`}}/></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Stacked bar chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="font-bold text-gray-800 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#2B5EA6]"/>Livestock by Barangay — Top 8</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topBrgy} margin={{left:-10}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="name" tick={{fontSize:10}}/>
                <YAxis tick={{fontSize:10}} allowDecimals={false}/>
                <Tooltip formatter={(v:any,n:any)=>[fmtNum(v),n]}/>
                <Legend/>
                <Bar dataKey="cattle"  name="Cattle"  stackId="a" fill="#2B5EA6"/>
                <Bar dataKey="swine"   name="Swine"   stackId="a" fill="#f59e0b"/>
                <Bar dataKey="poultry" name="Poultry" stackId="a" fill="#e68a00"/>
                <Bar dataKey="goats"   name="Goats"   stackId="a" fill="#8b5cf6"/>
                <Bar dataKey="horse"   name="Horse"   stackId="a" fill="#b45309"/>
                <Bar dataKey="carabao" name="Carabao" stackId="a" fill="#6b7280" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ══ RECORDS ══ */}
      {tab==='records'&&(
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[180px] relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/><input placeholder="Search owner, ID, breed, tag…" value={search} onChange={e=>setSearch(e.target.value)} className={`${INPUT} pl-9`}/></div>
              <select value={fType} onChange={e=>setFType(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white">
                <option value="all">All Types</option>{ANIMAL_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
              <select value={fBrgy} onChange={e=>setFBrgy(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white">
                <option value="all">All Barangays</option>{CALACA_BARANGAYS.map(b=><option key={b}>{b}</option>)}
              </select>
              <select value={fHealth} onChange={e=>setFHealth(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white">
                <option value="all">All Health</option>{HEALTH_STATUSES.map(s=><option key={s}>{s}</option>)}
              </select>
              <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 bg-[#60A85C] text-white rounded-xl text-sm font-semibold hover:bg-[#4a8a47]"><Download className="w-4 h-4"/>Export CSV</button>
            </div>
            <p className="text-xs text-gray-400 mt-2">{filteredLivestock.length} of {livestock.length} records</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {['ID','Animal','Qty','Owner','Barangay','Health','Farm Type','Last Checkup','Actions'].map(h=><th key={h} className="text-left py-3 px-3 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredLivestock.map(l=>(
                    <tr key={l.id} className={`hover:bg-blue-50/30 transition-colors ${l.health_status==='Quarantine'?'bg-amber-50/30':l.health_status==='Sick'?'bg-red-50/20':''}`}>
                      <td className="py-3 px-3"><p className="text-xs font-bold font-mono text-gray-600">{l.id}</p>{l.tag_number&&<p className="text-xs text-gray-400">{l.tag_number}</p>}</td>
                      <td className="py-3 px-3"><div className="flex items-center gap-2"><span className="text-xs font-bold text-gray-500">{l.animal_type.charAt(0)}</span><div><p className="font-semibold text-gray-800">{l.animal_type}</p><p className="text-xs text-gray-500">{l.breed||'—'}</p></div></div></td>
                      <td className="py-3 px-3 font-black text-gray-900 text-base">{fmtNum(l.quantity)}</td>
                      <td className="py-3 px-3"><p className="font-semibold text-gray-800 text-sm">{l.owner_name}</p><p className="text-xs text-gray-500">{l.contact_number||'—'}</p></td>
                      <td className="py-3 px-3 text-sm text-gray-600 whitespace-nowrap">{l.barangay}</td>
                      <td className="py-3 px-3"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white whitespace-nowrap" style={{background:HEALTH_COLOR[l.health_status]||'#374151'}}>{l.health_status}</span></td>
<td className="py-3 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${(l as any).farm_type==='Commercial Farm'?'bg-blue-100 text-blue-700':(l as any).farm_type==='Semi-Commercial'?'bg-purple-100 text-purple-700':'bg-amber-100 text-amber-700'}`}>{(l as any).farm_type||'Backyard'}</span></td>
                      <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(l.last_checkup_date)}</td>
                      <td className="py-3 px-3"><div className="flex gap-1">
                        <button onClick={()=>setViewItem(l)} className="px-2.5 py-1.5 bg-[#2B5EA6] text-white text-xs font-semibold rounded-lg hover:bg-[#234a85] flex items-center gap-1"><Eye className="w-3 h-3"/>View</button>
                        <button onClick={()=>handleDelete(l.id)} className="px-2.5 py-1.5 bg-red-50 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100"><X className="w-3 h-3"/></button>
                      </div></td>
                    </tr>
                  ))}
                  {filteredLivestock.length===0&&<tr><td colSpan={9} className="py-12 text-center text-gray-400 text-sm">No livestock records found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══ HEALTH RECORDS (index) ══ */}
      {tab==='health'&&(
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
            <Info className="w-5 h-5 text-blue-500 shrink-0"/>
            <p className="text-sm text-blue-700">Click <strong>View</strong> on any livestock record to add and view its individual health records, vaccinations, and treatments.</p>
          </div>
          {livestock.filter(l=>l.last_checkup_date).sort((a,b)=>new Date(b.last_checkup_date!).getTime()-new Date(a.last_checkup_date!).getTime()).map(l=>(
            <div key={l.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:shadow-sm transition-all">
              <div className="flex items-center gap-3">
  <span className="text-2xl">{TYPE_ICON[l.animal_type]||l.animal_type.charAt(0)}</span>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{l.animal_type} · {l.breed||'—'} <span className="font-mono text-gray-400 text-xs">({l.id})</span></p>
                  <p className="text-xs text-gray-500">{l.owner_name} · {l.barangay}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right"><p className="text-xs text-gray-400">Last checkup</p><p className="text-sm font-semibold text-gray-700">{fmtDate(l.last_checkup_date)}</p></div>
                <button onClick={()=>{setViewItem(l);}} className="px-3 py-1.5 bg-[#2B5EA6] text-white text-xs font-bold rounded-lg hover:bg-[#234a85] flex items-center gap-1"><FileText className="w-3 h-3"/>Records</button>
              </div>
            </div>
          ))}
          {livestock.filter(l=>l.last_checkup_date).length===0&&<div className="text-center py-10 text-gray-400"><Stethoscope className="w-8 h-8 mx-auto mb-2 opacity-30"/><p className="text-sm">No checkup records yet</p></div>}
        </div>
      )}

      {/* ══ DISEASE EVENTS ══ */}
      {tab==='disease'&&(
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={()=>setShowDF(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600"><Plus className="w-4 h-4"/>Report Disease</button>
          </div>
          {showDF&&(
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
              <p className="font-bold text-amber-800 flex items-center gap-2"><TriangleAlert className="w-4 h-4"/>Report Disease Alert</p>
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Animal Type *" value={df.animalType} onChange={(v:string)=>setDf(p=>({...p,animalType:v}))} options={['',...ANIMAL_TYPES]}/>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Disease / Condition *</label><input value={df.disease} onChange={e=>setDf(p=>({...p,disease:e.target.value}))} className={INPUT} placeholder="e.g., ASF, Newcastle Disease"/></div>
                <SelectField label="Barangay *" value={df.barangay} onChange={(v:string)=>setDf(p=>({...p,barangay:v}))} options={['',...CALACA_BARANGAYS]}/>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Date Reported</label><input type="date" value={df.dateReported} onChange={e=>setDf(p=>({...p,dateReported:e.target.value}))} className={INPUT}/></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Cases (heads)</label><input type="number" min="0" value={df.cases} onChange={e=>setDf(p=>({...p,cases:e.target.value}))} className={INPUT}/></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Deaths</label><input type="number" min="0" value={df.deaths} onChange={e=>setDf(p=>({...p,deaths:e.target.value}))} className={INPUT}/></div>
                <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label><textarea value={df.notes} onChange={e=>setDf(p=>({...p,notes:e.target.value}))} rows={2} className={INPUT+' resize-none'}/></div>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setShowDF(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
                <button onClick={handleAddDisease} disabled={!df.animalType||!df.disease||!df.barangay||saving}
                  className="flex-1 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving?<><RefreshCw className="w-3.5 h-3.5 animate-spin"/>Saving…</>:'Submit Alert'}
                </button>
              </div>
            </div>
          )}
          {disease.length===0?<div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-10 text-center"><Shield className="w-8 h-8 text-gray-200 mx-auto mb-2"/><p className="text-sm text-gray-400">No disease events recorded</p></div>
          :disease.map(e=>(
            <div key={e.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${e.status==='Active'?'border-red-200':'border-gray-100'}`}>
              <div className={`h-1.5 ${e.status==='Active'?'bg-gradient-to-r from-red-500 to-orange-400':'bg-gradient-to-r from-green-500 to-emerald-400'}`}/>
              <div className="p-5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
<div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 ${e.status==='Active'?'bg-red-100':'bg-green-100'}`}>{TYPE_ICON[e.animal_type]||e.animal_type.charAt(0)}</div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${e.status==='Active'?'bg-red-100 text-red-700':'bg-green-100 text-green-700'}`}>{e.status}</span>
                      <span className="text-xs text-gray-400 font-mono">{e.id}</span>
                    </div>
                    <p className="font-bold text-gray-900">{e.disease}</p>
                    <p className="text-sm text-gray-600">{e.animal_type} · {e.barangay}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Cases: <strong>{e.cases}</strong> · Deaths: <strong className="text-red-600">{e.deaths}</strong> · {fmtDate(e.date_reported)}</p>
                    {e.notes&&<p className="text-xs text-gray-500 mt-1 italic">{e.notes}</p>}
                  </div>
                </div>
                {e.status==='Active'&&<button onClick={()=>handleResolveDisease(e.id,e)} className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 shrink-0 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5"/>Resolve</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ MORTALITY ══ */}
      {tab==='mortality'&&(
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={()=>setShowMF(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700"><Plus className="w-4 h-4"/>Report Mortality</button>
          </div>
          {showMF&&(
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-3">
              <p className="font-bold text-red-800 flex items-center gap-2"><Skull className="w-4 h-4"/>Report Livestock Mortality</p>
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Animal Type *" value={mf.animalType} onChange={(v:string)=>setMf(p=>({...p,animalType:v}))} options={['',...ANIMAL_TYPES]}/>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Breed</label><input value={mf.breed} onChange={e=>setMf(p=>({...p,breed:e.target.value}))} className={INPUT} placeholder="Optional"/></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Owner Name *</label><input value={mf.ownerName} onChange={e=>setMf(p=>({...p,ownerName:e.target.value}))} className={INPUT}/></div>
                <SelectField label="Barangay *" value={mf.barangay} onChange={(v:string)=>setMf(p=>({...p,barangay:v}))} options={['',...CALACA_BARANGAYS]}/>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Quantity Dead *</label><input type="number" min="1" value={mf.quantity} onChange={e=>setMf(p=>({...p,quantity:e.target.value}))} className={INPUT}/></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Date Reported</label><input type="date" value={mf.dateReported} onChange={e=>setMf(p=>({...p,dateReported:e.target.value}))} className={INPUT}/></div>
                <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1.5">Cause of Death *</label><input value={mf.cause} onChange={e=>setMf(p=>({...p,cause:e.target.value}))} className={INPUT} placeholder="Disease, accident, unknown…"/></div>
                <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label><textarea value={mf.notes} onChange={e=>setMf(p=>({...p,notes:e.target.value}))} rows={2} className={INPUT+' resize-none'}/></div>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setShowMF(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
                <button onClick={handleAddMortality} disabled={!mf.animalType||!mf.ownerName||!mf.barangay||!mf.cause||saving}
                  className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving?<><RefreshCw className="w-3.5 h-3.5 animate-spin"/>Saving…</>:'Submit Report'}
                </button>
              </div>
            </div>
          )}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {mortality.length===0?<div className="py-10 text-center"><Skull className="w-8 h-8 text-gray-200 mx-auto mb-2"/><p className="text-sm text-gray-400">No mortality records</p></div>
            :<table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-100">{['Type','Breed','Owner','Barangay','Qty Dead','Cause','Date','Status'].map(h=><th key={h} className="text-left py-3 px-3 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {mortality.map(m=>(
                  <tr key={m.id} className="hover:bg-red-50/20">
                    <td className="py-3 px-3 text-sm font-semibold">{m.animal_type}</td>
                    <td className="py-3 px-3 text-sm text-gray-600">{m.breed||'—'}</td>
                    <td className="py-3 px-3 text-sm text-gray-700">{m.owner_name}</td>
                    <td className="py-3 px-3 text-sm text-gray-600 whitespace-nowrap">{m.barangay}</td>
                    <td className="py-3 px-3 font-black text-red-600 text-base">{m.quantity}</td>
                    <td className="py-3 px-3 text-xs text-gray-700 max-w-[160px] truncate">{m.cause}</td>
                    <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(m.date_reported)}</td>
                    <td className="py-3 px-3"><span className={`px-2 py-0.5 text-xs font-bold rounded-full ${m.investigation_status==='Ongoing'?'bg-amber-100 text-amber-700':m.investigation_status==='Closed'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>{m.investigation_status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>}
          </div>
        </div>
      )}

      {/* Modals */}
      {showReg&&<RegisterModal onClose={()=>setShowReg(false)} onSave={handleRegister}/>}
      {viewItem&&<DetailModal item={viewItem} onClose={()=>setViewItem(null)} onUpdate={loadAll}/>}
    </div>
  );
}
