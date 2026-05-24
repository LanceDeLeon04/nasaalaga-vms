import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface Incident {
  id: string;
  pet_id?: string;
  pet_name: string;
  incident_date: string;
  location: string;
  bitten_person: string;
  owner_name?: string;
  confirmed_rabies: boolean;
  vaccinated: boolean;
  remarks?: string;
  observation_start?: string;
  observation_end?: string;
  observation_update?: string;
  human_status?: string;
  status: string;
  reported_by?: string;
  created_at: string;
}

interface Props {
  userRole: string;
}

const S = `
  @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes popIn  { 0%{transform:scale(.8);opacity:0} 70%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }
  @keyframes spin   { to{transform:rotate(360deg)} }
  @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.5} }

  .bi-wrap { padding:0; }
  .bi-header { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:20px; }
  .bi-title  { font-size:22px; font-weight:900; color:#1f2937; display:flex; align-items:center; gap:10px; }
  .bi-sub    { font-size:13px; color:#6b7280; margin:4px 0 0; }
  .bi-btn-primary { height:42px; padding:0 18px; background:linear-gradient(135deg,#dc2626,#b91c1c); color:#fff; border:none; border-radius:10px; font-size:13px; font-weight:800; cursor:pointer; box-shadow:0 4px 14px rgba(220,38,38,.3); transition:transform .18s; display:flex; align-items:center; gap:6px; }
  .bi-btn-primary:hover { transform:translateY(-1px); }
  .bi-alert-banner { background:#fff8ed; border:1.5px solid #fbbf24; border-radius:14px; padding:16px 20px; margin-bottom:16px; display:flex; align-items:flex-start; gap:12px; animation:fadeUp .3s both; }
  .bi-alert-dot { width:10px; height:10px; border-radius:50%; background:#ef4444; animation:pulse 1.5s infinite; flex-shrink:0; margin-top:4px; }
  .bi-stats  { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:18px; }
  .bi-stat   { background:#fff; border-radius:14px; padding:16px 20px; box-shadow:0 2px 8px rgba(0,0,0,.06); }
  .bi-stat-val { font-size:28px; font-weight:900; }
  .bi-stat-lbl { font-size:12px; color:#6b7280; font-weight:600; margin-top:2px; }
  .bi-toolbar { background:#fff; border-radius:14px; padding:14px 18px; margin-bottom:14px; display:flex; gap:10px; flex-wrap:wrap; box-shadow:0 2px 8px rgba(0,0,0,.06); }
  .bi-search  { flex:1; min-width:180px; height:40px; border:1.5px solid #e5e7eb; border-radius:10px; padding:0 12px; font-size:14px; outline:none; }
  .bi-search:focus { border-color:#dc2626; }
  .bi-tab     { height:38px; padding:0 14px; border:1.5px solid #e5e7eb; border-radius:10px; background:#f9fafb; color:#6b7280; font-size:13px; font-weight:700; cursor:pointer; transition:all .18s; }
  .bi-tab.active { background:#dc2626; border-color:#dc2626; color:#fff; }
  .bi-table-wrap { background:#fff; border-radius:14px; box-shadow:0 2px 8px rgba(0,0,0,.06); overflow:hidden; }
  .bi-table   { width:100%; border-collapse:collapse; }
  .bi-table th { background:#f8fafc; padding:11px 14px; text-align:left; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.07em; color:#64748b; border-bottom:1.5px solid #e2e8f0; }
  .bi-table td { padding:13px 14px; border-bottom:1px solid #f1f5f9; font-size:13.5px; color:#374151; vertical-align:middle; }
  .bi-table tr:last-child td { border-bottom:none; }
  .bi-table tr:hover td { background:#fef9f9; }
  .bi-badge   { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:20px; font-size:11.5px; font-weight:700; }
  .bi-badge.open    { background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; }
  .bi-badge.closed  { background:#dcfce7; color:#14532d; border:1px solid #86efac; }
  .bi-badge.yes     { background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; }
  .bi-badge.no      { background:#f0fdf4; color:#15803d; border:1px solid #86efac; }
  .bi-badge.obs     { background:#fff8ed; color:#92400e; border:1px solid #fde68a; }
  .bi-badge.human   { background:#ede9fe; color:#5b21b6; border:1px solid #c4b5fd; }
  .bi-act     { height:32px; padding:0 12px; border-radius:8px; border:none; font-size:12.5px; font-weight:700; cursor:pointer; transition:all .18s; }
  .bi-act-edit { background:#eff6ff; color:#2B5EA6; }
  .bi-act-edit:hover { background:#2B5EA6; color:#fff; }
  .bi-act-del  { background:#fee2e2; color:#dc2626; }
  .bi-act-del:hover  { background:#dc2626; color:#fff; }
  .bi-empty   { text-align:center; padding:56px 20px; color:#9ca3af; }
  .bi-spinner { display:inline-block; width:32px; height:32px; border-radius:50%; border:3px solid #f1f5f9; border-top-color:#dc2626; animation:spin .7s linear infinite; margin-bottom:12px; }

  /* modal */
  .bi-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; }
  .bi-modal   { background:#fff; border-radius:20px; width:100%; max-width:640px; max-height:90vh; overflow-y:auto; box-shadow:0 30px 80px rgba(0,0,0,.22); animation:fadeUp .3s cubic-bezier(.22,1,.36,1) both; }
  .bi-modal-hd{ display:flex; align-items:center; justify-content:space-between; padding:22px 26px 0; }
  .bi-modal-title { font-size:18px; font-weight:900; color:#1f2937; }
  .bi-modal-close { width:32px; height:32px; border-radius:50%; border:none; background:#f1f5f9; font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#64748b; }
  .bi-modal-close:hover { background:#e2e8f0; }
  .bi-modal-bd{ padding:22px 26px; }
  .bi-section { font-size:10.5px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:#dc2626; margin:0 0 12px; padding-bottom:5px; border-bottom:1.5px solid #fee2e2; }
  .bi-section.purple { color:#7c3aed; border-color:#ede9fe; }
  .bi-grid    { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
  .bi-field   { display:flex; flex-direction:column; gap:5px; }
  .bi-label   { font-size:12px; font-weight:700; color:#374151; }
  .bi-input,.bi-select,.bi-textarea { border:1.5px solid #e5e7eb; border-radius:9px; background:#f9fafb; font-size:13.5px; outline:none; font-family:inherit; transition:border-color .18s; }
  .bi-input,.bi-select { height:42px; padding:0 11px; }
  .bi-input.pet-id-input { padding-right:36px; }
  .bi-textarea { padding:9px 11px; resize:none; line-height:1.6; }
  .bi-input:focus,.bi-select:focus,.bi-textarea:focus { border-color:#dc2626; background:#fff; box-shadow:0 0 0 3px rgba(220,38,38,.08); }
  .bi-input.autofilled { border-color:#16a34a; background:#f0fdf4; }
  .bi-checkbox-row { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
  .bi-checkbox-row label { font-size:13.5px; font-weight:600; color:#374151; cursor:pointer; display:flex; align-items:center; gap:7px; }
  .bi-modal-actions { display:flex; gap:10px; margin-top:20px; }
  .bi-modal-save { flex:1; height:44px; border:none; border-radius:10px; background:linear-gradient(135deg,#dc2626,#b91c1c); color:#fff; font-size:14px; font-weight:800; cursor:pointer; transition:transform .18s; box-shadow:0 6px 18px rgba(220,38,38,.25); }
  .bi-modal-save:hover:not(:disabled) { transform:translateY(-1px); }
  .bi-modal-save:disabled { background:#d1d5db; color:#9ca3af; box-shadow:none; cursor:not-allowed; }
  .bi-modal-cancel { height:44px; padding:0 18px; border:1.5px solid #e5e7eb; border-radius:10px; background:#fff; color:#374151; font-size:14px; font-weight:700; cursor:pointer; transition:all .18s; }
  .bi-modal-cancel:hover { border-color:#dc2626; color:#dc2626; }
  .bi-obs-box { background:#fff8ed; border:1.5px solid #fbbf24; border-radius:10px; padding:14px 16px; margin-bottom:14px; font-size:13px; color:#92400e; line-height:1.7; }
  .bi-pet-id-wrap { position:relative; }
  .bi-pet-id-spinner { position:absolute; right:10px; top:50%; transform:translateY(-50%); width:16px; height:16px; border-radius:50%; border:2px solid #e5e7eb; border-top-color:#2B5EA6; animation:spin .7s linear infinite; }
  .bi-pet-found-badge { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:700; color:#16a34a; background:#f0fdf4; border:1px solid #86efac; padding:2px 8px; border-radius:6px; margin-top:4px; }
  .bi-human-status-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; }
  .bi-hs-option { display:flex; align-items:center; gap:8px; padding:10px 12px; border:1.5px solid #e5e7eb; border-radius:10px; cursor:pointer; transition:all .18s; font-size:13px; font-weight:600; color:#374151; }
  .bi-hs-option:hover { border-color:#7c3aed; background:#faf5ff; }
  .bi-hs-option.selected { border-color:#7c3aed; background:#ede9fe; color:#5b21b6; }
  .bi-hs-option input { accent-color:#7c3aed; width:15px; height:15px; flex-shrink:0; }
  @media(max-width:580px){ .bi-stats{grid-template-columns:1fr 1fr;} .bi-grid{grid-template-columns:1fr;} .bi-human-status-grid{grid-template-columns:1fr;} }
`;

function fmt(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' });
}
function daysLeft(end?: string) {
  if (!end) return null;
  const diff = new Date(end).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

// ─── COORDINATE MODAL for Rabies Outbreak ────────────────────────────────────

function RabiesCoordModal({ incident, onClose, onConfirm }: {
  incident: { pet_name: string; location: string; id?: string };
  onClose: () => void;
  onConfirm: (lat: number, lng: number) => Promise<void>;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const [lat, setLat] = useState('13.9345');
  const [lng, setLng] = useState('120.8135');
  const [saving, setSaving] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const doInit = () => {
      const el = mapRef.current;
      if (!el || leafletMap.current) return;
      if ((el as any)._leaflet_id) { setMapLoaded(true); return; }
      const L = (window as any).L;
      if (!L) return;

      let map: any;
      try {
        map = L.map(el, { center: [13.9345, 120.8135], zoom: 13 });
      } catch { setMapLoaded(true); return; }

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 18 }).addTo(map);

      const circle = L.circle([13.9345, 120.8135], {
        radius: 10000, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.12, weight: 2,
      }).addTo(map);
      circleRef.current = circle;

      const icon = L.divIcon({
        html: `<div style="width:28px;height:28px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:14px;">🐕</div>`,
        className: '', iconSize: [28, 28], iconAnchor: [14, 14],
      });
      const marker = L.marker([13.9345, 120.8135], { icon, draggable: true }).addTo(map);
      markerRef.current = marker;

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setLat(pos.lat.toFixed(6));
        setLng(pos.lng.toFixed(6));
        circle.setLatLng(pos);
      });

      map.on('click', (e: any) => {
        marker.setLatLng(e.latlng);
        circle.setLatLng(e.latlng);
        setLat(e.latlng.lat.toFixed(6));
        setLng(e.latlng.lng.toFixed(6));
      });

      leafletMap.current = map;
      setMapLoaded(true);
    };

    if ((window as any).L) {
      doInit();
    } else if (!document.getElementById('leaflet-js')) {
      const s = document.createElement('script');
      s.id = 'leaflet-js';
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.onload = doInit;
      document.head.appendChild(s);
    } else {
      const poll = setInterval(() => { if ((window as any).L) { clearInterval(poll); doInit(); } }, 50);
    }

    return () => {
      if (leafletMap.current) {
        try { leafletMap.current.remove(); } catch { /* ignore */ }
        leafletMap.current = null;
      }
    };
  }, []);

  const handleManualUpdate = () => {
    const l = parseFloat(lat), g = parseFloat(lng);
    if (!isNaN(l) && !isNaN(g) && leafletMap.current) {
      markerRef.current?.setLatLng([l, g]);
      circleRef.current?.setLatLng([l, g]);
      leafletMap.current.setView([l, g], 13);
    }
  };

  const handleConfirm = async () => {
    const l = parseFloat(lat), g = parseFloat(lng);
    if (isNaN(l) || isNaN(g)) { toast.error('Enter valid coordinates'); return; }
    setSaving(true);
    try { await onConfirm(l, g); }
    catch { toast.error('Failed to create outbreak record'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
      <div style={{ background:'#fff',borderRadius:20,width:'100%',maxWidth:560,boxShadow:'0 30px 80px rgba(0,0,0,.25)',overflow:'hidden' }}>
        <div style={{ background:'linear-gradient(135deg,#dc2626,#b91c1c)',padding:'18px 22px',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div>
            <p style={{ color:'#fff',fontWeight:800,fontSize:16,margin:0 }}>⚠️ Confirmed Rabies — Pin Location</p>
            <p style={{ color:'rgba(255,255,255,.75)',fontSize:12,margin:'2px 0 0' }}>{incident.pet_name} · {incident.location}</p>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.15)',border:'none',borderRadius:'50%',width:32,height:32,color:'#fff',cursor:'pointer',fontSize:16 }}>✕</button>
        </div>

        <div style={{ padding:'18px 22px' }}>
          <div style={{ background:'#fff5f5',border:'1.5px solid #fca5a5',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:12.5,color:'#991b1b' }}>
            <strong>This will create a Rabies Outbreak record</strong> with a 10km containment radius centered on the pinned location. The record will appear in Outbreak Monitoring.
          </div>

          <div style={{ height:260,borderRadius:12,overflow:'hidden',border:'2px solid #e5e7eb',marginBottom:14,position:'relative' }}>
            <div ref={mapRef} style={{ width:'100%',height:'100%' }} />
            {!mapLoaded && <div style={{ position:'absolute',inset:0,background:'#f0f4f8',display:'flex',alignItems:'center',justifyContent:'center',color:'#9ca3af',fontSize:13 }}>Loading map…</div>}
            <div style={{ position:'absolute',top:8,left:8,background:'rgba(255,255,255,.9)',borderRadius:8,padding:'4px 10px',fontSize:11.5,color:'#374151',fontWeight:700,pointerEvents:'none' }}>
              🔴 Click map or drag pin to set location
            </div>
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:8,marginBottom:16 }}>
            {[['Latitude', lat, setLat], ['Longitude', lng, setLng]].map(([label, value, setter]: any) => (
              <div key={label as string}>
                <label style={{ fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:4 }}>{label as string}</label>
                <input value={value as string} onChange={e => (setter as Function)(e.target.value)}
                  style={{ width:'100%',height:38,border:'1.5px solid #e5e7eb',borderRadius:9,padding:'0 10px',fontSize:13,outline:'none',boxSizing:'border-box' as 'border-box' }} />
              </div>
            ))}
            <div style={{ display:'flex',alignItems:'flex-end' }}>
              <button onClick={handleManualUpdate} style={{ height:38,padding:'0 12px',background:'#f1f5f9',border:'1.5px solid #e5e7eb',borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',color:'#374151' }}>
                Go
              </button>
            </div>
          </div>

          <div style={{ background:'#f0f9ff',border:'1.5px solid #bae6fd',borderRadius:10,padding:'9px 14px',marginBottom:16,fontSize:12,color:'#0369a1' }}>
            📍 Containment: <strong>10km radius</strong> around the pinned location.
          </div>

          <div style={{ display:'flex',gap:10 }}>
            <button onClick={onClose} style={{ flex:1,height:44,border:'1.5px solid #e5e7eb',borderRadius:10,background:'#fff',color:'#374151',fontSize:14,fontWeight:700,cursor:'pointer' }}>Cancel</button>
            <button onClick={handleConfirm} disabled={saving} style={{ flex:2,height:44,border:'none',borderRadius:10,background:saving?'#d1d5db':'linear-gradient(135deg,#dc2626,#b91c1c)',color:'#fff',fontSize:14,fontWeight:800,cursor:saving?'not-allowed':'pointer' }}>
              {saving ? 'Creating…' : '🦠 Confirm & Create Outbreak Record'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const HUMAN_STATUS_OPTIONS = [
  { value: 'Confirmed', label: '✅ Confirmed (Positive)', desc: 'Human confirmed exposed/infected' },
  { value: 'Observe',   label: '👁 Under Observation', desc: '14-day post-exposure monitoring' },
  { value: 'Admitted',  label: '🏥 Admitted', desc: 'Admitted to hospital/infirmary' },
  { value: 'Vaccinated',label: '💉 Vaccinated (PEP)', desc: 'Post-exposure prophylaxis given' },
  { value: 'Expired',   label: '✝ Expired', desc: 'Victim has passed away' },
];

const EMPTY_FORM = {
  petId:'', petName:'', incidentDate:'', location:'', bittenPerson:'',
  ownerName:'', confirmedRabies:false, vaccinated:false, remarks:'',
  status:'Open', observationUpdate:'', humanStatus:'',
};

export function BitingIncidents({ userRole }: Props) {
  const canEdit   = ['admin','superadmin','cityHealth'].includes(userRole);
  const canDelete = ['admin','superadmin'].includes(userRole);

  const [list, setList]       = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [tabFilter, setTabFilter] = useState<'All'|'Open'|'Closed'>('All');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState<Incident|null>(null);
  const [form, setForm]         = useState({ ...EMPTY_FORM });
  const [saving, setSaving]     = useState(false);
  const [petLookupLoading, setPetLookupLoading] = useState(false);
  const [petFound, setPetFound] = useState(false);

  // Rabies outbreak coord modal — carries incident info (may be partial for new)
  const [rabiesCoordModal, setRabiesCoordModal] = useState<{pet_name:string;location:string;id?:string}|null>(null);
  // Pending saved incident to create outbreak for (new incidents)
  const [pendingOutbreakIncident, setPendingOutbreakIncident] = useState<Incident|null>(null);

  const petIdDebounce = useRef<any>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/biting-incidents');
      const d = await r.json();
      setList(d.incidents || []);
    } catch { toast.error('Failed to load biting incidents'); }
    finally { setLoading(false); }
  };

  const createRabiesOutbreak = async (incident: {pet_name:string;location:string;id?:string}, lat: number, lng: number) => {
    const token = sessionStorage.getItem('nasaalaga_token') || '';
    const payload = {
      type: 'rabies',
      disease: 'Rabies',
      barangay: incident.location?.split(',')[0]?.trim() || 'Unknown',
      source_id: incident.id || null,
      cases: 1,
      lat, lng,
      radius_km: 10,
      status: 'Active',
      severity: 'High',
      pet_name: incident.pet_name,
    };
    const r = await fetch('/api/outbreaks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      toast.success('Outbreak record created! Map updated in Outbreak Monitoring.');
      return;
    }
    toast.success('Rabies outbreak record created! View in Outbreak Monitoring.');
  };

  // ── Pet ID Auto-fill ──────────────────────────────────────────────────────
  const handlePetIdChange = (val: string) => {
    setForm(p => ({ ...p, petId: val }));
    setPetFound(false);
    clearTimeout(petIdDebounce.current);
    if (!val.trim()) return;
    petIdDebounce.current = setTimeout(async () => {
      setPetLookupLoading(true);
      try {
        const r = await fetch(`/api/pets/lookup/${encodeURIComponent(val.trim())}`);
        if (r.ok) {
          const d = await r.json();
          const pet = d.pet;
          if (pet) {
            setForm(p => ({
              ...p,
              petName: pet.pet_name || p.petName,
              ownerName: pet.owner_name || p.ownerName,
            }));
            setPetFound(true);
            toast.success(`Pet found: ${pet.pet_name} — owner auto-filled`);
          }
        }
      } catch {}
      finally { setPetLookupLoading(false); }
    }, 600);
  };

  const filtered = list.filter(i => {
    const matchTab = tabFilter === 'All' || i.status === tabFilter;
    const matchSearch = !search || [i.pet_name, i.bitten_person, i.location, i.owner_name||'']
      .some(f => f.toLowerCase().includes(search.toLowerCase()));
    return matchTab && matchSearch;
  });

  const observing = list.filter(i => {
    if (!i.observation_end) return false;
    const dl = daysLeft(i.observation_end);
    return dl !== null && dl >= 0 && i.status === 'Open';
  });
  const overdueObs = list.filter(i => {
    if (!i.observation_end) return false;
    const dl = daysLeft(i.observation_end);
    return dl !== null && dl < 0 && i.status === 'Open' && !i.observation_update;
  });

  const handleRabiesCheck = (checked: boolean) => {
    setForm(p => ({ ...p, confirmedRabies: checked }));
  };

  const openEdit = (inc: Incident) => {
    setEditing(inc);
    setPetFound(false);
    setForm({
      petId: inc.pet_id || '',
      petName: inc.pet_name,
      incidentDate: inc.incident_date?.split('T')[0] || '',
      location: inc.location,
      bittenPerson: inc.bitten_person,
      ownerName: inc.owner_name || '',
      confirmedRabies: inc.confirmed_rabies,
      vaccinated: inc.vaccinated,
      remarks: inc.remarks || '',
      status: inc.status,
      observationUpdate: inc.observation_update || '',
      humanStatus: inc.human_status || '',
    });
    setShowModal(true);
  };

  const openNew = () => {
    setEditing(null);
    setPetFound(false);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.petName.trim()) { toast.error('Pet name is required'); return; }
    if (!form.incidentDate)   { toast.error('Incident date is required'); return; }
    if (!form.location.trim()){ toast.error('Location is required'); return; }
    if (!form.bittenPerson.trim()){ toast.error('Bitten person is required'); return; }

    // If new AND confirmed rabies, we need to prompt for coords AFTER saving
    const isNewRabies = !editing && form.confirmedRabies;

    setSaving(true);
    try {
      const url = editing ? `/api/biting-incidents/${editing.id}` : '/api/biting-incidents';
      const method = editing ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method,
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Save failed');
      toast.success(editing ? 'Incident updated!' : 'Incident reported!');
      setShowModal(false);
      load();

      // For NEW confirmed rabies incident — prompt for outbreak coords
      if (isNewRabies && d.incident) {
        setPendingOutbreakIncident(d.incident);
        setRabiesCoordModal({ pet_name: d.incident.pet_name, location: d.incident.location, id: d.incident.id });
      }
      // For EDIT where rabies was just CONFIRMED (was false, now true)
      if (editing && !editing.confirmed_rabies && form.confirmedRabies) {
        setRabiesCoordModal({ pet_name: form.petName, location: form.location, id: editing.id });
      }
    } catch(e:any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this incident record?')) return;
    try {
      await fetch(`/api/biting-incidents/${id}`, { method:'DELETE' });
      toast.success('Deleted');
      load();
    } catch { toast.error('Delete failed'); }
  };

  const open = list.filter(i => i.status==='Open').length;
  const rabies = list.filter(i => i.confirmed_rabies).length;
  const thisYear = list.filter(i => new Date(i.incident_date).getFullYear() === new Date().getFullYear()).length;

  return (
    <>
      <style>{S}</style>
      <div className="bi-wrap">

        {/* header */}
        <div className="bi-header">
          <div>
            <h1 className="bi-title">Biting Incident Reports</h1>
            <p className="bi-sub">Track animal biting cases, 14-day observation windows, and rabies status</p>
          </div>
          {canEdit && (
            <button className="bi-btn-primary" onClick={openNew}>＋ Report Incident</button>
          )}
        </div>

        {/* observation alerts */}
        {overdueObs.length > 0 && (
          <div className="bi-alert-banner" style={{background:'#fef2f2',borderColor:'#fca5a5'}}>
            <div className="bi-alert-dot" />
            <div>
              <p style={{margin:'0 0 4px',fontWeight:800,color:'#991b1b',fontSize:14}}>
                {overdueObs.length} Observation Period Ended — Update Required!
              </p>
              <p style={{margin:0,color:'#991b1b',fontSize:13}}>
                <strong>{overdueObs.map(i => i.pet_name).join(', ')}</strong> — observation ended, no update recorded.
              </p>
            </div>
          </div>
        )}
        {observing.length > 0 && (
          <div className="bi-alert-banner">
            <div className="bi-alert-dot" style={{background:'#f59e0b'}} />
            <div>
              <p style={{margin:'0 0 4px',fontWeight:800,color:'#92400e',fontSize:14}}>
                {observing.length} Pet(s) Under 14-Day Observation
              </p>
              {observing.map(i => (
                <p key={i.id} style={{margin:'2px 0',color:'#92400e',fontSize:13}}>
                  • <strong>{i.pet_name}</strong> — ends {fmt(i.observation_end)}&nbsp;
                  ({daysLeft(i.observation_end)} day{daysLeft(i.observation_end)===1?'':'s'} left)
                </p>
              ))}
            </div>
          </div>
        )}

        {/* stats */}
        <div className="bi-stats">
          <div className="bi-stat"><div className="bi-stat-val" style={{color:'#dc2626'}}>{list.length}</div><div className="bi-stat-lbl">Total Incidents</div></div>
          <div className="bi-stat"><div className="bi-stat-val" style={{color:'#f59e0b'}}>{open}</div><div className="bi-stat-lbl">Open Cases</div></div>
          <div className="bi-stat"><div className="bi-stat-val" style={{color:'#7c3aed'}}>{rabies}</div><div className="bi-stat-lbl">Confirmed Rabies</div></div>
          <div className="bi-stat"><div className="bi-stat-val" style={{color:'#2B5EA6'}}>{thisYear}</div><div className="bi-stat-lbl">This Year</div></div>
        </div>

        {/* toolbar */}
        <div className="bi-toolbar">
          <input className="bi-search" placeholder="Search pet, person, location…" value={search} onChange={e=>setSearch(e.target.value)} />
          {(['All','Open','Closed'] as const).map(t => (
            <button key={t} className={`bi-tab ${tabFilter===t?'active':''}`} onClick={()=>setTabFilter(t)}>{t}</button>
          ))}
        </div>

        {/* table */}
        <div className="bi-table-wrap">
          {loading ? (
            <div className="bi-empty"><div className="bi-spinner"/><p>Loading incidents…</p></div>
          ) : filtered.length === 0 ? (
            <div className="bi-empty"><p>No biting incidents found.</p></div>
          ) : (
            <table className="bi-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Pet</th>
                  <th>Person Bitten</th>
                  <th>Location</th>
                  <th>Rabies</th>
                  <th>Human Status</th>
                  <th>Observation</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inc => {
                  const dl = daysLeft(inc.observation_end);
                  const isOverdue = dl !== null && dl < 0 && inc.status==='Open' && !inc.observation_update;
                  return (
                    <tr key={inc.id} style={isOverdue ? {background:'#fff5f5'} : {}}>
                      <td style={{whiteSpace:'nowrap'}}>{fmt(inc.incident_date)}</td>
                      <td>
                        <div style={{fontWeight:700}}>{inc.pet_name}</div>
                        {inc.owner_name && <div style={{fontSize:11,color:'#9ca3af'}}>{inc.owner_name}</div>}
                        {inc.pet_id && <div style={{fontSize:10,color:'#2B5EA6',fontFamily:'monospace'}}>{inc.pet_id}</div>}
                      </td>
                      <td>{inc.bitten_person}</td>
                      <td style={{maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{inc.location}</td>
                      <td><span className={`bi-badge ${inc.confirmed_rabies?'yes':'no'}`}>{inc.confirmed_rabies?'⚠️ Yes':'No'}</span></td>
                      <td>
                        {inc.human_status ? (
                          <span className="bi-badge human">
                            {inc.human_status === 'Confirmed' ? '✅' : inc.human_status === 'Observe' ? '👁' : inc.human_status === 'Admitted' ? '🏥' : inc.human_status === 'Vaccinated' ? '💉' : '✝'} {inc.human_status}
                          </span>
                        ) : <span style={{color:'#d1d5db',fontSize:12}}>—</span>}
                      </td>
                      <td>
                        {inc.observation_end ? (
                          <span className={`bi-badge ${isOverdue?'yes':dl!==null&&dl>=0?'obs':'no'}`}>
                            {isOverdue ? 'Overdue' : dl!==null&&dl>=0 ? `${dl}d left` : 'Done'}
                          </span>
                        ) : '—'}
                      </td>
                      <td><span className={`bi-badge ${inc.status==='Open'?'open':'closed'}`}>{inc.status}</span></td>
                      <td>
                        <div style={{display:'flex',gap:5}}>
                          {canEdit && <button className="bi-act bi-act-edit" onClick={()=>openEdit(inc)}>Edit</button>}
                          {canDelete && <button className="bi-act bi-act-del" onClick={()=>handleDelete(inc.id)}>Del</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── MODAL ─── */}
      {showModal && (
        <div className="bi-overlay" onClick={()=>!saving&&setShowModal(false)}>
          <div className="bi-modal" onClick={e=>e.stopPropagation()}>
            <div className="bi-modal-hd">
              <h3 className="bi-modal-title">{editing ? 'Edit Incident Report' : 'Report Biting Incident'}</h3>
              <button className="bi-modal-close" onClick={()=>!saving&&setShowModal(false)}>×</button>
            </div>
            <div className="bi-modal-bd">

              {editing && editing.observation_end && daysLeft(editing.observation_end) !== null && daysLeft(editing.observation_end)! < 0 && !editing.observation_update && (
                <div className="bi-obs-box">
                  <strong>14-Day Observation Period Ended</strong> — Please provide an observation update below.
                </div>
              )}

              <p className="bi-section">Incident Details</p>
              <div className="bi-grid">
                <div className="bi-field">
                  <label className="bi-label">Pet ID (if registered)</label>
                  <div className="bi-pet-id-wrap">
                    <input
                      className={`bi-input bi-pet-id-input ${petFound ? 'autofilled' : ''}`}
                      value={form.petId}
                      onChange={e => handlePetIdChange(e.target.value)}
                      placeholder="BLU-000-00001"
                    />
                    {petLookupLoading && <div className="bi-pet-id-spinner" />}
                  </div>
                  {petFound && <span className="bi-pet-found-badge">✓ Pet found — fields auto-filled</span>}
                </div>
                <div className="bi-field">
                  <label className="bi-label">Pet Name *</label>
                  <input className="bi-input" value={form.petName} onChange={e=>setForm(p=>({...p,petName:e.target.value}))} placeholder="e.g. Bantay" />
                </div>
                <div className="bi-field">
                  <label className="bi-label">Pet Owner</label>
                  <input className={`bi-input ${petFound ? 'autofilled' : ''}`} value={form.ownerName} onChange={e=>setForm(p=>({...p,ownerName:e.target.value}))} placeholder="Owner name" />
                </div>
                <div className="bi-field">
                  <label className="bi-label">Date of Incident *</label>
                  <input className="bi-input" type="date" value={form.incidentDate} onChange={e=>setForm(p=>({...p,incidentDate:e.target.value}))} />
                </div>
                <div className="bi-field" style={{gridColumn:'1/-1'}}>
                  <label className="bi-label">Location of Biting *</label>
                  <input className="bi-input" value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))} placeholder="Barangay / Street / Area" />
                </div>
                <div className="bi-field" style={{gridColumn:'1/-1'}}>
                  <label className="bi-label">Person Bitten *</label>
                  <input className="bi-input" value={form.bittenPerson} onChange={e=>setForm(p=>({...p,bittenPerson:e.target.value}))} placeholder="Full name of victim" />
                </div>
              </div>

              <p className="bi-section" style={{marginTop:8}}>Animal Medical Status</p>
              <div className="bi-checkbox-row">
                <label>
                  <input type="checkbox" checked={form.confirmedRabies} onChange={e => handleRabiesCheck(e.target.checked)} />
                  Confirmed Rabies
                  {form.confirmedRabies && <span style={{ marginLeft:8, fontSize:11, background:'#fee2e2', color:'#991b1b', padding:'2px 7px', borderRadius:6, fontWeight:700 }}>⚠️ Outbreak will be tracked</span>}
                </label>
                <label style={{marginLeft:20}}>
                  <input type="checkbox" checked={form.vaccinated} onChange={e=>setForm(p=>({...p,vaccinated:e.target.checked}))} />
                  Pet was Vaccinated
                </label>
              </div>

              <div className="bi-field" style={{marginBottom:12}}>
                <label className="bi-label">Remarks & Report</label>
                <textarea className="bi-textarea" rows={3} value={form.remarks} onChange={e=>setForm(p=>({...p,remarks:e.target.value}))} placeholder="Full report details, actions taken, referrals…" />
              </div>

              {/* ── City Health Section — Human Status ── */}
              {editing && (
                <>
                  <p className="bi-section purple" style={{marginTop:8}}>🏥 City Health — Human Patient Status</p>
                  <div style={{background:'#faf5ff',border:'1.5px solid #ede9fe',borderRadius:10,padding:'14px 16px',marginBottom:14}}>
                    <p style={{fontSize:12,color:'#6b7280',marginBottom:10,margin:'0 0 10px'}}>
                      To be filled by City Health. Select the current status of the human patient:
                    </p>
                    <div className="bi-human-status-grid">
                      {HUMAN_STATUS_OPTIONS.map(opt => (
                        <label
                          key={opt.value}
                          className={`bi-hs-option ${form.humanStatus === opt.value ? 'selected' : ''}`}
                          onClick={() => setForm(p => ({ ...p, humanStatus: p.humanStatus === opt.value ? '' : opt.value }))}
                        >
                          <input
                            type="radio"
                            name="humanStatus"
                            checked={form.humanStatus === opt.value}
                            onChange={() => setForm(p => ({ ...p, humanStatus: opt.value }))}
                          />
                          <div>
                            <div style={{fontWeight:700,fontSize:12.5}}>{opt.label}</div>
                            <div style={{fontSize:11,color:'#9ca3af',fontWeight:400}}>{opt.desc}</div>
                          </div>
                        </label>
                      ))}
                      {form.humanStatus && (
                        <button
                          onClick={() => setForm(p => ({ ...p, humanStatus: '' }))}
                          style={{gridColumn:'1/-1',height:32,border:'1.5px dashed #e5e7eb',borderRadius:8,background:'transparent',color:'#9ca3af',fontSize:12,cursor:'pointer',fontWeight:600}}
                        >
                          Clear Status
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="bi-section" style={{marginTop:8}}>Observation Update</p>
                  <div className="bi-grid">
                    <div className="bi-field">
                      <label className="bi-label">Case Status</label>
                      <select className="bi-select" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                        <option>Open</option>
                        <option>Closed</option>
                      </select>
                    </div>
                    <div style={{gridColumn:'1/-1'}} className="bi-field">
                      <label className="bi-label">14-Day Observation Notes</label>
                      <textarea className="bi-textarea" rows={3} value={form.observationUpdate} onChange={e=>setForm(p=>({...p,observationUpdate:e.target.value}))} placeholder="State of the animal after 14-day observation period…" />
                    </div>
                  </div>
                </>
              )}

              {!editing && form.incidentDate && (
                <div style={{background:'#fff8ed',border:'1.5px solid #fbbf24',borderRadius:10,padding:'10px 14px',fontSize:12.5,color:'#92400e',marginBottom:12}}>
                  <strong>14-Day Observation</strong> set from&nbsp;
                  <strong>{new Date(form.incidentDate).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}</strong> to&nbsp;
                  <strong>{new Date(new Date(form.incidentDate).getTime()+14*86400000).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}</strong>.
                  {form.confirmedRabies && <><br/><strong>⚠️ Confirmed Rabies:</strong> You will be prompted to pin the location for outbreak tracking after saving.</>}
                </div>
              )}

              <div className="bi-modal-actions">
                <button className="bi-modal-cancel" onClick={()=>setShowModal(false)}>Cancel</button>
                <button className="bi-modal-save" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Update Report' : 'Submit Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── RABIES OUTBREAK COORDINATE MODAL ─── */}
      {rabiesCoordModal && (
        <RabiesCoordModal
          incident={rabiesCoordModal}
          onClose={() => { setRabiesCoordModal(null); setPendingOutbreakIncident(null); }}
          onConfirm={async (lat, lng) => {
            await createRabiesOutbreak(rabiesCoordModal, lat, lng);
            setRabiesCoordModal(null);
            setPendingOutbreakIncident(null);
          }}
        />
      )}
    </>
  );
}

export default BitingIncidents;
