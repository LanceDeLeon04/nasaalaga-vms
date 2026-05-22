import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import type { UserRole } from "../App";

/* ──────────────────────────────────────────────────────────────
   SLIDES
────────────────────────────────────────────────────────────── */

const SLIDES = [
  {
    tag: "Veterinary Digital Platform",
    tagColor: "#F39C3A",
    headline: "Modern Pet & Animal\nHealthcare Records",
    sub: "Digitally manage vaccination records, consultations, treatment history, animal profiling, and owner information through a centralized veterinary management platform.",
    pills: ["Vaccination Logs", "Pet Profiles", "Medical History", "Digital Records"],
    bg: "linear-gradient(150deg,#1b2d4a 0%,#2B5EA6 55%,#1a3d72 100%)",
  },
  {
    tag: "Vaccination Monitoring",
    tagColor: "#60A85C",
    headline: "Track Vaccines,\nSchedules & Alerts",
    sub: "Automated reminders and real-time monitoring for anti-rabies, deworming, vaccination campaigns, and animal health management across the city veterinary office.",
    pills: ["Rabies Monitoring", "Vaccination Alerts", "Health Tracking", "Pet Monitoring"],
    bg: "linear-gradient(150deg,#162018 0%,#295b36 55%,#1d3d27 100%)",
  },
  {
    tag: "LGU Veterinary Operations",
    tagColor: "#E85D3B",
    headline: "Smart City Veterinary\nManagement System",
    sub: "Empowering the City Veterinary Office with analytics, reports, census tracking, treatment monitoring, and secure government-grade digital services.",
    pills: ["Pet Census", "Analytics", "Secure Access", "Government Reports"],
    bg: "linear-gradient(150deg,#1e0d08 0%,#612719 55%,#2b140f 100%)",
  },
];

const STATS = [
  { value: "24/7",  label: "System Availability" },
  { value: "100%",  label: "Digitalized Records"  },
  { value: "LGU",   label: "Government Ready"      },
];

/* ──────────────────────────────────────────────────────────────
   STYLES
────────────────────────────────────────────────────────────── */

const STYLES = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root { margin:0; width:100%; min-height:100%; font-family:Inter,sans-serif; }

  @keyframes fadeSlideIn  { from{opacity:0;transform:translateY(12px);} to{opacity:1;transform:translateY(0);} }
  @keyframes fadeSlideOut { from{opacity:1;transform:translateY(0);} to{opacity:0;transform:translateY(-12px);} }
  @keyframes shimmer      { 0%{transform:translateX(-120%);} 100%{transform:translateX(120%);} }
  @keyframes spin         { to{transform:rotate(360deg);} }
  @keyframes scanLine     { 0%{top:10%;} 50%{top:84%;} 100%{top:10%;} }
  @keyframes pop          { 0%{transform:scale(.5);opacity:0;} 70%{transform:scale(1.1);} 100%{transform:scale(1);opacity:1;} }
  @keyframes fadeIn       { from{opacity:0;} to{opacity:1;} }
  @keyframes fadeUp       { from{opacity:0;transform:translateY(14px);} to{opacity:1;transform:translateY(0);} }
  @keyframes slideInToast { from{transform:translateX(110%);opacity:0;} to{transform:translateX(0);opacity:1;} }
  @keyframes pulseDot     { 0%,100%{opacity:1;} 50%{opacity:.35;} }

  /* ── LAYOUT ── */
  .login-root {
    width:100%; min-height:100vh;
    display:grid; grid-template-columns:1.15fr .85fr;
    background:#fff; overflow:hidden;
  }

  /* ── LEFT PANEL ── */
  .slideshow-panel {
    position:relative; overflow:hidden; padding:42px;
    display:flex; flex-direction:column; justify-content:space-between;
  }
  .cityhall-outline {
    position:absolute; inset:0;
    background-image:url('/images/city_hall_outline.png');
    background-size:cover; background-position:center;
    opacity:.07; mix-blend-mode:screen; pointer-events:none;
  }
  .cityhall-overlay {
    position:absolute; inset:0;
    background:linear-gradient(180deg,rgba(0,0,0,.14) 0%,rgba(0,0,0,.24) 100%);
  }

  /* brand */
  .slide-brand { position:relative; z-index:2; }
  .slide-logo  { display:flex; align-items:center; gap:16px; }
  .slide-logo-seal {
    width:74px; height:74px; border-radius:999px; overflow:hidden;
    border:2px solid rgba(255,255,255,.22);
    background:rgba(255,255,255,.1);
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 8px 24px rgba(0,0,0,.22);
    flex-shrink:0;
  }
  .slide-logo-seal img { width:100%; height:100%; object-fit:contain; padding:6px; }
  .slide-logo-texts    { display:flex; flex-direction:column; }
  .slide-logo-title    { color:#fff; font-size:30px; font-weight:900; line-height:1; letter-spacing:-0.04em; }
  .slide-logo-subtitle { color:rgba(255,255,255,.7); font-size:13px; margin-top:5px; }

  /* slide content */
  .slide-content-wrap { position:relative; z-index:2; width:100%; max-width:620px; min-height:420px; display:flex; align-items:center; }
  .slide-content { width:100%; }
  .slide-fade-in  { animation:fadeSlideIn .45s ease forwards; }
  .slide-fade-out { animation:fadeSlideOut .3s ease forwards; }

  .slide-tag {
    display:inline-flex; align-items:center; gap:10px;
    border-radius:999px; padding:10px 18px;
    border:1px solid rgba(255,255,255,.15);
    background:rgba(255,255,255,.08); backdrop-filter:blur(14px);
    font-size:13px; font-weight:800; margin-bottom:28px; min-height:42px;
  }
  .slide-tag-dot  { width:7px; height:7px; border-radius:999px; }
  .slide-headline { margin:0; font-size:64px; line-height:.95; color:#fff; font-weight:900; letter-spacing:-0.06em; min-height:130px; }
  .slide-sub      { margin-top:24px; color:rgba(255,255,255,.8); line-height:1.85; font-size:17px; min-height:125px; }
  .slide-pills    { display:flex; flex-wrap:wrap; gap:12px; min-height:58px; }
  .slide-pill     {
    height:42px; display:flex; align-items:center;
    border-radius:999px; padding:0 16px;
    background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.14);
    backdrop-filter:blur(10px); color:#fff; font-size:13px; font-weight:700;
  }

  /* bottom */
  .slide-bottom { position:relative; z-index:2; }
  .slide-dots   { display:flex; align-items:center; gap:10px; margin-bottom:28px; }
  .slide-dot    { height:6px; border:none; border-radius:999px; cursor:pointer; transition:all .25s ease; }
  .slide-stats  { display:flex; gap:18px; flex-wrap:wrap; }
  .slide-stat   {
    min-width:150px; padding:18px; border-radius:22px;
    background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.14);
    backdrop-filter:blur(14px);
  }
  .slide-stat-value { display:block; font-size:28px; font-weight:900; margin-bottom:6px; }
  .slide-stat-label { color:rgba(255,255,255,.72); font-size:12px; }

  /* ── RIGHT PANEL ── */
  .login-panel {
    position:relative; display:flex; align-items:center; justify-content:center;
    padding:44px; overflow:hidden; background:#f8f9fb;
  }

  /* Subtle grid layer — gradient from light gray top to white bottom */
  .login-panel-bg {
    position:absolute; inset:0; pointer-events:none; z-index:0;
    background:
      linear-gradient(175deg, rgba(210,218,228,.6) 0%, rgba(255,255,255,0) 65%),
      repeating-linear-gradient(0deg,  transparent, transparent 27px, rgba(140,155,175,.14) 27px, rgba(140,155,175,.14) 28px),
      repeating-linear-gradient(90deg, transparent, transparent 27px, rgba(140,155,175,.14) 27px, rgba(140,155,175,.14) 28px);
  }

  /* card wrap */
  .login-card-wrap { position:relative; width:100%; max-width:470px; z-index:1; }

  .login-card {
    position:relative; z-index:2; overflow:hidden;
    border-radius:32px;
    background:rgba(255,255,255,.9);
    backdrop-filter:blur(22px);
    border:1px solid rgba(255,255,255,.8);
    box-shadow:0 25px 80px rgba(0,0,0,.09), 0 10px 40px rgba(243,156,58,.09);
    padding:44px;
  }
  .login-card::before {
    content:''; position:absolute; top:0; left:-120%; width:50%; height:100%;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);
    animation:shimmer 8s linear infinite;
  }

  .login-mobile-logo { display:none; }
  .login-header      { position:relative; z-index:2; }
  .login-title       { margin:0; font-size:40px; line-height:1; letter-spacing:-0.05em; color:#1f2937; font-weight:900; }
  .login-subtitle    { margin-top:16px; color:#6b7280; line-height:1.8; font-size:14px; }

  /* form */
  .login-form  { margin-top:34px; position:relative; z-index:2; }
  .login-field { margin-bottom:22px; }
  .login-label { display:block; margin-bottom:10px; font-size:13px; font-weight:800; color:#374151; }

  .login-input-wrap { position:relative; }
  .login-input-icon {
    position:absolute; top:50%; left:16px; transform:translateY(-50%);
    color:#9ca3af; display:flex; align-items:center; justify-content:center;
  }
  .login-input {
    width:100%; height:58px; border-radius:18px; border:1.5px solid #e5e7eb;
    background:#f9fafb; padding:0 54px 0 48px; font-size:15px; color:#1f2937;
    outline:none; transition:border-color .2s,box-shadow .2s,background .2s,transform .2s;
  }
  .login-input::placeholder { color:#9ca3af; }
  .login-input:focus {
    background:#fff; border-color:#F39C3A;
    box-shadow:0 0 0 4px rgba(243,156,58,.12); transform:translateY(-1px);
  }
  .login-show-pass {
    position:absolute; top:50%; right:14px; transform:translateY(-50%);
    border:none; background:none; cursor:pointer; color:#9ca3af;
    display:flex; align-items:center; justify-content:center; transition:color .18s;
  }
  .login-show-pass:hover { color:#F39C3A; }

  .login-error { margin-top:10px; color:#dc2626; font-size:13px; font-weight:700; }

  /* button */
  .login-btn {
    width:100%; height:58px; border:none; border-radius:18px; cursor:pointer;
    position:relative; overflow:hidden;
    background:linear-gradient(135deg,#F39C3A 0%,#E85D3B 100%);
    color:#fff; font-size:15px; font-weight:900; letter-spacing:.02em;
    transition:transform .18s,box-shadow .18s;
    box-shadow:0 16px 40px rgba(232,93,59,.28);
  }
  .login-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 20px 50px rgba(232,93,59,.36); }
  .login-btn:disabled { opacity:.7; cursor:not-allowed; }
  .login-btn::before { content:''; position:absolute; inset:0; background:linear-gradient(180deg,rgba(255,255,255,.18),transparent); }
  .login-btn::after  {
    content:''; position:absolute; top:0; left:-100%; width:40%; height:100%;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,.28),transparent);
    animation:shimmer 2.8s linear infinite;
  }

  .login-spinner-wrap { display:flex; align-items:center; justify-content:center; gap:10px; }
  .login-spinner {
    width:18px; height:18px; border-radius:999px;
    border:2px solid rgba(255,255,255,.3); border-top-color:#fff;
    animation:spin .7s linear infinite;
  }

  /* footer actions */
  .login-footer-actions {
    position:relative; z-index:2; margin-top:22px;
    display:flex; align-items:center; justify-content:space-between;
  }
  .login-guest-btn {
    font-size:13px; color:#6b7280; background:none; border:1.5px solid #e5e7eb;
    border-radius:10px; padding:8px 14px; cursor:pointer;
    transition:border-color .18s,color .18s,background .18s;
  }
  .login-guest-btn:hover { border-color:#F39C3A; color:#E85D3B; background:rgba(243,156,58,.04); }
  .login-signup-btn {
    font-size:13px; font-weight:700; color:#E85D3B;
    background:none; border:none; cursor:pointer; transition:opacity .18s;
  }
  .login-signup-btn:hover { opacity:.7; }

  .login-footer {
    position:relative; z-index:2; margin-top:20px;
    text-align:center; color:#9ca3af; font-size:12px; line-height:1.8;
  }

  /* ── SCANNER MODAL ── */
  .scanner-overlay {
    position:fixed; inset:0; z-index:50;
    display:flex; align-items:center; justify-content:center; padding:16px;
    backdrop-filter:blur(10px);
    background:rgba(30,20,10,.35);
  }
  .scanner-card {
    background:#fff; border-radius:22px; width:100%; max-width:360px;
    overflow:hidden; box-shadow:0 24px 64px rgba(0,0,0,.16);
    animation:fadeUp .3s ease both;
  }
  .scanner-header {
    padding:16px 20px; display:flex; align-items:center; justify-content:space-between;
    background:linear-gradient(135deg,#E8680A,#F5882A);
  }
  .scanner-header-left { display:flex; align-items:center; gap:12px; }
  .scanner-icon-box {
    width:32px; height:32px; border-radius:9px; background:rgba(255,255,255,.2);
    display:flex; align-items:center; justify-content:center; color:#fff;
  }
  .scanner-title    { color:#fff; font-weight:700; font-size:14px; margin:0; }
  .scanner-subtitle { color:rgba(255,255,255,.65); font-size:12px; margin-top:2px; }
  .scanner-close    { background:none; border:none; cursor:pointer; color:rgba(255,255,255,.65); display:flex; transition:color .18s; }
  .scanner-close:hover { color:#fff; }
  .scanner-body  { padding:20px; }
  .scanner-hint  { text-align:center; color:#9ca3af; font-size:12px; margin-bottom:16px; }

  .scanner-frame-wrap {
    position:relative; width:165px; height:165px; margin:0 auto 16px;
    border-radius:14px; background:#fff8f2; border:1px solid #fde8d4;
  }
  .sc    { position:absolute; width:20px; height:20px; border-style:solid; border-color:#E8680A; }
  .sc.tl { top:8px;    left:8px;   border-width:2.5px 0 0 2.5px; border-radius:3px 0 0 0; }
  .sc.tr { top:8px;    right:8px;  border-width:2.5px 2.5px 0 0; border-radius:0 3px 0 0; }
  .sc.bl { bottom:8px; left:8px;   border-width:0 0 2.5px 2.5px; border-radius:0 0 0 3px; }
  .sc.br { bottom:8px; right:8px;  border-width:0 2.5px 2.5px 0; border-radius:0 0 3px 0; }

  .scan-line {
    position:absolute; left:12px; right:12px; height:2px;
    background:linear-gradient(90deg,transparent,#E8680A,transparent);
    animation:scanLine 1.8s ease-in-out infinite;
  }
  .scan-icon-center {
    position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
    color:#fdd5b0;
  }
  .scan-result-overlay {
    position:absolute; inset:0; border-radius:14px;
    display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px;
    animation:fadeIn .2s ease forwards; z-index:10;
  }
  .scan-result-label { color:#fff; font-weight:700; font-size:14px; }
  .scan-result-sub   { color:rgba(255,255,255,.8); font-size:12px; }

  .scanner-status { display:flex; align-items:center; justify-content:center; gap:8px; font-size:12px; min-height:18px; margin-bottom:10px; }
  .status-dot     { width:8px; height:8px; border-radius:999px; animation:pulseDot 1.4s ease-in-out infinite; }
  .scanner-email  { text-align:center; font-size:12px; color:#9ca3af; }
  .scanner-email span { font-weight:600; color:#4b5563; }

  /* ── TOAST ── */
  .toast-container {
    position:fixed; top:16px; right:16px; z-index:200;
    display:flex; flex-direction:column; gap:8px; pointer-events:none;
  }
  .toast {
    display:flex; align-items:center; gap:12px;
    padding:12px 16px; border-radius:14px;
    backdrop-filter:blur(12px); border:1px solid;
    pointer-events:auto; min-width:280px; max-width:360px;
    box-shadow:0 8px 32px rgba(0,0,0,.12);
    animation:slideInToast .3s ease forwards;
  }
  .toast-error   { background:rgba(254,242,242,.97); border-color:#fecaca; color:#991b1b; }
  .toast-success { background:rgba(240,253,244,.97); border-color:#bbf7d0; color:#166534; }
  .toast-warning { background:rgba(255,251,235,.97); border-color:#fde68a; color:#92400e; }
  .toast-msg  { font-size:13px; font-weight:600; flex:1; }
  .toast-close { background:none; border:none; cursor:pointer; opacity:.5; display:flex; transition:opacity .18s; }
  .toast-close:hover { opacity:1; }

  /* ── RESPONSIVE ── */
  @media(max-width:1100px) {
    .slide-headline { font-size:54px; min-height:120px; }
    .slide-sub { min-height:150px; }
  }
  @media(max-width:960px) {
    .login-root { grid-template-columns:1fr; }
    .slideshow-panel { min-height:520px; }
    .slide-headline { font-size:48px; }
    .slide-content-wrap { min-height:350px; }
  }
  @media(max-width:640px) {
    .slideshow-panel { display:none; }
    .login-panel { padding:22px; }
    .login-card { padding:32px 24px; border-radius:28px; }
    .login-mobile-logo { display:flex; align-items:center; gap:14px; margin-bottom:28px; }
    .login-mobile-logo img { width:54px; height:54px; object-fit:contain; }
    .login-mobile-logo-text { display:flex; flex-direction:column; }
    .login-mobile-logo-title { font-size:26px; font-weight:900; line-height:1; color:#1f2937; }
    .login-mobile-logo-sub { font-size:12px; color:#6b7280; margin-top:5px; }
    .login-title { font-size:34px; }
  }
`;

/* ──────────────────────────────────────────────────────────────
   SVG ICONS
────────────────────────────────────────────────────────────── */
function IconScan({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  );
}
function IconCheckCircle({ size = 17, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
function IconXCircle({ size = 17, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}
function IconAlert({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function IconX({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconEye({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconEyeOff({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <path d="M14.12 14.12A3 3 0 019.88 9.88" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────
   TOAST
────────────────────────────────────────────────────────────── */
type ToastType = "error" | "success" | "warning";
interface Toast { id: number; type: ToastType; message: string; }
let _toastId = 0;

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === "error"   && <span style={{ flexShrink:0,display:"flex",color:"#dc2626" }}><IconXCircle size={18} /></span>}
          {t.type === "success" && <span style={{ flexShrink:0,display:"flex",color:"#16a34a" }}><IconCheckCircle size={18} /></span>}
          {t.type === "warning" && <span style={{ flexShrink:0,display:"flex",color:"#d97706" }}><IconAlert size={18} /></span>}
          <p className="toast-msg">{t.message}</p>
          <button className="toast-close" onClick={() => onRemove(t.id)}><IconX size={14} /></button>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   SCAN RESULT OVERLAY
────────────────────────────────────────────────────────────── */
type ScanResult = "granted" | "denied" | null;

function ScanResultOverlay({ result, username }: { result: ScanResult; username?: string }) {
  if (!result) return null;
  const bg = result === "granted" ? "rgba(22,163,74,.94)" : "rgba(220,38,38,.94)";
  return (
    <div className="scan-result-overlay" style={{ background: bg }}>
      {result === "granted" ? (
        <>
          <IconCheckCircle size={52} style={{ color:"#fff", animation:"pop .3s ease forwards" }} />
          <p className="scan-result-label">Access Granted</p>
          {username && <p className="scan-result-sub">Welcome, {username.split(" ")[0]}</p>}
        </>
      ) : (
        <>
          <IconXCircle size={52} style={{ color:"#fff", animation:"pop .3s ease forwards" }} />
          <p className="scan-result-label">Access Denied</p>
          <p className="scan-result-sub">Invalid or unregistered ID</p>
        </>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   SCANNER MODAL
────────────────────────────────────────────────────────────── */
function ScannerModal({
  pendingEmail, pendingUsername, pendingToken, onClose, onVerified, onDenied,
}: {
  pendingEmail: string; pendingUsername: string; pendingToken: string;
  onClose: () => void; onVerified: (user: any, token: string) => void; onDenied: () => void;
}) {
  const [scanValue,   setScanValue]   = useState("");
  const [scanResult,  setScanResult]  = useState<ScanResult>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef    = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const h = () => { if (!scanResult) inputRef.current?.focus(); };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [scanResult]);

  const processBarcode = async (value: string) => {
    const clean = value.trim();
    if (!clean || isVerifying) return;
    setIsVerifying(true);
    try {
      const res  = await fetch("/api/auth/verify-barcode", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingToken, barcode: clean }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setScanResult("granted");
        setTimeout(() => onVerified(data.user, data.token), 1200);
      } else {
        setScanResult("denied");
        setTimeout(() => {
          setScanResult(null); setScanValue(""); setIsVerifying(false);
          inputRef.current?.focus(); onDenied();
        }, 1500);
      }
    } catch {
      setScanResult("denied");
      setTimeout(() => { setScanResult(null); setScanValue(""); setIsVerifying(false); onDenied(); }, 1500);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; setScanValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { if (val.trim().length >= 4) processBarcode(val); }, 300);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { if (debounceRef.current) clearTimeout(debounceRef.current); processBarcode(scanValue); }
  };

  return (
    <div className="scanner-overlay">
      <div className="scanner-card">
        <div className="scanner-header">
          <div className="scanner-header-left">
            <div className="scanner-icon-box"><IconScan size={16} /></div>
            <div>
              <p className="scanner-title">SuperAdmin ID Verification</p>
              <p className="scanner-subtitle">Biometric scan required</p>
            </div>
          </div>
          {!scanResult && (
            <button className="scanner-close" onClick={onClose}><IconX size={15} /></button>
          )}
        </div>

        <div className="scanner-body">
          <p className="scanner-hint">Scan your employee ID barcode or QR code to proceed</p>

          <div className="scanner-frame-wrap">
            <ScanResultOverlay result={scanResult} username={pendingUsername} />
            {!scanResult && (
              <>
                <span className="sc tl" /><span className="sc tr" />
                <span className="sc bl" /><span className="sc br" />
                <div className="scan-line" />
                <div className="scan-icon-center"><IconScan size={36} /></div>
              </>
            )}
          </div>

          <input
            ref={inputRef} type="password" value={scanValue}
            onChange={handleChange} onKeyDown={handleKeyDown}
            style={{ opacity:0, position:"absolute", width:0, height:0, pointerEvents:"none" }}
            autoComplete="off" aria-hidden tabIndex={-1}
          />

          <div className="scanner-status">
            {!scanResult && !isVerifying && (
              <><span className="status-dot" style={{ background:"#4ade80" }} />
              <span style={{ color:"#6b7280" }}>Ready — scan your ID now</span></>
            )}
            {!scanResult && isVerifying && (
              <><span className="status-dot" style={{ background:"#f59e0b" }} />
              <span style={{ color:"#d97706", fontWeight:600 }}>Verifying…</span></>
            )}
            {scanResult === "granted" && <span style={{ color:"#16a34a", fontWeight:600 }}>Redirecting…</span>}
            {scanResult === "denied"  && <span style={{ color:"#dc2626", fontWeight:600 }}>Retrying in a moment…</span>}
          </div>

          <p className="scanner-email">Authenticating: <span>{pendingEmail}</span></p>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   MAIN COMPONENT
────────────────────────────────────────────────────────────── */
export function Login() {
  const navigate = useNavigate();

  /* auth state */
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  /* barcode / scanner flow */
  const [pendingEmail,    setPendingEmail]    = useState("");
  const [pendingUsername, setPendingUsername] = useState("");
  const [pendingToken,    setPendingToken]    = useState("");
  const [showScanner,     setShowScanner]     = useState(false);

  /* toasts */
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = (type: ToastType, message: string) => {
    const id = ++_toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  };

  /* slideshow */
  const [slide,     setSlide]     = useState(0);
  const [animClass, setAnimClass] = useState("slide-fade-in");
  const timerRef = useRef<any>(null);
  const s = useMemo(() => SLIDES[slide], [slide]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setAnimClass("slide-fade-out");
      setTimeout(() => { setSlide((prev) => (prev + 1) % SLIDES.length); setAnimClass("slide-fade-in"); }, 280);
    }, 5200);
    return () => clearInterval(timerRef.current);
  }, []);

  const goSlide = (i: number) => {
    clearInterval(timerRef.current);
    setAnimClass("slide-fade-out");
    setTimeout(() => { setSlide(i); setAnimClass("slide-fade-in"); }, 280);
  };

  /* submit */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "maintenance") { window.location.reload(); return; }
        setError(data.error || "Invalid email or password.");
        return;
      }
      if (data.requiresBarcodeVerification) {
        setPendingEmail(data.email);
        setPendingUsername(data.username);
        setPendingToken(data.pendingToken);
        setShowScanner(true);
        return;
      }
      sessionStorage.setItem("nasaalaga_user",  JSON.stringify(data.user));
      sessionStorage.setItem("nasaalaga_token", data.token);
      addToast("success", `Welcome back, ${data.user.username}!`);
      setTimeout(() => navigate("/dashboard"), 400);
    } catch {
      setError("Network error — backend may be offline.");
    } finally {
      setLoading(false);
    }
  };

  const handleScanVerified = (user: any, token: string) => {
    sessionStorage.setItem("nasaalaga_user",  JSON.stringify(user));
    sessionStorage.setItem("nasaalaga_token", token);
    setShowScanner(false);
    navigate("/dashboard");
  };

  const handleGuestLogin = () => {
    sessionStorage.setItem("nasaalaga_user", JSON.stringify({ username: "Guest", role: "guest" as UserRole }));
    navigate("/dashboard");
  };

  /* ── RENDER ── */
  return (
    <>
      <style>{STYLES}</style>
      <ToastContainer toasts={toasts} onRemove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />

      <div className="login-root">

        {/* ──────────── LEFT ──────────── */}
        <div className="slideshow-panel" style={{ background: s.bg }}>
          <div className="cityhall-outline" />
          <div className="cityhall-overlay" />

          {/* brand */}
          <div className="slide-brand">
            <div className="slide-logo">
              <div className="slide-logo-seal">
                <img src="/images/city-seal.png" alt="Calaca City Seal" />
              </div>
              <div className="slide-logo-texts">
                <span className="slide-logo-title">NASaAlaga</span>
                <span className="slide-logo-subtitle">Veterinary Management System</span>
              </div>
            </div>
          </div>

          {/* slide */}
          <div className="slide-content-wrap">
            <div className="slide-content">
              <div className={animClass}>
                <div className="slide-tag" style={{ color: s.tagColor }}>
                  <span className="slide-tag-dot" style={{ background: s.tagColor }} />
                  {s.tag}
                </div>
                <h1 className="slide-headline" style={{ whiteSpace: "pre-line" }}>{s.headline}</h1>
                <p className="slide-sub">{s.sub}</p>
                <div className="slide-pills">
                  {s.pills.map((pill) => <div key={pill} className="slide-pill">{pill}</div>)}
                </div>
              </div>
            </div>
          </div>

          {/* bottom */}
          <div className="slide-bottom">
            <div className="slide-dots">
              {SLIDES.map((_, i) => (
                <button key={i} className="slide-dot" onClick={() => goSlide(i)}
                  style={{ width: i === slide ? 28 : 6, background: i === slide ? s.tagColor : "rgba(255,255,255,.24)" }} />
              ))}
            </div>
            <div className="slide-stats">
              {STATS.map((st) => (
                <div key={st.label} className="slide-stat">
                  <span className="slide-stat-value" style={{ color: s.tagColor }}>{st.value}</span>
                  <span className="slide-stat-label">{st.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ──────────── RIGHT ──────────── */}
        <div className="login-panel">
          <div className="login-panel-bg" />

          <div className="login-card-wrap">
            <div className="login-card">

              {/* mobile logo */}
              <div className="login-mobile-logo">
                <img src="/images/city-seal.png" alt="Calaca City Seal" />
                <div className="login-mobile-logo-text">
                  <span className="login-mobile-logo-title">NASaAlaga</span>
                  <span className="login-mobile-logo-sub">Veterinary Management System</span>
                </div>
              </div>

              {/* header */}
              <div className="login-header">
                <h1 className="login-title">Welcome back</h1>
                <p className="login-subtitle">
                  Sign in to continue managing veterinary records, vaccinations, pet monitoring, and LGU animal welfare services through NASaAlaga.
                </p>
              </div>

              {/* form */}
              <form className="login-form" onSubmit={handleSubmit}>

                {/* email */}
                <div className="login-field">
                  <label className="login-label">Email Address</label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" />
                      </svg>
                    </span>
                    <input className="login-input" type="email" placeholder="Enter your email"
                      value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} />
                  </div>
                </div>

                {/* password */}
                <div className="login-field">
                  <label className="login-label">Password</label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    </span>
                    <input className="login-input"
                      type={showPass ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }} />
                    <button type="button" className="login-show-pass" onClick={() => setShowPass((p) => !p)}>
                      {showPass ? <IconEyeOff /> : <IconEye />}
                    </button>
                  </div>
                  {error && <div className="login-error" style={{display:"flex",alignItems:"center",gap:6}}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>{error}</div>}
                </div>

                {/* submit */}
                <button type="submit" className="login-btn" disabled={loading}>
                  {loading ? (
                    <span className="login-spinner-wrap">
                      <span className="login-spinner" /><span>Signing in…</span>
                    </span>
                  ) : "Sign In to NASaAlaga"}
                </button>
              </form>

              {/* guest + signup */}
              <div className="login-footer-actions">
                <button className="login-guest-btn" onClick={handleGuestLogin}>Continue as Guest</button>
                <button className="login-signup-btn" onClick={() => navigate("/signup")}>Create Account →</button>
              </div>

              <div className="login-footer">
                City Government of Calaca · NASaAlaga Veterinary Management System · Government Digital Services
              </div>
            </div>
          </div>
        </div>
      </div>

      {showScanner && (
        <ScannerModal
          pendingEmail={pendingEmail}
          pendingUsername={pendingUsername}
          pendingToken={pendingToken}
          onClose={() => setShowScanner(false)}
          onVerified={handleScanVerified}
          onDenied={() => addToast("error", "Access Denied — ID barcode does not match this account.")}
        />
      )}
    </>
  );
}

export default Login;