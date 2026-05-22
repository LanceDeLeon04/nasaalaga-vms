import { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { TrendingUp, ArrowUpRight, ArrowDownRight, BarChart3, Activity, Minus } from 'lucide-react';

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
          <span className="text-white font-bold">{p.value}{p.name?.includes('%') ? '%' : ''}</span>
        </div>
      ))}
    </div>
  );
};

export function ComparativeAnalytics() {
  const [comparisonType, setComparisonType] = useState<'barangay' | 'period' | 'correlation'>('barangay');
  const [selectedMetric, setSelectedMetric] = useState<'vaccination' | 'disease' | 'mortality'>('vaccination');

  const barangayComparison = [
    { barangay:'Bagong Tubig', vaccination:65, diseases:8,  mortality:12, riskScore:78, trend:'up'     },
    { barangay:'Poblacion 2',  vaccination:82, diseases:4,  mortality:8,  riskScore:45, trend:'up'     },
    { barangay:'Cahil',        vaccination:62, diseases:3,  mortality:5,  riskScore:52, trend:'stable' },
    { barangay:'Balimbing',    vaccination:45, diseases:2,  mortality:3,  riskScore:68, trend:'down'   },
    { barangay:'Bambang',      vaccination:88, diseases:1,  mortality:2,  riskScore:22, trend:'down'   },
    { barangay:'Poblacion 4',  vaccination:75, diseases:2,  mortality:1,  riskScore:35, trend:'stable' },
  ];

  const periodComparison = [
    { month:'July',      current:85, previous:78, diseases:12 },
    { month:'August',    current:88, previous:82, diseases:8  },
    { month:'September', current:92, previous:85, diseases:5  },
    { month:'October',   current:90, previous:88, diseases:7  },
    { month:'November',  current:94, previous:89, diseases:4  },
    { month:'December',  current:96, previous:91, diseases:3  },
  ];

  const correlationData = [
    { barangay:'Bagong Tubig', vaccination:65, diseases:8 },
    { barangay:'Poblacion 2',  vaccination:82, diseases:4 },
    { barangay:'Cahil',        vaccination:62, diseases:3 },
    { barangay:'Balimbing',    vaccination:45, diseases:2 },
    { barangay:'Bambang',      vaccination:88, diseases:1 },
    { barangay:'Poblacion 4',  vaccination:75, diseases:2 },
    { barangay:'Poblacion 1',  vaccination:92, diseases:1 },
    { barangay:'Poblacion 3',  vaccination:78, diseases:3 },
  ];

  const radarData = [
    { metric:'Vaccination Rate', barangay1:65, barangay2:88, barangay3:82 },
    { metric:'Disease Cases',    barangay1:80, barangay2:20, barangay3:40 },
    { metric:'Mortality Rate',   barangay1:75, barangay2:15, barangay3:45 },
    { metric:'Response Time',    barangay1:60, barangay2:90, barangay3:75 },
    { metric:'Compliance',       barangay1:70, barangay2:95, barangay3:85 },
  ];

  const rankings = [
    { rank:1, barangay:'Bambang',     score:95, vaccination:88, diseases:1, change:'+2' },
    { rank:2, barangay:'Poblacion 1', score:92, vaccination:92, diseases:1, change:'0'  },
    { rank:3, barangay:'Poblacion 4', score:87, vaccination:75, diseases:2, change:'+1' },
    { rank:4, barangay:'Poblacion 2', score:82, vaccination:82, diseases:4, change:'-1' },
    { rank:5, barangay:'Poblacion 3', score:78, vaccination:78, diseases:3, change:'0'  },
    { rank:6, barangay:'Cahil',       score:71, vaccination:62, diseases:3, change:'-2' },
    { rank:7, barangay:'Bagong Tubig',score:58, vaccination:65, diseases:8, change:'0'  },
    { rank:8, barangay:'Balimbing',   score:52, vaccination:45, diseases:2, change:'-1' },
  ];

  const RANK_MEDAL: Record<number,{bg:string;text:string}> = {
    1: { bg:'#fbbf24', text:'#451a03' },
    2: { bg:'#94a3b8', text:'#0f172a' },
    3: { bg:'#f97316', text:'#431407' },
  };

  const TABS = [
    { key:'barangay',    label:'Barangay vs Barangay'      },
    { key:'period',      label:'Current vs Previous Period' },
    { key:'correlation', label:'Vaccination vs Disease'     },
  ] as const;

  const CHART_AXIS = {
    tick: { fontSize:11, fill:'#94a3b8', fontWeight:500 },
    axisLine: false as const,
    tickLine: false as const,
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-[#14532d] to-[#16a34a] px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Comparative Analytics</h3>
              <p className="text-white/70 text-sm mt-0.5">Multi-dimensional comparison and trend analysis</p>
            </div>
          </div>

          {/* Segment control */}
          <div className="flex gap-1 bg-white/10 border border-white/20 p-1 rounded-xl">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setComparisonType(t.key)}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={comparisonType === t.key
                  ? { background:'#fff', color:'#16a34a', boxShadow:'0 2px 8px rgba(0,0,0,0.15)' }
                  : { color:'rgba(255,255,255,0.75)' }
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6">

        {/* ══ BARANGAY vs BARANGAY ══════════════════════════════════════════ */}
        {comparisonType === 'barangay' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Bar chart */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="mb-5">
                  <p className="font-bold text-slate-800">Performance Metrics by Barangay</p>
                  <p className="text-xs text-slate-400 mt-0.5">Vaccination % vs Disease Cases</p>
                </div>
                <div className="flex gap-4 mb-4">
                  {[['Vaccination %','#16a34a'],['Disease Cases','#ef4444']].map(([n,c])=>(
                    <div key={n} className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <span className="w-3 h-3 rounded-sm" style={{background:c as string}}/>
                      {n}
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={270}>
                  <BarChart data={barangayComparison} barSize={14} barGap={3}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                    <XAxis dataKey="barangay" angle={-35} textAnchor="end" height={70} {...CHART_AXIS}/>
                    <YAxis {...CHART_AXIS}/>
                    <Tooltip content={<ChartTooltip/>} cursor={{fill:'#f8fafc'}}/>
                    <Bar dataKey="vaccination" fill="#16a34a" radius={[4,4,0,0]} name="Vaccination %"/>
                    <Bar dataKey="diseases"    fill="#ef4444" radius={[4,4,0,0]} name="Disease Cases"/>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Radar chart */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="mb-5">
                  <p className="font-bold text-slate-800">Multi-Metric Comparison</p>
                  <p className="text-xs text-slate-400 mt-0.5">Top 3 barangays across 5 metrics</p>
                </div>
                <div className="flex gap-4 mb-3 flex-wrap">
                  {[['Bagong Tubig','#ef4444'],['Bambang','#16a34a'],['Poblacion 2','#2563eb']].map(([n,c])=>(
                    <div key={n} className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <span className="w-3 h-3 rounded-full" style={{background:c as string}}/>
                      {n}
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={270}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0"/>
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize:10, fill:'#94a3b8', fontWeight:600 }}/>
                    <PolarRadiusAxis angle={90} domain={[0,100]} tick={{ fontSize:9, fill:'#cbd5e1' }}/>
                    <Radar name="Bagong Tubig" dataKey="barangay1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2}/>
                    <Radar name="Bambang"      dataKey="barangay2" stroke="#16a34a" fill="#16a34a" fillOpacity={0.2} strokeWidth={2}/>
                    <Radar name="Poblacion 2"  dataKey="barangay3" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} strokeWidth={2}/>
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Rankings table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="font-bold text-slate-800">Barangay Performance Ranking</p>
                <p className="text-xs text-slate-400 mt-0.5">Composite score based on vaccination, disease, and response metrics</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {['Rank','Barangay','Overall Score','Vaccination %','Disease Cases','Rank Change'].map(h=>(
                        <th key={h} className="text-left py-3 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rankings.map(item => {
                      const medal = RANK_MEDAL[item.rank];
                      return (
                        <tr key={item.rank} className="hover:bg-green-50/30 transition-colors group">
                          <td className="py-3.5 px-5">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm"
                              style={medal
                                ? { background: medal.bg, color: medal.text }
                                : { background: '#f1f5f9', color: '#64748b' }
                              }
                            >
                              {item.rank}
                            </div>
                          </td>
                          <td className="py-3.5 px-5 font-semibold text-slate-800 text-sm">{item.barangay}</td>
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width:`${item.score}%`, background:`linear-gradient(90deg,#16a34a,#4ade80)` }}
                                />
                              </div>
                              <span className="text-sm font-bold text-slate-700">{item.score}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-sm text-slate-600">{item.vaccination}%</td>
                          <td className="py-3.5 px-5 text-sm text-slate-600">{item.diseases}</td>
                          <td className="py-3.5 px-5">
                            {item.change.startsWith('+')
                              ? <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-lg w-fit"><ArrowUpRight className="w-3.5 h-3.5"/>{item.change}</span>
                              : item.change.startsWith('-')
                              ? <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-lg w-fit"><ArrowDownRight className="w-3.5 h-3.5"/>{item.change}</span>
                              : <span className="flex items-center gap-1 text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg w-fit"><Minus className="w-3.5 h-3.5"/>—</span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ PERIOD COMPARISON ════════════════════════════════════════════ */}
        {comparisonType === 'period' && (
          <div className="space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="font-bold text-slate-800">Current vs Previous Period Trends</p>
                  <p className="text-xs text-slate-400 mt-0.5">Vaccination rate & disease cases · July – December</p>
                </div>
                <div className="flex gap-4">
                  {[['Current Period','#16a34a','solid'],['Previous Period','#2563eb','dashed'],['Disease Cases','#ef4444','solid']].map(([n,c,s])=>(
                    <div key={n} className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <span className={`w-8 h-0.5 rounded`} style={{background:c as string, opacity: s==='dashed'?0.6:1}}/>
                      {n}
                    </div>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={periodComparison} margin={{top:8,right:8,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                  <XAxis dataKey="month" {...CHART_AXIS}/>
                  <YAxis {...CHART_AXIS}/>
                  <Tooltip content={<ChartTooltip/>}/>
                  <Line type="monotone" dataKey="current"  stroke="#16a34a" strokeWidth={2.5} dot={{r:5,fill:'#16a34a',strokeWidth:2,stroke:'#fff'}} activeDot={{r:7,strokeWidth:0}} name="Current Period"/>
                  <Line type="monotone" dataKey="previous" stroke="#2563eb" strokeWidth={2.5} strokeDasharray="6 3" dot={{r:5,fill:'#2563eb',strokeWidth:2,stroke:'#fff'}} activeDot={{r:7,strokeWidth:0}} name="Previous Period"/>
                  <Line type="monotone" dataKey="diseases" stroke="#ef4444" strokeWidth={2}   dot={{r:4,fill:'#ef4444',strokeWidth:2,stroke:'#fff'}} activeDot={{r:6,strokeWidth:0}} name="Disease Cases"/>
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label:'Vaccination Improvement', value:'+5.5%', sub:'vs previous 6 months', icon:TrendingUp,     from:'#15803d', to:'#16a34a' },
                { label:'Disease Reduction',       value:'-75%',  sub:'From 12 to 3 cases',   icon:Activity,       from:'#1d4ed8', to:'#2563eb' },
                { label:'Avg Response Time',       value:'-32%',  sub:'Faster interventions',  icon:ArrowDownRight, from:'#6d28d9', to:'#7c3aed' },
              ].map((c,i)=>{
                const Icon = c.icon;
                return (
                  <div key={i} className="rounded-2xl p-5 text-white shadow-lg" style={{background:`linear-gradient(135deg,${c.from},${c.to})`}}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm text-white/80 font-medium">{c.label}</p>
                        <p className="text-3xl font-black mt-1 tracking-tight">{c.value}</p>
                      </div>
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <Icon className="w-5 h-5 text-white"/>
                      </div>
                    </div>
                    <p className="text-xs text-white/70">{c.sub}</p>
                    <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white/60 rounded-full" style={{width:'70%'}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ CORRELATION VIEW ═════════════════════════════════════════════ */}
        {comparisonType === 'correlation' && (
          <div className="space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-slate-800">Vaccination Coverage vs Disease Cases</p>
                  <p className="text-xs text-slate-400 mt-0.5">Higher vaccination → fewer disease cases (inverse correlation)</p>
                </div>
                <div className="flex gap-4">
                  {[['Vaccination %','#16a34a'],['Disease Cases','#ef4444']].map(([n,c])=>(
                    <div key={n} className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <span className="w-3 h-3 rounded-sm" style={{background:c as string}}/>
                      {n}
                    </div>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={correlationData} barSize={18} barGap={3} margin={{top:8,right:8,left:0,bottom:60}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                  <XAxis dataKey="barangay" angle={-35} textAnchor="end" height={75} {...CHART_AXIS}/>
                  <YAxis yAxisId="left"  orientation="left"  tick={{fontSize:11,fill:'#16a34a'}} axisLine={false} tickLine={false}/>
                  <YAxis yAxisId="right" orientation="right" tick={{fontSize:11,fill:'#ef4444'}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<ChartTooltip/>} cursor={{fill:'#f8fafc'}}/>
                  <Bar yAxisId="left"  dataKey="vaccination" fill="#16a34a" radius={[4,4,0,0]} name="Vaccination %"/>
                  <Bar yAxisId="right" dataKey="diseases"    fill="#ef4444" radius={[4,4,0,0]} name="Disease Cases"/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Insight card */}
            <div className="flex items-start gap-4 bg-green-50 border border-green-200 rounded-2xl p-5">
              <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5 text-white"/>
              </div>
              <div>
                <p className="font-bold text-green-800 text-sm mb-1">Correlation Analysis</p>
                <p className="text-sm text-green-700 leading-relaxed">
                  Barangays with vaccination coverage above <strong>80%</strong> show <strong>60% fewer disease cases</strong> on average.
                  Priority areas with coverage below <strong>70%</strong> require immediate intervention.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}