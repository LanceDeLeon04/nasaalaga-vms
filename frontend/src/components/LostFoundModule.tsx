import { useCallback, useEffect, useMemo, useState } from 'react';
import { PawPrint, Beef, Search, Plus, MapPin, CalendarDays, Info, RefreshCw, ChevronRight, SearchX } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { CALACA_BARANGAYS } from '../utils/barangays';
import { Chip, CardSkeleton, PageHeading, Segmented, fmtDate } from './OwnerUI';
import type { Tone } from './OwnerUI';
import { LostFoundDetailsModal } from './LostFoundDetailsModal';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import type { User } from '../App';

// ─────────────────────────────────────────────────────────────────────────────
// Lost & Found for owner accounts.
//   • Two tabs — Pets and Livestock — so the two kinds of report never mix.
//     Pet-only / livestock-only accounts see just their own tab.
//   • Pets tab: the city-wide board (lost + found pets), with "My report" marks.
//   • Livestock tab: this owner's own reports only, with BAHW validation status.
// ─────────────────────────────────────────────────────────────────────────────

export type LostFoundTab = 'pets' | 'livestock';

interface Report {
  id: string; petId: string; petName: string; species: string; breed: string; color: string;
  type: 'Lost' | 'Found'; reportedBy: string; reportedByRole: string; ownerId: string;
  contactNumber: string; lastSeenLocation: string; barangay: string; dateReported: string;
  description: string; status: 'Open' | 'Verified' | 'Rejected' | 'Resolved'; photo?: string;
}

const mapReport = (r: any): Report => ({
  id: r.id,
  petId: r.pet_id ?? r.petId ?? '',
  petName: r.pet_name ?? r.petName ?? '',
  species: r.species ?? '',
  breed: r.breed ?? '',
  color: r.color ?? '',
  type: r.type ?? 'Lost',
  reportedBy: r.reported_by ?? r.reportedBy ?? '',
  reportedByRole: r.reported_by_role ?? r.reportedByRole ?? '',
  ownerId: r.owner_id ?? r.ownerId ?? '',
  contactNumber: r.contact_number ?? r.contactNumber ?? '',
  lastSeenLocation: r.last_seen_location ?? r.lastSeenLocation ?? '',
  barangay: r.barangay ?? '',
  dateReported: r.date_reported ?? r.dateReported ?? '',
  description: r.description ?? '',
  status: r.status ?? 'Open',
  photo: r.photo ?? undefined,
});

const LIVESTOCK = { fg: 'var(--o-field)', tint: 'var(--o-field-tint)' };
const PET = { fg: 'var(--o-blue)', tint: 'var(--o-blue-tint)' };

/** Livestock reports are filed with reportedByRole 'livestockOwner' (same rule the BAHW validation screen uses). */
const isLivestockReport = (r: Report, livestockIds: Set<string>) =>
  r.reportedByRole === 'livestockOwner' || livestockIds.has(String(r.petId));

function statusChip(r: Report, livestock: boolean): { tone: Tone; label: string } {
  if (r.status === 'Resolved') return { tone: 'ok', label: r.type === 'Found' ? 'Returned' : 'Resolved' };
  if (r.status === 'Verified') return { tone: 'info', label: 'Verified by BAHW' };
  if (r.status === 'Rejected') return { tone: 'muted', label: 'Not accepted' };
  if (r.type === 'Found') return { tone: 'ok', label: 'Found' };
  return livestock ? { tone: 'soon', label: 'Awaiting validation' } : { tone: 'urgent', label: 'Lost' };
}

// ── One report card ──────────────────────────────────────────────────────────
function ReportCard({ r, livestock, mine, onOpen }: { r: Report; livestock: boolean; mine: boolean; onOpen: () => void }) {
  const look = livestock ? LIVESTOCK : PET;
  const chip = statusChip(r, livestock);
  const Icon = livestock ? Beef : PawPrint;
  const meta = [r.species, r.breed, r.color].filter(Boolean).join(' · ');
  return (
    <li>
      <button onClick={onOpen} className="o-card group flex h-full w-full flex-col p-4 text-left transition-shadow hover:shadow-md" aria-label={`View details for ${r.petName || r.species}`}>
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl" style={{ background: look.tint, color: look.fg }}>
            {r.photo ? <img src={r.photo} alt="" className="h-full w-full object-cover" /> : <Icon className="h-6 w-6" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="o-display block truncate text-lg font-semibold leading-tight">{r.petName || r.species || 'Unnamed animal'}</span>
            {meta && <span className="block truncate text-sm" style={{ color: 'var(--o-ink-soft)' }}>{meta}</span>}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip tone={chip.tone}>{chip.label}</Chip>
          {mine && <Chip tone="muted">My report</Chip>}
        </div>

        <dl className="mt-3 space-y-1.5 text-sm" style={{ color: 'var(--o-ink-soft)' }}>
          <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" /><dd className="min-w-0">{r.lastSeenLocation || 'Location not given'}{r.barangay ? `, ${r.barangay}` : ''}</dd></div>
          <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 flex-shrink-0" /><dd>{r.type === 'Found' ? 'Found' : 'Reported'} {fmtDate(r.dateReported)}</dd></div>
        </dl>

        <span className="mt-auto flex items-center gap-0.5 pt-3 text-sm font-semibold" style={{ color: look.fg }}>
          View details<ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </button>
    </li>
  );
}

// ── Report form (one dialog, adapts to the active tab) ───────────────────────
const fieldCls = 'w-full min-h-[44px] rounded-xl border bg-white px-3 text-[15px] focus:outline-none';
const fieldStyle = { borderColor: 'var(--o-line)', color: 'var(--o-ink)' } as const;

function ReportDialog({ open, onClose, livestock, user, animals, barangays, onSubmitted }: {
  open: boolean; onClose: () => void; livestock: boolean; user: User;
  animals: { id: string; label: string; species: string; breed: string; color: string; reported: boolean }[];
  barangays: string[]; onSubmitted: (r: Report) => void;
}) {
  const [animalId, setAnimalId] = useState('');
  const [where, setWhere] = useState('');
  const [barangay, setBarangay] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const look = livestock ? LIVESTOCK : PET;
  const noun = livestock ? 'livestock' : 'pet';

  useEffect(() => { if (open) { setAnimalId(''); setWhere(''); setBarangay(user.barangay || ''); setNotes(''); } }, [open, user.barangay]);

  const submit = async () => {
    const a = animals.find(x => x.id === animalId);
    if (!a) return toast.error(`Please select one of your registered ${noun === 'pet' ? 'pets' : 'livestock'}`);
    if (!where.trim() || !barangay || !notes.trim()) return toast.error('Please fill in the location, barangay and description');
    setBusy(true);
    try {
      const data: any = await api.createLostFound({
        petId: a.id,
        petName: a.label,
        species: a.species,
        breed: a.breed,
        color: a.color,
        type: 'Lost',
        reportedBy: user.username,
        reportedByRole: livestock ? 'livestockOwner' : 'petOwner',
        ownerId: user.ownerId,
        contactNumber: user.username,
        lastSeenLocation: where.trim(),
        barangay,
        description: notes.trim(),
      });
      onSubmitted(mapReport(data.report));
      toast.success(livestock ? 'Report sent. Your BAHW will validate it.' : 'Lost pet report submitted.');
      onClose();
    } catch (e) {
      console.error('[LostFound] submit failed', e);
      toast.error('Could not submit the report. Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v && !busy) onClose(); }}>
      <DialogContent className="owner-theme max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl p-0">
        <DialogHeader className="o-rule border-b px-5 py-4 text-left">
          <DialogTitle className="o-display text-xl font-semibold">{livestock ? 'Report lost livestock' : 'Report a lost pet'}</DialogTitle>
          <DialogDescription className="text-sm" style={{ color: 'var(--o-ink-soft)' }}>
            {livestock ? 'Your BAHW will review the report before it is verified.' : 'If you found someone else’s pet, surrender it to your barangay office instead.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 pb-5">
          <div>
            <label htmlFor="lf-animal" className="mb-1.5 block text-sm font-semibold">{livestock ? 'Which livestock?' : 'Which pet?'}</label>
            <select id="lf-animal" value={animalId} onChange={e => setAnimalId(e.target.value)} className={fieldCls} style={fieldStyle}>
              <option value="">Select a registered {noun}</option>
              {animals.map(a => <option key={a.id} value={a.id} disabled={a.reported}>{a.label}{a.reported ? ' — already reported' : ''}</option>)}
            </select>
            {animals.length === 0 && <p className="mt-1.5 text-sm" style={{ color: 'var(--o-red)' }}>No registered {livestock ? 'livestock' : 'pets'} yet. Register one first, then file the report.</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="lf-where" className="mb-1.5 block text-sm font-semibold">Last seen at</label>
              <input id="lf-where" value={where} onChange={e => setWhere(e.target.value)} placeholder="e.g. Near the public market" className={fieldCls} style={fieldStyle} />
            </div>
            <div>
              <label htmlFor="lf-brgy" className="mb-1.5 block text-sm font-semibold">Barangay</label>
              <select id="lf-brgy" value={barangay} onChange={e => setBarangay(e.target.value)} className={fieldCls} style={fieldStyle}>
                <option value="">Select barangay</option>
                {barangays.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="lf-notes" className="mb-1.5 block text-sm font-semibold">Description</label>
            <textarea id="lf-notes" rows={4} value={notes} onChange={e => setNotes(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2.5 text-[15px] focus:outline-none" style={fieldStyle}
              placeholder={livestock ? 'Markings, how many are missing, when and how they got out…' : 'Collar, markings, behaviour, when it was last seen…'} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={busy} className="o-btn o-btn-quiet flex-1">Cancel</button>
            <button type="button" onClick={submit} disabled={busy || animals.length === 0} className="o-btn flex-1 text-white" style={{ background: look.fg }}>
              {busy ? 'Sending…' : 'Submit report'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Module ───────────────────────────────────────────────────────────────────
interface Props {
  user: User;
  hasPets: boolean;
  hasLivestock: boolean;
  pets: any[];
  livestock: any[];
  tab: LostFoundTab;
  onTabChange: (t: LostFoundTab) => void;
  /** Called after a report is filed so the dashboard and alerts refresh. */
  onChanged?: () => void;
}

export function LostFoundModule({ user, hasPets, hasLivestock, pets, livestock, tab, onTabChange, onChanged }: Props) {
  const both = hasPets && hasLivestock;
  const active: LostFoundTab = both ? tab : hasPets ? 'pets' : 'livestock';
  const isLs = active === 'livestock';
  const look = isLs ? LIVESTOCK : PET;

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [petFilter, setPetFilter] = useState<'all' | 'Lost' | 'Found'>('all');
  const [lsFilter, setLsFilter] = useState<'all' | 'Open' | 'Verified' | 'Resolved'>('all');
  const [reporting, setReporting] = useState(false);
  const [selected, setSelected] = useState<Report | null>(null);
  const [barangays, setBarangays] = useState<string[]>(CALACA_BARANGAYS);

  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    try {
      const data: any = await api.getLostFound();
      setReports((data.reports || []).map(mapReport));
    } catch (e) {
      console.error('[LostFound] load failed', e);
      setFailed(true);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    (api as any).getBarangays?.().then((d: any) => { if (d?.barangays?.length) setBarangays(d.barangays.map((b: any) => (typeof b === 'string' ? b : b.name))); }).catch(() => {});
  }, []);

  const livestockIds = useMemo(() => new Set(livestock.map(l => String(l.id))), [livestock]);
  const mine = useCallback((r: Report) => !!user.ownerId && r.ownerId === user.ownerId, [user.ownerId]);

  // Hard split: a report belongs to exactly one tab.
  // Livestock reports are private to the owner; pet reports are the city-wide board.
  const petReports = useMemo(() => reports.filter(r => !isLivestockReport(r, livestockIds)), [reports, livestockIds]);
  const lsReports = useMemo(() => reports.filter(r => isLivestockReport(r, livestockIds) && mine(r)), [reports, livestockIds, mine]);

  const openPets = petReports.filter(r => r.status === 'Open' && r.type === 'Lost').length;
  const openLs = lsReports.filter(r => r.status === 'Open' || r.status === 'Verified').length;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = isLs ? lsReports.filter(r => lsFilter === 'all' || r.status === lsFilter) : petReports.filter(r => petFilter === 'all' || r.type === petFilter);
    return q ? base.filter(r => [r.petName, r.species, r.breed, r.color, r.lastSeenLocation, r.barangay].join(' ').toLowerCase().includes(q)) : base;
  }, [isLs, lsReports, petReports, lsFilter, petFilter, query]);

  const animals = useMemo(() => {
    if (isLs) {
      const live = livestock.filter(l => String(l.health_status ?? l.healthStatus ?? '') !== 'Dead');
      return live.map(l => {
        const type = l.animal_type ?? l.type ?? 'Livestock';
        return {
          id: String(l.id), label: `${type} (${l.id})`, species: type, breed: l.breed ?? '', color: l.color ?? l.color_markings ?? '',
          reported: lsReports.some(r => r.petId === String(l.id) && r.status === 'Open'),
        };
      });
    }
    return pets.filter(p => !p.is_archived && !/decease|dead/i.test(String(p.status || ''))).map(p => ({
      id: String(p.id), label: `${p.pet_name ?? p.petName ?? 'Pet'} (${p.species ?? ''}${p.breed ? ' — ' + p.breed : ''})`,
      species: p.species ?? '', breed: p.breed ?? '', color: p.color ?? '',
      reported: p.status === 'Lost',
    }));
  }, [isLs, livestock, pets, lsReports]);

  const tabBtn = (id: LostFoundTab, label: string, Icon: any, count: number, c: typeof PET) => {
    const on = active === id;
    return (
      <button key={id} role="tab" id={`lf-tab-${id}`} aria-selected={on} aria-controls="lf-panel" onClick={() => onTabChange(id)}
        className="relative flex min-h-[48px] flex-1 items-center justify-center gap-2 px-4 text-[15px] font-semibold transition-colors sm:flex-none sm:px-6 hover:bg-[#f7f9f5]"
        style={{ color: on ? c.fg : 'var(--o-ink-soft)', boxShadow: on ? `inset 0 -3px 0 ${c.fg}` : undefined }}>
        <Icon className="h-[18px] w-[18px]" />{label}
        {count > 0 && <span className="rounded-full px-2 text-xs font-bold leading-5" style={{ background: on ? c.tint : '#eceff1', color: on ? c.fg : '#4d5763' }} aria-label={`${count} open`}>{count}</span>}
      </button>
    );
  };

  const emptyText = query ? 'No reports match your search.' : isLs
    ? 'You have not reported any lost livestock.'
    : petFilter === 'Found' ? 'No found pets are listed right now.' : petFilter === 'Lost' ? 'No lost pets are listed right now.' : 'No lost or found pets are listed right now.';

  return (
    <div className="space-y-5">
      <PageHeading
        title="Lost & Found"
        subtitle={isLs ? 'Report missing livestock and follow the validation of your reports.' : 'Report a lost pet and see lost and found pets across Calaca City.'}
        action={
          <div className="flex gap-2">
            <button onClick={load} disabled={loading} className="o-btn o-btn-quiet" aria-label="Refresh reports"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setReporting(true)} className="o-btn text-white" style={{ background: look.fg }}>
              <Plus className="h-4 w-4" />{isLs ? 'Report lost livestock' : 'Report a lost pet'}
            </button>
          </div>
        }
      />

      {/* Tabs — Pets and Livestock never share a list */}
      <div role="tablist" aria-label="Lost and found categories" className="o-card-flat flex">
        {hasPets && tabBtn('pets', 'Pets', PawPrint, openPets, PET)}
        {hasLivestock && tabBtn('livestock', 'Livestock', Beef, openLs, LIVESTOCK)}
      </div>

      <div id="lf-panel" role="tabpanel" aria-labelledby={`lf-tab-${active}`} className="space-y-5">
        <p className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm" style={{ background: look.tint, color: look.fg }}>
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span style={{ color: 'var(--o-ink)' }}>
            {isLs
              ? <>Only <strong>you</strong> can see your livestock reports. Your barangay health worker is alerted and validates each one.</>
              : <>You can report your own <strong>registered pets</strong> as lost. If you find a pet, bring it to your barangay office so it can be validated and returned.</>}
          </span>
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--o-mute)' }} />
            <input type="search" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search reports"
              placeholder={isLs ? 'Search by animal, barangay or location' : 'Search by name, breed, colour or location'}
              className="min-h-[44px] w-full rounded-xl border bg-white pl-9 pr-3 text-[15px] focus:outline-none" style={fieldStyle} />
          </div>
          {isLs
            ? <Segmented<'all' | 'Open' | 'Verified' | 'Resolved'> value={lsFilter} onChange={setLsFilter} label="Filter livestock reports"
                options={[{ value: 'all', label: 'All' }, { value: 'Open', label: 'Pending' }, { value: 'Verified', label: 'Verified' }, { value: 'Resolved', label: 'Resolved' }]} />
            : <Segmented<'all' | 'Lost' | 'Found'> value={petFilter} onChange={setPetFilter} label="Filter pet reports"
                options={[{ value: 'all', label: 'All' }, { value: 'Lost', label: 'Lost' }, { value: 'Found', label: 'Found' }]} />}
        </div>

        {failed && !loading && (
          <p className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--o-amber-tint)', color: 'var(--o-amber)' }}>
            Reports could not be loaded. <button onClick={load} className="font-semibold underline">Try again</button>
          </p>
        )}

        {loading && reports.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
        ) : shown.length === 0 && !failed ? (
          <div className="o-card flex flex-col items-center px-6 py-12 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: look.tint, color: look.fg }}><SearchX className="h-6 w-6" /></span>
            <p className="o-display text-lg font-semibold">{emptyText}</p>
            {!query && <p className="mt-1 text-sm" style={{ color: 'var(--o-ink-soft)' }}>{isLs ? 'If an animal goes missing, file a report so your BAHW can help.' : 'Good news usually means no news.'}</p>}
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map(r => <ReportCard key={r.id} r={r} livestock={isLs} mine={mine(r)} onOpen={() => setSelected(r)} />)}
          </ul>
        )}
      </div>

      <ReportDialog open={reporting} onClose={() => setReporting(false)} livestock={isLs} user={user} animals={animals} barangays={barangays}
        onSubmitted={r => { setReports(prev => [r, ...prev]); onChanged?.(); }} />

      {selected && <LostFoundDetailsModal report={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export default LostFoundModule;
