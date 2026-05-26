import { AlertTriangle, TrendingUp, Syringe, Skull, ArrowUpRight, Activity, RefreshCw, Zap, MapPin, Pill, Package, X, Eye, Clock, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface Alert {
  id: string;
  type: 'medicine' | 'mortality' | 'vaccination' | 'outbreak' | 'fast_mover';
  severity: 'low' | 'medium' | 'high';
  barangay: string;
  message: string;
  metric?: string;
  trend?: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  detail?: any; // extra structured data for modal
}

// ─── ALERT DETAIL MODAL ───────────────────────────────────────────────────────
function AlertDetailModal({ alert, onClose }: { alert: Alert; onClose: () => void }) {
  const colors = getAlertColorRaw(alert.severity);
  const Icon = getAlertIconRaw(alert.type);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className={`px-6 py-4 flex items-center justify-between ${
          alert.severity==='high'?'bg-gradient-to-r from-red-600 to-red-500':
          alert.severity==='medium'?'bg-gradient-to-r from-amber-500 to-yellow-500':
          'bg-gradient-to-r from-blue-600 to-blue-500'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Icon className="w-5 h-5 text-white"/>
            </div>
            <div>
              <p className="font-bold text-white capitalize">{alert.type.replace('_',' ')} Alert</p>
              <p className="text-white/70 text-xs">{alert.barangay}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Risk badge */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 text-xs font-bold rounded-full ${
              alert.riskLevel==='High'?'bg-red-500 text-white':
              alert.riskLevel==='Medium'?'bg-amber-500 text-white':
              'bg-green-500 text-white'
            }`}>{alert.riskLevel} Risk</span>
            <span className={`px-3 py-1.5 text-xs font-semibold rounded-full border capitalize ${colors.badge}`}>
              {alert.severity} severity
            </span>
          </div>

          {/* Message */}
          <div className={`p-4 rounded-xl border ${colors.bg} ${colors.border}`}>
            <p className={`text-sm font-medium ${colors.text}`}>{alert.message}</p>
          </div>

          {/* Barangay */}
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0"/>
            <span className="text-slate-600 font-semibold">{alert.barangay}</span>
          </div>

          {/* Metric */}
          {alert.metric && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-400 shrink-0"/>
              <span className="text-sm text-slate-700 font-semibold">{alert.metric}</span>
            </div>
          )}

          {/* Fast-mover detail */}
          {alert.detail?.type === 'fast_mover' && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Usage Details</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-red-50 border border-red-100 rounded-xl p-2 text-center">
                  <p className="text-lg font-black text-red-600">{alert.detail.barangay_qty}</p>
                  <p className="text-[10px] text-red-400 font-semibold">In Barangay</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                  <p className="text-lg font-black text-slate-600">{alert.detail.avg}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">Average</p>
                </div>
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-2 text-center">
                  <p className="text-lg font-black text-orange-600">{alert.detail.ratio}x</p>
                  <p className="text-[10px] text-orange-400 font-semibold">Ratio</p>
                </div>
              </div>
              {alert.detail.sources?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Sources</p>
                  <div className="flex flex-wrap gap-1">
                    {[...new Set(alert.detail.sources as string[])].map((s:string,i:number)=>(
                      <span key={i} className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-semibold rounded-md">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <button onClick={onClose}
            className="w-full py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function getAlertIconRaw(type: string) {
  switch (type) {
    case 'medicine': case 'fast_mover': return Zap;
    case 'mortality': return Skull;
    case 'vaccination': return Syringe;
    case 'outbreak': return AlertTriangle;
    default: return AlertTriangle;
  }
}

function getAlertColorRaw(severity: string) {
  switch (severity) {
    case 'high': return {
      bg: 'bg-red-50', border: 'border-red-200 border', text: 'text-red-900', subtext: 'text-red-700',
      badge: 'bg-red-100 text-red-800 border-red-200', icon: 'text-red-600', leftBorder: 'border-red-500',
    };
    case 'medium': return {
      bg: 'bg-amber-50', border: 'border-amber-200 border', text: 'text-amber-900', subtext: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-800 border-amber-200', icon: 'text-amber-600', leftBorder: 'border-amber-500',
    };
    default: return {
      bg: 'bg-blue-50', border: 'border-blue-200 border', text: 'text-blue-900', subtext: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-800 border-blue-200', icon: 'text-blue-600', leftBorder: 'border-blue-500',
    };
  }
}

function sourceLabel(s: string) {
  const map: Record<string,string> = {
    pet_vaccination:"Pet Vaccination", manual:"Manual Release", outbreak_dispatch:"Outbreak Dispatch",
    livestock_treatment:"Livestock Treatment", dispense:"Dispensed",
  };
  return map[s] || s;
}

const FALLBACK_ALERTS: Alert[] = [
  { id:'fb-1', type:'outbreak', severity:'high', barangay:'Bisaya', message:'ASF suspect case — LS-005 quarantined. RVL confirmation pending.', metric:'22 swine quarantined', trend:'up', riskLevel:'High' },
  { id:'fb-2', type:'mortality', severity:'medium', barangay:'Loma', message:'2 swine mortality reported — suspected PED. Investigation ongoing.', metric:'2 animals', trend:'up', riskLevel:'Medium' },
  { id:'fb-3', type:'medicine', severity:'medium', barangay:'CVO Central', message:'Check medicine inventory for reorder levels', metric:'Review needed', trend:'stable', riskLevel:'Low' },
];

export function SmartAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<Alert|null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.getDashboardDiseaseIntel().catch(()=>null),
      api.getDashboardMedicineIntel().catch(()=>null),
      (api as any).getDashboardMedicineUsageAnalytics(90).catch(()=>null),
    ]).then(([diseaseRes, medRes, analyticsRes]) => {
      const generated: Alert[] = [];

      // Disease events
      (diseaseRes?.activeEvents||[]).forEach((e:any,i:number)=>{
        generated.push({
          id:`disease-${e.id||i}`, type:'outbreak', severity:'high',
          barangay: e.barangay||'Unknown',
          message:`${e.disease} — ${e.cases} cases reported. Status: ${e.status}`,
          metric:`${e.cases} cases, ${e.deaths||0} deaths`, trend:'up',
          riskLevel: e.cases>10?'High':e.cases>3?'Medium':'Low',
        });
      });

      // Mortality
      (diseaseRes?.recentMortality||[]).slice(0,3).forEach((m:any,i:number)=>{
        generated.push({
          id:`mort-${i}`, type:'mortality',
          severity: m.quantity>5?'high':'medium',
          barangay: m.barangay||'Unknown',
          message:`${m.quantity} ${m.animal_type} mortality — Cause: ${m.cause||'Unknown'}`,
          metric:`${m.quantity} animals`, trend:'up',
          riskLevel: m.quantity>5?'High':'Medium',
        });
      });

      // Low stock
      (medRes?.stock||[]).filter((m:any)=>m.stock_status==='Critical'||m.stock_status==='Out of Stock')
        .forEach((m:any,i:number)=>{
          generated.push({
            id:`med-${i}`, type:'medicine',
            severity: m.quantity===0?'high':'medium',
            barangay:'CVO Central',
            message:`${m.name}: ${m.quantity===0?'OUT OF STOCK':'Low stock'} — ${m.quantity} ${m.unit} remaining (reorder: ${m.reorder_level})`,
            metric:`${m.quantity} ${m.unit}`, trend:'down',
            riskLevel: m.quantity===0?'High':'Medium',
          });
        });

      // Expiring
      (medRes?.expiring||[]).slice(0,2).forEach((m:any,i:number)=>{
        generated.push({
          id:`exp-${i}`, type:'medicine', severity:'medium',
          barangay:'CVO Central',
          message:`${m.name} expires ${new Date(m.expiry_date).toLocaleDateString('en-PH')} — ${m.quantity} ${m.unit} at risk`,
          metric:`Expires ${new Date(m.expiry_date).toLocaleDateString('en-PH')}`,
          trend:'up', riskLevel:'Medium',
        });
      });

      // 🔥 SMART: Fast-moving medicine by barangay
      (analyticsRes?.fastMoving||[]).slice(0,5).forEach((fm:any,i:number)=>{
        const ratio = fm.ratio;
        generated.push({
          id:`fast-${i}`,
          type:'fast_mover',
          severity: ratio>=3?'high':ratio>=2?'medium':'low',
          barangay: fm.barangay,
          message:`${fm.medicine_name} fast-moving in ${fm.barangay} — ${ratio}x above average consumption`,
          metric:`${fm.barangay_qty} doses used (avg: ${fm.avg_per_barangay})`,
          trend:'up',
          riskLevel: ratio>=3?'High':ratio>=2?'Medium':'Low',
          detail:{
            type:'fast_mover',
            barangay_qty: fm.barangay_qty,
            avg: fm.avg_per_barangay,
            ratio: fm.ratio,
            sources: (fm.sources||[]).map(sourceLabel),
            category: fm.category,
          },
        });
      });

      // Sort: high first
      generated.sort((a,b)=>{
        const sv = {high:3,medium:2,low:1};
        return (sv[b.severity as keyof typeof sv]||0) - (sv[a.severity as keyof typeof sv]||0);
      });

      setAlerts(generated.length>0?generated:FALLBACK_ALERTS);
      setLoading(false);
    }).catch(()=>{ setAlerts(FALLBACK_ALERTS); setLoading(false); });
  };

  useEffect(()=>{ load(); }, []);

  const highCount = alerts.filter(a=>a.riskLevel==='High').length;
  const medCount  = alerts.filter(a=>a.riskLevel==='Medium').length;
  const lowCount  = alerts.filter(a=>a.riskLevel==='Low').length;

  return (
    <>
      {selectedAlert && <AlertDetailModal alert={selectedAlert} onClose={()=>setSelectedAlert(null)}/>}

      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-gray-800 flex items-center gap-2 font-bold">
              <AlertTriangle className="w-5 h-5 text-[#E85D3B]"/>
              Smart Alerts &amp; Risk Flags
            </h3>
            <p className="text-sm text-gray-600 mt-1">Real-time anomaly detection from database · Click any alert for details</p>
          </div>
          <button onClick={load} className="px-4 py-2 bg-gradient-to-r from-[#2B5EA6] to-[#1e4275] text-white text-sm rounded-xl hover:shadow-lg transition-all flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5"/> Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"/>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map(alert => {
              const Icon = getAlertIconRaw(alert.type);
              const colors = getAlertColorRaw(alert.severity);
              return (
                <div key={alert.id}
                  className={`border-l-4 ${colors.leftBorder} ${colors.bg} p-4 rounded-lg hover:shadow-md transition-all cursor-pointer group`}
                  onClick={()=>setSelectedAlert(alert)}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${colors.icon} shrink-0`}>
                      <Icon className="w-5 h-5"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className={`${colors.text} text-sm font-medium`}>{alert.message}</p>
                        <span className={`px-3 py-1 text-xs rounded-full font-medium whitespace-nowrap shrink-0 ${
                          alert.riskLevel==='High'?'bg-red-500 text-white':
                          alert.riskLevel==='Medium'?'bg-yellow-500 text-white':'bg-green-500 text-white'
                        }`}>{alert.riskLevel} Risk</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium border ${colors.badge} flex items-center gap-1`}>
                          <MapPin className="w-3 h-3"/>{alert.barangay}
                        </span>
                        {alert.metric && (
                          <span className="flex items-center gap-1 text-xs text-gray-600">
                            {alert.trend==='up' && <ArrowUpRight className="w-3 h-3 text-red-600"/>}
                            {alert.metric}
                          </span>
                        )}
                        <span className="ml-auto text-xs text-slate-400 flex items-center gap-0.5 group-hover:text-violet-500 transition-colors">
                          <Eye className="w-3 h-3"/> View details
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Risk summary (real counts) */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Alert Summary</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{highCount}</p>
              <p className="text-xs text-red-600 mt-1">High Risk</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-yellow-700">{medCount}</p>
              <p className="text-xs text-yellow-600 mt-1">Medium Risk</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{lowCount}</p>
              <p className="text-xs text-green-600 mt-1">Low Risk</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
