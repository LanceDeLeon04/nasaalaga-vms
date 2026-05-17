import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  Package,
  Users,
  Syringe,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  FileCheck,
  Activity,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { SmartAlerts } from "./SmartAlerts";
import { InterventionRecommendations } from "./InterventionRecommendations";
import { ComparativeAnalytics } from "./ComparativeAnalytics";
import { MedicineIntelligence } from "./MedicineIntelligence";
import { InterventionEffectiveness } from "./InterventionEffectiveness";
import { ResourceDeployment } from "./ResourceDeployment";
import { PetSurveyChart } from "./PetSurveyChart";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";

// ── Custom tooltip components ──────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1b2d] border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      {label && (
        <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">
          {label}
        </p>
      )}
      {payload.map((p: any, i: number) => (
        <div
          key={i}
          className="flex items-center gap-2 text-sm"
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-slate-300">{p.name}:</span>
          <span className="text-white font-semibold">
            {typeof p.value === "number" &&
            p.name?.includes("₱")
              ? `₱${p.value.toLocaleString()}`
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1b2d] border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-white font-semibold">
        {payload[0].name}
      </p>
      <p className="text-slate-300 text-sm">
        ₱{payload[0].value.toLocaleString()}
      </p>
    </div>
  );
};

export function DashboardOverview() {
  const [activeTab, setActiveTab] = useState("overview");
  const [lsData, setLsData] = useState<any[]>([]);
  const [tData, setTData] = useState<any[]>([]);
  const [bData, setBData] = useState<any[]>([]);
  const [petSurvey, setPetSurvey] = useState<any>(null);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getLivestockStats(),
      api.getVaccinationTrends(),
      api.getBudget(),
      api.getPetSurveyData(),
    ]).then(([lsRes, tRes, bRes, psRes]) => {
      if (lsRes.data?.length) setLsData(lsRes.data.map((r: any) => ({ barangay: r.barangay, cattle: r.cattle, swine: r.swine, poultry: r.poultry, goats: r.goats })));
      if (tRes.data?.length) setTData(tRes.data.map((r: any) => ({ month: r.month, vaccination: r.vaccination_rate, diseases: r.diseases })));
      if (bRes.data?.length) setBData(bRes.data.map((r: any) => ({ name: r.category, value: parseFloat(r.amount), color: r.color })));
      if (psRes) setPetSurvey(psRes);
      setDbReady(true);
    }).catch(e => { console.error(e); setDbReady(true); });
  }, []);

  const livestockData = [
    {
      barangay: "Brgy 1",
      cattle: 120,
      swine: 450,
      poultry: 2300,
      goats: 80,
    },
    {
      barangay: "Brgy 2",
      cattle: 95,
      swine: 380,
      poultry: 1900,
      goats: 60,
    },
    {
      barangay: "Brgy 3",
      cattle: 150,
      swine: 520,
      poultry: 2800,
      goats: 110,
    },
    {
      barangay: "Brgy 4",
      cattle: 85,
      swine: 290,
      poultry: 1600,
      goats: 45,
    },
    {
      barangay: "Brgy 5",
      cattle: 110,
      swine: 410,
      poultry: 2100,
      goats: 70,
    },
  ];

  const trendData = [
    { month: "Jan", vaccination: 85, diseases: 12 },
    { month: "Feb", vaccination: 88, diseases: 8 },
    { month: "Mar", vaccination: 92, diseases: 5 },
    { month: "Apr", vaccination: 90, diseases: 7 },
    { month: "May", vaccination: 94, diseases: 4 },
    { month: "Jun", vaccination: 96, diseases: 3 },
  ];

  const budgetData = [
    { name: "Vaccines", value: 450000, color: "#3b82f6" },
    { name: "Equipment", value: 250000, color: "#10b981" },
    { name: "Training", value: 150000, color: "#f59e0b" },
    { name: "Operations", value: 350000, color: "#ef4444" },
  ];

  // Use DB data if available, else use hardcoded fallbacks
  const effectiveLivestock = lsData.length > 0 ? lsData : livestockData;
  const effectiveTrend = tData.length > 0 ? tData : trendData;
  const effectiveBudget = bData.length > 0 ? bData : budgetData;

  const stats = [
    {
      label: "Total Livestock",
      value: "15,847",
      icon: Package,
      gradient: "from-blue-600 to-blue-500",
      change: "+5.2%",
      changeType: "positive",
      sub: "vs last month",
    },
    {
      label: "Registered Hog Raisers",
      value: "342",
      icon: Users,
      gradient: "from-emerald-600 to-emerald-500",
      change: "+12",
      changeType: "positive",
      sub: "new this month",
    },
    {
      label: "Vaccination Coverage",
      value: "96%",
      icon: Syringe,
      gradient: "from-violet-600 to-violet-500",
      change: "+2%",
      changeType: "positive",
      sub: "vs last quarter",
    },
    {
      label: "Vaccine Utilization",
      value: "89%",
      icon: TrendingUp,
      gradient: "from-orange-500 to-amber-500",
      change: "+4%",
      changeType: "positive",
      sub: "efficiency rate",
    },
    {
      label: "Budget Utilization",
      value: "₱1.2M",
      icon: DollarSign,
      gradient: "from-teal-600 to-cyan-500",
      change: "72%",
      changeType: "neutral",
      sub: "of total budget",
    },
    {
      label: "Active Alerts",
      value: "3",
      icon: AlertTriangle,
      gradient: "from-red-600 to-rose-500",
      change: "Urgent",
      changeType: "negative",
      sub: "requires action",
    },
    {
      label: "Pending Applications",
      value: "18",
      icon: FileCheck,
      gradient: "from-amber-500 to-yellow-500",
      change: "5",
      changeType: "neutral",
      sub: "filed today",
    },
    {
      label: "System Uptime",
      value: "99.8%",
      icon: Activity,
      gradient: "from-indigo-600 to-blue-500",
      change: "Excellent",
      changeType: "positive",
      sub: "last 30 days",
    },
  ];

  const CHART_COLORS = {
    cattle: "#3b82f6",
    swine: "#ef4444",
    poultry: "#10b981",
    goats: "#f59e0b",
  };

  const tabs = [
    {
      value: "overview",
      label: "Overview",
      bg: "#2B5EA6",
      text: "#ffffff",
    },
    {
      value: "alerts",
      label: "Smart Alerts",
      bg: "#dc2626",
      text: "#ffffff",
    },
    {
      value: "interventions",
      label: "Interventions",
      bg: "#d97706",
      text: "#ffffff",
    },
    {
      value: "analytics",
      label: "Analytics",
      bg: "#16a34a",
      text: "#ffffff",
    },
    {
      value: "medicine",
      label: "Medicine Intel",
      bg: "#7c3aed",
      text: "#ffffff",
    },
    {
      value: "effectiveness",
      label: "Effectiveness",
      bg: "#0891b2",
      text: "#ffffff",
    },
    {
      value: "deployment",
      label: "Deployment",
      bg: "#ea580c",
      text: "#ffffff",
    },
  ];

  const alertSeverity = [
    {
      level: "CRITICAL",
      label: "ASF Suspected Case",
      location: "Barangay 3 — Under Investigation",
      time: "2 hours ago",
      borderColor: "#ef4444",
      bg: "#fef2f2",
      dotColor: "#ef4444",
      badgeBg: "#fee2e2",
      badgeText: "#b91c1c",
      badgeBorder: "#fca5a5",
      titleColor: "#7f1d1d",
      subColor: "#991b1b",
      timeColor: "#b91c1c",
    },
    {
      level: "MONITOR",
      label: "Rabies Case — Dog",
      location: "Barangay 1 — Quarantined",
      time: "1 day ago",
      borderColor: "#f59e0b",
      bg: "#fffbeb",
      dotColor: "#f59e0b",
      badgeBg: "#fef3c7",
      badgeText: "#92400e",
      badgeBorder: "#fcd34d",
      titleColor: "#451a03",
      subColor: "#78350f",
      timeColor: "#92400e",
    },
    {
      level: "WATCH",
      label: "Avian Flu Advisory",
      location: "Barangay 5 — Preventive Measures",
      time: "3 days ago",
      borderColor: "#f97316",
      bg: "#fff7ed",
      dotColor: "#f97316",
      badgeBg: "#ffedd5",
      badgeText: "#9a3412",
      badgeBorder: "#fdba74",
      titleColor: "#431407",
      subColor: "#7c2d12",
      timeColor: "#9a3412",
    },
  ];

  const applications = [
    {
      id: "VHC-2024-1205",
      type: "VHC Issuance",
      applicant: "Juan Dela Cruz",
      barangay: "Barangay 1",
      date: "Dec 14, 2024",
      status: "For Validation",
      statusStyle:
        "bg-amber-500/15 text-amber-400 border border-amber-500/25",
    },
    {
      id: "HR-2024-1204",
      type: "Hog Raiser Registration",
      applicant: "Maria Santos",
      barangay: "Barangay 3",
      date: "Dec 13, 2024",
      status: "Pending",
      statusStyle:
        "bg-blue-500/15 text-blue-400 border border-blue-500/25",
    },
    {
      id: "PCIC-2024-1203",
      type: "Livestock Insurance",
      applicant: "Pedro Reyes",
      barangay: "Barangay 2",
      date: "Dec 12, 2024",
      status: "For Validation",
      statusStyle:
        "bg-amber-500/15 text-amber-400 border border-amber-500/25",
    },
  ];

  return (
    <div className="space-y-6 min-h-screen">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-7 rounded-full bg-gradient-to-b from-blue-500 to-blue-600" />
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Dashboard Overview
            </h2>
          </div>
          <p className="text-slate-500 text-sm pl-4">
            Real-time monitoring and analytics for Calaca City
            Veterinary Services
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-700">
            Live · Updated just now
          </span>
        </div>
      </div>

      {/* ── Tabbed Navigation ─────────────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="flex w-full gap-1 bg-slate-100 border border-slate-200 p-1.5 rounded-2xl h-auto flex-wrap">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex-1 min-w-fit px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border border-transparent"
                style={
                  isActive
                    ? {
                        backgroundColor: tab.bg,
                        color: tab.text,
                        boxShadow: `0 2px 8px ${tab.bg}55`,
                        borderColor: "transparent",
                      }
                    : {
                        color: "#64748b",
                        backgroundColor: "transparent",
                      }
                }
              >
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ── Overview Tab ──────────────────────────────────────────────── */}
        <TabsContent
          value="overview"
          className="space-y-6 mt-6"
        >
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div
                  key={i}
                  className="group relative bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300 overflow-hidden"
                >
                  {/* Subtle top accent bar */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${stat.gradient} opacity-60 group-hover:opacity-100 transition-opacity`}
                  />

                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-sm`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                        stat.changeType === "positive"
                          ? "bg-emerald-50 text-emerald-700"
                          : stat.changeType === "negative"
                            ? "bg-red-50 text-red-600"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {stat.changeType === "positive" && (
                        <ArrowUpRight className="w-3 h-3" />
                      )}
                      {stat.changeType === "negative" && (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {stat.changeType === "neutral" && (
                        <Minus className="w-3 h-3" />
                      )}
                      {stat.change}
                    </div>
                  </div>

                  <p className="text-2xl font-bold text-slate-900 mb-0.5 tracking-tight">
                    {stat.value}
                  </p>
                  <p className="text-sm font-medium text-slate-600">
                    {stat.label}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {stat.sub}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Livestock Distribution */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="font-bold text-slate-800 text-base">
                    Livestock Distribution
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Per barangay · All species
                  </p>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {[
                    ["Cattle", "#3b82f6"],
                    ["Swine", "#ef4444"],
                    ["Poultry", "#10b981"],
                    ["Goats", "#f59e0b"],
                  ].map(([n, c]) => (
                    <div
                      key={n}
                      className="flex items-center gap-1.5"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{ backgroundColor: c as string }}
                      />
                      <span className="text-xs text-slate-500 font-medium">
                        {n}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={effectiveLivestock}
                  barSize={10}
                  barGap={2}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="barangay"
                    tick={{
                      fontSize: 11,
                      fill: "#94a3b8",
                      fontWeight: 500,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ fill: "#f8fafc" }}
                  />
                  <Bar
                    dataKey="cattle"
                    fill={CHART_COLORS.cattle}
                    radius={[3, 3, 0, 0]}
                    name="Cattle"
                  />
                  <Bar
                    dataKey="swine"
                    fill={CHART_COLORS.swine}
                    radius={[3, 3, 0, 0]}
                    name="Swine"
                  />
                  <Bar
                    dataKey="poultry"
                    fill={CHART_COLORS.poultry}
                    radius={[3, 3, 0, 0]}
                    name="Poultry"
                  />
                  <Bar
                    dataKey="goats"
                    fill={CHART_COLORS.goats}
                    radius={[3, 3, 0, 0]}
                    name="Goats"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Vaccination & Disease Trends */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="font-bold text-slate-800 text-base">
                    Vaccination & Disease Trends
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    January – June 2024
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-8 h-0.5 rounded bg-emerald-500" />
                    <span className="text-xs text-slate-500 font-medium">
                      Vaccination
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-8 h-0.5 rounded bg-red-400" />
                    <span className="text-xs text-slate-500 font-medium">
                      Disease
                    </span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={effectiveTrend}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{
                      fontSize: 11,
                      fill: "#94a3b8",
                      fontWeight: 500,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="vaccination"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{
                      fill: "#10b981",
                      r: 4,
                      strokeWidth: 0,
                    }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    name="Vaccination Rate (%)"
                  />
                  <Line
                    type="monotone"
                    dataKey="diseases"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    dot={{
                      fill: "#ef4444",
                      r: 4,
                      strokeWidth: 0,
                    }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    name="Disease Cases"
                    strokeDasharray="5 3"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Budget Utilization */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="font-bold text-slate-800 text-base">
                    Budget Allocation
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    FY 2024 · ₱1,200,000 total
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="55%" height={220}>
                  <PieChart>
                    <Pie
                      data={effectiveBudget}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={88}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {effectiveBudget.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.color}
                          stroke="none"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  {effectiveBudget.map((item, i) => {
                    const pct = Math.round(
                      (item.value /
                        budgetData.reduce(
                          (s, d) => s + d.value,
                          0,
                        )) *
                        100,
                    );
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-sm shrink-0"
                              style={{
                                backgroundColor: item.color,
                              }}
                            />
                            <span className="text-xs font-semibold text-slate-700">
                              {item.name}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-slate-800">
                            {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          ₱{item.value.toLocaleString()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Pet Survey Chart */}
            <PetSurveyChart />

            {/* Active Disease Alerts */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="font-bold text-slate-800 text-base">
                    Active Disease Alerts
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    3 open cases requiring attention
                  </p>
                </div>
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  3 Active
                </span>
              </div>
              <div className="space-y-3">
                {alertSeverity.map((a, i) => (
                  <div
                    key={i}
                    className="rounded-r-xl p-4 transition-all hover:scale-[1.01] border-l-4"
                    style={{
                      backgroundColor: a.bg,
                      borderLeftColor: a.borderColor,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                          style={{
                            backgroundColor: a.dotColor,
                          }}
                        />
                        <div className="min-w-0">
                          <p
                            className="font-semibold text-sm"
                            style={{ color: a.titleColor }}
                          >
                            {a.label}
                          </p>
                          <p
                            className="text-xs truncate mt-0.5"
                            style={{ color: a.subColor }}
                          >
                            {a.location}
                          </p>
                          <p
                            className="text-[10px] mt-1 flex items-center gap-1"
                            style={{ color: a.timeColor }}
                          >
                            <span
                              className="w-3 h-px inline-block"
                              style={{
                                backgroundColor: a.timeColor,
                              }}
                            />
                            {a.time}
                          </p>
                        </div>
                      </div>
                      <span
                        className="px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider shrink-0 border"
                        style={{
                          backgroundColor: a.badgeBg,
                          color: a.badgeText,
                          borderColor: a.badgeBorder,
                        }}
                      >
                        {a.level}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pending Applications Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">
                  Pending Applications & Requests
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  18 total · 5 filed today
                </p>
              </div>
              <button className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                View all{" "}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100">
                    {[
                      "Application ID",
                      "Service Type",
                      "Applicant",
                      "Barangay",
                      "Date Filed",
                      "Status",
                      "Action",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left py-3 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {applications.map((app, i) => (
                    <tr
                      key={i}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      <td className="py-3.5 px-5">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          {app.id}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-sm text-slate-700 font-medium">
                        {app.type}
                      </td>
                      <td className="py-3.5 px-5 text-sm text-slate-600">
                        {app.applicant}
                      </td>
                      <td className="py-3.5 px-5 text-sm text-slate-500">
                        {app.barangay}
                      </td>
                      <td className="py-3.5 px-5 text-sm text-slate-500">
                        {app.date}
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${app.statusStyle}`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <button className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors group-hover:gap-2">
                          Review{" "}
                          <ChevronRight className="w-3.5 h-3.5 transition-all" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── Other Tabs (unchanged) ─────────────────────────────────── */}
        <TabsContent value="alerts" className="mt-6">
          <SmartAlerts />
        </TabsContent>
        <TabsContent value="interventions" className="mt-6">
          <InterventionRecommendations />
        </TabsContent>
        <TabsContent value="analytics" className="mt-6">
          <ComparativeAnalytics />
        </TabsContent>
        <TabsContent value="medicine" className="mt-6">
          <MedicineIntelligence />
        </TabsContent>
        <TabsContent value="effectiveness" className="mt-6">
          <InterventionEffectiveness />
        </TabsContent>
        <TabsContent value="deployment" className="mt-6">
          <ResourceDeployment />
        </TabsContent>
      </Tabs>
    </div>
  );
}