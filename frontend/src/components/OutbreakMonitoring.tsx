import { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle, MapPin, Filter, TrendingUp, Search, Map, FileText,
  Plus, RefreshCw, CheckCircle, Clock, User, Edit3, X, ChevronDown,
  ChevronUp, Activity, Layers, Eye, Calendar, Syringe, Shield,
  BarChart3, ArrowRight, Bell, Info, Tag, Crosshair
} from 'lucide-react';

// ── TYPES ──────────────────────────────────────────────────────────────────

interface OutbreakRecord {
  id: string;
  type: 'rabies' | 'livestock';
  disease: string;
  barangay: string;
  source_id?: string;  // biting incident id or disease event id
  cases: number;
  lat: number;
  lng: number;
  radius_km: number;
  status: 'Active' | 'Monitoring' | 'Contained' | 'Resolved';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  assigned_to?: string;
  resolve_date?: string;
  timetable?: string;
  updates: OutbreakUpdate[];
  date_created: string;
  date_updated: string;
}

interface OutbreakUpdate {
  id: string;
  text: string;
  author: string;
  timestamp: string;
}

// ── CONSTANTS ───────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  Active: 'bg-red-100 text-red-800 border border-red-200',
  Monitoring: 'bg-blue-100 text-blue-800 border border-blue-200',
  Contained: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  Resolved: 'bg-green-100 text-green-800 border border-green-200',
};
const SEVERITY_COLOR: Record<string, string> = {
  Critical: 'bg-red-600 text-white',
  High: 'bg-orange-500 text-white',
  Medium: 'bg-yellow-500 text-white',
  Low: 'bg-green-500 text-white',
};
const CIRCLE_COLOR: Record<string, string> = {
  Active: '#ef4444',
  Monitoring: '#3b82f6',
  Contained: '#f59e0b',
  Resolved: '#22c55e',
};

// Calaca, Batangas center
const CALACA_CENTER = { lat: 13.9345, lng: 120.8135 };
const CALACA_ZOOM = 12;

// ── LEAFLET MAP ─────────────────────────────────────────────────────────────

function OutbreakMap({ outbreaks, selectedId, onSelect }: {
  outbreaks: OutbreakRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const circlesRef = useRef<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  // ── init map exactly once ──────────────────────────────────────────────
  const initMap = () => {
    const el = mapRef.current;
    if (!el) return;

    // Leaflet stamps the DOM node — if already initialized, just signal ready
    if ((el as any)._leaflet_id) {
      setLoaded(true);
      return;
    }

    const L = (window as any).L;
    if (!L) return;

    let map: any;
    try {
      map = L.map(el, {
        center: [CALACA_CENTER.lat, CALACA_CENTER.lng],
        zoom: CALACA_ZOOM,
        zoomControl: true,
      });
    } catch {
      // Already initialized race — grab the existing instance
      setLoaded(true);
      return;
    }

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    leafletMap.current = map;
    setLoaded(true);
  };

  useEffect(() => {
    // Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // If Leaflet already loaded (another map instance loaded it), init immediately
    if ((window as any).L) {
      initMap();
    } else if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      // Script tag exists but hasn't fired onload yet — poll
      const poll = setInterval(() => {
        if ((window as any).L) { clearInterval(poll); initMap(); }
      }, 50);
    }

    return () => {
      if (leafletMap.current) {
        try { leafletMap.current.remove(); } catch { /* ignore */ }
        leafletMap.current = null;
        setLoaded(false);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── draw/update markers whenever data or selection changes ─────────────
  useEffect(() => {
    if (!loaded || !leafletMap.current) return;
    const L = (window as any).L;
    if (!L) return;
    const map = leafletMap.current;

    // Clear previous layers
    markersRef.current.forEach(m => { try { map.removeLayer(m); } catch { /* ignore */ } });
    circlesRef.current.forEach(c => { try { map.removeLayer(c); } catch { /* ignore */ } });
    markersRef.current = [];
    circlesRef.current = [];

    // Wait until the map's panes exist (prevents the 'x' bounds crash)
    if (!map.getPanes().overlayPane) return;

    outbreaks.forEach(ob => {
      if (ob.lat == null || ob.lng == null || isNaN(ob.lat) || isNaN(ob.lng)) return;
      const color = CIRCLE_COLOR[ob.status] || '#ef4444';
      const isSelected = ob.id === selectedId;

      try {
        // Containment circle
        const circle = L.circle([ob.lat, ob.lng], {
          radius: (ob.radius_km || 10) * 1000,
          color,
          fillColor: color,
          fillOpacity: isSelected ? 0.25 : 0.12,
          weight: isSelected ? 3 : 1.5,
          dashArray: ob.status === 'Resolved' ? '6,4' : undefined,
        }).addTo(map);
        circle.bindTooltip(
          `<strong>${ob.disease}</strong><br/>${ob.barangay} · ${ob.cases} case${ob.cases !== 1 ? 's' : ''}<br/>Containment: ${ob.radius_km}km`,
          { sticky: true }
        );
        circlesRef.current.push(circle);
      } catch { /* skip malformed circle */ }

      try {
        // Pin marker
        const sz = isSelected ? 36 : 28;
        const icon = L.divIcon({
          html: `<div style="background:${color};width:${sz}px;height:${sz}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;"><div style="transform:rotate(45deg);font-size:${isSelected ? 14 : 11}px;color:white;font-weight:900;">${ob.cases}</div></div>`,
          className: '',
          iconSize: [sz, sz],
          iconAnchor: [sz / 2, sz],
        });
        const marker = L.marker([ob.lat, ob.lng], { icon }).addTo(map);
        marker.on('click', () => onSelect(ob.id));
        marker.bindPopup(
          `<div style="min-width:180px;font-family:sans-serif;">
            <p style="font-weight:800;font-size:14px;margin:0 0 4px;">${ob.disease}</p>
            <p style="font-size:12px;color:#6b7280;margin:0 0 6px;">${ob.barangay}</p>
            <span style="background:${color};color:white;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;">${ob.status}</span>
            <p style="font-size:12px;margin:6px 0 0;">Cases: <strong>${ob.cases}</strong> · ${ob.type === 'rabies' ? '🐕 Rabies' : '🐄 Livestock'}</p>
          </div>`
        );
        markersRef.current.push(marker);
      } catch { /* skip malformed marker */ }
    });

    // Fit bounds
    try {
      if (!selectedId && circlesRef.current.length > 0) {
        const group = L.featureGroup(circlesRef.current);
        const bounds = group.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds.pad(0.2));
      }
      if (selectedId) {
        const sel = outbreaks.find(o => o.id === selectedId);
        if (sel?.lat != null && sel?.lng != null) {
          map.flyTo([sel.lat, sel.lng], 14, { duration: 1 });
        }
      }
    } catch { /* ignore bounds errors */ }
  }, [loaded, outbreaks, selectedId]);

  return (
    <div style={{ position: 'relative', height: '460px', borderRadius: 16, overflow: 'hidden', border: '2px solid #e5e7eb' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {!loaded && (
        <div style={{ position: 'absolute', inset: 0, background: '#f0f4f8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#2B5EA6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>Loading map…</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
      {/* Map legend */}
      <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(255,255,255,.95)', borderRadius: 10, padding: '10px 14px', boxShadow: '0 2px 12px rgba(0,0,0,.15)', fontSize: 11.5, minWidth: 140 }}>
        <p style={{ fontWeight: 800, marginBottom: 6, color: '#374151', fontSize: 11 }}>LEGEND</p>
        {[
          { label: 'Active', color: '#ef4444' },
          { label: 'Monitoring', color: '#3b82f6' },
          { label: 'Contained', color: '#f59e0b' },
          { label: 'Resolved', color: '#22c55e' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: l.color, opacity: 0.7, border: `2px solid ${l.color}` }} />
            <span style={{ color: '#374151' }}>{l.label}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 6, paddingTop: 5, color: '#9ca3af', fontSize: 10 }}>
          Circle = 10km containment zone
        </div>
      </div>
    </div>
  );
}

// ── UPDATE MODAL ─────────────────────────────────────────────────────────────

function UpdateModal({ record, onClose, onSave }: {
  record: OutbreakRecord;
  onClose: () => void;
  onSave: (data: Partial<OutbreakRecord> & { newUpdate?: string }) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    status: record.status,
    severity: record.severity,
    assigned_to: record.assigned_to || '',
    resolve_date: record.resolve_date || '',
    timetable: record.timetable || '',
    newUpdate: '',
  });

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch (e) { alert('Failed to save update'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,.25)' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1e4080,#2B5EA6)', padding: '20px 24px', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: 16, margin: 0 }}>Update Outbreak Record</p>
            <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, margin: '2px 0 0' }}>{record.id} · {record.disease} · {record.barangay}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '50%', width: 32, height: 32, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        </div>

        <div style={{ padding: '22px 24px' }}>
          {/* Status & Severity */}
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#dc2626', borderBottom: '1.5px solid #fee2e2', paddingBottom: 6, marginBottom: 14 }}>Status & Severity</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Status', key: 'status', options: ['Active', 'Monitoring', 'Contained', 'Resolved'] },
              { label: 'Severity', key: 'severity', options: ['Critical', 'High', 'Medium', 'Low'] },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>{f.label}</label>
                <select value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: '100%', height: 40, border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '0 10px', fontSize: 13.5, background: '#f9fafb', outline: 'none' }}>
                  {f.options.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>

          {/* Personnel & Timetable */}
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#2B5EA6', borderBottom: '1.5px solid #dbeafe', paddingBottom: 6, marginBottom: 14 }}>Personnel & Schedule</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Assigned Personnel</label>
              <input value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}
                placeholder="Full name of assigned BAHW/Vet"
                style={{ width: '100%', height: 40, border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '0 10px', fontSize: 13.5, background: '#f9fafb', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Target Resolution Date</label>
              <input type="date" value={form.resolve_date} onChange={e => setForm(p => ({ ...p, resolve_date: e.target.value }))}
                style={{ width: '100%', height: 40, border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '0 10px', fontSize: 13.5, background: '#f9fafb', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Timetable / Action Plan</label>
              <textarea value={form.timetable} onChange={e => setForm(p => ({ ...p, timetable: e.target.value }))} rows={2}
                placeholder="e.g., Day 1: Quarantine, Day 3: Mass vaccination, Day 7: Re-evaluation…"
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '9px 10px', fontSize: 13.5, background: '#f9fafb', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
          </div>

          {/* Update / Remarks */}
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#60A85C', borderBottom: '1.5px solid #dcfce7', paddingBottom: 6, marginBottom: 14 }}>Add Update / Remarks</p>
          <textarea value={form.newUpdate} onChange={e => setForm(p => ({ ...p, newUpdate: e.target.value }))} rows={3}
            placeholder="Enter update, field observations, interventions done, or any remarks…"
            style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '9px 10px', fontSize: 13.5, background: '#f9fafb', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 16 }} />

          {/* Previous updates */}
          {record.updates.length > 0 && (
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>PREVIOUS UPDATES</p>
              {record.updates.slice().reverse().map(u => (
                <div key={u.id} style={{ borderLeft: '3px solid #cbd5e1', paddingLeft: 10, marginBottom: 8, fontSize: 12.5 }}>
                  <p style={{ margin: '0 0 2px', color: '#374151' }}>{u.text}</p>
                  <p style={{ margin: 0, color: '#9ca3af', fontSize: 11 }}>{u.author} · {new Date(u.timestamp).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              ))}
            </div>
          )}

          {/* Resolve warning */}
          {form.status === 'Resolved' && record.status !== 'Resolved' && (
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12.5, color: '#15803d' }}>
              <strong>✅ Marking as Resolved</strong> — This outbreak will be archived. The map circle will turn green. Make sure all containment measures have been completed.
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, height: 44, border: '1.5px solid #e5e7eb', borderRadius: 10, background: '#fff', color: '#374151', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 2, height: 44, border: 'none', borderRadius: 10, background: saving ? '#d1d5db' : 'linear-gradient(135deg,#1e4080,#2B5EA6)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {saving ? <><RefreshCw size={15} style={{ animation: 'spin 0.7s linear infinite' }} />Saving…</> : <><CheckCircle size={15} />Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── OUTBREAK CARD ────────────────────────────────────────────────────────────

function OutbreakCard({ record, isSelected, onSelect, onUpdate, canEdit }: {
  record: OutbreakRecord;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: () => void;
  canEdit: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      border: isSelected ? '2px solid #2B5EA6' : '1.5px solid #e5e7eb',
      boxShadow: isSelected ? '0 4px 20px rgba(43,94,166,.2)' : '0 2px 8px rgba(0,0,0,.05)',
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'all .2s',
    }}
      onClick={onSelect}
    >
      {/* Colored top stripe */}
      <div style={{ height: 4, background: record.status === 'Active' ? 'linear-gradient(90deg,#ef4444,#f97316)' : record.status === 'Monitoring' ? 'linear-gradient(90deg,#3b82f6,#06b6d4)' : record.status === 'Contained' ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#22c55e,#86efac)' }} />

      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 800, background: '#f1f5f9', color: '#64748b', padding: '2px 7px', borderRadius: 6, fontFamily: 'monospace' }}>{record.id}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${SEVERITY_COLOR[record.severity]}`}>{record.severity}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLOR[record.status]}`}>{record.status}</span>
              {record.type === 'rabies' ? <span style={{ fontSize: 10, background: '#fee2e2', color: '#991b1b', borderRadius: 6, padding: '2px 7px', fontWeight: 700 }}>🐕 Rabies</span> : <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', borderRadius: 6, padding: '2px 7px', fontWeight: 700 }}>🐄 Livestock</span>}
            </div>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#1f2937', margin: '0 0 2px' }}>{record.disease}</p>
            <p style={{ fontSize: 12.5, color: '#6b7280', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={11} />{record.barangay} · {record.cases} case{record.cases !== 1 ? 's' : ''} · {record.radius_km}km containment
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
            {canEdit && (
              <button onClick={e => { e.stopPropagation(); onUpdate(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 10px', background: '#eff6ff', border: 'none', borderRadius: 8, color: '#2B5EA6', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                <Edit3 size={12} />Update
              </button>
            )}
            <button onClick={e => { e.stopPropagation(); setExpanded(p => !p); }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 10px', background: '#f8fafc', border: 'none', borderRadius: 8, color: '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}{expanded ? 'Less' : 'More'}
            </button>
          </div>
        </div>

        {/* Quick info row */}
        <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
          {record.assigned_to && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#6b7280' }}>
              <User size={11} />{record.assigned_to}
            </span>
          )}
          {record.resolve_date && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#6b7280' }}>
              <Calendar size={11} />Target: {new Date(record.resolve_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#9ca3af' }}>
            <Clock size={11} />{new Date(record.date_created).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          {record.updates.length > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#2B5EA6' }}>
              <Activity size={11} />{record.updates.length} update{record.updates.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div style={{ marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
            {record.timetable && (
              <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12.5, color: '#0c4a6e' }}>
                <strong>Action Plan:</strong> {record.timetable}
              </div>
            )}
            {record.updates.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 6 }}>LATEST UPDATES</p>
                {record.updates.slice(-3).reverse().map(u => (
                  <div key={u.id} style={{ borderLeft: '3px solid #dbeafe', paddingLeft: 10, marginBottom: 7, fontSize: 12 }}>
                    <p style={{ margin: '0 0 2px', color: '#374151' }}>{u.text}</p>
                    <p style={{ margin: 0, color: '#9ca3af', fontSize: 11 }}>{u.author} · {new Date(u.timestamp).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>No updates yet. Add the first update above.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────

interface Props {
  userRole: string;
  currentUser?: { username: string };
}

export function OutbreakMonitoring({ userRole, currentUser }: Props) {
  const canEdit = ['admin', 'superadmin', 'cityHealth'].includes(userRole);

  const [outbreaks, setOutbreaks] = useState<OutbreakRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<OutbreakRecord | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'split' | 'map' | 'list'>('split');
  const [stats, setStats] = useState({ total: 0, active: 0, rabies: 0, livestock: 0, resolved: 0 });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('nasaalaga_token') || '';
      const r = await fetch('/api/outbreaks', { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const d = await r.json();
        const list: OutbreakRecord[] = d.outbreaks || [];
        setOutbreaks(list);
        setStats({
          total: list.length,
          active: list.filter(o => o.status === 'Active').length,
          rabies: list.filter(o => o.type === 'rabies').length,
          livestock: list.filter(o => o.type === 'livestock').length,
          resolved: list.filter(o => o.status === 'Resolved').length,
        });
      } else {
        // Fallback demo data
        const demo = getDemoData();
        setOutbreaks(demo);
        setStats({ total: demo.length, active: demo.filter(o => o.status === 'Active').length, rabies: demo.filter(o => o.type === 'rabies').length, livestock: demo.filter(o => o.type === 'livestock').length, resolved: demo.filter(o => o.status === 'Resolved').length });
      }
    } catch {
      const demo = getDemoData();
      setOutbreaks(demo);
      setStats({ total: demo.length, active: demo.filter(o => o.status === 'Active').length, rabies: demo.filter(o => o.type === 'rabies').length, livestock: demo.filter(o => o.type === 'livestock').length, resolved: demo.filter(o => o.status === 'Resolved').length });
    }
    setLoading(false);
  };

  const handleSaveUpdate = async (data: any) => {
    if (!editingRecord) return;
    const token = sessionStorage.getItem('nasaalaga_token') || '';
    const newUpdate = data.newUpdate?.trim() ? {
      id: `UPD-${Date.now()}`,
      text: data.newUpdate.trim(),
      author: currentUser?.username || 'System',
      timestamp: new Date().toISOString(),
    } : null;

    const payload = {
      status: data.status,
      severity: data.severity,
      assigned_to: data.assigned_to,
      resolve_date: data.resolve_date,
      timetable: data.timetable,
      new_update: newUpdate,
    };

    try {
      const r = await fetch(`/api/outbreaks/${editingRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (r.ok) { await load(); return; }
    } catch { /* fall through to local update */ }

    // Local update fallback
    setOutbreaks(prev => prev.map(ob => {
      if (ob.id !== editingRecord.id) return ob;
      return {
        ...ob,
        ...payload,
        updates: newUpdate ? [...ob.updates, newUpdate] : ob.updates,
        date_updated: new Date().toISOString(),
      };
    }));
  };

  const filtered = outbreaks.filter(o => {
    if (filterStatus !== 'all' && o.status !== filterStatus) return false;
    if (filterType !== 'all' && o.type !== filterType) return false;
    if (search && !`${o.disease} ${o.barangay} ${o.id}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectedRecord = outbreaks.find(o => o.id === selectedId) || null;

  return (
    <div className="space-y-5">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 22, fontWeight: 900, color: '#1f2937', margin: 0 }}>
            <Map className="w-6 h-6" style={{ color: '#2B5EA6' }} />
            Outbreak Monitoring
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Real-time disease surveillance · Calaca City, Batangas</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 5, height: 38, padding: '0 14px', background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10, color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />Refresh
          </button>
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 3 }}>
            {(['split', 'map', 'list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ height: 32, padding: '0 12px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: view === v ? '#fff' : 'transparent', color: view === v ? '#2B5EA6' : '#64748b', boxShadow: view === v ? '0 1px 4px rgba(0,0,0,.1)' : 'none', transition: 'all .15s', textTransform: 'capitalize' }}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── NOTICE: how outbreaks are created ── */}
      <div style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '1.5px solid #bfdbfe', borderRadius: 14, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Info size={16} style={{ color: '#2563eb', flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12.5, color: '#1e40af', lineHeight: 1.6 }}>
          <strong>How Outbreaks Are Recorded:</strong> Outbreak records are automatically created when (1) a confirmed rabies case is marked in <em>Biting Incidents</em> under Pet Management, or (2) an Admin approves an outbreak recommendation triggered by livestock disease cases exceeding thresholds set by the SuperAdmin. This module is for <strong>monitoring and updating</strong> only — not for manual outbreak declaration.
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Records', value: stats.total, color: '#2B5EA6', bg: '#eff6ff' },
          { label: 'Active', value: stats.active, color: '#ef4444', bg: '#fee2e2' },
          { label: 'Rabies', value: stats.rabies, color: '#7c3aed', bg: '#ede9fe' },
          { label: 'Livestock', value: stats.livestock, color: '#f59e0b', bg: '#fef3c7' },
          { label: 'Resolved', value: stats.resolved, color: '#16a34a', bg: '#dcfce7' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: '14px 16px', border: `1.5px solid ${s.bg}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: s.color, margin: '0 0 6px', opacity: .8 }}>{s.label.toUpperCase()}</p>
            <p style={{ fontSize: 28, fontWeight: 900, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── FILTERS ── */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '12px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,.05)', border: '1.5px solid #f1f5f9' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search disease, barangay, ID…"
            style={{ width: '100%', height: 38, paddingLeft: 32, paddingRight: 12, border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {[
          { label: 'Status', value: filterStatus, set: setFilterStatus, opts: [['all', 'All Status'], ['Active', 'Active'], ['Monitoring', 'Monitoring'], ['Contained', 'Contained'], ['Resolved', 'Resolved']] },
          { label: 'Type', value: filterType, set: setFilterType, opts: [['all', 'All Types'], ['rabies', 'Rabies'], ['livestock', 'Livestock']] },
        ].map(f => (
          <select key={f.label} value={f.value} onChange={e => f.set(e.target.value)}
            style={{ height: 38, padding: '0 10px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 13, background: '#f9fafb', outline: 'none' }}>
            {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        <span style={{ fontSize: 12.5, color: '#9ca3af', alignSelf: 'center' }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── MAIN CONTENT ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#2B5EA6', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading outbreak data…</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: view === 'split' ? '1fr 360px' : '1fr', gap: 16 }}>
          {/* MAP */}
          {view !== 'list' && (
            <div style={{ background: '#fff', borderRadius: 18, padding: 16, boxShadow: '0 4px 16px rgba(0,0,0,.07)', border: '1.5px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#374151', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Layers size={15} style={{ color: '#2B5EA6' }} />Disease Map — Calaca City
                </h3>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{filtered.filter(o => o.lat).length} plotted locations</span>
              </div>
              <OutbreakMap outbreaks={filtered} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          )}

          {/* LIST */}
          {view !== 'map' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: view === 'split' ? 540 : 'auto', overflowY: view === 'split' ? 'auto' : 'visible' }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, border: '1.5px dashed #e5e7eb' }}>
                  <Shield size={36} style={{ color: '#d1d5db', margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 14, color: '#9ca3af' }}>No outbreak records match your filters.</p>
                  <p style={{ fontSize: 12, color: '#d1d5db', marginTop: 4 }}>Outbreaks are created automatically from confirmed rabies or livestock disease thresholds.</p>
                </div>
              ) : (
                filtered.map(ob => (
                  <OutbreakCard
                    key={ob.id}
                    record={ob}
                    isSelected={selectedId === ob.id}
                    onSelect={() => setSelectedId(p => p === ob.id ? null : ob.id)}
                    onUpdate={() => setEditingRecord(ob)}
                    canEdit={canEdit}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ── MONITORING TOOLS PANEL ── */}
      <div style={{ background: '#fff', borderRadius: 18, padding: 20, boxShadow: '0 4px 16px rgba(0,0,0,.07)', border: '1.5px solid #e5e7eb' }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: '#374151', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 7 }}>
          <BarChart3 size={16} style={{ color: '#2B5EA6' }} />Monitoring Dashboard
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {/* Active outbreaks summary */}
          <div style={{ background: '#fff5f5', borderRadius: 12, padding: '14px 16px', border: '1.5px solid #fee2e2' }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', margin: '0 0 10px', letterSpacing: '.07em' }}>ACTIVE OUTBREAKS</p>
            {outbreaks.filter(o => o.status === 'Active').length === 0 ? (
              <p style={{ fontSize: 12.5, color: '#9ca3af', fontStyle: 'italic' }}>No active outbreaks</p>
            ) : outbreaks.filter(o => o.status === 'Active').map(o => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12.5 }}>
                <span style={{ fontWeight: 700, color: '#1f2937' }}>{o.disease}</span>
                <span style={{ color: '#6b7280' }}>{o.barangay}</span>
              </div>
            ))}
          </div>

          {/* Personnel assignments */}
          <div style={{ background: '#f0f9ff', borderRadius: 12, padding: '14px 16px', border: '1.5px solid #bae6fd' }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#0369a1', margin: '0 0 10px', letterSpacing: '.07em' }}>PERSONNEL DEPLOYED</p>
            {outbreaks.filter(o => o.assigned_to && o.status !== 'Resolved').length === 0 ? (
              <p style={{ fontSize: 12.5, color: '#9ca3af', fontStyle: 'italic' }}>No personnel assigned</p>
            ) : outbreaks.filter(o => o.assigned_to && o.status !== 'Resolved').map(o => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12.5 }}>
                <span style={{ fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 4 }}><User size={10} />{o.assigned_to}</span>
                <span style={{ color: '#6b7280', fontSize: 11 }}>{o.disease}</span>
              </div>
            ))}
          </div>

          {/* Upcoming timetables */}
          <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '14px 16px', border: '1.5px solid #bbf7d0' }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#15803d', margin: '0 0 10px', letterSpacing: '.07em' }}>TARGET RESOLUTIONS</p>
            {outbreaks.filter(o => o.resolve_date && o.status !== 'Resolved').length === 0 ? (
              <p style={{ fontSize: 12.5, color: '#9ca3af', fontStyle: 'italic' }}>No timetables set</p>
            ) : outbreaks.filter(o => o.resolve_date && o.status !== 'Resolved').sort((a, b) => a.resolve_date!.localeCompare(b.resolve_date!)).map(o => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12.5 }}>
                <span style={{ fontWeight: 700, color: '#1f2937' }}>{o.disease}</span>
                <span style={{ color: '#16a34a', fontWeight: 600 }}>{new Date(o.resolve_date!).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* UPDATE MODAL */}
      {editingRecord && (
        <UpdateModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSave={handleSaveUpdate}
        />
      )}
    </div>
  );
}

// ── DEMO DATA ────────────────────────────────────────────────────────────────

function getDemoData(): OutbreakRecord[] {
  return [
    {
      id: 'OB-RABIES-001',
      type: 'rabies',
      disease: 'Rabies',
      barangay: 'Poblacion 4',
      source_id: 'BITE-001',
      cases: 1,
      lat: 13.9315,
      lng: 120.8165,
      radius_km: 10,
      status: 'Active',
      severity: 'High',
      assigned_to: 'BAHW Santos',
      resolve_date: '2026-06-15',
      timetable: 'Day 1: Quarantine. Day 3: Area vaccination drive. Day 7: Re-evaluation.',
      updates: [
        { id: 'u1', text: 'Confirmed rabies case. 10km containment radius established. Immediate area alert issued.', author: 'Dr. Reyes', timestamp: '2026-05-20T08:00:00Z' },
        { id: 'u2', text: 'Mass dog vaccination started in containment area. 42 dogs vaccinated today.', author: 'BAHW Santos', timestamp: '2026-05-22T14:00:00Z' },
      ],
      date_created: '2026-05-20T08:00:00Z',
      date_updated: '2026-05-22T14:00:00Z',
    },
    {
      id: 'OB-LIVE-001',
      type: 'livestock',
      disease: 'African Swine Fever (ASF)',
      barangay: 'Bagong Tubig',
      source_id: 'DSE-012',
      cases: 4,
      lat: 13.9420,
      lng: 120.8090,
      radius_km: 10,
      status: 'Active',
      severity: 'Critical',
      assigned_to: 'Dr. Cruz',
      resolve_date: '2026-06-30',
      timetable: 'Immediate depopulation. 500m quarantine fence. Culling teams deployed.',
      updates: [
        { id: 'u1', text: '4 confirmed ASF cases in 3 farms within Bagong Tubig. Admin approved outbreak declaration.', author: 'Admin', timestamp: '2026-05-18T09:00:00Z' },
        { id: 'u2', text: 'Depopulation of 23 pigs completed. Affected farms disinfected.', author: 'Dr. Cruz', timestamp: '2026-05-21T16:00:00Z' },
      ],
      date_created: '2026-05-18T09:00:00Z',
      date_updated: '2026-05-21T16:00:00Z',
    },
    {
      id: 'OB-LIVE-002',
      type: 'livestock',
      disease: 'Avian Influenza',
      barangay: 'Bambang',
      source_id: 'DSE-008',
      cases: 2,
      lat: 13.9280,
      lng: 120.8220,
      radius_km: 10,
      status: 'Monitoring',
      severity: 'Medium',
      assigned_to: 'BAHW Garcia',
      resolve_date: undefined,
      timetable: '',
      updates: [
        { id: 'u1', text: 'Disease event triggered monitoring threshold. Admin under review.', author: 'System', timestamp: '2026-05-19T10:00:00Z' },
      ],
      date_created: '2026-05-19T10:00:00Z',
      date_updated: '2026-05-19T10:00:00Z',
    },
    {
      id: 'OB-RABIES-002',
      type: 'rabies',
      disease: 'Rabies',
      barangay: 'Baclas',
      source_id: 'BITE-005',
      cases: 1,
      lat: 13.9380,
      lng: 120.8040,
      radius_km: 10,
      status: 'Contained',
      severity: 'Medium',
      assigned_to: 'BAHW Reyes',
      resolve_date: '2026-05-28',
      timetable: 'Day 1-3: Containment. Day 5: Verification visit.',
      updates: [
        { id: 'u1', text: 'Animal culled. All pets in 10km radius identified for vaccination.', author: 'BAHW Reyes', timestamp: '2026-05-10T11:00:00Z' },
        { id: 'u2', text: 'Follow-up vaccination drive completed. 89 dogs, 31 cats vaccinated.', author: 'BAHW Reyes', timestamp: '2026-05-15T15:00:00Z' },
      ],
      date_created: '2026-05-09T08:00:00Z',
      date_updated: '2026-05-15T15:00:00Z',
    },
  ];
}

export default OutbreakMonitoring;
