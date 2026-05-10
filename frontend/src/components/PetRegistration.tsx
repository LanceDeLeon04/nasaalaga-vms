import { useState, useRef, useCallback, useEffect } from "react";
import {
  Plus, Search, Syringe, Download, Calendar, PawPrint,
  AlertCircle, Heart, X, CheckCircle, Camera, Upload,
  RefreshCw, ImagePlus, FlipHorizontal, ChevronLeft,
  ChevronRight, Phone, MapPin, Clock, Users, Eye,
  Zap, Star, Tag, FileText, Filter, ArrowRight,
  TriangleAlert, Info, Badge, Layers
} from "lucide-react";

// ─── TYPES ─────────────────────────────────────────────────────────────────

interface Pet {
  id: string;
  petName: string;
  species: string;
  breed: string;
  age: string;
  color: string;
  gender?: string;
  isSpayed?: boolean;
  isNeutered?: boolean;
  ownerName: string;
  ownerContact: string;
  ownerAddress: string;
  barangay: string;
  microchipId?: string;
  registrationDate: string;
  vaccinationStatus: "Vaccinated" | "Not Vaccinated" | "Due Soon";
  lastVaccinationDate?: string;
  nextVaccinationDate?: string;
  status: "Active" | "Lost" | "Found";
  photoUrl?: string;
}

interface LostFoundReport {
  id: string;
  petId: string;
  petName: string;
  species: string;
  breed: string;
  color: string;
  type: "Lost" | "Found";
  reportedBy: string;
  contactNumber: string;
  lastSeenLocation: string;
  barangay: string;
  dateReported: string;
  description: string;
  status: "Open" | "Resolved";
  matchedWith?: string;
}

interface BarangaySchedule {
  id: string;
  barangay: string;
  date: string; // "YYYY-MM-DD"
  time: string;
  location: string;
  status: "Upcoming" | "Completed" | "Cancelled";
  registeredPets: number;
  capacity: number;
  notes?: string;
}

// ─── INITIAL DATA ──────────────────────────────────────────────────────────

const INITIAL_PETS: Pet[] = [
  { id:"PET-001", petName:"Brownie", species:"Dog", breed:"Aspin", age:"3 years", color:"Brown", ownerName:"Juan Dela Cruz", ownerContact:"0917-123-4567", ownerAddress:"Phase 1, Block 2", barangay:"Barangay 1", microchipId:"MC123456", registrationDate:"2025-01-05", vaccinationStatus:"Vaccinated", lastVaccinationDate:"2024-12-10", nextVaccinationDate:"2025-12-10", status:"Active" },
  { id:"PET-002", petName:"Whiskers", species:"Cat", breed:"Persian", age:"2 years", color:"White", ownerName:"Maria Santos", ownerContact:"0918-234-5678", ownerAddress:"Purok 3", barangay:"Barangay 3", registrationDate:"2024-12-28", vaccinationStatus:"Vaccinated", lastVaccinationDate:"2024-12-08", nextVaccinationDate:"2025-12-08", status:"Active" },
  { id:"PET-003", petName:"Rocky", species:"Dog", breed:"German Shepherd", age:"4 years", color:"Black/Tan", ownerName:"Pedro Reyes", ownerContact:"0919-345-6789", ownerAddress:"Sitio Bayanan", barangay:"Barangay 2", microchipId:"MC789012", registrationDate:"2024-11-15", vaccinationStatus:"Due Soon", lastVaccinationDate:"2024-11-20", nextVaccinationDate:"2025-02-20", status:"Active" },
  { id:"PET-004", petName:"Max", species:"Dog", breed:"Labrador", age:"5 years", color:"Golden", ownerName:"Ana Garcia", ownerContact:"0920-456-7890", ownerAddress:"Zone 4", barangay:"Barangay 5", registrationDate:"2024-10-10", vaccinationStatus:"Not Vaccinated", status:"Active" },
  { id:"PET-005", petName:"Lucky", species:"Dog", breed:"Shih Tzu", age:"1 year", color:"Gray", ownerName:"Carlos Lopez", ownerContact:"0921-567-8901", ownerAddress:"Purok 5", barangay:"Barangay 4", registrationDate:"2025-01-08", vaccinationStatus:"Not Vaccinated", status:"Lost" },
];

const INITIAL_REPORTS: LostFoundReport[] = [
  { id:"LF-001", petId:"PET-005", petName:"Lucky", species:"Dog", breed:"Shih Tzu", color:"Gray", type:"Lost", reportedBy:"Carlos Lopez", contactNumber:"0921-567-8901", lastSeenLocation:"Near Public Market", barangay:"Barangay 4", dateReported:"2025-01-12", description:"Small gray Shih Tzu, wearing red collar with name tag. Very friendly.", status:"Open" },
  { id:"LF-002", petId:"UNKNOWN", petName:"Unknown", species:"Dog", breed:"Shih Tzu Mix", color:"Light Gray", type:"Found", reportedBy:"Rosa Mendoza", contactNumber:"0922-678-9012", lastSeenLocation:"Barangay 4 Public Market area", barangay:"Barangay 4", dateReported:"2025-01-13", description:"Small gray dog, possibly Shih Tzu mix, no collar but very friendly and well-groomed.", status:"Open" },
  { id:"LF-003", petId:"UNKNOWN", petName:"Unknown", species:"Cat", breed:"Siamese", color:"Cream/Brown", type:"Found", reportedBy:"Mario Bautista", contactNumber:"0923-789-0123", lastSeenLocation:"Barangay Hall premises", barangay:"Barangay 2", dateReported:"2025-01-10", description:"Friendly Siamese cat, no collar, appears well-fed and domesticated.", status:"Open" },
];

const INITIAL_SCHEDULES: BarangaySchedule[] = [
  { id:"SCH-001", barangay:"Barangay 1", date:"2025-01-20", time:"8:00 AM - 12:00 PM", location:"Barangay 1 Covered Court", status:"Upcoming", registeredPets:45, capacity:100 },
  { id:"SCH-002", barangay:"Barangay 3", date:"2025-01-22", time:"1:00 PM - 5:00 PM", location:"Barangay 3 Multi-Purpose Hall", status:"Upcoming", registeredPets:67, capacity:100 },
  { id:"SCH-003", barangay:"Barangay 5", date:"2025-01-18", time:"9:00 AM - 1:00 PM", location:"Barangay 5 Health Center", status:"Upcoming", registeredPets:89, capacity:100 },
  { id:"SCH-004", barangay:"Barangay 2", date:"2025-02-03", time:"8:00 AM - 12:00 PM", location:"Barangay 2 Gymnasium", status:"Upcoming", registeredPets:12, capacity:80 },
];

const BARANGAYS = ["Barangay 1","Barangay 2","Barangay 3","Barangay 4","Barangay 5","Barangay 6","Barangay 7","Barangay 8","Barangay 9","Barangay 10"];

// ─── HELPERS ───────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
}

function matchScore(lost: LostFoundReport, found: LostFoundReport): number {
  let score = 0;
  if (lost.species.toLowerCase() === found.species.toLowerCase()) score += 40;
  if (lost.breed.toLowerCase().includes(found.breed.toLowerCase().split(" ")[0]) ||
      found.breed.toLowerCase().includes(lost.breed.toLowerCase().split(" ")[0])) score += 25;
  const lc = lost.color.toLowerCase(), fc = found.color.toLowerCase();
  const lcWords = lc.split(/[\s\/,]+/), fcWords = fc.split(/[\s\/,]+/);
  if (lcWords.some(w => fcWords.includes(w))) score += 20;
  if (lost.barangay === found.barangay) score += 15;
  return score;
}

function getMatches(report: LostFoundReport, all: LostFoundReport[]): Array<{report: LostFoundReport; score: number}> {
  const opposite = report.type === "Lost" ? "Found" : "Lost";
  return all
    .filter(r => r.type === opposite && r.status === "Open" && r.id !== report.id)
    .map(r => ({ report: r, score: report.type === "Lost" ? matchScore(report, r) : matchScore(r, report) }))
    .filter(m => m.score >= 25)
    .sort((a, b) => b.score - a.score);
}

// ─── PHOTO CAPTURE ────────────────────────────────────────────────────────

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
      const s = await navigator.mediaDevices.getUserMedia({ video:{facingMode:f,width:{ideal:1280},height:{ideal:720}} });
      streamRef.current = s;
      if(videoRef.current){ videoRef.current.srcObject=s; await videoRef.current.play(); }
      setCamReady(true);
    } catch(e:any){ setCamErr(e.name==="NotAllowedError"?"Camera permission denied. Please allow camera access.":"Camera not available on this device."); }
  },[stop]);

  const snap = ()=>{
    if(!videoRef.current||!canvasRef.current) return;
    const v=videoRef.current, c=canvasRef.current;
    c.width=v.videoWidth; c.height=v.videoHeight;
    c.getContext("2d")?.drawImage(v,0,0);
    const url=c.toDataURL("image/jpeg",0.9);
    stop(); setPreview(url); setMode("preview");
  };

  const onFile=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0]; if(!f) return;
    const r=new FileReader(); r.onload=ev=>{ setPreview(ev.target?.result as string); setMode("preview"); }; r.readAsDataURL(f);
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
                <span className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-white/70 rounded-tl"/>
                <span className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-white/70 rounded-tr"/>
                <span className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-white/70 rounded-bl"/>
                <span className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-white/70 rounded-br"/>
                {camErr&&<div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 text-white p-4 text-center"><Camera className="w-8 h-8 mb-2 opacity-40"/><p className="text-sm">{camErr}</p><button onClick={()=>fileInputRef.current?.click()} className="mt-3 px-4 py-1.5 bg-white text-gray-800 rounded-lg text-xs font-semibold">Upload instead</button></div>}
              </div>
              <canvas ref={canvasRef} className="hidden"/>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={onFile} className="hidden"/>
              <div className="flex gap-2">
                <button onClick={()=>{const nf=facing==="environment"?"user":"environment";setFacing(nf);startCam(nf);}} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm"><FlipHorizontal className="w-4 h-4"/>Flip</button>
                <button onClick={snap} disabled={!!camErr||!camReady} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#2B5EA6] text-white rounded-lg font-semibold hover:bg-[#234a85] disabled:opacity-40 disabled:cursor-not-allowed"><Camera className="w-4 h-4"/>Capture</button>
              </div>
              <button onClick={()=>{stop();setMode("choose");}} className="w-full py-1.5 text-sm text-gray-400 hover:text-gray-600">← Back</button>
            </div>
          )}
          {mode==="preview"&&preview&&(
            <div className="space-y-3">
              <p className="text-sm text-gray-500 text-center">Looks good?</p>
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

// ─── PET DETAIL MODAL ────────────────────────────────────────────────────

function PetDetailModal({ pet, onClose, onVaccinate }: { pet:Pet; onClose:()=>void; onVaccinate:(p:Pet)=>void }) {
  const vs = pet.vaccinationStatus;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className={`px-6 py-5 flex items-center justify-between ${vs==="Vaccinated"?"bg-gradient-to-r from-green-600 to-green-500":vs==="Due Soon"?"bg-gradient-to-r from-yellow-500 to-orange-500":"bg-gradient-to-r from-red-600 to-red-500"}`}>
          <div className="flex items-center gap-4">
            {pet.photoUrl
              ? <img src={pet.photoUrl} alt={pet.petName} className="w-16 h-16 rounded-xl object-cover border-2 border-white/40"/>
              : <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center"><PawPrint className="w-8 h-8 text-white"/></div>
            }
            <div>
              <h3 className="text-xl font-bold text-white">{pet.petName}</h3>
              <p className="text-white/80 text-sm">{pet.species} · {pet.breed}</p>
              <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 text-white text-xs rounded-full">{pet.id}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {[["Age", pet.age],["Color", pet.color],["Microchip", pet.microchipId||"—"],["Registered", fmtDate(pet.registrationDate)],["Barangay", pet.barangay],["Status", pet.status]].map(([k,v])=>(
              <div key={k} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{k}</p>
                <p className="text-sm font-semibold text-gray-800">{v}</p>
              </div>
            ))}
          </div>
          <div className="border-t pt-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3 font-semibold">Owner Information</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3"><div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><Users className="w-4 h-4 text-blue-600"/></div><div><p className="text-xs text-gray-400">Owner</p><p className="text-sm font-semibold text-gray-800">{pet.ownerName}</p></div></div>
              <div className="flex items-center gap-3"><div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center"><Phone className="w-4 h-4 text-green-600"/></div><div><p className="text-xs text-gray-400">Contact</p><p className="text-sm font-semibold text-gray-800">{pet.ownerContact}</p></div></div>
              <div className="flex items-center gap-3"><div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center"><MapPin className="w-4 h-4 text-purple-600"/></div><div><p className="text-xs text-gray-400">Address</p><p className="text-sm font-semibold text-gray-800">{pet.ownerAddress}, {pet.barangay}</p></div></div>
            </div>
          </div>
          <div className={`rounded-xl p-4 ${vs==="Vaccinated"?"bg-green-50 border border-green-200":vs==="Due Soon"?"bg-yellow-50 border border-yellow-200":"bg-red-50 border border-red-200"}`}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2 ${vs==='Vaccinated'?'text-green-700':vs==='Due Soon'?'text-yellow-700':'text-red-700'}">Vaccination Status</p>
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-bold text-sm ${vs==="Vaccinated"?"text-green-700":vs==="Due Soon"?"text-yellow-700":"text-red-700"}`}>{vs}</p>
                {pet.lastVaccinationDate&&<p className="text-xs text-gray-500 mt-0.5">Last: {fmtDate(pet.lastVaccinationDate)}</p>}
                {pet.nextVaccinationDate&&<p className="text-xs text-gray-500">Next due: {fmtDate(pet.nextVaccinationDate)}</p>}
              </div>
              {vs!=="Vaccinated"&&<button onClick={()=>{onVaccinate(pet);onClose();}} className="px-3 py-1.5 bg-[#60A85C] text-white text-xs font-semibold rounded-lg hover:bg-[#4a8a47] flex items-center gap-1"><Syringe className="w-3 h-3"/>Vaccinate Now</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── LOST/FOUND DETAIL MODAL ─────────────────────────────────────────────

function LostFoundModal({ report, all, pets, onClose, onResolve }: { report:LostFoundReport; all:LostFoundReport[]; pets:Pet[]; onClose:()=>void; onResolve:(id:string,matchId:string)=>void }) {
  const matches = getMatches(report, all);
  const linkedPet = pets.find(p=>p.id===report.petId);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className={`px-6 py-5 flex items-center justify-between sticky top-0 ${report.type==="Lost"?"bg-gradient-to-r from-red-600 to-orange-500":"bg-gradient-to-r from-green-600 to-emerald-500"}`}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-white/25 text-white text-xs font-bold rounded-full">{report.type.toUpperCase()}</span>
              <span className="text-white/70 text-xs">{report.id}</span>
            </div>
            <h3 className="text-xl font-bold text-white">{report.petName}</h3>
            <p className="text-white/80 text-sm">{report.species} · {report.breed} · {report.color}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Report Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Reported By</p><p className="text-sm font-semibold text-gray-800">{report.reportedBy}</p></div>
            <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Contact</p><p className="text-sm font-semibold text-gray-800">{report.contactNumber}</p></div>
            <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Last Seen</p><p className="text-sm font-semibold text-gray-800">{report.lastSeenLocation}</p></div>
            <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Barangay</p><p className="text-sm font-semibold text-gray-800">{report.barangay}</p></div>
            <div className="col-span-2 bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Description</p><p className="text-sm text-gray-800">{report.description}</p></div>
          </div>

          {/* Linked Pet Record */}
          {linkedPet&&(
            <div className="border border-blue-200 bg-blue-50 rounded-xl p-4">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-1"><Tag className="w-3 h-3"/>Registered Pet Record Linked</p>
              <div className="flex items-center gap-3">
                {linkedPet.photoUrl?<img src={linkedPet.photoUrl} className="w-12 h-12 rounded-lg object-cover" alt=""/>:<div className="w-12 h-12 rounded-lg bg-blue-200 flex items-center justify-center"><PawPrint className="w-6 h-6 text-blue-600"/></div>}
                <div><p className="font-semibold text-blue-800">{linkedPet.petName} ({linkedPet.id})</p><p className="text-sm text-blue-600">Owner: {linkedPet.ownerName} · {linkedPet.ownerContact}</p></div>
              </div>
            </div>
          )}

          {/* AI Matching */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-500"/>
              <p className="font-bold text-gray-800 text-sm">Smart Matches Found</p>
              {matches.length>0&&<span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-semibold">{matches.length} potential match{matches.length>1?"es":""}</span>}
            </div>

            {matches.length===0?(
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2"/>
                <p className="text-sm text-gray-500">No matching reports found yet.</p>
                <p className="text-xs text-gray-400 mt-1">Check back as new reports come in.</p>
              </div>
            ):(
              <div className="space-y-3">
                {matches.map(({report:m, score})=>(
                  <div key={m.id} className="border border-amber-200 bg-amber-50 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${m.type==="Found"?"bg-green-100 text-green-700":"bg-red-100 text-red-700"}`}>{m.type}</span>
                          <span className="text-xs text-gray-500">{m.id}</span>
                        </div>
                        <p className="font-bold text-gray-800">{m.petName} · {m.breed}</p>
                        <p className="text-sm text-gray-600">{m.color} · {m.barangay}</p>
                        <p className="text-xs text-gray-500 mt-1">{m.description}</p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <div className={`text-lg font-black ${score>=70?"text-green-600":score>=50?"text-amber-600":"text-orange-500"}`}>{score}%</div>
                        <div className="text-xs text-gray-400">match</div>
                        <div className="mt-1 w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full rounded-full ${score>=70?"bg-green-500":score>=50?"bg-amber-500":"bg-orange-400"}`} style={{width:`${score}%`}}/></div>
                      </div>
                    </div>
                    <div className="border-t border-amber-200 pt-2 mt-2 flex items-center justify-between">
                      <div><p className="text-xs text-gray-500">Reported by {m.reportedBy}</p><p className="text-xs font-semibold text-gray-700">{m.contactNumber}</p></div>
                      {report.status==="Open"&&<button onClick={()=>{onResolve(report.id, m.id); onClose();}} className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 flex items-center gap-1"><CheckCircle className="w-3 h-3"/>Mark Resolved</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${report.status==="Open"?"bg-yellow-100 text-yellow-800":"bg-gray-100 text-gray-600"}`}>{report.status}</span>
            {report.status==="Open"&&<button onClick={()=>{onResolve(report.id,"");onClose();}} className="text-sm text-gray-500 hover:text-gray-800 underline">Mark as Resolved (no match)</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SCHEDULE CALENDAR ────────────────────────────────────────────────────

function ScheduleCalendar({ schedules, onAdd, onManage }: { schedules:BarangaySchedule[]; onAdd:()=>void; onManage:(s:BarangaySchedule)=>void }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const schedulesThisMonth = schedules.filter(s=>{
    const d = new Date(s.date);
    return d.getFullYear()===viewYear && d.getMonth()===viewMonth;
  });

  const getSchedulesForDay = (day:number) => schedules.filter(s=>{
    const d = new Date(s.date);
    return d.getFullYear()===viewYear && d.getMonth()===viewMonth && d.getDate()===day;
  });

  const statusColor: Record<string,string> = { Upcoming:"bg-blue-500", Completed:"bg-green-500", Cancelled:"bg-red-400" };

  return (
    <div className="space-y-4">
      {/* Calendar header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-[#1e4080] to-[#2B5EA6] px-6 py-4 flex items-center justify-between">
          <button onClick={()=>{ if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); }} className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"><ChevronLeft className="w-4 h-4 text-white"/></button>
          <div className="text-center">
            <p className="text-white font-bold text-lg">{MONTHS[viewMonth]} {viewYear}</p>
            <p className="text-white/60 text-xs">{schedulesThisMonth.length} schedule{schedulesThisMonth.length!==1?"s":""} this month</p>
          </div>
          <button onClick={()=>{ if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); }} className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"><ChevronRight className="w-4 h-4 text-white"/></button>
        </div>

        <div className="p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d=><div key={d} className="text-center text-xs font-bold text-gray-400 py-1">{d}</div>)}
          </div>
          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({length:firstDay},(_,i)=><div key={`e${i}`}/>)}
            {Array.from({length:daysInMonth},(_,i)=>{
              const day=i+1;
              const daySchedules=getSchedulesForDay(day);
              const isToday=today.getFullYear()===viewYear&&today.getMonth()===viewMonth&&today.getDate()===day;
              return (
                <div key={day} className={`min-h-[52px] rounded-xl p-1.5 border transition-colors ${isToday?"border-[#2B5EA6] bg-blue-50":daySchedules.length?"border-transparent bg-gray-50 hover:bg-gray-100":"border-transparent hover:bg-gray-50"}`}>
                  <p className={`text-xs font-bold mb-1 ${isToday?"text-[#2B5EA6]":"text-gray-600"}`}>{day}</p>
                  {daySchedules.map(s=>(
                    <button key={s.id} onClick={()=>onManage(s)} className={`w-full text-left px-1 py-0.5 rounded text-white text-[9px] font-semibold truncate block mb-0.5 ${statusColor[s.status]||"bg-gray-400"} hover:opacity-80 transition-opacity`}>{s.barangay.replace("Barangay ","Brgy ")}</button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Schedule list for this month */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <p className="font-bold text-gray-800">Schedules in {MONTHS[viewMonth]}</p>
          <button onClick={onAdd} className="flex items-center gap-2 px-3 py-1.5 bg-[#2B5EA6] text-white rounded-lg text-sm font-semibold hover:bg-[#234a85] transition-colors"><Plus className="w-3.5 h-3.5"/>Add Schedule</button>
        </div>
        {schedulesThisMonth.length===0?(
          <div className="p-8 text-center"><Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2"/><p className="text-gray-400 text-sm">No schedules this month</p></div>
        ):(
          <div className="divide-y">
            {schedulesThisMonth.sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime()).map(s=>(
              <div key={s.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white ${statusColor[s.status]||"bg-gray-400"}`}>
                    <p className="text-xs font-bold leading-none">{MONTHS[new Date(s.date).getMonth()].slice(0,3).toUpperCase()}</p>
                    <p className="text-lg font-black leading-none">{new Date(s.date).getDate()}</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{s.barangay}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3"/>{s.time}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3"/>{s.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-[#60A85C] rounded-full" style={{width:`${(s.registeredPets/s.capacity)*100}%`}}/></div>
                    <span className="text-xs text-gray-600 whitespace-nowrap">{s.registeredPets}/{s.capacity}</span>
                  </div>
                  <button onClick={()=>onManage(s)} className="text-xs text-[#2B5EA6] hover:underline font-semibold">Manage →</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SCHEDULE MANAGE MODAL ────────────────────────────────────────────────

function ScheduleManageModal({ schedule, onClose, onUpdate }: { schedule:BarangaySchedule; onClose:()=>void; onUpdate:(s:BarangaySchedule)=>void }) {
  const [s, setS] = useState(schedule);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-[#1e4080] to-[#2B5EA6] px-6 py-4 flex items-center justify-between">
          <div><p className="font-bold text-white">Manage Schedule</p><p className="text-white/60 text-xs">{s.id}</p></div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Barangay</label>
              <select value={s.barangay} onChange={e=>setS({...s,barangay:e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]">
                {BARANGAYS.map(b=><option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Date</label>
              <input type="date" value={s.date} onChange={e=>setS({...s,date:e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Status</label>
              <select value={s.status} onChange={e=>setS({...s,status:e.target.value as any})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]">
                <option>Upcoming</option><option>Completed</option><option>Cancelled</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Time</label>
              <input value={s.time} onChange={e=>setS({...s,time:e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]" placeholder="e.g. 8:00 AM - 12:00 PM"/>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Location</label>
              <input value={s.location} onChange={e=>setS({...s,location:e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Registered</label>
              <input type="number" value={s.registeredPets} onChange={e=>setS({...s,registeredPets:+e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Capacity</label>
              <input type="number" value={s.capacity} onChange={e=>setS({...s,capacity:+e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"/>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Notes (optional)</label>
              <textarea value={s.notes||""} onChange={e=>setS({...s,notes:e.target.value})} rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6]"/>
            </div>
          </div>
          {/* Progress bar */}
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5"><span>Registration Progress</span><span>{s.registeredPets}/{s.capacity} ({Math.round((s.registeredPets/s.capacity)*100)}%)</span></div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-[#60A85C] rounded-full transition-all" style={{width:`${Math.min((s.registeredPets/s.capacity)*100,100)}%`}}/></div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
            <button onClick={()=>{onUpdate(s);onClose();}} className="flex-1 py-2.5 bg-[#2B5EA6] text-white rounded-xl text-sm font-bold hover:bg-[#234a85]">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VACCINATE CONFIRM ────────────────────────────────────────────────────

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
            {pet.photoUrl?<img src={pet.photoUrl} className="w-14 h-14 rounded-xl object-cover" alt=""/>:<div className="w-14 h-14 bg-green-200 rounded-xl flex items-center justify-center"><PawPrint className="w-7 h-7 text-green-600"/></div>}
            <div><p className="font-bold text-gray-800">{pet.petName}</p><p className="text-sm text-gray-600">{pet.species} · {pet.breed}</p><p className="text-xs text-gray-500">Owner: {pet.ownerName}</p></div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 space-y-1">
            <p className="font-semibold flex items-center gap-1.5"><Info className="w-4 h-4"/>What will be recorded:</p>
            <p>• Vaccination date: <strong>Today ({fmtDate(new Date().toISOString().split("T")[0])})</strong></p>
            <p>• Next due date: <strong>1 year from today</strong></p>
            <p>• Status updated to: <strong>Vaccinated ✓</strong></p>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
            <button onClick={()=>onConfirm(pet)} className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 flex items-center justify-center gap-1.5"><Syringe className="w-4 h-4"/>Confirm Vaccination</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────

export function PetRegistration() {
  const [pets, setPets] = useState<Pet[]>(INITIAL_PETS);
  const [reports, setReports] = useState<LostFoundReport[]>(INITIAL_REPORTS);
  const [schedules, setSchedules] = useState<BarangaySchedule[]>(INITIAL_SCHEDULES);
  const [activeTab, setActiveTab] = useState<"overview"|"pets"|"lost-found"|"schedule">("overview");

  // Search / filter
  const [search, setSearch] = useState("");
  const [filterVax, setFilterVax] = useState("all");
  const [filterSpecies, setFilterSpecies] = useState("all");
  const [filterBrgy, setFilterBrgy] = useState("all");
  const [filterType, setFilterType] = useState<"all"|"Lost"|"Found">("all");

  // Modals
  const [showNewPet, setShowNewPet] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [showVaccinate, setShowVaccinate] = useState(false);
  const [showLFDialog, setShowLFDialog] = useState(false);
  const [showScheduleAdd, setShowScheduleAdd] = useState(false);
  const [viewPet, setViewPet] = useState<Pet|null>(null);
  const [viewReport, setViewReport] = useState<LostFoundReport|null>(null);
  const [manageSchedule, setManageSchedule] = useState<BarangaySchedule|null>(null);
  const [vaccinatePet, setVaccinatePet] = useState<Pet|null>(null);

  // New Pet form
  const [np, setNp] = useState({ petName:"",species:"",breed:"",age:"",color:"",ownerName:"",ownerContact:"",ownerAddress:"",barangay:"",microchipId:"",photoUrl:"" });

  // New LF form
  const [lfForm, setLfForm] = useState({ petId:"",type:"Lost" as "Lost"|"Found",reportedBy:"",contactNumber:"",lastSeenLocation:"",barangay:"",description:"" });

  // New Schedule form
  const [schForm, setSchForm] = useState({ barangay:"",date:"",time:"",location:"",capacity:"100" });

  // ── Handlers ──

  const handleAddPet = () => {
    if(!np.petName||!np.species||!np.breed||!np.ownerName||!np.barangay) return;
    const id = `PET-${String(pets.length+1).padStart(3,"0")}`;
    setPets(prev=>[...prev,{ id, petName:np.petName, species:np.species, breed:np.breed, age:np.age, color:np.color, ownerName:np.ownerName, ownerContact:np.ownerContact, ownerAddress:np.ownerAddress, barangay:np.barangay, microchipId:np.microchipId||undefined, registrationDate:new Date().toISOString().split("T")[0], vaccinationStatus:"Not Vaccinated", status:"Active", photoUrl:np.photoUrl||undefined }]);
    setNp({ petName:"",species:"",breed:"",age:"",color:"",ownerName:"",ownerContact:"",ownerAddress:"",barangay:"",microchipId:"",photoUrl:"" });
    setShowNewPet(false);
  };

  const handleVaccinate = (pet:Pet) => {
    const today = new Date();
    const next = new Date(today); next.setFullYear(next.getFullYear()+1);
    setPets(prev=>prev.map(p=>p.id===pet.id?{...p, vaccinationStatus:"Vaccinated" as const, lastVaccinationDate:today.toISOString().split("T")[0], nextVaccinationDate:next.toISOString().split("T")[0]}:p));
    setShowVaccinate(false); setVaccinatePet(null);
  };

  const handleAddLF = () => {
    if(!lfForm.reportedBy||!lfForm.contactNumber||!lfForm.barangay||!lfForm.description) return;
    const id=`LF-${String(reports.length+1).padStart(3,"0")}`;
    const pet=pets.find(p=>p.id===lfForm.petId);
    const newReport: LostFoundReport = { id, petId:lfForm.petId||"UNKNOWN", petName:pet?.petName||"Unknown", species:pet?.species||"Unknown", breed:pet?.breed||"Unknown", color:pet?.color||"Unknown", type:lfForm.type, reportedBy:lfForm.reportedBy, contactNumber:lfForm.contactNumber, lastSeenLocation:lfForm.lastSeenLocation, barangay:lfForm.barangay, dateReported:new Date().toISOString().split("T")[0], description:lfForm.description, status:"Open" };
    setReports(prev=>[...prev,newReport]);
    if(lfForm.type==="Lost"&&pet) setPets(prev=>prev.map(p=>p.id===pet.id?{...p,status:"Lost" as const}:p));
    setLfForm({ petId:"",type:"Lost",reportedBy:"",contactNumber:"",lastSeenLocation:"",barangay:"",description:"" });
    setShowLFDialog(false);
  };

  const handleResolve = (id:string, matchId:string) => {
    setReports(prev=>prev.map(r=>r.id===id||r.id===matchId?{...r,status:"Resolved" as const, matchedWith:r.id===id?matchId:id}:r));
    // If lost pet found, update pet status
    const lostReport = reports.find(r=>r.id===id&&r.type==="Lost");
    if(lostReport?.petId&&lostReport.petId!=="UNKNOWN") setPets(prev=>prev.map(p=>p.id===lostReport.petId?{...p,status:"Found" as const}:p));
  };

  const handleAddSchedule = () => {
    if(!schForm.barangay||!schForm.date||!schForm.time||!schForm.location) return;
    const id=`SCH-${String(schedules.length+1).padStart(3,"0")}`;
    setSchedules(prev=>[...prev,{ id, barangay:schForm.barangay, date:schForm.date, time:schForm.time, location:schForm.location, status:"Upcoming", registeredPets:0, capacity:+schForm.capacity||100 }]);
    setSchForm({ barangay:"",date:"",time:"",location:"",capacity:"100" });
    setShowScheduleAdd(false);
  };

  const handleExportPets = () => {
    const csv = ["Pet ID,Pet Name,Species,Breed,Age,Color,Owner,Contact,Barangay,Vaccination Status,Last Vaccinated",
      ...filteredPets.map(p=>`${p.id},${p.petName},${p.species},${p.breed},${p.age},${p.color},${p.ownerName},${p.ownerContact},${p.barangay},${p.vaccinationStatus},${p.lastVaccinationDate||"—"}`)].join("\n");
    const b=new Blob([csv],{type:"text/csv"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download="pet_records.csv"; a.click();
  };

  // ── Computed ──

  const filteredPets = pets.filter(p=>{
    const s=search.toLowerCase();
    const m = p.petName.toLowerCase().includes(s)||p.ownerName.toLowerCase().includes(s)||p.id.toLowerCase().includes(s)||p.breed.toLowerCase().includes(s);
    const v = filterVax==="all"||(filterVax==="vaccinated"&&p.vaccinationStatus==="Vaccinated")||(filterVax==="not-vaccinated"&&p.vaccinationStatus==="Not Vaccinated")||(filterVax==="due-soon"&&p.vaccinationStatus==="Due Soon");
    const sp = filterSpecies==="all"||p.species===filterSpecies;
    const br = filterBrgy==="all"||p.barangay===filterBrgy;
    return m&&v&&sp&&br;
  });

  const filteredReports = reports.filter(r=>{
    const s=search.toLowerCase();
    const m=!s||r.petName.toLowerCase().includes(s)||r.reportedBy.toLowerCase().includes(s)||r.id.toLowerCase().includes(s)||r.barangay.toLowerCase().includes(s);
    const t=filterType==="all"||r.type===filterType;
    return m&&t;
  });

  const totalVax = pets.filter(p=>p.vaccinationStatus==="Vaccinated").length;
  const totalLost = reports.filter(r=>r.type==="Lost"&&r.status==="Open").length;
  const totalFound = reports.filter(r=>r.type==="Found"&&r.status==="Open").length;
  const totalMatches = reports.filter(r=>r.status==="Open").reduce((acc,r)=>{ if(r.type==="Lost") return acc+(getMatches(r,reports).length>0?1:0); return acc; },0);

  const INPUT = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] focus:border-transparent bg-white";
  const SELECT = INPUT;

  return (
    <div className="space-y-5 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Pet Registration</h2>
          <p className="text-gray-500 text-sm mt-0.5">Rabies Program · Lost & Found · Vaccination Schedules</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={()=>setShowNewPet(true)} className="flex items-center gap-2 px-4 py-2 bg-[#2B5EA6] text-white rounded-xl font-semibold text-sm hover:bg-[#234a85] transition-colors shadow-sm"><Plus className="w-4 h-4"/>Register Pet</button>
          <button onClick={()=>setShowLFDialog(true)} className="flex items-center gap-2 px-4 py-2 bg-[#F39C3A] text-white rounded-xl font-semibold text-sm hover:bg-[#d68629] transition-colors shadow-sm"><AlertCircle className="w-4 h-4"/>Report Lost/Found</button>
          <button onClick={()=>{setActiveTab("schedule");setShowScheduleAdd(true);}} className="flex items-center gap-2 px-4 py-2 bg-[#60A85C] text-white rounded-xl font-semibold text-sm hover:bg-[#4a8a47] transition-colors shadow-sm"><Calendar className="w-4 h-4"/>Add Schedule</button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 flex gap-1">
        {([["overview","Vaccination Overview",<Syringe className="w-4 h-4"/>],["pets",`Pet Records (${pets.length})`,<PawPrint className="w-4 h-4"/>],["lost-found",`Lost & Found (${reports.filter(r=>r.status==="Open").length})`,<AlertCircle className="w-4 h-4"/>],["schedule","Schedules",<Calendar className="w-4 h-4"/>]] as [string,string,any][]).map(([key,label,icon])=>(
          <button key={key} onClick={()=>setActiveTab(key as any)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${activeTab===key?"bg-[#2B5EA6] text-white shadow-sm":"text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ══════════════════ OVERVIEW TAB ══════════════════ */}
      {activeTab==="overview"&&(
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label:"Total Registered", value:pets.length, sub:"All species", icon:<PawPrint className="w-5 h-5"/>, color:"text-blue-600", bg:"bg-blue-100", ring:"border-blue-200" },
              { label:"Vaccinated", value:totalVax, sub:`${pets.length?Math.round((totalVax/pets.length)*100):0}% coverage`, icon:<Syringe className="w-5 h-5"/>, color:"text-green-600", bg:"bg-green-100", ring:"border-green-200" },
              { label:"Needs Attention", value:pets.filter(p=>p.vaccinationStatus!=="Vaccinated").length, sub:"Due/Not vaccinated", icon:<TriangleAlert className="w-5 h-5"/>, color:"text-amber-600", bg:"bg-amber-100", ring:"border-amber-200" },
              { label:"Lost & Found", value:totalLost+totalFound, sub:`${totalLost} lost · ${totalFound} found`, icon:<Heart className="w-5 h-5"/>, color:"text-red-600", bg:"bg-red-100", ring:"border-red-200" },
            ].map(c=>(
              <div key={c.label} className={`bg-white rounded-2xl shadow-sm border ${c.ring} p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{c.label}</p>
                  <div className={`${c.bg} ${c.color} w-9 h-9 rounded-xl flex items-center justify-center`}>{c.icon}</div>
                </div>
                <p className={`text-3xl font-black ${c.color}`}>{c.value}</p>
                <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Smart Matches Alert */}
          {totalMatches>0&&(
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shrink-0"><Zap className="w-6 h-6 text-white"/></div>
              <div className="flex-1">
                <p className="font-bold text-amber-800">{totalMatches} Lost Pet{totalMatches>1?"s":""} with Potential Match{totalMatches>1?"es":""}!</p>
                <p className="text-sm text-amber-600">Smart matching found possible connections. Review in Lost & Found tab.</p>
              </div>
              <button onClick={()=>setActiveTab("lost-found")} className="px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 flex items-center gap-1.5">Review <ArrowRight className="w-4 h-4"/></button>
            </div>
          )}

          {/* Vax Breakdown + upcoming */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="font-bold text-gray-800 mb-4">Vaccination Breakdown</p>
              <div className="space-y-3">
                {[
                  { label:"Vaccinated", count:pets.filter(p=>p.vaccinationStatus==="Vaccinated").length, color:"bg-green-500", text:"text-green-600" },
                  { label:"Due Soon", count:pets.filter(p=>p.vaccinationStatus==="Due Soon").length, color:"bg-amber-400", text:"text-amber-600" },
                  { label:"Not Vaccinated", count:pets.filter(p=>p.vaccinationStatus==="Not Vaccinated").length, color:"bg-red-400", text:"text-red-600" },
                ].map(b=>(
                  <div key={b.label} className="flex items-center gap-3">
                    <div className="w-32 shrink-0"><p className="text-sm text-gray-600">{b.label}</p></div>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${b.color} rounded-full transition-all`} style={{width:`${pets.length?Math.round((b.count/pets.length)*100):0}%`}}/></div>
                    <span className={`text-sm font-bold ${b.text} w-8 text-right`}>{b.count}</span>
                  </div>
                ))}
              </div>
              <button onClick={()=>setActiveTab("pets")} className="mt-4 text-sm text-[#2B5EA6] font-semibold hover:underline flex items-center gap-1">View all pet records <ArrowRight className="w-3.5 h-3.5"/></button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="font-bold text-gray-800 mb-4">Upcoming Schedules</p>
              {schedules.filter(s=>s.status==="Upcoming").slice(0,3).length===0
                ? <div className="text-center py-6"><Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2"/><p className="text-sm text-gray-400">No upcoming schedules</p></div>
                : <div className="space-y-2">
                  {schedules.filter(s=>s.status==="Upcoming").sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime()).slice(0,3).map(s=>(
                    <button key={s.id} onClick={()=>{setActiveTab("schedule");setManageSchedule(s);}} className="w-full flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-colors text-left">
                      <div className="w-10 h-10 bg-[#2B5EA6] rounded-lg flex flex-col items-center justify-center text-white shrink-0">
                        <p className="text-[9px] font-bold leading-none">{new Date(s.date).toLocaleString("en",{month:"short"}).toUpperCase()}</p>
                        <p className="text-sm font-black leading-none">{new Date(s.date).getDate()}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{s.barangay}</p>
                        <p className="text-xs text-gray-500 truncate">{s.time} · {s.location}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold text-[#2B5EA6]">{s.registeredPets}/{s.capacity}</p>
                        <p className="text-xs text-gray-400">registered</p>
                      </div>
                    </button>
                  ))}
                  <button onClick={()=>setActiveTab("schedule")} className="text-sm text-[#2B5EA6] font-semibold hover:underline flex items-center gap-1 mt-1">View calendar <ArrowRight className="w-3.5 h-3.5"/></button>
                </div>
              }
            </div>
          </div>

          {/* Dogs needing vaccination */}
          {pets.filter(p=>p.vaccinationStatus!=="Vaccinated").length>0&&(
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-gray-800">Pets Needing Vaccination</p>
                <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">{pets.filter(p=>p.vaccinationStatus!=="Vaccinated").length} pets</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {pets.filter(p=>p.vaccinationStatus!=="Vaccinated").slice(0,6).map(p=>(
                  <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border ${p.vaccinationStatus==="Due Soon"?"bg-amber-50 border-amber-200":"bg-red-50 border-red-200"}`}>
                    {p.photoUrl?<img src={p.photoUrl} className="w-10 h-10 rounded-lg object-cover shrink-0" alt=""/>:<div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${p.vaccinationStatus==="Due Soon"?"bg-amber-200":"bg-red-200"}`}><PawPrint className={`w-5 h-5 ${p.vaccinationStatus==="Due Soon"?"text-amber-600":"text-red-500"}`}/></div>}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{p.petName}</p>
                      <p className="text-xs text-gray-500 truncate">{p.ownerName} · {p.barangay}</p>
                    </div>
                    <button onClick={()=>{setVaccinatePet(p);setShowVaccinate(true);}} className="px-2.5 py-1.5 bg-[#60A85C] text-white text-xs font-bold rounded-lg hover:bg-[#4a8a47] shrink-0">Vaccinate</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ PETS TAB ══════════════════ */}
      {activeTab==="pets"&&(
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                <input placeholder="Search pets, owners, IDs…" value={search} onChange={e=>setSearch(e.target.value)} className={`${INPUT} pl-9`}/>
              </div>
              <select value={filterVax} onChange={e=>setFilterVax(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] bg-white">
                <option value="all">All Status</option><option value="vaccinated">Vaccinated</option><option value="not-vaccinated">Not Vaccinated</option><option value="due-soon">Due Soon</option>
              </select>
              <select value={filterSpecies} onChange={e=>setFilterSpecies(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] bg-white">
                <option value="all">All Species</option><option value="Dog">Dogs</option><option value="Cat">Cats</option>
              </select>
              <select value={filterBrgy} onChange={e=>setFilterBrgy(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5EA6] bg-white">
                <option value="all">All Barangays</option>{BARANGAYS.map(b=><option key={b} value={b}>{b}</option>)}
              </select>
              <button onClick={handleExportPets} className="flex items-center gap-2 px-4 py-2.5 bg-[#60A85C] text-white rounded-xl text-sm font-semibold hover:bg-[#4a8a47]"><Download className="w-4 h-4"/>Export CSV</button>
            </div>
            <p className="text-xs text-gray-400 mt-2">{filteredPets.length} of {pets.length} records shown</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Photo","ID & Status","Pet","Owner","Barangay","Vaccination","Actions"].map(h=><th key={h} className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredPets.map(pet=>(
                    <tr key={pet.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-4">
                        {pet.photoUrl?<img src={pet.photoUrl} alt={pet.petName} className="w-10 h-10 rounded-xl object-cover border border-gray-200"/>:<div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center border border-dashed border-gray-300"><PawPrint className="w-4 h-4 text-gray-400"/></div>}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs font-bold text-gray-600">{pet.id}</p>
                        {pet.status!=="Active"&&<span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded ${pet.status==="Lost"?"bg-red-100 text-red-700":"bg-blue-100 text-blue-700"}`}>{pet.status}</span>}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-gray-800 text-sm">{pet.petName}</p>
                        <p className="text-xs text-gray-500">{pet.species} · {pet.breed} · {pet.color}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm font-semibold text-gray-800">{pet.ownerName}</p>
                        <p className="text-xs text-gray-500">{pet.ownerContact}</p>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{pet.barangay}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${pet.vaccinationStatus==="Vaccinated"?"bg-green-100 text-green-700":pet.vaccinationStatus==="Due Soon"?"bg-amber-100 text-amber-700":"bg-red-100 text-red-700"}`}>
                          {pet.vaccinationStatus==="Vaccinated"?<CheckCircle className="w-3 h-3"/>:<AlertCircle className="w-3 h-3"/>}
                          {pet.vaccinationStatus}
                        </span>
                        {pet.nextVaccinationDate&&<p className="text-[10px] text-gray-400 mt-0.5">Due {fmtDate(pet.nextVaccinationDate)}</p>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          <button onClick={()=>setViewPet(pet)} className="px-2.5 py-1.5 bg-[#2B5EA6] text-white text-xs font-semibold rounded-lg hover:bg-[#234a85] flex items-center gap-1"><Eye className="w-3 h-3"/>View</button>
                          {pet.vaccinationStatus!=="Vaccinated"&&<button onClick={()=>{setVaccinatePet(pet);setShowVaccinate(true);}} className="px-2.5 py-1.5 bg-[#60A85C] text-white text-xs font-semibold rounded-lg hover:bg-[#4a8a47] flex items-center gap-1"><Syringe className="w-3 h-3"/>Vaccinate</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredPets.length===0&&<tr><td colSpan={7} className="py-12 text-center text-gray-400"><PawPrint className="w-8 h-8 mx-auto mb-2 text-gray-200"/><p className="text-sm">No pets found</p></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ LOST & FOUND TAB ══════════════════ */}
      {activeTab==="lost-found"&&(
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center"><p className="text-3xl font-black text-red-600">{totalLost}</p><p className="text-xs text-red-500 font-semibold mt-1">Lost (Open)</p></div>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center"><p className="text-3xl font-black text-green-600">{totalFound}</p><p className="text-xs text-green-500 font-semibold mt-1">Found (Open)</p></div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center"><p className="text-3xl font-black text-amber-600">{totalMatches}</p><p className="text-xs text-amber-600 font-semibold mt-1">Smart Matches</p></div>
          </div>

          {/* Filter */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3">
            <div className="flex-1 min-w-[180px] relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/><input placeholder="Search reports…" value={search} onChange={e=>setSearch(e.target.value)} className={`${INPUT} pl-9`}/></div>
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
              {(["all","Lost","Found"] as const).map(t=><button key={t} onClick={()=>setFilterType(t)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType===t?"bg-white shadow text-gray-800":"text-gray-500 hover:text-gray-700"}`}>{t==="all"?"All":t}</button>)}
            </div>
          </div>

          <div className="space-y-3">
            {filteredReports.map(r=>{
              const matches = getMatches(r, reports);
              return (
                <div key={r.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${r.status==="Resolved"?"border-gray-200 opacity-70":"border-gray-100"}`}>
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
                          <p className="font-bold text-gray-800">{r.petName} <span className="font-normal text-gray-500 text-sm">· {r.breed} · {r.color}</span></p>
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3"/>{r.lastSeenLocation}, {r.barangay}</p>
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{r.description}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-400">{fmtDate(r.dateReported)}</p>
                        <p className="text-sm font-semibold text-gray-700 mt-0.5">{r.reportedBy}</p>
                        <p className="text-xs text-gray-500">{r.contactNumber}</p>
                        <button onClick={()=>setViewReport(r)} className="mt-2 px-3 py-1.5 bg-[#2B5EA6] text-white text-xs font-bold rounded-lg hover:bg-[#234a85] flex items-center gap-1 ml-auto"><Eye className="w-3 h-3"/>Details{matches.length>0&&r.status==="Open"&&` & Match`}</button>
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

      {/* ══════════════════ SCHEDULE TAB ══════════════════ */}
      {activeTab==="schedule"&&(
        <ScheduleCalendar
          schedules={schedules}
          onAdd={()=>setShowScheduleAdd(true)}
          onManage={s=>setManageSchedule(s)}
        />
      )}

      {/* ══════════════════ MODALS ══════════════════ */}

      {/* New Pet Dialog */}
      {showNewPet&&(
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
                  ?<div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <img src={np.photoUrl} className="w-20 h-20 rounded-xl object-cover border border-gray-300" alt=""/>
                    <div className="space-y-2">
                      <button onClick={()=>setShowPhoto(true)} className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100"><RefreshCw className="w-3.5 h-3.5"/>Change Photo</button>
                      <button onClick={()=>setNp({...np,photoUrl:""})} className="flex items-center gap-2 text-red-500 text-sm hover:text-red-700"><X className="w-3.5 h-3.5"/>Remove</button>
                    </div>
                  </div>
                  :<button onClick={()=>setShowPhoto(true)} className="w-full flex items-center gap-4 p-4 border-2 border-dashed border-[#2B5EA6]/30 rounded-xl hover:border-[#2B5EA6] hover:bg-blue-50 transition-all group">
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
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Species *</label><select value={np.species} onChange={e=>setNp({...np,species:e.target.value})} className={SELECT}><option value="">Select…</option><option value="Dog">Dog</option><option value="Cat">Cat</option></select></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Breed *</label><input value={np.breed} onChange={e=>setNp({...np,breed:e.target.value})} className={INPUT} placeholder="e.g., Aspin"/></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Age</label><input value={np.age} onChange={e=>setNp({...np,age:e.target.value})} className={INPUT} placeholder="e.g., 2 years"/></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Color</label><input value={np.color} onChange={e=>setNp({...np,color:e.target.value})} className={INPUT} placeholder="e.g., Brown"/></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Microchip ID</label><input value={np.microchipId} onChange={e=>setNp({...np,microchipId:e.target.value})} className={INPUT} placeholder="Optional"/></div>
                </div>
              </div>

              {/* Owner Info */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 border-b pb-2">Owner Information</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Owner Name *</label><input value={np.ownerName} onChange={e=>setNp({...np,ownerName:e.target.value})} className={INPUT} placeholder="Full name"/></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Contact Number</label><input value={np.ownerContact} onChange={e=>setNp({...np,ownerContact:e.target.value})} className={INPUT} placeholder="0917-xxx-xxxx"/></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Address</label><input value={np.ownerAddress} onChange={e=>setNp({...np,ownerAddress:e.target.value})} className={INPUT} placeholder="Purok / Zone / Phase"/></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Barangay *</label><select value={np.barangay} onChange={e=>setNp({...np,barangay:e.target.value})} className={SELECT}><option value="">Select…</option>{BARANGAYS.map(b=><option key={b} value={b}>{b}</option>)}</select></div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={()=>setShowNewPet(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                <button onClick={handleAddPet} disabled={!np.petName||!np.species||!np.breed||!np.ownerName||!np.barangay} className="flex-1 py-2.5 bg-[#2B5EA6] text-white rounded-xl text-sm font-bold hover:bg-[#234a85] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"><PawPrint className="w-4 h-4"/>Register Pet</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lost/Found Report Dialog */}
      {showLFDialog&&(
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
                <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1.5">Pet ID from Registry (if known)</label><select value={lfForm.petId} onChange={e=>setLfForm({...lfForm,petId:e.target.value})} className={SELECT}><option value="">Unknown / Not Registered</option>{pets.map(p=><option key={p.id} value={p.id}>{p.id} – {p.petName} ({p.ownerName})</option>)}</select></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Reported By *</label><input value={lfForm.reportedBy} onChange={e=>setLfForm({...lfForm,reportedBy:e.target.value})} className={INPUT} placeholder="Your name"/></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Contact Number *</label><input value={lfForm.contactNumber} onChange={e=>setLfForm({...lfForm,contactNumber:e.target.value})} className={INPUT} placeholder="0917-xxx-xxxx"/></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Last Seen Location *</label><input value={lfForm.lastSeenLocation} onChange={e=>setLfForm({...lfForm,lastSeenLocation:e.target.value})} className={INPUT} placeholder="Street, landmark…"/></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Barangay *</label><select value={lfForm.barangay} onChange={e=>setLfForm({...lfForm,barangay:e.target.value})} className={SELECT}><option value="">Select…</option>{BARANGAYS.map(b=><option key={b} value={b}>{b}</option>)}</select></div>
                <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1.5">Description *</label><textarea value={lfForm.description} onChange={e=>setLfForm({...lfForm,description:e.target.value})} rows={3} className={INPUT} placeholder="Color, size, collar, markings, behavior…"/></div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={()=>setShowLFDialog(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                <button onClick={handleAddLF} disabled={!lfForm.reportedBy||!lfForm.contactNumber||!lfForm.barangay||!lfForm.description} className={`flex-1 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed ${lfForm.type==="Lost"?"bg-red-500 hover:bg-red-600":"bg-green-600 hover:bg-green-700"}`}>Submit {lfForm.type} Report</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Schedule Dialog */}
      {showScheduleAdd&&(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-[#3a7a35] to-[#60A85C] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center"><Calendar className="w-4 h-4 text-white"/></div><p className="font-bold text-white">Add Vaccination Schedule</p></div>
              <button onClick={()=>setShowScheduleAdd(false)} className="text-white/70 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Barangay *</label><select value={schForm.barangay} onChange={e=>setSchForm({...schForm,barangay:e.target.value})} className={SELECT}><option value="">Select barangay…</option>{BARANGAYS.map(b=><option key={b} value={b}>{b}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Date *</label><input type="date" value={schForm.date} onChange={e=>setSchForm({...schForm,date:e.target.value})} className={INPUT}/></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Capacity</label><input type="number" value={schForm.capacity} onChange={e=>setSchForm({...schForm,capacity:e.target.value})} className={INPUT}/></div>
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Time *</label><input value={schForm.time} onChange={e=>setSchForm({...schForm,time:e.target.value})} className={INPUT} placeholder="e.g. 8:00 AM – 12:00 PM"/></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Location *</label><input value={schForm.location} onChange={e=>setSchForm({...schForm,location:e.target.value})} className={INPUT} placeholder="Venue name"/></div>
              <div className="flex gap-2 pt-2">
                <button onClick={()=>setShowScheduleAdd(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                <button onClick={handleAddSchedule} disabled={!schForm.barangay||!schForm.date||!schForm.time||!schForm.location} className="flex-1 py-2.5 bg-[#60A85C] text-white rounded-xl text-sm font-bold hover:bg-[#4a8a47] disabled:opacity-40 disabled:cursor-not-allowed">Add Schedule</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-modals */}
      {showPhoto&&<PetPhotoCapture petName={np.petName} onCapture={url=>{setNp(p=>({...p,photoUrl:url}));setShowPhoto(false);}} onClose={()=>setShowPhoto(false)}/>}
      {viewPet&&<PetDetailModal pet={viewPet} onClose={()=>setViewPet(null)} onVaccinate={p=>{setVaccinatePet(p);setViewPet(null);setShowVaccinate(true);}}/>}
      {viewReport&&<LostFoundModal report={viewReport} all={reports} pets={pets} onClose={()=>setViewReport(null)} onResolve={handleResolve}/>}
      {manageSchedule&&<ScheduleManageModal schedule={manageSchedule} onClose={()=>setManageSchedule(null)} onUpdate={updated=>setSchedules(prev=>prev.map(s=>s.id===updated.id?updated:s))}/>}
      {showVaccinate&&vaccinatePet&&<VaccinateModal pet={vaccinatePet} onConfirm={p=>{handleVaccinate(p);}} onClose={()=>{setShowVaccinate(false);setVaccinatePet(null);}}/>}
    </div>
  );
}