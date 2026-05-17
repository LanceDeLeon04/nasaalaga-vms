import { useState, useEffect, useRef } from 'react';
import {
  FlaskConical, Package, Plus, Search, Edit2, Trash2, AlertTriangle,
  CheckCircle, BarChart2, RefreshCw, X, Barcode, Calendar, Thermometer,
  Building2, Hash, ChevronDown, TrendingDown, TrendingUp, ShieldAlert
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { api } from '../lib/api';
import type { UserRole } from '../App';

interface Props { userRole: UserRole }

const COLORS = ['#2B5EA6', '#60A85C', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

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
  if (days <= 90) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">Exp. soon ({days}d)</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600">{d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>;
}

const MEDICINE_CATEGORIES = ['Vaccine', 'Antibiotic', 'Antiparasitic', 'Vitamin', 'Analgesic', 'Antifungal', 'Other'];
const SUPPLY_CATEGORIES = ['Medical Supplies', 'PPE', 'Diagnostic', 'Cold Chain', 'Wound Care', 'Disinfectant', 'Other'];

function MedicineModal({ item, onClose, onSave }: { item?: any; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState(item ? {
    name: item.name, genericName: item.generic_name || '', category: item.category,
    type: item.type || '', lotNumber: item.lot_number || '', expiryDate: item.expiry_date?.split('T')[0] || '',
    manufactureDate: item.manufacture_date?.split('T')[0] || '', manufacturer: item.manufacturer || '',
    quantity: item.quantity, unit: item.unit || 'vials', reorderLevel: item.reorder_level,
    unitCost: item.unit_cost, storageCondition: item.storage_condition || '', description: item.description || '',
    barcode: item.barcode || '', status: item.status || 'Active'
  } : {
    name: '', genericName: '', category: 'Vaccine', type: '', lotNumber: '', expiryDate: '',
    manufactureDate: '', manufacturer: '', quantity: 0, unit: 'vials', reorderLevel: 10,
    unitCost: 0, storageCondition: '', description: '', barcode: '', status: 'Active'
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-[#2B5EA6]" />
            {item ? 'Edit Medicine / Vitamin' : 'Add Medicine / Vitamin'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
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
            { label: 'Unit Cost (₱)', key: 'unitCost', type: 'number', step: '0.01', col: 1 },
            { label: 'Storage Condition', key: 'storageCondition', col: 2 },
            { label: 'Description', key: 'description', col: 2 },
          ].map(({ label, key, col, type, step }: any) => (
            <div key={key} className={col === 2 ? 'col-span-2' : ''}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
              <input
                type={type || 'text'}
                step={step}
                value={(form as any)[key]}
                onChange={e => set(key, type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2B5EA6]/30 focus:border-[#2B5EA6] outline-none"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2B5EA6]/30 outline-none">
              {MEDICINE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Type / Subtype</label>
            <input value={form.type} onChange={e => set('type', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2B5EA6]/30 outline-none" />
          </div>
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

function SupplyModal({ item, onClose, onSave }: { item?: any; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState(item ? {
    name: item.name, category: item.category, type: item.type || '',
    quantity: item.quantity, unit: item.unit || 'pieces', reorderLevel: item.reorder_level,
    unitCost: item.unit_cost, supplier: item.supplier || '',
    lastRestocked: item.last_restocked?.split('T')[0] || '',
    description: item.description || '', barcode: item.barcode || '', status: item.status || 'Active'
  } : {
    name: '', category: 'Medical Supplies', type: '', quantity: 0, unit: 'pieces',
    reorderLevel: 5, unitCost: 0, supplier: '', lastRestocked: '', description: '', barcode: '', status: 'Active'
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-[#60A85C]" />
            {item ? 'Edit Supply' : 'Add Supply'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Supply Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#60A85C]/30 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
              {SUPPLY_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
            <input value={form.type} onChange={e => set('type', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          {[
            { label: 'Barcode', key: 'barcode', col: 1 },
            { label: 'Supplier', key: 'supplier', col: 1 },
            { label: 'Quantity', key: 'quantity', type: 'number', col: 1 },
            { label: 'Unit', key: 'unit', col: 1 },
            { label: 'Reorder Level', key: 'reorderLevel', type: 'number', col: 1 },
            { label: 'Unit Cost (₱)', key: 'unitCost', type: 'number', step: '0.01', col: 1 },
            { label: 'Last Restocked', key: 'lastRestocked', type: 'date', col: 2 },
            { label: 'Description', key: 'description', col: 2 },
          ].map(({ label, key, col, type, step }: any) => (
            <div key={key} className={col === 2 ? 'col-span-2' : ''}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
              <input
                type={type || 'text'}
                step={step}
                value={(form as any)[key]}
                onChange={e => set(key, type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#60A85C]/30 outline-none"
              />
            </div>
          ))}
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

export function InventoryPage({ userRole }: Props) {
  const [tab, setTab] = useState<'overview' | 'medicines' | 'supplies'>('overview');
  const [medicines, setMedicines] = useState<any[]>([]);
  const [supplies, setSupplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [showMedModal, setShowMedModal] = useState(false);
  const [showSupModal, setShowSupModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeRef = useRef<HTMLInputElement>(null);

  const canEdit = userRole === 'admin' || userRole === 'superadmin';

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [medRes, supRes] = await Promise.all([api.getMedicines(), api.getSupplies()]);
      setMedicines(medRes.medicines || []);
      setSupplies(supRes.supplies || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // Barcode lookup
  const handleBarcodeSearch = () => {
    if (!barcodeInput.trim()) return;
    const found = [...medicines, ...supplies].find((i: any) => i.barcode === barcodeInput.trim());
    if (found) {
      setSearch(found.name);
      setTab(medicines.find((m: any) => m.barcode === barcodeInput.trim()) ? 'medicines' : 'supplies');
    } else {
      alert(`No item found with barcode: ${barcodeInput}`);
    }
    setBarcodeInput('');
  };

  const handleSaveMedicine = async (data: any) => {
    try {
      if (editItem) {
        await api.updateMedicine(editItem.id, data);
      } else {
        await api.createMedicine(data);
      }
      await loadData();
      setShowMedModal(false);
      setEditItem(null);
    } catch (e: any) { alert('Error: ' + e.message); }
  };

  const handleSaveSupply = async (data: any) => {
    try {
      if (editItem) {
        await api.updateSupply(editItem.id, data);
      } else {
        await api.createSupply(data);
      }
      await loadData();
      setShowSupModal(false);
      setEditItem(null);
    } catch (e: any) { alert('Error: ' + e.message); }
  };

  const handleDeleteMedicine = async (id: string) => {
    if (!confirm('Delete this medicine?')) return;
    try { await api.deleteMedicine(id); await loadData(); } catch (e: any) { alert('Error: ' + e.message); }
  };

  const handleDeleteSupply = async (id: string) => {
    if (!confirm('Delete this supply?')) return;
    try { await api.deleteSupply(id); await loadData(); } catch (e: any) { alert('Error: ' + e.message); }
  };

  // Computed stats
  const totalMedValue = medicines.reduce((s, m) => s + (m.quantity * m.unit_cost), 0);
  const totalSupValue = supplies.reduce((s, s2) => s + (s2.quantity * s2.unit_cost), 0);
  const lowStockMeds = medicines.filter(m => m.quantity <= m.reorder_level && m.quantity > 0).length;
  const outOfStockMeds = medicines.filter(m => m.quantity === 0).length;
  const lowStockSups = supplies.filter(s => s.quantity <= s.reorder_level && s.quantity > 0).length;
  const expiringSoon = medicines.filter(m => {
    if (!m.expiry_date) return false;
    const days = Math.ceil((new Date(m.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 90;
  }).length;
  const expired = medicines.filter(m => m.expiry_date && new Date(m.expiry_date) < new Date()).length;

  // Chart data
  const medByCat = MEDICINE_CATEGORIES.map(cat => ({
    name: cat,
    count: medicines.filter(m => m.category === cat).length,
    value: medicines.filter(m => m.category === cat).reduce((s, m) => s + m.quantity, 0),
  })).filter(c => c.count > 0);

  const supByCat = SUPPLY_CATEGORIES.map(cat => ({
    name: cat,
    count: supplies.filter(s => s.category === cat).length,
    qty: supplies.filter(s => s.category === cat).reduce((s2, s3) => s2 + s3.quantity, 0),
  })).filter(c => c.count > 0);

  const filteredMeds = medicines.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || (m.barcode || '').includes(search);
    const matchCat = catFilter === 'All' || m.category === catFilter;
    return matchSearch && matchCat;
  });

  const filteredSups = supplies.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || (s.barcode || '').includes(search);
    const matchCat = catFilter === 'All' || s.category === catFilter;
    return matchSearch && matchCat;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-[#2B5EA6] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <FlaskConical className="w-7 h-7 text-[#2B5EA6]" /> Inventory Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">Calaca CVO · Medicines, Vitamins & Supplies</p>
        </div>
        <div className="flex gap-2">
          {/* Barcode scanner input */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 shadow-sm">
            <Barcode className="w-4 h-4 text-gray-400" />
            <input
              ref={barcodeRef}
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleBarcodeSearch()}
              placeholder="Scan barcode..."
              className="text-sm py-2 outline-none w-36"
            />
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

      {/* Alert banners */}
      {(expiringSoon > 0 || expired > 0 || outOfStockMeds > 0) && (
        <div className="flex flex-col gap-2">
          {expired > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 text-red-700">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-semibold">{expired} medicine item(s) have expired — please remove or replace immediately.</span>
            </div>
          )}
          {expiringSoon > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 text-amber-700">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-semibold">{expiringSoon} medicine(s) expiring within 90 days — review and reorder.</span>
            </div>
          )}
          {outOfStockMeds > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3 text-orange-700">
              <TrendingDown className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-semibold">{outOfStockMeds} medicine(s) are out of stock — immediate restock needed.</span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {([
            { id: 'overview', label: 'Overview', icon: BarChart2 },
            { id: 'medicines', label: `Medicines & Vitamins (${medicines.length})`, icon: FlaskConical },
            { id: 'supplies', label: `Supplies (${supplies.length})`, icon: Package },
          ] as any[]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setSearch(''); setCatFilter('All'); }}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-all ${
                tab === id
                  ? 'text-[#2B5EA6] border-b-2 border-[#2B5EA6] bg-blue-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="p-6 space-y-6">
            {/* KPI Cards */}
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

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FlaskConical className="w-4 h-4 text-[#2B5EA6]" /> Medicines by Category</h3>
                <ResponsiveContainer width="100%" height={220}>
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
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={supByCat} dataKey="qty" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {supByCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Critical items */}
            <div>
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Items Needing Attention</h3>
              <div className="space-y-2">
                {[
                  ...medicines.filter(m => m.quantity <= m.reorder_level || (m.expiry_date && new Date(m.expiry_date) <= new Date(Date.now() + 90 * 24 * 3600 * 1000))),
                  ...supplies.filter(s => s.quantity <= s.reorder_level),
                ].slice(0, 8).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      {item.lot_number ? <FlaskConical className="w-4 h-4 text-[#2B5EA6]" /> : <Package className="w-4 h-4 text-[#60A85C]" />}
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.category} · Qty: {item.quantity} {item.unit}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge qty={item.quantity} reorder={item.reorder_level} />
                      {item.expiry_date && <ExpiryBadge date={item.expiry_date} />}
                    </div>
                  </div>
                ))}
                {medicines.filter(m => m.quantity <= m.reorder_level).length + supplies.filter(s => s.quantity <= s.reorder_level).length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    All items are adequately stocked!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MEDICINES TAB */}
        {tab === 'medicines' && (
          <div className="p-6 space-y-4">
            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or barcode..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2B5EA6]/30 outline-none"
                />
              </div>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                <option value="All">All Categories</option>
                {MEDICINE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Lot #</th>
                    <th className="px-4 py-3 text-left">Barcode</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-left">Expiry</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Cost</th>
                    {canEdit && <th className="px-4 py-3 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredMeds.map((m: any) => (
                    <tr key={m.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{m.name}</p>
                        <p className="text-xs text-gray-500">{m.generic_name}</p>
                        <p className="text-xs text-gray-400">{m.manufacturer}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">{m.category}</span>
                        {m.type && <p className="text-xs text-gray-500 mt-1">{m.type}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{m.lot_number || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-gray-600">{m.barcode || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-gray-900">{m.quantity}</span>
                        <span className="text-gray-400 text-xs"> {m.unit}</span>
                        <p className="text-xs text-gray-400">min: {m.reorder_level}</p>
                      </td>
                      <td className="px-4 py-3"><ExpiryBadge date={m.expiry_date} /></td>
                      <td className="px-4 py-3 text-center"><StatusBadge qty={m.quantity} reorder={m.reorder_level} /></td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-sm font-semibold text-gray-900">₱{Number(m.unit_cost).toFixed(2)}</p>
                        <p className="text-xs text-gray-400">Total: ₱{(m.quantity * m.unit_cost).toLocaleString('en-PH', { maximumFractionDigits: 0 })}</p>
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => { setEditItem(m); setShowMedModal(true); }} className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-600">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteMedicine(m.id)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredMeds.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <FlaskConical className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No medicines found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUPPLIES TAB */}
        {tab === 'supplies' && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or barcode..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#60A85C]/30 outline-none"
                />
              </div>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                <option value="All">All Categories</option>
                {SUPPLY_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Barcode</th>
                    <th className="px-4 py-3 text-left">Supplier</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-left">Last Restocked</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Unit Cost</th>
                    {canEdit && <th className="px-4 py-3 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredSups.map((s: any) => (
                    <tr key={s.id} className="hover:bg-green-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.type}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700">{s.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-gray-600">{s.barcode || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{s.supplier || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-gray-900">{s.quantity}</span>
                        <span className="text-gray-400 text-xs"> {s.unit}</span>
                        <p className="text-xs text-gray-400">min: {s.reorder_level}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {s.last_restocked ? new Date(s.last_restocked).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center"><StatusBadge qty={s.quantity} reorder={s.reorder_level} /></td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-sm font-semibold text-gray-900">₱{Number(s.unit_cost).toFixed(2)}</p>
                        <p className="text-xs text-gray-400">Total: ₱{(s.quantity * s.unit_cost).toLocaleString('en-PH', { maximumFractionDigits: 0 })}</p>
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => { setEditItem(s); setShowSupModal(true); }} className="p-1.5 hover:bg-green-100 rounded-lg text-green-600">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteSupply(s.id)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredSups.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No supplies found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showMedModal && (
        <MedicineModal
          item={editItem}
          onClose={() => { setShowMedModal(false); setEditItem(null); }}
          onSave={handleSaveMedicine}
        />
      )}
      {showSupModal && (
        <SupplyModal
          item={editItem}
          onClose={() => { setShowSupModal(false); setEditItem(null); }}
          onSave={handleSaveSupply}
        />
      )}
    </div>
  );
}
