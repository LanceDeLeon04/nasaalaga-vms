import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Dog, Cat, TrendingUp, CheckCircle, AlertTriangle } from "lucide-react";

export function PetSurveyChart() {
  const [surveyData, setSurveyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPetSurveyData(); }, []);

  const fetchPetSurveyData = async () => {
    try {
      const response = await fetch(`/api/pets/survey-data`, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('nasaalaga_token') || ''}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setSurveyData(data);
    } catch (error) {
      console.error('Error fetching pet survey data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-slate-100 rounded w-2/5" />
          <div className="h-3 bg-slate-100 rounded w-1/4" />
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl" />)}
          </div>
          <div className="h-48 bg-slate-50 rounded-xl mt-2" />
        </div>
      </div>
    );
  }

  if (!surveyData) return null;

  const dogs = surveyData.registered?.dogs ?? 0;
  const cats = surveyData.registered?.cats ?? 0;
  const totalSurveyed = (surveyData.survey?.totalDogs ?? 0) + (surveyData.survey?.totalCats ?? 0);
  const totalRegistered = surveyData.registered?.total ?? 0;
  const overallRate = parseFloat(surveyData.registrationRate?.overall ?? '0');
  const dogRate = parseFloat(surveyData.registrationRate?.dogs ?? '0');
  const catRate = parseFloat(surveyData.registrationRate?.cats ?? '0');

  const chartData = [
    {
      name: "Dogs",
      Surveyed: surveyData.survey?.totalDogs ?? 0,
      Registered: dogs,
    },
    {
      name: "Cats",
      Surveyed: surveyData.survey?.totalCats ?? 0,
      Registered: cats,
    },
  ];

  const statusColor = overallRate >= 80
    ? { text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", icon: <CheckCircle className="w-3.5 h-3.5" />, label: "Target achieved" }
    : overallRate >= 50
    ? { text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "Below target" }
    : { text: "text-red-600", bg: "bg-red-50", border: "border-red-200", icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "Critical" };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="font-bold text-slate-800 text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#2B5EA6]" />
            Household Pet Survey vs Registration
          </p>
          <p className="text-xs text-slate-400 mt-0.5">December 2025 · Calaca City Veterinary Office</p>
        </div>
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusColor.bg} ${statusColor.border} ${statusColor.text}`}>
          {statusColor.icon}
          {overallRate}% overall — {statusColor.label}
        </span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {/* Dogs */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Dog className="w-4 h-4 text-[#60A85C]" />
            <span className="text-xs font-semibold text-slate-600">Dogs</span>
          </div>
          <div className="text-2xl font-bold text-slate-800 leading-none">{dogs.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-1">of {(surveyData.survey?.totalDogs ?? 0).toLocaleString()} surveyed</div>
          {/* Progress bar */}
          <div className="mt-2.5 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#60A85C] rounded-full transition-all" style={{ width: `${Math.min(dogRate, 100)}%` }} />
          </div>
          <div className="text-[11px] font-semibold text-[#60A85C] mt-1">{dogRate}% registered</div>
        </div>

        {/* Cats */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Cat className="w-4 h-4 text-[#F39C3A]" />
            <span className="text-xs font-semibold text-slate-600">Cats</span>
          </div>
          <div className="text-2xl font-bold text-slate-800 leading-none">{cats.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-1">of {(surveyData.survey?.totalCats ?? 0).toLocaleString()} surveyed</div>
          <div className="mt-2.5 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#F39C3A] rounded-full transition-all" style={{ width: `${Math.min(catRate, 100)}%` }} />
          </div>
          <div className="text-[11px] font-semibold text-[#F39C3A] mt-1">{catRate}% registered</div>
        </div>

        {/* Overall */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <TrendingUp className="w-4 h-4 text-[#2B5EA6]" />
            <span className="text-xs font-semibold text-slate-600">Overall</span>
          </div>
          <div className="text-2xl font-bold text-slate-800 leading-none">{overallRate}%</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {totalRegistered.toLocaleString()} of {totalSurveyed.toLocaleString()}
          </div>
          <div className="mt-2.5 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#2B5EA6] rounded-full transition-all" style={{ width: `${Math.min(overallRate, 100)}%` }} />
          </div>
          <div className={`text-[11px] font-semibold mt-1 ${statusColor.text}`}>
            {statusColor.label}
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} barGap={6} barCategoryGap="35%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)',
              padding: '10px 14px',
              fontSize: 13,
            }}
            labelStyle={{ color: '#1e293b', fontWeight: 700, marginBottom: 4 }}
            itemStyle={{ color: '#64748b' }}
            cursor={{ fill: '#f8fafc' }}
          />
          <Bar dataKey="Surveyed" name="Surveyed" fill="#cbd5e1" radius={[5, 5, 0, 0]} />
          <Bar dataKey="Registered" name="Registered" radius={[5, 5, 0, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={`cell-${entry.name}`}
                fill={entry.name === "Dogs" ? "#60A85C" : "#F39C3A"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-slate-300" />
          <span className="text-xs text-slate-500">Surveyed (baseline)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#60A85C]" />
          <span className="text-xs text-slate-500">Registered Dogs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#F39C3A]" />
          <span className="text-xs text-slate-500">Registered Cats</span>
        </div>
      </div>
    </div>
  );
}
