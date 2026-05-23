import { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Printer, Search, Calendar, Award, RefreshCw, BarChart2, Activity, Package, Users, Syringe, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

const CHART_COLORS = ['#2B5EA6','#60A85C','#F39C3A','#E85D3B','#8B5CF6','#06B6D4','#EC4899'];

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

export function ReportsCertificates() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [vacCoverage, setVacCoverage] = useState<any[]>([]);
  const [medMovement, setMedMovement] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeReport, setActiveReport] = useState('overview');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, vacRes, medRes] = await Promise.all([
        api.getReportsSummary({ startDate, endDate }),
        api.getVaccinationCoverageReport(),
        api.getMedicineMovementReport(),
      ]);
      setSummary(sumRes);
      setVacCoverage(vacRes.byBarangay || []);
      setMedMovement(medRes);
    } catch (err: any) {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Export helpers ─────────────────────────────────────────────────────
  const exportCSV = (data: any[], filename: string) => {
    if (!data?.length) { toast.error('No data to export'); return; }
    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filename}`);
  };

  const exportText = (title: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${title.replace(/\s+/g,'_')}_${endDate}.txt`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded');
  };

  const generateSummaryReport = () => {
    if (!summary) { toast.error('Load report data first'); return; }
    const pets = summary.pets?.bySpecies || [];
    const ls = summary.livestock?.byType || [];
    const lines = [
      `NASAALAGA VMS - SUMMARY REPORT`,
      `Generated: ${new Date().toLocaleString('en-PH')}`,
      `Period: ${startDate} to ${endDate}`,
      ``,
      `=== PET STATISTICS ===`,
      ...pets.map((p: any) => `${p.species}: ${p.count} total, ${p.vaccinated} vaccinated (${p.count > 0 ? Math.round(p.vaccinated/p.count*100) : 0}%), ${p.impounded} impounded`),
      ``,
      `=== LIVESTOCK STATISTICS ===`,
      ...ls.map((l: any) => `${l.animal_type}: ${l.total} head (${l.farm_count} farms), ${l.healthy} healthy, ${l.sick} sick`),
      ``,
      `=== VACCINATION ===`,
      `Total vaccinations this period: ${summary.vaccinations?.this_period || 0}`,
      `This month: ${summary.vaccinations?.this_month || 0}`,
      ``,
      `=== BITING INCIDENTS ===`,
      `Total: ${summary.bitingIncidents?.total || 0}`,
      `Confirmed Rabies: ${summary.bitingIncidents?.confirmed_rabies || 0}`,
      `Resolved: ${summary.bitingIncidents?.resolved || 0}`,
      ``,
      `=== FEEDBACK ===`,
      `Total submissions: ${summary.feedback?.total || 0}`,
      `Resolved: ${summary.feedback?.resolved || 0}`,
      ``,
      `=== LOW STOCK MEDICINES ===`,
      ...(summary.inventory?.lowStock || []).map((m: any) => `${m.name}: ${m.quantity} ${m.unit} (reorder at ${m.reorder_level})`),
      ``,
      `=== DISEASE EVENTS ===`,
      ...(summary.diseaseEvents || []).map((d: any) => `${d.disease} (${d.animal_type}) - ${d.barangay}: ${d.cases} cases, Status: ${d.status}`),
    ];
    exportText('Summary_Report', lines.join('\n'));
  };

  // Report sections
  const reportTabs = [
    { id: 'overview', label: 'Summary', icon: BarChart2 },
    { id: 'vaccination', label: 'Vaccination Coverage', icon: Syringe },
    { id: 'livestock', label: 'Livestock', icon: Package },
    { id: 'pets', label: 'Pets', icon: Users },
    { id: 'medicine', label: 'Medicine Movement', icon: Activity },
    { id: 'disease', label: 'Disease Events', icon: AlertTriangle },
  ];

  const petSpeciesData = (summary?.pets?.bySpecies || []).map((p: any) => ({
    name: p.species, total: parseInt(p.count), vaccinated: parseInt(p.vaccinated),
    unvaccinated: parseInt(p.count) - parseInt(p.vaccinated), impounded: parseInt(p.impounded),
  }));

  const livestockData = (summary?.livestock?.byType || []).map((l: any, i: number) => ({
    name: l.animal_type, total: parseInt(l.total), farms: parseInt(l.farm_count),
    healthy: parseInt(l.healthy), sick: parseInt(l.sick), color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const vaxByMonthData = (summary?.vaccinations?.byMonth || []).map((v: any) => ({
    month: v.month, vaccinations: parseInt(v.count),
  }));

  const vacCoverageFiltered = vacCoverage.filter(v =>
    !searchTerm || v.barangay?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800 mb-1">Reports & Analytics</h2>
          <p className="text-gray-600">Real-time data from the database — all figures are live</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={generateSummaryReport} className="flex items-center gap-2 px-4 py-2 bg-[#60A85C] text-white rounded-md hover:bg-[#4a8a47] text-sm">
            <Download className="w-4 h-4" /> Export Summary
          </button>
        </div>
      </div>

      {/* Date Range */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">Report Period:</span>
        </div>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#2B5EA6]" />
        <span className="text-gray-500 text-sm">to</span>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#2B5EA6]" />
        <button onClick={loadData} className="px-4 py-1.5 bg-[#2B5EA6] text-white rounded text-sm hover:bg-[#234a85]">Apply</button>
      </div>

      {/* Quick Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard label="Total Pets" value={(summary.pets?.bySpecies||[]).reduce((s:number,p:any)=>s+parseInt(p.count||0),0)} icon={Users} color="bg-blue-500" />
          <StatCard label="Total Livestock" value={(summary.livestock?.byType||[]).reduce((s:number,l:any)=>s+parseInt(l.total||0),0)} icon={Package} color="bg-green-500" />
          <StatCard label="Vaccinations This Period" value={summary.vaccinations?.this_period || 0} icon={Syringe} color="bg-violet-500" />
          <StatCard label="Biting Incidents" value={summary.bitingIncidents?.total || 0} icon={AlertTriangle} color="bg-orange-500" />
          <StatCard label="Feedback/Complaints" value={summary.feedback?.total || 0} icon={FileText} color="bg-teal-500" />
          <StatCard label="Low Stock Items" value={summary.inventory?.lowStock?.length || 0} icon={Activity} color="bg-red-500" />
        </div>
      )}

      {/* Report Tabs */}
      <div className="flex flex-wrap gap-2">
        {reportTabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveReport(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeReport === tab.id ? 'bg-[#2B5EA6] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">Loading data from database...</div>
      ) : (
        <>
          {/* OVERVIEW */}
          {activeReport === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pet Species */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">Pet Population by Species</h3>
                  <button onClick={() => exportCSV(petSpeciesData, 'pet_species_report.csv')} className="flex items-center gap-1 text-xs text-[#2B5EA6] hover:underline">
                    <Download className="w-3 h-3" /> CSV
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={petSpeciesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="vaccinated" name="Vaccinated" fill="#60A85C" radius={[3,3,0,0]} />
                    <Bar dataKey="unvaccinated" name="Unvaccinated" fill="#E85D3B" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Livestock by Type */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">Livestock by Type</h3>
                  <button onClick={() => exportCSV(livestockData, 'livestock_report.csv')} className="flex items-center gap-1 text-xs text-[#2B5EA6] hover:underline">
                    <Download className="w-3 h-3" /> CSV
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={livestockData} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name, value}: any) => `${name}: ${value}`}>
                      {livestockData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${v} head`, 'Total']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Monthly Vaccinations */}
              {vaxByMonthData.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 md:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800">Monthly Vaccination History (Last 12 Months)</h3>
                    <button onClick={() => exportCSV(vaxByMonthData, 'vaccination_monthly.csv')} className="flex items-center gap-1 text-xs text-[#2B5EA6] hover:underline">
                      <Download className="w-3 h-3" /> CSV
                    </button>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={vaxByMonthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="vaccinations" stroke="#60A85C" strokeWidth={2.5} dot={{ fill: '#60A85C', r: 4 }} name="Vaccinations" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Disease Events */}
              {(summary?.diseaseEvents || []).length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">Disease Events</h3>
                  <div className="space-y-2">
                    {summary.diseaseEvents.map((d: any, i: number) => (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${d.status === 'Active' ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'}`}>
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${d.status === 'Active' ? 'bg-red-500' : 'bg-green-500'}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-700">{d.disease}</p>
                          <p className="text-xs text-gray-500">{d.animal_type} · {d.barangay} · {d.cases} cases · {d.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lost & Found */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Lost & Found Summary (This Period)</h3>
                {summary?.lostFound ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Total Reports', value: summary.lostFound.total, color: 'text-gray-900' },
                      { label: 'Lost', value: summary.lostFound.lost, color: 'text-orange-600' },
                      { label: 'Found', value: summary.lostFound.found, color: 'text-blue-600' },
                      { label: 'Resolved', value: summary.lostFound.resolved, color: 'text-green-600' },
                    ].map(item => (
                      <div key={item.label} className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className={`text-2xl font-bold ${item.color}`}>{item.value || 0}</p>
                        <p className="text-xs text-gray-500">{item.label}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-gray-400 text-sm">No data</p>}
              </div>
            </div>
          )}

          {/* VACCINATION COVERAGE */}
          {activeReport === 'vaccination' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">Vaccination Coverage by Barangay</h3>
                  <button onClick={() => exportCSV(vacCoverage, 'vaccination_coverage_by_barangay.csv')} className="flex items-center gap-2 px-3 py-1.5 bg-[#60A85C] text-white rounded text-sm">
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                </div>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input placeholder="Filter by barangay..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#2B5EA6]" />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Barangay','Total Pets','Vaccinated','Due Soon','Not Vaccinated','Coverage Rate'].map(h => (
                          <th key={h} className="text-left py-2 px-3 text-gray-600 text-xs font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vacCoverageFiltered.length === 0 ? (
                        <tr><td colSpan={6} className="py-8 text-center text-gray-400">No data</td></tr>
                      ) : vacCoverageFiltered.map((row, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-3 font-medium text-gray-700">{row.barangay}</td>
                          <td className="py-2 px-3 text-gray-600">{row.total_pets}</td>
                          <td className="py-2 px-3 text-green-700 font-medium">{row.vaccinated}</td>
                          <td className="py-2 px-3 text-yellow-600">{row.due_soon}</td>
                          <td className="py-2 px-3 text-red-600">{row.not_vaccinated}</td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400"
                                  style={{ width: `${parseFloat(row.coverage_rate)||0}%` }} />
                              </div>
                              <span className={`text-xs font-bold ${parseFloat(row.coverage_rate)>=80?'text-green-600':parseFloat(row.coverage_rate)>=50?'text-yellow-600':'text-red-600'}`}>
                                {parseFloat(row.coverage_rate)||0}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* LIVESTOCK REPORT */}
          {activeReport === 'livestock' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">Livestock by Barangay</h3>
                  <button onClick={() => exportCSV(summary?.livestock?.byBarangay || [], 'livestock_by_barangay.csv')} className="flex items-center gap-2 px-3 py-1.5 bg-[#60A85C] text-white rounded text-sm">
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Barangay','Total','Cattle','Swine','Poultry','Goats','Carabao'].map(h => (
                          <th key={h} className="text-left py-2 px-3 text-gray-600 text-xs font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(summary?.livestock?.byBarangay || []).map((row: any, i: number) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-3 font-medium text-gray-700">{row.barangay}</td>
                          <td className="py-2 px-3 font-bold text-gray-800">{row.livestock || row.total}</td>
                          <td className="py-2 px-3 text-blue-600">{row.cattle || 0}</td>
                          <td className="py-2 px-3 text-red-500">{row.swine || 0}</td>
                          <td className="py-2 px-3 text-green-600">{row.poultry || 0}</td>
                          <td className="py-2 px-3 text-yellow-600">{row.goats || 0}</td>
                          <td className="py-2 px-3 text-purple-600">{row.carabao || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mortality section */}
                {(summary?.mortality || []).length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-700 mb-3">Mortality Reports (This Period)</h4>
                    <div className="space-y-2">
                      {summary.mortality.map((m: any, i: number) => (
                        <div key={i} className="flex items-center gap-4 p-3 bg-red-50 rounded-lg border border-red-100 text-sm">
                          <span className="font-medium text-red-700">{m.animal_type}</span>
                          <span className="text-gray-600">{m.total} deaths in {m.incidents} incident(s)</span>
                          <span className="text-gray-500 text-xs">{m.causes}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PETS REPORT */}
          {activeReport === 'pets' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">Pets by Barangay</h3>
                  <button onClick={() => exportCSV(summary?.pets?.byBarangay || [], 'pets_by_barangay.csv')} className="flex items-center gap-2 px-3 py-1.5 bg-[#60A85C] text-white rounded text-sm">
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Barangay','Total Pets','Vaccinated','Active','Coverage %'].map(h => (
                          <th key={h} className="text-left py-2 px-3 text-gray-600 text-xs font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(summary?.pets?.byBarangay || []).map((row: any, i: number) => {
                        const rate = row.pets > 0 ? Math.round(row.vaccinated / row.pets * 100) : 0;
                        return (
                          <tr key={i} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-3 font-medium text-gray-700">{row.barangay}</td>
                            <td className="py-2 px-3 text-gray-800 font-bold">{row.pets}</td>
                            <td className="py-2 px-3 text-green-600">{row.vaccinated}</td>
                            <td className="py-2 px-3 text-blue-600">{row.active}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 text-xs rounded font-bold ${rate>=80?'bg-green-100 text-green-700':rate>=50?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>{rate}%</span>
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

          {/* MEDICINE MOVEMENT */}
          {activeReport === 'medicine' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">Medicine Inventory Status</h3>
                  <button onClick={() => exportCSV(medMovement?.medicines || [], 'medicine_inventory.csv')} className="flex items-center gap-2 px-3 py-1.5 bg-[#60A85C] text-white rounded text-sm">
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Medicine','Category','Qty','Unit','Reorder Level','Status','Expiry'].map(h => (
                          <th key={h} className="text-left py-2 px-3 text-gray-600 text-xs font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(medMovement?.medicines || []).map((m: any, i: number) => {
                        const isLow = m.quantity <= m.reorder_level;
                        const isCritical = m.quantity === 0;
                        return (
                          <tr key={i} className={`border-b hover:bg-gray-50 ${isCritical?'bg-red-50':isLow?'bg-yellow-50':''}`}>
                            <td className="py-2 px-3 font-medium text-gray-700">{m.name}</td>
                            <td className="py-2 px-3 text-gray-500">{m.category}</td>
                            <td className={`py-2 px-3 font-bold ${isCritical?'text-red-600':isLow?'text-yellow-600':'text-gray-800'}`}>{m.quantity}</td>
                            <td className="py-2 px-3 text-gray-500">{m.unit}</td>
                            <td className="py-2 px-3 text-gray-500">{m.reorder_level}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 text-xs rounded font-bold ${isCritical?'bg-red-100 text-red-700':isLow?'bg-yellow-100 text-yellow-700':'bg-green-100 text-green-700'}`}>
                                {isCritical?'Out of Stock':isLow?'Low Stock':'Adequate'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-gray-500 text-xs">{m.expiry_date ? new Date(m.expiry_date).toLocaleDateString('en-PH') : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Vaccine usage */}
              {(medMovement?.vaccineUsage || []).length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">Vaccine Usage (Linked to Vaccination History)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>{['Vaccine Name','Category','Times Used','Unique Pets','First Used','Last Used'].map(h=><th key={h} className="text-left py-2 px-3 text-gray-600 text-xs">{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {medMovement.vaccineUsage.map((v: any, i: number) => (
                          <tr key={i} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-3 font-medium text-gray-700">{v.name || 'Unknown'}</td>
                            <td className="py-2 px-3 text-gray-500">{v.category}</td>
                            <td className="py-2 px-3 font-bold text-blue-600">{v.times_used}</td>
                            <td className="py-2 px-3 text-gray-600">{v.unique_pets}</td>
                            <td className="py-2 px-3 text-gray-500 text-xs">{v.first_used ? new Date(v.first_used).toLocaleDateString('en-PH') : '—'}</td>
                            <td className="py-2 px-3 text-gray-500 text-xs">{v.last_used ? new Date(v.last_used).toLocaleDateString('en-PH') : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DISEASE EVENTS */}
          {activeReport === 'disease' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">Disease Events & Outbreak Data</h3>
                  <button onClick={() => exportCSV(summary?.diseaseEvents || [], 'disease_events.csv')} className="flex items-center gap-2 px-3 py-1.5 bg-[#60A85C] text-white rounded text-sm">
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>{['Disease','Animal Type','Barangay','Cases','Deaths','Status','Date Reported'].map(h=><th key={h} className="text-left py-2 px-3 text-gray-600 text-xs">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {(summary?.diseaseEvents || []).length === 0 ? (
                        <tr><td colSpan={7} className="py-8 text-center text-gray-400">No disease events in this period</td></tr>
                      ) : (summary?.diseaseEvents || []).map((d: any, i: number) => (
                        <tr key={i} className={`border-b hover:bg-gray-50 ${d.status==='Active'?'bg-red-50/30':''}`}>
                          <td className="py-2 px-3 font-medium text-gray-700">{d.disease}</td>
                          <td className="py-2 px-3 text-gray-500">{d.animal_type}</td>
                          <td className="py-2 px-3 text-gray-600">{d.barangay}</td>
                          <td className="py-2 px-3 font-bold text-orange-600">{d.cases}</td>
                          <td className="py-2 px-3 font-bold text-red-600">{d.deaths || 0}</td>
                          <td className="py-2 px-3"><span className={`px-2 py-0.5 text-xs rounded font-bold ${d.status==='Active'?'bg-red-100 text-red-700':'bg-green-100 text-green-700'}`}>{d.status}</span></td>
                          <td className="py-2 px-3 text-gray-500 text-xs">{new Date(d.date_reported).toLocaleDateString('en-PH')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Biting incidents */}
              {summary?.bitingIncidents && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">Biting Incidents Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Total', value: summary.bitingIncidents.total, color: 'text-gray-800' },
                      { label: 'Confirmed Rabies', value: summary.bitingIncidents.confirmed_rabies, color: 'text-red-600' },
                      { label: 'Resolved', value: summary.bitingIncidents.resolved, color: 'text-green-600' },
                      { label: 'Open', value: (parseInt(summary.bitingIncidents.total||0) - parseInt(summary.bitingIncidents.resolved||0)), color: 'text-orange-600' },
                    ].map(item => (
                      <div key={item.label} className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className={`text-3xl font-bold ${item.color}`}>{item.value || 0}</p>
                        <p className="text-sm text-gray-500 mt-1">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
