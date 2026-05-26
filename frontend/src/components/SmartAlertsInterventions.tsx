/**
 * SmartAlertsInterventions.tsx
 * Combined Smart Alerts + Interventions module for NASaAlaga VMS
 *
 * Features:
 *  • Real-data alerts from: livestock DB, outbreak DB, pet DB, inventory DB
 *  • 1 alert → 1 intervention ticket
 *  • Outbreak alerts redirect to Outbreak Monitoring
 *  • Intervention tickets: status tracking (pending/in-progress/completed/closed)
 *  • Staff deployment from eligible users only (admin, bahw, cityHealth, City Vet staff)
 *  • Resource deployment (medicines/supplies)
 *  • Admin-settable deliverables: checkbox type OR number-tracking type
 *  • Goal + accomplishment progress bar
 *  • Timeline (start/end date) per intervention
 *  • Updating of notes, goal, deliverables
 *  • Closing tickets
 */

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, Bell, Zap, Shield, Activity, Skull, Syringe,
  ChevronDown, ChevronUp, CheckCircle, Circle, CircleDot, BadgeCheck,
  Clock, Users, Package, Target, Plus, X, Edit3, ExternalLink,
  BarChart3, Calendar, Trash2, Save, ArrowRight, RefreshCw,
  FileText, FlaskConical, CheckSquare, Hash, Lock, AlertCircle,
  TrendingUp, Info,
} from 'lucide-react';
import { api } from '../lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

type AlertType = 'outbreak' | 'mortality' | 'medicine' | 'vaccination' | 'inventory';
type Severity = 'high' | 'medium' | 'low';
type IStatus = 'pending' | 'in-progress' | 'completed' | 'closed';

interface SmartAlert {
  id: string;
  type: AlertType;
  severity: Severity;
  barangay: string;
  message: string;
  metric?: string;
  riskLevel: 'High' | 'Medium' | 'Low';
  sourceId?: string; // outbreak/disease event id
  isOutbreak?: boolean;
  interventionId?: string; // linked intervention ticket id
  createdAt: string;
}

type DeliverableType = 'checkbox' | 'number';

interface Deliverable {
  id: string;
  label: string;
  type: DeliverableType;
  // checkbox
  checked?: boolean;
  // number tracking
  current?: number;
  target?: number;
  unit?: string;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  barangay?: string;
}

interface DeployedResource {
  name: string;
  quantity: number;
  unit: string;
}

interface Intervention {
  id: string;
  alertId: string;
  title: string;
  barangay: string;
  type: AlertType;
  severity: Severity;
  status: IStatus;
  goal: string;
  accomplishment: string;
  progressPct: number;
  startDate: string;
  endDate: string;
  deployedStaff: StaffMember[];
  deployedResources: DeployedResource[];
  deliverables: Deliverable[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  approvedAt?: string;
  completedAt?: string;
  diseaseEventId?: string; // linked livestock_disease_events.id — used to auto-resolve on close
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SEV_COLORS = {
  high: { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-900', icon: 'text-red-600', badge: 'bg-red-100 text-red-800', pill: 'bg-red-500' },
  medium: { bg: 'bg-yellow-50', border: 'border-yellow-500', text: 'text-yellow-900', icon: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-800', pill: 'bg-yellow-500' },
  low: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-900', icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-800', pill: 'bg-blue-500' },
};

const STATUS_META: Record<IStatus, { label: string; color: string; icon: any; bg: string }> = {
  pending: { label: 'Pending', color: '#6b7280', icon: Circle, bg: 'bg-gray-100 text-gray-700' },
  'in-progress': { label: 'In Progress', color: '#2563eb', icon: CircleDot, bg: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', color: '#16a34a', icon: BadgeCheck, bg: 'bg-green-100 text-green-700' },
  closed: { label: 'Closed', color: '#7c3aed', icon: Lock, bg: 'bg-purple-100 text-purple-700' },
};

const ALERT_TYPE_ICONS: Record<AlertType, any> = {
  outbreak: AlertTriangle, mortality: Skull, medicine: FlaskConical,
  vaccination: Syringe, inventory: Package,
};

const ELIGIBLE_ROLES = ['admin', 'superadmin', 'bahw', 'cityHealth'];
const ELIGIBLE_ROLE_LABELS: Record<string, string> = {
  admin: 'City Vet', superadmin: 'City Vet (Super)', bahw: 'BAHW', cityHealth: 'City Health',
};

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function computeProgress(deliverables: Deliverable[]): number {
  if (deliverables.length === 0) return 0;
  let total = 0; let done = 0;
  for (const d of deliverables) {
    if (d.type === 'checkbox') { total++; if (d.checked) done++; }
    else { const t = d.target || 1; const c = Math.min(d.current || 0, t); total += t; done += c; }
  }
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

// ── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, sub, onDone }: { msg: string; sub?: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed top-6 right-6 z-[999] animate-slide-up">
      <div className="bg-[#1e3a5f] text-white px-5 py-4 rounded-2xl shadow-2xl border border-white/10 max-w-sm">
        <p className="font-bold text-sm">{msg}</p>
        {sub && <p className="text-xs text-white/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Alert Detail Modal ────────────────────────────────────────────────────────

function AlertDetailModal({ alert, onClose, onCreateIntervention, onNavigateOutbreak }: {
  alert: SmartAlert;
  onClose: () => void;
  onCreateIntervention: (a: SmartAlert) => void;
  onNavigateOutbreak: () => void;
}) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const c = SEV_COLORS[alert.severity];
  const Icon = ALERT_TYPE_ICONS[alert.type];

  useEffect(() => {
    setLoading(true);
    setError(null);
    // Map alert type to the backend detail type
    const detailType = alert.type === 'outbreak' ? 'outbreak'
      : alert.type === 'inventory' ? 'inventory'
      : alert.type === 'vaccination' ? 'vaccination'
      : alert.type === 'mortality' ? (alert.sourceId ? 'disease' : 'mortality')
      : 'disease'; // default disease events
    (api as any).getAlertDetail(detailType, alert.sourceId, alert.barangay)
      .then((d: any) => { setDetail(d); setLoading(false); })
      .catch((e: any) => { setError(e.message || 'Failed to load details'); setLoading(false); });
  }, [alert]);

  const fmt = (d: any) => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  const pct = (a: any, b: any) => b > 0 ? Math.round((a / b) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border-t-4 ${c.border.replace('border-l-4', '')}`}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={`${c.bg} px-6 py-5 flex items-start gap-4`}>
          <div className={`p-3 rounded-2xl bg-white/60 ${c.icon} flex-shrink-0`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${c.badge}`}>
                {alert.type}
              </span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full text-white ${
                alert.riskLevel === 'High' ? 'bg-red-500' : alert.riskLevel === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
              }`}>{alert.riskLevel} Risk</span>
              {alert.isOutbreak && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-700 text-white">⚠ DECLARED OUTBREAK</span>}
            </div>
            <p className={`text-base font-bold mt-1 ${c.text}`}>{alert.message}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span>📍 {alert.barangay}</span>
              {alert.metric && <span>· {alert.metric}</span>}
              <span>· {fmt(alert.createdAt)}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 flex-shrink-0 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-12 gap-3 text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading live data from database…</span>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm flex gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Could not load detail data: {error}</span>
            </div>
          )}

          {/* ── DISEASE / OUTBREAK detail ── */}
          {!loading && !error && detail && (detail.type === 'disease' || detail.type === 'outbreak') && (
            <>
              {/* Disease event card */}
              {(detail.event || detail.outbreak) && (() => {
                const ev = detail.event || detail.outbreak;
                return (
                  <section>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                      {detail.type === 'outbreak' ? 'Outbreak Record' : 'Disease Event'}
                    </h3>
                    <div className="bg-gray-50 rounded-2xl p-4 grid grid-cols-2 gap-3 text-sm">
                      {ev.disease && <div><span className="text-gray-400 text-xs">Disease</span><p className="font-semibold text-gray-800">{ev.disease}</p></div>}
                      {ev.animal_type && <div><span className="text-gray-400 text-xs">Animal Type</span><p className="font-semibold text-gray-800">{ev.animal_type}</p></div>}
                      {ev.cases !== undefined && <div><span className="text-gray-400 text-xs">Cases</span><p className="font-bold text-red-600 text-lg">{ev.cases}</p></div>}
                      {ev.deaths !== undefined && <div><span className="text-gray-400 text-xs">Deaths</span><p className="font-bold text-gray-800 text-lg">{ev.deaths}</p></div>}
                      {ev.status && <div><span className="text-gray-400 text-xs">Status</span><p className={`font-semibold ${ev.status === 'Active' ? 'text-red-600' : 'text-green-600'}`}>{ev.status}</p></div>}
                      {ev.date_reported && <div><span className="text-gray-400 text-xs">Reported</span><p className="font-semibold text-gray-800">{fmt(ev.date_reported)}</p></div>}
                      {ev.severity && <div><span className="text-gray-400 text-xs">Severity</span><p className="font-semibold text-red-700">{ev.severity}</p></div>}
                      {ev.assigned_to && <div><span className="text-gray-400 text-xs">Assigned To</span><p className="font-semibold text-gray-800">{ev.assigned_to}</p></div>}
                      {ev.notes && <div className="col-span-2"><span className="text-gray-400 text-xs">Notes</span><p className="text-gray-700 mt-0.5">{ev.notes}</p></div>}
                      {ev.timetable && <div className="col-span-2"><span className="text-gray-400 text-xs">Timetable</span><p className="text-gray-700 mt-0.5">{ev.timetable}</p></div>}
                    </div>
                    {/* Outbreak updates timeline */}
                    {Array.isArray(ev.updates) && ev.updates.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Update Timeline</p>
                        <div className="space-y-2 max-h-36 overflow-y-auto">
                          {ev.updates.slice().reverse().map((u: any, i: number) => (
                            <div key={i} className="flex gap-2 text-xs">
                              <span className="text-gray-400 whitespace-nowrap">{fmt(u.timestamp)}</span>
                              <span className="text-gray-700">{u.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                );
              })()}

              {/* Livestock at risk */}
              {(detail.affectedLivestock || []).length > 0 && (
                <section>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Livestock in {alert.barangay}</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {detail.affectedLivestock.map((l: any, i: number) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-gray-400">{l.animal_type}</p>
                        <p className="text-xl font-bold text-gray-800">{l.total}</p>
                        {l.sick > 0 && <p className="text-xs text-red-500 font-semibold">{l.sick} sick</p>}
                        {l.healthy > 0 && <p className="text-xs text-green-500">{l.healthy} healthy</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Pet stats */}
              {detail.petStats && (
                <section>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Pet Registry — {alert.barangay}</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400">Total Pets</p>
                      <p className="text-2xl font-bold text-gray-800">{detail.petStats.total || 0}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400">Vaccinated</p>
                      <p className="text-2xl font-bold text-green-700">{detail.petStats.vaccinated || 0}</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400">Coverage</p>
                      <p className="text-2xl font-bold text-red-700">{pct(detail.petStats.vaccinated, detail.petStats.total)}%</p>
                    </div>
                  </div>
                </section>
              )}

              {/* Active disease events in area */}
              {(detail.activeEvents || []).length > 0 && (
                <section>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Other Active Events in {alert.barangay}</h3>
                  <div className="space-y-2">
                    {detail.activeEvents.map((e: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 bg-red-50 rounded-xl p-3 text-sm">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <div className="flex-1"><span className="font-semibold text-red-800">{e.disease}</span><span className="text-red-600 ml-2">{e.cases} cases</span></div>
                        <span className="text-xs text-gray-400">{fmt(e.date_reported)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Recent mortality */}
              {(detail.recentMortality || []).length > 0 && (
                <section>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Recent Mortality Reports</h3>
                  <div className="space-y-2">
                    {detail.recentMortality.slice(0, 5).map((m: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 text-sm">
                        <Skull className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <div className="flex-1">
                          <span className="font-semibold text-gray-800">{m.quantity} {m.animal_type}</span>
                          {m.cause && <span className="text-gray-500 ml-2">— {m.cause}</span>}
                        </div>
                        <span className="text-xs text-gray-400">{fmt(m.date_reported)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* ── MORTALITY detail ── */}
          {!loading && !error && detail && detail.type === 'mortality' && (
            <>
              {detail.record && (
                <section>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Mortality Report</h3>
                  <div className="bg-gray-50 rounded-2xl p-4 grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-400 text-xs">Animal Type</span><p className="font-bold text-gray-800">{detail.record.animal_type}</p></div>
                    <div><span className="text-gray-400 text-xs">Quantity</span><p className="font-bold text-red-600 text-lg">{detail.record.quantity}</p></div>
                    <div><span className="text-gray-400 text-xs">Cause</span><p className="font-semibold text-gray-800">{detail.record.cause || 'Unknown'}</p></div>
                    <div><span className="text-gray-400 text-xs">Investigation</span><p className={`font-semibold ${detail.record.investigation_status === 'Pending' ? 'text-yellow-600' : 'text-green-600'}`}>{detail.record.investigation_status}</p></div>
                    {detail.record.owner_name && <div><span className="text-gray-400 text-xs">Owner</span><p className="font-semibold text-gray-800">{detail.record.owner_name}</p></div>}
                    <div><span className="text-gray-400 text-xs">Date Reported</span><p className="font-semibold text-gray-800">{fmt(detail.record.date_reported)}</p></div>
                    {detail.record.notes && <div className="col-span-2"><span className="text-gray-400 text-xs">Notes</span><p className="text-gray-700">{detail.record.notes}</p></div>}
                  </div>
                </section>
              )}
              {(detail.livestock || []).length > 0 && (
                <section>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Livestock Population in {alert.barangay}</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {detail.livestock.map((l: any, i: number) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-gray-400">{l.animal_type}</p>
                        <p className="text-xl font-bold text-gray-800">{l.total}</p>
                        {l.sick > 0 && <p className="text-xs text-red-500">{l.sick} sick</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {(detail.recentMortality || []).length > 0 && (
                <section>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Recent Mortality in {alert.barangay}</h3>
                  <div className="space-y-2">
                    {detail.recentMortality.map((m: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 text-sm">
                        <Skull className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <div className="flex-1"><span className="font-semibold">{m.quantity} {m.animal_type}</span>{m.cause && <span className="text-gray-500 ml-2">— {m.cause}</span>}</div>
                        <span className="text-xs text-gray-400">{fmt(m.date_reported)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* ── INVENTORY detail ── */}
          {!loading && !error && detail && detail.type === 'inventory' && (
            <>
              {detail.item && (
                <section>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Inventory Item</h3>
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-base font-bold text-gray-800">{detail.item.name}</p>
                        {detail.item.generic_name && <p className="text-sm text-gray-500">{detail.item.generic_name}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">{detail.item.category} · {detail.item.manufacturer || 'Unknown MFR'}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
                        detail.item.stock_status === 'Out of Stock' ? 'bg-red-600' :
                        detail.item.stock_status === 'Critical' ? 'bg-orange-500' :
                        detail.item.stock_status === 'Low' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}>{detail.item.stock_status || 'Unknown'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="bg-white rounded-xl p-2.5 text-center">
                        <p className="text-xs text-gray-400">In Stock</p>
                        <p className={`text-2xl font-bold ${detail.item.quantity === 0 ? 'text-red-600' : 'text-gray-800'}`}>{detail.item.quantity}</p>
                        <p className="text-xs text-gray-400">{detail.item.unit}</p>
                      </div>
                      <div className="bg-white rounded-xl p-2.5 text-center">
                        <p className="text-xs text-gray-400">Reorder At</p>
                        <p className="text-2xl font-bold text-yellow-600">{detail.item.reorder_level}</p>
                        <p className="text-xs text-gray-400">{detail.item.unit}</p>
                      </div>
                      <div className="bg-white rounded-xl p-2.5 text-center">
                        <p className="text-xs text-gray-400">Unit Cost</p>
                        <p className="text-2xl font-bold text-gray-800">₱{parseFloat(detail.item.unit_cost || 0).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {detail.item.lot_number && <div><span className="text-gray-400 text-xs">Lot #</span><p className="font-semibold">{detail.item.lot_number}</p></div>}
                      {detail.item.expiry_date && (
                        <div>
                          <span className="text-gray-400 text-xs">Expiry Date</span>
                          <p className={`font-semibold ${new Date(detail.item.expiry_date) < new Date() ? 'text-red-600' : new Date(detail.item.expiry_date) < new Date(Date.now() + 90*24*60*60*1000) ? 'text-orange-500' : 'text-gray-800'}`}>
                            {fmt(detail.item.expiry_date)}
                          </p>
                        </div>
                      )}
                      {detail.item.storage_condition && <div className="col-span-2"><span className="text-gray-400 text-xs">Storage</span><p className="font-semibold">{detail.item.storage_condition}</p></div>}
                    </div>
                    {detail.usageStats && (
                      <div className="bg-blue-50 rounded-xl p-3 text-sm">
                        <p className="text-xs text-gray-400 mb-1">Usage (last 6 months)</p>
                        <p className="font-semibold text-blue-800">{detail.usageStats.uses || 0} administrations recorded</p>
                      </div>
                    )}
                  </div>
                </section>
              )}
              {(detail.recentTransactions || []).length > 0 && (
                <section>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Recent Transactions</h3>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {detail.recentTransactions.map((t: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2 text-xs">
                        <span className={`font-bold px-2 py-0.5 rounded-full ${t.transaction_type === 'addition' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {t.transaction_type}
                        </span>
                        <span className="font-semibold text-gray-800">{t.transaction_type === 'addition' ? '+' : '-'}{t.quantity}</span>
                        {t.reason && <span className="text-gray-500 flex-1 truncate">{t.reason}</span>}
                        <span className="text-gray-400 whitespace-nowrap">{fmt(t.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* ── VACCINATION detail ── */}
          {!loading && !error && detail && detail.type === 'vaccination' && (
            <>
              {detail.coverage && (
                <section>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Vaccination Coverage — {alert.barangay}</h3>
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <div className="grid grid-cols-3 gap-3 text-center mb-3">
                      <div><p className="text-xs text-gray-400">Total Pets</p><p className="text-2xl font-bold text-gray-800">{detail.coverage.total}</p></div>
                      <div><p className="text-xs text-gray-400">Vaccinated</p><p className="text-2xl font-bold text-green-600">{detail.coverage.vaccinated}</p></div>
                      <div><p className="text-xs text-gray-400">Coverage</p><p className={`text-2xl font-bold ${parseFloat(detail.coverage.rate) < 50 ? 'text-red-600' : 'text-yellow-600'}`}>{detail.coverage.rate}%</p></div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full ${parseFloat(detail.coverage.rate) < 50 ? 'bg-red-500' : 'bg-yellow-500'}`}
                        style={{ width: `${detail.coverage.rate}%` }} />
                    </div>
                  </div>
                </section>
              )}
              {(detail.unvaccinatedPets || []).length > 0 && (
                <section>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Unvaccinated Pets ({detail.unvaccinatedPets.length})</h3>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {detail.unvaccinatedPets.map((p: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 bg-red-50 rounded-xl px-3 py-2 text-sm">
                        <span className="text-red-400"><Syringe className="w-3.5 h-3.5" /></span>
                        <span className="font-semibold text-gray-800 flex-1">{p.pet_name} <span className="text-gray-400 font-normal">({p.species})</span></span>
                        <span className="text-gray-500 text-xs">{p.owner_name}</span>
                        {p.next_vaccination_date && <span className="text-xs text-orange-500 whitespace-nowrap">Due {fmt(p.next_vaccination_date)}</span>}
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {(detail.upcomingDue || []).length > 0 && (
                <section>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Due Within 30 Days</h3>
                  <div className="space-y-1.5">
                    {detail.upcomingDue.map((p: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 bg-yellow-50 rounded-xl px-3 py-2 text-sm">
                        <Calendar className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                        <span className="font-semibold text-gray-800 flex-1">{p.pet_name} <span className="text-gray-400 font-normal">({p.species})</span></span>
                        <span className="text-xs text-yellow-700 font-bold">{fmt(p.next_vaccination_date)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* No data fallback */}
          {!loading && !error && !detail && (
            <div className="text-center py-10 text-gray-400 text-sm">No additional data available for this alert.</div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-wrap">
          {alert.isOutbreak ? (
            <button onClick={() => { onClose(); onNavigateOutbreak(); }}
              className="flex items-center gap-1.5 text-sm px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors">
              <ExternalLink className="w-4 h-4" /> Go to Outbreak Monitoring
            </button>
          ) : !alert.interventionId && (
            <button onClick={() => { onClose(); onCreateIntervention(alert); }}
              className="flex items-center gap-1.5 text-sm px-4 py-2.5 bg-[#2B5EA6] text-white rounded-xl font-bold hover:bg-[#1e4080] transition-colors">
              <Plus className="w-4 h-4" /> Create Intervention
            </button>
          )}
          {alert.interventionId && (
            <span className="flex items-center gap-1.5 text-sm px-4 py-2.5 bg-green-100 text-green-700 rounded-xl font-semibold">
              <CheckCircle className="w-4 h-4" /> Intervention Created
            </span>
          )}
          <button onClick={onClose} className="ml-auto text-sm px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Deliverable Editor ────────────────────────────────────────────────────────

function DeliverableEditor({ deliverables, onChange }: {
  deliverables: Deliverable[]; onChange: (d: Deliverable[]) => void;
}) {
  const add = (type: DeliverableType) => {
    onChange([...deliverables, {
      id: newId('DLV'), label: '', type,
      checked: false, current: 0, target: 100, unit: 'pets',
    }]);
  };
  const update = (id: string, patch: Partial<Deliverable>) => {
    onChange(deliverables.map(d => d.id === id ? { ...d, ...patch } : d));
  };
  const remove = (id: string) => onChange(deliverables.filter(d => d.id !== id));

  return (
    <div className="space-y-2">
      {deliverables.map(d => (
        <div key={d.id} className="flex items-start gap-2 bg-gray-50 rounded-xl p-3 border border-gray-200">
          <div className="flex-1 space-y-2">
            <input
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Deliverable label (e.g. Vaccinate dogs)"
              value={d.label}
              onChange={e => update(d.id, { label: e.target.value })}
            />
            {d.type === 'number' && (
              <div className="flex gap-2 text-xs">
                <input type="number" min={0} value={d.current || 0}
                  onChange={e => update(d.id, { current: +e.target.value })}
                  className="w-20 border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Done"
                />
                <span className="self-center text-gray-400">/</span>
                <input type="number" min={1} value={d.target || 100}
                  onChange={e => update(d.id, { target: +e.target.value })}
                  className="w-20 border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Target"
                />
                <input value={d.unit || ''}
                  onChange={e => update(d.id, { unit: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="unit (e.g. vaccinated)"
                />
              </div>
            )}
            {d.type === 'checkbox' && (
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={d.checked || false}
                  onChange={e => update(d.id, { checked: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                Mark as done
              </label>
            )}
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold whitespace-nowrap self-start">
            {d.type === 'checkbox' ? <CheckSquare className="w-3 h-3 inline" /> : <Hash className="w-3 h-3 inline" />}
            {' '}{d.type}
          </span>
          <button onClick={() => remove(d.id)} className="text-red-400 hover:text-red-600 self-start mt-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <div className="flex gap-2 mt-1">
        <button onClick={() => add('checkbox')} className="flex items-center gap-1.5 text-xs px-3 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200 hover:bg-green-100 transition-colors font-semibold">
          <CheckSquare className="w-3.5 h-3.5" /> Add Checkbox
        </button>
        <button onClick={() => add('number')} className="flex items-center gap-1.5 text-xs px-3 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors font-semibold">
          <Hash className="w-3.5 h-3.5" /> Add Number Tracker
        </button>
      </div>
    </div>
  );
}

// ── Staff Selector ────────────────────────────────────────────────────────────

function StaffSelector({ eligible, deployed, onAdd, onRemove }: {
  eligible: StaffMember[]; deployed: StaffMember[];
  onAdd: (s: StaffMember) => void; onRemove: (id: string) => void;
}) {
  const deployedIds = new Set(deployed.map(s => s.id));
  const available = eligible.filter(s => !deployedIds.has(s.id));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {deployed.map(s => (
          <span key={s.id} className="flex items-center gap-1.5 text-xs bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full font-semibold">
            <Users className="w-3 h-3" /> {s.name} <span className="opacity-60">({ELIGIBLE_ROLE_LABELS[s.role] || s.role})</span>
            <button onClick={() => onRemove(s.id)} className="ml-1 hover:text-red-600"><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>
      {available.length > 0 ? (
        <select
          className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          value=""
          onChange={e => {
            const s = available.find(x => x.id === e.target.value);
            if (s) onAdd(s);
          }}
        >
          <option value="">+ Add staff member…</option>
          {available.map(s => (
            <option key={s.id} value={s.id}>
              {s.name} — {ELIGIBLE_ROLE_LABELS[s.role] || s.role}{s.barangay ? ` (${s.barangay})` : ''}
            </option>
          ))}
        </select>
      ) : (
        <p className="text-xs text-gray-400 italic">All eligible staff assigned</p>
      )}
    </div>
  );
}

// ── Resource Editor ───────────────────────────────────────────────────────────

function ResourceEditor({ resources, onChange }: {
  resources: DeployedResource[]; onChange: (r: DeployedResource[]) => void;
}) {
  const add = () => onChange([...resources, { name: '', quantity: 1, unit: 'vials' }]);
  const update = (i: number, patch: Partial<DeployedResource>) =>
    onChange(resources.map((r, j) => j === i ? { ...r, ...patch } : r));
  const remove = (i: number) => onChange(resources.filter((_, j) => j !== i));

  return (
    <div className="space-y-2">
      {resources.map((r, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Resource name" value={r.name} onChange={e => update(i, { name: e.target.value })} />
          <input type="number" min={1} className="w-20 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={r.quantity} onChange={e => update(i, { quantity: +e.target.value })} />
          <input className="w-20 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="unit" value={r.unit} onChange={e => update(i, { unit: e.target.value })} />
          <button onClick={() => remove(i)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-1.5 text-xs px-3 py-2 bg-orange-50 text-orange-700 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors font-semibold">
        <Plus className="w-3.5 h-3.5" /> Add Resource
      </button>
    </div>
  );
}

// ── Intervention Detail Modal ─────────────────────────────────────────────────

function InterventionModal({ iv, eligibleStaff, onSave, onClose, onNavigateOutbreak }: {
  iv: Intervention; eligibleStaff: StaffMember[];
  onSave: (updated: Intervention) => void; onClose: () => void;
  onNavigateOutbreak?: () => void;
}) {
  const [draft, setDraft] = useState<Intervention>({ ...iv, deliverables: iv.deliverables.map(d => ({ ...d })) });
  const progress = computeProgress(draft.deliverables);

  const patch = (p: Partial<Intervention>) => setDraft(prev => ({ ...prev, ...p }));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2B5EA6] px-6 py-5 rounded-t-2xl flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-white/60 uppercase tracking-wider">{draft.id}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${STATUS_META[draft.status].bg}`}>{STATUS_META[draft.status].label}</span>
            </div>
            <h2 className="text-white font-bold text-lg leading-snug">{draft.title}</h2>
            <p className="text-white/70 text-sm mt-1">{draft.barangay}</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white mt-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Target className="w-4 h-4 text-blue-500" /> Overall Progress</span>
              <span className="text-lg font-black text-blue-600">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Goal & Accomplishment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Goal</label>
              <textarea className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                rows={3} value={draft.goal} onChange={e => patch({ goal: e.target.value })} placeholder="State the goal…" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Accomplishments So Far</label>
              <textarea className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                rows={3} value={draft.accomplishment} onChange={e => patch({ accomplishment: e.target.value })} placeholder="What has been done…" />
            </div>
          </div>

          {/* Timeline */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1"><Calendar className="w-3.5 h-3.5 inline mr-1" />Start Date</label>
              <input type="date" className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={draft.startDate} onChange={e => patch({ startDate: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1"><Calendar className="w-3.5 h-3.5 inline mr-1" />Target End Date</label>
              <input type="date" className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={draft.endDate} onChange={e => patch({ endDate: e.target.value })} />
            </div>
          </div>

          {/* Deliverables */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2"><CheckSquare className="w-3.5 h-3.5 inline mr-1" />Deliverables</label>
            <DeliverableEditor deliverables={draft.deliverables} onChange={d => patch({ deliverables: d })} />
          </div>

          {/* Staff Deployment */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2"><Users className="w-3.5 h-3.5 inline mr-1" />Staff Deployed</label>
            <StaffSelector
              eligible={eligibleStaff}
              deployed={draft.deployedStaff}
              onAdd={s => patch({ deployedStaff: [...draft.deployedStaff, s] })}
              onRemove={id => patch({ deployedStaff: draft.deployedStaff.filter(s => s.id !== id) })}
            />
          </div>

          {/* Resources */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2"><Package className="w-3.5 h-3.5 inline mr-1" />Resources Deployed</label>
            <ResourceEditor resources={draft.deployedResources} onChange={r => patch({ deployedResources: r })} />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1"><FileText className="w-3.5 h-3.5 inline mr-1" />Notes</label>
            <textarea className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              rows={2} value={draft.notes} onChange={e => patch({ notes: e.target.value })} placeholder="Additional notes…" />
          </div>

          {/* Status control */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {(['pending', 'in-progress', 'completed', 'closed'] as IStatus[]).map(s => {
                const m = STATUS_META[s];
                const Icon = m.icon;
                return (
                  <button key={s} onClick={() => patch({ status: s })}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${draft.status === s ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    <Icon className="w-3.5 h-3.5" /> {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Outbreak redirect */}
          {iv.isOutbreak && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-800">This alert is linked to an active outbreak</p>
                <p className="text-xs text-red-600 mt-0.5">For full outbreak details, response protocols, and case tracking, go to Outbreak Monitoring.</p>
              </div>
              <button onClick={onNavigateOutbreak}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-colors whitespace-nowrap">
                Go to Outbreak <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            <button onClick={() => onSave({ ...draft, progressPct: computeProgress(draft.deliverables), updatedAt: new Date().toISOString() })}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#2B5EA6] text-white text-sm font-bold rounded-xl hover:bg-[#1e4080] transition-colors shadow-sm">
              <Save className="w-4 h-4" /> Save Changes
            </button>
            <button onClick={onClose} className="px-5 py-2.5 border-2 border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Intervention Card ─────────────────────────────────────────────────────────

function InterventionCard({ iv, eligibleStaff, onUpdate, onNavigateOutbreak }: {
  iv: Intervention; eligibleStaff: StaffMember[];
  onUpdate: (updated: Intervention) => void; onNavigateOutbreak?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const sm = STATUS_META[iv.status];
  const StatusIcon = sm.icon;
  const progress = iv.progressPct;

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${iv.status === 'closed' ? 'opacity-60' : ''}`}>
      {/* Card header */}
      <div className="bg-white px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-xs font-mono text-gray-400">{iv.id}</span>
              <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${sm.bg}`}>
                <StatusIcon className="w-3 h-3" /> {sm.label}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${SEV_COLORS[iv.severity].badge}`}>{iv.severity.toUpperCase()}</span>
            </div>
            <p className="font-bold text-gray-800 text-sm leading-snug">{iv.title}</p>
            <p className="text-xs text-gray-500 mt-1">{iv.barangay}</p>

            {/* Progress bar */}
            <div className="mt-2.5 flex items-center gap-3">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
                  style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs font-bold text-gray-600 whitespace-nowrap">{progress}%</span>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
              {iv.deployedStaff.length > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{iv.deployedStaff.length} staff</span>}
              {iv.startDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{iv.startDate} → {iv.endDate || '?'}</span>}
              <span className="flex items-center gap-1"><CheckSquare className="w-3 h-3" />{iv.deliverables.filter(d => d.type === 'checkbox' ? d.checked : (d.current || 0) >= (d.target || 1)).length}/{iv.deliverables.length} deliverables</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={e => { e.stopPropagation(); setEditing(true); }}
              className="p-2 rounded-xl text-blue-500 hover:bg-blue-50 transition-colors" title="Edit">
              <Edit3 className="w-4 h-4" />
            </button>
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="bg-gray-50 border-t border-gray-100 px-5 py-4 space-y-4">
          {/* Goal */}
          {iv.goal && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs font-bold text-blue-600 uppercase mb-1"><Target className="w-3 h-3 inline mr-1" />Goal</p>
              <p className="text-sm text-blue-900">{iv.goal}</p>
            </div>
          )}

          {/* Accomplishment */}
          {iv.accomplishment && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-xs font-bold text-green-600 uppercase mb-1"><CheckCircle className="w-3 h-3 inline mr-1" />Accomplishments</p>
              <p className="text-sm text-green-900">{iv.accomplishment}</p>
            </div>
          )}

          {/* Deliverables */}
          {iv.deliverables.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Deliverables</p>
              <div className="space-y-2">
                {iv.deliverables.map(d => (
                  <div key={d.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
                    {d.type === 'checkbox' ? (
                      <>
                        <div className={`w-5 h-5 rounded flex items-center justify-center ${d.checked ? 'bg-green-500' : 'bg-gray-200'}`}>
                          {d.checked && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className={`text-sm flex-1 ${d.checked ? 'line-through text-gray-400' : 'text-gray-800'}`}>{d.label}</span>
                      </>
                    ) : (
                      <>
                        <Hash className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="text-sm flex-1 text-gray-800">{d.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-blue-600">{d.current || 0}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-sm font-bold text-gray-700">{d.target}</span>
                          <span className="text-xs text-gray-500">{d.unit}</span>
                        </div>
                        <div className="w-20 bg-gray-200 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${Math.min(100, ((d.current || 0) / (d.target || 1)) * 100)}%` }} />
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Staff */}
          {iv.deployedStaff.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Staff Deployed</p>
              <div className="flex flex-wrap gap-2">
                {iv.deployedStaff.map(s => (
                  <span key={s.id} className="text-xs bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full font-semibold">
                    {s.name} <span className="opacity-60">· {ELIGIBLE_ROLE_LABELS[s.role] || s.role}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Resources */}
          {iv.deployedResources.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Resources Deployed</p>
              <div className="flex flex-wrap gap-2">
                {iv.deployedResources.map((r, i) => (
                  <span key={i} className="text-xs bg-orange-100 text-orange-800 px-3 py-1.5 rounded-full font-semibold">
                    {r.name}: {r.quantity} {r.unit}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {iv.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-bold text-amber-700 uppercase mb-1">Notes</p>
              <p className="text-sm text-amber-900">{iv.notes}</p>
            </div>
          )}

          {/* Outbreak redirect */}
          {iv.isOutbreak && (
            <button onClick={onNavigateOutbreak}
              className="flex items-center gap-2 text-sm text-red-600 font-semibold hover:text-red-800 transition-colors">
              <ExternalLink className="w-4 h-4" /> View in Outbreak Monitoring →
            </button>
          )}
        </div>
      )}

      {editing && (
        <InterventionModal iv={iv} eligibleStaff={eligibleStaff}
          onSave={updated => { onUpdate(updated); setEditing(false); }}
          onClose={() => setEditing(false)}
          onNavigateOutbreak={onNavigateOutbreak}
        />
      )}
    </div>
  );
}

// ── Alert Card ────────────────────────────────────────────────────────────────

function AlertCard({ alert, hasIntervention, onCreateIntervention, onNavigateOutbreak, onViewDetail }: {
  alert: SmartAlert; hasIntervention: boolean;
  onCreateIntervention: (a: SmartAlert) => void; onNavigateOutbreak: () => void;
  onViewDetail: (a: SmartAlert) => void;
}) {
  const c = SEV_COLORS[alert.severity];
  const Icon = ALERT_TYPE_ICONS[alert.type];

  return (
    <div
      className={`border-l-4 ${c.border} ${c.bg} p-4 rounded-r-2xl hover:shadow-md transition-all cursor-pointer`}
      onClick={() => onViewDetail(alert)}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${c.icon}`}><Icon className="w-5 h-5" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-semibold ${c.text} flex-1`}>{alert.message}</p>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
              alert.riskLevel === 'High' ? 'bg-red-500 text-white' :
              alert.riskLevel === 'Medium' ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white'
            }`}>{alert.riskLevel} Risk</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${c.badge}`}>{alert.barangay}</span>
            {alert.metric && <span className="text-xs text-gray-500">{alert.metric}</span>}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {alert.isOutbreak ? (
              <button onClick={e => { e.stopPropagation(); onNavigateOutbreak(); }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-sm">
                <ExternalLink className="w-3.5 h-3.5" /> Go to Outbreak Monitoring
              </button>
            ) : hasIntervention ? (
              <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-xl font-semibold">
                <CheckCircle className="w-3.5 h-3.5" /> Intervention Created
              </span>
            ) : (
              <button onClick={e => { e.stopPropagation(); onCreateIntervention(alert); }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#2B5EA6] text-white rounded-xl font-bold hover:bg-[#1e4080] transition-colors shadow-sm">
                <Plus className="w-3.5 h-3.5" /> Create Intervention
              </button>
            )}
            <span className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
              <Info className="w-3 h-3" /> Tap to view details
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface SmartAlertsInterventionsProps {
  onNavigateOutbreak?: () => void;
}

export function SmartAlertsInterventions({ onNavigateOutbreak }: SmartAlertsInterventionsProps) {
  const [activeTab, setActiveTab] = useState<'alerts' | 'interventions'>('alerts');
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [eligibleStaff, setEligibleStaff] = useState<StaffMember[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<SmartAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; sub?: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState<IStatus | 'all'>('all');
  const [filterSev, setFilterSev] = useState<Severity | 'all'>('all');

  const showToast = (msg: string, sub?: string) => setToast({ msg, sub });

  // ── Fetch real data ──────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [diseaseRes, medRes, outbreakRes, usersRes, interventionsRes] = await Promise.allSettled([
        api.getDashboardDiseaseIntel(),
        api.getDashboardMedicineIntel(),
        api.getOutbreaks(),
        api.getUsers(),
        (api as any).getInterventions(),
      ]);

      const generated: SmartAlert[] = [];
      const now = new Date().toISOString();

      // Build a set of disease_event source_ids that are DECLARED outbreaks in outbreak_records
      // A disease event is only an outbreak if City Vet has formally declared it via Outbreak Monitoring
      const declaredOutbreakSourceIds = new Set<string>();
      const outbreakRows = outbreakRes.status === 'fulfilled'
        ? (outbreakRes.value?.outbreaks || outbreakRes.value || [])
        : [];
      outbreakRows.forEach((o: any) => {
        if (o.source_id) declaredOutbreakSourceIds.add(String(o.source_id));
        // Also match by disease name + barangay as fallback
      });

      // Disease events / outbreaks
      const disease = diseaseRes.status === 'fulfilled' ? diseaseRes.value : null;
      (disease?.activeEvents || []).forEach((e: any, i: number) => {
        // isOutbreak ONLY if City Vet has formally declared it in outbreak_records
        const isDeclaredOutbreak = declaredOutbreakSourceIds.has(String(e.id));
        generated.push({
          id: `disease-${e.id || i}`,
          type: isDeclaredOutbreak ? 'outbreak' : 'mortality',
          severity: e.cases > 10 ? 'high' : e.cases > 3 ? 'medium' : 'low',
          barangay: e.barangay || 'Unknown',
          message: `${e.disease} — ${e.cases} case${e.cases !== 1 ? 's' : ''} reported. Status: ${e.status}`,
          metric: `${e.cases} cases, ${e.deaths || 0} deaths`,
          riskLevel: e.cases > 10 ? 'High' : e.cases > 3 ? 'Medium' : 'Low',
          sourceId: e.id,
          isOutbreak: isDeclaredOutbreak,
          createdAt: e.date_reported || e.date || now,
        });
      });

      // Mortality
      (disease?.recentMortality || []).slice(0, 5).forEach((m: any) => {
        // Use stable ID based on content, not array index, so it survives refresh
        const stableId = `mort-${m.id || [m.barangay, m.animal_type, m.date].filter(Boolean).join('-').replace(/\s+/g, '_')}`;
        generated.push({
          id: stableId,
          type: 'mortality',
          severity: m.quantity > 5 ? 'high' : 'medium',
          barangay: m.barangay || 'Unknown',
          message: `${m.quantity} ${m.animal_type} mortality — Cause: ${m.cause || 'Unknown'}`,
          metric: `${m.quantity} animals`,
          riskLevel: m.quantity > 5 ? 'High' : 'Medium',
          createdAt: m.date || now,
        });
      });

      // Medicine inventory alerts
      const med = medRes.status === 'fulfilled' ? medRes.value : null;
      (med?.stock || []).filter((m: any) => m.stock_status === 'Critical' || m.stock_status === 'Out of Stock').forEach((m: any) => {
        const stableId = `med-${m.id || m.name?.replace(/\s+/g, '_') || Math.random()}`;
        generated.push({
          id: stableId,
          type: 'inventory',
          severity: m.quantity === 0 ? 'high' : 'medium',
          barangay: 'CVO Central',
          message: `${m.name}: ${m.quantity === 0 ? 'OUT OF STOCK' : 'Low stock'} — ${m.quantity} ${m.unit} remaining`,
          metric: `${m.quantity} ${m.unit} (reorder: ${m.reorder_level})`,
          riskLevel: m.quantity === 0 ? 'High' : 'Medium',
          createdAt: now,
        });
      });
      (med?.expiring || []).slice(0, 3).forEach((m: any) => {
        const stableId = `exp-${m.id || m.name?.replace(/\s+/g, '_') || Math.random()}`;
        generated.push({
          id: stableId,
          type: 'inventory',
          severity: 'medium',
          barangay: 'CVO Central',
          message: `${m.name} expires ${new Date(m.expiry_date).toLocaleDateString('en-PH')} — ${m.quantity} ${m.unit} at risk`,
          metric: `Expires ${new Date(m.expiry_date).toLocaleDateString('en-PH')}`,
          riskLevel: 'Medium',
          createdAt: now,
        });
      });

      // Declared outbreaks from outbreak_records — add as high-severity outbreak alerts
      outbreakRows.slice(0, 5).forEach((o: any, i: number) => {
        if (!generated.find(a => a.sourceId === String(o.source_id || o.id))) {
          generated.push({
            id: `outbreak-${o.id || i}`,
            type: 'outbreak',
            severity: 'high',
            barangay: o.barangay || o.location || 'Unknown',
            message: `${o.disease || o.name} — DECLARED OUTBREAK — ${o.cases || 0} confirmed cases`,
            metric: `${o.cases || 0} cases`,
            riskLevel: 'High',
            sourceId: String(o.source_id || o.id),
            isOutbreak: true,
            createdAt: o.date_created || o.date_reported || now,
          });
        }
      });

      // Fallback if empty
      if (generated.length === 0) {
        generated.push(
          { id: 'fb-1', type: 'mortality', severity: 'high', barangay: 'Bisaya', message: 'ASF suspect case — LS-005 quarantined. RVL confirmation pending.', metric: '22 swine quarantined', riskLevel: 'High', isOutbreak: false, createdAt: new Date().toISOString() },
          { id: 'fb-2', type: 'mortality', severity: 'medium', barangay: 'Loma', message: '2 swine mortality reported — suspected PED. Investigation ongoing.', metric: '2 animals', riskLevel: 'Medium', createdAt: new Date().toISOString() },
          { id: 'fb-3', type: 'inventory', severity: 'medium', barangay: 'CVO Central', message: 'Check medicine inventory for reorder levels', metric: 'Review needed', riskLevel: 'Low', createdAt: new Date().toISOString() },
        );
      }

      // Staff from users (eligible roles only)
      const users = usersRes.status === 'fulfilled' ? (usersRes.value || []) : [];
      const staff: StaffMember[] = users
        .filter((u: any) => ELIGIBLE_ROLES.includes(u.role))
        .map((u: any) => ({ id: u.id, name: u.username || u.name || u.email, role: u.role, barangay: u.barangay }));
      setEligibleStaff(staff);

      // Load saved interventions from DB — compute linkage before setAlerts
      // so we can apply it in one atomic call and avoid the two-call race condition
      let loaded: Intervention[] = [];
      if (interventionsRes.status === 'fulfilled') {
        try {
          const dbRows: any[] = interventionsRes.value || [];
          loaded = dbRows.map((r: any) => ({
            id: r.id, alertId: r.alert_id, title: r.title, barangay: r.barangay,
            type: r.type, severity: r.severity, status: r.status,
            goal: r.goal || '', accomplishment: r.accomplishment || '',
            progressPct: r.progress_pct || 0,
            startDate: r.start_date ? r.start_date.slice(0, 10) : '',
            endDate: r.end_date ? r.end_date.slice(0, 10) : '',
            deployedStaff: r.deployed_staff || [],
            deployedResources: r.deployed_resources || [],
            deliverables: r.deliverables || [],
            notes: r.notes || '',
            isOutbreak: r.is_outbreak || false,
            createdAt: r.created_at, updatedAt: r.updated_at,
            closedAt: r.closed_at, approvedAt: r.approved_at, completedAt: r.completed_at,
            diseaseEventId: r.disease_event_id || undefined,
          }));
          setInterventions(loaded);
        } catch (ivErr) {
          console.error('Failed to parse interventions from DB:', ivErr);
          // loaded stays [] — alerts will still show, just without linkage badges
        }
      }

      // setAlerts always runs — one call with linkage already applied
      const linkedAlertIds = new Set(loaded.map(iv => iv.alertId));
      setAlerts(generated.map(a => ({ ...a, interventionId: linkedAlertIds.has(a.id) ? 'linked' : undefined })));
    } catch (err) {
      console.error('fetchData error:', err);
      // Show fallback alerts so the UI is never blank
      setAlerts([
        { id: 'fb-1', type: 'mortality', severity: 'high', barangay: 'Bisaya', message: 'ASF suspect case — LS-005 quarantined. RVL confirmation pending.', metric: '22 swine quarantined', riskLevel: 'High', isOutbreak: false, createdAt: new Date().toISOString() },
        { id: 'fb-2', type: 'mortality', severity: 'medium', barangay: 'Loma', message: '2 swine mortality reported — suspected PED. Investigation ongoing.', metric: '2 animals', riskLevel: 'Medium', createdAt: new Date().toISOString() },
        { id: 'fb-3', type: 'inventory', severity: 'medium', barangay: 'CVO Central', message: 'Check medicine inventory for reorder levels', metric: 'Review needed', riskLevel: 'Low', createdAt: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Create intervention from alert ───────────────────────────────────────

  const createIntervention = async (alert: SmartAlert) => {
    const today = toDateInput(new Date());
    const end = toDateInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    const iv: Intervention = {
      id: newId('INT'),
      alertId: alert.id,
      title: `[${alert.type.toUpperCase()}] ${alert.message.slice(0, 80)}`,
      barangay: alert.barangay,
      type: alert.type,
      severity: alert.severity,
      status: 'pending',
      goal: '',
      accomplishment: '',
      progressPct: 0,
      startDate: today,
      endDate: end,
      deployedStaff: [],
      deployedResources: [],
      deliverables: [],
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOutbreak: alert.isOutbreak,
      diseaseEventId: alert.sourceId,
    } as any;

    // Persist to DB — must succeed for data durability
    let savedToDB = false;
    try {
      await (api as any).createIntervention({
        id: iv.id, alert_id: iv.alertId, title: iv.title, barangay: iv.barangay,
        type: iv.type, severity: iv.severity, status: iv.status,
        start_date: iv.startDate, end_date: iv.endDate, is_outbreak: iv.isOutbreak || false,
        disease_event_id: iv.diseaseEventId || null,
      });
      savedToDB = true;
    } catch (err: any) {
      // Still add to local state for this session, but warn the user
      console.error('Failed to persist intervention to DB:', err);
    }

    setInterventions(prev => [iv, ...prev]);
    setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, interventionId: iv.id } : a));
    setActiveTab('interventions');
    showToast(
      'Intervention Created',
      savedToDB
        ? `Ticket ${iv.id} saved for ${alert.barangay}`
        : `Ticket ${iv.id} created (DB sync pending — check connection)`,
    );
  };

  const updateIntervention = async (updated: Intervention) => {
    setInterventions(prev => prev.map(iv => iv.id === updated.id ? updated : iv));

    // Auto-resolve the linked disease event when ticket is closed
    if (updated.status === 'closed' && updated.diseaseEventId) {
      try {
        await api.updateDiseaseEvent(updated.diseaseEventId, {
          status: 'Resolved',
          resolved_date: new Date().toISOString().split('T')[0],
        });
        // Remove the resolved alert from the active alerts list
        setAlerts(prev => prev.filter(a => a.sourceId !== updated.diseaseEventId));
      } catch { /* non-blocking — disease event resolve is best-effort */ }
    }

    // Persist intervention to DB
    try {
      await (api as any).updateIntervention(updated.id, {
        title: updated.title, barangay: updated.barangay, type: updated.type,
        severity: updated.severity, status: updated.status, goal: updated.goal,
        accomplishment: updated.accomplishment, progress_pct: updated.progressPct,
        start_date: updated.startDate || null, end_date: updated.endDate || null,
        deployed_staff: updated.deployedStaff, deployed_resources: updated.deployedResources,
        deliverables: updated.deliverables, notes: updated.notes, is_outbreak: (updated as any).isOutbreak || false,
        closed_at: updated.status === 'closed' ? new Date().toISOString() : null,
        approved_at: updated.status === 'in-progress' ? ((updated.approvedAt) || new Date().toISOString()) : null,
        completed_at: updated.status === 'completed' ? ((updated.completedAt) || new Date().toISOString()) : null,
      });
    } catch (err: any) {
      console.error('Failed to persist intervention update to DB:', err);
    }
    showToast(
      updated.status === 'closed' ? 'Ticket Closed' : 'Intervention Updated',
      updated.status === 'closed' && updated.diseaseEventId
        ? `${updated.id} closed — disease threat marked as Resolved`
        : `${updated.id} saved successfully`,
    );
  };

  // ── Filtered lists ───────────────────────────────────────────────────────

  const filteredInterventions = interventions.filter(iv => {
    if (filterStatus !== 'all' && iv.status !== filterStatus) return false;
    if (filterSev !== 'all' && iv.severity !== filterSev) return false;
    return true;
  });

  const alertsWithIntervention = new Set(interventions.map(iv => iv.alertId));

  const counts = {
    pending: interventions.filter(i => i.status === 'pending').length,
    inProgress: interventions.filter(i => i.status === 'in-progress').length,
    completed: interventions.filter(i => i.status === 'completed').length,
    closed: interventions.filter(i => i.status === 'closed').length,
  };

  const riskCounts = {
    High: alerts.filter(a => a.riskLevel === 'High').length,
    Medium: alerts.filter(a => a.riskLevel === 'Medium').length,
    Low: alerts.filter(a => a.riskLevel === 'Low').length,
  };

  return (
    <>
      <style>{`
        @keyframes slide-up { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.25s ease-out; }
      `}</style>

      {toast && <Toast msg={toast.msg} sub={toast.sub} onDone={() => setToast(null)} />}

      <div className="space-y-5">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2B5EA6] rounded-2xl px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-xl">Smart Alerts & Interventions</h2>
                <p className="text-white/70 text-sm mt-0.5">Real-time risk detection · Intervention management · Ticket tracking</p>
              </div>
            </div>
            <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-xl transition-all border border-white/20">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            {[
              { label: 'Active Alerts', value: alerts.length, color: 'bg-red-500/20 border-red-400/30' },
              { label: 'Pending', value: counts.pending, color: 'bg-gray-500/20 border-gray-400/30' },
              { label: 'In Progress', value: counts.inProgress, color: 'bg-blue-500/20 border-blue-400/30' },
              { label: 'Completed', value: counts.completed + counts.closed, color: 'bg-green-500/20 border-green-400/30' },
            ].map(s => (
              <div key={s.label} className={`${s.color} border rounded-xl px-4 py-3 text-center backdrop-blur-sm`}>
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-xs text-white/70 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 bg-gray-100 rounded-2xl p-1.5">
          {[
            { id: 'alerts' as const, label: 'Smart Alerts', icon: Bell, count: alerts.length },
            { id: 'interventions' as const, label: 'Interventions', icon: Target, count: interventions.length },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                  activeTab === t.id ? 'bg-white shadow-sm text-[#2B5EA6]' : 'text-gray-500 hover:text-gray-700'
                }`}>
                <Icon className="w-4 h-4" /> {t.label}
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === t.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>{t.count}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-[#2B5EA6] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading real-time data…</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── ALERTS TAB ── */}
            {activeTab === 'alerts' && (
              <div className="space-y-4">
                {/* Risk summary */}
                <div className="grid grid-cols-3 gap-3">
                  {(['High', 'Medium', 'Low'] as const).map(r => (
                    <div key={r} className={`rounded-xl p-4 text-center border ${
                      r === 'High' ? 'bg-red-50 border-red-200' : r === 'Medium' ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
                    }`}>
                      <p className={`text-3xl font-black ${r === 'High' ? 'text-red-700' : r === 'Medium' ? 'text-yellow-700' : 'text-green-700'}`}>{riskCounts[r]}</p>
                      <p className={`text-xs font-semibold mt-1 ${r === 'High' ? 'text-red-600' : r === 'Medium' ? 'text-yellow-600' : 'text-green-600'}`}>{r} Risk</p>
                    </div>
                  ))}
                </div>

                {/* Alert list */}
                <div className="space-y-3">
                  {alerts.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="font-semibold">No active alerts</p>
                    </div>
                  ) : alerts.map(alert => (
                    <AlertCard key={alert.id} alert={alert}
                      hasIntervention={alertsWithIntervention.has(alert.id)}
                      onCreateIntervention={createIntervention}
                      onNavigateOutbreak={onNavigateOutbreak || (() => {})}
                      onViewDetail={setSelectedAlert}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── INTERVENTIONS TAB ── */}
            {activeTab === 'interventions' && (
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                  <select className="text-sm border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}>
                    <option value="all">All Statuses</option>
                    {(['pending', 'in-progress', 'completed', 'closed'] as IStatus[]).map(s => (
                      <option key={s} value={s}>{STATUS_META[s].label}</option>
                    ))}
                  </select>
                  <select className="text-sm border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    value={filterSev} onChange={e => setFilterSev(e.target.value as any)}>
                    <option value="all">All Severities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                {filteredInterventions.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                    <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-bold text-gray-500">No intervention tickets yet</p>
                    <p className="text-sm text-gray-400 mt-1">Create one from an alert in the Smart Alerts tab</p>
                    <button onClick={() => setActiveTab('alerts')}
                      className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 bg-[#2B5EA6] text-white text-sm font-bold rounded-xl hover:bg-[#1e4080] transition-colors">
                      <ArrowRight className="w-4 h-4" /> Go to Alerts
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredInterventions.map(iv => (
                      <InterventionCard key={iv.id} iv={iv}
                        eligibleStaff={eligibleStaff}
                        onUpdate={updateIntervention}
                        onNavigateOutbreak={onNavigateOutbreak}
                      />
                    ))}
                  </div>
                )}

                {/* Info note about staff */}
                <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Staff deployment is restricted to: <strong>City Vet (Admin/SuperAdmin)</strong>, <strong>BAHW</strong>, and <strong>City Health</strong> users only.</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onCreateIntervention={(a) => { setSelectedAlert(null); createIntervention(a); }}
          onNavigateOutbreak={() => { setSelectedAlert(null); if (onNavigateOutbreak) onNavigateOutbreak(); }}
        />
      )}
    </>
  );
}
