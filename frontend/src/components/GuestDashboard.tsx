import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import {
  Search, MapPin, Phone, Mail, Clock, Syringe, PawPrint, FileCheck, Beef, ChevronDown, ShieldAlert,
  Droplets, Stethoscope, Siren, Heart, CalendarDays, ArrowRight, CheckCircle2, Dog, Cat, Wheat,
} from 'lucide-react';
import { LostFoundDetailsModal } from './LostFoundDetailsModal';
import type { User as UserType } from '../App';

interface Props { user: UserType; onLogout: () => void }
interface Report {
  id: string; type: 'Lost' | 'Found'; petName: string; species: string; breed: string; color: string;
  lastSeenLocation: string; dateReported: string; reportedBy: string; contactNumber: string;
  description: string; photo?: string; status: 'Open' | 'Resolved'; barangay: string; petId?: string;
}

/* ── static content ─────────────────────────────────────────────── */
const NAV = [
  ['home', 'Home'], ['services', 'Services'], ['vaccination', 'Vaccination'], ['bite', 'Bite Safety'],
  ['care', 'Pet Care'], ['lostfound', 'Lost & Found'], ['faq', 'FAQ'], ['contact', 'Contact'],
] as const;

const SERVICES = [
  { id: 'reg', icon: PawPrint, color: '#2B5EA6', title: 'Pet Registration', tag: 'Dogs & cats',
    desc: 'Register your pet so it has an official record, can be identified if lost, and is covered by the city’s rabies program.',
    reqs: ['Valid ID of owner', 'Pet vaccination records', 'Recent photo of pet', 'Proof of residence'], cta: 'Register online' },
  { id: 'rabies', icon: Syringe, color: '#60A85C', title: 'Anti-Rabies Vaccination', tag: 'Free for dogs & cats',
    desc: 'Free anti-rabies vaccination as part of Calaca City’s rabies prevention program. Walk-ins are welcome.',
    reqs: ['Monday–Friday, 8:00 AM – 4:00 PM', 'Free vaccination day: first Saturday of every month', 'Bring your pet’s record card, if any'], cta: 'Book appointment' },
  { id: 'cert', icon: FileCheck, color: '#F39C3A', title: 'Health Certificate', tag: 'Pets & livestock',
    desc: 'Official certificate for travel, sale or transport of animals. Valid for 30 days from issuance.',
    reqs: ['Pet registration certificate', 'Updated vaccination records', 'Physical examination by the city vet', 'Processing fee: ₱200'], cta: 'Apply now' },
  { id: 'live', icon: Beef, color: '#E85D3B', title: 'Livestock Registration', tag: 'Farm animals',
    desc: 'Registration of livestock enables disease monitoring and outbreak prevention for the whole community.',
    reqs: ['Cattle, carabao, horses', 'Swine (pigs)', 'Goats and sheep', 'Poultry (chickens, ducks)'], cta: 'Register livestock' },
];

const BITE_STEPS = [
  { icon: Droplets, t: 'Wash the wound', d: 'Right away, wash with soap and running water for at least 10 minutes. This is the single most effective first step.' },
  { icon: ShieldAlert, t: 'Disinfect', d: 'Apply an antiseptic such as povidone-iodine or alcohol. Do not apply herbs, garlic, or other home remedies, and do not cover tightly.' },
  { icon: Stethoscope, t: 'Go to an animal bite center', d: 'Seek medical care the same day, even for a small scratch. A doctor will decide on anti-rabies vaccine and immunoglobulin.' },
  { icon: Siren, t: 'Report to the CVO', d: 'Tell the City Veterinary Office about the incident so the animal can be observed (usually 14 days) and others protected.' },
];

const CARE: Record<string, { icon: any; title: string; tips: string[] }> = {
  dog: { icon: Dog, title: 'Dogs', tips: [
    'Anti-rabies vaccination from 3 months of age, then every year.', 'Keep dogs leashed or fenced; free-roaming dogs are at much higher risk of bites and disease.',
    'Deworm regularly and keep core vaccines (distemper, parvovirus) up to date.', 'Provide clean water daily and shade; never leave a dog in a closed vehicle.', 'Consider spaying/neutering to reduce stray populations and some health risks.'] },
  cat: { icon: Cat, title: 'Cats', tips: [
    'Cats need anti-rabies vaccination too, even if they stay mostly indoors.', 'Keep litter boxes clean and wash hands after cleaning.',
    'Schedule yearly checkups and core vaccines.', 'Use a collar or microchip/ID tag so a lost cat can be returned quickly.', 'Spay or neuter to reduce roaming, fighting and unwanted litters.'] },
  farm: { icon: Wheat, title: 'Livestock', tips: [
    'Register all animals with the CVO so outbreaks can be traced and controlled.', 'Report sudden deaths, many sick animals, or unusual symptoms immediately.',
    'Keep pens clean and separate new or sick animals before mixing them with the herd.', 'Follow scheduled vaccination and deworming drives in your barangay.', 'Never sell or move sick animals; secure a health certificate for transport.'] },
};

const FAQ = [
  ['Is anti-rabies vaccination really free?', 'Yes. The CVO provides free anti-rabies vaccination for dogs and cats, with free vaccination days every first Saturday of the month. Walk-ins are welcome on weekdays.'],
  ['Do I need an account to use the system?', 'You can browse information and Lost & Found reports as a guest. To register pets or livestock, book appointments or apply for certificates, create a free account.'],
  ['My pet is missing. What should I do?', 'Check the Lost & Found reports below, then log in to file a report with a clear photo and last-seen location, and contact the CVO. Check nearby barangays and shelters too.'],
  ['What if I find a stray animal?', 'Do not take risks with an unfamiliar animal. Note its description and location, and contact the CVO. If you are keeping it temporarily, post a “Found” report so the owner can claim it.'],
  ['How long is a health certificate valid?', 'A health certificate is valid for 30 days from issuance. It requires a registered animal, updated vaccination records and a physical examination by the city vet.'],
  ['What should I bring to the vaccination site?', 'Bring your pet (leashed or in a carrier), your ID, and the vaccination record card if your pet already has one.'],
];

const OFFICE = { open: 8, close: 17 }; // Mon–Fri 8AM–5PM (Asia/Manila)

/* ── helpers ────────────────────────────────────────────────────── */
function nextFirstSaturday(from = new Date()) {
  const f = (y: number, m: number) => { const d = new Date(y, m, 1); d.setDate(1 + ((6 - d.getDay() + 7) % 7)); d.setHours(8, 0, 0, 0); return d; };
  let d = f(from.getFullYear(), from.getMonth());
  if (d.getTime() < from.getTime() - 8 * 3600_000) d = f(from.getFullYear(), from.getMonth() + 1);
  return d;
}

function manilaNow() { return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })); }

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return { ref, cls: `transition-all duration-700 ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}` };
}

function Counter({ to }: { to: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => { const p = Math.min((t - t0) / 900, 1); setN(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{n}</>;
}

function Section({ id, eyebrow, title, sub, children }: { id: string; eyebrow: string; title: string; sub?: string; children: React.ReactNode }) {
  const { ref, cls } = useReveal();
  return (
    <section id={id} className="scroll-mt-20 py-14">
      <div ref={ref} className={cls}>
        <p className="text-xs font-bold tracking-widest uppercase text-[#60A85C] mb-2">{eyebrow}</p>
        <h2 className="text-3xl font-black text-[#16263d] mb-2">{title}</h2>
        {sub && <p className="text-gray-500 max-w-2xl mb-8">{sub}</p>}
        {children}
      </div>
    </section>
  );
}

/* ── component ──────────────────────────────────────────────────── */
export function GuestDashboard({ user, onLogout }: Props) {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<'all' | 'Lost' | 'Found'>('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Report | null>(null);
  const [svc, setSvc] = useState(SERVICES[0].id);
  const [careTab, setCareTab] = useState('dog');
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [faqQ, setFaqQ] = useState('');
  const [step, setStep] = useState(0);
  const [active, setActive] = useState('home');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    fetch('/api/lost-found').then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => setReports((d.reports || []).map((r: any): Report => ({
        id: r.id, petId: r.pet_id ?? r.petId ?? '', petName: r.pet_name ?? r.petName ?? '', species: r.species ?? '',
        breed: r.breed ?? '', color: r.color ?? '', type: r.type ?? 'Lost', reportedBy: r.reported_by ?? r.reportedBy ?? '',
        contactNumber: r.contact_number ?? r.contactNumber ?? '', lastSeenLocation: r.last_seen_location ?? r.lastSeenLocation ?? '',
        barangay: r.barangay ?? '', dateReported: r.date_reported ?? r.dateReported ?? '', description: r.description ?? '',
        status: r.status ?? 'Open', photo: r.photo ?? undefined,
      })))).catch(() => setFailed(true)).finally(() => setLoading(false));
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // scroll-spy for the section nav
  useEffect(() => {
    const els = NAV.map(([id]) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-35% 0px -55% 0px' });
    els.forEach(e => io.observe(e)); return () => io.disconnect();
  }, []);

  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const stats = useMemo(() => ({
    lost: reports.filter(r => r.type === 'Lost' && r.status === 'Open').length,
    found: reports.filter(r => r.type === 'Found' && r.status === 'Open').length,
    resolved: reports.filter(r => r.status === 'Resolved').length,
  }), [reports]);

  const shown = reports.filter(r => (filter === 'all' || r.type === filter) &&
    (!q || [r.petName, r.species, r.breed, r.color, r.lastSeenLocation, r.barangay].some(v => (v || '').toLowerCase().includes(q.toLowerCase()))));

  const faqShown = FAQ.filter(([a, b]) => !faqQ || (a + b).toLowerCase().includes(faqQ.toLowerCase()));

  const m = manilaNow();
  const isOpen = m.getDay() >= 1 && m.getDay() <= 5 && m.getHours() >= OFFICE.open && m.getHours() < OFFICE.close;
  const sat = nextFirstSaturday();
  const ms = Math.max(sat.getTime() - now.getTime(), 0);
  const cd = [['Days', Math.floor(ms / 864e5)], ['Hours', Math.floor(ms / 36e5) % 24], ['Min', Math.floor(ms / 6e4) % 60], ['Sec', Math.floor(ms / 1e3) % 60]];
  const S = SERVICES.find(s => s.id === svc)!;
  const SIcon = S.icon;

  return (
    <>
      <Header user={user} onLogout={onLogout} />

      {/* sticky section nav */}
      <nav className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {NAV.map(([id, label]) => (
            <button key={id} onClick={() => go(id)}
              className={`px-3.5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${active === id ? 'border-[#2B5EA6] text-[#2B5EA6]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {label}
            </button>
          ))}
          <button onClick={() => navigate('/signup')} className="ml-auto shrink-0 my-2 px-4 py-1.5 rounded-full bg-[#2B5EA6] text-white text-sm font-bold hover:bg-[#244f8c]">Create account</button>
        </div>
      </nav>

      {/* HERO */}
      <section id="home" className="scroll-mt-20 relative overflow-hidden bg-gradient-to-br from-[#1a3a6e] via-[#2B5EA6] to-[#3c8a58] text-white">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-[#60A85C]/30 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 py-16 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase bg-white/15 rounded-full px-3 py-1.5 mb-5">
              <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-300 animate-pulse' : 'bg-amber-300'}`} />
              {isOpen ? 'Office open now' : 'Office closed now'} · Calaca City Veterinary Office
            </span>
            <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-4">Caring for every pet and<br />farm animal in Calaca.</h1>
            <p className="text-white/80 text-lg max-w-xl mb-7">Find veterinary services, vaccination schedules, bite-safety guidance, and lost &amp; found pets, all in one place.</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => go('services')} className="px-6 py-3 rounded-xl bg-white text-[#2B5EA6] font-bold hover:bg-blue-50 flex items-center gap-2">Explore services <ArrowRight className="w-4 h-4" /></button>
              <button onClick={() => go('lostfound')} className="px-6 py-3 rounded-xl bg-white/15 border border-white/30 font-bold hover:bg-white/25">Search lost &amp; found</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[['Lost (open)', stats.lost, '#E85D3B'], ['Found (open)', stats.found, '#60A85C'], ['Reunited', stats.resolved, '#F39C3A']].map(([l, n, c]) => (
              <div key={l as string} className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-5 text-center">
                <p className="text-4xl font-black" style={{ color: '#fff' }}>{loading ? '–' : <Counter to={n as number} />}</p>
                <p className="text-xs mt-1 text-white/70 font-semibold">{l}</p>
                <div className="h-1 rounded-full mt-3" style={{ background: c as string }} />
              </div>
            ))}
            <div className="col-span-3 bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-2 flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Next free vaccination day</p>
              <p className="font-bold mb-3">{sat.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
              <div className="grid grid-cols-4 gap-2">
                {cd.map(([l, v]) => (
                  <div key={l as string} className="bg-black/20 rounded-xl py-2 text-center">
                    <p className="text-2xl font-black tabular-nums">{String(v).padStart(2, '0')}</p>
                    <p className="text-[10px] uppercase tracking-wider text-white/60">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4">
        {/* SERVICES */}
        <Section id="services" eyebrow="What we offer" title="Veterinary services" sub="Select a service to see what it covers and what to bring. Online applications need a free account.">
          <div className="grid lg:grid-cols-[280px_1fr] gap-6">
            <div className="flex lg:flex-col gap-2 overflow-x-auto">
              {SERVICES.map(s => { const I = s.icon; const on = s.id === svc; return (
                <button key={s.id} onClick={() => setSvc(s.id)}
                  className={`flex items-center gap-3 text-left px-4 py-3 rounded-xl border transition-all shrink-0 ${on ? 'bg-white shadow-lg' : 'bg-white/60 hover:bg-white border-gray-200'}`}
                  style={on ? { borderColor: s.color } : undefined}>
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.color + '1a' }}><I className="w-5 h-5" style={{ color: s.color }} /></span>
                  <span><span className="block font-bold text-sm text-[#16263d]">{s.title}</span><span className="block text-xs text-gray-500">{s.tag}</span></span>
                </button>); })}
            </div>
            <div key={S.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-7 animate-[fadeIn_.4s_ease]">
              <div className="flex items-center gap-4 mb-4">
                <span className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: S.color + '1a' }}><SIcon className="w-7 h-7" style={{ color: S.color }} /></span>
                <div><h3 className="text-xl font-black text-[#16263d]">{S.title}</h3><p className="text-sm text-gray-500">{S.tag}</p></div>
              </div>
              <p className="text-gray-600 mb-5">{S.desc}</p>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">{S.id === 'rabies' ? 'Schedule' : S.id === 'live' ? 'Covered animals' : 'Requirements'}</p>
              <ul className="space-y-2 mb-6">{S.reqs.map(r => <li key={r} className="flex gap-2 text-sm text-gray-700"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: S.color }} />{r}</li>)}</ul>
              <button onClick={() => navigate('/signup')} className="px-5 py-2.5 rounded-xl text-white font-bold flex items-center gap-2" style={{ background: S.color }}>{S.cta} <ArrowRight className="w-4 h-4" /></button>
            </div>
          </div>
        </Section>

        {/* VACCINATION */}
        <Section id="vaccination" eyebrow="Prevent rabies" title="Vaccination at a glance" sub="Under the Anti-Rabies Act (RA 9482), dog owners are required to have their dogs registered and vaccinated.">
          <div className="grid md:grid-cols-3 gap-5">
            {[[Syringe, '#60A85C', 'First dose', 'From 3 months of age for puppies and kittens.'],
              [CalendarDays, '#2B5EA6', 'Yearly booster', 'Repeat every year to keep protection active.'],
              [Heart, '#E85D3B', 'Keep your record', 'Bring the vaccination card to every visit and clinic.']].map(([I, c, t, d]: any) => (
              <div key={t} className="bg-white rounded-2xl p-6 border border-gray-100 shadow hover:shadow-xl hover:-translate-y-1 transition-all">
                <span className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: c + '1a' }}><I className="w-6 h-6" style={{ color: c }} /></span>
                <h3 className="font-bold text-[#16263d] mb-1">{t}</h3><p className="text-sm text-gray-600">{d}</p>
              </div>))}
          </div>
        </Section>

        {/* BITE SAFETY */}
        <Section id="bite" eyebrow="Emergency guide" title="Animal bite? Act fast." sub="Rabies is almost always fatal once symptoms appear, but it is preventable when treated early. Tap each step.">
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
            <div className="space-y-2">
              {BITE_STEPS.map((s, i) => (
                <button key={s.t} onClick={() => setStep(i)} className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl border transition-all ${step === i ? 'bg-red-50 border-red-300 shadow' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${step === i ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                  <span className="font-semibold text-[#16263d] text-sm">{s.t}</span>
                </button>))}
            </div>
            <div key={step} className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-2xl p-7 animate-[fadeIn_.4s_ease]">
              {(() => { const I = BITE_STEPS[step].icon; return <I className="w-10 h-10 text-red-500 mb-3" />; })()}
              <h3 className="text-xl font-black text-[#16263d] mb-2">Step {step + 1}: {BITE_STEPS[step].t}</h3>
              <p className="text-gray-700 mb-5">{BITE_STEPS[step].d}</p>
              <div className="flex gap-2">
                <button disabled={step === 0} onClick={() => setStep(step - 1)} className="px-4 py-2 rounded-lg border border-red-200 text-sm font-semibold disabled:opacity-40">Back</button>
                <button disabled={step === BITE_STEPS.length - 1} onClick={() => setStep(step + 1)} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold disabled:opacity-40">Next step</button>
              </div>
            </div>
          </div>
        </Section>

        {/* CARE */}
        <Section id="care" eyebrow="Responsible ownership" title="Pet &amp; livestock care tips">
          <div className="flex gap-2 mb-5">
            {Object.entries(CARE).map(([k, v]) => { const I = v.icon; return (
              <button key={k} onClick={() => setCareTab(k)} className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${careTab === k ? 'bg-[#2B5EA6] text-white shadow-lg' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}><I className="w-4 h-4" />{v.title}</button>); })}
          </div>
          <div key={careTab} className="grid md:grid-cols-2 gap-3 animate-[fadeIn_.4s_ease]">
            {CARE[careTab].tips.map((t, i) => (
              <div key={t} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-3 shadow-sm">
                <span className="w-7 h-7 rounded-full bg-[#60A85C]/15 text-[#3c8a58] text-xs font-black flex items-center justify-center shrink-0">{i + 1}</span>
                <p className="text-sm text-gray-700">{t}</p>
              </div>))}
          </div>
        </Section>

        {/* LOST & FOUND */}
        <Section id="lostfound" eyebrow="Community board" title="Lost &amp; found pets" sub="Search live reports from across Calaca City. To post a report, log in or contact the CVO.">
          <div className="bg-white rounded-2xl shadow border border-gray-100 p-4 flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, species, breed, color or location…"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]" />
            </div>
            <div className="flex gap-2">
              {(['all', 'Lost', 'Found'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${filter === f ? (f === 'Lost' ? 'bg-[#E85D3B] text-white' : f === 'Found' ? 'bg-[#60A85C] text-white' : 'bg-[#2B5EA6] text-white') : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{f === 'all' ? 'All' : f}</button>))}
            </div>
          </div>
          {loading ? <div className="py-16 text-center"><div className="w-10 h-10 border-4 border-[#2B5EA6] border-t-transparent rounded-full animate-spin mx-auto" /></div>
            : failed ? <p className="text-center text-gray-500 py-12">Reports couldn’t be loaded right now. Please try again later or contact the CVO.</p>
            : shown.length === 0 ? <p className="text-center text-gray-500 py-12">No reports match your search.</p>
            : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {shown.map(r => (
                <button key={r.id} onClick={() => setSelected(r)} className="text-left bg-white rounded-2xl border border-gray-100 shadow hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden group">
                  <div className="h-40 bg-gray-100 overflow-hidden relative">
                    {r.photo ? <img src={r.photo} alt={r.petName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      : <div className="w-full h-full flex items-center justify-center"><PawPrint className="w-12 h-12 text-gray-300" /></div>}
                    <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold text-white ${r.type === 'Lost' ? 'bg-[#E85D3B]' : 'bg-[#60A85C]'}`}>{r.type}</span>
                    {r.status === 'Resolved' && <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold bg-white text-green-700">Resolved</span>}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-[#16263d]">{r.petName || 'Unnamed'} <span className="font-normal text-gray-400 text-sm">· {r.species}{r.breed ? `, ${r.breed}` : ''}</span></h3>
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{r.lastSeenLocation || r.barangay}</p>
                    <p className="text-xs text-gray-400 mt-1">{r.dateReported ? new Date(r.dateReported).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : ''}</p>
                  </div>
                </button>))}
            </div>}
        </Section>

        {/* FAQ */}
        <Section id="faq" eyebrow="Got questions?" title="Frequently asked questions">
          <div className="max-w-3xl">
            <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input value={faqQ} onChange={e => setFaqQ(e.target.value)} placeholder="Search questions…" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]" /></div>
            <div className="space-y-2">
              {faqShown.map(([a, b], i) => (
                <div key={a} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <button onClick={() => setFaqOpen(faqOpen === i ? null : i)} className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left">
                    <span className="font-semibold text-[#16263d] text-sm">{a}</span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${faqOpen === i ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`grid transition-all duration-300 ${faqOpen === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}><div className="overflow-hidden"><p className="px-5 pb-4 text-sm text-gray-600">{b}</p></div></div>
                </div>))}
              {faqShown.length === 0 && <p className="text-gray-500 text-sm py-6 text-center">No matching questions.</p>}
            </div>
          </div>
        </Section>

        {/* CONTACT */}
        <Section id="contact" eyebrow="Visit or reach us" title="City Veterinary Office">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow p-6 space-y-4">
              {[[MapPin, 'Calaca City Hall, Calaca, Batangas'], [Phone, '(043) 123-4567'], [Mail, 'cvo@calacacity.gov.ph'], [Clock, 'Monday – Friday: 8:00 AM – 5:00 PM']].map(([I, t]: any) => (
                <div key={t} className="flex items-center gap-3 text-gray-700"><span className="w-10 h-10 rounded-xl bg-[#2B5EA6]/10 flex items-center justify-center"><I className="w-5 h-5 text-[#2B5EA6]" /></span>{t}</div>))}
              <div className={`mt-2 inline-flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-full ${isOpen ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500' : 'bg-amber-500'}`} />{isOpen ? 'Open now' : 'Closed right now'}</div>
            </div>
            <div className="bg-gradient-to-br from-[#2B5EA6] to-[#3c8a58] text-white rounded-2xl p-8 flex flex-col justify-center">
              <h3 className="text-2xl font-black mb-2">Get the full experience</h3>
              <p className="text-white/80 mb-6 text-sm">Create a free account to register pets and livestock, book vaccination appointments, apply for certificates, and post lost &amp; found reports.</p>
              <div className="flex gap-3">
                <button onClick={() => navigate('/signup')} className="px-5 py-2.5 rounded-xl bg-white text-[#2B5EA6] font-bold">Create account</button>
                <button onClick={onLogout} className="px-5 py-2.5 rounded-xl bg-white/15 border border-white/30 font-bold">Log in</button>
              </div>
            </div>
          </div>
        </Section>
      </div>

      {selected && <LostFoundDetailsModal report={selected} onClose={() => setSelected(null)} />}
      <Footer />
    </>
  );
}
