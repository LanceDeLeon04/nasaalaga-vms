import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { CALACA_BARANGAYS } from '../utils/barangays';
import { Beef, Plus, Search, Eye, CheckCircle, XCircle, Clock, RefreshCw, X, ChevronDown } from 'lucide-react';

interface LPR {
  id: string;
  owner_name: string;
  contact_number: string;
  owner_email: string;
  barangay: string;
  address: string;
  animal_type: string;
  breed: string;
  quantity: number;
  farm_type: string;
  farm_address: string;
  health_status: string;
  vaccination_status: string;
  notes: string;
  status: 'Pending' | 'Approved' | 'Denied';
  submitted_date: string;
  approved_date?: string;
  denied_date?: string;
  denial_reason?: string;
  livestock_id?: string;
}

const ANIMAL_TYPES = ['Cattle', 'Carabao', 'Swine', 'Goat', 'Sheep', 'Poultry (Chicken)', 'Poultry (Duck)', 'Horse', 'Rabbit', 'Other'];
const FARM_TYPES = ['Backyard', 'Commercial', 'Semi-Commercial', 'Cooperative'];

interface LivestockPreRegistrationProps {
  ownerId?: string;
  ownerEmail?: string;
  userRole?: string;
  barangay?: string;
}

export function LivestockPreRegistration({ ownerId, ownerEmail, userRole, barangay }: LivestockPreRegistrationProps) {
  const [list, setList] = useState<LPR[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'Pending' | 'Approved' | 'Denied'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<LPR | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [denyMode, setDenyMode] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const isBAHW = userRole === 'bahw';
  const isAdmin = ['admin', 'superadmin'].includes(userRole || '');
  const canApprove = isBAHW || isAdmin;
  const canSubmit = ['livestockManager', 'owner', 'both'].includes(userRole || '') || !userRole;

  const [form, setForm] = useState({
    owner_name: '', contact_number: '', owner_email: ownerEmail || '',
    barangay: barangay || '', address: '', animal_type: '',
    breed: '', quantity: '1', farm_type: 'Backyard', farm_address: '',
    health_status: 'Healthy', vaccination_status: 'Unknown', notes: '',
  });
  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getLivestockPreRegistrations(barangay ? { barangay } : {});
      setList(res.preRegistrations || []);
    } catch { toast.error('Failed to load livestock pre-registrations'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = list.filter(l => {
    if (filter !== 'all' && l.status !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (![l.owner_name, l.animal_type, l.barangay, l.id].some(f => f?.toLowerCase().includes(s))) return false;
    }
    return true;
  });

  const handleSubmit = async () => {
    if (!form.owner_name.trim()) { toast.error('Owner name is required'); return; }
    if (!form.barangay) { toast.error('Barangay is required'); return; }
    if (!form.animal_type) { toast.error('Animal type is required'); return; }
    if (!form.quantity || parseInt(form.quantity) < 1) { toast.error('Quantity must be at least 1'); return; }
    setProcessing(true);
    try {
      await api.createLivestockPreRegistration({ ...form, quantity: parseInt(form.quantity), owner_id: ownerId || null });
      toast.success('Livestock pre-registration submitted! Pending BAHW/Admin review.');
      setShowForm(false);
      setForm({ owner_name: '', contact_number: '', owner_email: ownerEmail || '', barangay: barangay || '', address: '', animal_type: '', breed: '', quantity: '1', farm_type: 'Backyard', farm_address: '', health_status: 'Healthy', vaccination_status: 'Unknown', notes: '' });
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setProcessing(false); }
  };

  const handleApprove = async () => {
    if (!selected) return;
    setProcessing(true);
    try {
      await api.updateLivestockPreRegistration(selected.id, { status: 'Approved' });
      toast.success('Livestock pre-registration approved!');
      setShowDetails(false);
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setProcessing(false); }
  };

  const handleDeny = async () => {
    if (!selected || !denyReason.trim()) { toast.error('Please provide a denial reason'); return; }
    setProcessing(true);
    try {
      await api.updateLivestockPreRegistration(selected.id, { status: 'Denied', denial_reason: denyReason });
      toast.success('Pre-registration denied');
      setShowDetails(false);
      setDenyMode(false);
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setProcessing(false); }
  };

  const statusBadge = (s: string) => {
    if (s === 'Approved') return { bg: '#dcfce7', color: '#166534', label: '✅ Approved' };
    if (s === 'Denied')   return { bg: '#fee2e2', color: '#991b1b', label: '❌ Denied' };
    return { bg: '#fef3c7', color: '#92400e', label: '⏳ Pending' };
  };

  const stats = { total: list.length, pending: list.filter(l => l.status === 'Pending').length, approved: list.filter(l => l.status === 'Approved').length, denied: list.filter(l => l.status === 'Denied').length };

  return (
    <div style={{ fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1f2937', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Beef style={{ width: 24, height: 24, color: '#7c3aed' }} />
            Livestock Pre-Registration
          </h2>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>
            {canApprove ? 'Review and process livestock pre-registration applications' : 'Submit your livestock for pre-registration before official enrollment'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canSubmit && (
            <button onClick={() => setShowForm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              <Plus style={{ width: 15, height: 15 }} /> Pre-Register Livestock
            </button>
          )}
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: 13 }}>
            <RefreshCw style={{ width: 14, height: 14 }} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 18 }}>
        {[
          { label: 'Total', value: stats.total, color: '#2B5EA6', bg: '#eff6ff' },
          { label: 'Pending', value: stats.pending, color: '#d97706', bg: '#fef3c7' },
          { label: 'Approved', value: stats.approved, color: '#16a34a', bg: '#dcfce7' },
          { label: 'Denied', value: stats.denied, color: '#dc2626', bg: '#fee2e2' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 24, fontWeight: 900, color: s.color, margin: 0 }}>{s.value}</p>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0, fontWeight: 600 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9ca3af' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search owner, animal, barangay..."
            style={{ width: '100%', height: 38, border: '1.5px solid #e5e7eb', borderRadius: 9, paddingLeft: 34, paddingRight: 12, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'Pending', 'Approved', 'Denied'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .18s',
                borderColor: filter === f ? '#7c3aed' : '#e5e7eb',
                background: filter === f ? '#7c3aed' : '#f9fafb',
                color: filter === f ? '#fff' : '#6b7280' }}>
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            <Beef style={{ width: 40, height: 40, margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
            No livestock pre-registrations found
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #f3f4f6' }}>
                {['ID', 'Owner', 'Animal', 'Qty', 'Barangay', 'Submitted', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => {
                const badge = statusBadge(l.status);
                return (
                  <tr key={l.id} style={{ borderBottom: '1px solid #f9fafb' }} onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>{l.id}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <p style={{ fontWeight: 700, color: '#1f2937', margin: 0 }}>{l.owner_name}</p>
                      <p style={{ color: '#9ca3af', fontSize: 11, margin: 0 }}>{l.contact_number || l.owner_email || '—'}</p>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <p style={{ fontWeight: 600, color: '#374151', margin: 0 }}>{l.animal_type}</p>
                      {l.breed && <p style={{ color: '#9ca3af', fontSize: 11, margin: 0 }}>{l.breed}</p>}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#1f2937' }}>{l.quantity}</td>
                    <td style={{ padding: '12px 14px', color: '#6b7280' }}>{l.barangay}</td>
                    <td style={{ padding: '12px 14px', color: '#9ca3af', fontSize: 11 }}>{new Date(l.submitted_date).toLocaleDateString('en-PH')}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: badge.bg, color: badge.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{badge.label}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button onClick={() => { setSelected(l); setDenyMode(false); setDenyReason(''); setShowDetails(true); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: '1.5px solid #e5e7eb', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: 12, color: '#374151' }}>
                        <Eye style={{ width: 13, height: 13 }} /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {showDetails && selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,.25)' }}>
            <div style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', padding: '18px 22px', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#fff' }}>
                <p style={{ fontWeight: 800, fontSize: 15, margin: 0 }}>Livestock Pre-Registration Details</p>
                <p style={{ fontSize: 12, opacity: .75, margin: '2px 0 0' }}>{selected.id}</p>
              </div>
              <button onClick={() => setShowDetails(false)} style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: '50%', width: 30, height: 30, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X style={{ width: 15, height: 15 }} />
              </button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {[
                ['Owner Name', selected.owner_name],
                ['Contact', selected.contact_number || '—'],
                ['Email', selected.owner_email || '—'],
                ['Barangay', selected.barangay],
                ['Address', selected.address || '—'],
                ['Animal Type', selected.animal_type],
                ['Breed', selected.breed || '—'],
                ['Quantity', `${selected.quantity} head`],
                ['Farm Type', selected.farm_type],
                ['Farm Address', selected.farm_address || '—'],
                ['Health Status', selected.health_status],
                ['Vaccination Status', selected.vaccination_status],
                ['Notes', selected.notes || '—'],
                ['Submitted', new Date(selected.submitted_date).toLocaleString('en-PH')],
              ].map(([k, v]) => (
                <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                  <span style={{ color: '#6b7280', fontWeight: 600 }}>{k}</span>
                  <span style={{ color: '#1f2937', fontWeight: 700, textAlign: 'right', maxWidth: '60%' }}>{v}</span>
                </div>
              ))}

              {selected.status === 'Denied' && selected.denial_reason && (
                <div style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginTop: 12, fontSize: 13 }}>
                  <p style={{ fontWeight: 700, color: '#991b1b', margin: '0 0 4px' }}>Denial Reason:</p>
                  <p style={{ color: '#7f1d1d', margin: 0 }}>{selected.denial_reason}</p>
                </div>
              )}

              {canApprove && selected.status === 'Pending' && (
                <div style={{ marginTop: 16 }}>
                  {!denyMode ? (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={handleApprove} disabled={processing}
                        style={{ flex: 1, padding: '10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <CheckCircle style={{ width: 15, height: 15 }} /> {processing ? 'Processing…' : 'Approve'}
                      </button>
                      <button onClick={() => setDenyMode(true)}
                        style={{ flex: 1, padding: '10px', background: '#fff', color: '#dc2626', border: '1.5px solid #fca5a5', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <XCircle style={{ width: 15, height: 15 }} /> Deny
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Denial Reason *</label>
                      <textarea value={denyReason} onChange={e => setDenyReason(e.target.value)} rows={3} placeholder="Explain why this pre-registration is being denied..."
                        style={{ width: '100%', border: '1.5px solid #fca5a5', borderRadius: 9, padding: '8px 12px', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button onClick={() => setDenyMode(false)} style={{ flex: 1, padding: '9px', border: '1.5px solid #e5e7eb', borderRadius: 9, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                        <button onClick={handleDeny} disabled={processing}
                          style={{ flex: 1, padding: '9px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                          {processing ? 'Processing…' : 'Confirm Deny'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submit Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,.25)' }}>
            <div style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', padding: '18px 22px', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#fff' }}>
                <p style={{ fontWeight: 800, fontSize: 15, margin: 0 }}>Pre-Register Livestock</p>
                <p style={{ fontSize: 12, opacity: .75, margin: '2px 0 0' }}>Submit livestock for pre-registration approval</p>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: '50%', width: 30, height: 30, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X style={{ width: 15, height: 15 }} />
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { label: 'Owner Name *', key: 'owner_name', type: 'text', col: 2, placeholder: 'Full name' },
                { label: 'Contact Number', key: 'contact_number', type: 'tel', col: 1, placeholder: '09XX XXX XXXX' },
                { label: 'Email', key: 'owner_email', type: 'email', col: 1, placeholder: 'email@example.com' },
                { label: 'Address', key: 'address', type: 'text', col: 2, placeholder: 'Complete address' },
                { label: 'Farm Address', key: 'farm_address', type: 'text', col: 2, placeholder: 'Farm/sitio location' },
                { label: 'Notes', key: 'notes', type: 'text', col: 2, placeholder: 'Additional information...' },
              ].map(f => (
                <div key={f.key} style={{ gridColumn: `span ${f.col}` }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>{f.label}</label>
                  <input type={f.type} value={(form as any)[f.key]} onChange={e => setF(f.key, e.target.value)} placeholder={f.placeholder}
                    style={{ width: '100%', height: 40, border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              {[
                { label: 'Barangay *', key: 'barangay', options: ['', ...CALACA_BARANGAYS] },
                { label: 'Animal Type *', key: 'animal_type', options: ['', ...ANIMAL_TYPES] },
                { label: 'Farm Type', key: 'farm_type', options: FARM_TYPES },
                { label: 'Health Status', key: 'health_status', options: ['Healthy', 'Sick', 'Under Observation', 'Quarantine'] },
                { label: 'Vaccination Status', key: 'vaccination_status', options: ['Unknown', 'Up to Date', 'Due Soon', 'Overdue', 'Not Vaccinated'] },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>{f.label}</label>
                  <select value={(form as any)[f.key]} onChange={e => setF(f.key, e.target.value)}
                    style={{ width: '100%', height: 40, border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '0 10px', fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                    {f.options.map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Breed</label>
                <input value={form.breed} onChange={e => setF('breed', e.target.value)} placeholder="e.g. Landrace, Brahman"
                  style={{ width: '100%', height: 40, border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Quantity (head) *</label>
                <input type="number" min={1} value={form.quantity} onChange={e => setF('quantity', e.target.value)}
                  style={{ width: '100%', height: 40, border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, height: 44, border: '1.5px solid #e5e7eb', borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#374151', fontWeight: 700 }}>Cancel</button>
              <button onClick={handleSubmit} disabled={processing}
                style={{ flex: 2, height: 44, background: processing ? '#d1d5db' : 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: processing ? 'not-allowed' : 'pointer' }}>
                {processing ? 'Submitting…' : 'Submit Pre-Registration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
