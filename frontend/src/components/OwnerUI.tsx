import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { ChevronRight, MoreHorizontal, PawPrint, Beef } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from './ui/dropdown-menu';

// ─────────────────────────────────────────────────────────────────────────────
// Shared building blocks for the owner portal (pet owners + livestock managers)
// ─────────────────────────────────────────────────────────────────────────────

export type Tone = 'ok' | 'soon' | 'urgent' | 'info' | 'muted';

// ── Date helpers ─────────────────────────────────────────────────────────────
const todayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

export const daysUntil = (d: any): number | null => {
  const t = d ? new Date(d).getTime() : NaN;
  return isFinite(t) ? Math.ceil((t - todayStart()) / 864e5) : null;
};

export const fmtDate = (d: any): string => {
  const t = d ? new Date(d) : null;
  return t && !isNaN(t.getTime()) ? t.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
};

/** "3 days overdue", "Tomorrow", "In 12 days", or the plain date when it is far away. */
export function dueText(d: any): { text: string; tone: Tone } {
  const n = daysUntil(d);
  if (n === null) return { text: 'Not scheduled', tone: 'muted' };
  if (n < 0) return { text: `${Math.abs(n)} day${Math.abs(n) === 1 ? '' : 's'} overdue`, tone: 'urgent' };
  if (n === 0) return { text: 'Today', tone: 'soon' };
  if (n === 1) return { text: 'Tomorrow', tone: 'soon' };
  if (n <= 30) return { text: `In ${n} days`, tone: 'soon' };
  return { text: fmtDate(d), tone: 'ok' };
}

// ── Chips ────────────────────────────────────────────────────────────────────
export function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className="o-chip" data-tone={tone}>{children}</span>;
}

// Physical CVO tags are colour-coded; the card borrows the tag's colour.
// Slightly deepened so white text stays readable.
const TAG_COLORS: Record<string, string> = { BLU: '#2B5EA6', PRP: '#6D43C4', RED: '#B3321A', GRY: '#5F6B7A' };

export function TagChip({ tagId }: { tagId: string }) {
  const color = TAG_COLORS[tagId.split('-')[0]] || TAG_COLORS.GRY;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md py-0.5 pl-1.5 pr-2 text-[11px] font-bold tracking-wide text-white"
      style={{ background: color }}
      title="CVO pet tag"
    >
      <span className="h-2 w-2 rounded-full bg-white/90" aria-hidden />
      {tagId}
    </span>
  );
}

// ── Animal card ──────────────────────────────────────────────────────────────
export interface AnimalCardData {
  key: string;
  kind: 'pet' | 'livestock';
  name: string;
  detail: string;
  photo?: string;
  tagId?: string;
  /** Livestock only: head count shown as the lead numeral. */
  count?: number;
  chips: { label: string; tone: Tone }[];
  facts: { label: string; value: string; tone?: Tone }[];
  notice?: { tone: Tone; text: ReactNode };
}

export interface CardAction {
  label: string;
  icon: any;
  onClick: () => void;
  destructive?: boolean;
}

function CardAvatar({ data }: { data: AnimalCardData }) {
  if (data.kind === 'livestock') {
    const n = data.count ?? 0;
    return (
      <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-xl" style={{ background: 'var(--o-field-tint)', color: 'var(--o-field)' }}>
        <span className={`o-display font-bold leading-none ${n > 999 ? 'text-base' : 'text-2xl'}`}>{n}</span>
        <span className="mt-0.5 text-[10px] font-semibold leading-none">head</span>
      </div>
    );
  }
  if (data.photo) {
    return <img src={data.photo} alt={data.name} className="h-14 w-14 flex-shrink-0 rounded-xl object-cover" />;
  }
  return (
    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--o-blue-tint)', color: 'var(--o-blue)' }}>
      <span className="o-display text-2xl font-bold">{(data.name || '?').trim().charAt(0).toUpperCase()}</span>
    </div>
  );
}

interface AnimalCardProps {
  data: AnimalCardData;
  /** Main action. On the compact card the whole card is this button. */
  primary: { label: string; onClick: () => void; icon?: any };
  actions?: CardAction[];
  compact?: boolean;
}

export function AnimalCard({ data, primary, actions = [], compact = false }: AnimalCardProps) {
  const PrimaryIcon = primary.icon;
  const FallbackIcon = data.kind === 'pet' ? PawPrint : Beef;

  const head = (
    <div className="flex items-start gap-3">
      <CardAvatar data={data} />
      <div className="min-w-0 flex-1">
        <h3 className="o-display truncate text-lg font-semibold leading-tight" style={{ color: 'var(--o-ink)' }}>{data.name}</h3>
        <p className="mt-0.5 line-clamp-2 text-sm" style={{ color: 'var(--o-ink-soft)' }}>{data.detail}</p>
        {data.tagId && <div className="mt-1.5"><TagChip tagId={data.tagId} /></div>}
      </div>
    </div>
  );

  const chips = data.chips.length > 0 && (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {data.chips.map(c => <Chip key={c.label} tone={c.tone}>{c.label}</Chip>)}
    </div>
  );

  const facts = data.facts.length > 0 && (
    <dl className="o-rule mt-3 space-y-1.5 border-t pt-3 text-sm">
      {data.facts.map(f => (
        <div key={f.label} className="flex items-baseline justify-between gap-3">
          <dt style={{ color: 'var(--o-mute)' }}>{f.label}</dt>
          <dd className={`text-right font-semibold ${f.tone ? `o-tone-${f.tone}` : ''}`}>{f.value}</dd>
        </div>
      ))}
    </dl>
  );

  if (compact) {
    return (
      <button
        type="button"
        onClick={primary.onClick}
        className="o-card group w-full p-4 text-left transition-colors hover:border-[#c6d0c2]"
        aria-label={`${data.name}: ${primary.label}`}
      >
        {head}
        {chips}
        {facts}
        <span className="mt-3 flex items-center justify-end gap-0.5 text-xs font-semibold" style={{ color: data.kind === 'pet' ? 'var(--o-blue)' : 'var(--o-field)' }}>
          {primary.label}<ChevronRight className="h-3.5 w-3.5" />
        </span>
      </button>
    );
  }

  return (
    <article className="o-card flex flex-col p-4" aria-label={data.name}>
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">{head}</div>
        {actions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="-mr-1 -mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-[color:var(--o-mute)] hover:bg-[#eef1ec] hover:text-[color:var(--o-ink)]"
              aria-label={`More actions for ${data.name}`}
            >
              <MoreHorizontal className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[13rem] text-sm">
              {actions.map((a, i) => {
                const Icon = a.icon;
                const showRule = a.destructive && i > 0;
                return (
                  <Fragment key={a.label}>
                    {showRule && <DropdownMenuSeparator />}
                    <DropdownMenuItem variant={a.destructive ? 'destructive' : 'default'} onSelect={a.onClick} className="min-h-10 cursor-pointer">
                      <Icon className="h-4 w-4" />{a.label}
                    </DropdownMenuItem>
                  </Fragment>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {chips}
      {facts}
      {data.notice && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-xs leading-relaxed ${data.notice.tone === 'urgent' ? 'bg-[var(--o-red-tint)] text-[color:var(--o-red)]' : data.notice.tone === 'soon' ? 'bg-[var(--o-amber-tint)] text-[color:var(--o-amber)]' : 'bg-[#eceff1] text-[#4d5763]'}`}>
          {data.notice.text}
        </p>
      )}
      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={primary.onClick}
          className={`o-btn w-full ${data.kind === 'pet' ? 'o-btn-primary' : 'o-btn-field'}`}
        >
          {PrimaryIcon ? <PrimaryIcon className="h-4 w-4" /> : <FallbackIcon className="h-4 w-4" />}
          {primary.label}
        </button>
      </div>
    </article>
  );
}

// ── Page heading used by every owner section ─────────────────────────────────
export function PageHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="o-display text-2xl font-semibold sm:text-3xl" style={{ color: 'var(--o-ink)' }}>{title}</h2>
        {subtitle && <p className="mt-1 text-sm" style={{ color: 'var(--o-ink-soft)' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="o-card animate-pulse p-4" aria-hidden>
      <div className="flex gap-3">
        <div className="h-14 w-14 rounded-xl bg-[#e9ede6]" />
        <div className="flex-1 space-y-2 pt-1"><div className="h-4 w-2/3 rounded bg-[#e9ede6]" /><div className="h-3 w-1/2 rounded bg-[#eef1ec]" /></div>
      </div>
      <div className="mt-4 h-3 w-full rounded bg-[#eef1ec]" />
      <div className="mt-2 h-3 w-4/5 rounded bg-[#eef1ec]" />
    </div>
  );
}

// ── Normalizers: accept API rows (snake_case) or already-mapped objects (camelCase) ──
const ageText = (a: any) => {
  const s = String(a ?? '').trim();
  if (!s) return '';
  return /^\d+(\.\d+)?$/.test(s) ? `${s} yr` : s;
};

export function petToCard(p: any): AnimalCardData {
  const name = p.pet_name ?? p.petName ?? 'Unnamed pet';
  const status = String(p.status ?? 'Active');
  const vax = String(p.vaccination_status ?? p.vaccinationStatus ?? 'Not Vaccinated');
  const archived = !!(p.is_archived ?? p.isArchived);
  const renewal = p.renewal_due_date ?? p.renewalDueDate;
  const nextVax = p.next_vaccination_date ?? p.nextVaccinationDate;

  const chips: AnimalCardData['chips'] = [];
  if (status === 'Lost') chips.push({ label: 'Lost', tone: 'urgent' });
  else if (status === 'Found') chips.push({ label: 'Found', tone: 'ok' });
  else if (status === 'Deceased') chips.push({ label: 'Deceased', tone: 'muted' });
  if (archived) chips.push({ label: 'Registration archived', tone: 'muted' });
  if (status !== 'Deceased') {
    chips.push(vax === 'Vaccinated' ? { label: 'Vaccinated', tone: 'ok' } : vax === 'Due Soon' ? { label: 'Vaccine due soon', tone: 'soon' } : { label: 'Not vaccinated', tone: 'urgent' });
  }

  const facts: AnimalCardData['facts'] = [];
  if (status !== 'Deceased' && !archived) {
    const due = dueText(nextVax);
    facts.push({ label: 'Next vaccine', value: due.text, tone: due.tone });
  }

  let notice: AnimalCardData['notice'];
  if (archived) {
    notice = { tone: 'muted', text: 'Not renewed within 12 months. Visit the City Veterinary Office to renew and reactivate this record.' };
  } else if (renewal && (new Date(renewal).getTime() - Date.now()) / 864e5 <= 30) {
    const expired = new Date(renewal).getTime() < Date.now();
    notice = { tone: expired ? 'urgent' : 'soon', text: <>Registration {expired ? 'expired' : 'expires'} on <strong>{fmtDate(renewal)}</strong>. Renew at the City Veterinary Office to avoid archiving.</> };
  }

  const species = p.species ?? '';
  const breed = p.breed ?? '';
  const color = p.color ?? '';
  const age = ageText(p.age);
  const detail = [[species, breed].filter(Boolean).join(', '), [color, age].filter(Boolean).join(', ')].filter(Boolean).join(' · ');

  return {
    key: String(p.id), kind: 'pet', name, detail, photo: p.photo || undefined,
    tagId: p.pet_tag_id ?? p.petTagId ?? undefined, chips, facts, notice,
  };
}

export function livestockToCard(l: any): AnimalCardData {
  const type = l.animal_type ?? l.type ?? 'Livestock';
  const health = String(l.health_status ?? l.healthStatus ?? 'Healthy');
  const vax = String(l.vaccination_status ?? l.vaccinationStatus ?? '');
  const next = l.next_inspection ?? l.nextInspection;
  const last = l.last_inspection ?? l.lastInspection;
  const count = parseInt(l.quantity ?? l.count) || 0;

  const chips: AnimalCardData['chips'] = [
    health === 'Healthy' ? { label: 'Healthy', tone: 'ok' }
      : health === 'Under Observation' ? { label: 'Under observation', tone: 'soon' }
      : health === 'Dead' ? { label: 'Deceased', tone: 'muted' }
      : { label: health, tone: 'urgent' },
  ];
  if (vax) chips.push(vax === 'Up to Date' ? { label: 'Vaccines up to date', tone: 'ok' } : vax === 'Due Soon' ? { label: 'Vaccine due soon', tone: 'soon' } : { label: 'Vaccine overdue', tone: 'urgent' });

  const facts: AnimalCardData['facts'] = [];
  if (health !== 'Dead') {
    const due = dueText(next);
    facts.push({ label: 'Next inspection', value: due.text, tone: due.tone });
  }
  if (last) facts.push({ label: 'Last inspection', value: fmtDate(last) });

  const breedColor = [l.breed, l.color ?? l.color_markings].filter(Boolean).join(', ');
  const detail = [l.barangay ? `Brgy. ${String(l.barangay).replace(/^(brgy\.?|barangay)\s*/i, '')}` : '', breedColor].filter(Boolean).join(' · ');

  return { key: String(l.id), kind: 'livestock', name: type, detail, count, chips, facts };
}

// ── Segmented control (used for All / Pets / Livestock switches) ─────────────
export function Segmented<T extends string>({
  value, onChange, options, label,
}: {
  value: T; onChange: (v: T) => void; label: string;
  options: { value: T; label: string; icon?: any; color?: string }[];
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-xl p-1" style={{ background: '#e9ede6' }}>
      {options.map(o => {
        const on = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`flex min-h-[40px] items-center gap-1.5 rounded-lg px-4 text-sm font-semibold transition-colors ${on ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
            style={{ color: on ? (o.color || 'var(--o-ink)') : 'var(--o-ink-soft)' }}
          >
            {Icon && <Icon className="h-4 w-4" />}{o.label}
          </button>
        );
      })}
    </div>
  );
}
