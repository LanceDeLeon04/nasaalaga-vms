import { useState } from "react";
import {
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Activity,
  Calendar,
  MapPin,
  BarChart3,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface Intervention {
  id: string;
  name: string;
  barangay: string;
  startDate: string;
  endDate: string;
  type:
    | "vaccination"
    | "quarantine"
    | "treatment"
    | "education";
  status: "Effective" | "Partially Effective" | "Ineffective";
  beforeMetrics: {
    diseaseCases: number;
    mortalityRate: number;
    vaccinationRate: number;
  };
  afterMetrics: {
    diseaseCases: number;
    mortalityRate: number;
    vaccinationRate: number;
  };
  improvement: {
    diseaseCases: number;
    mortalityRate: number;
    vaccinationRate: number;
  };
}

// ─── Style maps (inline — no dynamic Tailwind class names) ────────────────────

const STATUS_STYLE: Record<
  string,
  {
    bg: string;
    text: string;
    border: string;
    dot: string;
    panelBg: string;
    panelBorder: string;
  }
> = {
  Effective: {
    bg: "#16a34a",
    text: "#fff",
    border: "#16a34a",
    dot: "#4ade80",
    panelBg: "#f0fdf4",
    panelBorder: "#86efac",
  },
  "Partially Effective": {
    bg: "#d97706",
    text: "#fff",
    border: "#d97706",
    dot: "#fbbf24",
    panelBg: "#fffbeb",
    panelBorder: "#fcd34d",
  },
  Ineffective: {
    bg: "#dc2626",
    text: "#fff",
    border: "#dc2626",
    dot: "#f87171",
    panelBg: "#fef2f2",
    panelBorder: "#fca5a5",
  },
};

const TYPE_STYLE: Record<
  string,
  { bg: string; text: string; border: string; label: string }
> = {
  vaccination: {
    bg: "#eff6ff",
    text: "#1d4ed8",
    border: "#93c5fd",
    label: "Vaccination",
  },
  quarantine: {
    bg: "#fef2f2",
    text: "#b91c1c",
    border: "#fca5a5",
    label: "Quarantine",
  },
  treatment: {
    bg: "#f0fdf4",
    text: "#15803d",
    border: "#86efac",
    label: "Treatment",
  },
  education: {
    bg: "#faf5ff",
    text: "#7e22ce",
    border: "#d8b4fe",
    label: "Education",
  },
};

// ─── Custom chart tooltip ─────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1b2d] border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wider">
        Day {label}
      </p>
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
          <span className="text-white font-bold">
            {p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export function InterventionEffectiveness() {
  const [selectedIntervention, setSelectedIntervention] =
    useState<string>("int-001");

  const interventions: Intervention[] = [
    {
      id: "int-001",
      name: "Emergency ASF Quarantine & Containment",
      barangay: "Bagong Tubig",
      startDate: "Nov 15, 2024",
      endDate: "Dec 10, 2024",
      type: "quarantine",
      status: "Effective",
      beforeMetrics: {
        diseaseCases: 12,
        mortalityRate: 8.5,
        vaccinationRate: 45,
      },
      afterMetrics: {
        diseaseCases: 2,
        mortalityRate: 1.2,
        vaccinationRate: 78,
      },
      improvement: {
        diseaseCases: -83,
        mortalityRate: -86,
        vaccinationRate: 73,
      },
    },
    {
      id: "int-002",
      name: "Mass Rabies Vaccination Campaign",
      barangay: "Poblacion 4",
      startDate: "Oct 1, 2024",
      endDate: "Nov 30, 2024",
      type: "vaccination",
      status: "Effective",
      beforeMetrics: {
        diseaseCases: 5,
        mortalityRate: 3.2,
        vaccinationRate: 52,
      },
      afterMetrics: {
        diseaseCases: 1,
        mortalityRate: 0.5,
        vaccinationRate: 89,
      },
      improvement: {
        diseaseCases: -80,
        mortalityRate: -84,
        vaccinationRate: 71,
      },
    },
    {
      id: "int-003",
      name: "Poultry Biosecurity Training",
      barangay: "Cahil",
      startDate: "Sep 15, 2024",
      endDate: "Oct 31, 2024",
      type: "education",
      status: "Partially Effective",
      beforeMetrics: {
        diseaseCases: 8,
        mortalityRate: 5.5,
        vaccinationRate: 60,
      },
      afterMetrics: {
        diseaseCases: 4,
        mortalityRate: 3.2,
        vaccinationRate: 68,
      },
      improvement: {
        diseaseCases: -50,
        mortalityRate: -42,
        vaccinationRate: 13,
      },
    },
    {
      id: "int-004",
      name: "Swine Fever Treatment Protocol",
      barangay: "Bambang",
      startDate: "Aug 1, 2024",
      endDate: "Sep 15, 2024",
      type: "treatment",
      status: "Ineffective",
      beforeMetrics: {
        diseaseCases: 15,
        mortalityRate: 12.0,
        vaccinationRate: 55,
      },
      afterMetrics: {
        diseaseCases: 14,
        mortalityRate: 11.5,
        vaccinationRate: 58,
      },
      improvement: {
        diseaseCases: -7,
        mortalityRate: -4,
        vaccinationRate: 5,
      },
    },
    {
      id: "int-005",
      name: "Avian Flu Emergency Response",
      barangay: "Balimbing",
      startDate: "Dec 1, 2024",
      endDate: "Ongoing",
      type: "vaccination",
      status: "Effective",
      beforeMetrics: {
        diseaseCases: 18,
        mortalityRate: 15.0,
        vaccinationRate: 38,
      },
      afterMetrics: {
        diseaseCases: 3,
        mortalityRate: 2.1,
        vaccinationRate: 82,
      },
      improvement: {
        diseaseCases: -83,
        mortalityRate: -86,
        vaccinationRate: 116,
      },
    },
  ];

  const selectedInterventionData = interventions.find(
    (i) => i.id === selectedIntervention,
  );

  const generateTimelineData = (intervention: Intervention) => {
    const interventionDate = 15;
    return [
      {
        day: 1,
        cases: intervention.beforeMetrics.diseaseCases,
        phase: "before",
      },
      {
        day: 5,
        cases: intervention.beforeMetrics.diseaseCases,
        phase: "before",
      },
      {
        day: 10,
        cases: intervention.beforeMetrics.diseaseCases + 2,
        phase: "before",
      },
      {
        day: interventionDate,
        cases: intervention.beforeMetrics.diseaseCases + 2,
        phase: "intervention",
      },
      {
        day: 20,
        cases: Math.floor(
          (intervention.beforeMetrics.diseaseCases +
            intervention.afterMetrics.diseaseCases) /
            2,
        ),
        phase: "after",
      },
      {
        day: 25,
        cases: intervention.afterMetrics.diseaseCases + 1,
        phase: "after",
      },
      {
        day: 30,
        cases: intervention.afterMetrics.diseaseCases,
        phase: "after",
      },
    ];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Effective":
        return "bg-green-500 text-white";
      case "Partially Effective":
        return "bg-yellow-500 text-white";
      case "Ineffective":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Effective":
        return <CheckCircle className="w-5 h-5" />;
      case "Partially Effective":
        return <Activity className="w-5 h-5" />;
      case "Ineffective":
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "vaccination":
        return "bg-blue-100 text-blue-800";
      case "quarantine":
        return "bg-red-100 text-red-800";
      case "treatment":
        return "bg-green-100 text-green-800";
      case "education":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
      {/* ── Header band ───────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#164e63] to-[#0891b2] px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">
                Intervention Effectiveness
              </h3>
              <p className="text-white/70 text-sm mt-0.5">
                Impact tracking · disease &amp; mortality
                outcomes
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {(
              [
                "Effective",
                "Partially Effective",
                "Ineffective",
              ] as const
            ).map((s) => {
              const count = interventions.filter(
                (i) => i.status === s,
              ).length;
              const st = STATUS_STYLE[s];
              return (
                <div
                  key={s}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                  style={{
                    background: st.bg + "33",
                    borderColor: st.border + "55",
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: st.dot }}
                  />
                  <span className="text-white text-xs font-semibold">
                    {count}
                  </span>
                  <span className="text-white/70 text-xs hidden sm:block">
                    {s}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left: Intervention List ──────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Past Interventions
            </p>

            {interventions.map((intervention) => {
              const isActive =
                selectedIntervention === intervention.id;
              const st = STATUS_STYLE[intervention.status];
              const tp = TYPE_STYLE[intervention.type];

              return (
                <div
                  key={intervention.id}
                  onClick={() =>
                    setSelectedIntervention(intervention.id)
                  }
                  className="p-4 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-md"
                  style={{
                    borderColor: isActive
                      ? "#2B5EA6"
                      : "#e2e8f0",
                    background: isActive
                      ? "#eff6ff"
                      : "#ffffff",
                    boxShadow: isActive
                      ? "0 0 0 3px #bfdbfe40"
                      : undefined,
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug flex-1">
                      {intervention.name}
                    </p>
                    {/* Status dot only — compact */}
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                      style={{ background: st.dot }}
                    />
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2.5">
                    <MapPin className="w-3 h-3" />
                    <span>{intervention.barangay}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span
                      className="px-2 py-0.5 rounded-lg text-xs font-semibold border"
                      style={{
                        background: tp.bg,
                        color: tp.text,
                        borderColor: tp.border,
                      }}
                    >
                      {tp.label}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold"
                      style={{
                        background: st.bg,
                        color: st.text,
                      }}
                    >
                      {intervention.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Right: Detail Panel ──────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            {selectedInterventionData &&
              (() => {
                const st =
                  STATUS_STYLE[selectedInterventionData.status];
                const tp =
                  TYPE_STYLE[selectedInterventionData.type];
                const iv = selectedInterventionData;

                return (
                  <>
                    {/* Detail header */}
                    <div
                      className="rounded-2xl p-5 border"
                      style={{
                        background: "#f8fafc",
                        borderColor: "#e2e8f0",
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900 text-base leading-snug mb-3">
                            {iv.name}
                          </h4>
                          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {iv.barangay}
                            </div>
                            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {iv.startDate} — {iv.endDate}
                            </div>
                            <span
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border"
                              style={{
                                background: tp.bg,
                                color: tp.text,
                                borderColor: tp.border,
                              }}
                            >
                              {tp.label}
                            </span>
                          </div>
                        </div>
                        <div
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold shrink-0"
                          style={{
                            background: st.bg,
                            color: st.text,
                          }}
                        >
                          {getStatusIcon(iv.status)}
                          {iv.status}
                        </div>
                      </div>
                    </div>

                    {/* Metrics comparison — 3 columns */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        {
                          label: "Disease Cases",
                          before: `${iv.beforeMetrics.diseaseCases}`,
                          after: `${iv.afterMetrics.diseaseCases}`,
                          delta: `${iv.improvement.diseaseCases}%`,
                          positive:
                            iv.improvement.diseaseCases < 0,
                          unit: "cases",
                          color:
                            iv.improvement.diseaseCases < 0
                              ? "#16a34a"
                              : "#dc2626",
                        },
                        {
                          label: "Mortality Rate",
                          before: `${iv.beforeMetrics.mortalityRate}%`,
                          after: `${iv.afterMetrics.mortalityRate}%`,
                          delta: `${iv.improvement.mortalityRate}%`,
                          positive:
                            iv.improvement.mortalityRate < 0,
                          unit: "%",
                          color:
                            iv.improvement.mortalityRate < 0
                              ? "#16a34a"
                              : "#dc2626",
                        },
                        {
                          label: "Vaccination Rate",
                          before: `${iv.beforeMetrics.vaccinationRate}%`,
                          after: `${iv.afterMetrics.vaccinationRate}%`,
                          delta: `+${iv.improvement.vaccinationRate}%`,
                          positive: true,
                          unit: "%",
                          color: "#2563eb",
                        },
                      ].map((m, idx) => (
                        <div
                          key={idx}
                          className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"
                        >
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                            {m.label}
                          </p>

                          {/* Before */}
                          <div className="mb-2">
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                              Before
                            </p>
                            <p className="text-2xl font-black text-slate-800 leading-none mt-0.5">
                              {m.before}
                            </p>
                          </div>

                          {/* Arrow + delta */}
                          <div
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg my-2 w-fit"
                            style={{
                              background: m.color + "18",
                              color: m.color,
                            }}
                          >
                            {m.positive ? (
                              <TrendingDown className="w-3.5 h-3.5" />
                            ) : (
                              <TrendingUp className="w-3.5 h-3.5" />
                            )}
                            <span className="text-xs font-black">
                              {m.delta}
                            </span>
                          </div>

                          {/* After */}
                          <div>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                              After
                            </p>
                            <p
                              className="text-2xl font-black leading-none mt-0.5"
                              style={{ color: m.color }}
                            >
                              {m.after}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Timeline chart */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-bold text-slate-700">
                          Disease Cases Timeline
                        </p>
                        <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                          30-day window
                        </span>
                      </div>
                      <ResponsiveContainer
                        width="100%"
                        height={230}
                      >
                        <LineChart
                          data={generateTimelineData(iv)}
                          margin={{
                            top: 8,
                            right: 8,
                            left: 0,
                            bottom: 16,
                          }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f1f5f9"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="day"
                            tick={{
                              fontSize: 11,
                              fill: "#94a3b8",
                              fontWeight: 500,
                            }}
                            axisLine={false}
                            tickLine={false}
                            label={{
                              value: "Days",
                              position: "insideBottom",
                              offset: -8,
                              fontSize: 11,
                              fill: "#94a3b8",
                            }}
                          />
                          <YAxis
                            tick={{
                              fontSize: 11,
                              fill: "#94a3b8",
                            }}
                            axisLine={false}
                            tickLine={false}
                            label={{
                              value: "Cases",
                              angle: -90,
                              position: "insideLeft",
                              fontSize: 11,
                              fill: "#94a3b8",
                              offset: 8,
                            }}
                          />
                          <Tooltip content={<ChartTooltip />} />
                          <ReferenceLine
                            x={15}
                            stroke="#2B5EA6"
                            strokeDasharray="5 3"
                            strokeWidth={1.5}
                            label={{
                              value: "Intervention",
                              position: "top",
                              fontSize: 10,
                              fill: "#2B5EA6",
                              fontWeight: 700,
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="cases"
                            stroke="#ef4444"
                            strokeWidth={2.5}
                            dot={{
                              r: 5,
                              fill: "#ef4444",
                              strokeWidth: 2,
                              stroke: "#fff",
                            }}
                            activeDot={{ r: 7, strokeWidth: 0 }}
                            name="Disease Cases"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Effectiveness analysis */}
                    <div
                      className="rounded-2xl p-5 border"
                      style={{
                        background: st.panelBg,
                        borderColor: st.panelBorder,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: st.bg }}
                        >
                          {getStatusIcon(iv.status)}
                        </div>
                        <p className="text-sm font-bold text-slate-800">
                          Effectiveness Analysis
                        </p>
                        <span
                          className="ml-auto px-2.5 py-1 rounded-lg text-xs font-bold"
                          style={{
                            background: st.bg,
                            color: st.text,
                          }}
                        >
                          {iv.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {iv.status === "Effective" && (
                          <>
                            ✓ Highly successful intervention.
                            Disease cases reduced by{" "}
                            <strong>
                              {Math.abs(
                                iv.improvement.diseaseCases,
                              )}
                              %
                            </strong>{" "}
                            and mortality rate dropped by{" "}
                            <strong>
                              {Math.abs(
                                iv.improvement.mortalityRate,
                              )}
                              %
                            </strong>
                            . Recommend replicating this
                            approach in similar situations.
                          </>
                        )}
                        {iv.status ===
                          "Partially Effective" && (
                          <>
                            ⚠ Moderate success. Some
                            improvement observed but targets not
                            fully met. Consider combining with
                            additional measures such as enhanced
                            surveillance or extended monitoring
                            period.
                          </>
                        )}
                        {iv.status === "Ineffective" && (
                          <>
                            ✗ Limited impact observed. Disease
                            cases only reduced by{" "}
                            <strong>
                              {Math.abs(
                                iv.improvement.diseaseCases,
                              )}
                              %
                            </strong>
                            . Recommend reviewing and revising
                            intervention strategy. Consider
                            alternative approaches or combining
                            multiple interventions.
                          </>
                        )}
                      </p>
                    </div>
                  </>
                );
              })()}
          </div>
        </div>
      </div>
    </div>
  );
}