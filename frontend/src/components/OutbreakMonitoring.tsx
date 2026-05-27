import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertTriangle, MapPin, Filter, TrendingUp, Search, Map, FileText,
  Plus, RefreshCw, CheckCircle, Clock, User, Edit3, X, ChevronDown,
  ChevronUp, Activity, Layers, Eye, Calendar, Syringe, Shield,
  BarChart3, ArrowRight, Bell, Info, Tag, Crosshair, Trash2, Archive,
  History, AlertOctagon
} from 'lucide-react';
import { api } from '../lib/api';
import { CALACA_BARANGAYS_GEOJSON } from '../data/calacaBarangaysGeoJSON';

// ── TYPES ──────────────────────────────────────────────────────────────────

interface OutbreakRecord {
  id: string;
  type: 'rabies' | 'livestock';
  disease: string;
  barangay: string;
  source_id?: string;
  cases: number;
  lat: number;
  lng: number;
  radius_km: number;
  status: 'Pending' | 'On-Going' | 'Resolved' | 'Active' | 'Monitoring' | 'Contained';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  assigned_to?: string;
  resolve_date?: string;
  timetable?: string;
  updates: OutbreakUpdate[];
  date_created: string;
  date_updated: string;
  is_archived?: boolean;
  archived_at?: string;
  archived_reason?: string;
}

interface OutbreakUpdate {
  id: string;
  text: string;
  author: string;
  timestamp: string;
}

// ── CONSTANTS ───────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  Pending:    'bg-yellow-100 text-yellow-800 border border-yellow-300',
  'On-Going': 'bg-blue-100 text-blue-800 border border-blue-200',
  Resolved:   'bg-green-100 text-green-800 border border-green-200',
  Active:     'bg-red-100 text-red-800 border border-red-200',
  Monitoring: 'bg-blue-100 text-blue-800 border border-blue-200',
  Contained:  'bg-yellow-100 text-yellow-800 border border-yellow-200',
};
const SEVERITY_COLOR: Record<string, string> = {
  Critical: 'bg-red-600 text-white',
  High:     'bg-orange-500 text-white',
  Medium:   'bg-yellow-500 text-white',
  Low:      'bg-green-500 text-white',
};
const CIRCLE_COLOR: Record<string, string> = {
  Pending:    '#f59e0b',
  'On-Going': '#3b82f6',
  Resolved:   '#22c55e',
  Active:     '#ef4444',
  Monitoring: '#3b82f6',
  Contained:  '#f59e0b',
};

const CALACA_CENTER = { lat: 13.9345, lng: 120.8135 };
const CALACA_ZOOM = 13;

// ── BARANGAY CHOROPLETH HELPERS ──────────────────────────────────────────────

/**
 * Returns a fill colour for a barangay based on total active case count.
 * Green (0) → Yellow (1-2) → Orange (3-5) → Red (6+)
 */
function casesColor(cases: number): string {
  if (cases === 0)  return '#d1fae5'; // light green — clear
  if (cases <= 2)   return '#fef08a'; // yellow — low
  if (cases <= 5)   return '#fb923c'; // orange — moderate
  if (cases <= 10)  return '#ef4444'; // red — high
  return '#7f1d1d';                   // dark red — critical
}

function casesBorderColor(cases: number): string {
  if (cases === 0)  return '#6ee7b7';
  if (cases <= 2)   return '#eab308';
  if (cases <= 5)   return '#ea580c';
  if (cases <= 10)  return '#dc2626';
  return '#450a0a';
}

function casesOpacity(cases: number): number {
  if (cases === 0) return 0.18;
  if (cases <= 2)  return 0.45;
  if (cases <= 5)  return 0.60;
  return 0.75;
}

// ── LEAFLET MAP ─────────────────────────────────────────────────────────────

function OutbreakMap({ outbreaks, selectedId, onSelect }: {
  outbreaks: OutbreakRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const mapRef        = useRef<HTMLDivElement>(null);
  const leafletMap    = useRef<any>(null);
  const markersRef    = useRef<any[]>([]);
  const circlesRef    = useRef<any[]>([]);
  const geoLayerRef   = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);

  // Only show non-archived records on map
  const mappable = outbreaks.filter(o => !o.is_archived && o.lat != null && o.lng != null);

  // Build per-barangay case totals (active + on-going only)
  const barangayCases: Record<string, number> = {};
  outbreaks
    .filter(o => !o.is_archived && o.status !== 'Resolved')
    .forEach(o => {
      const key = o.barangay;
      barangayCases[key] = (barangayCases[key] || 0) + o.cases;
    });

  const initMap = () => {
    const el = mapRef.current;
    if (!el) return;
    if ((el as any)._leaflet_id) { setLoaded(true); return; }
    const L = (window as any).L;
    if (!L) return;
    let map: any;
    try {
      map = L.map(el, {
        center: [CALACA_CENTER.lat, CALACA_CENTER.lng],
        zoom: CALACA_ZOOM,
        zoomControl: true,
      });
    } catch { setLoaded(true); return; }

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors', maxZoom: 19,
    }).addTo(map);

    leafletMap.current = map;
    setLoaded(true);
  };

  // ── Load Leaflet ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css'; link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if ((window as any).L) { initMap(); }
    else if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      const poll = setInterval(() => {
        if ((window as any).L) { clearInterval(poll); initMap(); }
      }, 50);
    }
    return () => {
      if (leafletMap.current) {
        try { leafletMap.current.remove(); } catch {}
        leafletMap.current = null;
        setLoaded(false);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Draw GeoJSON barangay polygons ─────────────────────────────────────────
  useEffect(() => {
    if (!loaded || !leafletMap.current) return;
    const L   = (window as any).L;
    const map = leafletMap.current;
    if (!L) return;

    // Remove old GeoJSON layer
    if (geoLayerRef.current) {
      try { map.removeLayer(geoLayerRef.current); } catch {}
      geoLayerRef.current = null;
    }

    const geoLayer = L.geoJSON(CALACA_BARANGAYS_GEOJSON, {
      style: (feature: any) => {
        const name   = feature.properties.name as string;
        const cases  = barangayCases[name] ?? 0;
        return {
          fillColor:   casesColor(cases),
          fillOpacity: casesOpacity(cases),
          color:       casesBorderColor(cases),
          weight:      1.8,
          dashArray:   cases === 0 ? '4,3' : undefined,
        };
      },
      onEachFeature: (feature: any, layer: any) => {
        const name   = feature.properties.name as string;
        const num    = feature.properties.number as number;
        const cases  = barangayCases[name] ?? 0;
        const active = outbreaks
          .filter(o => !o.is_archived && o.barangay === name)
          .map(o => `<br/>&nbsp;&nbsp;• ${o.disease} (${o.status}) — ${o.cases} case${o.cases !== 1 ? 's' : ''}`)
          .join('');

        layer.bindTooltip(
          `<div style="font-family:sans-serif;min-width:160px;">
            <strong style="font-size:13px;">${name}</strong>
            <span style="font-size:11px;color:#6b7280;"> (#${num})</span><br/>
            <span style="font-size:12px;color:${cases > 0 ? '#dc2626' : '#16a34a'};">
              ${cases > 0 ? `⚠️ ${cases} active case${cases !== 1 ? 's' : ''}` : '✅ No active cases'}
            </span>
            ${active ? `<div style="font-size:11.5px;color:#374151;margin-top:4px;">${active}</div>` : ''}
          </div>`,
          { sticky: true, direction: 'top' }
        );

        // Highlight on hover
        layer.on('mouseover', () => {
          layer.setStyle({ weight: 3, fillOpacity: Math.min(casesOpacity(cases) + 0.15, 0.9) });
        });
        layer.on('mouseout', () => {
          geoLayer.resetStyle(layer);
        });

        // Add barangay number label
        const center = feature.properties.center as [number, number];
        const divIcon = L.divIcon({
          html: `<div style="
            font-size: 9px;
            font-weight: 800;
            color: #374151;
            background: rgba(255,255,255,0.75);
            border-radius: 4px;
            padding: 1px 3px;
            white-space: nowrap;
            line-height: 1.2;
            text-align: center;
            border: 1px solid rgba(0,0,0,0.12);
            pointer-events: none;
          ">${num}</div>`,
          className: '',
          iconAnchor: [8, 8],
        });
        L.marker([center[0], center[1]], { icon: divIcon, interactive: false }).addTo(map);
      },
    }).addTo(map);

    geoLayerRef.current = geoLayer;

    // Fit map to Calaca bounds
    try {
      const bounds = geoLayer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds.pad(0.05));
    } catch {}

  // Re-render whenever case counts change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, JSON.stringify(barangayCases)]);

  // ── Draw outbreak markers & containment circles ────────────────────────────
  useEffect(() => {
    if (!loaded || !leafletMap.current) return;
    const L   = (window as any).L;
    const map = leafletMap.current;
    if (!L) return;

    markersRef.current.forEach(m => { try { map.removeLayer(m); } catch {} });
    circlesRef.current.forEach(c => { try { map.removeLayer(c); } catch {} });
    markersRef.current = [];
    circlesRef.current = [];
    if (!map.getPanes().overlayPane) return;

    mappable.forEach(ob => {
      const color      = CIRCLE_COLOR[ob.status] || '#ef4444';
      const isSelected = ob.id === selectedId;

      try {
        const circle = L.circle([ob.lat, ob.lng], {
          radius:      (ob.radius_km || 10) * 1000,
          color,
          fillColor:   color,
          fillOpacity: isSelected ? 0.20 : 0.08,
          weight:      isSelected ? 3 : 1.5,
          dashArray:   ob.status === 'Resolved' ? '6,4' : undefined,
        }).addTo(map);
        circle.bindTooltip(
          `<strong>${ob.disease}</strong><br/>${ob.barangay} · ${ob.cases} case${ob.cases !== 1 ? 's' : ''}<br/>Containment: ${ob.radius_km}km`,
          { sticky: true }
        );
        circlesRef.current.push(circle);
      } catch {}

      try {
        const sz = isSelected ? 36 : 28;
        const icon = L.divIcon({
          html: `<div style="background:${color};width:${sz}px;height:${sz}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;"><div style="transform:rotate(45deg);font-size:${isSelected ? 14 : 11}px;color:white;font-weight:900;">${ob.cases}</div></div>`,
          className: '',
          iconSize:   [sz, sz],
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
      } catch {}
    });

    try {
      if (selectedId) {
        const sel = mappable.find(o => o.id === selectedId);
        if (sel?.lat != null) leafletMap.current.flyTo([sel.lat, sel.lng], 14, { duration: 1 });
      }
    } catch {}
  }, [loaded, mappable, selectedId]);

  return (
    <div style={{ position: 'relative', height: '500px', borderRadius: 16, overflow: 'hidden', border: '2px solid #e5e7eb' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {!loaded && (
        <div style={{ position: 'absolute', inset: 0, background: '#f0f4f8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#2B5EA6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>Loading map…</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* ── Choropleth legend ── */}
      <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(255,255,255,.95)', borderRadius: 10, padding: '10px 14px', boxShadow: '0 2px 12px rgba(0,0,0,.15)', fontSize: 11.5, minWidth: 170, zIndex: 1000 }}>
        <p style={{ fontWeight: 800, marginBottom: 6, color: '#374151', fontSize: 11 }}>BARANGAY CASE HEAT MAP</p>
        {[
          { label: 'No active cases',  color: '#d1fae5', border: '#6ee7b7' },
          { label: '1–2 cases (Low)',  color: '#fef08a', border: '#eab308' },
          { label: '3–5 (Moderate)',   color: '#fb923c', border: '#ea580c' },
          { label: '6–10 (High)',      color: '#ef4444', border: '#dc2626' },
          { label: '11+ (Critical)',   color: '#7f1d1d', border: '#450a0a' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: l.color, border: `2px solid ${l.border}`, flexShrink: 0 }} />
            <span style={{ color: '#374151' }}>{l.label}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 6, paddingTop: 5 }}>
          <p style={{ fontWeight: 800, marginBottom: 5, color: '#374151', fontSize: 11 }}>OUTBREAK MARKERS</p>
          {[
            { label: 'Pending',    color: '#f59e0b' },
            { label: 'On-Going',   color: '#3b82f6' },
            { label: 'Resolved',   color: '#22c55e' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: l.color, border: `2px solid ${l.color}` }} />
              <span style={{ color: '#374151' }}>{l.label}</span>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 5, paddingTop: 5, color: '#9ca3af', fontSize: 10 }}>
          Hover barangay for details
        </div>
      </div>

      {/* Badge: barangay count */}
      <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(43,94,166,.92)', color: '#fff', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 800, zIndex: 1000 }}>
        40 Barangays · Calaca City
      </div>
    </div>
  );
}

// ── DELETE CONFIRMATION MODAL ─────────────────────────────────────────────────

function DeleteModal({ record, onClose, onConfirm }: {
  record: OutbreakRecord;
  onClose: () => void;
  onConfirm: (justification: string) => Promise<void>;
}) {
  const [justification, setJustification] = useState('');
  const [deleting, setDeleting]           = useState(false);
  const [error, setError]                 = useState('');

  const handleDelete = async () => {
    if (!justification.trim() || justification.trim().length < 10) {
      setError('Please provide a detailed justification (at least 10 characters).');
      return;
    }
    setDeleting(true);
    try { await onConfirm(justification.trim()); }
    catch (e: any) { setError(e.message || 'Delete failed.'); setDeleting(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, boxShadow: '0 30px 80px rgba(0,0,0,.3)' }}>
        <div style={{ background: 'linear-gradient(135deg,#7f1d1d,#dc2626)', padding: '20px 24px', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'rgba(255,255,255,.15)', borderRadius: 10, padding: 8, display: 'flex' }}>
              <Trash2 size={18} color="#fff" />
            </div>
            <div>
              <p style={{ color: '#fff', fontWeight: 800, fontSize: 16, margin: 0 }}>Permanently Delete Record</p>
              <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, margin: '2px 0 0' }}>This action cannot be undone</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '50%', width: 32, height: 32, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        </div>
        <div style={{ padding: '22px 24px' }}>
          <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 18 }}>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: '#991b1b', margin: '0 0 4px' }}>{record.disease} — {record.barangay}</p>
            <p style={{ fontSize: 12, color: '#b91c1c', margin: 0 }}>ID: {record.id} · {record.cases} case{record.cases !== 1 ? 's' : ''} · Status: {record.status}</p>
          </div>
          <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 18, fontSize: 12.5, color: '#92400e', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <AlertOctagon size={15} style={{ flexShrink: 0, marginTop: 1, color: '#d97706' }} />
            <span><strong>Warning:</strong> This will <strong>permanently remove</strong> this outbreak record from the database. This action is irreversible. Only use deletion for erroneous or duplicate records. For resolved cases, consider archiving instead.</span>
          </div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
            Justification for Deletion <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <textarea
            value={justification}
            onChange={e => { setJustification(e.target.value); setError(''); }}
            rows={4}
            placeholder="Provide a detailed reason for permanently deleting this record…"
            style={{ width: '100%', border: `1.5px solid ${error ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 10, padding: '10px 12px', fontSize: 13.5, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', background: error ? '#fff5f5' : '#f9fafb' }}
          />
          {error && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 5 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button onClick={onClose} style={{ flex: 1, height: 44, border: '1.5px solid #e5e7eb', borderRadius: 10, background: '#fff', color: '#374151', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleDelete} disabled={deleting} style={{ flex: 1.5, height: 44, border: 'none', borderRadius: 10, background: deleting ? '#d1d5db' : 'linear-gradient(135deg,#7f1d1d,#dc2626)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: deleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {deleting ? <><RefreshCw size={15} style={{ animation: 'spin .7s linear infinite' }} />Deleting…</> : <><Trash2 size={15} />Confirm Delete</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── UPDATE MODAL ─────────────────────────────────────────────────────────────

function UpdateModal({ record, onClose, onSave, isAdmin }: {
  record: OutbreakRecord;
  onClose: () => void;
  onSave: (data: Partial<OutbreakRecord> & { newUpdate?: string; close_record?: boolean; archived_reason?: string }) => Promise<void>;
  isAdmin: boolean;
}) {
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState({
    status:          record.status as string,
    severity:        record.severity,
    assigned_to:     record.assigned_to || '',
    resolve_date:    record.resolve_date || '',
    timetable:       record.timetable || '',
    newUpdate:       '',
    close_record:    false,
    archived_reason: '',
  });
  const [medicines, setMedicines]           = useState<any[]>([]);
  const [dispatchItems, setDispatchItems]   = useState<Array<{ item_id: string; item_type: string; quantity: number; barcode: string; name: string; unit: string }>>([]);
  const [dispatchBarcode, setDispatchBarcode] = useState('');

  useEffect(() => {
    api.getMedicines().then(r => setMedicines(r.medicines || [])).catch(() => {});
  }, []);

  const lookupBarcode = async (barcode: string) => {
    if (!barcode.trim()) return;
    const found = medicines.find((m: any) => m.barcode === barcode.trim());
    if (found) { addDispatchItem(found, 'medicine'); }
    else {
      try {
        const r = await api.lookupVaccineBarcode(barcode);
        if (r.medicine) addDispatchItem(r.medicine, 'medicine');
        else alert('No item found with that barcode');
      } catch { alert('Barcode not found'); }
    }
    setDispatchBarcode('');
  };

  const addDispatchItem = (item: any, type: string) => {
    setDispatchItems(prev => {
      const ex = prev.find(p => p.item_id === item.id);
      if (ex) return prev.map(p => p.item_id === item.id ? { ...p, quantity: p.quantity + 1 } : p);
      return [...prev, { item_id: item.id, item_type: type, quantity: 1, barcode: item.barcode || '', name: item.name, unit: item.unit || 'units' }];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
      if (dispatchItems.length > 0 && form.assigned_to) {
        try { await api.outbreakDispatch({ outbreak_id: record.id, assigned_person: form.assigned_to, items: dispatchItems }); }
        catch (e: any) { alert('Outbreak saved but medicine dispatch failed: ' + e.message); }
      }
      onClose();
    } catch { alert('Failed to save update'); }
    finally { setSaving(false); }
  };

  const isResolved = form.status === 'Resolved';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 600, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,.25)' }}>
        <div style={{ background: 'linear-gradient(135deg,#1e4080,#2B5EA6)', padding: '20px 24px', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: 16, margin: 0 }}>Update Outbreak Record</p>
            <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, margin: '2px 0 0' }}>{record.id} · {record.disease} · {record.barangay}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '50%', width: 32, height: 32, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        </div>
        <div style={{ padding: '22px 24px' }}>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#dc2626', borderBottom: '1.5px solid #fee2e2', paddingBottom: 6, marginBottom: 14 }}>Status & Severity</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Record Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value, close_record: false }))}
                style={{ width: '100%', height: 40, border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '0 10px', fontSize: 13.5, background: '#f9fafb', outline: 'none' }}>
                <option value="Pending">⏳ Pending</option>
                <option value="On-Going">🔵 On-Going</option>
                <option value="Resolved">✅ Resolved</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Severity</label>
              <select value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value as any }))}
                style={{ width: '100%', height: 40, border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '0 10px', fontSize: 13.5, background: '#f9fafb', outline: 'none' }}>
                {['Critical', 'High', 'Medium', 'Low'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {isResolved && (
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <CheckCircle size={16} style={{ color: '#16a34a', flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#15803d', margin: '0 0 6px' }}>Marking as Resolved</p>
                  <p style={{ fontSize: 12, color: '#166534', margin: '0 0 10px', lineHeight: 1.5 }}>
                    A resolved record stays visible with a green pin on the map. To fully close it, check below — it will be <strong>archived</strong>.
                  </p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.close_record} onChange={e => setForm(p => ({ ...p, close_record: e.target.checked }))}
                      style={{ width: 16, height: 16, accentColor: '#16a34a', cursor: 'pointer' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>Also close & archive this record</span>
                  </label>
                  {form.close_record && (
                    <div style={{ marginTop: 10 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Archive Reason <span style={{ color: '#dc2626' }}>*</span></label>
                      <textarea value={form.archived_reason} onChange={e => setForm(p => ({ ...p, archived_reason: e.target.value }))} rows={2}
                        placeholder="e.g., All containment measures completed. No new cases in 30 days."
                        style={{ width: '100%', border: '1.5px solid #86efac', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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
                placeholder="e.g., Day 1: Quarantine, Day 3: Mass vaccination…"
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '9px 10px', fontSize: 13.5, background: '#f9fafb', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
          </div>

          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#60A85C', borderBottom: '1.5px solid #dcfce7', paddingBottom: 6, marginBottom: 14 }}>Add Update / Remarks</p>
          <textarea value={form.newUpdate} onChange={e => setForm(p => ({ ...p, newUpdate: e.target.value }))} rows={3}
            placeholder="Enter update, field observations, interventions done, or any remarks…"
            style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '9px 10px', fontSize: 13.5, background: '#f9fafb', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 16 }} />

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

          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7c3aed', borderBottom: '1.5px solid #ede9fe', paddingBottom: 6, marginBottom: 14 }}>Dispatch Medicines / Supplies (Optional)</p>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input value={dispatchBarcode} onChange={e => setDispatchBarcode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && lookupBarcode(dispatchBarcode)}
                placeholder="Scan barcode or type item barcode..."
                style={{ flex: 1, height: 38, border: '1.5px solid #ddd6fe', borderRadius: 9, padding: '0 10px', fontSize: 13, outline: 'none' }} />
              <button onClick={() => lookupBarcode(dispatchBarcode)}
                style={{ height: 38, padding: '0 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Lookup</button>
            </div>
            <select onChange={e => { const m = medicines.find((x: any) => x.id === e.target.value); if (m) addDispatchItem(m, 'medicine'); e.target.value = ''; }}
              style={{ width: '100%', height: 36, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0 8px', fontSize: 12.5, outline: 'none', background: '#fafafa', marginBottom: 8 }}>
              <option value="">— Select item to dispatch —</option>
              {medicines.map((m: any) => <option key={m.id} value={m.id}>{m.name} (Stock: {m.quantity} {m.unit})</option>)}
            </select>
            {dispatchItems.length > 0 && (
              <div style={{ background: '#faf5ff', border: '1.5px solid #ddd6fe', borderRadius: 10, padding: '10px 12px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', marginBottom: 8 }}>ITEMS TO DISPATCH (assigned to: <strong>{form.assigned_to || 'TBD'}</strong>)</p>
                {dispatchItems.map((di, i) => (
                  <div key={di.item_id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ flex: 1, fontSize: 12.5, color: '#374151' }}>{di.name}</span>
                    <input type="number" min={1} value={di.quantity}
                      onChange={e => setDispatchItems(prev => prev.map((p, pi) => pi === i ? { ...p, quantity: parseInt(e.target.value) || 1 } : p))}
                      style={{ width: 60, height: 30, border: '1.5px solid #ddd6fe', borderRadius: 6, padding: '0 6px', fontSize: 12, textAlign: 'center', outline: 'none' }} />
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>{di.unit}</span>
                    <button onClick={() => setDispatchItems(prev => prev.filter((_, pi) => pi !== i))}
                      style={{ width: 24, height: 24, background: '#fee2e2', border: 'none', borderRadius: 6, color: '#dc2626', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

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

function OutbreakCard({ record, isSelected, onSelect, onUpdate, onDelete, canEdit, canDelete, isArchived }: {
  record: OutbreakRecord;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
  isArchived?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background:   isArchived ? '#f8fafc' : '#fff',
      borderRadius: 16,
      border:       isSelected ? '2px solid #2B5EA6' : isArchived ? '1.5px solid #e2e8f0' : '1.5px solid #e5e7eb',
      boxShadow:    isSelected ? '0 4px 20px rgba(43,94,166,.2)' : '0 2px 8px rgba(0,0,0,.05)',
      overflow: 'hidden', cursor: 'pointer', transition: 'all .2s',
      opacity: isArchived ? 0.75 : 1,
    }} onClick={onSelect}>
      <div style={{ height: 4, background: isArchived ? '#e2e8f0' : record.status === 'Pending' ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : record.status === 'On-Going' ? 'linear-gradient(90deg,#3b82f6,#06b6d4)' : record.status === 'Resolved' ? 'linear-gradient(90deg,#22c55e,#86efac)' : record.status === 'Active' ? 'linear-gradient(90deg,#ef4444,#f97316)' : 'linear-gradient(90deg,#94a3b8,#cbd5e1)' }} />
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 800, background: '#f1f5f9', color: '#64748b', padding: '2px 7px', borderRadius: 6, fontFamily: 'monospace' }}>{record.id}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${SEVERITY_COLOR[record.severity]}`}>{record.severity}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLOR[record.status] || 'bg-gray-100 text-gray-700'}`}>{record.status}</span>
              {isArchived && <span style={{ fontSize: 10, background: '#e2e8f0', color: '#64748b', borderRadius: 6, padding: '2px 7px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}><Archive size={9} />Archived</span>}
              {record.type === 'rabies' ? <span style={{ fontSize: 10, background: '#fee2e2', color: '#991b1b', borderRadius: 6, padding: '2px 7px', fontWeight: 700 }}>🐕 Rabies</span> : <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', borderRadius: 6, padding: '2px 7px', fontWeight: 700 }}>🐄 Livestock</span>}
            </div>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#1f2937', margin: '0 0 2px' }}>{record.disease}</p>
            <p style={{ fontSize: 12.5, color: '#6b7280', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={11} />{record.barangay} · {record.cases} case{record.cases !== 1 ? 's' : ''} · {record.radius_km}km containment
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
            {canEdit && !isArchived && (
              <button onClick={e => { e.stopPropagation(); onUpdate(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 10px', background: '#eff6ff', border: 'none', borderRadius: 8, color: '#2B5EA6', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                <Edit3 size={12} />Update
              </button>
            )}
            {canDelete && (
              <button onClick={e => { e.stopPropagation(); onDelete(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 10px', background: '#fff5f5', border: 'none', borderRadius: 8, color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                <Trash2 size={12} />Delete
              </button>
            )}
            <button onClick={e => { e.stopPropagation(); setExpanded(p => !p); }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 10px', background: '#f8fafc', border: 'none', borderRadius: 8, color: '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}{expanded ? 'Less' : 'More'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
          {record.assigned_to && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#6b7280' }}><User size={11} />{record.assigned_to}</span>}
          {record.resolve_date && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#6b7280' }}><Calendar size={11} />Target: {new Date(record.resolve_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#9ca3af' }}><Clock size={11} />{new Date(record.date_created).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          {record.updates.length > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#2B5EA6' }}><Activity size={11} />{record.updates.length} update{record.updates.length !== 1 ? 's' : ''}</span>}
        </div>

        {isArchived && record.archived_reason && (
          <div style={{ marginTop: 8, background: '#f1f5f9', borderRadius: 8, padding: '6px 10px', fontSize: 11.5, color: '#64748b', display: 'flex', alignItems: 'flex-start', gap: 5 }}>
            <Archive size={11} style={{ marginTop: 1, flexShrink: 0 }} />
            <span><strong>Archived:</strong> {record.archived_reason}</span>
          </div>
        )}

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
              <p style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>No updates yet.</p>
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
  const canEdit   = ['admin', 'superadmin', 'cityHealth'].includes(userRole);
  const canDelete = ['admin', 'superadmin'].includes(userRole);

  const [outbreaks,         setOutbreaks]         = useState<OutbreakRecord[]>([]);
  const [archivedOutbreaks, setArchivedOutbreaks] = useState<OutbreakRecord[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [selectedId,        setSelectedId]        = useState<string | null>(null);
  const [editingRecord,     setEditingRecord]     = useState<OutbreakRecord | null>(null);
  const [deletingRecord,    setDeletingRecord]    = useState<OutbreakRecord | null>(null);
  const [filterStatus,      setFilterStatus]      = useState<string>('all');
  const [filterType,        setFilterType]        = useState<string>('all');
  const [search,            setSearch]            = useState('');
  const [view,              setView]              = useState<'split' | 'map' | 'list'>('split');
  const [activeTab,         setActiveTab]         = useState<'active' | 'history'>('active');
  const [stats,             setStats]             = useState({ total: 0, pending: 0, onGoing: 0, resolved: 0, archived: 0 });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('nasaalaga_token') || '';
      const r1 = await fetch('/api/outbreaks', { headers: { Authorization: `Bearer ${token}` } });
      const r2 = await fetch('/api/outbreaks?include_archived=true', { headers: { Authorization: `Bearer ${token}` } });
      let activeList: OutbreakRecord[] = [];
      let allList:    OutbreakRecord[] = [];
      if (r1.ok) { const d = await r1.json(); activeList = (d.outbreaks || []).filter((o: OutbreakRecord) => !o.is_archived); }
      else        { activeList = getDemoData().filter(o => !o.is_archived); }
      if (r2.ok) { const d2 = await r2.json(); allList = d2.outbreaks || []; }
      else        { allList = getDemoData(); }
      const archived = allList.filter((o: OutbreakRecord) => o.is_archived);
      setOutbreaks(activeList);
      setArchivedOutbreaks(archived);
      setStats({
        total:    activeList.length,
        pending:  activeList.filter(o => o.status === 'Pending').length,
        onGoing:  activeList.filter(o => o.status === 'On-Going' || o.status === 'Active').length,
        resolved: activeList.filter(o => o.status === 'Resolved').length,
        archived: archived.length,
      });
    } catch {
      const demo   = getDemoData();
      const active = demo.filter(o => !o.is_archived);
      const arch   = demo.filter(o => o.is_archived);
      setOutbreaks(active);
      setArchivedOutbreaks(arch);
      setStats({ total: active.length, pending: active.filter(o => o.status === 'Pending').length, onGoing: active.filter(o => o.status === 'On-Going').length, resolved: active.filter(o => o.status === 'Resolved').length, archived: arch.length });
    }
    setLoading(false);
  };

  const handleSaveUpdate = async (data: any) => {
    if (!editingRecord) return;
    const token = sessionStorage.getItem('nasaalaga_token') || '';
    const newUpdate = data.newUpdate?.trim() ? {
      id: `UPD-${Date.now()}`, text: data.newUpdate.trim(),
      author: currentUser?.username || 'System', timestamp: new Date().toISOString(),
    } : null;
    const payload = {
      status: data.status, severity: data.severity, assigned_to: data.assigned_to,
      resolve_date: data.resolve_date, timetable: data.timetable, new_update: newUpdate,
      close_record: data.close_record || false, archived_reason: data.archived_reason || '',
    };
    try {
      const r = await fetch(`/api/outbreaks/${editingRecord.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (r.ok) { await load(); return; }
    } catch {}
    setOutbreaks(prev => {
      const updated = prev.map(ob => {
        if (ob.id !== editingRecord.id) return ob;
        return {
          ...ob, ...payload,
          updates:        newUpdate ? [...ob.updates, newUpdate] : ob.updates,
          date_updated:   new Date().toISOString(),
          is_archived:    data.close_record && data.status === 'Resolved' ? true : ob.is_archived,
          archived_at:    data.close_record && data.status === 'Resolved' ? new Date().toISOString() : ob.archived_at,
          archived_reason: data.close_record ? data.archived_reason : ob.archived_reason,
        };
      });
      const still_active   = updated.filter(o => !o.is_archived);
      const newly_archived = updated.filter(o => o.is_archived);
      setArchivedOutbreaks(prev2 => [...prev2, ...newly_archived.filter(n => !prev2.find(p => p.id === n.id))]);
      return still_active;
    });
  };

  const handleDeleteRecord = async (justification: string) => {
    if (!deletingRecord) return;
    const token = sessionStorage.getItem('nasaalaga_token') || '';
    const r = await fetch(`/api/outbreaks/${deletingRecord.id}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ justification }),
    });
    if (!r.ok) { const err = await r.json().catch(() => ({})); throw new Error(err.error || 'Delete failed'); }
    setDeletingRecord(null);
    await load();
  };

  const displayList = activeTab === 'active' ? outbreaks : archivedOutbreaks;
  const filtered    = displayList.filter(o => {
    if (filterStatus !== 'all' && o.status !== filterStatus) return false;
    if (filterType   !== 'all' && o.type   !== filterType)   return false;
    if (search && !`${o.disease} ${o.barangay} ${o.id}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 22, fontWeight: 900, color: '#1f2937', margin: 0 }}>
            <Map className="w-6 h-6" style={{ color: '#2B5EA6' }} />Outbreak Monitoring
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Real-time disease surveillance · Calaca City, Batangas · 40 Barangays</p>
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

      {/* ── NOTICE ── */}
      <div style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '1.5px solid #bfdbfe', borderRadius: 14, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Info size={16} style={{ color: '#2563eb', flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12.5, color: '#1e40af', lineHeight: 1.6 }}>
          <strong>How Outbreaks Are Recorded:</strong> Outbreak records are automatically created when (1) a confirmed rabies case is marked in <em>Biting Incidents</em>, or (2) an Admin approves an outbreak recommendation from livestock disease thresholds. This module is for <strong>monitoring and updating</strong> only.
          {canDelete && <span style={{ display: 'block', marginTop: 4, color: '#1d4ed8' }}>🛡️ <strong>Admin:</strong> You can update record status (Pending → On-Going → Resolved) and delete records with justification.</span>}
          <span style={{ display: 'block', marginTop: 4, color: '#1e40af' }}>🗺️ <strong>GeoMap:</strong> Barangay boundaries are now traced on the map. Colors show case density — hover a barangay to see details.</span>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Active', value: stats.total,    color: '#2B5EA6', bg: '#eff6ff' },
          { label: 'Pending',      value: stats.pending,  color: '#d97706', bg: '#fffbeb' },
          { label: 'On-Going',     value: stats.onGoing,  color: '#2563eb', bg: '#eff6ff' },
          { label: 'Resolved',     value: stats.resolved, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Archived',     value: stats.archived, color: '#64748b', bg: '#f8fafc' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: '14px 16px', border: `1.5px solid ${s.bg}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: s.color, margin: '0 0 6px', opacity: .8 }}>{s.label.toUpperCase()}</p>
            <p style={{ fontSize: 28, fontWeight: 900, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── TABS ── */}
      <div style={{ display: 'flex', gap: 0, background: '#f1f5f9', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {[
          { key: 'active',  label: 'Active Records',  icon: <Activity size={14} /> },
          { key: 'history', label: `History / Archived (${archivedOutbreaks.length})`, icon: <History size={14} /> },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: activeTab === tab.key ? '#fff' : 'transparent', color: activeTab === tab.key ? '#2B5EA6' : '#64748b', boxShadow: activeTab === tab.key ? '0 1px 4px rgba(0,0,0,.1)' : 'none', transition: 'all .15s' }}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ── FILTERS ── */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '12px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,.05)', border: '1.5px solid #f1f5f9' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search disease, barangay, ID…"
            style={{ width: '100%', height: 38, paddingLeft: 32, paddingRight: 12, border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ height: 38, padding: '0 10px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 13, background: '#f9fafb', outline: 'none' }}>
          <option value="all">All Status</option>
          <option value="Pending">Pending</option>
          <option value="On-Going">On-Going</option>
          <option value="Resolved">Resolved</option>
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ height: 38, padding: '0 10px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 13, background: '#f9fafb', outline: 'none' }}>
          <option value="all">All Types</option>
          <option value="rabies">Rabies</option>
          <option value="livestock">Livestock</option>
        </select>
        <span style={{ fontSize: 12.5, color: '#9ca3af', alignSelf: 'center' }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── ARCHIVED NOTICE ── */}
      {activeTab === 'history' && (
        <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: '#64748b' }}>
          <Archive size={15} style={{ flexShrink: 0, color: '#94a3b8' }} />
          <span>Archived records are <strong>no longer shown on the map</strong>. They remain here for historical reference.</span>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#2B5EA6', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading outbreak data…</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: view === 'split' && activeTab === 'active' ? '1fr 360px' : '1fr', gap: 16 }}>
          {view !== 'list' && activeTab === 'active' && (
            <div style={{ background: '#fff', borderRadius: 18, padding: 16, boxShadow: '0 4px 16px rgba(0,0,0,.07)', border: '1.5px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#374151', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Layers size={15} style={{ color: '#2B5EA6' }} />Disease Map — Calaca City (40 Barangays)
                </h3>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{outbreaks.filter(o => o.lat).length} outbreak location{outbreaks.filter(o => o.lat).length !== 1 ? 's' : ''}</span>
              </div>
              <OutbreakMap outbreaks={outbreaks} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          )}

          {view !== 'map' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: view === 'split' && activeTab === 'active' ? 560 : 'auto', overflowY: view === 'split' && activeTab === 'active' ? 'auto' : 'visible' }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, border: '1.5px dashed #e5e7eb' }}>
                  <Shield size={36} style={{ color: '#d1d5db', margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 14, color: '#9ca3af' }}>{activeTab === 'history' ? 'No archived records.' : 'No outbreak records match your filters.'}</p>
                  {activeTab === 'active' && <p style={{ fontSize: 12, color: '#d1d5db', marginTop: 4 }}>Outbreaks are created automatically from confirmed rabies or livestock disease thresholds.</p>}
                </div>
              ) : (
                filtered.map(ob => (
                  <OutbreakCard
                    key={ob.id}
                    record={ob}
                    isSelected={selectedId === ob.id}
                    onSelect={() => setSelectedId(p => p === ob.id ? null : ob.id)}
                    onUpdate={() => setEditingRecord(ob)}
                    onDelete={() => setDeletingRecord(ob)}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    isArchived={activeTab === 'history' || ob.is_archived}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ── MONITORING TOOLS PANEL ── */}
      {activeTab === 'active' && (
        <div style={{ background: '#fff', borderRadius: 18, padding: 20, boxShadow: '0 4px 16px rgba(0,0,0,.07)', border: '1.5px solid #e5e7eb' }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#374151', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <BarChart3 size={16} style={{ color: '#2B5EA6' }} />Monitoring Dashboard
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            <div style={{ background: '#fff5f5', borderRadius: 12, padding: '14px 16px', border: '1.5px solid #fee2e2' }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', margin: '0 0 10px', letterSpacing: '.07em' }}>ON-GOING OUTBREAKS</p>
              {outbreaks.filter(o => o.status === 'On-Going' || o.status === 'Active').length === 0 ? (
                <p style={{ fontSize: 12.5, color: '#9ca3af', fontStyle: 'italic' }}>None currently on-going</p>
              ) : outbreaks.filter(o => o.status === 'On-Going' || o.status === 'Active').map(o => (
                <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12.5 }}>
                  <span style={{ fontWeight: 700, color: '#1f2937' }}>{o.disease}</span>
                  <span style={{ color: '#6b7280' }}>{o.barangay}</span>
                </div>
              ))}
            </div>
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
      )}

      {editingRecord && (
        <UpdateModal record={editingRecord} onClose={() => setEditingRecord(null)} onSave={handleSaveUpdate} isAdmin={canDelete} />
      )}
      {deletingRecord && (
        <DeleteModal record={deletingRecord} onClose={() => setDeletingRecord(null)} onConfirm={handleDeleteRecord} />
      )}
    </div>
  );
}

// ── DEMO DATA ────────────────────────────────────────────────────────────────

function getDemoData(): OutbreakRecord[] {
  return [
    {
      id: 'OB-RABIES-001', type: 'rabies', disease: 'Rabies', barangay: 'Barangay 4 (Pob.)',
      source_id: 'BITE-001', cases: 1, lat: 13.9320, lng: 120.8165, radius_km: 10,
      status: 'On-Going', severity: 'High', assigned_to: 'BAHW Santos',
      resolve_date: '2026-06-15', timetable: 'Day 1: Quarantine. Day 3: Area vaccination drive. Day 7: Re-evaluation.',
      updates: [
        { id: 'u1', text: 'Confirmed rabies case. 10km containment radius established.', author: 'Dr. Reyes', timestamp: '2026-05-20T08:00:00Z' },
        { id: 'u2', text: 'Mass dog vaccination started. 42 dogs vaccinated today.', author: 'BAHW Santos', timestamp: '2026-05-22T14:00:00Z' },
      ],
      date_created: '2026-05-20T08:00:00Z', date_updated: '2026-05-22T14:00:00Z', is_archived: false,
    },
    {
      id: 'OB-LIVE-001', type: 'livestock', disease: 'African Swine Fever (ASF)', barangay: 'Bagong Tubig',
      source_id: 'DSE-012', cases: 4, lat: 13.9445, lng: 120.7840, radius_km: 10,
      status: 'On-Going', severity: 'Critical', assigned_to: 'Dr. Cruz',
      resolve_date: '2026-06-30', timetable: 'Immediate depopulation. 500m quarantine fence. Culling teams deployed.',
      updates: [
        { id: 'u1', text: '4 confirmed ASF cases in 3 farms. Admin approved outbreak declaration.', author: 'Admin', timestamp: '2026-05-18T09:00:00Z' },
        { id: 'u2', text: 'Depopulation of 23 pigs completed. Farms disinfected.', author: 'Dr. Cruz', timestamp: '2026-05-21T16:00:00Z' },
      ],
      date_created: '2026-05-18T09:00:00Z', date_updated: '2026-05-21T16:00:00Z', is_archived: false,
    },
    {
      id: 'OB-LIVE-002', type: 'livestock', disease: 'Avian Influenza', barangay: 'Bambang',
      source_id: 'DSE-008', cases: 2, lat: 13.9065, lng: 120.8195, radius_km: 10,
      status: 'Pending', severity: 'Medium', assigned_to: 'BAHW Garcia',
      resolve_date: undefined, timetable: '',
      updates: [{ id: 'u1', text: 'Disease event triggered monitoring threshold. Pending review.', author: 'System', timestamp: '2026-05-19T10:00:00Z' }],
      date_created: '2026-05-19T10:00:00Z', date_updated: '2026-05-19T10:00:00Z', is_archived: false,
    },
    {
      id: 'OB-RABIES-002', type: 'rabies', disease: 'Rabies', barangay: 'Baclas',
      source_id: 'BITE-005', cases: 1, lat: 13.9100, lng: 120.8160, radius_km: 10,
      status: 'Resolved', severity: 'Medium', assigned_to: 'BAHW Reyes',
      resolve_date: '2026-04-28', timetable: 'Day 1-3: Containment. Day 5: Verification visit.',
      updates: [
        { id: 'u1', text: 'Animal culled. All pets in 10km radius identified for vaccination.', author: 'BAHW Reyes', timestamp: '2026-04-10T11:00:00Z' },
        { id: 'u2', text: 'Follow-up vaccination drive completed. 89 dogs, 31 cats vaccinated.', author: 'BAHW Reyes', timestamp: '2026-04-15T15:00:00Z' },
      ],
      date_created: '2026-04-09T08:00:00Z', date_updated: '2026-04-15T15:00:00Z',
      is_archived: true, archived_at: '2026-04-30T08:00:00Z',
      archived_reason: 'All containment measures completed. No new cases in 21 days. Officially closed by Dr. Reyes.',
    },
  ];
}

export default OutbreakMonitoring;
