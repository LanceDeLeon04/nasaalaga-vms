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

// ── Real Code 128 1D Barcode ────────────────────────────────────────────────
// Implements Code 128B — encodes full ASCII, scannable by any 1D reader.
const CODE128_TABLE: Record<string, number> = {};
const CODE128_BARS: string[] = [
  '11011001100','11001101100','11001100110','10010011000','10010001100',
  '10001001100','10011001000','10011000100','10001100100','11001001000',
  '11001000100','11000100100','10110011100','10011011100','10011001110',
  '10111001100','10011101100','10011100110','11001110010','11001011100',
  '11001001110','11011100100','11001110100','11101101110','11101001100',
  '11100101100','11100100110','11101100100','11100110100','11100110010',
  '11011011000','11011000110','11000110110','10100011000','10001011000',
  '10001000110','10110001000','10001101000','10001100010','11010001000',
  '11000101000','11000100010','10110111000','10110001110','10001101110',
  '10111011000','10111000110','10001110110','11101110110','11010001110',
  '11000101110','11011101000','11011100010','11011101110','11101011000',
  '11101000110','11100010110','11101101000','11101100010','11100011010',
  '11101111010','11001000010','11110001010','10100110000','10100001100',
  '10010110000','10010000110','10000101100','10000100110','10110010000',
  '10110000100','10011010000','10011000010','10000110100','10000110010',
  '11000010010','11001010000','11110111010','11000010100','10001111010',
  '10100111100','10010111100','10010011110','10111100100','10011110100',
  '10011110010','11110100100','11110010100','11110010010','11011011110',
  '11011110110','11110110110','10101111000','10100011110','10001011110',
  '10111101000','10111100010','11110101000','11110100010','10111011110',
  '10111101110','11101011110','11110101110','11010000100','11010010000',
  '11010011100','1100011101011',
];
// Populate lookup: space=0, ! =1, ... ~ =94 for Code128B
for (let i = 0; i < 96; i++) {
  const char = i < 95 ? String.fromCharCode(i + 32) : 'FNC1';
  CODE128_TABLE[char] = i;
}
const CODE128B_START = 104;
const CODE128_STOP_BARS = '1100011101011';
const CODE128_QUIET_BARS = '0000000000';

function code128BEncode(text: string): string {
  let bars = CODE128_QUIET_BARS;
  bars += CODE128_BARS[CODE128B_START]; // start B
  let checksum = CODE128B_START;
  for (let i = 0; i < text.length; i++) {
    const idx = CODE128_TABLE[text[i]] ?? 0;
    checksum += idx * (i + 1);
    bars += CODE128_BARS[idx];
  }
  bars += CODE128_BARS[checksum % 103]; // check symbol
  bars += CODE128_STOP_BARS;
  bars += CODE128_QUIET_BARS;
  return bars;
}

function useBarcodeCanvas(text: string) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !text) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bars = code128BEncode(text);
    const barW = 2;   // px per bar module
    const height = 56; // bar height in px
    const totalW = bars.length * barW;

    canvas.width = totalW;
    canvas.height = height;
    ctx.clearRect(0, 0, totalW, height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, totalW, height);

    for (let i = 0; i < bars.length; i++) {
      if (bars[i] === '1') {
        ctx.fillStyle = '#000';
        ctx.fillRect(i * barW, 0, barW, height);
      }
    }
  }, [text]);

  return canvasRef;
}

// ── PDF Download ─────────────────────────────────────────────────────────────
async function downloadPDF(
  petName: string,
  tagId: string,
  cardRef: React.RefObject<HTMLDivElement>
) {
  try {
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas').catch(() => ({ default: null as any }));
    if (!html2canvas || !cardRef.current) { window.print(); return; }

    const element = cardRef.current;
    const canvas = await html2canvas(element, {
      scale: 2, useCORS: true, backgroundColor: '#ffffff',
      width: element.scrollWidth, height: element.scrollHeight,
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = (canvas.height * pdfW) / canvas.width;
    if (pdfH > pdf.internal.pageSize.getHeight()) {
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
    position: fixed; inset: 0; background: rgba(0,0,0,.65); z-index: 2000;
    display: flex; align-items: flex-start; justify-content: center;
    padding: 20px; overflow-y: auto;
  }
  .vax-modal {
    background: #fff; border-radius: 16px;
    box-shadow: 0 30px 80px rgba(0,0,0,.35);
    max-width: 960px; width: 100%;
    animation: fadeUp .3s cubic-bezier(.22,1,.36,1) both;
    margin: auto;
  }
  .vax-topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 20px; border-bottom: 1px solid #e5e7eb;
    position: sticky; top: 0; background: #fff; z-index: 10;
    border-radius: 16px 16px 0 0;
  }
  .vax-topbar h3 { font-size: 15px; font-weight: 800; color: #1f2937; margin: 0; display:flex;align-items:center;gap:8px; }
  .vax-actions { display: flex; gap: 8px; }
  .btn-pdf   { height:36px; padding:0 14px; background:#16a34a; color:#fff; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; display:flex;align-items:center;gap:5px; }
  .btn-print { height:36px; padding:0 14px; background:#2B5EA6; color:#fff; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; display:flex;align-items:center;gap:5px; }
  .btn-close { height:36px; padding:0 14px; background:#f1f5f9; color:#374151; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; }

  .card-scroll-area { padding: 20px; background: #e8edf5; overflow-y: auto; max-height: calc(100vh - 80px); }

  /* ══ Card outer shell ══ */
  .card-outer {
    background: #fff;
    border: 2.5px solid #1e3a6e;
    max-width: 860px;
    margin: 0 auto;
    font-family: 'Arial', sans-serif;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(30,58,110,.18);
  }

  /* ══ Page 1 — two-column layout ══ */
  .card-p1 { display: grid; grid-template-columns: 220px 1fr; min-height: 480px; }
  .card-left { padding: 16px 14px; border-right: 2px solid #1e3a6e; background: #f7f9ff; }
  .card-right { padding: 18px 18px 14px; }

  /* Ordinance column */
  .ord-title { font-size: 9.5px; font-weight: 900; text-align: center; line-height: 1.4; margin: 0 0 8px; color: #1e3a6e; }
  .ord-hr { border: none; border-top: 1.5px solid #c5cee0; margin: 6px 0; }
  .ord-body { font-size: 7px; line-height: 1.55; color: #444; margin-bottom: 4px; }
  .ord-section { font-size: 7.5px; font-weight: 800; margin: 6px 0 2px; color: #1e3a6e; text-transform: uppercase; letter-spacing: .03em; }

  /* Right header */
  .city-header { text-align: center; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1.5px solid #e2e8f0; }
  .city-logo-row { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 6px; }
  .city-seal-img { width: 58px; height: 58px; object-fit: contain; }
  .city-header-texts { text-align: center; }
  .city-republic { font-size: 8px; color: #666; letter-spacing: .08em; text-transform: uppercase; margin: 0; }
  .city-name { font-size: 15px; font-weight: 900; color: #1e3a6e; letter-spacing: .05em; margin: 1px 0; }
  .city-office { font-size: 9px; font-weight: 700; color: #555; margin: 0; }
  .city-subtitle-wrap { margin-top: 6px; }
  .city-subtitle {
    font-size: 11px; font-weight: 900; color: #c8a427;
    background: #1e3a6e; padding: 4px 12px; border-radius: 3px;
    display: inline-block; letter-spacing: .04em;
  }

  /* Registration info */
  .reg-no-row {
    display: flex; align-items: center; gap: 6px; margin-bottom: 10px;
    font-size: 9px; font-weight: 700; background: #f0f4ff; padding: 6px 10px;
    border-radius: 5px; border-left: 3px solid #1e3a6e;
  }
  .info-table { width: 100%; border-collapse: collapse; }
  .info-table td { border: 1px solid #c5cee0; padding: 5px 8px; font-size: 9px; vertical-align: top; }
  .info-label { font-weight: 700; font-size: 7px; color: #666; display: block; margin-bottom: 2px; text-transform: uppercase; letter-spacing: .04em; }
  .info-value { font-size: 10.5px; font-weight: 700; color: #111; }
  .info-half { width: 50%; }

  /* Barcode section */
  .barcode-section {
    margin-top: 14px; display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 10px; border: 1.5px solid #e2e8f0; border-radius: 6px; background: #fafbff;
  }
  .barcode-canvas { display: block; image-rendering: crisp-edges; max-width: 100%; }
  .barcode-id { font-size: 9px; color: #1e3a6e; font-weight: 900; font-family: 'Courier New', monospace; letter-spacing: .08em; margin-top: 2px; }
  .barcode-label { font-size: 6.5px; color: #9ca3af; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }

  /* ══ Digital vaccine history ══ */
  .vax-history-section { border-top: 2px solid #1e3a6e; padding: 14px 16px; background: #f7f9ff; }
  .vax-history-title { font-size: 12px; font-weight: 900; color: #1e3a6e; margin: 0 0 12px; display: flex; align-items: center; gap: 8px; }
  .vax-records-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 8px; }
  .vax-record-card { border: 1px solid #dbeafe; border-radius: 8px; padding: 10px 12px; background: #fff; box-shadow: 0 1px 4px rgba(30,58,110,.06); }
  .vax-record-num { font-size: 9px; font-weight: 700; color: #2B5EA6; background: #dbeafe; display: inline-block; padding: 1px 7px; border-radius: 10px; margin-bottom: 5px; }
  .vax-record-date { font-size: 13px; font-weight: 900; color: #1e3a6e; margin: 0; }
  .vax-record-name { font-size: 11px; font-weight: 700; color: #374151; margin: 2px 0; }
  .vax-record-meta { font-size: 9px; color: #6b7280; margin: 1px 0; }
  .vax-record-vet  { font-size: 9px; color: #444; font-weight: 600; margin-top: 4px; border-top: 1px dashed #e5e7eb; padding-top: 4px; }
  .vax-next-due    { font-size: 9px; color: #d97706; font-weight: 700; margin-top: 3px; }
  .empty-vax { text-align: center; padding: 24px; color: #9ca3af; font-size: 13px; }

  /* ══ Page 2 — print table ══ */
  .card-p2 { border-top: 2px solid #1e3a6e; }
  .card-p2-header { padding: 8px 16px; background: #1e3a6e; display: flex; align-items: center; gap: 10px; }
  .card-p2-header span { font-size: 10px; font-weight: 700; color: #fff; letter-spacing: .06em; text-transform: uppercase; }
  .vax-table-wrap { display: grid; grid-template-columns: 1fr 1fr; }
  .vax-col { border-right: 1.5px solid #1e3a6e; }
  .vax-col:last-child { border-right: none; }
  .vax-table { width: 100%; border-collapse: collapse; }
  .vax-table th { border: 1px solid #1e3a6e; padding: 5px 6px; font-size: 8px; font-weight: 700; background: #2B5EA6; color: #fff; text-align: center; }
  .vax-table td { border: 1px solid #c5cee0; padding: 6px 7px; font-size: 8.5px; vertical-align: top; height: 48px; }
  .vax-date { font-weight: 700; font-size: 9px; color: #1e3a6e; }
  .vax-name { font-size: 8px; color: #333; margin-top: 1px; }
  .vax-lot  { font-size: 7.5px; color: #666; }
  .vax-vet  { font-size: 8px; color: #444; margin-top: 2px; }
  .vax-lic  { font-size: 7.5px; color: #888; }

  /* ══ Card footer ══ */
  .card-footer {
    background: #1e3a6e; padding: 6px 16px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .card-footer span { font-size: 7.5px; color: rgba(255,255,255,.7); }
  .card-footer strong { color: #c8a427; }
`;

export function VaccinationCard({ pet, history, onClose, onPrint }: Props) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const petName   = pet.pet_name   || (pet as any).petName   || '';
  const ownerName = pet.owner_name || (pet as any).ownerName || '';
  const tagId     = pet.pet_tag_id || (pet as any).petTagId  || pet.id;
  const regDate   = pet.registration_date || (pet as any).registrationDate || '';

  const address = [pet.address, pet.barangay ? `Brgy. ${pet.barangay}` : '', 'Calaca City, Batangas']
    .filter(Boolean).join(', ');

  // 1D barcode on the tag ID
  const barcodeRef = useBarcodeCanvas(tagId);

  const slots      = Array.from({ length: 12 }, (_, i) => history[i] || null);
  const leftSlots  = slots.slice(0, 6);
  const rightSlots = slots.slice(6, 12);

  const handlePrint = () => { if (onPrint) { onPrint(); return; } window.print(); };
  const handlePDF   = async () => { setPdfLoading(true); await downloadPDF(petName, tagId, cardRef); setPdfLoading(false); };

  return (
    <>
      <style>{PRINT_STYLES}</style>
      <div className="vax-overlay no-print" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="vax-modal">

          {/* ── Top Bar ── */}
          <div className="vax-topbar no-print">
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2B5EA6" strokeWidth="2">
                <path d="M10 2v2m4-2v2M5 10l14 4-3 3-5-5-3 3-3-5z"/><path d="m18 14-3 3"/>
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

                {/* LEFT — Ordinance text */}
                <div className="card-left">
                  <p className="ord-title">City Ordinance No. 25-268<br/>"Anti-Rabies Ordinance of Calaca, 2025"</p>
                  <hr className="ord-hr"/>
                  <p className="ord-section">Section 9. Pet Registration</p>
                  <p className="ord-body">All pet owners must register dogs and cats aged three (3) months and above within thirty (30) days of acquisition. Registration is renewed every January. Each pet receives a booklet and durable tag.<br/><strong>Fees:</strong> ₱100.00 Anti-Rabies Vaccination; ₱2,500.00 Special permit if pets exceed 15.</p>
                  <p className="ord-section">Section 11. Registration Tag</p>
                  <p className="ord-body">The City Veterinarian shall issue tags with a unique ID code. Fee: ₱200.00 covering the registration tag.</p>
                  <p className="ord-section">Section 12. Vaccination</p>
                  <p className="ord-body">All dogs and cats starting three (3) months old must undergo anti-rabies vaccination.</p>
                  <p className="ord-section">Section 13. Stray Pets</p>
                  <p className="ord-body">Owners must leash or confine pets to prevent biting, scratching, or causing harm.</p>
                  <p className="ord-section">Section 15. Owner Responsibilities</p>
                  <p className="ord-body">• Provide proper grooming, food, water, shelter<br/>
                  • Ensure registration and regular vaccination<br/>
                  • Maintain control (leash/cage)<br/>
                  • Report biting incidents; assist victim</p>
                  <p className="ord-section">Section 28. Penalties</p>
                  <p className="ord-body">1st Offense: ₱1,000 and/or ≤30 days imprisonment<br/>
                  2nd Offense: ₱3,500 and/or ≤90 days<br/>
                  3rd and subsequent: ₱5,000 and/or ≤180 days</p>
                </div>

                {/* RIGHT — Card Info */}
                <div className="card-right">
                  {/* Header with real city seal */}
                  <div className="city-header">
                    <div className="city-logo-row">
                      <img
                        src="/images/city-seal.png"
                        alt="Calaca City Seal"
                        className="city-seal-img"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="city-header-texts">
                        <p className="city-republic">Republic of the Philippines</p>
                        <p className="city-name">CITY OF CALACA</p>
                        <p className="city-office">Province of Batangas</p>
                        <p className="city-office">Office of the City Veterinarian</p>
                      </div>
                    </div>
                    <div className="city-subtitle-wrap">
                      <span className="city-subtitle">ANTI-RABIES VACCINATION RECORD</span>
                    </div>
                  </div>

                  {/* Registration number row */}
                  <div className="reg-no-row">
                    <span>Registration No.:</span>
                    <span style={{ fontWeight: 900, fontSize: 12, color: '#1e3a6e', fontFamily: 'monospace' }}>{tagId}</span>
                    {regDate && <span style={{ marginLeft: 'auto', fontSize: 8, color: '#888' }}>Reg: {fmt(regDate)}</span>}
                  </div>

                  {/* Pet info table */}
                  <table className="info-table">
                    <tbody>
                      <tr>
                        <td colSpan={2}>
                          <span className="info-label">Name of Pet</span>
                          <span className="info-value" style={{ fontSize: 13 }}>{petName}</span>
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

                  {/* ── Real Code 128 1D Barcode ── */}
                  <div className="barcode-section">
                    <canvas ref={barcodeRef} className="barcode-canvas" />
                    <div className="barcode-id">{tagId}</div>
                    <div className="barcode-label">Scan to verify · NASaAlaga VMS</div>
                  </div>
                </div>
              </div>

              {/* ══ DIGITAL VACCINE HISTORY ══ */}
              <div className="vax-history-section">
                <div className="vax-history-title">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e3a6e" strokeWidth="2.5">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                  Vaccination History
                  <span style={{ background: '#dbeafe', color: '#2B5EA6', borderRadius: 10, padding: '1px 9px', fontSize: 10, fontWeight: 700, marginLeft: 4 }}>
                    {history.length} record{history.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {history.length === 0 ? (
                  <div className="empty-vax">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ margin: '0 auto 8px', display: 'block' }}>
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
                        {r.notes && <div className="vax-record-meta" style={{ fontStyle: 'italic' }}>{r.notes}</div>}
                        {(r.veterinarian || r.vet_license) && (
                          <div className="vax-record-vet">
                            {r.veterinarian && <span>Dr. {r.veterinarian}</span>}
                            {r.vet_license && <span style={{ color: '#9ca3af' }}> · Lic# {r.vet_license}</span>}
                          </div>
                        )}
                        {r.next_due_date && (
                          <div className="vax-next-due">Next due: {fmt(r.next_due_date)}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ══ PAGE 2 — Official print table ══ */}
              <div className="card-p2">
                <div className="card-p2-header">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c8a427" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span>Official Vaccination Record Table</span>
                </div>
                <div className="vax-table-wrap">
                  {/* Left 6 slots */}
                  <div className="vax-col">
                    <table className="vax-table">
                      <thead>
                        <tr>
                          <th>Date of Vaccination</th>
                          <th>Vaccine / Lot / Batch</th>
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
                  {/* Right 6 slots */}
                  <div className="vax-col">
                    <table className="vax-table">
                      <thead>
                        <tr>
                          <th>Date of Vaccination</th>
                          <th>Vaccine / Lot / Batch</th>
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
                </div>
              </div>

              {/* ══ Card footer ══ */}
              <div className="card-footer">
                <span>Issued by: <strong>Office of the City Veterinarian</strong> · City of Calaca, Batangas</span>
                <span>NASaAlaga VMS · <strong>{tagId}</strong></span>
              </div>

            </div>{/* card-outer */}
          </div>{/* card-scroll-area */}
        </div>{/* vax-modal */}
      </div>{/* vax-overlay */}
    </>
  );
}

export default VaccinationCard;
