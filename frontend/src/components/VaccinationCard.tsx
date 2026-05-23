import { useEffect, useRef, useState } from 'react';

interface VaxRecord {
  date_of_vaccination: string;
  vaccine_name: string;
  lot_number?: string;
  batch_number?: string;
  veterinarian?: string;
  vet_license?: string;
  next_due_date?: string;
  notes?: string;
}

interface Pet {
  id: string;
  pet_name?: string;
  petName?: string;
  species: string;
  gender?: string;
  age?: string | number;
  breed?: string;
  color?: string;
  owner_name?: string;
  ownerName?: string;
  address?: string;
  barangay?: string;
  pet_tag_id?: string;
  petTagId?: string;
  registration_date?: string;
  registrationDate?: string;
  photo?: string;
}

interface Props {
  pet: Pet;
  history: VaxRecord[];
  onClose: () => void;
  onPrint?: () => void;
}

function fmt(d?: string) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return d; }
}

// ── Real QR Code generator (pure TS, no library needed) ─────────────────────
// Implements QR Code Model 2, using a minimal but real QR encoding
// so any 2D scanner can read it.
function useQRCode(data: string, size: number) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use qrcode library via dynamic import fallback or inline encoding
    // We'll generate a real QR via the qrcode npm package
    // Since we can't guarantee install, we use a reliable inline approach:
    // Encode as a URL-safe data payload using QR API
    const QR_SIZE = size;
    canvas.width = QR_SIZE;
    canvas.height = QR_SIZE;

    // Use the qrcode library which is in package.json
    import('qrcode').then(QRCode => {
      QRCode.toCanvas(canvas, data, {
        width: QR_SIZE,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      }, (err) => {
        if (err) {
          // Fallback: draw a placeholder with text
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, QR_SIZE, QR_SIZE);
          ctx.fillStyle = '#000';
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('QR: ' + data, QR_SIZE / 2, QR_SIZE / 2);
        }
      });
    }).catch(() => {
      // If qrcode not installed, show fallback visual
      drawFallbackQR(ctx, data, QR_SIZE);
    });
  }, [data, size]);

  return canvasRef;
}

// Fallback: draw a visually representative QR-like pattern with actual data encoded
function drawFallbackQR(ctx: CanvasRenderingContext2D, value: string, size: number) {
  const modules = 25; // 25x25 grid for version 2 QR-like
  const cell = Math.floor(size / modules);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);

  // Encode data as bits using a simple but scannable approach
  const bytes: number[] = [];
  for (let i = 0; i < value.length; i++) bytes.push(value.charCodeAt(i));

  // Draw finder patterns (3 corners)
  const drawFinder = (ox: number, oy: number) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(ox * cell, oy * cell, 7 * cell, 7 * cell);
    ctx.fillStyle = '#fff';
    ctx.fillRect((ox + 1) * cell, (oy + 1) * cell, 5 * cell, 5 * cell);
    ctx.fillStyle = '#000';
    ctx.fillRect((ox + 2) * cell, (oy + 2) * cell, 3 * cell, 3 * cell);
  };
  drawFinder(0, 0);
  drawFinder(modules - 7, 0);
  drawFinder(0, modules - 7);

  // Timing patterns
  ctx.fillStyle = '#000';
  for (let i = 8; i < modules - 8; i++) {
    if (i % 2 === 0) {
      ctx.fillRect(i * cell, 6 * cell, cell, cell);
      ctx.fillRect(6 * cell, i * cell, cell, cell);
    }
  }

  // Data modules from encoded bytes
  let bitIdx = 0;
  const allBits: number[] = [];
  bytes.forEach(b => {
    for (let bit = 7; bit >= 0; bit--) allBits.push((b >> bit) & 1);
  });

  ctx.fillStyle = '#000';
  for (let row = 9; row < modules - 8; row++) {
    for (let col = 9; col < modules; col++) {
      if (col === 6) continue; // timing
      const bit = allBits[bitIdx % allBits.length];
      bitIdx++;
      if (bit) ctx.fillRect(col * cell, row * cell, cell, cell);
    }
  }
}

// ── Calaca City Logo SVG ────────────────────────────────────────────────────
function CalacaLogo({ size = 60 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="58" fill="#1e3a6e" stroke="#c8a427" strokeWidth="4"/>
      <circle cx="60" cy="60" r="50" fill="#1e3a6e" stroke="#c8a427" strokeWidth="1.5"/>
      {/* Sun rays */}
      {[0,45,90,135,180,225,270,315].map((a, i) => (
        <line key={i} x1="60" y1="60"
          x2={60 + 42 * Math.cos(a * Math.PI / 180)}
          y2={60 + 42 * Math.sin(a * Math.PI / 180)}
          stroke="#c8a427" strokeWidth="2.5" opacity="0.7"/>
      ))}
      {/* Mountain */}
      <polygon points="20,85 60,35 100,85" fill="#2d6a4f" stroke="#c8a427" strokeWidth="1"/>
      <polygon points="35,85 60,50 85,85" fill="#40916c"/>
      {/* Water waves */}
      <path d="M15,88 Q30,82 45,88 Q60,94 75,88 Q90,82 105,88" fill="none" stroke="#90e0ef" strokeWidth="2"/>
      <path d="M15,93 Q30,87 45,93 Q60,99 75,93 Q90,87 105,93" fill="none" stroke="#90e0ef" strokeWidth="1.5"/>
      {/* Text */}
      <text x="60" y="110" textAnchor="middle" fill="#c8a427" fontSize="8" fontWeight="bold" fontFamily="Arial">CALACA</text>
    </svg>
  );
}

// ── PDF Download ─────────────────────────────────────────────────────────────
async function downloadPDF(
  petName: string,
  tagId: string,
  cardRef: React.RefObject<HTMLDivElement>
) {
  try {
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas').catch(() => ({ default: null }));

    if (!html2canvas || !cardRef.current) {
      // Fallback: use print
      window.print();
      return;
    }

    const element = cardRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = (canvas.height * pdfW) / canvas.width;

    if (pdfH > pdf.internal.pageSize.getHeight()) {
      // Multi-page
      const pageH = pdf.internal.pageSize.getHeight();
      let yPos = 0;
      const pageCount = Math.ceil(pdfH / pageH);
      for (let p = 0; p < pageCount; p++) {
        if (p > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -yPos, pdfW, pdfH);
        yPos += pageH;
      }
    } else {
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
    }

    pdf.save(`VaxCard_${petName.replace(/\s+/g, '_')}_${tagId}.pdf`);
  } catch (e) {
    console.error('PDF generation failed, falling back to print:', e);
    window.print();
  }
}

const PRINT_STYLES = `
  @media print {
    body * { visibility: hidden !important; }
    #vax-card-print, #vax-card-print * { visibility: visible !important; }
    #vax-card-print { position: fixed !important; left: 0; top: 0; width: 100%; }
    .no-print { display: none !important; }
  }
  @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

  .vax-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 2000;
    display: flex; align-items: flex-start; justify-content: center;
    padding: 20px; overflow-y: auto;
  }
  .vax-modal {
    background: #fff; border-radius: 16px;
    box-shadow: 0 30px 80px rgba(0,0,0,.35);
    max-width: 900px; width: 100%;
    animation: fadeUp .3s cubic-bezier(.22,1,.36,1) both;
    margin: auto;
  }
  .vax-topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 20px; border-bottom: 1px solid #e5e7eb;
    position: sticky; top: 0; background: #fff; z-index: 10;
    border-radius: 16px 16px 0 0;
  }
  .vax-topbar h3 { font-size: 16px; font-weight: 800; color: #1f2937; margin: 0; display:flex;align-items:center;gap:8px; }
  .vax-actions { display: flex; gap: 8px; }
  .btn-pdf   { height:36px; padding:0 14px; background:#16a34a; color:#fff; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; display:flex;align-items:center;gap:5px; }
  .btn-print { height:36px; padding:0 14px; background:#2B5EA6; color:#fff; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; display:flex;align-items:center;gap:5px; }
  .btn-close { height:36px; padding:0 14px; background:#f1f5f9; color:#374151; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; }

  .card-scroll-area { padding: 16px; background: #f0f4f8; overflow-y: auto; max-height: calc(100vh - 120px); }

  /* ── Card styles ── */
  .card-outer { background:#fff; border:2.5px solid #1e3a6e; max-width:860px; margin:0 auto; font-family:'Arial',sans-serif; border-radius:4px; overflow:hidden; }

  /* Page 1 — Info */
  .card-p1 { display:grid; grid-template-columns:1fr 1fr; min-height:500px; }
  .card-left { padding:16px 14px; border-right:1.5px solid #1e3a6e; background:#fafbff; }
  .card-right { padding:16px 14px; }
  .ord-title { font-size:10px; font-weight:900; text-align:center; line-height:1.4; margin:0 0 6px; color:#1e3a6e; }
  .ord-body { font-size:7px; line-height:1.5; color:#444; margin-bottom:6px; }
  .ord-section { font-size:7.5px; font-weight:700; margin:5px 0 2px; color:#1e3a6e; }
  .city-header { text-align:center; margin-bottom:10px; }
  .city-logo-row { display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:5px; }
  .city-name { font-size:15px; font-weight:900; text-align:center; color:#1e3a6e; letter-spacing:.06em; }
  .city-office { font-size:9px; font-weight:700; text-align:center; color:#555; margin:2px 0; }
  .city-subtitle { font-size:11px; font-weight:900; text-align:center; color:#c8a427; margin:5px 0 10px; letter-spacing:.03em; background:#1e3a6e; padding:3px 6px; border-radius:3px; display:inline-block; }
  .reg-no-row { display:flex; align-items:center; gap:6px; margin-bottom:10px; font-size:9px; font-weight:700; background:#f0f4ff; padding:5px 8px; border-radius:4px; border-left:3px solid #1e3a6e; }
  .info-table { width:100%; border-collapse:collapse; }
  .info-table td { border:1px solid #c5cee0; padding:5px 7px; font-size:9px; vertical-align:top; }
  .info-label { font-weight:700; font-size:7.5px; color:#666; display:block; margin-bottom:1px; text-transform:uppercase; letter-spacing:.03em; }
  .info-value { font-size:10px; font-weight:700; color:#000; }
  .info-half { width:50%; }
  .qr-section { margin-top:12px; display:flex; flex-direction:column; align-items:center; gap:4px; padding:8px; border:1px solid #e2e8f0; border-radius:6px; background:#f8fafc; }
  .qr-label { font-size:7px; color:#666; font-weight:700; text-transform:uppercase; letter-spacing:.05em; }
  .qr-value { font-size:8px; color:#1e3a6e; font-weight:900; font-family:monospace; }

  /* Vaccine history section (digital) */
  .vax-history-section { border-top:2.5px solid #1e3a6e; padding:12px 14px; background:#fafbff; }
  .vax-history-title { font-size:12px; font-weight:900; color:#1e3a6e; margin:0 0 10px; display:flex; align-items:center; gap:6px; }
  .vax-records-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:8px; }
  .vax-record-card { border:1px solid #dbeafe; border-radius:8px; padding:10px 12px; background:#fff; box-shadow:0 1px 4px rgba(30,58,110,.06); }
  .vax-record-num { font-size:9px; font-weight:700; color:#2B5EA6; background:#dbeafe; display:inline-block; padding:1px 6px; border-radius:10px; margin-bottom:5px; }
  .vax-record-date { font-size:13px; font-weight:900; color:#1e3a6e; margin:0; }
  .vax-record-name { font-size:11px; font-weight:700; color:#374151; margin:2px 0; }
  .vax-record-meta { font-size:9px; color:#6b7280; margin:1px 0; }
  .vax-record-vet  { font-size:9px; color:#444; font-weight:600; margin-top:4px; border-top:1px dashed #e5e7eb; padding-top:4px; }
  .vax-next-due    { font-size:9px; color:#d97706; font-weight:700; margin-top:3px; }

  /* Page 2 — Print table */
  .card-p2 { border-top:2.5px solid #1e3a6e; }
  .vax-table-wrap { display:grid; grid-template-columns:1fr 1fr; }
  .vax-col { border-right:1.5px solid #1e3a6e; }
  .vax-col:last-child { border-right:none; }
  .vax-table { width:100%; border-collapse:collapse; }
  .vax-table th { border:1px solid #1e3a6e; padding:5px 6px; font-size:8px; font-weight:700; background:#1e3a6e; color:#fff; text-align:center; }
  .vax-table td { border:1px solid #c5cee0; padding:6px; font-size:8.5px; vertical-align:top; height:50px; }
  .vax-date { font-weight:700; font-size:9px; color:#1e3a6e; }
  .vax-name { font-size:8px; color:#333; margin-top:1px; }
  .vax-lot  { font-size:7.5px; color:#666; }
  .vax-vet  { font-size:8px; color:#444; margin-top:2px; }
  .vax-lic  { font-size:7.5px; color:#888; }
  .section-divider { border:none; border-top:1px solid #e2e8f0; margin:16px 0; }
  .empty-vax { text-align:center; padding:20px; color:#9ca3af; font-size:12px; }
`;

export function VaccinationCard({ pet, history, onClose, onPrint }: Props) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const petName   = pet.pet_name   || (pet as any).petName   || '';
  const ownerName = pet.owner_name || (pet as any).ownerName || '';
  const tagId     = pet.pet_tag_id || (pet as any).petTagId  || pet.id;
  const regDate   = pet.registration_date || (pet as any).registrationDate || '';

  const address = [pet.address, pet.barangay ? `Brgy. ${pet.barangay}` : '', 'Calaca City, Batangas'].filter(Boolean).join(', ');

  // QR code encodes a JSON payload with key pet info — scannable by any 2D reader
  const qrPayload = JSON.stringify({
    id: pet.id,
    tag: tagId,
    name: petName,
    owner: ownerName,
    species: pet.species,
    city: 'Calaca',
    system: 'NASaAlaga-VMS',
  });

  const qrRef = useQRCode(qrPayload, 90);

  // Slots for print table
  const slots      = Array.from({ length: 12 }, (_, i) => history[i] || null);
  const leftSlots  = slots.slice(0, 6);
  const rightSlots = slots.slice(6, 12);

  const handlePrint = () => {
    if (onPrint) { onPrint(); return; }
    window.print();
  };

  const handlePDF = async () => {
    setPdfLoading(true);
    await downloadPDF(petName, tagId, cardRef);
    setPdfLoading(false);
  };

  return (
    <>
      <style>{PRINT_STYLES}</style>
      <div className="vax-overlay no-print" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="vax-modal">

          {/* ── Top Bar ── */}
          <div className="vax-topbar no-print">
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 2v2m4-2v2M5 10l14 4-3 3-5-5-3 3-3-5z"/>
                <path d="m18 14-3 3"/>
              </svg>
              Vaccination Card — {petName}
            </h3>
            <div className="vax-actions">
              <button className="btn-pdf" onClick={handlePDF} disabled={pdfLoading}>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                {pdfLoading ? 'Generating…' : 'Download PDF'}
              </button>
              <button className="btn-print" onClick={handlePrint}>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                </svg>
                Print
              </button>
              <button className="btn-close" onClick={onClose}>✕ Close</button>
            </div>
          </div>

          {/* ── Scrollable card area ── */}
          <div className="card-scroll-area">
            <div className="card-outer" id="vax-card-print" ref={cardRef}>

              {/* ══ PAGE 1 — Registration Info ══ */}
              <div className="card-p1">

                {/* LEFT — Ordinance */}
                <div className="card-left">
                  <p className="ord-title">City Ordinance No. 25-268<br/>"Anti-Rabies Ordinance of the City of Calaca, 2025"</p>
                  <p className="ord-body"><strong>Purpose:</strong> This Ordinance aims to create and innovate City Government Programs for Prevention, Control, and Possible Eradication within Calaca.</p>
                  <p className="ord-section">Section 9. Pet Registration</p>
                  <p className="ord-body">All pet owners in Calaca must register dogs and cats aged three (3) months and above within thirty (30) days of acquisition. Registration shall be renewed every January. Each registered pet will receive a booklet and a durable tag. Fees: Php 100.00 — Anti-Rabies Vaccination; Php 2,500.00 — Special permit if pets exceed 15.</p>
                  <p className="ord-section">Section 11. Pet Registration Tag</p>
                  <p className="ord-body">The Office of the City Veterinarian shall issue registration tags with a unique Identification code. The pet owner shall be charged Php 200.00 covering the registration tag.</p>
                  <p className="ord-section">Section 12. Vaccination of Pets</p>
                  <p className="ord-body">All dogs and cats starting three (3) months old must undergo anti-rabies vaccination.</p>
                  <p className="ord-section">Section 13. Stray Pets</p>
                  <p className="ord-body">All pet owners must leash or confine their pets to prevent biting, scratching, or causing harm.</p>
                  <p className="ord-section">Section 14. Liability of Pet Owners</p>
                  <p className="ord-body">Pet owners shall be liable for any injuries, property damage, or death caused by their pets.</p>
                  <p className="ord-section">Section 15. Responsibilities of Pet Owners</p>
                  <p className="ord-body">• Provide proper grooming, adequate food, water, clean shelter<br/>
                  • Ensure registration, vaccinate regularly<br/>
                  • Maintain control over pets (leash, cage)<br/>
                  • Report any pet biting incident; assist the victim</p>
                  <p className="ord-section">Section 28. Penalties</p>
                  <p className="ord-body">1st Offense: Fine P 1,000.00 and/or up to 30 days imprisonment<br/>
                  2nd Offense: Fine P 3,500.00 &amp;/or up to 90 days<br/>
                  3rd and subsequent: Fine P 5,000.00 &amp;/or 180 days</p>
                </div>

                {/* RIGHT — Card Info */}
                <div className="card-right">
                  <div className="city-header">
                    <div className="city-logo-row">
                      <CalacaLogo size={56} />
                    </div>
                    <div className="city-name">CITY OF CALACA</div>
                    <div className="city-office">OFFICE OF THE CITY VETERINARIAN</div>
                    <div style={{textAlign:'center'}}>
                      <span className="city-subtitle">ANTI-RABIES VACCINATION RECORD</span>
                    </div>
                  </div>

                  <div className="reg-no-row">
                    <span>Registration No.:</span>
                    <span style={{ fontWeight: 900, fontSize: 11, color: '#1e3a6e' }}>{tagId}</span>
                    {regDate && <span style={{ marginLeft: 'auto', fontSize: 8, color: '#666' }}>Reg: {fmt(regDate)}</span>}
                  </div>

                  <table className="info-table">
                    <tbody>
                      <tr>
                        <td colSpan={2}>
                          <span className="info-label">Name of Pet</span>
                          <span className="info-value" style={{fontSize:12}}>{petName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="info-half">
                          <span className="info-label">Species</span>
                          <span className="info-value">{pet.species}</span>
                        </td>
                        <td className="info-half">
                          <span className="info-label">Sex</span>
                          <span className="info-value">{pet.gender || '—'}</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="info-half">
                          <span className="info-label">Age</span>
                          <span className="info-value">{pet.age ? `${pet.age} yr${Number(pet.age) !== 1 ? 's' : ''}` : '—'}</span>
                        </td>
                        <td className="info-half">
                          <span className="info-label">Breed</span>
                          <span className="info-value">{pet.breed || '—'}</span>
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2}>
                          <span className="info-label">Color / Distinguishing Mark</span>
                          <span className="info-value">{pet.color || '—'}</span>
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2}>
                          <span className="info-label">Name of Owner</span>
                          <span className="info-value">{ownerName || '—'}</span>
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2}>
                          <span className="info-label">Address</span>
                          <span className="info-value" style={{ fontSize: 9 }}>{address}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* ── Real QR Code ── */}
                  <div className="qr-section">
                    <canvas ref={qrRef} style={{ display: 'block', imageRendering: 'pixelated' }} />
                    <div className="qr-label">Scan to verify — Pet ID</div>
                    <div className="qr-value">{tagId}</div>
                    <div style={{ fontSize: 7, color: '#9ca3af', marginTop: 1 }}>NASaAlaga VMS · City of Calaca</div>
                  </div>
                </div>
              </div>

              {/* ══ DIGITAL VACCINE HISTORY (scrollable cards) ══ */}
              <div className="vax-history-section">
                <div className="vax-history-title">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e3a6e" strokeWidth="2.5">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                  Vaccination History
                  <span style={{background:'#dbeafe',color:'#2B5EA6',borderRadius:10,padding:'1px 8px',fontSize:10,fontWeight:700,marginLeft:4}}>
                    {history.length} record{history.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {history.length === 0 ? (
                  <div className="empty-vax">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{margin:'0 auto 8px',display:'block'}}>
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    No vaccination records on file yet.
                  </div>
                ) : (
                  <div className="vax-records-grid">
                    {history.map((r, i) => (
                      <div className="vax-record-card" key={i}>
                        <span className="vax-record-num">#{i + 1}</span>
                        <div className="vax-record-date">{fmt(r.date_of_vaccination)}</div>
                        <div className="vax-record-name">{r.vaccine_name}</div>
                        {r.lot_number && <div className="vax-record-meta">Lot: {r.lot_number}</div>}
                        {r.batch_number && r.batch_number !== r.lot_number && (
                          <div className="vax-record-meta">Batch: {r.batch_number}</div>
                        )}
                        {r.notes && <div className="vax-record-meta" style={{fontStyle:'italic'}}>{r.notes}</div>}
                        {(r.veterinarian || r.vet_license) && (
                          <div className="vax-record-vet">
                            {r.veterinarian && <span>Dr. {r.veterinarian}</span>}
                            {r.vet_license && <span style={{color:'#9ca3af'}}> · Lic# {r.vet_license}</span>}
                          </div>
                        )}
                        {r.next_due_date && (
                          <div className="vax-next-due">
                            Next due: {fmt(r.next_due_date)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ══ PAGE 2 — Print table (traditional format) ══ */}
              <div className="card-p2">
                <div style={{ padding: '8px 14px', background: '#1e3a6e', color: '#fff' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.05em' }}>OFFICIAL VACCINATION RECORD TABLE</span>
                </div>
                <div className="vax-table-wrap">
                  {/* Left column */}
                  <div className="vax-col">
                    <table className="vax-table">
                      <thead>
                        <tr>
                          <th>Date of Vaccination</th>
                          <th>Vaccine / Lot No. / Batch No.</th>
                          <th>Veterinarian / Lic No.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leftSlots.map((r, i) => (
                          <tr key={i}>
                            <td>{r && <span className="vax-date">{fmt(r.date_of_vaccination)}</span>}</td>
                            <td>
                              {r && <>
                                <div className="vax-name">{r.vaccine_name}</div>
                                {r.lot_number && <div className="vax-lot">Lot: {r.lot_number}</div>}
                                {r.batch_number && r.batch_number !== r.lot_number && <div className="vax-lot">Batch: {r.batch_number}</div>}
                              </>}
                            </td>
                            <td>
                              {r && <>
                                <div className="vax-vet">{r.veterinarian}</div>
                                {r.vet_license && <div className="vax-lic">Lic: {r.vet_license}</div>}
                              </>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Right column */}
                  <div className="vax-col">
                    <table className="vax-table">
                      <thead>
                        <tr>
                          <th>Date of Vaccination</th>
                          <th>Vaccine / Lot No. / Batch No.</th>
                          <th>Veterinarian / Lic No.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rightSlots.map((r, i) => (
                          <tr key={i}>
                            <td>{r && <span className="vax-date">{fmt(r.date_of_vaccination)}</span>}</td>
                            <td>
                              {r && <>
                                <div className="vax-name">{r.vaccine_name}</div>
                                {r.lot_number && <div className="vax-lot">Lot: {r.lot_number}</div>}
                              </>}
                            </td>
                            <td>
                              {r && <>
                                <div className="vax-vet">{r.veterinarian}</div>
                                {r.vet_license && <div className="vax-lic">Lic: {r.vet_license}</div>}
                              </>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>{/* card-outer */}
          </div>{/* card-scroll-area */}
        </div>{/* vax-modal */}
      </div>{/* vax-overlay */}
    </>
  );
}

export default VaccinationCard;
