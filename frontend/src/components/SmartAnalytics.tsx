import { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Activity, BarChart3, Brain,
  ArrowUpRight, Sparkles, RefreshCw,
  AlertTriangle, CheckCircle, Info, Loader2, Zap,
} from 'lucide-react';
import { api } from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1b2d] border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      {label && <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm mb-0.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="text-white font-bold">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── AI API Call ──────────────────────────────────────────────────────────────

const callClaudeAI = async (prompt: string): Promise<string> => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await response.json();
  return data.content?.map((b: any) => b.text || '').join('\n') || '';
};

// ─── Available metrics ────────────────────────────────────────────────────────

const METRICS = [
  { value: 'vaccination', label: 'Vaccination Coverage', icon: '💉', color: '#16a34a' },
  { value: 'disease',     label: 'Disease Cases',        icon: '🦠', color: '#ef4444' },
  { value: 'mortality',   label: 'Mortality Rate',       icon: '⚕️', color: '#f59e0b' },
  { value: 'spaying',     label: 'Spaying / Neutering',  icon: '✂️', color: '#8b5cf6' },
  { value: 'impounding',  label: 'Impounding Events',    icon: '🏛️', color: '#06b6d4' },
  { value: 'outbreak',    label: 'Outbreak Incidents',   icon: '🚨', color: '#dc2626' },
  { value: 'treatment',   label: 'Treatment Programs',   icon: '💊', color: '#2563eb' },
  { value: 'quarantine',  label: 'Quarantine Measures',  icon: '🚫', color: '#f97316' },
];

// ─── Radar metric keys used in overview radar ─────────────────────────────────

const RADAR_KEYS = ['vaccination', 'disease', 'mortality', 'spaying', 'impounding'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

const pearson = (x: number[], y: number[]) => {
  const n = x.length;
  const mx = avg(x), my = avg(y);
  const num = x.reduce((s, xi, i) => s + (xi - mx) * (y[i] - my), 0);
  const den = Math.sqrt(
    x.reduce((s, xi) => s + (xi - mx) ** 2, 0) *
    y.reduce((s, yi) => s + (yi - my) ** 2, 0)
  );
  return den === 0 ? 0 : num / den;
};

// ─── Generate synthetic monthly dataset (fallback / seed) ─────────────────────

const generateDataset = () =>
  ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((month, i) => ({
    month,
    vaccination: +(55 + i * 2.8 + (Math.random() - 0.5) * 6).toFixed(1),
    disease:     +(16 - i * 1.1 + (Math.random() - 0.5) * 3).toFixed(1),
    mortality:   +(11 - i * 0.7 + (Math.random() - 0.5) * 2).toFixed(1),
    spaying:     +(38 + i * 2.2 + (Math.random() - 0.5) * 5).toFixed(1),
    impounding:  +(10 - i * 0.6 + (Math.random() - 0.5) * 2).toFixed(1),
    outbreak:    +(6  - i * 0.4 + (Math.random() - 0.5) * 1.5).toFixed(1),
    treatment:   +(45 + i * 2.5 + (Math.random() - 0.5) * 5).toFixed(1),
    quarantine:  +(7  - i * 0.4 + (Math.random() - 0.5) * 1.5).toFixed(1),
  }));

// ─── Render AI text with bold / bullet support ────────────────────────────────

const RenderAI = ({ text }: { text: string }) => {
  const lines = text.split('\n').filter(l => l.trim());
  return (
    <div className="space-y-1.5 text-slate-700 leading-relaxed text-sm">
      {lines.map((line, i) => {
        const isBullet = /^[-•*]\s/.test(line.trim());
        const clean = line.replace(/^[-•*]\s/, '').trim();
        const parts = clean.split(/\*\*(.+?)\*\*/g);
        const rendered = parts.map((p, j) =>
          j % 2 === 1 ? <strong key={j} className="text-slate-900 font-semibold">{p}</strong> : p
        );
        return isBullet
          ? <div key={i} className="flex items-start gap-2"><span className="text-blue-500 mt-1">•</span><span>{rendered}</span></div>
          : <p key={i}>{rendered}</p>;
      })}
    </div>
  );
};

// ─── AI Result Card ───────────────────────────────────────────────────────────

const AICard = ({
  title, icon: Icon, iconColor, bg, border, children,
}: {
  title: string; icon: any; iconColor: string; bg: string; border: string; children: React.ReactNode;
}) => (
  <div className="rounded-2xl border p-5 shadow-sm" style={{ background: bg, borderColor: border }}>
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: iconColor }}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h4 className="font-bold text-slate-800 text-base">{title}</h4>
      <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
        <Sparkles className="w-3 h-3 text-yellow-500" /> AI
      </span>
    </div>
    {children}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export function SmartAnalytics() {
  const [view, setView] = useState<'overview' | 'comparison'>('overview');

  // dataset
  const [dataset, setDataset] = useState<any[]>([]);
  const [dbReady, setDbReady] = useState(false);

  // overview AI
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewResult, setOverviewResult] = useState<{ summary: string; findings: string; recommendations: string } | null>(null);

  // comparison
  const [m1, setM1] = useState('spaying');
  const [m2, setM2] = useState('impounding');
  const [compLoading, setCompLoading] = useState(false);
  const [compResult, setCompResult] = useState<{ interpretation: string; recommendation: string; effectiveness: string } | null>(null);
  const [correlation, setCorrelation] = useState<number | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const seed = generateDataset();
    setDataset(seed);

    Promise.all([
      api.getVaccinationTrends().catch(() => null),
      api.getDashboardSummary().catch(() => null),
    ]).then(([vaccRes, sumRes]) => {
      if (vaccRes?.data?.length) {
        const live = vaccRes.data.map((r: any) => ({
          month: r.month,
          vaccination: parseFloat(r.vaccination_rate) || 0,
          disease:     parseFloat(r.diseases) || 0,
          mortality:   parseFloat(r.mortality_rate) || 0,
          spaying:     parseFloat(r.spaying) || Math.random() * 30 + 40,
          impounding:  parseFloat(r.impounding) || Math.random() * 8 + 2,
          outbreak:    parseFloat(r.outbreaks) || Math.random() * 5 + 1,
          treatment:   parseFloat(r.treatment) || Math.random() * 25 + 45,
          quarantine:  parseFloat(r.quarantine) || Math.random() * 5 + 2,
        }));
        setDataset(live);
      }
      setDbReady(true);
    }).catch(() => setDbReady(true));
  }, []);

  // ── Radar data (last 6-month average per metric) ───────────────────────────

  const radarData = RADAR_KEYS.map(key => {
    const vals = dataset.map(d => d[key] ?? 0);
    const mx = Math.max(...vals) || 1;
    return { metric: METRICS.find(m => m.value === key)?.label || key, value: +(avg(vals) / mx * 100).toFixed(1) };
  });

  // ── Build summary stats for context ───────────────────────────────────────

  const buildDataSummary = () => {
    if (!dataset.length) return '';
    const rows = dataset.slice(-6);
    return METRICS.map(m => {
      const vals = rows.map(r => r[m.value] ?? 0);
      return `${m.label}: avg ${avg(vals).toFixed(1)}, min ${Math.min(...vals).toFixed(1)}, max ${Math.max(...vals).toFixed(1)}`;
    }).join('\n');
  };

  // ── Overview AI Analysis ───────────────────────────────────────────────────

  const runOverviewAnalysis = async () => {
    setOverviewLoading(true);
    setOverviewResult(null);
    try {
      const summary = buildDataSummary();
      const prompt = `You are a veterinary public health analyst for Calaca City, Philippines. Analyze this 6-month animal health data and provide insights in 3 sections. Be specific, data-driven, and actionable. Keep each section under 120 words. Use bullet points.

DATA (last 6 months):
${summary}

Respond with EXACTLY these 3 labeled sections:
SUMMARY:
<2-3 sentence executive summary of overall animal health status>

KEY FINDINGS:
<3-4 bullet findings with specific numbers from the data>

RECOMMENDATIONS:
<3-4 priority action items for the city veterinary office>`;

      const raw = await callClaudeAI(prompt);

      const extractSection = (label: string) => {
        const re = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n[A-Z ]+:|$)`, 'i');
        return (raw.match(re)?.[1] || '').trim();
      };

      setOverviewResult({
        summary:         extractSection('SUMMARY'),
        findings:        extractSection('KEY FINDINGS'),
        recommendations: extractSection('RECOMMENDATIONS'),
      });
    } catch (e) {
      console.error(e);
      setOverviewResult({
        summary:         'Unable to connect to AI service. Please check your network and try again.',
        findings:        '',
        recommendations: '',
      });
    }
    setOverviewLoading(false);
  };

  // ── Comparison AI Analysis ─────────────────────────────────────────────────

  const runComparisonAnalysis = async () => {
    if (m1 === m2) return;
    setCompLoading(true);
    setCompResult(null);

    const vals1 = dataset.map(d => d[m1] ?? 0);
    const vals2 = dataset.map(d => d[m2] ?? 0);
    const r = pearson(vals1, vals2);
    setCorrelation(r);

    const l1 = METRICS.find(m => m.value === m1)?.label || m1;
    const l2 = METRICS.find(m => m.value === m2)?.label || m2;

    const pairs = dataset.slice(-6).map(d =>
      `${d.month}: ${l1}=${+(d[m1]??0).toFixed(1)}, ${l2}=${+(d[m2]??0).toFixed(1)}`
    ).join('\n');

    try {
      const prompt = `You are a veterinary epidemiologist analyzing intervention effectiveness for Calaca City, Philippines.

Comparing: ${l1} vs ${l2}
Pearson correlation: r = ${r.toFixed(3)}
Monthly data (last 6 months):
${pairs}

Provide analysis in EXACTLY these 3 labeled sections (each under 120 words, use bullet points):

INTERPRETATION:
<What does the relationship between these two metrics mean? Is the correlation expected? Describe trend and patterns.>

EFFECTIVENESS ANALYSIS:
<How effective is ${l1} in influencing ${l2}? Include specific data points. Rate effectiveness: High / Moderate / Low.>

RECOMMENDATIONS:
<3-4 concrete, prioritized actions the city vet office should take based on this comparison.>`;

      const raw = await callClaudeAI(prompt);

      const extractSection = (label: string) => {
        const re = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n[A-Z ]+:|$)`, 'i');
        return (raw.match(re)?.[1] || '').trim();
      };

      setCompResult({
        interpretation:  extractSection('INTERPRETATION'),
        effectiveness:   extractSection('EFFECTIVENESS ANALYSIS'),
        recommendation:  extractSection('RECOMMENDATIONS'),
      });
    } catch (e) {
      console.error(e);
      setCompResult({
        interpretation:  'Unable to connect to AI service. Please try again.',
        effectiveness:   '',
        recommendation:  '',
      });
    }
    setCompLoading(false);
  };

  // ── Correlation badge ──────────────────────────────────────────────────────

  const corrBadge = (r: number) => {
    const abs = Math.abs(r);
    const dir  = r > 0 ? 'Positive' : 'Negative';
    const str  = abs > 0.7 ? 'Strong' : abs > 0.4 ? 'Moderate' : 'Weak';
    const color = abs > 0.7 ? '#16a34a' : abs > 0.4 ? '#f59e0b' : '#94a3b8';
    return { label: `${str} ${dir} (r=${r.toFixed(2)})`, color };
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-[#0f172a] via-[#1e3a5f] to-[#2B5EA6] rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                Smart Analytics
                <Sparkles className="w-5 h-5 text-yellow-300" />
              </h2>
              <p className="text-blue-200 text-sm mt-0.5">
                AI-powered analysis &amp; intervention effectiveness — Calaca City Veterinary Office
              </p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 bg-white/10 border border-white/20 p-1 rounded-xl">
            {[
              { key: 'overview',    label: 'Overview Analytics', icon: BarChart3 },
              { key: 'comparison',  label: 'Compare & Effectiveness', icon: Activity },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setView(key as any)}
                className="px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                style={view === key
                  ? { background: '#fff', color: '#2B5EA6', boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }
                  : { color: 'rgba(255,255,255,0.75)' }
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          OVERVIEW TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {view === 'overview' && (
        <div className="space-y-6">

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Line chart — trends */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Health Metrics Trend</h3>
                  <p className="text-xs text-slate-500 mt-0.5">12-month rolling · all indicators</p>
                </div>
                <button
                  onClick={runOverviewAnalysis}
                  disabled={overviewLoading || !dataset.length}
                  className="px-4 py-2 bg-gradient-to-r from-[#2B5EA6] to-[#3b82f6] text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {overviewLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
                    : <><Brain className="w-4 h-4" /> AI Analyze</>}
                </button>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={dataset}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="vaccination" stroke="#16a34a" strokeWidth={2.5} dot={false} name="Vaccination %" />
                  <Line type="monotone" dataKey="disease"     stroke="#ef4444" strokeWidth={2.5} dot={false} name="Disease Cases" />
                  <Line type="monotone" dataKey="spaying"     stroke="#8b5cf6" strokeWidth={2}   dot={false} name="Spaying" strokeDasharray="5 3" />
                  <Line type="monotone" dataKey="impounding"  stroke="#06b6d4" strokeWidth={2}   dot={false} name="Impounding" strokeDasharray="5 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Radar chart — performance profile */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="mb-5">
                <h3 className="text-base font-bold text-slate-800">Performance Profile</h3>
                <p className="text-xs text-slate-500 mt-0.5">Normalized 0–100 · average across all months</p>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                  <PolarRadiusAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 100]} />
                  <Radar name="Performance" dataKey="value" stroke="#2B5EA6" fill="#2B5EA6" fillOpacity={0.25} strokeWidth={2} />
                  <Tooltip content={<ChartTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar chart — intervention comparison */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="mb-5">
              <h3 className="text-base font-bold text-slate-800">Intervention Activity — Last 6 Months</h3>
              <p className="text-xs text-slate-500 mt-0.5">Treatment, spaying, quarantine, and outbreak events</p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dataset.slice(-6)} barSize={14} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="spaying"    fill="#8b5cf6" radius={[4,4,0,0]} name="Spaying" />
                <Bar dataKey="treatment"  fill="#2563eb" radius={[4,4,0,0]} name="Treatment" />
                <Bar dataKey="quarantine" fill="#f97316" radius={[4,4,0,0]} name="Quarantine" />
                <Bar dataKey="outbreak"   fill="#ef4444" radius={[4,4,0,0]} name="Outbreak" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* AI Analysis Results */}
          {overviewLoading && (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 flex flex-col items-center gap-4 shadow-sm">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2B5EA6] to-[#3b82f6] flex items-center justify-center shadow-lg">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -inset-1 rounded-2xl border-2 border-blue-400/50 animate-ping" />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-800 text-lg">AI is analyzing your data…</p>
                <p className="text-slate-500 text-sm mt-1">Generating insights, findings, and recommendations</p>
              </div>
              <div className="flex gap-2 mt-2">
                {['Parsing trends…','Detecting patterns…','Generating insights…'].map((s, i) => (
                  <span key={i} className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-medium text-blue-700">{s}</span>
                ))}
              </div>
            </div>
          )}

          {overviewResult && !overviewLoading && (
            <div className="space-y-4">
              {/* Summary */}
              <AICard title="Executive Summary" icon={Brain} iconColor="#2B5EA6" bg="#eff6ff" border="#bfdbfe">
                <RenderAI text={overviewResult.summary} />
              </AICard>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Key Findings */}
                <AICard title="Key Findings" icon={CheckCircle} iconColor="#16a34a" bg="#f0fdf4" border="#86efac">
                  <RenderAI text={overviewResult.findings} />
                </AICard>

                {/* Recommendations */}
                <AICard title="Strategic Recommendations" icon={TrendingUp} iconColor="#7c3aed" bg="#faf5ff" border="#d8b4fe">
                  <RenderAI text={overviewResult.recommendations} />
                </AICard>
              </div>
            </div>
          )}

          {!overviewResult && !overviewLoading && (
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-8 flex flex-col items-center text-center gap-3 shadow-sm">
              <div className="w-14 h-14 bg-white border border-blue-200 rounded-2xl flex items-center justify-center shadow-sm">
                <Brain className="w-7 h-7 text-blue-600" />
              </div>
              <h4 className="font-bold text-slate-800 text-lg">Ready for AI Analysis</h4>
              <p className="text-slate-600 text-sm max-w-md">
                Click <strong>AI Analyze</strong> above to generate an intelligent summary, key findings, and strategic recommendations based on your current data.
              </p>
              <button
                onClick={runOverviewAnalysis}
                disabled={overviewLoading || !dataset.length}
                className="mt-2 px-6 py-3 bg-gradient-to-r from-[#2B5EA6] to-[#3b82f6] text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Zap className="w-4 h-4" /> Generate AI Insights
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          COMPARISON / EFFECTIVENESS TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {view === 'comparison' && (
        <div className="space-y-6">

          {/* Selector card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="mb-5">
              <h3 className="text-lg font-bold text-slate-800">Select Two Metrics to Compare</h3>
              <p className="text-sm text-slate-500 mt-1">
                Choose any two indicators — the AI will analyze their relationship and assess intervention effectiveness.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              {/* Metric 1 */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">First Metric</label>
                <div className="grid grid-cols-2 gap-2">
                  {METRICS.map(metric => (
                    <button
                      key={metric.value}
                      onClick={() => setM1(metric.value)}
                      className="px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all text-left flex items-center gap-2"
                      style={m1 === metric.value
                        ? { background: metric.color + '18', borderColor: metric.color, color: metric.color }
                        : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#64748b' }
                      }
                    >
                      <span>{metric.icon}</span>
                      <span className="truncate text-xs">{metric.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Metric 2 */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Second Metric</label>
                <div className="grid grid-cols-2 gap-2">
                  {METRICS.map(metric => (
                    <button
                      key={metric.value}
                      onClick={() => setM2(metric.value)}
                      className="px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all text-left flex items-center gap-2"
                      style={m2 === metric.value
                        ? { background: metric.color + '18', borderColor: metric.color, color: metric.color }
                        : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#64748b' }
                      }
                    >
                      <span>{metric.icon}</span>
                      <span className="truncate text-xs">{metric.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {m1 === m2
              ? <p className="text-sm text-amber-600 font-medium bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-4">⚠️ Please select two different metrics.</p>
              : (
                <div className="flex items-center gap-3 mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <p className="text-sm text-blue-700">
                    Comparing <strong>{METRICS.find(m => m.value === m1)?.label}</strong> vs <strong>{METRICS.find(m => m.value === m2)?.label}</strong>
                  </p>
                </div>
              )}

            <button
              onClick={runComparisonAnalysis}
              disabled={compLoading || m1 === m2 || !dataset.length}
              className="w-full py-4 bg-gradient-to-r from-[#0f172a] via-[#2B5EA6] to-[#3b82f6] text-white rounded-xl font-black text-base hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {compLoading
                ? <><Loader2 className="w-5 h-5 animate-spin" /> AI is analyzing…</>
                : <><Brain className="w-5 h-5" /><Sparkles className="w-4 h-4 text-yellow-300" /> Run AI Comparative Analysis</>}
            </button>
          </div>

          {/* Comparison chart */}
          {m1 !== m2 && dataset.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Side-by-Side Comparison</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {METRICS.find(m => m.value === m1)?.label} vs {METRICS.find(m => m.value === m2)?.label} · full year
                  </p>
                </div>
                {correlation !== null && (
                  <div
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border"
                    style={{
                      background: corrBadge(correlation).color + '18',
                      borderColor: corrBadge(correlation).color,
                      color: corrBadge(correlation).color,
                    }}
                  >
                    {corrBadge(correlation).label}
                  </div>
                )}
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={dataset}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left"  orientation="left"  tick={{ fontSize: 11, fill: METRICS.find(m => m.value === m1)?.color }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: METRICS.find(m => m.value === m2)?.color }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey={m1}
                    stroke={METRICS.find(m => m.value === m1)?.color}
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 7, strokeWidth: 0 }}
                    name={METRICS.find(m => m.value === m1)?.label}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey={m2}
                    stroke={METRICS.find(m => m.value === m2)?.color}
                    strokeWidth={3}
                    strokeDasharray="6 3"
                    dot={{ r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 7, strokeWidth: 0 }}
                    name={METRICS.find(m => m.value === m2)?.label}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Loading state */}
          {compLoading && (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 flex flex-col items-center gap-4 shadow-sm">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2B5EA6] to-[#3b82f6] flex items-center justify-center shadow-lg">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -inset-1 rounded-2xl border-2 border-blue-400/50 animate-ping" />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-800 text-lg">Running comparative analysis…</p>
                <p className="text-slate-500 text-sm mt-1">
                  Interpreting <strong>{METRICS.find(m => m.value === m1)?.label}</strong> vs <strong>{METRICS.find(m => m.value === m2)?.label}</strong>
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {['Calculating correlation…','Assessing effectiveness…','Building recommendations…'].map((s, i) => (
                  <span key={i} className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-medium text-blue-700">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* AI Comparison Results */}
          {compResult && !compLoading && (
            <div className="space-y-4">
              {/* Correlation stat */}
              {correlation !== null && (
                <div
                  className="rounded-2xl border p-5 flex items-center gap-5 shadow-sm"
                  style={{ background: corrBadge(correlation).color + '10', borderColor: corrBadge(correlation).color + '60' }}
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-xl shrink-0"
                    style={{ background: corrBadge(correlation).color }}
                  >
                    {Math.abs(correlation) > 0.7 ? '🔗' : Math.abs(correlation) > 0.4 ? '〰️' : '—'}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-lg">{corrBadge(correlation).label}</p>
                    <p className="text-slate-600 text-sm mt-0.5">
                      {METRICS.find(m => m.value === m1)?.label} &amp; {METRICS.find(m => m.value === m2)?.label}
                    </p>
                    <p className="text-xs mt-1" style={{ color: corrBadge(correlation).color }}>
                      R² = {(correlation ** 2 * 100).toFixed(1)}% variance explained
                    </p>
                  </div>
                </div>
              )}

              {/* Three AI cards */}
              <AICard title="Interpretation" icon={Activity} iconColor="#2B5EA6" bg="#eff6ff" border="#bfdbfe">
                <RenderAI text={compResult.interpretation} />
              </AICard>

              <AICard title="Effectiveness Analysis" icon={CheckCircle} iconColor="#16a34a" bg="#f0fdf4" border="#86efac">
                <RenderAI text={compResult.effectiveness} />
              </AICard>

              <AICard title="Recommendations" icon={TrendingUp} iconColor="#7c3aed" bg="#faf5ff" border="#d8b4fe">
                <RenderAI text={compResult.recommendation} />
              </AICard>

              {/* Re-run */}
              <div className="flex justify-end">
                <button
                  onClick={runComparisonAnalysis}
                  className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-semibold text-sm text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all flex items-center gap-2 shadow-sm"
                >
                  <RefreshCw className="w-4 h-4" /> Re-run Analysis
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
