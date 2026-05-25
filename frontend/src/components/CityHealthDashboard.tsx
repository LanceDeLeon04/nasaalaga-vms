import { useState, useEffect } from 'react';
import { BitingIncidents } from './BitingIncidents';
import { VaccinationCard } from './VaccinationCard';
import { MyProfile } from './MyProfile';
import { api } from '../lib/api';
import type { User } from '../App';

interface Props { user: User; onLogout: () => void; }

type CHOView = 'pets' | 'biting' | 'profile' | 'notifications';

const STYLES = `
  @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .cho-layout { display:flex; min-height:100vh; background:#f0f4fb; font-family:inherit; }
  .cho-sidebar { width:240px; background:linear-gradient(180deg,#1e3a6e 0%,#2B5EA6 100%); min-height:100vh; display:flex; flex-direction:column; flex-shrink:0; }
  .cho-sidebar-logo { padding:24px 20px 18px; border-bottom:1px solid rgba(255,255,255,.1); }
  .cho-sidebar-logo h2 { color:#fff; font-size:18px; font-weight:900; margin:0 0 2px; }
  .cho-sidebar-logo p  { color:rgba(255,255,255,.6); font-size:11px; margin:0; }
  .cho-sidebar-role { margin:12px 14px; background:rgba(255,255,255,.12); border-radius:10px; padding:10px 14px; }
  .cho-sidebar-role p { color:rgba(255,255,255,.9); font-size:12px; margin:0; }
  .cho-sidebar-role span { color:#93c5fd; font-weight:800; font-size:13px; }
  .cho-nav { flex:1; padding:10px 10px; }
  .cho-nav-item { display:flex; align-items:center; gap:10px; padding:11px 14px; border-radius:10px; cursor:pointer; transition:all .18s; color:rgba(255,255,255,.7); font-size:13.5px; font-weight:600; margin-bottom:4px; border:none; background:none; width:100%; text-align:left; }
  .cho-nav-item:hover { background:rgba(255,255,255,.1); color:#fff; }
  .cho-nav-item.active { background:rgba(255,255,255,.18); color:#fff; font-weight:800; }
  .cho-nav-item svg { width:18px; height:18px; flex-shrink:0; }
  .cho-logout { margin:10px; padding:0; border:none; background:rgba(255,255,255,.08); border-radius:10px; padding:10px 14px; cursor:pointer; color:rgba(255,255,255,.7); font-size:13px; font-weight:700; width:calc(100% - 20px); text-align:left; transition:all .18s; }
  .cho-logout:hover { background:rgba(255,255,255,.15); color:#fff; }
  .cho-main { flex:1; display:flex; flex-direction:column; overflow:hidden; }
  .cho-topbar { background:#fff; border-bottom:1px solid #e5e7eb; padding:14px 28px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 1px 4px rgba(0,0,0,.04); }
  .cho-topbar-title { font-size:17px; font-weight:800; color:#1f2937; }
  .cho-topbar-user { display:flex; align-items:center; gap:10px; }
  .cho-avatar { width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg,#2B5EA6,#60A85C); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:800; font-size:14px; }
  .cho-content { flex:1; padding:28px; overflow-y:auto; animation:fadeUp .35s both; }

  /* pet records */
  .cho-pet-wrap { background:#fff; border-radius:16px; box-shadow:0 2px 8px rgba(0,0,0,.06); overflow:hidden; }
  .cho-pet-toolbar { padding:16px 20px; display:flex; gap:10px; flex-wrap:wrap; border-bottom:1px solid #f1f5f9; }
  .cho-pet-search { flex:1; min-width:180px; height:40px; border:1.5px solid #e5e7eb; border-radius:10px; padding:0 12px; font-size:14px; outline:none; }
  .cho-pet-search:focus { border-color:#2B5EA6; }
  .cho-pet-table { width:100%; border-collapse:collapse; }
  .cho-pet-table th { background:#f8fafc; padding:11px 16px; text-align:left; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.07em; color:#64748b; border-bottom:1.5px solid #e2e8f0; }
  .cho-pet-table td { padding:13px 16px; border-bottom:1px solid #f1f5f9; font-size:13.5px; color:#374151; vertical-align:middle; }
  .cho-pet-table tr:last-child td { border-bottom:none; }
  .cho-pet-table tr:hover td { background:#f8fafc; }
  .cho-vax-badge { display:inline-flex; padding:3px 10px; border-radius:20px; font-size:11.5px; font-weight:700; }
  .cho-vax-badge.vax   { background:#dcfce7; color:#14532d; border:1px solid #86efac; }
  .cho-vax-badge.novax { background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; }
  .cho-vax-badge.obs   { background:#fff8ed; color:#92400e; border:1px solid #fde68a; }
  .cho-bite-flag { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:700; background:#fef2f2; color:#dc2626; border:1px solid #fca5a5; }

  /* profile */
  .cho-profile-card { background:#fff; border-radius:16px; box-shadow:0 2px 8px rgba(0,0,0,.06); padding:32px; max-width:520px; }
  .cho-profile-avatar { width:72px; height:72px; border-radius:50%; background:linear-gradient(135deg,#2B5EA6,#60A85C); display:flex; align-items:center; justify-content:center; color:#fff; font-size:28px; font-weight:900; margin-bottom:16px; }
  .cho-profile-name { font-size:22px; font-weight:900; color:#1f2937; margin:0 0 4px; }
  .cho-profile-role { display:inline-block; background:#eff6ff; color:#2B5EA6; border-radius:20px; padding:4px 14px; font-size:12px; font-weight:700; margin-bottom:20px; }
  .cho-profile-row { display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid #f1f5f9; font-size:14px; }
  .cho-profile-row:last-child { border-bottom:none; }
  .cho-profile-key { color:#6b7280; font-weight:600; }
  .cho-profile-val { color:#1f2937; font-weight:700; }

  /* notifications */
  .cho-notif-list { display:flex; flex-direction:column; gap:12px; }
  .cho-notif-card { background:#fff; border-radius:14px; padding:18px 20px; box-shadow:0 2px 8px rgba(0,0,0,.06); display:flex; align-items:flex-start; gap:14px; border-left:4px solid transparent; }
  .cho-notif-card.warn  { border-left-color:#f59e0b; }
  .cho-notif-card.alert { border-left-color:#dc2626; }
  .cho-notif-card.info  { border-left-color:#2B5EA6; }
  .cho-notif-ico { font-size:24px; flex-shrink:0; }
  .cho-notif-title { font-size:14px; font-weight:800; color:#1f2937; margin:0 0 4px; }
  .cho-notif-body  { font-size:13px; color:#6b7280; margin:0; line-height:1.6; }
  .cho-notif-time  { font-size:11px; color:#9ca3af; margin-top:6px; }

  @media(max-width:700px){ .cho-sidebar{display:none;} }
`;

const IC = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
  </svg>
);

const NAV_ITEMS: { id: CHOView; label: string; icon: JSX.Element }[] = [
  { id: 'pets',          label: 'Pet Records',     icon: IC('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2') },
  { id: 'biting',        label: 'Biting Incidents',icon: IC('M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z') },
  { id: 'notifications', label: 'Notifications',   icon: IC('M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9') },
  { id: 'profile',       label: 'My Profile',      icon: IC('M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z') },
];

function vaxClass(status?: string) {
  if (!status) return 'novax';
  if (status.includes('Observation')) return 'obs';
  if (status.toLowerCase().includes('vaccinated') && !status.toLowerCase().includes('not')) return 'vax';
  return 'novax';
}

export function CityHealthDashboard({ user, onLogout }: Props) {
  const [view, setView] = useState<CHOView>('pets');
  const [pets, setPets]   = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [petsLoaded, setPetsLoaded] = useState(false);
  const [incLoaded, setIncLoaded]   = useState(false);
  const [search, setSearch] = useState('');
  const [, forceUpdate] = useState(0); // triggers re-render on avatar update

  // Re-render when profile updated so avatar refreshes
  useEffect(() => {
    const onProfileUpdated = () => forceUpdate(n => n + 1);
    window.addEventListener('nasaalaga_profile_updated', onProfileUpdated);
    return () => window.removeEventListener('nasaalaga_profile_updated', onProfileUpdated);
  }, []);

  const [vaxCardPet, setVaxCardPet] = useState<any>(null);
  const [vaxCardHistory, setVaxCardHistory] = useState<any[]>([]);

  const loadPets = async () => {
    if (petsLoaded) return;
    try {
      const r = await fetch('/api/pets');
      const d = await r.json();
      setPets(d.pets || d || []);
      setPetsLoaded(true);
    } catch {}
  };

  const loadIncidents = async () => {
    if (incLoaded) return;
    try {
      const r = await fetch('/api/biting-incidents');
      const d = await r.json();
      setIncidents(d.incidents || []);
      setIncLoaded(true);
    } catch {}
  };

  const handleNav = (v: CHOView) => {
    setView(v);
    if (v === 'pets') loadPets();
    if (v === 'notifications') { loadIncidents(); loadPets(); }
  };

  // Derive notifications from data
  const thisYear = new Date().getFullYear();
  const overdueIncidents = incidents.filter(i => {
    if (!i.observation_end || i.status !== 'Open') return false;
    return new Date(i.observation_end) < new Date() && !i.observation_update;
  });
  const activeObs = incidents.filter(i => {
    if (!i.observation_end || i.status !== 'Open') return false;
    const days = Math.ceil((new Date(i.observation_end).getTime() - Date.now()) / 86400000);
    return days >= 0;
  });
  const biteThisYear = incidents.filter(i => new Date(i.incident_date).getFullYear() === thisYear);
  const notifs = [
    ...overdueIncidents.map(i => ({
      type: 'alert' as const,
      icon: 'alert',
      title: `Observation Update Required: ${i.pet_name}`,
      body: `The 14-day observation period ended on ${new Date(i.observation_end).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}. Please log an update.`,
      time: 'Action required',
    })),
    ...activeObs.map(i => {
      const days = Math.ceil((new Date(i.observation_end).getTime() - Date.now()) / 86400000);
      return {
        type: 'warn' as const,
        icon: 'search',
        title: `Under Observation: ${i.pet_name}`,
        body: `Observation ends ${new Date(i.observation_end).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})} — ${days} day${days===1?'':'s'} remaining. Pet should not be vaccinated this year.`,
        time: `Since ${new Date(i.observation_start||i.incident_date).toLocaleDateString('en-PH',{month:'short',day:'numeric'})}`,
      };
    }),
    ...(biteThisYear.length > 0 ? [{
      type: 'info' as const,
      icon: 'list',
      title: `${biteThisYear.length} Biting Incident${biteThisYear.length===1?'':'s'} This Year`,
      body: `There ${biteThisYear.length===1?'is':'are'} ${biteThisYear.length} recorded biting incident${biteThisYear.length===1?'':'s'} in ${thisYear}. Ensure all records are up to date.`,
      time: `${thisYear}`,
    }] : []),
  ];

  const filteredPets = pets.filter(p =>
    !search || [p.pet_name,p.owner_name,p.species,p.barangay].some(f=>(f||'').toLowerCase().includes(search.toLowerCase()))
  );

  const petsWithBiting = new Set(incidents.map(i => i.pet_id).filter(Boolean));

  return (
    <>
      <style>{STYLES}</style>
      <div className="cho-layout">

        {/* sidebar */}
        <div className="cho-sidebar">
          <div className="cho-sidebar-logo">
            <h2 style={{display:"flex",alignItems:"center",gap:8}}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>NASaAlaga</h2>
            <p>City Health Office Portal</p>
          </div>
          <div className="cho-sidebar-role">
            <p>Logged in as</p>
            {/* Avatar from sessionStorage */}
            {(() => {
              try {
                const stored = sessionStorage.getItem('nasaalaga_user');
                const av = stored ? JSON.parse(stored).avatar : null;
                const initials = (user.username || 'C')[0].toUpperCase();
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, marginBottom: 4 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: av ? 'transparent' : 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {av ? <img src={av} alt="av" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{initials}</span>}
                    </div>
                    <span style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>{user.username}</span>
                  </div>
                );
              } catch { return <span>{user.username}</span>; }
            })()}
          </div>
          <nav className="cho-nav">
            {NAV_ITEMS.map(item => (
              <button key={item.id} className={`cho-nav-item ${view===item.id?'active':''}`} onClick={()=>handleNav(item.id)}>
                {item.icon}
                {item.label}
                {item.id==='notifications' && notifs.length>0 && (
                  <span style={{marginLeft:'auto',background:'#dc2626',color:'#fff',borderRadius:10,padding:'1px 7px',fontSize:11,fontWeight:800}}>{notifs.length}</span>
                )}
              </button>
            ))}
          </nav>
          <button className="cho-logout" onClick={onLogout} style={{display:"flex",alignItems:"center",gap:6}}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>Logout</button>
        </div>

        {/* main */}
        <div className="cho-main">
          <div className="cho-topbar">
            <div className="cho-topbar-title">
              {NAV_ITEMS.find(n=>n.id===view)?.label}
            </div>
            <div className="cho-topbar-user">
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:13,fontWeight:700,color:'#1f2937'}}>{user.username}</div>
                <div style={{fontSize:11,color:'#6b7280'}}>City Health Office</div>
              </div>
              {(() => {
                try {
                  const stored = sessionStorage.getItem('nasaalaga_user');
                  const av = stored ? JSON.parse(stored).avatar : null;
                  return av
                    ? <div className="cho-avatar" style={{overflow:'hidden',padding:0}}><img src={av} alt="av" style={{width:'100%',height:'100%',objectFit:'cover'}}/></div>
                    : <div className="cho-avatar">{(user.username||'C')[0].toUpperCase()}</div>;
                } catch { return <div className="cho-avatar">{(user.username||'C')[0].toUpperCase()}</div>; }
              })()}
            </div>
          </div>

          <div className="cho-content" key={view}>

            {/* ── PET RECORDS ── */}
            {view === 'pets' && (
              <div className="cho-pet-wrap">
                <div className="cho-pet-toolbar">
                  <input className="cho-pet-search" placeholder="Search pet name, owner, species, barangay…" value={search} onChange={e=>setSearch(e.target.value)} />
                  <div style={{fontSize:13,color:'#6b7280',display:'flex',alignItems:'center'}}>
                    {filteredPets.length} record{filteredPets.length!==1?'s':''}
                  </div>
                </div>
                {!petsLoaded ? (
                  <div style={{padding:48,textAlign:'center',color:'#9ca3af'}}>
                    <div style={{width:32,height:32,borderRadius:'50%',border:'3px solid #e5e7eb',borderTopColor:'#2B5EA6',animation:'spin .7s linear infinite',margin:'0 auto 12px'}}/>
                    Loading records…
                  </div>
                ) : (
                  <table className="cho-pet-table">
                    <thead>
                      <tr>
                        <th>Pet</th>
                        <th>Owner</th>
                        <th>Species / Breed</th>
                        <th>Barangay</th>
                        <th>Vaccination</th>
                        <th>Biting History</th>
                        <th>Tag ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPets.length === 0 ? (
                        <tr><td colSpan={8} style={{textAlign:'center',padding:40,color:'#9ca3af'}}>No pets found.</td></tr>
                      ) : filteredPets.map(p => (
                        <tr key={p.id}>
                          <td>
                            <div style={{fontWeight:700}}>{p.pet_name}</div>
                            <div style={{fontSize:11,color:'#9ca3af'}}>{p.id}</div>
                          </td>
                          <td>
                            <div>{p.owner_name || '—'}</div>
                            <div style={{fontSize:11,color:'#9ca3af'}}>{p.contact_number||''}</div>
                          </td>
                          <td>{p.species}{p.breed?` · ${p.breed}`:''}</td>
                          <td>{p.barangay || '—'}</td>
                          <td>
                            <span className={`cho-vax-badge ${vaxClass(p.vaccination_status)}`}>
                              {p.vaccination_status || 'Not Vaccinated'}
                            </span>
                          </td>
                          <td>
                            {petsWithBiting.has(p.id)
                              ? <span className="cho-bite-flag" style={{display:"inline-flex",alignItems:"center",gap:3}}><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Has Record</span>
                              : <span style={{color:'#9ca3af',fontSize:12}}>None</span>
                            }
                          </td>
                          <td style={{fontFamily:'monospace',fontSize:12}}>{p.pet_tag_id || '—'}</td>
                          <td>
                            <button onClick={async()=>{
                              try{
                                const h = await api.getVaccinationHistory(p.id);
                                setVaxCardPet(p); setVaxCardHistory(h.history||[]);
                              }catch{}
                            }} style={{height:30,padding:'0 10px',background:'#fff8ed',border:'1.5px solid #fbbf24',borderRadius:8,color:'#92400e',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{display:"inline",marginRight:4}}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── BITING INCIDENTS ── */}
            {view === 'biting' && (
              <BitingIncidents userRole={user.role || 'cityHealth'} />
            )}

            {vaxCardPet && (
              <VaccinationCard
                pet={vaxCardPet}
                history={vaxCardHistory}
                onClose={()=>{ setVaxCardPet(null); setVaxCardHistory([]); }}
              />
            )}

            {/* ── NOTIFICATIONS ── */}
            {view === 'notifications' && (
              <div>
                <p style={{fontSize:13,color:'#6b7280',marginBottom:16}}>
                  {notifs.length === 0 ? 'No active notifications.' : `${notifs.length} notification${notifs.length===1?'':'s'} require attention.`}
                </p>
                {notifs.length === 0 ? (
                  <div style={{background:'#fff',borderRadius:14,padding:48,textAlign:'center',color:'#9ca3af',boxShadow:'0 2px 8px rgba(0,0,0,.06)'}}>
                    <div style={{fontSize:40,marginBottom:10,display:"flex",justifyContent:"center"}}><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg></div>
                    <p style={{margin:0,fontWeight:700}}>All clear — no pending actions.</p>
                  </div>
                ) : (
                  <div className="cho-notif-list">
                    {notifs.map((n,i) => (
                      <div key={i} className={`cho-notif-card ${n.type}`}>
                        <div className="cho-notif-ico">{n.icon}</div>
                        <div>
                          <p className="cho-notif-title">{n.title}</p>
                          <p className="cho-notif-body">{n.body}</p>
                          <p className="cho-notif-time">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── PROFILE ── */}
            {view === 'profile' && (
              <MyProfile user={user} onUserUpdate={(u) => { const s = sessionStorage.getItem('nasaalaga_user'); if(s){try{const p=JSON.parse(s);Object.assign(p,u);sessionStorage.setItem('nasaalaga_user',JSON.stringify(p));window.dispatchEvent(new Event('nasaalaga_profile_updated'));}catch{}} }} />
            )}

          </div>
        </div>
      </div>
    </>
  );
}

export default CityHealthDashboard;
