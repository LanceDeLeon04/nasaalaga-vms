import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Beef, CheckCircle, XCircle, MapPin, Phone, Calendar, Clock, ShieldCheck } from 'lucide-react';

interface LostLivestockReport {
  id: string;
  petId?: string;
  petName?: string;
  species?: string;
  breed?: string;
  color?: string;
  type: 'Lost' | 'Found';
  reportedBy?: string;
  reportedByRole?: string;
  contactNumber?: string;
  lastSeenLocation?: string;
  barangay?: string;
  dateReported?: string;
  description?: string;
  status: string;
  validatedBy?: string;
  validatedAt?: string;
  validationNotes?: string;
}

interface LostLivestockValidationProps {
  barangay?: string;
  userName?: string;
}

function mapReport(r: any): LostLivestockReport {
  return {
    id: r.id,
    petId: r.pet_id ?? r.petId ?? '',
    petName: r.pet_name ?? r.petName ?? '',
    species: r.species ?? '',
    breed: r.breed ?? '',
    color: r.color ?? '',
    type: r.type ?? 'Lost',
    reportedBy: r.reported_by ?? r.reportedBy ?? '',
    reportedByRole: r.reported_by_role ?? r.reportedByRole ?? '',
    contactNumber: r.contact_number ?? r.contactNumber ?? '',
    lastSeenLocation: r.last_seen_location ?? r.lastSeenLocation ?? '',
    barangay: r.barangay ?? '',
    dateReported: r.date_reported ?? r.dateReported ?? '',
    description: r.description ?? '',
    status: r.status ?? 'Open',
    validatedBy: r.validated_by ?? r.validatedBy ?? '',
    validatedAt: r.validated_at ?? r.validatedAt ?? '',
    validationNotes: r.validation_notes ?? r.validationNotes ?? '',
  };
}

export function LostLivestockValidation({ barangay }: LostLivestockValidationProps) {
  const [reports, setReports] = useState<LostLivestockReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'Pending' | 'Verified' | 'Resolved' | 'Rejected' | 'all'>('Pending');
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getLostFound('Lost');
      const all: LostLivestockReport[] = (data.reports || []).map(mapReport);
      // Only livestock reports — pet lost/found reports share this same table
      // but are filed with reportedByRole 'petOwner' / 'guest' for pets.
      const livestockOnly = all.filter(r => r.reportedByRole === 'livestockOwner');
      setReports(livestockOnly);
    } catch (err) {
      console.error('[LostLivestockValidation] Failed to load reports:', err);
      toast.error('Failed to load lost livestock reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [barangay]);

  const handleValidate = async (id: string, decision: 'Verified' | 'Rejected') => {
    setBusyId(id);
    try {
      await api.updateLostFound(id, {
        status: decision,
        validationNotes: notesById[id] || undefined,
      });
      toast.success(decision === 'Verified' ? 'Report verified' : 'Report rejected');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update report');
    } finally {
      setBusyId(null);
    }
  };

  const statusFiltered = reports.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'Pending') return r.status === 'Open';
    return r.status === filter;
  });

  const pendingCount = reports.filter(r => r.status === 'Open').length;

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; fg: string }> = {
      Open: { bg: '#fef3c7', fg: '#92400e' },
      Verified: { bg: '#dbeafe', fg: '#1d4ed8' },
      Resolved: { bg: '#dcfce7', fg: '#166534' },
      Rejected: { bg: '#fee2e2', fg: '#991b1b' },
    };
    const c = map[status] || { bg: '#f3f4f6', fg: '#374151' };
    return (
      <span style={{ background: c.bg, color: c.fg, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
        {status === 'Open' ? 'Pending Validation' : status}
      </span>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1f2937', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck style={{ width: 20, height: 20, color: '#2B5EA6' }} />
            Validate Lost Livestock Reports
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
            {barangay ? `Reports filed in Brgy. ${barangay}` : 'Review lost-livestock reports filed by owners'}
            {pendingCount > 0 && <span style={{ color: '#d97706', fontWeight: 700 }}> · {pendingCount} pending</span>}
          </p>
        </div>
        <button onClick={load} style={{ padding: '8px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {(['Pending', 'Verified', 'Resolved', 'Rejected', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              border: filter === f ? 'none' : '1px solid #e5e7eb',
              background: filter === f ? '#2B5EA6' : '#fff',
              color: filter === f ? '#fff' : '#374151',
            }}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>Loading reports…</div>
      ) : statusFiltered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, padding: '48px 20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
          <CheckCircle style={{ width: 32, height: 32, color: '#16a34a', margin: '0 auto 10px' }} />
          <p style={{ color: '#6b7280', margin: 0 }}>No {filter === 'all' ? '' : filter.toLowerCase()} lost livestock reports.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {statusFiltered.map(r => (
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
                        {r.petName || r.species} <span style={{ color: '#9ca3af', fontWeight: 600, fontSize: 12 }}>({r.id})</span>
                      </p>
                      <p style={{ color: '#6b7280', margin: '2px 0 0', fontSize: 12 }}>
                        {r.species}{r.breed ? ` · ${r.breed}` : ''}{r.color ? ` · ${r.color}` : ''}
                      </p>
                    </div>
                  </div>
                  {statusBadge(r.status)}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginTop: 14, fontSize: 13, color: '#374151' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin style={{ width: 14, height: 14, color: '#9ca3af' }} /> Brgy. {r.barangay}{r.lastSeenLocation ? ` — ${r.lastSeenLocation}` : ''}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone style={{ width: 14, height: 14, color: '#9ca3af' }} /> {r.reportedBy}{r.contactNumber ? ` · ${r.contactNumber}` : ''}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar style={{ width: 14, height: 14, color: '#9ca3af' }} /> Reported {r.dateReported}</div>
                  {r.validatedBy && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock style={{ width: 14, height: 14, color: '#9ca3af' }} /> {r.status} by {r.validatedBy}</div>
                  )}
                </div>

                {r.description && (
                  <p style={{ marginTop: 10, fontSize: 13, color: '#4b5563', background: '#f9fafb', padding: '8px 12px', borderRadius: 8 }}>
                    {r.description}
                  </p>
                )}

                {r.status === 'Open' && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f3f4f6' }}>
                    <textarea
                      value={notesById[r.id] || ''}
                      onChange={e => setNotesById(prev => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder="Validation notes (optional) — e.g. confirmed with owner, matches barangay records…"
                      rows={2}
                      style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 13, resize: 'vertical', marginBottom: 10 }}
                    />
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        disabled={busyId === r.id}
                        onClick={() => handleValidate(r.id, 'Verified')}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 13, cursor: busyId === r.id ? 'not-allowed' : 'pointer', opacity: busyId === r.id ? 0.6 : 1 }}
                      >
                        <CheckCircle style={{ width: 15, height: 15 }} /> Validate
                      </button>
                      <button
                        disabled={busyId === r.id}
                        onClick={() => handleValidate(r.id, 'Rejected')}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1.5px solid #fecaca', background: '#fff', color: '#dc2626', fontWeight: 700, fontSize: 13, cursor: busyId === r.id ? 'not-allowed' : 'pointer', opacity: busyId === r.id ? 0.6 : 1 }}
                      >
                        <XCircle style={{ width: 15, height: 15 }} /> Reject
                      </button>
                    </div>
                  </div>
                )}

                {r.validationNotes && r.status !== 'Open' && (
                  <p style={{ marginTop: 10, fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>
                    Note: {r.validationNotes}
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
