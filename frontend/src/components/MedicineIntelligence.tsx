import { useState, useEffect } from "react";
import { api } from "../lib/api";
import {
  Pill,
  TrendingUp,
  AlertTriangle,
  Activity,
  Package,
  ArrowUpRight,
  BarChart3,
  Search,
  RefreshCw,
  Download,
  Bell,
  CheckCircle,
  X,
  FileText,
  Truck,
  Eye,
  ChevronRight,
  Zap,
  ShieldAlert,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Medicine {
  id: string;
  name: string;
  barangay: string;
  normalUsage: number;
  currentUsage: number;
  trend: "up" | "down" | "stable";
  percentChange: number;
  daysToStockout: number;
  linkedDisease?: string;
  alert: boolean;
  investigated?: boolean;
  resupplyOrdered?: boolean;
}

interface Notif {
  id: number;
  title: string;
  body: string;
  type: "success" | "warning" | "info";
}

let nid = 0;

// ─── STATUS META ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<
  string,
  { bar: string; badge: string; text: string }
> = {
  critical: {
    bar: "#ef4444",
    badge: "#fef2f2",
    text: "#b91c1c",
  },
  high: { bar: "#f97316", badge: "#fff7ed", text: "#9a3412" },
  medium: { bar: "#f59e0b", badge: "#fffbeb", text: "#92400e" },
  normal: { bar: "#22c55e", badge: "#f0fdf4", text: "#15803d" },
};

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1b2d] border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">
        {label}
      </p>
      {payload.map((p: any, i: number) => (
        <div
          key={i}
          className="flex items-center gap-2 text-sm mb-0.5"
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-slate-300">{p.name}:</span>
          <span className="text-white font-bold">
            {p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── TOAST ────────────────────────────────────────────────────────────────────

function ToastStack({
  notifs,
  onDismiss,
}: {
  notifs: Notif[];
  onDismiss: (id: number) => void;
}) {
  if (!notifs.length) return null;
  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 w-80 pointer-events-none">
      {notifs.map((n) => (
        <div
          key={n.id}
          className="pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border"
          style={{
            background:
              n.type === "success"
                ? "#f0fdf4"
                : n.type === "warning"
                  ? "#fffbeb"
                  : "#f5f3ff",
            borderColor:
              n.type === "success"
                ? "#86efac"
                : n.type === "warning"
                  ? "#fcd34d"
                  : "#c4b5fd",
            animation:
              "slideIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards",
          }}
        >
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              n.type === "success"
                ? "bg-green-500"
                : n.type === "warning"
                  ? "bg-amber-500"
                  : "bg-violet-600"
            }`}
          >
            {n.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-white" />
            ) : n.type === "warning" ? (
              <AlertTriangle className="w-4 h-4 text-white" />
            ) : (
              <Bell className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`font-bold text-sm ${n.type === "success" ? "text-green-800" : n.type === "warning" ? "text-amber-800" : "text-violet-800"}`}
            >
              {n.title}
            </p>
            <p
              className={`text-xs mt-0.5 leading-relaxed ${n.type === "success" ? "text-green-600" : n.type === "warning" ? "text-amber-700" : "text-violet-600"}`}
            >
              {n.body}
            </p>
          </div>
          <button
            onClick={() => onDismiss(n.id)}
            className="text-slate-400 hover:text-slate-600 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── INVESTIGATE MODAL ────────────────────────────────────────────────────────

function InvestigateModal({
  med,
  onClose,
  onConfirm,
}: {
  med: Medicine;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Eye className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">
                Investigate Alert
              </p>
              <p className="text-white/60 text-xs">
                {(med.id ?? '').toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
            <p className="font-bold text-violet-800 text-sm mb-1">
              {med.name}
            </p>
            <p className="text-violet-600 text-xs">
              {med.barangay} · +{med.percentChange}% above
              normal
            </p>
          </div>
          <div className="space-y-2">
            {[
              "Dispatch field investigator to barangay",
              "Request usage log from barangay health worker",
              "Cross-reference with active disease alerts",
              "Generate usage anomaly report",
              "Flag for City Veterinarian review",
            ].map((step, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl"
              >
                <span className="w-6 h-6 bg-violet-600 text-white rounded-full text-xs flex items-center justify-center font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-slate-700">
                  {step}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" /> Confirm
              Investigation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── RESUPPLY MODAL ───────────────────────────────────────────────────────────

function ResupplyModal({
  med,
  onClose,
  onConfirm,
}: {
  med: Medicine;
  onClose: () => void;
  onConfirm: (qty: number) => void;
}) {
  const [qty, setQty] = useState(med.normalUsage * 4);
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#166534] to-[#16a34a] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Truck className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">
                Order Resupply
              </p>
              <p className="text-white/60 text-xs">
                {med.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            Only {med.daysToStockout} days until stockout at
            current usage rate.
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Order Quantity (doses)
            </label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(+e.target.value)}
              min={1}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-slate-400 mt-1">
              Suggested: {med.normalUsage * 4} doses (4-week
              buffer)
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-slate-400 font-medium">
                Normal weekly
              </p>
              <p className="font-bold text-slate-800 text-base mt-0.5">
                {med.normalUsage} doses
              </p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 border border-red-100">
              <p className="text-red-500 font-medium">
                Current weekly
              </p>
              <p className="font-bold text-red-700 text-base mt-0.5">
                {med.currentUsage} doses
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm(qty);
                onClose();
              }}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <Truck className="w-4 h-4" /> Place Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

// Fallback when DB is empty
const FALLBACK_MEDICINES: Medicine[] = [
  { id: 'fb-1', name: 'Rabisin Anti-Rabies Vaccine', barangay: 'CVO Central', normalUsage: 50, currentUsage: 500, trend: 'stable', percentChange: 0, daysToStockout: 365, alert: false },
  { id: 'fb-2', name: 'Nobivac Rabies', barangay: 'CVO Central', normalUsage: 50, currentUsage: 300, trend: 'stable', percentChange: 0, daysToStockout: 270, alert: false },
  { id: 'fb-3', name: 'Canigen DHPPiL', barangay: 'CVO Central', normalUsage: 30, currentUsage: 150, trend: 'stable', percentChange: 0, daysToStockout: 180, alert: false },
];


export function MedicineIntelligence() {
  const [selectedView, setSelectedView] = useState<
    "alerts" | "trends"
  >("alerts");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [dbMedicines, setDbMedicines] = useState<any[]>([]);
  const [dbUsage, setDbUsage] = useState<any[]>([]);
  const [dbExpiring, setDbExpiring] = useState<any[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  useEffect(() => {
    api.getDashboardMedicineIntel().then((res: any) => {
      setDbMedicines(res.stock || []);
      setDbUsage(res.usage || []);
      setDbExpiring(res.expiring || []);
      // Map DB stock to Medicine interface for existing UI
      const mapped: Medicine[] = (res.stock || []).map((m: any, i: number) => {
        const usageEntry = (res.usage || []).find((u: any) => u.medicine_id === m.id);
        const administrations = usageEntry ? parseInt(usageEntry.administrations) : 0;
        const reorderLevel = parseInt(m.reorder_level) || 10;
        const qty = parseInt(m.quantity) || 0;
        const daysToStockout = administrations > 0 ? Math.round(qty / (administrations / 90)) : (qty > 0 ? 999 : 0);
        const alert = qty <= reorderLevel;
        const isExpiring = (res.expiring || []).some((e: any) => e.id === m.id);
        const status = m.stock_status || (qty === 0 ? 'critical' : qty <= reorderLevel ? 'critical' : qty <= reorderLevel * 2 ? 'high' : 'normal');
        return {
          id: m.id,
          name: m.name,
          barangay: 'CVO Central',
          normalUsage: reorderLevel,
          currentUsage: administrations || qty,
          trend: (qty <= reorderLevel ? 'down' : administrations > reorderLevel ? 'up' : 'stable') as 'up'|'down'|'stable',
          percentChange: qty > 0 ? Math.round(((qty - reorderLevel) / reorderLevel) * 100) : -100,
          daysToStockout: Math.min(daysToStockout, 999),
          linkedDisease: isExpiring ? `Expires: ${new Date(m.expiry_date).toLocaleDateString('en-PH')}` : undefined,
          alert,
        };
      });
      setMedicines(mapped.length > 0 ? mapped : FALLBACK_MEDICINES);
      setDbLoading(false);
    }).catch(() => {
      setMedicines(FALLBACK_MEDICINES);
      setDbLoading(false);
    });
  }, []);

  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [investigateTarget, setInvestigateTarget] =
    useState<Medicine | null>(null);
  const [resupplyTarget, setResupplyTarget] =
    useState<Medicine | null>(null);

  const trendData = [
    {
      week: "Week 1",
      asfVaccine: 15,
      antibiotics: 20,
      rabies: 30,
      avian: 100,
    },
    {
      week: "Week 2",
      asfVaccine: 18,
      antibiotics: 22,
      rabies: 35,
      avian: 110,
    },
    {
      week: "Week 3",
      asfVaccine: 25,
      antibiotics: 35,
      rabies: 45,
      avian: 180,
    },
    {
      week: "Week 4",
      asfVaccine: 51,
      antibiotics: 56,
      rabies: 82,
      avian: 340,
    },
  ];

  const barangayConsumption = [
    {
      barangay: "Bagong Tubig",
      consumption: 340,
      status: "critical",
    },
    { barangay: "Balimbing", consumption: 280, status: "high" },
    { barangay: "Bambang", consumption: 180, status: "high" },
    { barangay: "Cahil", consumption: 150, status: "medium" },
    {
      barangay: "Poblacion 2",
      consumption: 120,
      status: "medium",
    },
    {
      barangay: "Poblacion 4",
      consumption: 95,
      status: "normal",
    },
    {
      barangay: "Poblacion 1",
      consumption: 80,
      status: "normal",
    },
    {
      barangay: "Poblacion 3",
      consumption: 75,
      status: "normal",
    },
  ];

  const push = (
    title: string,
    body: string,
    type: Notif["type"] = "success",
  ) => {
    const id = ++nid;
    setNotifs((p) =>
      [{ id, title, body, type }, ...p].slice(0, 4),
    );
    setTimeout(
      () => setNotifs((p) => p.filter((n) => n.id !== id)),
      5500,
    );
  };

  const handleInvestigateConfirm = (med: Medicine) => {
    setMedicines((p) =>
      p.map((m) =>
        m.id === med.id ? { ...m, investigated: true } : m,
      ),
    );
    push(
      "Investigation Dispatched",
      `Field team assigned to ${med.barangay} for ${med.name} anomaly.`,
      "info",
    );
  };

  const handleResupplyConfirm = (
    med: Medicine,
    qty: number,
  ) => {
    setMedicines((p) =>
      p.map((m) =>
        m.id === med.id ? { ...m, resupplyOrdered: true } : m,
      ),
    );
    push(
      "Resupply Ordered",
      `${qty} doses of ${med.name} ordered for ${med.barangay}. ETA: 24–48 hrs.`,
      "success",
    );
  };

  const handleExportReport = () => {
    const rows = [
      [
        "Medicine ID",
        "Name",
        "Barangay",
        "Normal Usage",
        "Current Usage",
        "% Change",
        "Days to Stockout",
        "Alert",
        "Status",
      ],
      ...medicines.map((m) => [
        m.id,
        m.name,
        m.barangay,
        m.normalUsage,
        m.currentUsage,
        `+${m.percentChange}%`,
        m.daysToStockout,
        m.alert ? "YES" : "No",
        m.investigated
          ? "Investigated"
          : m.resupplyOrdered
            ? "Resupply Ordered"
            : "Pending",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const b = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `Medicine_Intelligence_Report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    push(
      "Report Downloaded",
      "Medicine intelligence CSV saved to your downloads.",
      "info",
    );
  };

  const handleRefresh = () =>
    push(
      "Data Refreshed",
      "Medicine consumption data updated from all barangay sources.",
      "info",
    );

  const handleLinkAlert = (med: Medicine) =>
    push(
      "Linked to Disease Alert",
      `${med.name} usage spike linked to disease alert system for ${med.barangay}.`,
      "warning",
    );

  const alertCount = medicines.filter((m) => m.alert).length;

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      <ToastStack
        notifs={notifs}
        onDismiss={(id) =>
          setNotifs((p) => p.filter((n) => n.id !== id))
        }
      />
      {investigateTarget && (
        <InvestigateModal
          med={investigateTarget}
          onClose={() => setInvestigateTarget(null)}
          onConfirm={() =>
            handleInvestigateConfirm(investigateTarget)
          }
        />
      )}
      {resupplyTarget && (
        <ResupplyModal
          med={resupplyTarget}
          onClose={() => setResupplyTarget(null)}
          onConfirm={(qty) =>
            handleResupplyConfirm(resupplyTarget, qty)
          }
        />
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-[#4c1d95] to-[#7c3aed] px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
                <Pill className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">
                  Medicine Usage Intelligence
                </h3>
                <p className="text-white/70 text-sm mt-0.5">
                  AI-powered anomaly detection · consumption
                  patterns
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-semibold rounded-xl transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
              <button
                onClick={handleExportReport}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-semibold rounded-xl transition-all"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>

          {/* View toggle + alert count */}
          <div className="flex items-center justify-between mt-5">
            <div className="flex gap-1 bg-white/10 border border-white/20 p-1 rounded-xl">
              {(["alerts", "trends"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setSelectedView(v)}
                  className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={
                    selectedView === v
                      ? {
                          background: "#fff",
                          color: "#7c3aed",
                          boxShadow:
                            "0 2px 8px rgba(0,0,0,0.15)",
                        }
                      : { color: "rgba(255,255,255,0.7)" }
                  }
                >
                  {v === "alerts"
                    ? "Usage Alerts"
                    : "Trend Analysis"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/80 border border-red-400/60 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-red-200 animate-pulse" />
              <span className="text-white text-xs font-bold">
                {alertCount} Active Alerts
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* ══ ALERTS VIEW ══════════════════════════════════════════════════ */}
          {selectedView === "alerts" && (
            <div className="space-y-5">
              {/* Critical alerts header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl">
                <div className="w-8 h-8 bg-red-500 rounded-xl flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-bold text-red-800 text-sm">
                    Critical Medicine Consumption Alerts
                  </p>
                  <p className="text-xs text-red-600">
                    {alertCount} medicines with abnormal usage
                    patterns detected this week
                  </p>
                </div>
              </div>

              {/* Medicine alert cards */}
              <div className="space-y-3">
                {medicines
                  .filter((m) => m.alert)
                  .map((med) => (
                    <div
                      key={med.id}
                      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* Red accent top bar */}
                      <div className="h-1 bg-gradient-to-r from-red-500 to-orange-400" />
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Title row */}
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                                <Pill className="w-3.5 h-3.5 text-red-600" />
                              </div>
                              <p className="font-bold text-slate-800">
                                {med.name}
                              </p>
                              <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-semibold rounded-lg border border-violet-200">
                                {med.barangay}
                              </span>
                              {med.investigated && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  Investigating
                                </span>
                              )}
                              {med.resupplyOrdered && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-lg flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Resupply Ordered
                                </span>
                              )}
                            </div>

                            {/* Metrics row */}
                            <div className="grid grid-cols-3 gap-3 mb-3">
                              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">
                                  Normal Usage
                                </p>
                                <p className="text-xl font-black text-slate-700">
                                  {med.normalUsage}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  doses/week
                                </p>
                              </div>
                              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                                <p className="text-[10px] text-red-500 font-bold uppercase tracking-wide mb-1">
                                  Current Usage
                                </p>
                                <p className="text-xl font-black text-red-600">
                                  {med.currentUsage}
                                </p>
                                <p className="text-[10px] text-red-400">
                                  doses/week
                                </p>
                              </div>
                              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                                <p className="text-[10px] text-orange-500 font-bold uppercase tracking-wide mb-1">
                                  Increase
                                </p>
                                <div className="flex items-center gap-0.5">
                                  <ArrowUpRight className="w-4 h-4 text-orange-600 shrink-0" />
                                  <p className="text-xl font-black text-orange-600">
                                    +{med.percentChange}%
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Linked disease */}
                            {med.linkedDisease && (
                              <button
                                onClick={() =>
                                  handleLinkAlert(med)
                                }
                                className="w-full flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl mb-3 hover:bg-amber-100 transition-colors text-left group"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <p className="text-xs text-amber-800 font-medium flex-1">
                                  Linked: {med.linkedDisease}
                                </p>
                                <ChevronRight className="w-3.5 h-3.5 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
                              </button>
                            )}

                            {/* Stockout progress */}
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full transition-all"
                                  style={{
                                    width: `${Math.min((med.currentUsage / (med.normalUsage * 5)) * 100, 100)}%`,
                                  }}
                                />
                              </div>
                              <span
                                className={`text-xs font-bold whitespace-nowrap ${med.daysToStockout <= 3 ? "text-red-600" : "text-orange-500"}`}
                              >
                                ⏱ {med.daysToStockout}d to
                                stockout
                              </span>
                            </div>
                          </div>

                          {/* Action buttons column */}
                          <div className="flex flex-col gap-2 shrink-0">
                            <button
                              onClick={() =>
                                setInvestigateTarget(med)
                              }
                              disabled={med.investigated}
                              className="px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{
                                background: med.investigated
                                  ? "#f1f5f9"
                                  : "#7c3aed",
                                color: med.investigated
                                  ? "#94a3b8"
                                  : "#fff",
                              }}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              {med.investigated
                                ? "Investigating"
                                : "Investigate"}
                            </button>
                            <button
                              onClick={() =>
                                setResupplyTarget(med)
                              }
                              disabled={med.resupplyOrdered}
                              className="px-3 py-2 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 transition-all flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              {med.resupplyOrdered
                                ? "Ordered"
                                : "Resupply"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Barangay Consumption Chart */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-violet-600" />
                  <p className="font-bold text-slate-800 text-sm">
                    Medicine Consumption by Barangay
                  </p>
                  <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                    Current Week
                  </span>
                </div>
                <div className="p-5 space-y-3">
                  {barangayConsumption.map((item) => {
                    const st = STATUS_COLORS[item.status];
                    const pct = (item.consumption / 340) * 100;
                    return (
                      <div
                        key={item.barangay}
                        className="flex items-center gap-3"
                      >
                        <div className="w-28 text-sm font-medium text-slate-700 truncate shrink-0">
                          {item.barangay}
                        </div>
                        <div className="flex-1 h-7 bg-slate-100 rounded-xl overflow-hidden relative">
                          <div
                            className="h-full rounded-xl flex items-center justify-end pr-3 transition-all"
                            style={{
                              width: `${pct}%`,
                              background: `linear-gradient(90deg, ${st.bar}bb, ${st.bar})`,
                            }}
                          >
                            <span className="text-white text-xs font-bold">
                              {item.consumption}
                            </span>
                          </div>
                        </div>
                        <span
                          className="text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 border"
                          style={{
                            background: st.badge,
                            color: st.text,
                            borderColor: st.bar + "40",
                          }}
                        >
                          {item.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ══ TRENDS VIEW ══════════════════════════════════════════════════ */}
          {selectedView === "trends" && (
            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <p className="font-bold text-slate-800">
                    Medicine Consumption Trends
                  </p>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                    Last 4 Weeks
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 mb-4">
                  {[
                    ["ASF Vaccine", "#E85D3B"],
                    ["Antibiotics", "#F39C3A"],
                    ["Rabies Vaccine", "#2B5EA6"],
                    ["Avian Flu Vaccine", "#60A85C"],
                  ].map(([n, c]) => (
                    <div
                      key={n}
                      className="flex items-center gap-1.5 text-xs text-slate-500 font-medium"
                    >
                      <span
                        className="w-8 h-0.5 rounded"
                        style={{ background: c as string }}
                      />
                      {n}
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={trendData}
                    margin={{
                      top: 8,
                      right: 8,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f1f5f9"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="week"
                      tick={{
                        fontSize: 11,
                        fill: "#94a3b8",
                        fontWeight: 500,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="asfVaccine"
                      stroke="#E85D3B"
                      strokeWidth={2.5}
                      dot={{
                        r: 5,
                        fill: "#E85D3B",
                        strokeWidth: 2,
                        stroke: "#fff",
                      }}
                      activeDot={{ r: 7, strokeWidth: 0 }}
                      name="ASF Vaccine"
                    />
                    <Line
                      type="monotone"
                      dataKey="antibiotics"
                      stroke="#F39C3A"
                      strokeWidth={2.5}
                      dot={{
                        r: 5,
                        fill: "#F39C3A",
                        strokeWidth: 2,
                        stroke: "#fff",
                      }}
                      activeDot={{ r: 7, strokeWidth: 0 }}
                      name="Antibiotics"
                    />
                    <Line
                      type="monotone"
                      dataKey="rabies"
                      stroke="#2B5EA6"
                      strokeWidth={2.5}
                      dot={{
                        r: 5,
                        fill: "#2B5EA6",
                        strokeWidth: 2,
                        stroke: "#fff",
                      }}
                      activeDot={{ r: 7, strokeWidth: 0 }}
                      name="Rabies Vaccine"
                    />
                    <Line
                      type="monotone"
                      dataKey="avian"
                      stroke="#60A85C"
                      strokeWidth={2.5}
                      dot={{
                        r: 5,
                        fill: "#60A85C",
                        strokeWidth: 2,
                        stroke: "#fff",
                      }}
                      activeDot={{ r: 7, strokeWidth: 0 }}
                      name="Avian Flu Vaccine"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Key insights cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    icon: TrendingUp,
                    iconBg: "#ef4444",
                    cardBg: "#fef2f2",
                    cardBorder: "#fecaca",
                    title: "Fast-Moving Medicine Alert",
                    titleColor: "#7f1d1d",
                    body: "Avian Flu Vaccine consumption increased 240% in Balimbing — likely linked to emergency vaccination drive due to nearby outbreak.",
                    bodyColor: "#991b1b",
                    badge:
                      "Action Required: Resupply in 2 days",
                    badgeBg: "#fee2e2",
                    badgeText: "#b91c1c",
                    action: "Order Resupply",
                    onAction: () => {
                      const m = medicines.find(
                        (x) => x.id === "med-004",
                      );
                      if (m) setResupplyTarget(m);
                    },
                  },
                  {
                    icon: Activity,
                    iconBg: "#f97316",
                    cardBg: "#fff7ed",
                    cardBorder: "#fed7aa",
                    title: "Unusual Consumption Pattern",
                    titleColor: "#431407",
                    body: "Antibiotic usage in Bambang up 180% — suggests potential bacterial infection outbreak. Recommend immediate field investigation.",
                    bodyColor: "#7c2d12",
                    badge: "Linked to Disease Alert #4",
                    badgeBg: "#ffedd5",
                    badgeText: "#9a3412",
                    action: "Investigate",
                    onAction: () => {
                      const m = medicines.find(
                        (x) => x.id === "med-002",
                      );
                      if (m) setInvestigateTarget(m);
                    },
                  },
                  {
                    icon: Package,
                    iconBg: "#2563eb",
                    cardBg: "#eff6ff",
                    cardBorder: "#bfdbfe",
                    title: "Inventory Optimization",
                    titleColor: "#1e3a8a",
                    body: "Based on current trends, recommend increasing ASF vaccine stock by 300% for Bagong Tubig to prevent stockouts.",
                    bodyColor: "#1d4ed8",
                    badge: "Auto-generated recommendation",
                    badgeBg: "#dbeafe",
                    badgeText: "#1d4ed8",
                    action: "Order Stock",
                    onAction: () => {
                      const m = medicines.find(
                        (x) => x.id === "med-001",
                      );
                      if (m) setResupplyTarget(m);
                    },
                  },
                  {
                    icon: CheckCircle,
                    iconBg: "#16a34a",
                    cardBg: "#f0fdf4",
                    cardBorder: "#bbf7d0",
                    title: "Positive Trend Detected",
                    titleColor: "#14532d",
                    body: "Deworming program in Poblacion areas showing stable, predictable consumption — indicates effective routine preventive care.",
                    bodyColor: "#15803d",
                    badge: "Continue current approach",
                    badgeBg: "#dcfce7",
                    badgeText: "#15803d",
                    action: "View Details",
                    onAction: () =>
                      push(
                        "Deworming Details",
                        "Deworming program is stable across all Poblacion areas. No action required.",
                        "info",
                      ),
                  },
                ].map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={i}
                      className="rounded-2xl p-4 border"
                      style={{
                        background: card.cardBg,
                        borderColor: card.cardBorder,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: card.iconBg }}
                        >
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-bold mb-1"
                            style={{ color: card.titleColor }}
                          >
                            {card.title}
                          </p>
                          <p
                            className="text-xs leading-relaxed mb-3"
                            style={{ color: card.bodyColor }}
                          >
                            {card.body}
                          </p>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span
                              className="px-2.5 py-1 rounded-lg text-xs font-bold border"
                              style={{
                                background: card.badgeBg,
                                color: card.badgeText,
                                borderColor:
                                  card.badgeText + "30",
                              }}
                            >
                              {card.badge}
                            </span>
                            <button
                              onClick={card.onAction}
                              className="text-xs font-bold flex items-center gap-1 hover:opacity-70 transition-opacity"
                              style={{ color: card.iconBg }}
                            >
                              {card.action}{" "}
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}