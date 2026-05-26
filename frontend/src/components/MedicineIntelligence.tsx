import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import {
  Pill, TrendingUp, AlertTriangle, Activity, Package,
  ArrowUpRight, BarChart3, RefreshCw, Download, Bell,
  CheckCircle, X, Truck, Eye, ChevronRight, Zap, ShieldAlert,
  MapPin, Clock, Layers, Filter, Info,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface StockItem {
  id: string; name: string; category: string;
  quantity: number; reorder_level: number; unit: string;
  expiry_date?: string; unit_cost?: number; stock_status: string;
}
interface TopMedicine {
  medicine_id: string; medicine_name: string; category: string;
  total_qty: number; barangay_count: number; last_used?: string;
}
interface BarangayRank {
  barangay: string; total_qty: number; medicine_types: number; last_used?: string;
}
interface FastMover {
  medicine_id: string; medicine_name: string; category: string;
  barangay: string; barangay_qty: number; avg_per_barangay: number;
  ratio: number; sources: string[]; last_used?: string;
}
interface UsageRow {
  medicine_id: string; medicine_name: string; category: string;
  barangay: string; total_qty: number; sources: string[]; last_used?: string;
}
interface Notif { id: number; title: string; body: string; type: "success"|"warning"|"info"; }

let nid = 0;

// ─── STATUS META ─────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { bar: string; badge: string; text: string }> = {
  critical: { bar: "#ef4444", badge: "#fef2f2", text: "#b91c1c" },
  high:     { bar: "#f97316", badge: "#fff7ed", text: "#9a3412" },
  medium:   { bar: "#f59e0b", badge: "#fffbeb", text: "#92400e" },
  normal:   { bar: "#22c55e", badge: "#f0fdf4", text: "#15803d" },
};

const BAR_COLORS = ["#7c3aed","#6d28d9","#5b21b6","#4c1d95","#3b0764","#8b5cf6","#a78bfa"];

function getRatioStatus(ratio: number) {
  if (ratio >= 3) return "critical";
  if (ratio >= 2) return "high";
  if (ratio >= 1.8) return "medium";
  return "normal";
}

function sourceLabel(s: string) {
  const map: Record<string,string> = {
    pet_vaccination: "Pet Vaccination",
    manual: "Manual Release",
    outbreak_dispatch: "Outbreak Dispatch",
    livestock_treatment: "Livestock Treatment",
    dispense: "Dispensed",
    dispense_pet: "Pet Dispense",
    dispense_livestock: "Livestock Dispense",
  };
  return map[s] || s;
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function ToastStack({ notifs, onDismiss }: { notifs: Notif[]; onDismiss: (id:number)=>void }) {
  if (!notifs.length) return null;
  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 w-80 pointer-events-none">
      {notifs.map(n => (
        <div key={n.id} className="pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border"
          style={{ background: n.type==="success"?"#f0fdf4":n.type==="warning"?"#fffbeb":"#f5f3ff",
            borderColor: n.type==="success"?"#86efac":n.type==="warning"?"#fcd34d":"#c4b5fd",
            animation:"slideIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${n.type==="success"?"bg-green-500":n.type==="warning"?"bg-amber-500":"bg-violet-600"}`}>
            {n.type==="success"?<CheckCircle className="w-4 h-4 text-white"/>:n.type==="warning"?<AlertTriangle className="w-4 h-4 text-white"/>:<Bell className="w-4 h-4 text-white"/>}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-sm ${n.type==="success"?"text-green-800":n.type==="warning"?"text-amber-800":"text-violet-800"}`}>{n.title}</p>
            <p className={`text-xs mt-0.5 leading-relaxed ${n.type==="success"?"text-green-600":n.type==="warning"?"text-amber-700":"text-violet-600"}`}>{n.body}</p>
          </div>
          <button onClick={()=>onDismiss(n.id)} className="text-slate-400 hover:text-slate-600 shrink-0"><X className="w-4 h-4"/></button>
        </div>
      ))}
    </div>
  );
}

// ─── BARANGAY DETAIL MODAL ────────────────────────────────────────────────────
function BarangayDetailModal({ barangay, usageRows, onClose }: {
  barangay: BarangayRank; usageRows: UsageRow[]; onClose: ()=>void;
}) {
  const rows = usageRows.filter(r => r.barangay === barangay.barangay)
    .sort((a,b) => b.total_qty - a.total_qty);
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-[#4c1d95] to-[#7c3aed] px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white"/>
            </div>
            <div>
              <p className="font-bold text-white">{barangay.barangay}</p>
              <p className="text-white/70 text-xs">Medicine Usage Detail</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <div className="overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-violet-700">{barangay.total_qty}</p>
              <p className="text-xs text-violet-500 font-semibold mt-0.5">Total Doses</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-slate-700">{barangay.medicine_types}</p>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">Medicine Types</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-green-700">{rows.length}</p>
              <p className="text-xs text-green-500 font-semibold mt-0.5">Records</p>
            </div>
          </div>
          <p className="font-bold text-slate-800 text-sm">All Medicines Used</p>
          <div className="space-y-2">
            {rows.length === 0 ? (
              <p className="text-sm text-slate-400 italic text-center py-4">No detailed data available</p>
            ) : rows.map((r, i) => (
              <div key={i} className="flex items-start justify-between gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{r.medicine_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{r.category}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {[...new Set(r.sources)].map((s,si) => (
                      <span key={si} className="px-1.5 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-semibold rounded-md">
                        {sourceLabel(s as string)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xl font-black text-violet-700">{r.total_qty}</p>
                  <p className="text-xs text-slate-400">doses</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FAST MOVER ALERT MODAL ───────────────────────────────────────────────────
function FastMoverModal({ item, stock, onClose, onInvestigate, onResupply }: {
  item: FastMover; stock: StockItem[]; onClose: ()=>void;
  onInvestigate: ()=>void; onResupply: ()=>void;
}) {
  const stockItem = stock.find(s => s.id === item.medicine_id || s.name === item.medicine_name);
  const status = getRatioStatus(item.ratio);
  const st = STATUS_COLORS[status];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-red-600 to-orange-500 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white"/>
            </div>
            <div>
              <p className="font-bold text-white">Fast-Moving Alert</p>
              <p className="text-white/70 text-xs">{item.barangay}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <div className="overflow-y-auto p-5 space-y-4">
          {/* Medicine info */}
          <div className="p-4 rounded-xl border" style={{ background: st.badge, borderColor: st.bar+"40" }}>
            <div className="flex items-center gap-2 mb-2">
              <Pill className="w-4 h-4" style={{ color: st.text }}/>
              <p className="font-bold text-sm" style={{ color: st.text }}>{item.medicine_name}</p>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border ml-auto capitalize"
                style={{ background: st.badge, color: st.text, borderColor: st.bar+"60" }}>
                {status} consumption
              </span>
            </div>
            <p className="text-xs" style={{ color: st.text }}>{item.category}</p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-red-600">{item.barangay_qty}</p>
              <p className="text-xs text-red-500 font-semibold mt-0.5">Used in {item.barangay}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-slate-600">{item.avg_per_barangay}</p>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">Avg/Barangay</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-orange-600">{item.ratio}x</p>
              <p className="text-xs text-orange-500 font-semibold mt-0.5">Above Average</p>
            </div>
          </div>

          {/* Stock status */}
          {stockItem && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Current Inventory</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-black text-slate-800">{stockItem.quantity} {stockItem.unit}</p>
                  <p className="text-xs text-slate-400">Reorder at {stockItem.reorder_level}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border
                  ${stockItem.stock_status === 'Adequate' ? 'bg-green-50 text-green-700 border-green-200' :
                    stockItem.stock_status === 'Low' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-red-50 text-red-700 border-red-200'}`}>
                  {stockItem.stock_status}
                </span>
              </div>
            </div>
          )}

          {/* Sources */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Usage Sources</p>
            <div className="flex flex-wrap gap-2">
              {[...new Set(item.sources)].map((s,i) => (
                <span key={i} className="px-3 py-1.5 bg-violet-50 border border-violet-200 text-violet-700 text-xs font-semibold rounded-lg">
                  {sourceLabel(s as string)}
                </span>
              ))}
            </div>
          </div>

          {/* Last used */}
          {item.last_used && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5"/>
              Last activity: {new Date(item.last_used).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50">
              Close
            </button>
            <button onClick={()=>{ onInvestigate(); onClose(); }}
              className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 flex items-center justify-center gap-2">
              <Eye className="w-4 h-4"/> Investigate
            </button>
            <button onClick={()=>{ onResupply(); onClose(); }}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 flex items-center justify-center gap-2">
              <Truck className="w-4 h-4"/> Resupply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── RESUPPLY MODAL ───────────────────────────────────────────────────────────
function ResupplyModal({ name, currentQty, unit, onClose, onConfirm }: {
  name: string; currentQty: number; unit: string;
  onClose: ()=>void; onConfirm: (qty:number)=>void;
}) {
  const [qty, setQty] = useState(Math.max(currentQty * 2, 50));
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#166534] to-[#16a34a] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Truck className="w-4 h-4 text-white"/>
            </div>
            <div>
              <p className="font-bold text-white text-sm">Order Resupply</p>
              <p className="text-white/60 text-xs truncate max-w-[160px]">{name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Order Quantity ({unit})</label>
            <input type="number" value={qty} onChange={e=>setQty(+e.target.value)} min={1}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500"/>
            <p className="text-xs text-slate-400 mt-1">Current stock: {currentQty} {unit}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50">Cancel</button>
            <button onClick={()=>{ onConfirm(qty); onClose(); }}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 flex items-center justify-center gap-2">
              <Truck className="w-4 h-4"/> Place Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function MedicineIntelligence({ onOrderFromIntel }: { onOrderFromIntel?: (prefill: any) => void } = {}) {
  type ViewType = "alerts" | "usage" | "trends";
  const [view, setView] = useState<ViewType>("alerts");
  const [periodDays, setPeriodDays] = useState(90);

  // DB data
  const [stock, setStock]           = useState<StockItem[]>([]);
  const [topMeds, setTopMeds]       = useState<TopMedicine[]>([]);
  const [barangayRank, setBarangayRank] = useState<BarangayRank[]>([]);
  const [fastMoving, setFastMoving] = useState<FastMover[]>([]);
  const [usageRows, setUsageRows]   = useState<UsageRow[]>([]);
  const [loading, setLoading]       = useState(true);

  // Modals
  const [barangayModal, setBarangayModal]   = useState<BarangayRank|null>(null);
  const [fastMoverModal, setFastMoverModal] = useState<FastMover|null>(null);
  const [resupplyModal, setResupplyModal]   = useState<{name:string;qty:number;unit:string;category?:string;stockItem?:StockItem}|null>(null);

  // Notifs
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const push = (title:string, body:string, type:Notif["type"]="success") => {
    const id = ++nid;
    setNotifs(p => [{ id, title, body, type }, ...p].slice(0, 4));
    setTimeout(() => setNotifs(p => p.filter(n => n.id !== id)), 5500);
  };

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.getDashboardMedicineIntel().catch(()=>null),
      (api as any).getDashboardMedicineUsageAnalytics(periodDays).catch(()=>null),
    ]).then(([intelRes, analyticsRes]) => {
      setStock(intelRes?.stock || []);
      setTopMeds(analyticsRes?.topMedicines || []);
      setBarangayRank(analyticsRes?.barangayRanking || []);
      setFastMoving(analyticsRes?.fastMoving || []);
      setUsageRows(analyticsRes?.usageByMedBarangay || []);
      setLoading(false);
    }).catch(()=>setLoading(false));
  }, [periodDays]);

  useEffect(() => { load(); }, [load]);

  const lowStock = stock.filter(m => m.stock_status === "Critical" || m.stock_status === "Out of Stock");
  const expiring = stock.filter(m => m.expiry_date && new Date(m.expiry_date) <= new Date(Date.now() + 90*86400000));

  const handleExport = () => {
    const rows = [
      ["Medicine","Barangay","Qty Used","Source","Category"],
      ...usageRows.map(r => [r.medicine_name, r.barangay, r.total_qty, [...new Set(r.sources)].join("|"), r.category]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const b = new Blob([csv], { type:"text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `Medicine_Usage_Analytics_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    push("Report Downloaded", "Medicine usage analytics CSV saved.", "info");
  };

  return (
    <>
      <style>{`@keyframes slideIn{from{transform:translateX(110%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      <ToastStack notifs={notifs} onDismiss={id=>setNotifs(p=>p.filter(n=>n.id!==id))}/>

      {barangayModal && (
        <BarangayDetailModal barangay={barangayModal} usageRows={usageRows} onClose={()=>setBarangayModal(null)}/>
      )}
      {fastMoverModal && (
        <FastMoverModal
          item={fastMoverModal} stock={stock}
          onClose={()=>setFastMoverModal(null)}
          onInvestigate={()=>push("Investigation Dispatched",`Field team assigned to ${fastMoverModal.barangay} for ${fastMoverModal.medicine_name}.`,"info")}
          onResupply={()=>setResupplyModal({name:fastMoverModal.medicine_name, qty:fastMoverModal.barangay_qty, unit:"doses"})}
        />
      )}
      {resupplyModal && (
        <ResupplyModal {...resupplyModal} onClose={()=>setResupplyModal(null)}
          onConfirm={async qty=>{
            if (onOrderFromIntel) {
              onOrderFromIntel({ itemName:resupplyModal.name, itemType:'medicine', quantity:qty, unit:resupplyModal.unit, source:'medicine_intel' });
              push("Order Form Opened",`Fill in the details for ${resupplyModal.name}.`,"info");
            } else {
              try {
                await (api as any).createPendingOrder({ itemName:resupplyModal.name, itemType:'medicine', quantity:qty, unit:resupplyModal.unit, source:'medicine_intel' });
                push("Pending Order Created",`${qty} ${resupplyModal.unit} of ${resupplyModal.name} added to Pending Orders.`,"success");
              } catch { push("Failed","Could not place order.","warning"); }
            }
          }}/>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-[#4c1d95] to-[#7c3aed] px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
                <Pill className="w-6 h-6 text-white"/>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Medicine Intelligence</h3>
                <p className="text-white/70 text-sm mt-0.5">Real inventory data · barangay-tagged usage · smart alerts</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select value={periodDays} onChange={e=>setPeriodDays(+e.target.value)}
                className="px-3 py-2 bg-white/15 border border-white/20 text-white text-xs font-semibold rounded-xl focus:outline-none">
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
                <option value={180}>6 months</option>
              </select>
              <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-semibold rounded-xl transition-all">
                <RefreshCw className="w-3.5 h-3.5"/> Refresh
              </button>
              <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-semibold rounded-xl transition-all">
                <Download className="w-3.5 h-3.5"/> Export
              </button>
            </div>
          </div>
          {/* Tab bar */}
          <div className="flex items-center justify-between mt-5">
            <div className="flex gap-1 bg-white/10 border border-white/20 p-1 rounded-xl">
              {(["alerts","usage","trends"] as ViewType[]).map(v => (
                <button key={v} onClick={()=>setView(v)}
                  className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={view===v?{background:"#fff",color:"#7c3aed",boxShadow:"0 2px 8px rgba(0,0,0,0.15)"}:{color:"rgba(255,255,255,0.7)"}}>
                  {v==="alerts"?"Inventory Alerts":v==="usage"?"Usage Analytics":"Trend Analysis"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {fastMoving.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/80 border border-red-400/60 rounded-xl">
                  <span className="w-2 h-2 rounded-full bg-red-200 animate-pulse"/>
                  <span className="text-white text-xs font-bold">{fastMoving.length} Fast Movers</span>
                </div>
              )}
              {lowStock.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/80 border border-orange-400/60 rounded-xl">
                  <span className="w-2 h-2 rounded-full bg-orange-200 animate-pulse"/>
                  <span className="text-white text-xs font-bold">{lowStock.length} Low Stock</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"/>
              <p className="text-slate-500 text-sm font-medium">Loading from database…</p>
            </div>
          ) : (
            <>
              {/* ══ ALERTS VIEW ══════════════════════════════════════════════ */}
              {view === "alerts" && (
                <div className="space-y-5">
                  {/* Fast-moving alerts banner */}
                  {fastMoving.length > 0 && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl">
                      <div className="w-8 h-8 bg-red-500 rounded-xl flex items-center justify-center shrink-0">
                        <Zap className="w-4 h-4 text-white"/>
                      </div>
                      <div>
                        <p className="font-bold text-red-800 text-sm">Smart Alert: Fast-Moving Medicines Detected</p>
                        <p className="text-xs text-red-600">
                          {fastMoving.length} medicine-barangay combinations with abnormal consumption. Click any alert to view details.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Fast-moving medicine alert cards */}
                  {fastMoving.length > 0 && (
                    <div className="space-y-3">
                      <p className="font-bold text-slate-700 text-sm flex items-center gap-2">
                        <Zap className="w-4 h-4 text-red-500"/> Fast-Moving Medicine Alerts by Barangay
                      </p>
                      {fastMoving.slice(0,10).map((fm, i) => {
                        const status = getRatioStatus(fm.ratio);
                        const st = STATUS_COLORS[status];
                        return (
                          <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                            onClick={()=>setFastMoverModal(fm)}>
                            <div className="h-1 rounded-t" style={{background:`linear-gradient(90deg,${st.bar},${st.bar}88)`}}/>
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{background:st.badge}}>
                                      <Pill className="w-3.5 h-3.5" style={{color:st.text}}/>
                                    </div>
                                    <p className="font-bold text-slate-800">{fm.medicine_name}</p>
                                    <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-semibold rounded-lg border border-violet-200 flex items-center gap-1">
                                      <MapPin className="w-3 h-3"/>{fm.barangay}
                                    </span>
                                    <span className="px-2 py-0.5 text-xs font-bold rounded-lg border capitalize" style={{background:st.badge,color:st.text,borderColor:st.bar+"40"}}>
                                      {status}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 mb-2">
                                    <div className="bg-red-50 border border-red-100 rounded-xl p-2 text-center">
                                      <p className="text-[10px] text-red-500 font-bold uppercase tracking-wide">Barangay Used</p>
                                      <p className="text-lg font-black text-red-600">{fm.barangay_qty}</p>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Avg/Barangay</p>
                                      <p className="text-lg font-black text-slate-600">{fm.avg_per_barangay}</p>
                                    </div>
                                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-2 text-center">
                                      <p className="text-[10px] text-orange-500 font-bold uppercase tracking-wide">Ratio</p>
                                      <p className="text-lg font-black text-orange-600">{fm.ratio}x</p>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {[...new Set(fm.sources)].map((s,si)=>(
                                      <span key={si} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-md">{sourceLabel(s as string)}</span>
                                    ))}
                                  </div>
                                </div>
                                <div className="shrink-0 flex flex-col items-end gap-2">
                                  <ChevronRight className="w-4 h-4 text-slate-400"/>
                                  <span className="text-xs text-slate-400">Click to view</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Low-stock inventory alerts */}
                  {lowStock.length > 0 && (
                    <div className="space-y-3">
                      <p className="font-bold text-slate-700 text-sm flex items-center gap-2">
                        <Package className="w-4 h-4 text-orange-500"/> Inventory Low-Stock Alerts
                      </p>
                      {lowStock.map((m, i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                          <div className={`h-1 ${m.quantity===0?"bg-red-500":"bg-orange-400"}`}/>
                          <div className="p-4 flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <p className="font-bold text-slate-800">{m.name}</p>
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-lg border ${m.quantity===0?"bg-red-50 text-red-700 border-red-200":"bg-orange-50 text-orange-700 border-orange-200"}`}>
                                  {m.stock_status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mb-2">{m.category}</p>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-slate-600">Stock: <strong className="text-red-600">{m.quantity} {m.unit}</strong></span>
                                <span className="text-slate-400">Reorder at: {m.reorder_level}</span>
                              </div>
                              {m.expiry_date && new Date(m.expiry_date) <= new Date(Date.now()+90*86400000) && (
                                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3"/> Expires: {new Date(m.expiry_date).toLocaleDateString('en-PH')}
                                </p>
                              )}
                            </div>
                            <button onClick={()=>setResupplyModal({name:m.name,qty:m.quantity,unit:m.unit})}
                              className="px-3 py-2 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 flex items-center gap-1.5 shrink-0">
                              <Truck className="w-3.5 h-3.5"/> Resupply
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {fastMoving.length === 0 && lowStock.length === 0 && (
                    <div className="text-center py-16">
                      <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3"/>
                      <p className="font-bold text-slate-600">No active alerts</p>
                      <p className="text-sm text-slate-400 mt-1">All medicine consumption patterns are normal</p>
                    </div>
                  )}
                </div>
              )}

              {/* ══ USAGE ANALYTICS VIEW ═════════════════════════════════════ */}
              {view === "usage" && (
                <div className="space-y-6">
                  {/* Stats row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label:"Total Doses Used", value:usageRows.reduce((s,r)=>s+r.total_qty,0), icon:Activity, color:"#7c3aed", bg:"#f5f3ff", border:"#ede9fe" },
                      { label:"Medicine Types", value:topMeds.length, icon:Pill, color:"#2563eb", bg:"#eff6ff", border:"#bfdbfe" },
                      { label:"Barangays", value:barangayRank.length, icon:MapPin, color:"#059669", bg:"#f0fdf4", border:"#bbf7d0" },
                      { label:"Fast Movers", value:fastMoving.length, icon:Zap, color:"#dc2626", bg:"#fef2f2", border:"#fecaca" },
                    ].map((s,i)=>(
                      <div key={i} className="rounded-2xl p-4 border" style={{background:s.bg,borderColor:s.border}}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{background:s.color}}>
                            <s.icon className="w-4 h-4 text-white"/>
                          </div>
                        </div>
                        <p className="text-2xl font-black" style={{color:s.color}}>{s.value}</p>
                        <p className="text-xs font-semibold mt-0.5" style={{color:s.color+"bb"}}>{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Top medicines chart */}
                  {topMeds.length > 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-violet-600"/>
                        <p className="font-bold text-slate-800 text-sm">Most Used Medicines (last {periodDays} days)</p>
                        <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">From DB</span>
                      </div>
                      <div className="p-5">
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={topMeds.slice(0,10)} margin={{top:5,right:5,left:0,bottom:60}}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                            <XAxis dataKey="medicine_name" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false} angle={-35} textAnchor="end"/>
                            <YAxis tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                            <Tooltip formatter={(v:any)=>[`${v} doses`,"Usage"]} contentStyle={{borderRadius:12,border:"1px solid #e2e8f0"}}/>
                            <Bar dataKey="total_qty" name="Total Used" radius={[6,6,0,0]}>
                              {topMeds.slice(0,10).map((_,i)=><Cell key={i} fill={BAR_COLORS[i%BAR_COLORS.length]}/>)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center">
                      <Info className="w-10 h-10 text-slate-300 mx-auto mb-3"/>
                      <p className="font-bold text-slate-500">No usage data yet</p>
                      <p className="text-sm text-slate-400 mt-1">Usage is recorded when medicines are dispensed via vaccinations, treatments, or outbreak dispatches.</p>
                    </div>
                  )}

                  {/* Barangay ranking */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-violet-600"/>
                      <p className="font-bold text-slate-800 text-sm">Medicine Consumption by Barangay</p>
                      <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">Click to view details</span>
                    </div>
                    <div className="p-5 space-y-3">
                      {barangayRank.length === 0 ? (
                        <p className="text-sm text-slate-400 italic text-center py-6">No barangay-tagged data available yet</p>
                      ) : barangayRank.map((item, i) => {
                        const max = barangayRank[0]?.total_qty || 1;
                        const pct = (item.total_qty / max) * 100;
                        const idx = i < 3 ? ["critical","high","medium"][i] : "normal";
                        const st = STATUS_COLORS[idx];
                        return (
                          <div key={item.barangay} className="flex items-center gap-3 cursor-pointer group" onClick={()=>setBarangayModal(item)}>
                            <div className="w-6 text-xs font-black text-slate-400 text-right shrink-0">#{i+1}</div>
                            <div className="w-28 text-sm font-semibold text-slate-700 truncate shrink-0 group-hover:text-violet-700 transition-colors">{item.barangay}</div>
                            <div className="flex-1 h-8 bg-slate-100 rounded-xl overflow-hidden relative">
                              <div className="h-full rounded-xl flex items-center justify-end pr-3 transition-all"
                                style={{width:`${pct}%`,background:`linear-gradient(90deg,${st.bar}bb,${st.bar})`}}>
                                <span className="text-white text-xs font-bold">{item.total_qty}</span>
                              </div>
                            </div>
                            <div className="shrink-0 flex items-center gap-1">
                              <span className="text-xs font-bold px-2.5 py-1 rounded-lg border" style={{background:st.badge,color:st.text,borderColor:st.bar+"40"}}>
                                {item.medicine_types} types
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-violet-500 transition-colors"/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Medicine breakdown table */}
                  {topMeds.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-violet-600"/>
                        <p className="font-bold text-slate-800 text-sm">Top Medicine Usage Details</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">#</th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Medicine</th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Category</th>
                              <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">Total Used</th>
                              <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">Barangays</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {topMeds.slice(0,15).map((m,i)=>(
                              <tr key={i} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 text-slate-400 font-bold text-xs">#{i+1}</td>
                                <td className="px-4 py-3 font-semibold text-slate-800">{m.medicine_name}</td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-semibold rounded-md">{m.category||"—"}</span>
                                </td>
                                <td className="px-4 py-3 text-right font-black text-violet-700">{m.total_qty}</td>
                                <td className="px-4 py-3 text-right text-slate-500 font-semibold">{m.barangay_count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══ TRENDS VIEW ══════════════════════════════════════════════ */}
              {view === "trends" && (
                <div className="space-y-5">
                  {/* Trend chart using real top meds */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <p className="font-bold text-slate-800">Medicine Consumption — Top 5 by Total Usage</p>
                      <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">Last {periodDays} days from DB</span>
                    </div>
                    {topMeds.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={topMeds.slice(0,5)} layout="vertical" margin={{top:5,right:30,left:120,bottom:5}}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                          <XAxis type="number" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                          <YAxis type="category" dataKey="medicine_name" tick={{fontSize:11,fill:"#475569"}} axisLine={false} tickLine={false} width={115}/>
                          <Tooltip formatter={(v:any)=>[`${v} doses`,"Usage"]} contentStyle={{borderRadius:12,border:"1px solid #e2e8f0"}}/>
                          <Bar dataKey="total_qty" name="Total Used" radius={[0,6,6,0]}>
                            {topMeds.slice(0,5).map((_,i)=><Cell key={i} fill={BAR_COLORS[i]}/>)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No usage data for selected period</div>
                    )}
                  </div>

                  {/* Fast-moving insights */}
                  {fastMoving.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {fastMoving.slice(0,4).map((fm,i)=>{
                        const status = getRatioStatus(fm.ratio);
                        const st = STATUS_COLORS[status];
                        const Icon = [Zap,TrendingUp,Activity,AlertTriangle][i%4];
                        return (
                          <div key={i} className="rounded-2xl p-4 border cursor-pointer hover:shadow-md transition-shadow"
                            style={{background:st.badge,borderColor:st.bar+"40"}}
                            onClick={()=>setFastMoverModal(fm)}>
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{background:st.bar}}>
                                <Icon className="w-5 h-5 text-white"/>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold mb-0.5" style={{color:st.text}}>{fm.medicine_name}</p>
                                <p className="text-xs mb-2" style={{color:st.text+"cc"}}>
                                  {fm.barangay} · {fm.ratio}x above average
                                </p>
                                <div className="flex items-center justify-between">
                                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold border capitalize"
                                    style={{background:"white",color:st.text,borderColor:st.bar+"40"}}>
                                    {status} consumption
                                  </span>
                                  <ChevronRight className="w-4 h-4" style={{color:st.text}}/>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {fastMoving.length === 0 && topMeds.length === 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center">
                      <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3"/>
                      <p className="font-bold text-slate-500">No trend data available</p>
                      <p className="text-sm text-slate-400 mt-1">Trends will appear as medicines are dispensed and tracked by barangay.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
