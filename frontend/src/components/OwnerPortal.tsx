import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  LayoutDashboard, Bell, PawPrint, Beef, ClipboardList, Search, CalendarClock, Stethoscope,
  MessageSquare, UserCircle, X, ChevronRight, CheckCircle, Plus, RefreshCw, Menu, Home,
} from 'lucide-react';
import '@fontsource-variable/public-sans';
import '@fontsource-variable/bricolage-grotesque';
import '../styles/owner-theme.css';
import { Header } from './Header';
import { Footer } from './Footer';
import { MyProfile } from './MyProfile';
import { ScheduleModule } from './ScheduleModule';
import { UserFeedback } from './UserFeedback';
import { CVOServicesShared } from './CVOServicesShared';
import { PetPreRegistration } from './PetPreRegistration';
import { LivestockPreRegistration } from './LivestockPreRegistration';
import { PetOwnerDashboard } from './PetOwnerDashboard';
import { LivestockOwnerDashboard } from './LivestockOwnerDashboard';
import { LostFoundModule } from './LostFoundModule';
import {
  AnimalCard, CardSkeleton, Chip, PageHeading, Segmented, daysUntil, fmtDate, petToCard, livestockToCard,
} from './OwnerUI';
import type { Tone } from './OwnerUI';
import { api } from '../lib/api';
import type { User } from '../App';

// ─────────────────────────────────────────────────────────────────────────────
// One portal for every owner account (pet owner, livestock manager, or both).
// • ONE header, ONE sidebar (bottom tab bar on phones), ONE dashboard.
// • Shared modules (Notifications, Lost & Found, Schedule, CVO Services,
//   Feedback, Profile) appear once.
// • Only the species-specific modules are separate: My Pets / Register a Pet
//   and My Livestock / Register Livestock.
// • A pet-only or livestock-only account simply doesn't see the other group.
// • Visual language lives in styles/owner-theme.css and components/OwnerUI.tsx.
// ─────────────────────────────────────────────────────────────────────────────

type SectionId =
  | 'dashboard' | 'notifications'
  | 'pets' | 'pet-prereg'
  | 'livestock' | 'livestock-prereg'
  | 'lostfound' | 'schedule' | 'cvoservices' | 'feedback' | 'profile';

const PET_ROLES = ['petOwner', 'owner', 'both'];
const LIVESTOCK_ROLES = ['livestockManager', 'both'];

// Section names used inside the two legacy dashboards → portal section ids
const PET_NAV: Record<string, SectionId> = {
  dashboard: 'dashboard', pets: 'pets', preregistration: 'pet-prereg', lostfound: 'lostfound',
  notifications: 'notifications', cvoservices: 'cvoservices', feedback: 'feedback', schedule: 'schedule', profile: 'profile',
};
const LIVESTOCK_NAV: Record<string, SectionId> = {
  dashboard: 'dashboard', livestock: 'livestock', preregistration: 'livestock-prereg', lostfound: 'lostfound',
  notifications: 'notifications', feedback: 'feedback', schedule: 'schedule', profile: 'profile',
};

const BLUE = 'var(--o-blue)';
const FIELD = 'var(--o-field)';

// ── Data shared by the dashboard, notifications and sidebar badges ───────────
interface Attention {
  id: string; kind: 'pet' | 'livestock' | 'lost'; level: 'high' | 'medium' | 'info';
  title: string; detail: string; go: SectionId; species?: 'pet' | 'livestock';
}
const fmt = fmtDate;
const rows = (r: any, key: string): any[] => (Array.isArray(r) ? r : (r && r[key]) || []);

function useOwnerData(user: User, hasPets: boolean, hasLivestock: boolean) {
  const [pets, setPets] = useState<any[]>([]);
  const [livestock, setLivestock] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!user.ownerId) { setLoading(false); return; }
    setLoading(true);
    const a: any = api;
    const [p, l, r] = await Promise.allSettled([
      hasPets ? a.getPets(user.ownerId, 'all') : Promise.resolve(null),
      hasLivestock ? a.getLivestock({ ownerId: user.ownerId }) : Promise.resolve(null),
      a.getLostFound(undefined, user.ownerId),
    ]);
    if (p.status === 'fulfilled' && p.value) setPets(rows(p.value, 'pets'));
    if (l.status === 'fulfilled' && l.value) setLivestock(rows(l.value, 'livestock'));
    if (r.status === 'fulfilled' && r.value) setReports(rows(r.value, 'reports'));
    setFailed([p, l, r].some(x => x.status === 'rejected'));
    setLoading(false);
  }, [user.ownerId, hasPets, hasLivestock]);

  useEffect(() => { load(); }, [load]);

  const livestockIds = useMemo(() => new Set(livestock.map(x => String(x.id))), [livestock]);
  const openReports = useMemo(() => reports.filter(r => String(r.status || 'Open') === 'Open' && String(r.type || 'Lost') === 'Lost'), [reports]);
  const isLivestockReport = (r: any) => livestockIds.has(String(r.pet_id)) || /livestock/i.test(String(r.reported_by_role || ''));

  const attention = useMemo<Attention[]>(() => {
    const out: Attention[] = [];
    for (const p of pets) {
      if (/decease|dead/i.test(String(p.status || ''))) continue;
      const name = p.pet_name || 'Pet';
      if (p.is_archived) { out.push({ id: `pet-arch-${p.id}`, kind: 'pet', level: 'high', title: `${name}: registration expired`, detail: 'Renew the registration to keep this pet active.', go: 'pets' }); continue; }
      const d = daysUntil(p.next_vaccination_date);
      if (d !== null && d < 0) out.push({ id: `pet-vax-${p.id}`, kind: 'pet', level: 'high', title: `${name}: vaccination overdue`, detail: `Was due ${fmt(p.next_vaccination_date)}. Bring your pet to the next vaccination drive.`, go: 'schedule' });
      else if ((d !== null && d <= 30) || p.vaccination_status === 'Due Soon') out.push({ id: `pet-vax-${p.id}`, kind: 'pet', level: 'medium', title: `${name}: vaccination due soon`, detail: d !== null ? `Due ${fmt(p.next_vaccination_date)} (${d} day${d === 1 ? '' : 's'}).` : 'Due soon.', go: 'schedule' });
      if (p.status === 'Lost') out.push({ id: `pet-lost-${p.id}`, kind: 'pet', level: 'high', title: `${name} is marked as lost`, detail: 'Update the report if your pet has been found.', go: 'lostfound' });
    }
    for (const l of livestock) {
      const name = l.animal_type || l.type || 'Livestock';
      if (l.vaccination_status === 'Overdue') out.push({ id: `ls-vax-${l.id}`, kind: 'livestock', level: 'high', title: `${name}: vaccination overdue`, detail: 'Contact your BAHW or the CVO to schedule vaccination.', go: 'schedule' });
      else if (l.vaccination_status === 'Due Soon') out.push({ id: `ls-vax-${l.id}`, kind: 'livestock', level: 'medium', title: `${name}: vaccination due soon`, detail: 'Check the vaccination schedule for your barangay.', go: 'schedule' });
      if (l.health_status === 'Quarantine') out.push({ id: `ls-hl-${l.id}`, kind: 'livestock', level: 'high', title: `${name}: under quarantine`, detail: 'Keep these animals isolated and follow CVO instructions.', go: 'livestock' });
      else if (l.health_status === 'Under Observation') out.push({ id: `ls-hl-${l.id}`, kind: 'livestock', level: 'medium', title: `${name}: under observation`, detail: 'Watch for symptoms and report any changes.', go: 'livestock' });
      const i = daysUntil(l.next_inspection);
      if (i !== null && i >= 0 && i <= 30) out.push({ id: `ls-insp-${l.id}`, kind: 'livestock', level: 'info', title: `${name}: inspection on ${fmt(l.next_inspection)}`, detail: `In ${i} day${i === 1 ? '' : 's'}.`, go: 'livestock' });
    }
    for (const r of openReports) out.push({ id: `lost-${r.id}`, kind: 'lost', level: 'info', title: `Open lost report: ${r.pet_name || r.species || 'Animal'}`, detail: r.last_seen_location ? `Last seen: ${r.last_seen_location}.` : 'Awaiting update.', go: 'lostfound', species: isLivestockReport(r) ? 'livestock' : 'pet' });
    const rank = { high: 0, medium: 1, info: 2 } as const;
    return out.sort((x, y) => rank[x.level] - rank[y.level]);
  }, [pets, livestock, openReports, livestockIds]); // eslint-disable-line react-hooks/exhaustive-deps

  return { pets, livestock, reports, openReports, attention, loading, failed, reload: load, isLivestockReport };
}


// ── Attention list (dashboard + notifications) ───────────────────────────────
const LEVEL: Record<Attention['level'], { tone: Tone; label: string }> = {
  high: { tone: 'urgent', label: 'Urgent' },
  medium: { tone: 'soon', label: 'Soon' },
  info: { tone: 'info', label: 'Info' },
};

const KIND_LOOK = {
  pet: { Icon: PawPrint, bg: 'var(--o-blue-tint)', fg: 'var(--o-blue)' },
  livestock: { Icon: Beef, bg: 'var(--o-field-tint)', fg: 'var(--o-field)' },
  lost: { Icon: Search, bg: 'var(--o-amber-tint)', fg: 'var(--o-amber)' },
} as const;

function AttentionList({ items, go, limit }: { items: Attention[]; go: (s: SectionId, tab?: 'pets' | 'livestock') => void; limit?: number }) {
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <ul className="o-rule divide-y">
      {shown.map(a => {
        const look = KIND_LOOK[a.kind];
        const lv = LEVEL[a.level];
        return (
          <li key={a.id}>
            <button onClick={() => go(a.go, a.go === 'lostfound' ? (a.kind === 'lost' && a.species === 'livestock' ? 'livestock' : 'pets') : undefined)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#f7f9f5]">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: look.bg, color: look.fg }}><look.Icon className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold leading-snug">{a.title}</span>
                <span className="line-clamp-2 block text-sm" style={{ color: 'var(--o-ink-soft)' }}>{a.detail}</span>
                <span className="mt-1.5 block sm:hidden" aria-hidden><Chip tone={lv.tone}>{lv.label}</Chip></span>
              </span>
              <span className="hidden flex-shrink-0 sm:block"><Chip tone={lv.tone}>{lv.label}</Chip></span>
              <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--o-mute)' }} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function SectionCard({ title, count, action, children }: { title: string; count?: number; action?: { label: string; onClick: () => void }; children: ReactNode }) {
  return (
    <section className="o-card-flat">
      <div className="o-rule flex items-center justify-between border-b px-4 py-3">
        <h3 className="o-display text-lg font-semibold">{title}{count !== undefined && count > 0 && <span className="ml-2 text-sm font-medium" style={{ color: 'var(--o-mute)' }}>{count}</span>}</h3>
        {action && <button onClick={action.onClick} className="flex min-h-[36px] items-center gap-0.5 text-sm font-semibold" style={{ color: 'var(--o-blue)' }}>{action.label}<ChevronRight className="h-4 w-4" /></button>}
      </div>
      {children}
    </section>
  );
}

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

// ── Dashboard ────────────────────────────────────────────────────────────────
function OwnerOverview({ user, data, hasPets, hasLivestock, go }: { user: User; data: ReturnType<typeof useOwnerData>; hasPets: boolean; hasLivestock: boolean; go: (s: SectionId, tab?: 'pets' | 'livestock') => void }) {
  const { pets, livestock, attention, openReports, loading } = data;
  const activePets = pets.filter(p => !p.is_archived && !/decease|dead/i.test(String(p.status || '')));
  const activeLivestock = livestock.filter(l => String(l.health_status ?? l.healthStatus ?? '') !== 'Dead');
  const totalAnimals = activeLivestock.reduce((s, l) => s + (parseInt(l.quantity ?? l.count) || 0), 0);
  const urgent = attention.filter(a => a.level === 'high').length;
  const empty = !loading && pets.length === 0 && livestock.length === 0;

  const headline = loading && attention.length === 0 && pets.length === 0 && livestock.length === 0 ? 'Checking your records…'
    : attention.length === 0 ? 'Everything is up to date.'
    : urgent > 0 ? `${urgent} ${urgent === 1 ? 'item needs' : 'items need'} your attention.`
    : `${attention.length} ${attention.length === 1 ? 'reminder' : 'reminders'} to look at.`;
  const onRecord = [hasPets && `${activePets.length} ${activePets.length === 1 ? 'pet' : 'pets'}`, hasLivestock && `${totalAnimals} livestock`].filter(Boolean).join(' and ');

  // "Coming up": future vaccinations and inspections in one date-ordered list
  type Upcoming = { key: string; date: Date; title: string; sub: string; kind: 'pet' | 'livestock'; go: SectionId };
  const upcoming: Upcoming[] = [
    ...activePets.flatMap(p => { const d = daysUntil(p.next_vaccination_date); return d !== null && d >= 0 && d <= 60 ? [{ key: `p${p.id}`, date: new Date(p.next_vaccination_date), title: p.pet_name || 'Pet', sub: 'Vaccination due', kind: 'pet' as const, go: 'schedule' as SectionId }] : []; }),
    ...activeLivestock.flatMap(l => { const d = daysUntil(l.next_inspection); return d !== null && d >= 0 && d <= 60 ? [{ key: `l${l.id}`, date: new Date(l.next_inspection), title: l.animal_type || l.type || 'Livestock', sub: 'Inspection', kind: 'livestock' as const, go: 'livestock' as SectionId }] : []; }),
  ].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 5);

  const actions: { label: string; icon: any; go: SectionId; show: boolean; tint: string; fg: string }[] = [
    { label: 'Register a pet', icon: Plus, go: 'pet-prereg', show: hasPets, tint: 'var(--o-blue-tint)', fg: 'var(--o-blue)' },
    { label: 'Register livestock', icon: Plus, go: 'livestock-prereg', show: hasLivestock, tint: 'var(--o-field-tint)', fg: 'var(--o-field)' },
    { label: 'Report a lost animal', icon: Search, go: 'lostfound', show: true, tint: 'var(--o-amber-tint)', fg: 'var(--o-amber)' },
    { label: 'See vaccination schedule', icon: CalendarClock, go: 'schedule', show: true, tint: '#eceff1', fg: '#4d5763' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="o-display text-3xl font-semibold sm:text-4xl">{greeting()}, {user.username}</h1>
          <p className="mt-1.5 text-base" style={{ color: 'var(--o-ink-soft)' }}>
            {headline}{onRecord && !empty ? <span> You have {onRecord} on record.</span> : null}
          </p>
        </div>
        <button onClick={data.reload} disabled={loading} className="o-btn o-btn-quiet" aria-label="Refresh">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
        </button>
      </div>

      {!user.ownerId && <p className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--o-amber-tint)', color: 'var(--o-amber)' }}>Your account is not linked to an owner record yet, so no animals are shown. Please contact the City Veterinary Office.</p>}
      {data.failed && !loading && <p className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--o-amber-tint)', color: 'var(--o-amber)' }}>Some information could not be loaded. Tap Refresh to try again.</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <SectionCard title="Needs your attention" count={attention.length} action={attention.length > 5 ? { label: 'View all', onClick: () => go('notifications') } : undefined}>
          {loading && attention.length === 0 ? (
            <div className="space-y-3 p-4" aria-hidden>{[0, 1, 2].map(i => <div key={i} className="h-12 animate-pulse rounded-xl bg-[#eef1ec]" />)}</div>
          ) : attention.length === 0 ? (
            <div className="flex items-center gap-4 px-5 py-8">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--o-field-tint)', color: 'var(--o-field)' }}><CheckCircle className="h-6 w-6" /></span>
              <div>
                <p className="o-display text-lg font-semibold">You're all caught up</p>
                <p className="text-sm" style={{ color: 'var(--o-ink-soft)' }}>
                  {upcoming[0] ? `Next up: ${upcoming[0].title} — ${upcoming[0].sub.toLowerCase()} on ${fmtDate(upcoming[0].date)}.` : empty ? 'Register your first animal to start receiving reminders.' : 'Nothing is due in the next 60 days.'}
                </p>
              </div>
            </div>
          ) : <AttentionList items={attention} go={go} limit={5} />}
        </SectionCard>

        <section aria-label="Quick actions" className="o-card-flat self-start">
          <h3 className="o-display o-rule border-b px-4 py-3 text-lg font-semibold">Quick actions</h3>
          <ul className="p-2">
            {actions.filter(a => a.show).map(a => (
              <li key={a.label}>
                <button onClick={() => go(a.go)} className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-[#f7f9f5]">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: a.tint, color: a.fg }}><a.icon className="h-5 w-5" /></span>
                  <span className="flex-1 text-[15px] font-semibold">{a.label}</span>
                  <ChevronRight className="h-4 w-4" style={{ color: 'var(--o-mute)' }} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Your animals */}
      {(hasPets || hasLivestock) && (
        <div className="space-y-6">
          {hasPets && (
            <section aria-label="Your pets">
              <div className="mb-3 flex items-end justify-between">
                <h2 className="o-display text-xl font-semibold">Your pets</h2>
                {pets.length > 0 && <button onClick={() => go('pets')} className="flex min-h-[36px] items-center gap-0.5 text-sm font-semibold" style={{ color: BLUE }}>All pets<ChevronRight className="h-4 w-4" /></button>}
              </div>
              {loading && pets.length === 0 ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><CardSkeleton /><CardSkeleton /></div>
                : pets.length === 0 ? <EmptyRoster text="No pets registered yet." cta="Register a pet" onClick={() => go('pet-prereg')} />
                : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{pets.slice(0, 3).map(p => <AnimalCard key={p.id} compact data={petToCard(p)} primary={{ label: 'Open', onClick: () => go('pets') }} />)}</div>}
            </section>
          )}
          {hasLivestock && (
            <section aria-label="Your livestock">
              <div className="mb-3 flex items-end justify-between">
                <h2 className="o-display text-xl font-semibold">Your livestock</h2>
                {livestock.length > 0 && <button onClick={() => go('livestock')} className="flex min-h-[36px] items-center gap-0.5 text-sm font-semibold" style={{ color: FIELD }}>All livestock<ChevronRight className="h-4 w-4" /></button>}
              </div>
              {loading && livestock.length === 0 ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><CardSkeleton /><CardSkeleton /></div>
                : livestock.length === 0 ? <EmptyRoster text="No livestock registered yet." cta="Register livestock" onClick={() => go('livestock-prereg')} />
                : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{livestock.slice(0, 3).map(l => <AnimalCard key={l.id} compact data={livestockToCard(l)} primary={{ label: 'Open', onClick: () => go('livestock') }} />)}</div>}
            </section>
          )}
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {upcoming.length > 0 && (
          <SectionCard title="Coming up" action={{ label: 'Schedule', onClick: () => go('schedule') }}>
            <ul className="o-rule divide-y">
              {upcoming.map(u => (
                <li key={u.key}>
                  <button onClick={() => go(u.go)} className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-[#f7f9f5]">
                    <span className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-xl" style={{ background: u.kind === 'pet' ? 'var(--o-blue-tint)' : 'var(--o-field-tint)', color: u.kind === 'pet' ? 'var(--o-blue)' : 'var(--o-field)' }}>
                      <span className="text-[11px] font-semibold leading-none">{u.date.toLocaleDateString('en-PH', { month: 'short' })}</span>
                      <span className="o-display text-lg font-bold leading-tight">{u.date.getDate()}</span>
                    </span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-semibold">{u.title}</span><span className="block text-sm" style={{ color: 'var(--o-ink-soft)' }}>{u.sub}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        {openReports.length > 0 && (
          <SectionCard title="Open lost reports" count={openReports.length} action={{ label: 'Manage', onClick: () => go('lostfound', hasPets && !openReports.some(r => !data.isLivestockReport(r)) ? 'livestock' : undefined) }}>
            <ul className="o-rule divide-y">
              {openReports.slice(0, 3).map(r => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold">{r.pet_name || r.species}</p>
                    <p className="truncate text-sm" style={{ color: 'var(--o-ink-soft)' }}>{r.last_seen_location || 'Last seen location not given'}, reported {fmtDate(r.date_reported)}</p>
                  </div>
                  <Chip tone={data.isLivestockReport(r) ? 'ok' : 'info'}>{data.isLivestockReport(r) ? 'Livestock' : 'Pet'}</Chip>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

function EmptyRoster({ text, cta, onClick }: { text: string; cta: string; onClick: () => void }) {
  return (
    <div className="o-card flex flex-wrap items-center justify-between gap-3 px-5 py-5">
      <p style={{ color: 'var(--o-ink-soft)' }}>{text}</p>
      <button onClick={onClick} className="o-btn o-btn-quiet"><Plus className="h-4 w-4" />{cta}</button>
    </div>
  );
}

// ── Notifications (pets + livestock in one list) ─────────────────────────────
function OwnerNotifications({ data, hasPets, hasLivestock, go }: { data: ReturnType<typeof useOwnerData>; hasPets: boolean; hasLivestock: boolean; go: (s: SectionId, tab?: 'pets' | 'livestock') => void }) {
  const [filter, setFilter] = useState<'all' | 'pet' | 'livestock'>('all');
  const both = hasPets && hasLivestock;
  const list = data.attention.filter(a => filter === 'all' || (a.kind === 'lost' ? a.species === filter : a.kind === filter));
  return (
    <div className="space-y-5">
      <PageHeading title="Notifications" subtitle={`Reminders for ${both ? 'your pets and livestock' : hasPets ? 'your pets' : 'your livestock'}, most urgent first.`} />
      {both && (
        <Segmented<'all' | 'pet' | 'livestock'> value={filter} onChange={setFilter} label="Filter notifications"
          options={[{ value: 'all', label: 'All' }, { value: 'pet', label: 'Pets', color: 'var(--o-blue)' }, { value: 'livestock', label: 'Livestock', color: 'var(--o-field)' }]} />
      )}
      <div className="o-card-flat">
        {data.loading && list.length === 0 ? <p className="py-10 text-center text-sm" style={{ color: 'var(--o-mute)' }}>Loading…</p>
          : list.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'var(--o-field-tint)', color: 'var(--o-field)' }}><CheckCircle className="h-6 w-6" /></span>
              <p className="o-display text-lg font-semibold">Nothing to do right now</p>
              <p className="text-sm" style={{ color: 'var(--o-ink-soft)' }}>New reminders will show up here.</p>
            </div>
          ) : <AttentionList items={list} go={go} />}
      </div>
    </div>
  );
}

// ── Navigation ───────────────────────────────────────────────────────────────
interface NavItem { id: SectionId; label: string; icon: any; badge?: number }
interface NavGroup { label: string; accent?: string; tint?: string; items: NavItem[] }

function PortalNav({ groups, active, go, onClose }: { groups: NavGroup[]; active: SectionId; go: (s: SectionId, tab?: 'pets' | 'livestock') => void; onClose?: () => void }) {
  return (
    <nav aria-label="Owner portal" className="space-y-5 p-3">
      {groups.map(g => (
        <div key={g.label}>
          <p className="mb-1 px-3 text-xs font-bold" style={{ color: g.accent || 'var(--o-mute)' }}>{g.label}</p>
          <ul className="space-y-0.5">
            {g.items.map(it => {
              const on = active === it.id; const Icon = it.icon;
              return (
                <li key={it.id}>
                  <button onClick={() => { go(it.id); onClose?.(); }} aria-current={on ? 'page' : undefined}
                    className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors hover:bg-[#f2f5ef]"
                    style={on ? { background: g.tint || 'var(--o-blue-tint)', color: g.accent || 'var(--o-blue)' } : { color: 'var(--o-ink-soft)' }}>
                    <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                    <span className="flex-1 truncate text-left">{it.label}</span>
                    {!!it.badge && <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white" style={{ background: 'var(--o-red)' }}>{it.badge > 9 ? '9+' : it.badge}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Phone-only tab bar: the four places owners go most, plus the full menu. */
function BottomNav({ items, active, go, onMore }: { items: NavItem[]; active: SectionId; go: (s: SectionId, tab?: 'pets' | 'livestock') => void; onMore: () => void }) {
  const cell = 'relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold';
  return (
    <nav aria-label="Main" className="owner-bottom-nav o-rule fixed inset-x-0 bottom-0 z-40 flex border-t bg-white lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {items.map(it => {
        const on = active === it.id; const Icon = it.icon;
        return (
          <button key={it.id} onClick={() => go(it.id)} aria-current={on ? 'page' : undefined} className={cell} style={{ color: on ? 'var(--o-blue)' : 'var(--o-mute)' }}>
            <span className="relative"><Icon className="h-6 w-6" />{!!it.badge && <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: 'var(--o-red)' }}>{it.badge > 9 ? '9+' : it.badge}</span>}</span>
            {it.label}
          </button>
        );
      })}
      <button onClick={onMore} className={cell} style={{ color: 'var(--o-mute)' }}><Menu className="h-6 w-6" />More</button>
    </nav>
  );
}

// ── Portal ───────────────────────────────────────────────────────────────────
export function OwnerPortal({ user, onLogout }: { user: User; onLogout: () => void }) {
  const role = user.role || '';
  const hasPets = PET_ROLES.includes(role);
  const hasLivestock = LIVESTOCK_ROLES.includes(role);
  const [section, setSection] = useState<SectionId>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [lfTab, setLfTab] = useState<'pets' | 'livestock'>(hasPets ? 'pets' : 'livestock');
  const data = useOwnerData(user, hasPets, hasLivestock);

  const go = useCallback((s: SectionId, tab?: 'pets' | 'livestock') => { if (tab) setLfTab(tab); setSection(s); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);

  // Refresh summary data whenever the user returns to a summary page
  useEffect(() => { if (section === 'dashboard' || section === 'notifications') data.reload(); }, [section]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close the phone menu with Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const urgentCount = data.attention.filter(a => a.level !== 'info').length;

  const groups: NavGroup[] = [
    { label: 'Overview', items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'notifications', label: 'Notifications', icon: Bell, badge: urgentCount },
    ] },
    ...(hasPets ? [{ label: 'Pets', accent: 'var(--o-blue)', tint: 'var(--o-blue-tint)', items: [
      { id: 'pets' as SectionId, label: 'My Pets', icon: PawPrint },
      { id: 'pet-prereg' as SectionId, label: 'Register a Pet', icon: ClipboardList },
    ] }] : []),
    ...(hasLivestock ? [{ label: 'Livestock', accent: 'var(--o-field)', tint: 'var(--o-field-tint)', items: [
      { id: 'livestock' as SectionId, label: 'My Livestock', icon: Beef },
      { id: 'livestock-prereg' as SectionId, label: 'Register Livestock', icon: ClipboardList },
    ] }] : []),
    { label: 'Services', items: [
      { id: 'lostfound', label: 'Lost & Found', icon: Search },
      { id: 'schedule', label: 'Vaccination Schedule', icon: CalendarClock },
      { id: 'cvoservices', label: 'CVO Services', icon: Stethoscope },
      { id: 'feedback', label: 'Feedback & Complaints', icon: MessageSquare },
    ] },
    { label: 'Account', items: [{ id: 'profile', label: 'My Profile', icon: UserCircle }] },
  ];

  const tabs: NavItem[] = [
    { id: 'dashboard', label: 'Home', icon: Home },
    ...(hasPets ? [{ id: 'pets' as SectionId, label: 'Pets', icon: PawPrint }] : []),
    ...(hasLivestock ? [{ id: 'livestock' as SectionId, label: 'Livestock', icon: Beef }] : []),
    ...(hasPets && hasLivestock ? [] : [{ id: 'schedule' as SectionId, label: 'Schedule', icon: CalendarClock }]),
    { id: 'notifications', label: 'Alerts', icon: Bell, badge: urgentCount },
  ];

  const renderContent = () => {
    switch (section) {
      case 'dashboard': return <OwnerOverview user={user} data={data} hasPets={hasPets} hasLivestock={hasLivestock} go={go} />;
      case 'notifications': return <OwnerNotifications data={data} hasPets={hasPets} hasLivestock={hasLivestock} go={go} />;
      case 'pets': return <PetOwnerDashboard user={user} onLogout={onLogout} embedded section="pets" onNavigate={s => go(PET_NAV[s] || 'dashboard')} />;
      case 'livestock': return <LivestockOwnerDashboard user={user} onLogout={onLogout} embedded section="livestock" onNavigate={s => go(LIVESTOCK_NAV[s] || 'dashboard')} />;
      case 'pet-prereg': return <PetPreRegistration ownerId={user.ownerId} ownerEmail={user.email || ''} />;
      case 'livestock-prereg': return <LivestockPreRegistration ownerId={user.ownerId} ownerEmail={user.email || ''} userRole={(user.role as any) || 'livestockManager'} barangay={user.barangay || undefined} />;
      case 'lostfound': return (
        <LostFoundModule user={user} hasPets={hasPets} hasLivestock={hasLivestock} pets={data.pets} livestock={data.livestock}
          tab={lfTab} onTabChange={setLfTab} onChanged={data.reload} />
      );
      case 'schedule': return <ScheduleModule user={user} />;
      case 'cvoservices': return <CVOServicesShared userRole={user.role as any} />;
      case 'feedback': return <UserFeedback user={user} />;
      case 'profile': return (
        <MyProfile user={user} onUserUpdate={(u) => { const s = sessionStorage.getItem('nasaalaga_user'); if (s) { try { const p = JSON.parse(s); Object.assign(p, u); sessionStorage.setItem('nasaalaga_user', JSON.stringify(p)); window.dispatchEvent(new Event('nasaalaga_profile_updated')); } catch { /* ignore */ } } }} />
      );
      default: return null;
    }
  };
  return (
    <div className="owner-theme flex min-h-screen flex-col">
      <Header user={user} onLogout={onLogout} onMenuClick={() => setMenuOpen(o => !o)} onProfileClick={() => go('profile')}
        alertCount={urgentCount} alertCritical={data.attention.some(a => a.level === 'high')} onBellClick={() => go('notifications')}
        variant="light" compact />

      <div className="mx-auto flex w-full max-w-[1400px] flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-72 flex-shrink-0 p-4 lg:block">
          <div className="o-card sticky top-4">
            <PortalNav groups={groups} active={section} go={go} />
          </div>
        </aside>

        {/* Phone menu */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
            <div className="relative h-full w-72 max-w-[85%] overflow-y-auto bg-white shadow-xl">
              <div className="o-rule flex items-center justify-between border-b px-4 py-3">
                <p className="o-display text-lg font-semibold">Menu</p>
                <button onClick={() => setMenuOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-[#f2f5ef]" aria-label="Close menu"><X className="h-5 w-5" style={{ color: 'var(--o-ink-soft)' }} /></button>
              </div>
              <PortalNav groups={groups} active={section} go={go} onClose={() => setMenuOpen(false)} />
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 sm:pt-8 lg:pb-10">{renderContent()}</main>
      </div>

      <p className="px-4 pb-4 text-center text-xs lg:pb-4" style={{ color: 'var(--o-mute)' }}>ISO 9001:2015, ISO 27001, ISO 22301 and ARTA compliant</p>
      <div className="pb-16 lg:pb-0"><Footer /></div>
      <BottomNav items={tabs} active={section} go={go} onMore={() => setMenuOpen(true)} />
    </div>
  );
}

export default OwnerPortal;
