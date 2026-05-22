import { useState, useRef } from "react";
import {
  Lightbulb,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  Syringe,
  BookOpen,
  Shield,
  FileText,
  Download,
  Pencil,
  X,
  Plus,
  Trash2,
  Printer,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Zap,
  Building2,
  Calendar,
  ClipboardList,
  BadgeCheck,
  CircleDot,
  Circle,
} from "lucide-react";

// ─── TYPES ──────────────────────────────────────────────────────────────────

type Urgency = "Immediate" | "Within 1 Week" | "Scheduled";
type IType = "outbreak" | "mortality" | "coverage" | "trend";
type Status = "pending" | "in-progress" | "completed";

interface Intervention {
  id: string;
  issue: string;
  type: IType;
  barangay: string;
  actions: string[];
  urgency: Urgency;
  priority: number;
  estimatedStaff: number;
  estimatedMedicines: string;
  affectedAnimals: number;
  status: Status;
  approvedAt?: string;
  completedAt?: string;
  notes?: string;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

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
  "Within 1 Week": {
    bg: "#fffbeb",
    text: "#92400e",
    border: "#fcd34d",
    dot: "#f59e0b",
  },
  Scheduled: {
    bg: "#eff6ff",
    text: "#1d4ed8",
    border: "#93c5fd",
    dot: "#3b82f6",
  },
};

const TYPE_META: Record<
  IType,
  { icon: any; bg: string; color: string; label: string }
> = {
  outbreak: {
    icon: AlertCircle,
    bg: "#fef2f2",
    color: "#dc2626",
    label: "Outbreak",
  },
  mortality: {
    icon: Shield,
    bg: "#fdf4ff",
    color: "#9333ea",
    label: "Mortality",
  },
  coverage: {
    icon: Syringe,
    bg: "#f0fdf4",
    color: "#16a34a",
    label: "Coverage",
  },
  trend: {
    icon: BookOpen,
    bg: "#fff7ed",
    color: "#ea580c",
    label: "Trend",
  },
};

const STATUS_META: Record<
  Status,
  { label: string; color: string; icon: any }
> = {
  pending: { label: "Pending", color: "#6b7280", icon: Circle },
  "in-progress": {
    label: "In Progress",
    color: "#2563eb",
    icon: CircleDot,
  },
  completed: {
    label: "Completed",
    color: "#16a34a",
    icon: BadgeCheck,
  },
};

function now() {
  return new Date().toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── PRINT REPORT ────────────────────────────────────────────────────────────

function printReport(iv: Intervention) {
  const urgMeta = URGENCY_META[iv.urgency];
  const typeMeta = TYPE_META[iv.type];

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Intervention Report – ${iv.id}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; color: #1e293b; background: #fff; padding: 40px; font-size: 13px; }

    .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 3px solid #2B5EA6; padding-bottom: 20px; margin-bottom: 28px; }
    .logo-block { display: flex; align-items: center; gap: 14px; }
    .logo-circle { width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, #2B5EA6, #1e4080); display: flex; align-items: center; justify-content: center; color: white; font-size: 22px; }
    .org h1 { font-size: 17px; font-weight: 800; color: #1e293b; }
    .org p { font-size: 11px; color: #64748b; margin-top: 2px; }
    .report-meta { text-align: right; }
    .report-meta .report-id { font-size: 20px; font-weight: 800; color: #2B5EA6; }
    .report-meta .report-date { font-size: 11px; color: #64748b; margin-top: 4px; }

    .title-band { background: linear-gradient(135deg, #1e3a5f, #2B5EA6); color: white; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; }
    .title-band h2 { font-size: 18px; font-weight: 800; margin-bottom: 6px; }
    .title-band .meta-row { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 10px; }
    .meta-pill { background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.25); border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 600; }

    .section { margin-bottom: 22px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }

    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
    .info-box .label { font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
    .info-box .value { font-size: 14px; font-weight: 700; color: #1e293b; }

    .urgency-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; border: 1px solid ${urgMeta.border}; background: ${urgMeta.bg}; color: ${urgMeta.text}; }
    .type-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; background: ${typeMeta.bg}; color: ${typeMeta.color}; border: 1px solid ${typeMeta.color}30; }

    .action-list { list-style: none; }
    .action-item { display: flex; gap: 12px; align-items: flex-start; padding: 10px 12px; border-radius: 8px; margin-bottom: 6px; background: #f8fafc; border: 1px solid #e2e8f0; }
    .action-num { width: 24px; height: 24px; border-radius: 50%; background: #2B5EA6; color: white; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-center: center; text-align: center; line-height: 24px; flex-shrink: 0; }
    .action-text { font-size: 12px; color: #334155; line-height: 1.5; }

    .resource-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .resource-box { border-radius: 8px; padding: 14px; }
    .resource-box.staff { background: #eff6ff; border: 1px solid #bfdbfe; }
    .resource-box.meds { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .resource-box .rlabel { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
    .resource-box.staff .rlabel { color: #1d4ed8; }
    .resource-box.meds .rlabel { color: #15803d; }
    .resource-box .rvalue { font-size: 15px; font-weight: 800; }
    .resource-box.staff .rvalue { color: #1e3a8a; }
    .resource-box.meds .rvalue { color: #14532d; }

    .notes-box { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 14px; font-size: 12px; color: #451a03; line-height: 1.6; }

    .status-bar { display: flex; align-items: center; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 22px; }
    .status-dot { width: 10px; height: 10px; border-radius: 50%; background: ${iv.status === "completed" ? "#16a34a" : iv.status === "in-progress" ? "#2563eb" : "#6b7280"}; }
    .status-label { font-weight: 700; font-size: 13px; color: ${iv.status === "completed" ? "#15803d" : iv.status === "in-progress" ? "#1d4ed8" : "#374151"}; }
    ${iv.approvedAt ? ".status-time { font-size: 11px; color: #94a3b8; margin-left: auto; }" : ""}

    .signature-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 40px; }
    .sig-line { border-top: 1px solid #cbd5e1; padding-top: 8px; }
    .sig-label { font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; }
    .sig-name { font-size: 11px; color: #475569; margin-top: 2px; }

    .footer { margin-top: 36px; border-top: 1px solid #e2e8f0; padding-top: 14px; display: flex; justify-content: space-between; align-items: center; }
    .footer p { font-size: 10px; color: #94a3b8; }

    @media print {
      body { padding: 24px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="logo-block">
      <div class="logo-circle"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg></div>
      <div class="org">
        <h1>NASaAlaga — Veterinary Management System</h1>
        <p>City Government of Calaca, Batangas · Office of the City Veterinarian</p>
      </div>
    </div>
    <div class="report-meta">
      <div class="report-id">RPT-${(iv.id ?? '').toUpperCase()}</div>
      <div class="report-date">Generated: ${now()}</div>
    </div>
  </div>

  <div class="title-band">
    <h2>${iv.issue}</h2>
    <div class="meta-row">
      <span class="meta-pill">${iv.barangay}</span>
      <span class="meta-pill">${iv.affectedAnimals.toLocaleString()} animals affected</span>
      <span class="meta-pill">Priority #${iv.priority}</span>
      <span class="meta-pill">${typeMeta.label}</span>
    </div>
  </div>

  <div class="status-bar">
    <div class="status-dot"></div>
    <span class="status-label">${STATUS_META[iv.status].label}</span>
    ${iv.approvedAt ? `<span class="status-time">Approved: ${iv.approvedAt}</span>` : ""}
    ${iv.completedAt ? `<span class="status-time" style="margin-left:0"> · Completed: ${iv.completedAt}</span>` : ""}
  </div>

  <div class="section">
    <div class="section-title">Classification &amp; Urgency</div>
    <div class="info-grid">
      <div class="info-box"><div class="label">Urgency Level</div><div class="value"><span class="urgency-badge">${iv.urgency}</span></div></div>
      <div class="info-box"><div class="label">Issue Type</div><div class="value"><span class="type-badge">${typeMeta.label}</span></div></div>
      <div class="info-box"><div class="label">Priority Ranking</div><div class="value">#${iv.priority} of all active interventions</div></div>
      <div class="info-box"><div class="label">Target Barangay</div><div class="value">${iv.barangay}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Recommended Action Plan</div>
    <ol class="action-list">
      ${iv.actions
        .map(
          (a, i) => `
        <li class="action-item">
          <div class="action-num">${i + 1}</div>
          <div class="action-text">${a}</div>
        </li>
      `,
        )
        .join("")}
    </ol>
  </div>

  <div class="section">
    <div class="section-title">Resource Requirements</div>
    <div class="resource-grid">
      <div class="resource-box staff">
        <div class="rlabel">Personnel Required</div>
        <div class="rvalue">${iv.estimatedStaff} staff members</div>
      </div>
      <div class="resource-box meds">
        <div class="rlabel">Medicine &amp; Supplies</div>
        <div class="rvalue" style="font-size:12px;line-height:1.5">${iv.estimatedMedicines}</div>
      </div>
    </div>
  </div>

  ${
    iv.notes
      ? `
  <div class="section">
    <div class="section-title">Notes &amp; Additional Instructions</div>
    <div class="notes-box">${iv.notes}</div>
  </div>`
      : ""
  }

  <div class="signature-grid">
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">Prepared By</div>
      <div class="sig-name">Veterinary Staff</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">Reviewed By</div>
      <div class="sig-name">BAHW / Supervisor</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">Approved By</div>
      <div class="sig-name">City Veterinarian</div>
    </div>
  </div>

  <div class="footer">
    <p>NASaAlaga Veterinary Management System · Calaca City Government</p>
    <p>CONFIDENTIAL — For official use only · ${now()}</p>
  </div>

</body>
</html>`;

  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
  }, 500);
}

// ─── MODIFY MODAL ────────────────────────────────────────────────────────────

function ModifyModal({
  iv,
  onSave,
  onClose,
}: {
  iv: Intervention;
  onSave: (updated: Intervention) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Intervention>({
    ...iv,
    actions: [...iv.actions],
  });
  const [newAction, setNewAction] = useState("");

  const addAction = () => {
    if (!newAction.trim()) return;
    setDraft((d) => ({
      ...d,
      actions: [...d.actions, newAction.trim()],
    }));
    setNewAction("");
  };

  const removeAction = (i: number) =>
    setDraft((d) => ({
      ...d,
      actions: d.actions.filter((_, idx) => idx !== i),
    }));
  const updateAction = (i: number, val: string) =>
    setDraft((d) => ({
      ...d,
      actions: d.actions.map((a, idx) => (idx === i ? val : a)),
    }));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2B5EA6] px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Pencil className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">
                Modify Intervention Plan
              </p>
              <p className="text-white/60 text-xs">
                {iv.id} · {iv.barangay}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Issue title */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Issue / Title
            </label>
            <input
              value={draft.issue}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  issue: e.target.value,
                }))
              }
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
            />
          </div>

          {/* Row: urgency, priority, staff */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Urgency
              </label>
              <select
                value={draft.urgency}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    urgency: e.target.value as Urgency,
                  }))
                }
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] bg-white"
              >
                <option>Immediate</option>
                <option>Within 1 Week</option>
                <option>Scheduled</option>
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
                  setDraft((d) => ({
                    ...d,
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
                value={draft.estimatedStaff}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    estimatedStaff: +e.target.value,
                  }))
                }
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
              />
            </div>
          </div>

          {/* Medicines */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Medicine & Supplies
            </label>
            <input
              value={draft.estimatedMedicines}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  estimatedMedicines: e.target.value,
                }))
              }
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
              placeholder="e.g. Antibiotics (50 doses), Vaccines (200 doses)"
            />
          </div>

          {/* Affected animals */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Affected Animals
            </label>
            <input
              type="number"
              min={0}
              value={draft.affectedAnimals}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  affectedAnimals: +e.target.value,
                }))
              }
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
            />
          </div>

          {/* Actions */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Action Steps
            </label>
            <div className="space-y-2 mb-3">
              {draft.actions.map((a, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="w-6 h-6 mt-1.5 shrink-0 bg-[#2B5EA6] text-white rounded-full text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <input
                    value={a}
                    onChange={(e) =>
                      updateAction(i, e.target.value)
                    }
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
                  />
                  <button
                    onClick={() => removeAction(i)}
                    className="mt-1 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && addAction()
                }
                placeholder="Add new action step…"
                className="flex-1 px-3 py-2 border border-dashed border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"
              />
              <button
                onClick={addAction}
                className="px-3 py-2 bg-[#2B5EA6] text-white rounded-xl hover:bg-[#1e4080] transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Notes / Additional Instructions
            </label>
            <textarea
              value={draft.notes || ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  notes: e.target.value,
                }))
              }
              rows={3}
              placeholder="Any special instructions, conditions, or remarks…"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-slate-100 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="flex-1 py-2.5 bg-[#2B5EA6] text-white rounded-xl text-sm font-bold hover:bg-[#1e4080] transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TOAST ───────────────────────────────────────────────────────────────────

function Toast({
  msg,
  sub,
  type,
  onDone,
}: {
  msg: string;
  sub: string;
  type: "success" | "info";
  onDone: () => void;
}) {
  return (
    <div
      className="fixed bottom-6 right-6 z-[100] flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl border animate-[slideUp_0.3s_ease_forwards] max-w-sm"
      style={{
        background: type === "success" ? "#f0fdf4" : "#eff6ff",
        borderColor: type === "success" ? "#86efac" : "#93c5fd",
      }}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${type === "success" ? "bg-green-500" : "bg-blue-500"}`}
      >
        <CheckCircle className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1">
        <p
          className={`font-bold text-sm ${type === "success" ? "text-green-800" : "text-blue-800"}`}
        >
          {msg}
        </p>
        <p
          className={`text-xs mt-0.5 ${type === "success" ? "text-green-600" : "text-blue-600"}`}
        >
          {sub}
        </p>
      </div>
      <button
        onClick={onDone}
        className="text-slate-400 hover:text-slate-600"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function InterventionRecommendations() {
  const [interventions, setInterventions] = useState<
    Intervention[]
  >([
    {
      id: "int-001",
      issue: "Possible ASF Outbreak in Bagong Tubig",
      type: "outbreak",
      barangay: "Bagong Tubig",
      actions: [
        "Immediate field investigation by veterinary team",
        "Emergency blood sample collection for laboratory testing",
        "Implement movement control and quarantine protocols",
        "Deploy rapid response team within 4 hours",
        "Contact tracing of all pig movements in last 14 days",
      ],
      urgency: "Immediate",
      priority: 1,
      estimatedStaff: 5,
      estimatedMedicines: "N/A - Quarantine protocol",
      affectedAnimals: 45,
      status: "pending",
    },
    {
      id: "int-002",
      issue: "Abnormal Swine Mortality - Poblacion 2",
      type: "mortality",
      barangay: "Poblacion 2",
      actions: [
        "Conduct immediate farm-to-farm surveillance",
        "Deploy veterinary mission for health assessment",
        "Collect samples for disease diagnosis",
        "Provide emergency treatment supplies",
        "Monitor for 7 days post-intervention",
      ],
      urgency: "Immediate",
      priority: 2,
      estimatedStaff: 4,
      estimatedMedicines:
        "Antibiotics (50 doses), Vitamins (100 doses)",
      affectedAnimals: 180,
      status: "in-progress",
      approvedAt: "Jan 12, 2025 · 09:14 AM",
    },
    {
      id: "int-003",
      issue: "Low Rabies Vaccination Coverage - Cahil",
      type: "coverage",
      barangay: "Cahil",
      actions: [
        "Schedule mass vaccination drive",
        "Community education campaign on rabies prevention",
        "Door-to-door pet registration and vaccination",
        "Coordinate with barangay officials for support",
        "Follow-up monitoring after 2 weeks",
      ],
      urgency: "Within 1 Week",
      priority: 3,
      estimatedStaff: 3,
      estimatedMedicines: "Rabies vaccine (200 doses)",
      affectedAnimals: 250,
      status: "pending",
    },
    {
      id: "int-004",
      issue: "Critical Poultry Vaccination Gap - Balimbing",
      type: "coverage",
      barangay: "Balimbing",
      actions: [
        "Urgent vaccination campaign for all poultry",
        "Enhanced biosecurity training for farmers",
        "Distribute protective equipment and disinfectants",
        "Establish monitoring checkpoints",
        "Weekly surveillance for 4 weeks",
      ],
      urgency: "Immediate",
      priority: 1,
      estimatedStaff: 6,
      estimatedMedicines:
        "Avian flu vaccine (1500 doses), Newcastle (1500 doses)",
      affectedAnimals: 3200,
      status: "pending",
    },
    {
      id: "int-005",
      issue: "Antibiotic Usage Spike - Bambang",
      type: "trend",
      barangay: "Bambang",
      actions: [
        "Field investigation to identify infection source",
        "Water quality testing for livestock facilities",
        "Hygiene and sanitation assessment",
        "Farmer training on biosecurity measures",
        "Monthly follow-up for 3 months",
      ],
      urgency: "Within 1 Week",
      priority: 4,
      estimatedStaff: 2,
      estimatedMedicines:
        "Disinfectants, Probiotics (optional)",
      affectedAnimals: 95,
      status: "pending",
    },
  ]);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [modifying, setModifying] =
    useState<Intervention | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    sub: string;
    type: "success" | "info";
  } | null>(null);

  const showToast = (
    msg: string,
    sub: string,
    type: "success" | "info" = "success",
  ) => {
    setToast({ msg, sub, type });
    setTimeout(() => setToast(null), 4000);
  };

  const updateIv = (updated: Intervention) => {
    setInterventions((prev) =>
      prev.map((i) => (i.id === updated.id ? updated : i)),
    );
    showToast(
      "Plan Updated",
      `Changes to ${updated.barangay} intervention saved.`,
      "info",
    );
  };

  const approve = (iv: Intervention) => {
    setInterventions((prev) =>
      prev.map((i) =>
        i.id === iv.id
          ? { ...i, status: "in-progress", approvedAt: now() }
          : i,
      ),
    );
    showToast(
      "Intervention Approved & Executing",
      `Action plan for ${iv.barangay} is now in progress.`,
    );
  };

  const complete = (iv: Intervention) => {
    setInterventions((prev) =>
      prev.map((i) =>
        i.id === iv.id
          ? { ...i, status: "completed", completedAt: now() }
          : i,
      ),
    );
    showToast(
      "Intervention Completed",
      `${iv.barangay} case has been marked as resolved.`,
    );
  };

  const counts = {
    pending: interventions.filter((i) => i.status === "pending")
      .length,
    inProgress: interventions.filter(
      (i) => i.status === "in-progress",
    ).length,
    completed: interventions.filter(
      (i) => i.status === "completed",
    ).length,
  };

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      {toast && (
        <Toast
          msg={toast.msg}
          sub={toast.sub}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
      {modifying && (
        <ModifyModal
          iv={modifying}
          onSave={updateIv}
          onClose={() => setModifying(null)}
        />
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {/* ── Page Header ── */}
        <div className="bg-gradient-to-r from-[#b45309] to-[#d97706] px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
                <Lightbulb className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">
                  Intervention Recommendations
                </h3>
                <p className="text-white/70 text-sm mt-0.5">
                  AI-suggested actions · {interventions.length}{" "}
                  active plans
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                interventions.forEach((iv) => printReport(iv))
              }
              className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm font-semibold rounded-xl transition-all"
            >
              <Printer className="w-4 h-4" />
              Export All Reports
            </button>
          </div>

          {/* Status summary pills */}
          <div className="flex gap-2 mt-5">
            {[
              {
                label: "Pending",
                count: counts.pending,
                bg: "rgba(0,0,0,0.25)",
                border: "rgba(255,255,255,0.20)",
              },
              {
                label: "In Progress",
                count: counts.inProgress,
                bg: "rgba(29,78,216,0.5)",
                border: "rgba(147,197,253,0.4)",
              },
              {
                label: "Completed",
                count: counts.completed,
                bg: "rgba(21,128,61,0.5)",
                border: "rgba(134,239,172,0.4)",
              },
            ].map((p) => (
              <div
                key={p.label}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{
                  background: p.bg,
                  border: `1px solid ${p.border}`,
                }}
              >
                <span className="text-lg font-black text-white">
                  {p.count}
                </span>
                <span className="text-xs font-semibold text-white">
                  {p.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Intervention List ── */}
        <div className="divide-y divide-slate-100">
          {interventions.map((iv) => {
            const isOpen = expanded === iv.id;
            const urgMeta = URGENCY_META[iv.urgency];
            const typeMeta = TYPE_META[iv.type];
            const statusMeta = STATUS_META[iv.status];
            const TypeIcon = typeMeta.icon;
            const StatusIcon = statusMeta.icon;

            return (
              <div
                key={iv.id}
                className={`transition-colors ${iv.status === "completed" ? "opacity-60" : ""}`}
              >
                {/* Card header row */}
                <div
                  className="px-6 py-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
                  onClick={() =>
                    setExpanded(isOpen ? null : iv.id)
                  }
                >
                  <div className="flex items-start gap-4">
                    {/* Type icon */}
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: typeMeta.bg }}
                    >
                      <TypeIcon
                        className="w-5 h-5"
                        style={{ color: typeMeta.color }}
                      />
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        {/* Urgency badge */}
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
                          {iv.urgency}
                        </span>
                        {/* Priority */}
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">
                          Priority #{iv.priority}
                        </span>
                        {/* Status */}
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-semibold"
                          style={{ color: statusMeta.color }}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusMeta.label}
                        </span>
                      </div>

                      <p className="font-bold text-slate-800 text-sm leading-snug">
                        {iv.issue}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {iv.barangay}
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {iv.affectedAnimals.toLocaleString()}{" "}
                          animals
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {iv.estimatedStaff} staff
                        </span>
                      </div>
                      {iv.approvedAt && (
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Approved: {iv.approvedAt}
                        </p>
                      )}
                    </div>

                    {/* Expand toggle */}
                    <div className="text-slate-400 shrink-0 mt-1">
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded panel */}
                {isOpen && (
                  <div className="bg-slate-50/60 border-t border-slate-100 px-6 py-5 space-y-5">
                    {/* Actions list */}
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <ClipboardList className="w-3.5 h-3.5" />{" "}
                        Action Plan
                      </p>
                      <ol className="space-y-2">
                        {iv.actions.map((action, i) => (
                          <li
                            key={i}
                            className="flex gap-3 items-start bg-white border border-slate-100 rounded-xl px-4 py-3"
                          >
                            <span className="w-6 h-6 shrink-0 bg-[#2B5EA6] text-white rounded-full text-xs flex items-center justify-center font-bold">
                              {i + 1}
                            </span>
                            <span className="text-sm text-slate-700 leading-relaxed">
                              {action}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Resources */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          Personnel Required
                        </p>
                        <p className="text-2xl font-black text-blue-900">
                          {iv.estimatedStaff}
                        </p>
                        <p className="text-xs text-blue-500">
                          staff members
                        </p>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                          <Syringe className="w-3.5 h-3.5" />
                          Medicine & Supplies
                        </p>
                        <p className="text-sm font-semibold text-emerald-900 leading-relaxed">
                          {iv.estimatedMedicines}
                        </p>
                      </div>
                    </div>

                    {/* Notes */}
                    {iv.notes && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1.5">
                          Notes
                        </p>
                        <p className="text-sm text-amber-900 leading-relaxed">
                          {iv.notes}
                        </p>
                      </div>
                    )}

                    {/* Timeline */}
                    {(iv.approvedAt || iv.completedAt) && (
                      <div className="bg-white border border-slate-200 rounded-xl p-4">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                          Timeline
                        </p>
                        <div className="space-y-2">
                          {iv.approvedAt && (
                            <div className="flex items-center gap-2 text-xs">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              <span className="text-slate-500">
                                Approved:
                              </span>
                              <span className="font-semibold text-slate-700">
                                {iv.approvedAt}
                              </span>
                            </div>
                          )}
                          {iv.completedAt && (
                            <div className="flex items-center gap-2 text-xs">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              <span className="text-slate-500">
                                Completed:
                              </span>
                              <span className="font-semibold text-slate-700">
                                {iv.completedAt}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {/* Approve → in-progress */}
                      {iv.status === "pending" && (
                        <button
                          onClick={() => approve(iv)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-[#60A85C] text-white text-sm font-bold rounded-xl hover:bg-[#4a8a47] transition-colors shadow-sm"
                        >
                          <BadgeCheck className="w-4 h-4" />{" "}
                          Approve & Execute
                        </button>
                      )}
                      {/* Mark complete */}
                      {iv.status === "in-progress" && (
                        <button
                          onClick={() => complete(iv)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                          <CheckCircle className="w-4 h-4" />{" "}
                          Mark as Completed
                        </button>
                      )}
                      {/* Print report */}
                      <button
                        onClick={() => {
                          printReport(iv);
                          showToast(
                            "Report Ready",
                            `Intervention report for ${iv.barangay} opened for printing.`,
                            "info",
                          );
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#2B5EA6] text-white text-sm font-bold rounded-xl hover:bg-[#1e4080] transition-colors shadow-sm"
                      >
                        <Printer className="w-4 h-4" /> Print
                        Report
                      </button>
                      {/* Modify */}
                      {iv.status !== "completed" && (
                        <button
                          onClick={() => setModifying(iv)}
                          className="flex items-center gap-2 px-4 py-2.5 border-2 border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-100 transition-colors"
                        >
                          <Pencil className="w-4 h-4" /> Modify
                          Plan
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}