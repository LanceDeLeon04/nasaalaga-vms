import { useState } from "react";
import {
  Users,
  Package,
  TrendingUp,
  MapPin,
  Calendar,
  Clock,
  AlertCircle,
  Printer,
  Download,
  Pencil,
  X,
  CheckCircle,
  Bell,
  BellRing,
  Truck,
  FileText,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  Shield,
  Zap,
  BadgeCheck,
  Circle,
  CircleDot,
} from "lucide-react";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type Urgency = "Immediate" | "Within 3 Days" | "Within 1 Week";
type DeployStatus = "pending" | "deployed" | "completed";

interface MedicineEstimate {
  vaccines: number;
  antibiotics: number;
  vitamins: number;
}

interface DeploymentSuggestion {
  id: string;
  barangay: string;
  priority: number;
  urgency: Urgency;
  reason: string;
  staffNeeded: number;
  medicineEstimate: MedicineEstimate;
  equipmentNeeded: string[];
  estimatedDuration: string;
  targetAnimals: number;
  riskScore: number;
  status: DeployStatus;
  deployedAt?: string;
  deployedStaff?: string[];
  notes?: string;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function nowStr() {
  return new Date().toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const URGENCY_META: Record<
  Urgency,
  { bg: string; text: string; border: string; dot: string }
> = {
  Immediate: {
    bg: "#fef2f2",
    text: "#b91c1c",
    border: "#fca5a5",
    dot: "#ef4444",
  },
  "Within 3 Days": {
    bg: "#fff7ed",
    text: "#9a3412",
    border: "#fdba74",
    dot: "#f97316",
  },
  "Within 1 Week": {
    bg: "#fffbeb",
    text: "#92400e",
    border: "#fcd34d",
    dot: "#f59e0b",
  },
};

const STATUS_META: Record<
  DeployStatus,
  { label: string; color: string; icon: any }
> = {
  pending: {
    label: "Pending Deployment",
    color: "#6b7280",
    icon: Circle,
  },
  deployed: {
    label: "Team Deployed",
    color: "#2563eb",
    icon: CircleDot,
  },
  completed: {
    label: "Mission Completed",
    color: "#16a34a",
    icon: BadgeCheck,
  },
};

function riskColor(score: number) {
  if (score >= 80) return "#ef4444";
  if (score >= 60) return "#f97316";
  if (score >= 40) return "#f59e0b";
  return "#22c55e";
}

// ─── GENERATE PLAN HTML & DOWNLOAD ───────────────────────────────────────────

function buildPlanHTML(d: DeploymentSuggestion): string {
  const urg = URGENCY_META[d.urgency];
  const rc = riskColor(d.riskScore);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Deployment Plan – ${d.id.toUpperCase()}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Inter',sans-serif;color:#1e293b;background:#fff;padding:40px;font-size:13px;line-height:1.6;}

    .header{display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:20px;margin-bottom:28px;border-bottom:3px solid #ea580c;}
    .logo-block{display:flex;align-items:center;gap:14px;}
    .logo-circle{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#ea580c,#f97316);display:flex;align-items:center;justify-content:center;color:white;font-size:24px;}
    .org h1{font-size:16px;font-weight:800;color:#1e293b;}
    .org p{font-size:11px;color:#64748b;margin-top:2px;}
    .plan-meta{text-align:right;}
    .plan-id{font-size:20px;font-weight:900;color:#ea580c;}
    .plan-date{font-size:11px;color:#94a3b8;margin-top:4px;}

    .title-band{background:linear-gradient(135deg,#7c2d12,#ea580c);color:white;border-radius:12px;padding:22px 26px;margin-bottom:26px;}
    .title-band h2{font-size:19px;font-weight:900;margin-bottom:6px;}
    .title-band .meta-row{display:flex;gap:12px;flex-wrap:wrap;margin-top:12px;}
    .meta-pill{background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.3);border-radius:6px;padding:4px 12px;font-size:11px;font-weight:700;}

    .section{margin-bottom:24px;}
    .section-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;padding-bottom:8px;border-bottom:1px solid #e2e8f0;margin-bottom:12px;}

    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
    .info-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;}
    .info-box .label{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;}
    .info-box .value{font-size:14px;font-weight:800;color:#1e293b;}

    .urg-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:800;border:1px solid ${urg.border};background:${urg.bg};color:${urg.text};}

    .risk-bar-wrap{display:flex;align-items:center;gap:10px;}
    .risk-bar-bg{flex:1;height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden;}
    .risk-bar-fill{height:100%;border-radius:99px;background:${rc};}
    .risk-label{font-size:13px;font-weight:900;color:${rc};}

    .resource-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
    .resource-box{border-radius:10px;padding:14px;text-align:center;}
    .resource-box .rlabel{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;}
    .resource-box .rvalue{font-size:22px;font-weight:900;}
    .resource-box.vax{background:#f0fdf4;border:1px solid #bbf7d0;}.resource-box.vax .rlabel{color:#15803d;}.resource-box.vax .rvalue{color:#14532d;}
    .resource-box.abx{background:#eff6ff;border:1px solid #bfdbfe;}.resource-box.abx .rlabel{color:#1d4ed8;}.resource-box.abx .rvalue{color:#1e3a8a;}
    .resource-box.vit{background:#fdf4ff;border:1px solid #e9d5ff;}.resource-box.vit .rlabel{color:#7e22ce;}.resource-box.vit .rvalue{color:#581c87;}
    .resource-box.staff{background:#fff7ed;border:1px solid #fed7aa;}.resource-box.staff .rlabel{color:#c2410c;}.resource-box.staff .rvalue{color:#7c2d12;}
    .resource-box.dur{background:#f0f9ff;border:1px solid #bae6fd;}.resource-box.dur .rlabel{color:#0369a1;}.resource-box.dur .rvalue{font-size:15px;margin-top:4px;}
    .resource-box.animals{background:#fef2f2;border:1px solid #fecaca;}.resource-box.animals .rlabel{color:#b91c1c;}.resource-box.animals .rvalue{color:#7f1d1d;}

    .equip-grid{display:flex;flex-wrap:wrap;gap:8px;}
    .equip-tag{background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:5px 12px;font-size:11px;font-weight:600;color:#475569;}

    ${
      d.status === "deployed" || d.status === "completed"
        ? `
    .deployment-info{background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px;margin-bottom:18px;}
    .deployment-info p{font-size:12px;color:#15803d;font-weight:600;}
    `
        : ""
    }

    .signature-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:48px;}
    .sig-line{border-top:1px solid #cbd5e1;padding-top:8px;}
    .sig-label{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;}
    .sig-name{font-size:11px;color:#475569;margin-top:2px;}

    .footer{margin-top:36px;border-top:1px solid #e2e8f0;padding-top:14px;display:flex;justify-content:space-between;}
    .footer p{font-size:10px;color:#94a3b8;}
    @media print{body{padding:24px;}}
  </style>
</head>
<body>

<div class="header">
  <div class="logo-block">
    <div class="logo-circle">🚛</div>
    <div class="org">
      <h1>NASaAlaga — Resource Deployment Plan</h1>
      <p>City Government of Calaca, Batangas · Office of the City Veterinarian</p>
    </div>
  </div>
  <div class="plan-meta">
    <div class="plan-id">PLAN-${d.id.toUpperCase()}</div>
    <div class="plan-date">Generated: ${nowStr()}</div>
  </div>
</div>

<div class="title-band">
  <h2>📍 ${d.barangay} — Deployment Plan</h2>
  <p style="color:rgba(255,255,255,0.8);font-size:13px;">${d.reason}</p>
  <div class="meta-row">
    <span class="meta-pill">Priority #${d.priority}</span>
    <span class="meta-pill">${d.urgency}</span>
    <span class="meta-pill">Risk Score: ${d.riskScore}/100</span>
    <span class="meta-pill">${d.targetAnimals.toLocaleString()} animals targeted</span>
    <span class="meta-pill">Est. duration: ${d.estimatedDuration}</span>
  </div>
</div>

${
  d.status === "deployed" || d.status === "completed"
    ? `
<div class="deployment-info">
  ✅ <strong>Team Deployed on ${d.deployedAt}</strong>
  ${d.deployedStaff?.length ? `<br>Assigned Personnel: ${d.deployedStaff.join(", ")}` : ""}
</div>`
    : ""
}

<div class="section">
  <div class="section-title">Classification &amp; Risk Assessment</div>
  <div class="info-grid">
    <div class="info-box"><div class="label">Urgency Level</div><div class="value"><span class="urg-badge">${d.urgency}</span></div></div>
    <div class="info-box"><div class="label">Priority Ranking</div><div class="value">#${d.priority} of all deployments</div></div>
    <div class="info-box" style="grid-column:span 2">
      <div class="label">Risk Score</div>
      <div class="risk-bar-wrap" style="margin-top:6px;">
        <div class="risk-bar-bg"><div class="risk-bar-fill" style="width:${d.riskScore}%"></div></div>
        <span class="risk-label">${d.riskScore}/100</span>
      </div>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">Resource Requirements</div>
  <div class="resource-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:10px;">
    <div class="resource-box vax"><div class="rlabel">💉 Vaccines</div><div class="rvalue">${d.medicineEstimate.vaccines}</div><div style="font-size:10px;color:#15803d">doses</div></div>
    <div class="resource-box abx"><div class="rlabel">💊 Antibiotics</div><div class="rvalue">${d.medicineEstimate.antibiotics}</div><div style="font-size:10px;color:#1d4ed8">doses</div></div>
    <div class="resource-box vit"><div class="rlabel">🌿 Vitamins</div><div class="rvalue">${d.medicineEstimate.vitamins}</div><div style="font-size:10px;color:#7e22ce">doses</div></div>
  </div>
  <div class="resource-grid" style="grid-template-columns:repeat(3,1fr);">
    <div class="resource-box staff"><div class="rlabel">👥 Personnel</div><div class="rvalue">${d.staffNeeded}</div><div style="font-size:10px;color:#c2410c">staff members</div></div>
    <div class="resource-box dur"><div class="rlabel">⏱ Duration</div><div class="rvalue" style="font-size:15px;">${d.estimatedDuration}</div></div>
    <div class="resource-box animals"><div class="rlabel">🐾 Animals</div><div class="rvalue">${d.targetAnimals.toLocaleString()}</div><div style="font-size:10px;color:#b91c1c">to be serviced</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Equipment &amp; Supplies Checklist</div>
  <div class="equip-grid">
    ${d.equipmentNeeded.map((e) => `<span class="equip-tag">☐ ${e}</span>`).join("")}
  </div>
</div>

${
  d.notes
    ? `
<div class="section">
  <div class="section-title">Notes &amp; Special Instructions</div>
  <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:14px;font-size:12px;color:#451a03;line-height:1.7;">${d.notes}</div>
</div>`
    : ""
}

<div class="signature-grid">
  <div><div class="sig-line"></div><div class="sig-label">Prepared By</div><div class="sig-name">Deployment Officer</div></div>
  <div><div class="sig-line"></div><div class="sig-label">Approved By</div><div class="sig-name">City Veterinarian</div></div>
  <div><div class="sig-line"></div><div class="sig-label">Received By</div><div class="sig-name">Barangay Captain, ${d.barangay}</div></div>
</div>

<div class="footer">
  <p>NASaAlaga Veterinary Management System · City of Calaca, Batangas</p>
  <p>OFFICIAL DOCUMENT — PLAN-${d.id.toUpperCase()} · ${nowStr()}</p>
</div>

</body>
</html>`;
}

function downloadPlan(d: DeploymentSuggestion) {
  const html = buildPlanHTML(d);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Deployment_Plan_${d.id.toUpperCase()}_${d.barangay.replace(/\s+/g, "_")}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function printPlan(d: DeploymentSuggestion) {
  const html = buildPlanHTML(d);
  const w = window.open("", "_blank", "width=950,height=750");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 600);
}

// ─── NOTIFICATION SYSTEM ─────────────────────────────────────────────────────

interface NotifMsg {
  id: number;
  title: string;
  body: string;
  type: "deploy" | "plan" | "complete" | "info";
  ts: string;
}

let notifCounter = 0;

function NotificationPanel({
  notifs,
  onClear,
  onDismiss,
}: {
  notifs: NotifMsg[];
  onClear: () => void;
  onDismiss: (id: number) => void;
}) {
  if (notifs.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 w-80 pointer-events-none">
      {notifs.map((n) => (
        <div
          key={n.id}
          className="pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border animate-[slideIn_0.35s_cubic-bezier(0.34,1.56,0.64,1)_forwards]"
          style={{
            background:
              n.type === "deploy"
                ? "#f0fdf4"
                : n.type === "complete"
                  ? "#eff6ff"
                  : n.type === "plan"
                    ? "#fff7ed"
                    : "#f8fafc",
            borderColor:
              n.type === "deploy"
                ? "#86efac"
                : n.type === "complete"
                  ? "#93c5fd"
                  : n.type === "plan"
                    ? "#fcd34d"
                    : "#e2e8f0",
          }}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              n.type === "deploy"
                ? "bg-green-500"
                : n.type === "complete"
                  ? "bg-blue-500"
                  : n.type === "plan"
                    ? "bg-amber-500"
                    : "bg-slate-400"
            }`}
          >
            {n.type === "deploy" && (
              <Truck className="w-4 h-4 text-white" />
            )}
            {n.type === "complete" && (
              <BadgeCheck className="w-4 h-4 text-white" />
            )}
            {n.type === "plan" && (
              <FileText className="w-4 h-4 text-white" />
            )}
            {n.type === "info" && (
              <Bell className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`font-bold text-sm ${n.type === "deploy" ? "text-green-800" : n.type === "complete" ? "text-blue-800" : n.type === "plan" ? "text-amber-800" : "text-slate-700"}`}
            >
              {n.title}
            </p>
            <p
              className={`text-xs mt-0.5 leading-relaxed ${n.type === "deploy" ? "text-green-700" : n.type === "complete" ? "text-blue-600" : n.type === "plan" ? "text-amber-700" : "text-slate-500"}`}
            >
              {n.body}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              {n.ts}
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

// ─── DEPLOY MODAL ─────────────────────────────────────────────────────────────

const SAMPLE_STAFF = [
  "Dr. Amalia Vergara",
  "BAHW Miguel Sanchez",
  "Vet Tech Jose Ramos",
  "BAHW Lina Reyes",
  "Vet Tech Carlo Bautista",
  "BAHW Maria Cruz",
  "Dr. Paolo Santos",
  "Vet Tech Ana Lopez",
];

function DeployModal({
  d,
  onDeploy,
  onClose,
}: {
  d: DeploymentSuggestion;
  onDeploy: (staff: string[], notes: string) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState(d.notes || "");
  const toggle = (s: string) =>
    setSelected((p) =>
      p.includes(s) ? p.filter((x) => x !== s) : [...p, s],
    );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-[#166534] to-[#60A85C] px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white">
                Deploy Team
              </p>
              <p className="text-white/70 text-xs">
                {d.barangay} · {d.estimatedDuration}
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

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Summary */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm space-y-1">
            <p className="font-bold text-amber-800">
              Deployment Summary
            </p>
            <p className="text-amber-700">
              📍 {d.barangay} &nbsp;·&nbsp; 🐾{" "}
              {d.targetAnimals.toLocaleString()} animals
            </p>
            <p className="text-amber-700">
              ⏱ {d.estimatedDuration} &nbsp;·&nbsp; 👥 Minimum{" "}
              {d.staffNeeded} staff needed
            </p>
          </div>

          {/* Staff selection */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Assign Personnel{" "}
              <span className="text-slate-400">
                ({selected.length}/{d.staffNeeded} needed)
              </span>
            </label>
            <div className="space-y-1.5">
              {SAMPLE_STAFF.map((s) => (
                <button
                  key={s}
                  onClick={() => toggle(s)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                    selected.includes(s)
                      ? "bg-green-50 border-green-400 text-green-800"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected.includes(s) ? "bg-green-500 border-green-500" : "border-slate-300"}`}
                  >
                    {selected.includes(s) && (
                      <CheckCircle className="w-3 h-3 text-white" />
                    )}
                  </div>
                  {s}
                </button>
              ))}
            </div>
            {selected.length < d.staffNeeded && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Select at least {d.staffNeeded} personnel to
                deploy.
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Deployment Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Special instructions, routes, equipment reminders…"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>
        </div>

        <div className="shrink-0 px-6 py-4 border-t border-slate-100 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onDeploy(selected, notes);
              onClose();
            }}
            disabled={selected.length < d.staffNeeded}
            className="flex-1 py-2.5 bg-[#60A85C] text-white rounded-xl text-sm font-bold hover:bg-[#4a8a47] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Truck className="w-4 h-4" /> Confirm Deployment
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODIFY MODAL ─────────────────────────────────────────────────────────────

function ModifyModal({
  d,
  onSave,
  onClose,
}: {
  d: DeploymentSuggestion;
  onSave: (updated: DeploymentSuggestion) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<DeploymentSuggestion>({
    ...d,
    equipmentNeeded: [...d.equipmentNeeded],
  });
  const [newEquip, setNewEquip] = useState("");

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2B5EA6] px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Pencil className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white">
                Modify Deployment Plan
              </p>
              <p className="text-white/70 text-xs">
                {d.id.toUpperCase()} · {d.barangay}
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

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Urgency
              </label>
              <select
                value={draft.urgency}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    urgency: e.target.value as Urgency,
                  }))
                }
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] bg-white"
              >
                <option>Immediate</option>
                <option>Within 3 Days</option>
                <option>Within 1 Week</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Priority #
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={draft.priority}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    priority: +e.target.value,
                  }))
                }
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Staff Needed
              </label>
              <input
                type="number"
                min={1}
                value={draft.staffNeeded}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    staffNeeded: +e.target.value,
                  }))
                }
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Target Animals
              </label>
              <input
                type="number"
                min={0}
                value={draft.targetAnimals}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    targetAnimals: +e.target.value,
                  }))
                }
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Estimated Duration
            </label>
            <input
              value={draft.estimatedDuration}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  estimatedDuration: e.target.value,
                }))
              }
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
              placeholder="e.g. 2-3 days"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Medicine Estimates
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                ["vaccines", "antibiotics", "vitamins"] as const
              ).map((k) => (
                <div key={k}>
                  <label className="block text-xs text-slate-400 mb-1 capitalize">
                    {k}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={draft.medicineEstimate[k]}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        medicineEstimate: {
                          ...p.medicineEstimate,
                          [k]: +e.target.value,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Equipment Needed
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {draft.equipmentNeeded.map((e, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs rounded-lg font-medium"
                >
                  {e}
                  <button
                    onClick={() =>
                      setDraft((p) => ({
                        ...p,
                        equipmentNeeded:
                          p.equipmentNeeded.filter(
                            (_, idx) => idx !== i,
                          ),
                      }))
                    }
                    className="text-slate-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newEquip}
                onChange={(e) => setNewEquip(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newEquip.trim()) {
                    setDraft((p) => ({
                      ...p,
                      equipmentNeeded: [
                        ...p.equipmentNeeded,
                        newEquip.trim(),
                      ],
                    }));
                    setNewEquip("");
                  }
                }}
                placeholder="Add equipment item…"
                className="flex-1 px-3 py-2 border border-dashed border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
              />
              <button
                onClick={() => {
                  if (newEquip.trim()) {
                    setDraft((p) => ({
                      ...p,
                      equipmentNeeded: [
                        ...p.equipmentNeeded,
                        newEquip.trim(),
                      ],
                    }));
                    setNewEquip("");
                  }
                }}
                className="px-3 py-2 bg-[#2B5EA6] text-white rounded-xl hover:bg-[#1e4080]"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Notes
            </label>
            <textarea
              value={draft.notes || ""}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  notes: e.target.value,
                }))
              }
              rows={3}
              placeholder="Special instructions…"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] resize-none"
            />
          </div>
        </div>

        <div className="shrink-0 px-6 py-4 border-t border-slate-100 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="flex-1 py-2.5 bg-[#2B5EA6] text-white rounded-xl text-sm font-bold hover:bg-[#1e4080] flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function ResourceDeployment() {
  const [deployments, setDeployments] = useState<
    DeploymentSuggestion[]
  >([
    {
      id: "deploy-001",
      barangay: "Bagong Tubig",
      priority: 1,
      urgency: "Immediate",
      reason:
        "Active ASF outbreak with high disease transmission rate",
      staffNeeded: 6,
      medicineEstimate: {
        vaccines: 150,
        antibiotics: 80,
        vitamins: 200,
      },
      equipmentNeeded: [
        "Blood sampling kits",
        "Quarantine markers",
        "PPE sets (10)",
        "Disinfectant spray",
      ],
      estimatedDuration: "3-5 days",
      targetAnimals: 450,
      riskScore: 95,
      status: "pending",
    },
    {
      id: "deploy-002",
      barangay: "Balimbing",
      priority: 2,
      urgency: "Immediate",
      reason:
        "Critical vaccination gap (45%) with avian flu in neighboring area",
      staffNeeded: 4,
      medicineEstimate: {
        vaccines: 800,
        antibiotics: 40,
        vitamins: 150,
      },
      equipmentNeeded: [
        "Vaccination guns",
        "Bird handling equipment",
        "Cooler boxes",
        "Registration forms",
      ],
      estimatedDuration: "2-3 days",
      targetAnimals: 1800,
      riskScore: 88,
      status: "pending",
    },
    {
      id: "deploy-003",
      barangay: "Poblacion 2",
      priority: 3,
      urgency: "Within 3 Days",
      reason:
        "Abnormal swine mortality spike requiring investigation",
      staffNeeded: 3,
      medicineEstimate: {
        vaccines: 60,
        antibiotics: 120,
        vitamins: 180,
      },
      equipmentNeeded: [
        "Diagnostic kits",
        "Sample collection materials",
        "Treatment supplies",
      ],
      estimatedDuration: "2 days",
      targetAnimals: 280,
      riskScore: 72,
      status: "pending",
    },
    {
      id: "deploy-004",
      barangay: "Cahil",
      priority: 4,
      urgency: "Within 1 Week",
      reason:
        "Low rabies vaccination coverage (62%) with recent cases",
      staffNeeded: 3,
      medicineEstimate: {
        vaccines: 250,
        antibiotics: 20,
        vitamins: 100,
      },
      equipmentNeeded: [
        "Rabies vaccines",
        "Pet restraint equipment",
        "Registration tablets",
      ],
      estimatedDuration: "1-2 days",
      targetAnimals: 380,
      riskScore: 65,
      status: "pending",
    },
    {
      id: "deploy-005",
      barangay: "Bambang",
      priority: 5,
      urgency: "Within 1 Week",
      reason:
        "Antibiotic usage spike suggests potential infection outbreak",
      staffNeeded: 2,
      medicineEstimate: {
        vaccines: 40,
        antibiotics: 150,
        vitamins: 120,
      },
      equipmentNeeded: [
        "Water testing kit",
        "Biosecurity assessment forms",
        "Education materials",
      ],
      estimatedDuration: "1 day",
      targetAnimals: 190,
      riskScore: 58,
      status: "pending",
    },
  ]);

  const [notifs, setNotifs] = useState<NotifMsg[]>([]);
  const [deployTarget, setDeployTarget] =
    useState<DeploymentSuggestion | null>(null);
  const [modifyTarget, setModifyTarget] =
    useState<DeploymentSuggestion | null>(null);

  const pushNotif = (
    title: string,
    body: string,
    type: NotifMsg["type"],
  ) => {
    const id = ++notifCounter;
    setNotifs((p) =>
      [{ id, title, body, type, ts: nowStr() }, ...p].slice(
        0,
        5,
      ),
    );
    setTimeout(
      () => setNotifs((p) => p.filter((n) => n.id !== id)),
      6000,
    );
  };

  const handleDeploy = (
    d: DeploymentSuggestion,
    staff: string[],
    notes: string,
  ) => {
    setDeployments((p) =>
      p.map((x) =>
        x.id === d.id
          ? {
              ...x,
              status: "deployed",
              deployedAt: nowStr(),
              deployedStaff: staff,
              notes,
            }
          : x,
      ),
    );
    pushNotif(
      `🚛 Team Deployed to ${d.barangay}`,
      `${staff.length} personnel assigned. Expected duration: ${d.estimatedDuration}. ${staff.slice(0, 2).join(", ")}${staff.length > 2 ? ` +${staff.length - 2} more` : ""} notified.`,
      "deploy",
    );
  };

  const handleComplete = (d: DeploymentSuggestion) => {
    setDeployments((p) =>
      p.map((x) =>
        x.id === d.id ? { ...x, status: "completed" } : x,
      ),
    );
    pushNotif(
      `✅ Mission Complete — ${d.barangay}`,
      `Deployment ${d.id.toUpperCase()} has been marked as completed.`,
      "complete",
    );
  };

  const handleModifySave = (updated: DeploymentSuggestion) => {
    setDeployments((p) =>
      p.map((x) => (x.id === updated.id ? updated : x)),
    );
    pushNotif(
      `📝 Plan Updated — ${updated.barangay}`,
      `Deployment plan ${updated.id.toUpperCase()} has been modified and saved.`,
      "info",
    );
  };

  const handleGeneratePlan = (d: DeploymentSuggestion) => {
    downloadPlan(d);
    pushNotif(
      `📥 Plan Downloaded`,
      `Deployment plan for ${d.barangay} saved as HTML file.`,
      "plan",
    );
  };

  const handleScheduleAllHigh = () => {
    const highs = deployments.filter(
      (d) =>
        d.urgency === "Immediate" && d.status === "pending",
    );
    highs.forEach((d) => {
      setDeployments((p) =>
        p.map((x) =>
          x.id === d.id
            ? {
                ...x,
                status: "deployed",
                deployedAt: nowStr(),
                deployedStaff: SAMPLE_STAFF.slice(
                  0,
                  d.staffNeeded,
                ),
              }
            : x,
        ),
      );
    });
    pushNotif(
      `🚨 ${highs.length} High Priority Teams Deployed`,
      `All Immediate deployments have been scheduled and staff notified.`,
      "deploy",
    );
  };

  // Summary totals
  const totals = deployments.reduce(
    (acc, d) => ({
      staff: acc.staff + d.staffNeeded,
      vaccines: acc.vaccines + d.medicineEstimate.vaccines,
      animals: acc.animals + d.targetAnimals,
    }),
    { staff: 0, vaccines: 0, animals: 0 },
  );

  const RC = riskColor;
  const UM = URGENCY_META;
  const SM = STATUS_META;

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      <NotificationPanel
        notifs={notifs}
        onClear={() => setNotifs([])}
        onDismiss={(id) =>
          setNotifs((p) => p.filter((n) => n.id !== id))
        }
      />
      {deployTarget && (
        <DeployModal
          d={deployTarget}
          onDeploy={(staff, notes) =>
            handleDeploy(deployTarget, staff, notes)
          }
          onClose={() => setDeployTarget(null)}
        />
      )}
      {modifyTarget && (
        <ModifyModal
          d={modifyTarget}
          onSave={handleModifySave}
          onClose={() => setModifyTarget(null)}
        />
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-[#0c4a6e] to-[#0369a1] px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">
                  Resource Deployment
                </h3>
                <p className="text-white/70 text-sm mt-0.5">
                  AI-optimized allocation · {deployments.length}{" "}
                  planned areas
                </p>
              </div>
            </div>
            <button
              onClick={handleScheduleAllHigh}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition-all shadow-sm"
            >
              <BellRing className="w-4 h-4" /> Schedule All High
              Priority
            </button>
          </div>

          {/* Summary pills */}
          <div className="grid grid-cols-4 gap-3 mt-5">
            {[
              {
                icon: Users,
                label: "Total Staff",
                value: totals.staff,
                sub: "personnel",
              },
              {
                icon: Package,
                label: "Total Vaccines",
                value: totals.vaccines.toLocaleString(),
                sub: "doses",
              },
              {
                icon: MapPin,
                label: "Areas",
                value: deployments.length,
                sub: "barangays",
              },
              {
                icon: AlertCircle,
                label: "Animals",
                value: totals.animals.toLocaleString(),
                sub: "targeted",
              },
            ].map((s, i) => (
              <div
                key={i}
                className="bg-white/15 border border-white/20 rounded-xl px-4 py-3"
              >
                <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">
                  {s.label}
                </p>
                <p className="text-2xl font-black text-white mt-1">
                  {s.value}
                </p>
                <p className="text-white/50 text-xs">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Deployment Cards ── */}
        <div className="divide-y divide-slate-100">
          {deployments.map((d) => {
            const urgMeta = UM[d.urgency];
            const statusMeta = SM[d.status];
            const StatusIcon = statusMeta.icon;

            return (
              <div
                key={d.id}
                className={`p-5 transition-colors hover:bg-slate-50/50 ${d.status === "completed" ? "opacity-60" : ""}`}
              >
                <div className="flex items-start gap-4">
                  {/* Priority circle */}
                  <div
                    className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 font-black text-white text-lg"
                    style={{
                      background: `linear-gradient(135deg, ${RC(d.riskScore)}cc, ${RC(d.riskScore)})`,
                    }}
                  >
                    #{d.priority}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Badges row */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border"
                        style={{
                          background: urgMeta.bg,
                          color: urgMeta.text,
                          borderColor: urgMeta.border,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: urgMeta.dot }}
                        />
                        {d.urgency}
                      </span>
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-semibold"
                        style={{ color: statusMeta.color }}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusMeta.label}
                      </span>
                      {/* Risk score */}
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-xs text-slate-400 font-medium">
                          Risk
                        </span>
                        <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${d.riskScore}%`,
                              background: RC(d.riskScore),
                            }}
                          />
                        </div>
                        <span
                          className="text-xs font-bold"
                          style={{ color: RC(d.riskScore) }}
                        >
                          {d.riskScore}
                        </span>
                      </div>
                    </div>

                    <p className="font-bold text-slate-800">
                      {d.barangay}
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5 mb-3">
                      {d.reason}
                    </p>

                    {/* Resource mini-cards */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {[
                        {
                          label: "Staff",
                          value: d.staffNeeded,
                          sub: "people",
                          bg: "#eff6ff",
                          col: "#1d4ed8",
                        },
                        {
                          label: "Vaccines",
                          value: d.medicineEstimate.vaccines,
                          sub: "doses",
                          bg: "#f0fdf4",
                          col: "#15803d",
                        },
                        {
                          label: "Duration",
                          value: d.estimatedDuration,
                          sub: "",
                          bg: "#f5f3ff",
                          col: "#7c3aed",
                        },
                        {
                          label: "Animals",
                          value:
                            d.targetAnimals.toLocaleString(),
                          sub: "targets",
                          bg: "#fef2f2",
                          col: "#b91c1c",
                        },
                      ].map((r, i) => (
                        <div
                          key={i}
                          className="rounded-xl p-2.5 border"
                          style={{
                            background: r.bg,
                            borderColor: r.col + "30",
                          }}
                        >
                          <p
                            className="text-[10px] font-bold uppercase tracking-wide mb-1"
                            style={{ color: r.col }}
                          >
                            {r.label}
                          </p>
                          <p
                            className="text-sm font-black"
                            style={{ color: r.col }}
                          >
                            {r.value}
                          </p>
                          {r.sub && (
                            <p
                              className="text-[10px]"
                              style={{ color: r.col + "99" }}
                            >
                              {r.sub}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Medicine row */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-lg">
                        💉 {d.medicineEstimate.vaccines}{" "}
                        vaccines
                      </span>
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-lg">
                        💊 {d.medicineEstimate.antibiotics}{" "}
                        antibiotics
                      </span>
                      <span className="px-2.5 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-lg">
                        🌿 {d.medicineEstimate.vitamins}{" "}
                        vitamins
                      </span>
                    </div>

                    {/* Equipment chips */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {d.equipmentNeeded.map((e, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-lg font-medium"
                        >
                          · {e}
                        </span>
                      ))}
                    </div>

                    {/* Deployed info */}
                    {d.deployedAt && (
                      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 mb-3 flex items-center gap-2">
                        <BadgeCheck className="w-4 h-4 text-green-600 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-green-800">
                            Deployed: {d.deployedAt}
                          </p>
                          {d.deployedStaff?.length && (
                            <p className="text-xs text-green-600">
                              {d.deployedStaff.join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {d.notes && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-3">
                        <p className="text-xs font-bold text-amber-700 mb-0.5">
                          Notes
                        </p>
                        <p className="text-xs text-amber-800">
                          {d.notes}
                        </p>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      {d.status === "pending" && (
                        <button
                          onClick={() => setDeployTarget(d)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-[#60A85C] text-white text-xs font-bold rounded-xl hover:bg-[#4a8a47] transition-colors shadow-sm"
                        >
                          <Truck className="w-3.5 h-3.5" />{" "}
                          Deploy Team
                        </button>
                      )}
                      {d.status === "deployed" && (
                        <button
                          onClick={() => handleComplete(d)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                          <BadgeCheck className="w-3.5 h-3.5" />{" "}
                          Mark Complete
                        </button>
                      )}
                      <button
                        onClick={() => handleGeneratePlan(d)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#2B5EA6] text-white text-xs font-bold rounded-xl hover:bg-[#1e4080] transition-colors shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />{" "}
                        Download Plan
                      </button>
                      <button
                        onClick={() => printPlan(d)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
                      >
                        <Printer className="w-3.5 h-3.5" />{" "}
                        Print Plan
                      </button>
                      {d.status !== "completed" && (
                        <button
                          onClick={() => setModifyTarget(d)}
                          className="flex items-center gap-1.5 px-4 py-2 border-2 border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-100 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />{" "}
                          Modify
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Optimization tip */}
        <div className="m-5 p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-blue-800">
              Optimization Tip
            </p>
            <p className="text-sm text-blue-700 mt-0.5 leading-relaxed">
              Deploying teams to Bagong Tubig and Balimbing on
              the same day can share 2 staff members and reduce
              travel time by 30%. Total staff requirement can be
              reduced from 10 to 8 personnel.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}