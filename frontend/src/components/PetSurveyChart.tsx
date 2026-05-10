import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Dog, Cat, TrendingUp } from "lucide-react";


export function PetSurveyChart() {
  const [surveyData, setSurveyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPetSurveyData();
  }, []);

  const fetchPetSurveyData = async () => {
    try {
      const response = await fetch(
        `/api/pets/survey-data`,
        {
          headers: { 'Authorization': `Bearer ${sessionStorage.getItem('nasaalaga_token') || ''}`, 'Content-Type': 'application/json' }
        }
      );
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
      <div className="bg-gradient-to-br from-[#1a2942] to-[#0f1b2d] rounded-2xl border border-white/10 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-white/10 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-white/5 rounded"></div>
        </div>
      </div>
    );
  }

  if (!surveyData) return null;

  const chartData = [
    {
      category: "Dogs",
      Surveyed: surveyData.survey.totalDogs,
      Registered: surveyData.registered.dogs,
      color: "#60A85C"
    },
    {
      category: "Cats",
      Surveyed: surveyData.survey.totalCats,
      Registered: surveyData.registered.cats,
      color: "#F39C3A"
    }
  ];

  return (
    <div className="bg-gradient-to-br from-[#1a2942] to-[#0f1b2d] rounded-2xl border border-white/10 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#60A85C]" />
            Household Pet Survey vs Registration
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            December 2025 Survey Data
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Dog className="w-4 h-4 text-[#60A85C]" />
            <span className="text-xs text-slate-400">Dogs</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {surveyData.registered.dogs.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            of {surveyData.survey.totalDogs.toLocaleString()} surveyed
          </div>
          <div className="text-xs font-medium text-[#60A85C] mt-1">
            {surveyData.registrationRate.dogs}% registered
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Cat className="w-4 h-4 text-[#F39C3A]" />
            <span className="text-xs text-slate-400">Cats</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {surveyData.registered.cats.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            of {surveyData.survey.totalCats.toLocaleString()} surveyed
          </div>
          <div className="text-xs font-medium text-[#F39C3A] mt-1">
            {surveyData.registrationRate.cats}% registered
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-[#2B5EA6]" />
            <span className="text-xs text-slate-400">Overall Rate</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {surveyData.registrationRate.overall}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {surveyData.registered.total.toLocaleString()} of {(surveyData.survey.totalDogs + surveyData.survey.totalCats).toLocaleString()}
          </div>
          <div className={`text-xs font-medium mt-1 ${
            parseFloat(surveyData.registrationRate.overall) >= 80 ? 'text-[#60A85C]' : 
            parseFloat(surveyData.registrationRate.overall) >= 50 ? 'text-[#F39C3A]' : 
            'text-[#E85D3B]'
          }`}>
            {parseFloat(surveyData.registrationRate.overall) >= 80 ? '✓ Target achieved' : 
             parseFloat(surveyData.registrationRate.overall) >= 50 ? '⚠ Below target' : 
             '⚠ Critical - needs attention'}
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300} key="pet-survey-chart-container">
        <BarChart data={chartData} barGap={8} key="pet-survey-bar-chart">
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
          <XAxis 
            dataKey="category" 
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
          />
          <YAxis 
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#0f1b2d',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '12px'
            }}
            labelStyle={{ color: '#fff', fontWeight: 600, marginBottom: '8px' }}
            itemStyle={{ color: '#94a3b8' }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="rect"
          />
          <Bar dataKey="Surveyed" fill="#2B5EA6" radius={[8, 8, 0, 0]} name="Surveyed Pets" />
          <Bar dataKey="Registered" radius={[8, 8, 0, 0]} name="Registered Pets">
            {chartData.map((entry) => (
              <Cell key={`cell-registered-${entry.category}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Footer Note */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-xs text-slate-400 text-center">
          📊 Data from December 2025 Household Pet Survey conducted by Calaca City Veterinary Office
        </p>
      </div>
    </div>
  );
}