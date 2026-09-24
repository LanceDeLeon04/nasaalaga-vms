import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { PawPrint, CheckCircle, XCircle, MapPin, Calendar, Clock, ShieldCheck, Plus, Trash2, RefreshCw, User } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────
// Pet Death Validation — PETS ONLY.
// Livestock death reports are validated in LivestockDeathValidation; the two
// modules use different tables and endpoints and never share a queue.
// ─────────────────────────────────────────────────────────────────────────

type ValidationStatus = 'Pending' | 'Verified' | 'Rejected';

interface PetDeathReport {
  id: number;
  petId?: string;
  petName?: string;
  species: string;
  breed?: string;
  ownerName?: string;
  barangay?: string;
  cause?: string;
  dateOfDeath?: string;
  notes?: string;
  photoUrl?: string;
  reportedBy?: string;
  reportedByRole?: string;
  status: ValidationStatus;
  validatedBy?: string;
  validatedAt?: string;
  validationNotes?: string;
}

interface Props {
  userRole?: string;
  barangay?: string;
}

function mapReport(r: any): PetDeathReport {
  return {
    id: r.id,
    petId: r.pet_id ?? '',
    petName: r.pet_name ?? '',
    species: r.species ?? '',
    breed: r.breed ?? '',
    ownerName: r.owner_name ?? '',
    barangay: r.barangay ?? '',
    cause: r.cause ?? '',
    dateOfDeath: r.date_of_death ?? '',
    notes: r.notes ?? '',
    photoUrl: r.photo_url ?? '',
    reportedBy: r.reported_by ?? '',
    reportedByRole: r.reported_by_role ?? '',
    status: (r.validation_status ?? 'Pending') as ValidationStatus,
    validatedBy: r.validated_by ?? '',
    validatedAt: r.validated_at ?? '',
    validationNotes: r.validation_notes ?? '',
  };
}

const fmtDate = (d?: string) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
};

const roleLabel = (r?: string) =>
  r === 'bahw' ? 'BAHW' : r === 'cvoStaff' ? 'CVO Staff' : r === 'petOwner' ? 'Pet Owner' : r || '';

const emptyForm = () => ({
  petId: '', species: '', petName: '', breed: '', ownerName: '', barangay: '',
  cause: '', dateOfDeath: new Date().toISOString().split('T')[0], notes: '', photoUrl: '',
});

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 13, background: '#fff',
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: '#4b5563', marginBottom: 4 };

export function PetDeathValidation({ userRole, barangay }: Props) {
  const isBahw = userRole === 'bahw';
  const [reports, setReports] = useState<PetDeathReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ValidationStatus | 'all'>('Pending');
  const [notesById, setNotesById] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  // Staff "report a pet death" form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [pets, setPets] = useState<any[]>([]);
  const [petSearch, setPetSearch] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getPetDeaths();
      setReports((data.reports || []).map(mapReport));
    } catch (err: any) {
      console.error('[PetDeathValidation] load failed:', err);
      toast.error(err?.message || 'Failed to load pet death reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [barangay]);

  // Load registered pets only when the report form is opened
  useEffect(() => {
    if (!showForm || pets.length > 0) return;
    api.getPets()
      .then((d: any) => setPets((d.pets || []).filter((p: any) => p.status !== 'Deceased')))
      .catch(() => setPets([]));
  }, [showForm]);

  const matchingPets = useMemo(() => {
    const q = petSearch.trim().toLowerCase();
    if (!q) return [];
    return pets
      .filter((p: any) =>
        `${p.pet_name} ${p.owner_name} ${p.id} ${p.species}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [pets, petSearch]);

  const pickPet = (p: any) => {
    setForm(f => ({
      ...f, petId: p.id, petName: p.pet_name || '', species: p.species || '', breed: p.breed || '',
      ownerName: p.owner_name || '', barangay: p.barangay || f.barangay,
    }));
    setPetSearch('');
  };

  const onPhoto = (e: { target: HTMLInputElement }) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => setForm(p => ({ ...p, photoUrl: ev.target?.result as string }));
    r.readAsDataURL(f);
  };

  const canSubmit = !!form.species && !!form.ownerName && !!form.cause && !!form.photoUrl && !saving &&
    (isBahw || !!form.barangay);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await api.addPetDeath({
        petId: form.petId || undefined,
        petName: form.petName || undefined,
        species: form.species,
        breed: form.breed || undefined,
        ownerName: form.ownerName,
        barangay: isBahw ? undefined : form.barangay,
        cause: form.cause,
        dateOfDeath: form.dateOfDeath,
        notes: form.notes || undefined,
        photoUrl: form.photoUrl,
      });
      toast.success('Pet death report filed');
      setShowForm(false);
      setForm(emptyForm());
      setPets([]);
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to file report');
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async (id: number, decision: 'Verified' | 'Rejected') => {
    setBusyId(id);
    try {
      await api.validatePetDeath(id, { validationStatus: decision, validationNotes: notesById[id] || undefined });
      toast.success(decision === 'Verified' ? 'Pet death verified' : 'Pet death report rejected — pet restored to Active');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update report');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this pet death report?')) return;
    try {
      await api.deletePetDeath(id);
      toast.success('Report deleted');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete report');
    }
  };

  const counts = {
    Pending: reports.filter(r => r.status === 'Pending').length,
    Verified: reports.filter(r => r.status === 'Verified').length,
    Rejected: reports.filter(r => r.status === 'Rejected').length,
  };
  const visible = reports.filter(r => filter === 'all' || r.status === filter);

  const badge = (status: ValidationStatus) => {
    const map: Record<string, { bg: string; fg: string; label: string }> = {
      Pending: { bg: '#fef3c7', fg: '#92400e', label: 'Pending Validation' },
      Verified: { bg: '#dcfce7', fg: '#166534', label: 'Verified' },
      Rejected: { bg: '#fee2e2', fg: '#991b1b', label: 'Rejected' },
    };
    const c = map[status];
    return <span style={{ background: c.bg, color: c.fg, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{c.label}</span>;
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1f2937', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck style={{ width: 20, height: 20, color: '#2B5EA6' }} />
            Pet Death Validation
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
            Pets only — {barangay && isBahw ? `reports in Brgy. ${barangay}` : 'review death / expired reports filed for registered pets'}
            {counts.Pending > 0 && <span style={{ color: '#d97706', fontWeight: 700 }}> · {counts.Pending} pending</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} title="Refresh" style={{ padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: '#fff', cursor: 'pointer' }}>
            <RefreshCw style={{ width: 14, height: 14 }} />
          </button>
          <button onClick={() => setShowForm(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: 'none', background: '#2B5EA6', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <Plus style={{ width: 15, height: 15 }} /> Report Pet Death
          </button>
        </div>
      </div>

      {showForm && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,.06)', marginBottom: 18, border: '1px solid #e5e7eb' }}>
          <p style={{ fontWeight: 800, margin: '0 0 12px', color: '#1f2937' }}>Report Pet Death / Expired</p>

          <div style={{ marginBottom: 12, position: 'relative' }}>
            <label style={labelStyle}>Find registered pet (optional)</label>
            <input value={petSearch} onChange={e => setPetSearch(e.target.value)} placeholder="Search by pet name, owner, tag ID…" style={inputStyle} />
            {matchingPets.length > 0 && (
              <div style={{ position: 'absolute', zIndex: 10, left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, marginTop: 4, boxShadow: '0 6px 16px rgba(0,0,0,.1)' }}>
                {matchingPets.map((p: any) => (
                  <button key={p.id} type="button" onClick={() => pickPet(p)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13 }}>
                    <strong>{p.pet_name}</strong> · {p.species} · {p.owner_name} <span style={{ color: '#9ca3af' }}>({p.id})</span>
                  </button>
                ))}
              </div>
            )}
            {form.petId && (
              <p style={{ fontSize: 12, color: '#166534', margin: '6px 0 0' }}>
                Linked to registered pet <strong>{form.petName}</strong> ({form.petId}) — its status will be set to Deceased.{' '}
                <button type="button" onClick={() => setForm(f => ({ ...f, petId: '' }))} style={{ border: 'none', background: 'none', color: '#6b7280', textDecoration: 'underline', cursor: 'pointer', fontSize: 12 }}>Unlink</button>
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
            <div><label style={labelStyle}>Species *</label><input value={form.species} onChange={e => setForm(f => ({ ...f, species: e.target.value }))} disabled={!!form.petId} placeholder="e.g. Dog, Cat" style={inputStyle} /></div>
            <div><label style={labelStyle}>Pet Name</label><input value={form.petName} onChange={e => setForm(f => ({ ...f, petName: e.target.value }))} disabled={!!form.petId} style={inputStyle} /></div>
            <div><label style={labelStyle}>Breed</label><input value={form.breed} onChange={e => setForm(f => ({ ...f, breed: e.target.value }))} disabled={!!form.petId} style={inputStyle} /></div>
            <div><label style={labelStyle}>Owner Name *</label><input value={form.ownerName} onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))} disabled={!!form.petId} style={inputStyle} /></div>
            <div>
              <label style={labelStyle}>Barangay {isBahw ? '' : '*'}</label>
              <input value={isBahw ? (barangay || 'Your assigned barangay') : form.barangay} onChange={e => setForm(f => ({ ...f, barangay: e.target.value }))} disabled={isBahw || !!form.petId} style={{ ...inputStyle, background: isBahw ? '#f3f4f6' : '#fff' }} />
            </div>
            <div><label style={labelStyle}>Date of Death</label><input type="date" value={form.dateOfDeath} onChange={e => setForm(f => ({ ...f, dateOfDeath: e.target.value }))} style={inputStyle} /></div>
          </div>
          <div style={{ marginTop: 12 }}><label style={labelStyle}>Cause of Death *</label><input value={form.cause} onChange={e => setForm(f => ({ ...f, cause: e.target.value }))} placeholder="Disease, accident, old age, unknown…" style={inputStyle} /></div>
          <div style={{ marginTop: 12 }}><label style={labelStyle}>Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></div>
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>Photo Document <span style={{ color: '#dc2626' }}>*required</span></label>
            <input ref={fileRef} type="file" accept="image/*" onChange={onPhoto} style={{ display: 'none' }} />
            {form.photoUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src={form.photoUrl} alt="Death record" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, border: '1px solid #e5e7eb' }} />
                <button type="button" onClick={() => fileRef.current?.click()} style={{ border: 'none', background: 'none', color: '#2B5EA6', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Replace</button>
                <button type="button" onClick={() => setForm(f => ({ ...f, photoUrl: '' }))} style={{ border: 'none', background: 'none', color: '#9ca3af', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Remove</button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} style={{ width: '100%', padding: '12px 0', border: '2px dashed #cbd5e1', borderRadius: 10, background: '#f8fafc', color: '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Attach photo document</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={() => { setShowForm(false); setForm(emptyForm()); }} style={{ flex: 1, padding: '9px 0', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            <button onClick={handleSubmit} disabled={!canSubmit} style={{ flex: 1, padding: '9px 0', border: 'none', borderRadius: 10, background: '#2B5EA6', color: '#fff', fontWeight: 700, fontSize: 13, cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: canSubmit ? 1 : 0.5 }}>
              {saving ? 'Saving…' : 'Submit Report'}
            </button>
          </div>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: '8px 0 0' }}>Reports filed by staff are recorded as Verified. Owner-filed reports appear below as Pending.</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {(['Pending', 'Verified', 'Rejected', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            border: filter === f ? 'none' : '1px solid #e5e7eb',
            background: filter === f ? '#2B5EA6' : '#fff', color: filter === f ? '#fff' : '#374151',
          }}>
            {f === 'all' ? `All (${reports.length})` : `${f} (${counts[f]})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>Loading pet death reports…</div>
      ) : visible.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, padding: '48px 20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
          <CheckCircle style={{ width: 32, height: 32, color: '#16a34a', margin: '0 auto 10px' }} />
          <p style={{ color: '#6b7280', margin: 0 }}>No {filter === 'all' ? '' : filter.toLowerCase() + ' '}pet death reports.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {visible.map(r => (
            <div key={r.id} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,.06)', overflow: 'hidden' }}>
              <div style={{ height: 4, background: '#2B5EA6' }} />
              <div style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: '#e8f0fb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <PawPrint style={{ width: 22, height: 22, color: '#2B5EA6' }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 800, color: '#1f2937', margin: 0, fontSize: 15 }}>
                        {r.petName || r.species}
                        {r.petId && <span style={{ color: '#9ca3af', fontWeight: 600, fontSize: 12 }}> ({r.petId})</span>}
                      </p>
                      <p style={{ color: '#6b7280', margin: '2px 0 0', fontSize: 12 }}>{r.species}{r.breed ? ` · ${r.breed}` : ''}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {badge(r.status)}
                    <button onClick={() => handleDelete(r.id)} title="Delete report" style={{ padding: 6, border: 'none', background: 'transparent', color: '#9ca3af', cursor: 'pointer' }}>
                      <Trash2 style={{ width: 15, height: 15 }} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginTop: 14, fontSize: 13, color: '#374151' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><User style={{ width: 14, height: 14, color: '#9ca3af' }} /> Owner: {r.ownerName || '—'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin style={{ width: 14, height: 14, color: '#9ca3af' }} /> Brgy. {r.barangay}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar style={{ width: 14, height: 14, color: '#9ca3af' }} /> Died {fmtDate(r.dateOfDeath)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock style={{ width: 14, height: 14, color: '#9ca3af' }} /> Filed by {r.reportedBy || '—'}{r.reportedByRole ? ` (${roleLabel(r.reportedByRole)})` : ''}</div>
                </div>

                <div style={{ display: 'flex', gap: 14, marginTop: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {r.photoUrl && (
                    <a href={r.photoUrl} target="_blank" rel="noreferrer">
                      <img src={r.photoUrl} alt="Death record" style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 10, border: '1px solid #e5e7eb' }} />
                    </a>
                  )}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <p style={{ margin: 0, fontSize: 13, color: '#374151' }}><strong>Cause:</strong> {r.cause || '—'}</p>
                    {r.notes && <p style={{ marginTop: 8, fontSize: 13, color: '#4b5563', background: '#f9fafb', padding: '8px 12px', borderRadius: 8 }}>{r.notes}</p>}
                  </div>
                </div>

                {r.status === 'Pending' && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f3f4f6' }}>
                    <textarea
                      value={notesById[r.id] || ''}
                      onChange={e => setNotesById(prev => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder="Validation notes (optional) — e.g. confirmed with owner, photo matches registered pet…"
                      rows={2}
                      style={{ ...inputStyle, resize: 'vertical', marginBottom: 10 }}
                    />
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button disabled={busyId === r.id} onClick={() => handleValidate(r.id, 'Verified')}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 13, cursor: busyId === r.id ? 'not-allowed' : 'pointer', opacity: busyId === r.id ? 0.6 : 1 }}>
                        <CheckCircle style={{ width: 15, height: 15 }} /> Verify Death
                      </button>
                      <button disabled={busyId === r.id} onClick={() => handleValidate(r.id, 'Rejected')}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1.5px solid #fecaca', background: '#fff', color: '#dc2626', fontWeight: 700, fontSize: 13, cursor: busyId === r.id ? 'not-allowed' : 'pointer', opacity: busyId === r.id ? 0.6 : 1 }}>
                        <XCircle style={{ width: 15, height: 15 }} /> Reject
                      </button>
                    </div>
                  </div>
                )}

                {r.status !== 'Pending' && (r.validatedBy || r.validationNotes) && (
                  <p style={{ marginTop: 10, fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>
                    {r.status} by {r.validatedBy || '—'}{r.validatedAt ? ` on ${fmtDate(r.validatedAt)}` : ''}{r.validationNotes ? ` — ${r.validationNotes}` : ''}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
