import { useState, useRef, useCallback, useEffect } from "react";
import {
  Plus, Search, Syringe, Download, Calendar, PawPrint,
  AlertCircle, Heart, X, CheckCircle, Camera, Upload,
  RefreshCw, ImagePlus, FlipHorizontal, ChevronLeft,
  ChevronRight, Phone, MapPin, Clock, Users, Eye,
  Zap, Tag, FileText, ArrowRight,
  TriangleAlert, Info, BarChart3, TrendingUp, Shield,
  Activity, Scissors
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar
} from "recharts";
import { api } from "../lib/api";

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface Pet {
  id: string;
  pet_name: string; petName?: string;
  species: string; breed: string; age?: string;
  color: string; gender?: string;
  is_spayed?: boolean; is_neutered?: boolean;
  owner_name: string; ownerName?: string;
  contact_number?: string; ownerContact?: string;
  address?: string; ownerAddress?: string;
  barangay: string;
  microchip_id?: string; microchipId?: string;
  registration_date?: string; registrationDate?: string;
  vaccination_status: string; vaccinationStatus?: string;
  last_vaccination_date?: string; lastVaccinationDate?: string;
  next_vaccination_date?: string; nextVaccinationDate?: string;
  status: string;
  photo?: string; photoUrl?: string;
  impound_status?: string; impoundStatus?: string;
  impound_date?: string;
  impound_reason?: string;
}

interface LFReport {
  id: string; pet_id?: string; petId?: string;
  pet_name: string; petName?: string;
  species: string; breed?: string; color?: string;
  type: "Lost"|"Found";
  reported_by: string; reportedBy?: string;
  contact_number?: string; contactNumber?: string;
  last_seen_location?: string; lastSeenLocation?: string;
  barangay: string;
  date_reported?: string; dateReported?: string;
  description?: string;
  status: string;
}

interface BarangaySchedule {
  id: string; barangay: string; date: string;
  time_start?: string; time_end?: string; time?: string;
  venue?: string; location?: string;
  status: string; registered?: number; registeredPets?: number;
  capacity: number; notes?: string;
}

interface SurveyData {
  total: number;
  survey: { totalDogs: number; totalCats: number; total: number };
  registered: { dogs: number; cats: number; total: number };
  registrationRate: { dogs: string; cats: string; overall: string };
  vaccination: { vaccinated: number; notVaccinated: number; dueSoon: number };
  spayedNeutered: { spayed: number; neutered: number };
  impounded: number;
  byBarangay: Array<{ barangay: string; count: string }>;
  lostFound: { lost: number; found: number };
}

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const CALACA_BARANGAYS = [
  "Baclas","Bagong Tubig","Balimbing","Bambang","Bisaya","Cahil","Calantas",
  "Caluangan","Camastilisan","Coral Ni Bacal","Coral Ni Lopez","Dacanlao","Dila",
  "Loma","Lumbang Calzada","Lumbang Na Bata","Lumbang Na Matanda","Madalunot",
  "Makina","Matipok","Munting Coral","Niyugan","Pantay","Poblacion 1","Poblacion 2",
  "Poblacion 3","Poblacion 4","Poblacion 5","Poblacion 6","Putting Bato East",
  "Putting Bato West","Quisumbing","Salong","San Rafael","Sinisian","Taklang Anak",
  "Talisay","Tamayo","Timbain"
];

const ZONE_COLORS: Record<string,string> = {
  North: "#6B7280", West: "#8B5CF6", East: "#2B5EA6", Red: "#E85D3B"
};

const PIE_COLORS = ["#2B5EA6","#60A85C","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899"];

// ─── HELPERS ────────────────────────────────────────────────────────────────

const pn = (p: Pet) => p.pet_name || p.petName || "";
const on = (p: Pet) => p.owner_name || p.ownerName || "";
const vs = (p: Pet) => p.vaccination_status || p.vaccinationStatus || "Not Vaccinated";
const brgy = (p: Pet) => p.barangay || "";
const spayed = (p: Pet) => p.is_spayed || false;
const neutered = (p: Pet) => p.is_neutered || false;
const impound = (p: Pet) => p.impound_status && p.impound_status !== "None" ? p.impound_status : "";
const petPhoto = (p: Pet) => p.photo || p.photoUrl || "";

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
}

function matchScore(lost: LFReport, found: LFReport): number {
  let score = 0;
  if (lost.species?.toLowerCase() === found.species?.toLowerCase()) score += 40;
  if (lost.breed && found.breed) {
    if (lost.breed.toLowerCase().includes(found.breed.toLowerCase().split(" ")[0]) ||
        found.breed.toLowerCase().includes(lost.breed.toLowerCase().split(" ")[0])) score += 25;
  }
  if (lost.color && found.color) {
    const lw = lost.color.toLowerCase().split(/[\s\/,]+/);
    const fw = found.color.toLowerCase().split(/[\s\/,]+/);
    if (lw.some(w => fw.includes(w))) score += 20;
  }
  if (lost.barangay === found.barangay) score += 15;
  return score;
}

function getMatches(report: LFReport, all: LFReport[]) {
  const opp = report.type === "Lost" ? "Found" : "Lost";
  return all
    .filter(r => r.type === opp && r.status === "Open" && r.id !== report.id)
    .map(r => ({ report: r, score: report.type === "Lost" ? matchScore(report, r) : matchScore(r, report) }))
    .filter(m => m.score >= 25)
    .sort((a, b) => b.score - a.score);
}

const INPUT = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent bg-white transition-all";

// ─── STAT CARD ──────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, color, bg, ring, onClick }: any) {
  return (
    <div onClick={onClick} className={`bg-white rounded-2xl shadow-sm border ${ring} p-5 ${onClick?"cursor-pointer hover:shadow-md hover:scale-[1.02]":""} transition-all group`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        <div className={`${bg} ${color} w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>{icon}</div>
      </div>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── PHOTO CAPTURE ──────────────────────────────────────────────────────────

function PetPhotoCapture({ onCapture, onClose, petName }: { onCapture:(d:string)=>void; onClose:()=>void; petName:string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream|null>(null);
  const [mode, setMode] = useState<"choose"|"camera"|"preview">("choose");
  const [preview, setPreview] = useState<string|null>(null);
  const [camErr, setCamErr] = useState<string|null>(null);
  const [facing, setFacing] = useState<"user"|"environment">("environment");
  const [camReady, setCamReady] = useState(false);

  const stop = useCallback(()=>{ streamRef.current?.getTracks().forEach(t=>t.stop()); streamRef.current=null; setCamReady(false); },[]);
  const startCam = useCallback(async(f:"user"|"environment")=>{
    stop(); setCamErr(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({video:{facingMode:f,width:{ideal:1280},height:{ideal:720}}});
      streamRef.current=s;
      if(videoRef.current){videoRef.current.srcObject=s;await videoRef.current.play();}
      setCamReady(true);
    } catch(e:any){setCamErr(e.name==="NotAllowedError"?"Camera permission denied.":"Camera not available.");}
  },[stop]);
  const snap = ()=>{
    if(!videoRef.current||!canvasRef.current) return;
    const v=videoRef.current,c=canvasRef.current;
    c.width=v.videoWidth;c.height=v.videoHeight;
    c.getContext("2d")?.drawImage(v,0,0);
    stop();setPreview(c.toDataURL("image/jpeg",0.9));setMode("preview");
  };
  const onFile=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0];if(!f) return;
    const r=new FileReader();r.onload=ev=>{setPreview(ev.target?.result as string);setMode("preview");};r.readAsDataURL(f);
  };
  useEffect(()=>()=>stop(),[stop]);

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#1e4080] to-[#2B5EA6] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center"><Camera className="w-4 h-4 text-white"/></div>
            <div><p className="font-bold text-white text-sm">Pet Photo</p><p className="text-white/60 text-xs">{petName||"New Pet"}</p></div>
          </div>
          <button onClick={()=>{stop();onClose();}} className="text-white/60 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5">
          {mode==="choose"&&(
            <div className="space-y-3">
              <p className="text-sm text-gray-400 text-center mb-4">Add a photo to help identify this pet</p>
              <button onClick={()=>{setMode("camera");startCam(facing);}} className="w-full flex items-center gap-4 p-4 border-2 border-dashed border-[#2B5EA6]/30 rounded-xl hover:border-[#2B5EA6] hover:bg-blue-50 transition-all group">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 shrink-0"><Camera className="w-6 h-6 text-[#2B5EA6]"/></div>
                <div className="text-left"><p className="font-semibold text-gray-800 text-sm">Open Camera</p><p className="text-xs text-gray-400">Take a live photo now</p></div>
              </button>
              <button onClick={()=>fileInputRef.current?.click()} className="w-full flex items-center gap-4 p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all group">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-gray-200 shrink-0"><Upload className="w-6 h-6 text-gray-500"/></div>
                <div className="text-left"><p className="font-semibold text-gray-800 text-sm">Upload from Gallery</p><p className="text-xs text-gray-400">Choose an existing photo</p></div>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={onFile} className="hidden"/>
              <button onClick={()=>{stop();onClose();}} className="w-full py-2 text-sm text-gray-400 hover:text-gray-600">Skip for now</button>
            </div>
          )}
          {mode==="camera"&&(
            <div className="space-y-3">
              <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"/>
                {camErr&&<div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 text-white p-4 text-center"><Camera className="w-8 h-8 mb-2 opacity-40"/><p className="text-sm">{camErr}</p><button onClick={()=>fileInputRef.current?.click()} className="mt-3 px-4 py-1.5 bg-white text-gray-800 rounded-lg text-xs font-semibold">Upload instead</button></div>}
              </div>
              <canvas ref={canvasRef} className="hidden"/>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={onFile} className="hidden"/>
              <div className="flex gap-2">
                <button onClick={()=>{const nf=facing==="environment"?"user":"environment";setFacing(nf);startCam(nf);}} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm"><FlipHorizontal className="w-4 h-4"/>Flip</button>
                <button onClick={snap} disabled={!!camErr||!camReady} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#2B5EA6] text-white rounded-lg font-semibold hover:bg-[#234a85] disabled:opacity-40"><Camera className="w-4 h-4"/>Capture</button>
              </div>
              <button onClick={()=>{stop();setMode("choose");}} className="w-full py-1.5 text-sm text-gray-400 hover:text-gray-600">← Back</button>
            </div>
          )}
          {mode==="preview"&&preview&&(
            <div className="space-y-3">
              <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
                <img src={preview} alt="Preview" className="w-full h-full object-cover"/>
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3"/>Ready</div>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>{setPreview(null);setMode("camera");startCam(facing);}} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm"><RefreshCw className="w-4 h-4"/>Retake</button>
                <button onClick={()=>{onCapture(preview);stop();}} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#60A85C] text-white rounded-lg font-semibold hover:bg-[#4a8a47]"><CheckCircle className="w-4 h-4"/>Use Photo</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── OVERVIEW TAB ───────────────────────────────────────────────────────────

function OverviewTab({ survey, pets, reports, schedules, onTab }: {
  survey: SurveyData|null; pets: Pet[]; reports: LFReport[];
  schedules: BarangaySchedule[]; onTab: (t: string) => void;
}) {
  if (!survey) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-4 border-[#2B5EA6] border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  const totalVax = survey.vaccination.vaccinated;
  const totalPets = survey.total || pets.length;
  const vaxRate = totalPets > 0 ? Math.round((totalVax/totalPets)*100) : 0;
  const openLost = survey.lostFound.lost;
  const openFound = survey.lostFound.found;

  const vaxPieData = [
    { name: "Vaccinated", value: survey.vaccination.vaccinated, color: "#60A85C" },
    { name: "Not Vaccinated", value: survey.vaccination.notVaccinated, color: "#ef4444" },
    { name: "Due Soon", value: survey.vaccination.dueSoon, color: "#f59e0b" },
  ].filter(d => d.value > 0);

  const spayData = [
    { name: "Spayed", value: survey.spayedNeutered.spayed, fill: "#8b5cf6" },
    { name: "Neutered", value: survey.spayedNeutered.neutered, fill: "#06b6d4" },
    { name: "Not S/N", value: Math.max(0, totalPets - survey.spayedNeutered.spayed - survey.spayedNeutered.neutered), fill: "#e5e7eb" },
  ];

  const topBarangays = (survey.byBarangay || []).slice(0, 10).map(b => ({
    name: b.barangay.replace("Poblacion","Pob.").replace("Putting Bato","P.Bato").replace("Lumbang","Lmbg"),
    count: parseInt(b.count),
  }));

  const lfData = [
    { name: "Lost", value: survey.lostFound.lost, fill: "#ef4444" },
    { name: "Found", value: survey.lostFound.found, fill: "#60A85C" },
  ];

  const totalMatches = reports
    .filter(r => r.type === "Lost" && r.status === "Open")
    .reduce((a, r) => a + (getMatches(r, reports).length > 0 ? 1 : 0), 0);

  return (
    <div className="space-y-6">
      {/* ── KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Registered" value={totalPets} sub="All species · Calaca"
          icon={<PawPrint className="w-5 h-5"/>} color="text-blue-600" bg="bg-blue-100" ring="border-blue-200"
          onClick={() => onTab("pets")} />
        <StatCard label="Vaccinated" value={totalVax} sub={`${vaxRate}% coverage rate`}
          icon={<Syringe className="w-5 h-5"/>} color="text-green-600" bg="bg-green-100" ring="border-green-200" />
        <StatCard label="Impounded" value={survey.impounded} sub="Currently in pound"
          icon={<Shield className="w-5 h-5"/>} color="text-orange-600" bg="bg-orange-100" ring="border-orange-200" />
        <StatCard label="Lost & Found" value={openLost + openFound} sub={`${openLost} lost · ${openFound} found open`}
          icon={<Heart className="w-5 h-5"/>} color="text-red-600" bg="bg-red-100" ring="border-red-200"
          onClick={() => onTab("lost-found")} />
      </div>

      {/* Smart Match Alert */}
      {totalMatches > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shrink-0"><Zap className="w-6 h-6 text-white"/></div>
          <div className="flex-1">
            <p className="font-bold text-amber-800">{totalMatches} Lost Pet{totalMatches>1?"s":""} with Smart Match{totalMatches>1?"es":""}!</p>
            <p className="text-sm text-amber-600">AI matching found potential Lost/Found connections. Review now.</p>
          </div>
          <button onClick={() => onTab("lost-found")} className="px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 flex items-center gap-1.5 shrink-0">
            Review <ArrowRight className="w-4 h-4"/>
          </button>
        </div>
      )}

      {/* ── Charts Row 1: Vaccination Pie + Barangay Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vaccination breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center"><Syringe className="w-4 h-4 text-green-600"/></div>
            <div>
              <p className="font-bold text-gray-900">Vaccination Status</p>
              <p className="text-xs text-gray-500">Across all registered pets</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={vaxPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35}
                label={({name,percent}) => `${(percent*100).toFixed(0)}%`} labelLine={false}>
                {vaxPieData.map((d,i) => <Cell key={i} fill={d.color}/>)}
              </Pie>
              <Tooltip formatter={(v:any, n:any) => [v, n]}/>
              <Legend/>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
            <div className="text-center"><p className="text-2xl font-black text-green-600">{vaxRate}%</p><p className="text-xs text-gray-500">Coverage</p></div>
            <div className="text-center"><p className="text-2xl font-black text-amber-600">{survey.vaccination.dueSoon}</p><p className="text-xs text-gray-500">Due Soon</p></div>
            <div className="text-center"><p className="text-2xl font-black text-red-500">{survey.vaccination.notVaccinated}</p><p className="text-xs text-gray-500">Unvaccinated</p></div>
          </div>
        </div>

        {/* Pets per barangay */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><BarChart3 className="w-4 h-4 text-blue-600"/></div>
            <div>
              <p className="font-bold text-gray-900">Pets per Barangay</p>
              <p className="text-xs text-gray-500">Top 10 barangays by count</p>
            </div>
          </div>
          {topBarangays.length === 0
            ? <div className="flex items-center justify-center h-40 text-gray-300 text-sm">No data yet</div>
            : <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topBarangays} layout="vertical" margin={{left:-10,right:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                  <XAxis type="number" tick={{fontSize:10}} allowDecimals={false}/>
                  <YAxis type="category" dataKey="name" tick={{fontSize:9}} width={72}/>
                  <Tooltip/>
                  <Bar dataKey="count" name="Pets" fill="#2B5EA6" radius={[0,4,4,0]}>
                    {topBarangays.map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      {/* ── Charts Row 2: Spayed/Neutered + Lost/Found + Impound */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spayed & Neutered */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center"><Scissors className="w-4 h-4 text-purple-600"/></div>
            <div>
              <p className="font-bold text-gray-900">Spayed / Neutered</p>
              <p className="text-xs text-gray-500">Reproductive control</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={spayData.filter(d=>d.value>0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={28}
                label={({name,percent}) => percent > 0.05 ? `${(percent*100).toFixed(0)}%` : ""} labelLine={false}>
                {spayData.map((d,i) => <Cell key={i} fill={d.fill}/>)}
              </Pie>
              <Tooltip/>
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-purple-600">{survey.spayedNeutered.spayed}</p>
              <p className="text-xs text-purple-500 font-semibold">Spayed ♀</p>
            </div>
            <div className="bg-cyan-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-cyan-600">{survey.spayedNeutered.neutered}</p>
              <p className="text-xs text-cyan-500 font-semibold">Neutered ♂</p>
            </div>
          </div>
        </div>

        {/* Lost & Found */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center"><Heart className="w-4 h-4 text-red-600"/></div>
            <div>
              <p className="font-bold text-gray-900">Lost & Found</p>
              <p className="text-xs text-gray-500">Open reports only</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={lfData.filter(d=>d.value>0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={28}
                label={({name,percent}) => percent > 0.05 ? `${(percent*100).toFixed(0)}%` : ""} labelLine={false}>
                {lfData.map((d,i) => <Cell key={i} fill={d.fill}/>)}
              </Pie>
              <Tooltip/>
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-red-600">{survey.lostFound.lost}</p>
              <p className="text-xs text-red-500 font-semibold">Lost</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-green-600">{survey.lostFound.found}</p>
              <p className="text-xs text-green-500 font-semibold">Found</p>
            </div>
          </div>
        </div>

        {/* Impounded */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center"><Shield className="w-4 h-4 text-orange-600"/></div>
            <div>
              <p className="font-bold text-gray-900">Impounded Pets</p>
              <p className="text-xs text-gray-500">Currently in custody</p>
            </div>
          </div>
          <div className="flex items-center justify-center h-[150px]">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg shadow-orange-200 mb-3">
                <span className="text-4xl font-black text-white">{survey.impounded}</span>
              </div>
              <p className="text-sm font-semibold text-gray-700">Pets Impounded</p>
              <p className="text-xs text-gray-400 mt-0.5">Awaiting redemption or adoption</p>
            </div>
          </div>
          <button onClick={() => onTab("pets")} className="w-full mt-3 py-2 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl text-xs font-bold hover:bg-orange-100 transition-colors">
            View Impounded Pets →
          </button>
        </div>
      </div>

      {/* ── Registration Rate */}
      <div className="bg-gradient-to-br from-[#1a3a6e] to-[#2B5EA6] rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5"/>
          <p className="font-bold">Survey vs Registration Rate</p>
          <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full">Based on CSWD Survey Data</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label:"Dogs", surveyed: survey.survey.totalDogs, registered: survey.registered.dogs, rate: survey.registrationRate.dogs },
            { label:"Cats", surveyed: survey.survey.totalCats, registered: survey.registered.cats, rate: survey.registrationRate.cats },
            { label:"Overall", surveyed: survey.survey.total, registered: survey.registered.total, rate: survey.registrationRate.overall },
          ].map(d => (
            <div key={d.label} className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-white/70 text-xs mb-1">{d.label}</p>
              <p className="text-2xl font-black">{d.rate}%</p>
              <div className="w-full h-1.5 bg-white/20 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-[#60A85C] rounded-full transition-all" style={{width:`${Math.min(parseFloat(d.rate),100)}%`}}/>
              </div>
              <p className="text-xs text-white/60 mt-1">{d.registered} / {d.surveyed}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Upcoming Schedules */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-gray-800 flex items-center gap-2"><Calendar className="w-4 h-4 text-[#2B5EA6]"/>Upcoming Schedules</p>
          <button onClick={() => onTab("schedule")} className="text-xs text-[#2B5EA6] font-semibold hover:underline">View All →</button>
        </div>
        {schedules.filter(s=>s.status==="Upcoming").length === 0
          ? <div className="text-center py-6 text-gray-300"><Calendar className="w-8 h-8 mx-auto mb-2"/><p className="text-sm text-gray-400">No upcoming schedules</p></div>
          : <div className="space-y-2">
              {schedules.filter(s=>s.status==="Upcoming").sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime()).slice(0,3).map(s=>{
                const reg = s.registered || s.registeredPets || 0;
                return (
                  <div key={s.id} className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <div className="w-11 h-11 bg-[#2B5EA6] rounded-xl flex flex-col items-center justify-center text-white shrink-0">
                      <p className="text-[9px] font-bold">{new Date(s.date).toLocaleString("en",{month:"short"}).toUpperCase()}</p>
                      <p className="text-base font-black leading-none">{new Date(s.date).getDate()}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{s.barangay}</p>
                      <p className="text-xs text-gray-500 truncate">{s.time_start||s.time} · {s.venue||s.location}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-[#2B5EA6]">{reg}/{s.capacity}</p>
                      <p className="text-xs text-gray-400">registered</p>
                    </div>
                  </div>
                );
              })}
            </div>
        }
      </div>
    </div>
  );
}

// ─── PET DETAIL MODAL ────────────────────────────────────────────────────────

function PetDetailModal({ pet, onClose, onVaccinate }: { pet:Pet; onClose:()=>void; onVaccinate:(p:Pet)=>void }) {
  const vacStatus = vs(pet);
  const isImpounded = impound(pet);
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className={`px-6 py-5 flex items-center justify-between ${vacStatus==="Vaccinated"?"bg-gradient-to-r from-green-600 to-green-500":vacStatus==="Due Soon"?"bg-gradient-to-r from-yellow-500 to-orange-500":"bg-gradient-to-r from-red-600 to-red-500"}`}>
          <div className="flex items-center gap-4">
            {petPhoto(pet)
              ? <img src={petPhoto(pet)} alt={pn(pet)} className="w-16 h-16 rounded-xl object-cover border-2 border-white/40"/>
              : <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center"><PawPrint className="w-8 h-8 text-white"/></div>
            }
            <div>
              <h3 className="text-xl font-bold text-white">{pn(pet)}</h3>
              <p className="text-white/80 text-sm">{pet.species} · {pet.breed}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 text-white text-xs rounded-full">{pet.id}</span>
                {spayed(pet) && <span className="px-1.5 py-0.5 bg-purple-400 text-white text-[10px] font-bold rounded-full">Spayed</span>}
                {neutered(pet) && <span className="px-1.5 py-0.5 bg-cyan-400 text-white text-[10px] font-bold rounded-full">Neutered</span>}
                {isImpounded && <span className="px-1.5 py-0.5 bg-orange-400 text-white text-[10px] font-bold rounded-full">Impounded</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Age", pet.age||"—"], ["Color", pet.color||"—"], ["Gender", pet.gender||"—"],
              ["Registered", fmtDate(pet.registration_date||pet.registrationDate)],
              ["Barangay", brgy(pet)], ["Status", pet.status],
            ].map(([k,v])=>(
              <div key={k} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{k}</p>
                <p className="text-sm font-semibold text-gray-800">{v}</p>
              </div>
            ))}
          </div>
          <div className="border-t pt-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3 font-semibold">Owner Information</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3"><div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><Users className="w-4 h-4 text-blue-600"/></div><div><p className="text-xs text-gray-400">Owner</p><p className="text-sm font-semibold text-gray-800">{on(pet)}</p></div></div>
              <div className="flex items-center gap-3"><div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center"><Phone className="w-4 h-4 text-green-600"/></div><div><p className="text-xs text-gray-400">Contact</p><p className="text-sm font-semibold text-gray-800">{pet.contact_number||pet.ownerContact||"—"}</p></div></div>
              <div className="flex items-center gap-3"><div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center"><MapPin className="w-4 h-4 text-purple-600"/></div><div><p className="text-xs text-gray-400">Address</p><p className="text-sm font-semibold text-gray-800">{pet.address||pet.ownerAddress||"—"}, {brgy(pet)}</p></div></div>
            </div>
          </div>
          {isImpounded && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <p className="text-xs font-bold text-orange-700 uppercase mb-2 flex items-center gap-1"><Shield className="w-3 h-3"/>Impound Record</p>
              <p className="text-sm text-orange-800">{pet.impound_reason||"—"}</p>
              {pet.impound_date && <p className="text-xs text-orange-600 mt-1">Date: {fmtDate(pet.impound_date)}</p>}
            </div>
          )}
          <div className={`rounded-xl p-4 ${vacStatus==="Vaccinated"?"bg-green-50 border border-green-200":vacStatus==="Due Soon"?"bg-yellow-50 border border-yellow-200":"bg-red-50 border border-red-200"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-bold text-sm ${vacStatus==="Vaccinated"?"text-green-700":vacStatus==="Due Soon"?"text-yellow-700":"text-red-700"}`}>{vacStatus}</p>
                {(pet.last_vaccination_date||pet.lastVaccinationDate)&&<p className="text-xs text-gray-500 mt-0.5">Last: {fmtDate(pet.last_vaccination_date||pet.lastVaccinationDate)}</p>}
                {(pet.next_vaccination_date||pet.nextVaccinationDate)&&<p className="text-xs text-gray-500">Next: {fmtDate(pet.next_vaccination_date||pet.nextVaccinationDate)}</p>}
              </div>
              {vacStatus!=="Vaccinated"&&<button onClick={()=>{onVaccinate(pet);onClose();}} className="px-3 py-1.5 bg-[#60A85C] text-white text-xs font-semibold rounded-lg hover:bg-[#4a8a47] flex items-center gap-1"><Syringe className="w-3 h-3"/>Vaccinate</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── LOST/FOUND MODAL ────────────────────────────────────────────────────────

function LostFoundModal({ report, all, pets, onClose, onResolve }: { report:LFReport; all:LFReport[]; pets:Pet[]; onClose:()=>void; onResolve:(id:string,matchId:string)=>void }) {
  const matches = getMatches(report, all);
  const linkedPet = pets.find(p => p.id === (report.pet_id||report.petId));
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className={`px-6 py-5 flex items-center justify-between sticky top-0 ${report.type==="Lost"?"bg-gradient-to-r from-red-600 to-orange-500":"bg-gradient-to-r from-green-600 to-emerald-500"}`}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-white/25 text-white text-xs font-bold rounded-full">{report.type.toUpperCase()}</span>
              <span className="text-white/70 text-xs">{report.id}</span>
            </div>
            <h3 className="text-xl font-bold text-white">{report.pet_name||report.petName}</h3>
            <p className="text-white/80 text-sm">{report.species} · {report.breed} · {report.color}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Reported By</p><p className="text-sm font-semibold">{report.reported_by||report.reportedBy}</p></div>
            <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Contact</p><p className="text-sm font-semibold">{report.contact_number||report.contactNumber||"—"}</p></div>
            <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Last Seen</p><p className="text-sm font-semibold">{report.last_seen_location||report.lastSeenLocation||"—"}</p></div>
            <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Barangay</p><p className="text-sm font-semibold">{report.barangay}</p></div>
            <div className="col-span-2 bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Description</p><p className="text-sm">{report.description||"—"}</p></div>
          </div>
          {linkedPet && (
            <div className="border border-blue-200 bg-blue-50 rounded-xl p-4">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-1"><Tag className="w-3 h-3"/>Linked Pet Record</p>
              <div className="flex items-center gap-3">
                {petPhoto(linkedPet)?<img src={petPhoto(linkedPet)} className="w-12 h-12 rounded-lg object-cover" alt=""/>:<div className="w-12 h-12 rounded-lg bg-blue-200 flex items-center justify-center"><PawPrint className="w-6 h-6 text-blue-600"/></div>}
                <div><p className="font-semibold text-blue-800">{pn(linkedPet)} ({linkedPet.id})</p><p className="text-sm text-blue-600">Owner: {on(linkedPet)} · {linkedPet.contact_number||linkedPet.ownerContact}</p></div>
              </div>
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 mb-3"><Zap className="w-4 h-4 text-amber-500"/><p className="font-bold text-gray-800 text-sm">Smart Matches</p>{matches.length>0&&<span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-semibold">{matches.length} match{matches.length>1?"es":""}</span>}</div>
            {matches.length===0
              ? <div className="bg-gray-50 rounded-xl p-4 text-center"><AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2"/><p className="text-sm text-gray-500">No matches found yet.</p></div>
              : <div className="space-y-3">
                  {matches.map(({report:m,score})=>(
                    <div key={m.id} className="border border-amber-200 bg-amber-50 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${m.type==="Found"?"bg-green-100 text-green-700":"bg-red-100 text-red-700"}`}>{m.type}</span>
                          <p className="font-bold text-gray-800 mt-1">{m.pet_name||m.petName} · {m.breed}</p>
                          <p className="text-sm text-gray-600">{m.color} · {m.barangay}</p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <div className={`text-lg font-black ${score>=70?"text-green-600":score>=50?"text-amber-600":"text-orange-500"}`}>{score}%</div>
                          <div className="text-xs text-gray-400">match</div>
                        </div>
                      </div>
                      {report.status==="Open"&&<button onClick={()=>{onResolve(report.id,m.id);onClose();}} className="mt-1 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 flex items-center gap-1"><CheckCircle className="w-3 h-3"/>Mark Resolved</button>}
                    </div>
                  ))}
                </div>
            }
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${report.status==="Open"?"bg-yellow-100 text-yellow-800":"bg-gray-100 text-gray-600"}`}>{report.status}</span>
            {report.status==="Open"&&<button onClick={()=>{onResolve(report.id,"");onClose();}} className="text-sm text-gray-500 hover:text-gray-800 underline">Mark Resolved (no match)</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SCHEDULE CALENDAR ───────────────────────────────────────────────────────

function ScheduleCalendar({ schedules, onAdd, onManage }: { schedules:BarangaySchedule[]; onAdd:()=>void; onManage:(s:BarangaySchedule)=>void }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const firstDay=new Date(viewYear,viewMonth,1).getDay();
  const daysInMonth=new Date(viewYear,viewMonth+1,0).getDate();
  const schedulesThisMonth=schedules.filter(s=>{const d=new Date(s.date);return d.getFullYear()===viewYear&&d.getMonth()===viewMonth;});
  const getForDay=(day:number)=>schedules.filter(s=>{const d=new Date(s.date);return d.getFullYear()===viewYear&&d.getMonth()===viewMonth&&d.getDate()===day;});
  const statusColor:Record<string,string>={Upcoming:"bg-[#2B5EA6]",Completed:"bg-green-500",Cancelled:"bg-red-400"};
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-[#1e4080] to-[#2B5EA6] px-6 py-4 flex items-center justify-between">
          <button onClick={()=>{if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1);}} className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30"><ChevronLeft className="w-4 h-4 text-white"/></button>
          <div className="text-center"><p className="text-white font-bold text-lg">{MONTHS[viewMonth]} {viewYear}</p><p className="text-white/60 text-xs">{schedulesThisMonth.length} schedule{schedulesThisMonth.length!==1?"s":""}</p></div>
          <button onClick={()=>{if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1);}} className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30"><ChevronRight className="w-4 h-4 text-white"/></button>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-7 mb-2">{DAYS.map(d=><div key={d} className="text-center text-xs font-bold text-gray-400 py-1">{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({length:firstDay},(_,i)=><div key={`e${i}`}/>)}
            {Array.from({length:daysInMonth},(_,i)=>{
              const day=i+1;const ds=getForDay(day);
              const isToday=today.getFullYear()===viewYear&&today.getMonth()===viewMonth&&today.getDate()===day;
              return (
                <div key={day} className={`min-h-[52px] rounded-xl p-1.5 border transition-colors ${isToday?"border-[#2B5EA6] bg-blue-50":ds.length?"border-transparent bg-gray-50 hover:bg-gray-100":"border-transparent hover:bg-gray-50"}`}>
                  <p className={`text-xs font-bold mb-1 ${isToday?"text-[#2B5EA6]":"text-gray-600"}`}>{day}</p>
                  {ds.map(s=><button key={s.id} onClick={()=>onManage(s)} className={`w-full text-left px-1 py-0.5 rounded text-white text-[9px] font-semibold truncate block mb-0.5 ${statusColor[s.status]||"bg-gray-400"} hover:opacity-80`}>{s.barangay.replace("Barangay ","Brgy ").replace("Poblacion","Pob.")}</button>)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <p className="font-bold text-gray-800">Schedules in {MONTHS[viewMonth]}</p>
          <button onClick={onAdd} className="flex items-center gap-2 px-3 py-1.5 bg-[#2B5EA6] text-white rounded-lg text-sm font-semibold hover:bg-[#234a85]"><Plus className="w-3.5 h-3.5"/>Add Schedule</button>
        </div>
        {schedulesThisMonth.length===0
          ? <div className="p-8 text-center"><Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2"/><p className="text-gray-400 text-sm">No schedules this month</p></div>
          : <div className="divide-y">
              {schedulesThisMonth.sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime()).map(s=>{
                const reg=s.registered||s.registeredPets||0;
                return (
                  <div key={s.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white ${statusColor[s.status]||"bg-gray-400"}`}>
                        <p className="text-xs font-bold leading-none">{MONTHS[new Date(s.date).getMonth()].slice(0,3).toUpperCase()}</p>
                        <p className="text-lg font-black leading-none">{new Date(s.date).getDate()}</p>
                      </div>
                      <div><p className="font-bold text-gray-800">{s.barangay}</p><p className="text-sm text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3"/>{s.time_start||s.time}</p><p className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3"/>{s.venue||s.location}</p></div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1"><div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-[#60A85C] rounded-full" style={{width:`${(reg/s.capacity)*100}%`}}/></div><span className="text-xs text-gray-600">{reg}/{s.capacity}</span></div>
                      <button onClick={()=>onManage(s)} className="text-xs text-[#2B5EA6] hover:underline font-semibold">Manage →</button>
                    </div>
                  </div>
                );
              })}
            </div>
        }
      </div>
    </div>
  );
}

// ─── VACCINATE MODAL ─────────────────────────────────────────────────────────

function VaccinateModal({ pet, onConfirm, onClose }: { pet:Pet; onConfirm:(p:Pet)=>void; onClose:()=>void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center"><Syringe className="w-4 h-4 text-white"/></div><p className="font-bold text-white">Record Vaccination</p></div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4 bg-green-50 rounded-xl p-4">
            {petPhoto(pet)?<img src={petPhoto(pet)} className="w-14 h-14 rounded-xl object-cover" alt=""/>:<div className="w-14 h-14 bg-green-200 rounded-xl flex items-center justify-center"><PawPrint className="w-7 h-7 text-green-600"/></div>}
            <div><p className="font-bold text-gray-800">{pn(pet)}</p><p className="text-sm text-gray-600">{pet.species} · {pet.breed}</p><p className="text-xs text-gray-500">Owner: {on(pet)}</p></div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 space-y-1">
            <p className="font-semibold flex items-center gap-1.5"><Info className="w-4 h-4"/>What will be recorded:</p>
            <p>• Vaccination date: <strong>Today ({fmtDate(new Date().toISOString().split("T")[0])})</strong></p>
            <p>• Next due date: <strong>1 year from today</strong></p>
            <p>• Status: <strong>Vaccinated ✓</strong></p>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
            <button onClick={()=>onConfirm(pet)} className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 flex items-center justify-center gap-1.5"><Syringe className="w-4 h-4"/>Confirm</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function PetRegistration() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [reports, setReports] = useState<LFReport[]>([]);
  const [schedules, setSchedules] = useState<BarangaySchedule[]>([]);
  const [survey, setSurvey] = useState<SurveyData|null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview"|"pets"|"lost-found"|"schedule">("overview");

  const [search, setSearch] = useState("");
  const [filterVax, setFilterVax] = useState("all");
  const [filterSpecies, setFilterSpecies] = useState("all");
  const [filterBrgy, setFilterBrgy] = useState("all");
  const [filterType, setFilterType] = useState<"all"|"Lost"|"Found">("all");
  const [filterImpound, setFilterImpound] = useState<"all"|"impounded">("all");

  const [showNewPet, setShowNewPet] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [showVaccinate, setShowVaccinate] = useState(false);
  const [showLFDialog, setShowLFDialog] = useState(false);
  const [showScheduleAdd, setShowScheduleAdd] = useState(false);
  const [viewPet, setViewPet] = useState<Pet|null>(null);
  const [viewReport, setViewReport] = useState<LFReport|null>(null);
  const [manageSchedule, setManageSchedule] = useState<BarangaySchedule|null>(null);
  const [vaccinatePet, setVaccinatePet] = useState<Pet|null>(null);
  const [saving, setSaving] = useState(false);

  const [np, setNp] = useState({
    petName:"",species:"",breed:"",age:"",color:"",gender:"",
    isSpayed:false,isNeutered:false,
    ownerName:"",ownerContact:"",ownerAddress:"",barangay:"",
    microchipId:"",photoUrl:"",
    impoundStatus:"None",impoundReason:""
  });
  const [lfForm, setLfForm] = useState({ petId:"",type:"Lost" as "Lost"|"Found", reportedBy:"",contactNumber:"",lastSeenLocation:"",barangay:"",description:"",species:"",breed:"",color:"" });
  const [schForm, setSchForm] = useState({ barangay:"",date:"",time:"",location:"",capacity:"100" });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pRes, rRes, sRes, svRes] = await Promise.all([
        api.getPets(), api.getLostFound(), api.getSchedules(), api.getPetSurveyData()
      ]);
      setPets(pRes.pets || []);
      setReports(rRes.reports || rRes.lostFoundReports || []);
      setSchedules(sRes.schedules || []);
      setSurvey(svRes);
    } catch(e) { console.error("load error", e); }
    setLoading(false);
  };

  const handleAddPet = async () => {
    if(!np.petName||!np.species||!np.breed||!np.ownerName||!np.barangay) return;
    setSaving(true);
    try {
      const res = await api.createPet({
        petName: np.petName, species: np.species, breed: np.breed, age: np.age,
        color: np.color, gender: np.gender || null,
        isSpayed: np.isSpayed, isNeutered: np.isNeutered,
        ownerName: np.ownerName, contactNumber: np.ownerContact, address: np.ownerAddress,
        barangay: np.barangay, microchipId: np.microchipId || null,
        photoUrl: np.photoUrl || null, vaccinationStatus: "Not Vaccinated",
        impoundStatus: np.impoundStatus || "None",
        impoundReason: np.impoundReason || null,
      });
      if (res.pet) setPets(prev => [res.pet, ...prev]);
      setNp({ petName:"",species:"",breed:"",age:"",color:"",gender:"",isSpayed:false,isNeutered:false,ownerName:"",ownerContact:"",ownerAddress:"",barangay:"",microchipId:"",photoUrl:"",impoundStatus:"None",impoundReason:"" });
      setShowNewPet(false);
      await loadAll();
    } catch(e:any) { alert("Error: " + e.message); }
    setSaving(false);
  };

  const handleVaccinate = async (pet: Pet) => {
    const today = new Date();
    const next = new Date(today); next.setFullYear(next.getFullYear()+1);
    try {
      await api.updatePet(pet.id, {
        vaccinationStatus: "Vaccinated",
        lastVaccinationDate: today.toISOString().split("T")[0],
        nextVaccinationDate: next.toISOString().split("T")[0],
      });
      setPets(prev => prev.map(p => p.id === pet.id ? {
        ...p, vaccination_status:"Vaccinated",
        last_vaccination_date: today.toISOString().split("T")[0],
        next_vaccination_date: next.toISOString().split("T")[0],
      } : p));
    } catch(e:any) { alert("Error: " + e.message); }
    setShowVaccinate(false); setVaccinatePet(null);
  };

  const handleAddLF = async () => {
    if(!lfForm.reportedBy||!lfForm.contactNumber||!lfForm.barangay||!lfForm.description) return;
    setSaving(true);
    try {
      const pet = pets.find(p => p.id === lfForm.petId);
      const res = await api.createLostFound({
        petId: lfForm.petId || "UNKNOWN",
        petName: pet ? pn(pet) : "Unknown",
        species: lfForm.species || pet?.species || "Unknown",
        breed: lfForm.breed || pet?.breed || "Unknown",
        color: lfForm.color || pet?.color || "Unknown",
        type: lfForm.type, reportedBy: lfForm.reportedBy,
        contactNumber: lfForm.contactNumber,
        lastSeenLocation: lfForm.lastSeenLocation,
        barangay: lfForm.barangay, description: lfForm.description,
      });
      if (res.report) setReports(prev => [res.report, ...prev]);
      if (lfForm.type === "Lost" && pet) {
        await api.updatePet(pet.id, { status: "Lost" });
        setPets(prev => prev.map(p => p.id === pet.id ? { ...p, status: "Lost" } : p));
      }
      setLfForm({ petId:"",type:"Lost",reportedBy:"",contactNumber:"",lastSeenLocation:"",barangay:"",description:"",species:"",breed:"",color:"" });
      setShowLFDialog(false);
      await loadAll();
    } catch(e:any) { alert("Error: " + e.message); }
    setSaving(false);
  };

  const handleResolve = async (id: string, matchId: string) => {
    try {
      await api.updateLostFound(id, { status: "Resolved" });
      if (matchId) await api.updateLostFound(matchId, { status: "Resolved" });
      setReports(prev => prev.map(r => r.id===id||r.id===matchId ? { ...r, status:"Resolved" } : r));
    } catch(e:any) { alert("Error: " + e.message); }
  };

  const handleAddSchedule = async () => {
    if(!schForm.barangay||!schForm.date||!schForm.time||!schForm.location) return;
    setSaving(true);
    try {
      const res = await api.createSchedule({
        barangay: schForm.barangay, date: schForm.date,
        timeStart: schForm.time, venue: schForm.location, capacity: +schForm.capacity||100,
      });
      if (res.schedule) setSchedules(prev => [...prev, res.schedule]);
      setSchForm({ barangay:"",date:"",time:"",location:"",capacity:"100" });
      setShowScheduleAdd(false);
    } catch(e:any) { alert("Error: " + e.message); }
    setSaving(false);
  };

  const handleExportPets = () => {
    const csv = ["Pet ID,Name,Species,Breed,Age,Color,Gender,Spayed,Neutered,Owner,Contact,Barangay,Vaccination,Last Vaccinated,Status,Impounded",
      ...filteredPets.map(p=>`${p.id},${pn(p)},${p.species},${p.breed},${p.age||""},${p.color},${p.gender||""},${spayed(p)},${neutered(p)},${on(p)},${p.contact_number||""},${brgy(p)},${vs(p)},${p.last_vaccination_date||""},${p.status},${impound(p)||"No"}`)
    ].join("\n");
    const b = new Blob([csv],{type:"text/csv"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download="pet_records.csv"; a.click();
  };

  // ── Computed
  const filteredPets = pets.filter(p => {
    const s = search.toLowerCase();
    const m = pn(p).toLowerCase().includes(s)||on(p).toLowerCase().includes(s)||p.id.toLowerCase().includes(s)||p.breed.toLowerCase().includes(s);
    const v = filterVax==="all"||(filterVax==="vaccinated"&&vs(p)==="Vaccinated")||(filterVax==="not-vaccinated"&&vs(p)==="Not Vaccinated")||(filterVax==="due-soon"&&vs(p)==="Due Soon");
    const sp2 = filterSpecies==="all"||p.species===filterSpecies;
    const br2 = filterBrgy==="all"||brgy(p)===filterBrgy;
    const imp = filterImpound==="all"||(filterImpound==="impounded"&&!!impound(p));
    return m&&v&&sp2&&br2&&imp;
  });

  const filteredReports = reports.filter(r => {
    const s = search.toLowerCase();
    const m = !s||(r.pet_name||r.petName||"").toLowerCase().includes(s)||(r.reported_by||r.reportedBy||"").toLowerCase().includes(s)||r.id.toLowerCase().includes(s)||r.barangay.toLowerCase().includes(s);
    const t = filterType==="all"||r.type===filterType;
    return m&&t;
  });

  const openReports = reports.filter(r=>r.status==="Open");
  const totalMatches = openReports.filter(r=>r.type==="Lost").reduce((a,r)=>a+(getMatches(r,reports).length>0?1:0),0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#2B5EA6] border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
        <p className="text-gray-500 text-sm">Loading pet records…</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 pb-8">
      {/* ── Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <PawPrint className="w-6 h-6 text-[#2B5EA6]"/>Pet Registration
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">Calaca CVO · Rabies Program · Lost & Found · Vaccination Schedules</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={loadAll} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500"><RefreshCw className="w-4 h-4"/></button>
          <button onClick={()=>setShowNewPet(true)} className="flex items-center gap-2 px-4 py-2 bg-[#2B5EA6] text-white rounded-xl font-semibold text-sm hover:bg-[#234a85] shadow-sm transition-all hover:shadow-md"><Plus className="w-4 h-4"/>Register Pet</button>
          <button onClick={()=>setShowLFDialog(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 shadow-sm"><AlertCircle className="w-4 h-4"/>Report Lost/Found</button>
          <button onClick={()=>{setActiveTab("schedule");setShowScheduleAdd(true);}} className="flex items-center gap-2 px-4 py-2 bg-[#60A85C] text-white rounded-xl font-semibold text-sm hover:bg-[#4a8a47] shadow-sm"><Calendar className="w-4 h-4"/>Add Schedule</button>
        </div>
      </div>

      {/* ── Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 flex gap-1 flex-wrap">
        {([
          ["overview","Overview",<Activity className="w-4 h-4"/>],
          ["pets",`Pet Records (${pets.length})`,<PawPrint className="w-4 h-4"/>],
          ["lost-found",`Lost & Found (${openReports.length})`,<Heart className="w-4 h-4"/>],
          ["schedule","Schedules",<Calendar className="w-4 h-4"/>],
        ] as [string,string,any][]).map(([key,label,icon])=>(
          <button key={key} onClick={()=>setActiveTab(key as any)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${activeTab===key?"bg-[#2B5EA6] text-white shadow-sm":"text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW */}
      {activeTab==="overview" && (
        <OverviewTab survey={survey} pets={pets} reports={reports} schedules={schedules} onTab={t=>setActiveTab(t as any)}/>
      )}

      {/* ══ PETS */}
      {activeTab==="pets" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px] relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/><input placeholder="Search pets, owners, IDs…" value={search} onChange={e=>setSearch(e.target.value)} className={`${INPUT} pl-9`}/></div>
              <select value={filterVax} onChange={e=>setFilterVax(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white">
                <option value="all">All Status</option><option value="vaccinated">Vaccinated</option><option value="not-vaccinated">Not Vaccinated</option><option value="due-soon">Due Soon</option>
              </select>
              <select value={filterSpecies} onChange={e=>setFilterSpecies(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white">
                <option value="all">All Species</option><option value="Dog">Dogs</option><option value="Cat">Cats</option>
              </select>
              <select value={filterBrgy} onChange={e=>setFilterBrgy(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white">
                <option value="all">All Barangays</option>{CALACA_BARANGAYS.map(b=><option key={b} value={b}>{b}</option>)}
              </select>
              <select value={filterImpound} onChange={e=>setFilterImpound(e.target.value as any)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white">
                <option value="all">All</option><option value="impounded">Impounded Only</option>
              </select>
              <button onClick={handleExportPets} className="flex items-center gap-2 px-4 py-2.5 bg-[#60A85C] text-white rounded-xl text-sm font-semibold hover:bg-[#4a8a47]"><Download className="w-4 h-4"/>Export CSV</button>
            </div>
            <p className="text-xs text-gray-400 mt-2">{filteredPets.length} of {pets.length} records shown</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {["Photo","ID","Pet","Owner","Barangay","S/N","Vaccination","Impound","Actions"].map(h=><th key={h} className="text-left py-3 px-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredPets.map(pet=>(
                    <tr key={pet.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-3">
                        {petPhoto(pet)?<img src={petPhoto(pet)} alt={pn(pet)} className="w-10 h-10 rounded-xl object-cover border border-gray-200"/>:<div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center border border-dashed border-gray-300"><PawPrint className="w-4 h-4 text-gray-400"/></div>}
                      </td>
                      <td className="py-3 px-3"><p className="text-xs font-bold text-gray-600">{pet.id}</p>{pet.status!=="Active"&&<span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded ${pet.status==="Lost"?"bg-red-100 text-red-700":"bg-blue-100 text-blue-700"}`}>{pet.status}</span>}</td>
                      <td className="py-3 px-3"><p className="font-semibold text-gray-800 text-sm">{pn(pet)}</p><p className="text-xs text-gray-500">{pet.species} · {pet.breed} · {pet.color}</p></td>
                      <td className="py-3 px-3"><p className="text-sm font-semibold text-gray-800">{on(pet)}</p><p className="text-xs text-gray-500">{pet.contact_number||pet.ownerContact||"—"}</p></td>
                      <td className="py-3 px-3 text-sm text-gray-600">{brgy(pet)}</td>
                      <td className="py-3 px-3">
                        <div className="flex gap-1">
                          {spayed(pet)&&<span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full">S</span>}
                          {neutered(pet)&&<span className="px-1.5 py-0.5 bg-cyan-100 text-cyan-700 text-[10px] font-bold rounded-full">N</span>}
                          {!spayed(pet)&&!neutered(pet)&&<span className="text-gray-300 text-xs">—</span>}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${vs(pet)==="Vaccinated"?"bg-green-100 text-green-700":vs(pet)==="Due Soon"?"bg-amber-100 text-amber-700":"bg-red-100 text-red-700"}`}>
                          {vs(pet)==="Vaccinated"?<CheckCircle className="w-3 h-3"/>:<AlertCircle className="w-3 h-3"/>}
                          {vs(pet)}
                        </span>
                      </td>
                      <td className="py-3 px-3">{impound(pet)?<span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">{impound(pet)}</span>:<span className="text-gray-300 text-xs">—</span>}</td>
                      <td className="py-3 px-3">
                        <div className="flex gap-1">
                          <button onClick={()=>setViewPet(pet)} className="px-2.5 py-1.5 bg-[#2B5EA6] text-white text-xs font-semibold rounded-lg hover:bg-[#234a85] flex items-center gap-1"><Eye className="w-3 h-3"/>View</button>
                          {vs(pet)!=="Vaccinated"&&<button onClick={()=>{setVaccinatePet(pet);setShowVaccinate(true);}} className="px-2.5 py-1.5 bg-[#60A85C] text-white text-xs font-semibold rounded-lg hover:bg-[#4a8a47] flex items-center gap-1"><Syringe className="w-3 h-3"/>Vax</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredPets.length===0&&<tr><td colSpan={9} className="py-12 text-center text-gray-400"><PawPrint className="w-8 h-8 mx-auto mb-2 text-gray-200"/><p className="text-sm">No pets found</p></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══ LOST & FOUND */}
      {activeTab==="lost-found" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center"><p className="text-3xl font-black text-red-600">{openReports.filter(r=>r.type==="Lost").length}</p><p className="text-xs text-red-500 font-semibold mt-1">Lost (Open)</p></div>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center"><p className="text-3xl font-black text-green-600">{openReports.filter(r=>r.type==="Found").length}</p><p className="text-xs text-green-500 font-semibold mt-1">Found (Open)</p></div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center"><p className="text-3xl font-black text-amber-600">{totalMatches}</p><p className="text-xs text-amber-600 font-semibold mt-1">Smart Matches</p></div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3">
            <div className="flex-1 min-w-[180px] relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/><input placeholder="Search reports…" value={search} onChange={e=>setSearch(e.target.value)} className={`${INPUT} pl-9`}/></div>
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
              {(["all","Lost","Found"] as const).map(t=><button key={t} onClick={()=>setFilterType(t)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType===t?"bg-white shadow text-gray-800":"text-gray-500 hover:text-gray-700"}`}>{t==="all"?"All":t}</button>)}
            </div>
          </div>
          <div className="space-y-3">
            {filteredReports.map(r=>{
              const matches=getMatches(r,reports);
              return (
                <div key={r.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-all ${r.status==="Resolved"?"border-gray-200 opacity-70":"border-gray-100"}`}>
                  <div className={`h-1.5 ${r.type==="Lost"?"bg-gradient-to-r from-red-500 to-orange-400":"bg-gradient-to-r from-green-500 to-emerald-400"}`}/>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${r.type==="Lost"?"bg-red-100":"bg-green-100"}`}>
                          {r.type==="Lost"?<AlertCircle className="w-6 h-6 text-red-500"/>:<Heart className="w-6 h-6 text-green-500"/>}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${r.type==="Lost"?"bg-red-100 text-red-700":"bg-green-100 text-green-700"}`}>{r.type}</span>
                            <span className="text-xs text-gray-400">{r.id}</span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${r.status==="Open"?"bg-yellow-100 text-yellow-700":"bg-gray-100 text-gray-500"}`}>{r.status}</span>
                            {matches.length>0&&r.status==="Open"&&<span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-700 flex items-center gap-0.5"><Zap className="w-3 h-3"/>{matches.length} match{matches.length>1?"es":""}</span>}
                          </div>
                          <p className="font-bold text-gray-800">{r.pet_name||r.petName} <span className="font-normal text-gray-500 text-sm">· {r.breed} · {r.color}</span></p>
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3"/>{r.last_seen_location||r.lastSeenLocation||"—"}, {r.barangay}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-400">{fmtDate(r.date_reported||r.dateReported)}</p>
                        <p className="text-sm font-semibold text-gray-700 mt-0.5">{r.reported_by||r.reportedBy}</p>
                        <button onClick={()=>setViewReport(r)} className="mt-2 px-3 py-1.5 bg-[#2B5EA6] text-white text-xs font-bold rounded-lg hover:bg-[#234a85] flex items-center gap-1 ml-auto"><Eye className="w-3 h-3"/>Details</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredReports.length===0&&<div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-12 text-center"><AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-200"/><p className="text-sm text-gray-400">No reports found</p></div>}
          </div>
        </div>
      )}

      {/* ══ SCHEDULE */}
      {activeTab==="schedule" && (
        <ScheduleCalendar schedules={schedules} onAdd={()=>setShowScheduleAdd(true)} onManage={s=>setManageSchedule(s)}/>
      )}

      {/* ══ MODALS ══ */}

      {/* New Pet */}
      {showNewPet && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-[#1e4080] to-[#2B5EA6] px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3"><div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center"><PawPrint className="w-4 h-4 text-white"/></div><p className="font-bold text-white">Register New Pet</p></div>
              <button onClick={()=>setShowNewPet(false)} className="text-white/70 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-5">
              {/* Photo */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Pet Photo</label>
                {np.photoUrl
                  ? <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <img src={np.photoUrl} className="w-20 h-20 rounded-xl object-cover border border-gray-300" alt=""/>
                      <div className="space-y-2">
                        <button onClick={()=>setShowPhoto(true)} className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100"><RefreshCw className="w-3.5 h-3.5"/>Change</button>
                        <button onClick={()=>setNp({...np,photoUrl:""})} className="flex items-center gap-2 text-red-500 text-sm hover:text-red-700"><X className="w-3.5 h-3.5"/>Remove</button>
                      </div>
                    </div>
                  : <button onClick={()=>setShowPhoto(true)} className="w-full flex items-center gap-4 p-4 border-2 border-dashed border-[#2B5EA6]/30 rounded-xl hover:border-[#2B5EA6] hover:bg-blue-50 transition-all group">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 shrink-0"><ImagePlus className="w-6 h-6 text-[#2B5EA6]"/></div>
                      <div className="text-left"><p className="text-sm font-semibold text-gray-700">Add Pet Photo</p><p className="text-xs text-gray-400">Camera or gallery upload</p></div>
                    </button>
                }
              </div>

              {/* Pet Info */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 border-b pb-2">Pet Information</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Pet Name *</label><input value={np.petName} onChange={e=>setNp({...np,petName:e.target.value})} className={INPUT} placeholder="e.g., Brownie"/></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Species *</label><select value={np.species} onChange={e=>setNp({...np,species:e.target.value})} className={INPUT}><option value="">Select…</option><option value="Dog">Dog</option><option value="Cat">Cat</option></select></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Breed *</label><input value={np.breed} onChange={e=>setNp({...np,breed:e.target.value})} className={INPUT} placeholder="e.g., Aspin"/></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Age</label><input value={np.age} onChange={e=>setNp({...np,age:e.target.value})} className={INPUT} placeholder="e.g., 2 years"/></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Color</label><input value={np.color} onChange={e=>setNp({...np,color:e.target.value})} className={INPUT} placeholder="e.g., Brown"/></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Gender</label><select value={np.gender} onChange={e=>setNp({...np,gender:e.target.value})} className={INPUT}><option value="">Select…</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Microchip ID</label><input value={np.microchipId} onChange={e=>setNp({...np,microchipId:e.target.value})} className={INPUT} placeholder="Optional"/></div>
                  {/* Spay / Neuter */}
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Reproductive Status</label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div onClick={()=>setNp({...np,isSpayed:!np.isSpayed})} className={`w-10 h-6 rounded-full transition-all relative ${np.isSpayed?"bg-purple-500":"bg-gray-200"}`}>
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${np.isSpayed?"left-4":"left-0.5"}`}/>
                        </div>
                        <span className="text-sm font-semibold text-gray-700">Spayed <span className="text-purple-500 text-xs">(♀ female)</span></span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div onClick={()=>setNp({...np,isNeutered:!np.isNeutered})} className={`w-10 h-6 rounded-full transition-all relative ${np.isNeutered?"bg-cyan-500":"bg-gray-200"}`}>
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${np.isNeutered?"left-4":"left-0.5"}`}/>
                        </div>
                        <span className="text-sm font-semibold text-gray-700">Neutered <span className="text-cyan-500 text-xs">(♂ male)</span></span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Owner Info */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 border-b pb-2">Owner Information</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Owner Name *</label><input value={np.ownerName} onChange={e=>setNp({...np,ownerName:e.target.value})} className={INPUT} placeholder="Full name"/></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Contact Number</label><input value={np.ownerContact} onChange={e=>setNp({...np,ownerContact:e.target.value})} className={INPUT} placeholder="0917-xxx-xxxx"/></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Address</label><input value={np.ownerAddress} onChange={e=>setNp({...np,ownerAddress:e.target.value})} className={INPUT} placeholder="Purok / Zone / Phase"/></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Barangay *</label><select value={np.barangay} onChange={e=>setNp({...np,barangay:e.target.value})} className={INPUT}><option value="">Select…</option>{CALACA_BARANGAYS.map(b=><option key={b} value={b}>{b}</option>)}</select></div>
                </div>
              </div>

              {/* Impound */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 border-b pb-2">Impound Status</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Impound Status</label>
                    <select value={np.impoundStatus} onChange={e=>setNp({...np,impoundStatus:e.target.value})} className={INPUT}>
                      <option value="None">None</option>
                      <option value="Impounded">Impounded</option>
                      <option value="For Redemption">For Redemption</option>
                      <option value="For Adoption">For Adoption</option>
                      <option value="Released">Released</option>
                    </select>
                  </div>
                  {np.impoundStatus !== "None" && (
                    <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1.5">Reason / Notes</label><input value={np.impoundReason} onChange={e=>setNp({...np,impoundReason:e.target.value})} className={INPUT} placeholder="Reason for impound…"/></div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={()=>setShowNewPet(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                <button onClick={handleAddPet} disabled={!np.petName||!np.species||!np.breed||!np.ownerName||!np.barangay||saving} className="flex-1 py-2.5 bg-[#2B5EA6] text-white rounded-xl text-sm font-bold hover:bg-[#234a85] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {saving?<><RefreshCw className="w-4 h-4 animate-spin"/>Saving…</>:<><PawPrint className="w-4 h-4"/>Register Pet</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lost/Found Report */}
      {showLFDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3"><div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center"><AlertCircle className="w-4 h-4 text-white"/></div><p className="font-bold text-white">Report Lost / Found Pet</p></div>
              <button onClick={()=>setShowLFDialog(false)} className="text-white/70 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                {(["Lost","Found"] as const).map(t=><button key={t} onClick={()=>setLfForm({...lfForm,type:t})} className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all ${lfForm.type===t?t==="Lost"?"border-red-500 bg-red-50 text-red-700":"border-green-500 bg-green-50 text-green-700":"border-gray-200 text-gray-500 hover:border-gray-300"}`}>{t==="Lost"?"🔴 Lost Pet":"🟢 Found Pet"}</button>)}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1.5">Linked Pet from Registry (if known)</label><select value={lfForm.petId} onChange={e=>setLfForm({...lfForm,petId:e.target.value})} className={INPUT}><option value="">Unknown / Not Registered</option>{pets.map(p=><option key={p.id} value={p.id}>{p.id} – {pn(p)} ({on(p)})</option>)}</select></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Species</label><select value={lfForm.species} onChange={e=>setLfForm({...lfForm,species:e.target.value})} className={INPUT}><option value="">Select…</option><option value="Dog">Dog</option><option value="Cat">Cat</option><option value="Other">Other</option></select></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Breed</label><input value={lfForm.breed} onChange={e=>setLfForm({...lfForm,breed:e.target.value})} className={INPUT} placeholder="e.g., Aspin"/></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Color</label><input value={lfForm.color} onChange={e=>setLfForm({...lfForm,color:e.target.value})} className={INPUT} placeholder="e.g., Brown, White"/></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Barangay *</label><select value={lfForm.barangay} onChange={e=>setLfForm({...lfForm,barangay:e.target.value})} className={INPUT}><option value="">Select…</option>{CALACA_BARANGAYS.map(b=><option key={b} value={b}>{b}</option>)}</select></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Reported By *</label><input value={lfForm.reportedBy} onChange={e=>setLfForm({...lfForm,reportedBy:e.target.value})} className={INPUT} placeholder="Your name"/></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Contact Number *</label><input value={lfForm.contactNumber} onChange={e=>setLfForm({...lfForm,contactNumber:e.target.value})} className={INPUT} placeholder="0917-xxx-xxxx"/></div>
                <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1.5">Last Seen Location</label><input value={lfForm.lastSeenLocation} onChange={e=>setLfForm({...lfForm,lastSeenLocation:e.target.value})} className={INPUT} placeholder="Street, landmark…"/></div>
                <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1.5">Description *</label><textarea value={lfForm.description} onChange={e=>setLfForm({...lfForm,description:e.target.value})} rows={3} className={INPUT} placeholder="Color, size, collar, markings, behavior…"/></div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={()=>setShowLFDialog(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                <button onClick={handleAddLF} disabled={!lfForm.reportedBy||!lfForm.contactNumber||!lfForm.barangay||!lfForm.description||saving} className={`flex-1 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-40 ${lfForm.type==="Lost"?"bg-red-500 hover:bg-red-600":"bg-green-600 hover:bg-green-700"} flex items-center justify-center gap-2`}>
                  {saving?<><RefreshCw className="w-4 h-4 animate-spin"/>Saving…</>:`Submit ${lfForm.type} Report`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Schedule */}
      {showScheduleAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-[#3a7a35] to-[#60A85C] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center"><Calendar className="w-4 h-4 text-white"/></div><p className="font-bold text-white">Add Vaccination Schedule</p></div>
              <button onClick={()=>setShowScheduleAdd(false)} className="text-white/70 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Barangay *</label><select value={schForm.barangay} onChange={e=>setSchForm({...schForm,barangay:e.target.value})} className={INPUT}><option value="">Select barangay…</option>{CALACA_BARANGAYS.map(b=><option key={b} value={b}>{b}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Date *</label><input type="date" value={schForm.date} onChange={e=>setSchForm({...schForm,date:e.target.value})} className={INPUT}/></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Capacity</label><input type="number" value={schForm.capacity} onChange={e=>setSchForm({...schForm,capacity:e.target.value})} className={INPUT}/></div>
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Time *</label><input value={schForm.time} onChange={e=>setSchForm({...schForm,time:e.target.value})} className={INPUT} placeholder="e.g. 8:00 AM – 12:00 PM"/></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Location / Venue *</label><input value={schForm.location} onChange={e=>setSchForm({...schForm,location:e.target.value})} className={INPUT} placeholder="Venue name"/></div>
              <div className="flex gap-2 pt-2">
                <button onClick={()=>setShowScheduleAdd(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                <button onClick={handleAddSchedule} disabled={!schForm.barangay||!schForm.date||!schForm.time||!schForm.location||saving} className="flex-1 py-2.5 bg-[#60A85C] text-white rounded-xl text-sm font-bold hover:bg-[#4a8a47] disabled:opacity-40 flex items-center justify-center gap-2">
                  {saving?<><RefreshCw className="w-4 h-4 animate-spin"/>Saving…</>:"Add Schedule"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-modals */}
      {showPhoto && <PetPhotoCapture petName={np.petName} onCapture={url=>{setNp(p=>({...p,photoUrl:url}));setShowPhoto(false);}} onClose={()=>setShowPhoto(false)}/>}
      {viewPet && <PetDetailModal pet={viewPet} onClose={()=>setViewPet(null)} onVaccinate={p=>{setVaccinatePet(p);setViewPet(null);setShowVaccinate(true);}}/>}
      {viewReport && <LostFoundModal report={viewReport} all={reports} pets={pets} onClose={()=>setViewReport(null)} onResolve={handleResolve}/>}
      {manageSchedule && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-[#1e4080] to-[#2B5EA6] px-6 py-4 flex items-center justify-between">
              <p className="font-bold text-white">Manage Schedule — {manageSchedule.id}</p>
              <button onClick={()=>setManageSchedule(null)} className="text-white/70 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="col-span-2"><p className="text-xs font-semibold text-gray-600 mb-1">Barangay</p><p className="font-bold text-gray-800">{manageSchedule.barangay}</p></div>
                <div><p className="text-xs font-semibold text-gray-600 mb-1">Date</p><p className="font-semibold text-gray-700">{fmtDate(manageSchedule.date)}</p></div>
                <div><p className="text-xs font-semibold text-gray-600 mb-1">Venue</p><p className="font-semibold text-gray-700">{manageSchedule.venue||manageSchedule.location||"—"}</p></div>
                <div><p className="text-xs font-semibold text-gray-600 mb-1">Registered</p><p className="font-semibold text-gray-700">{manageSchedule.registered||manageSchedule.registeredPets||0} / {manageSchedule.capacity}</p></div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Status</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${manageSchedule.status==="Upcoming"?"bg-blue-100 text-blue-700":manageSchedule.status==="Completed"?"bg-green-100 text-green-700":"bg-red-100 text-red-700"}`}>{manageSchedule.status}</span>
                </div>
              </div>
              <button onClick={()=>setManageSchedule(null)} className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}
      {showVaccinate && vaccinatePet && <VaccinateModal pet={vaccinatePet} onConfirm={p=>{handleVaccinate(p);}} onClose={()=>{setShowVaccinate(false);setVaccinatePet(null);}}/>}
    </div>
  );
}
