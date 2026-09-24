import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Beef, CheckCircle, XCircle, MapPin, Calendar, Clock, ShieldCheck, RefreshCw, User } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────
// Livestock Death Validation — LIVESTOCK ONLY.
// Pet death reports are validated in PetDeathValidation; the two modules use
// different tables and endpoints and never share a queue.
// Reporting a livestock death is still done from Livestock → Mortality.
// ─────────────────────────────────────────────────────────────────────────

type ValidationStatus = 'Pending' | 'Verified' | 'Rejected';

interface LivestockDeathReport {
  id: number;
  livestockId?: string;
  animalType: string;
  breed?: string;
  ownerName?: string;
  barangay?: string;
  quantity: number;
  cause?: string;
  dateReported?: string;
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

function mapReport(r: any): LivestockDeathReport {
  return {
    id: r.id,
    livestockId: r.livestock_id ?? '',
    animalType: r.animal_type ?? '',
    breed: r.breed ?? '',
    ownerName: r.owner_name ?? '',
    barangay: r.barangay ?? '',
    quantity: r.quantity ?? 1,
    cause: r.cause ?? '',
    dateReported: r.date_reported ?? '',
    notes: r.notes ?? '',
    photoUrl: r.photo_url ?? '',
    reportedBy: r.reported_by ?? r.created_by ?? '',
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
  r === 'bahw' ? 'BAHW' : r === 'cvoStaff' ? 'CVO Staff' : r === 'livestockManager' ? 'Livestock Owner' : r || '';

export function LivestockDeathValidation({ userRole, barangay }: Props) {
  const isBahw = userRole === 'bahw';
  const [reports, setReports] = useState<LivestockDeathReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ValidationStatus | 'all'>('Pending');
  const [notesById, setNotesById] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getMortality();
      // Backend already returns livestock only; the filter is a second guard.
      const rows = (data.mortality || []).filter((r: any) => (r.record_kind ?? 'Livestock') === 'Livestock');
      setReports(rows.map(mapReport));
    } catch (err: any) {
      console.error('[LivestockDeathValidation] load failed:', err);
      toast.error(err?.message || 'Failed to load livestock death reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [barangay]);

  const handleValidate = async (id: number, decision: 'Verified' | 'Rejected') => {
    setBusyId(id);
    try {
      await api.validateMortality(id, { validationStatus: decision, validationNotes: notesById[id] || undefined });
      toast.success(decision === 'Verified' ? 'Livestock death verified' : 'Livestock death report rejected — record restored to Healthy');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update report');
    } finally {
      setBusyId(null);
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
            Livestock Death Validation
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
            Livestock only — {barangay && isBahw ? `reports in Brgy. ${barangay}` : 'review death / mortality reports filed for livestock'}
            {counts.Pending > 0 && <span style={{ color: '#d97706', fontWeight: 700 }}> · {counts.Pending} pending</span>}
          </p>
        </div>
        <button onClick={load} title="Refresh" style={{ padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: '#fff', cursor: 'pointer' }}>
          <RefreshCw style={{ width: 14, height: 14 }} />
        </button>
      </div>

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
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>Loading livestock death reports…</div>
      ) : visible.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, padding: '48px 20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
          <CheckCircle style={{ width: 32, height: 32, color: '#16a34a', margin: '0 auto 10px' }} />
          <p style={{ color: '#6b7280', margin: 0 }}>No {filter === 'all' ? '' : filter.toLowerCase() + ' '}livestock death reports.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {visible.map(r => (
            <div key={r.id} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,.06)', overflow: 'hidden' }}>
              <div style={{ height: 4, background: '#E85D3B' }} />
              <div style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: '#fdecea', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Beef style={{ width: 22, height: 22, color: '#E85D3B' }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 800, color: '#1f2937', margin: 0, fontSize: 15 }}>
                        {r.animalType}
                        {r.livestockId && <span style={{ color: '#9ca3af', fontWeight: 600, fontSize: 12 }}> ({r.livestockId})</span>}
                      </p>
                      <p style={{ color: '#6b7280', margin: '2px 0 0', fontSize: 12 }}>
                        {r.breed || 'Breed n/a'} · <strong style={{ color: '#dc2626' }}>{r.quantity} dead</strong>
                      </p>
                    </div>
                  </div>
                  {badge(r.status)}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginTop: 14, fontSize: 13, color: '#374151' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><User style={{ width: 14, height: 14, color: '#9ca3af' }} /> Owner: {r.ownerName || '—'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin style={{ width: 14, height: 14, color: '#9ca3af' }} /> Brgy. {r.barangay}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar style={{ width: 14, height: 14, color: '#9ca3af' }} /> Reported {fmtDate(r.dateReported)}</div>
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
                      placeholder="Validation notes (optional) — e.g. inspected on site, matches farm records…"
                      rows={2}
                      style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 13, resize: 'vertical', marginBottom: 10 }}
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
