import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Bell, BellRing, AlertTriangle, AlertCircle, Info, CheckCircle, Clock, ChevronDown, ChevronUp,
  RefreshCw, ArrowRight, EyeOff, Eye,
} from 'lucide-react';
import { api } from '../lib/api';
import { computeBAHWAlerts, CATEGORY_LABEL, type BAHWAlert, type AlertSeverity, type AlertCategory } from '../lib/bahwAlerts';

// ── Persistence (acknowledge / snooze) ──────────────────────────────────────
interface Store { acked: Record<string, string>; snoozed: Record<string, { until: number; sig: string }>; notified: Record<string, string>; }
const emptyStore = (): Store => ({ acked: {}, snoozed: {}, notified: {} });
const storeKey = (u: string) => `nasaalaga_bahw_alerts:${u}`;
function readStore(u: string): Store {
  try { const r = localStorage.getItem(storeKey(u)); return r ? { ...emptyStore(), ...JSON.parse(r) } : emptyStore(); } catch { return emptyStore(); }
}
function writeStore(u: string, s: Store) { try { localStorage.setItem(storeKey(u), JSON.stringify(s)); } catch { /* storage may be unavailable */ } }

const REFRESH_MS = 5 * 60 * 1000;

export interface BAHWAlertState {
  alerts: BAHWAlert[];        // active (not acknowledged / snoozed)
  hidden: BAHWAlert[];        // acknowledged or snoozed
  loading: boolean;
  error: string;
  lastUpdated: Date | null;
  criticalCount: number;
  activeCount: number;
  refresh: () => void;
  acknowledge: (a: BAHWAlert) => void;
  snooze: (a: BAHWAlert, hours?: number) => void;
  restore: (a: BAHWAlert) => void;
}

/**
 * Loads everything a BAHW is allowed to see (the server already scopes each
 * endpoint to the BAHW's own barangay), computes alerts, refreshes every
 * 5 minutes, and toasts newly-appearing critical alerts once.
 */
export function useBAHWAlerts(barangay: string, userKey: string, enabled = true): BAHWAlertState {
  const [all, setAll] = useState<BAHWAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [store, setStore] = useState<Store>(() => readStore(userKey));
  const storeRef = useRef(store);
  storeRef.current = store;
  const first = useRef(true);

  const persist = useCallback((fn: (s: Store) => Store) => {
    setStore(prev => { const next = fn(prev); writeStore(userKey, next); return next; });
  }, [userKey]);

  const load = useCallback(async () => {
    if (!enabled || !barangay) { setLoading(false); return; }
    setLoading(true);
    const bitingReq = () => fetch(`${(import.meta as any).env?.VITE_API_URL ? (import.meta as any).env.VITE_API_URL + '/api' : '/api'}/biting-incidents`, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('nasaalaga_token') || ''}` },
    }).then(r => r.json());
    const api2 = api as any;
    const results = await Promise.allSettled([
      api2.getPets(), api2.getLivestock({ barangay }), api2.getOutbreaks(), api2.getDiseaseAlerts(), api2.getDiseaseEvents(),
      bitingReq(), api2.getSchedules(), api2.getPreRegistrations('Pending'), api2.getLivestockPreRegistrations({ status: 'Pending' }),
      api2.getPetDeaths(), api2.getMortality(), api2.getLostFound('Lost'),
    ]);
    const v = (i: number) => (results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<any>).value : null);
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed === results.length) { setError('Could not load alerts. Check your connection.'); setLoading(false); return; }
    setError(failed ? 'Some alert sources could not be loaded.' : '');

    const computed = computeBAHWAlerts({
      barangay,
      pets: v(0)?.pets, livestock: v(1)?.livestock, outbreaks: v(2)?.outbreaks, diseaseAlerts: v(3)?.data || v(3)?.alerts,
      diseaseEvents: v(4)?.events, biting: v(5)?.incidents, schedules: v(6)?.schedules, petPreRegs: v(7)?.preRegistrations,
      livestockPreRegs: v(8)?.preRegistrations, petDeaths: v(9)?.reports, livestockDeaths: v(10)?.mortality, lostReports: v(11)?.reports,
    });
    setAll(computed);
    setLastUpdated(new Date());
    setLoading(false);

    // Toast newly-appearing (or changed) critical alerts once
    const s = storeRef.current;
    const fresh = computed.filter(a => a.severity === 'critical' && s.notified[a.id] !== a.signature && s.acked[a.id] !== a.signature);
    if (fresh.length) {
      if (fresh.length === 1) toast.error(fresh[0].title, { description: fresh[0].message, duration: 8000 });
      else toast.error(`${fresh.length} critical alerts in Brgy. ${barangay}`, { description: fresh.slice(0, 3).map(a => a.title).join(' • '), duration: 8000 });
      persist(st => ({ ...st, notified: { ...st.notified, ...Object.fromEntries(fresh.map(a => [a.id, a.signature])) } }));
    }
    first.current = false;
  }, [barangay, enabled, persist]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!enabled || !barangay) return;
    const t = setInterval(load, REFRESH_MS);
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [load, enabled, barangay]);

  const now = Date.now();
  const isHidden = (a: BAHWAlert) => store.acked[a.id] === a.signature || (store.snoozed[a.id] && store.snoozed[a.id].until > now && store.snoozed[a.id].sig === a.signature);
  const alerts = useMemo(() => all.filter(a => !isHidden(a)), [all, store]); // eslint-disable-line react-hooks/exhaustive-deps
  const hidden = useMemo(() => all.filter(a => isHidden(a)), [all, store]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    alerts, hidden, loading, error, lastUpdated,
    criticalCount: alerts.filter(a => a.severity === 'critical').length,
    activeCount: alerts.filter(a => a.severity !== 'info').length,
    refresh: load,
    acknowledge: a => persist(s => ({ ...s, acked: { ...s.acked, [a.id]: a.signature } })),
    snooze: (a, hours = 24) => persist(s => ({ ...s, snoozed: { ...s.snoozed, [a.id]: { until: Date.now() + hours * 3600000, sig: a.signature } } })),
    restore: a => persist(s => {
      const acked = { ...s.acked }; const snoozed = { ...s.snoozed };
      delete acked[a.id]; delete snoozed[a.id];
      return { ...s, acked, snoozed };
    }),
  };
}

// ── UI ──────────────────────────────────────────────────────────────────────
const SEV_META: Record<AlertSeverity, { label: string; icon: any; card: string; chip: string; dot: string }> = {
  critical: { label: 'Critical', icon: AlertTriangle, card: 'border-red-200 bg-red-50/60', chip: 'bg-red-600 text-white', dot: 'bg-red-500' },
  warning:  { label: 'Warning',  icon: AlertCircle,   card: 'border-amber-200 bg-amber-50/60', chip: 'bg-amber-500 text-white', dot: 'bg-amber-500' },
  info:     { label: 'Notice',   icon: Info,          card: 'border-blue-100 bg-blue-50/40', chip: 'bg-blue-500 text-white', dot: 'bg-blue-400' },
};

function AlertCard({ a, onOpen, onAck, onSnooze, onRestore, muted }: {
  a: BAHWAlert; onOpen: (v: string) => void; onAck: () => void; onSnooze: () => void; onRestore: () => void; muted?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const m = SEV_META[a.severity];
  const Icon = m.icon;
  return (
    <div className={`rounded-xl border p-3.5 ${muted ? 'border-gray-200 bg-gray-50 opacity-75' : m.card}`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${muted ? 'bg-gray-200 text-gray-500' : m.chip}`}><Icon className="w-4 h-4" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-gray-900">{a.title}</p>
            <span className="text-[10px] font-bold text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5">{CATEGORY_LABEL[a.category]}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">{a.message}</p>
          {a.items && a.items.length > 0 && (
            <>
              <button onClick={() => setOpen(o => !o)} className="text-[11px] font-semibold text-[#2B5EA6] mt-1.5 flex items-center gap-1">
                {open ? 'Hide' : 'Show'} details {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {open && <ul className="mt-1.5 space-y-0.5">{a.items.map((it, i) => <li key={i} className="text-xs text-gray-600 flex gap-1.5"><span className="text-gray-300">•</span>{it}</li>)}</ul>}
            </>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            {a.actionView && !muted && (
              <button onClick={() => onOpen(a.actionView!)} className="px-3 py-1.5 bg-[#2B5EA6] text-white text-[11px] font-bold rounded-lg hover:bg-[#2B5EA6]/90 flex items-center gap-1">
                {a.actionLabel || 'Open'}<ArrowRight className="w-3 h-3" />
              </button>
            )}
            {muted ? (
              <button onClick={onRestore} className="px-3 py-1.5 border border-gray-200 bg-white text-[11px] font-semibold rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1"><Eye className="w-3 h-3" />Show again</button>
            ) : (
              <>
                <button onClick={onAck} className="px-3 py-1.5 border border-gray-200 bg-white text-[11px] font-semibold rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Got it</button>
                <button onClick={onSnooze} className="px-3 py-1.5 border border-gray-200 bg-white text-[11px] font-semibold rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1"><Clock className="w-3 h-3" />Remind me tomorrow</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BAHWAlertPanel({ state, barangay, onNavigate }: { state: BAHWAlertState; barangay: string; onNavigate: (view: string) => void }) {
  const [sev, setSev] = useState<'all' | AlertSeverity>('all');
  const [cat, setCat] = useState<'all' | AlertCategory>('all');
  const [showHidden, setShowHidden] = useState(false);
  const { alerts, hidden } = state;

  const counts = { critical: alerts.filter(a => a.severity === 'critical').length, warning: alerts.filter(a => a.severity === 'warning').length, info: alerts.filter(a => a.severity === 'info').length };
  const cats = Array.from(new Set(alerts.map(a => a.category)));
  const visible = alerts.filter(a => (sev === 'all' || a.severity === sev) && (cat === 'all' || a.category === cat));
  const Head = counts.critical ? BellRing : Bell;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
      <div className={`px-5 py-4 flex items-center justify-between gap-3 flex-wrap ${counts.critical ? 'bg-gradient-to-r from-red-600 to-red-500' : counts.warning ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-[#2B5EA6] to-[#3b74c4]'}`}>
        <div className="flex items-center gap-3 text-white">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><Head className={`w-5 h-5 ${counts.critical ? 'animate-pulse' : ''}`} /></div>
          <div>
            <h3 className="font-bold">Alerts — Brgy. {barangay}</h3>
            <p className="text-xs text-white/80">
              {state.loading && !state.lastUpdated ? 'Checking your barangay…'
                : alerts.length === 0 ? 'All clear — nothing needs your attention right now.'
                : `${counts.critical} critical · ${counts.warning} warning · ${counts.info} notice${counts.info === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {state.lastUpdated && <span className="text-[11px] text-white/70 hidden sm:block">Updated {state.lastUpdated.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}</span>}
          <button onClick={state.refresh} disabled={state.loading} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 disabled:opacity-60"><RefreshCw className={`w-3.5 h-3.5 ${state.loading ? 'animate-spin' : ''}`} />Refresh</button>
        </div>
      </div>

      {state.error && <p className="px-5 py-2 text-xs text-amber-700 bg-amber-50 border-b border-amber-100">{state.error}</p>}

      {alerts.length > 0 && (
        <div className="px-5 pt-3 flex flex-wrap gap-1.5">
          {([['all', `All (${alerts.length})`], ['critical', `Critical (${counts.critical})`], ['warning', `Warning (${counts.warning})`], ['info', `Notice (${counts.info})`]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setSev(k as any)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${sev === k ? 'bg-[#2B5EA6] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{l}</button>
          ))}
          {cats.length > 1 && <span className="w-px bg-gray-200 mx-1" />}
          {cats.length > 1 && cats.map(c => (
            <button key={c} onClick={() => setCat(cat === c ? 'all' : c)} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${cat === c ? 'border-[#2B5EA6] text-[#2B5EA6] bg-blue-50' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{CATEGORY_LABEL[c]}</button>
          ))}
        </div>
      )}

      <div className="p-5 space-y-2.5">
        {alerts.length === 0 && !state.loading && (
          <div className="text-center py-6 text-sm text-gray-500"><CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />No active alerts. New ones will appear here and in the bell at the top.</div>
        )}
        {visible.map(a => (
          <AlertCard key={a.id} a={a} onOpen={onNavigate} onAck={() => state.acknowledge(a)} onSnooze={() => state.snooze(a)} onRestore={() => state.restore(a)} />
        ))}
        {alerts.length > 0 && visible.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No alerts match this filter.</p>}

        {hidden.length > 0 && (
          <div className="pt-2">
            <button onClick={() => setShowHidden(s => !s)} className="text-xs font-semibold text-gray-500 flex items-center gap-1.5"><EyeOff className="w-3.5 h-3.5" />{showHidden ? 'Hide' : 'Show'} {hidden.length} dismissed alert{hidden.length === 1 ? '' : 's'}</button>
            {showHidden && <div className="space-y-2 mt-2">{hidden.map(a => <AlertCard key={a.id} a={a} muted onOpen={onNavigate} onAck={() => {}} onSnooze={() => {}} onRestore={() => state.restore(a)} />)}</div>}
            <p className="text-[10px] text-gray-400 mt-1.5">A dismissed alert comes back automatically if the situation changes (for example, more cases).</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BAHWAlertPanel;
