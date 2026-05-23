import { useEffect, useRef } from 'react';

interface VaxRecord {
  date_of_vaccination: string;
  vaccine_name: string;
  lot_number?: string;
  batch_number?: string;
  veterinarian?: string;
  vet_license?: string;
}

interface Pet {
  id: string;
  // Accepts both snake_case (DB rows) and camelCase (mapped objects)
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
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return d; }
}

// Simple barcode renderer using CSS bars (Code 128 style visual)
function Barcode({ value, width = 180, height = 50 }: { value: string; width?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);

    // Generate pseudo-bars from char codes
    const chars = value.split('');
    const barWidth = Math.max(1, Math.floor((width - 20) / (chars.length * 8 + 4)));
    let x = 10;
    ctx.fillStyle = '#000';
    // Start bars
    for (let s = 0; s < 3; s++) { ctx.fillRect(x, 0, barWidth, height - 10); x += barWidth * 2; }
    // Data bars
    chars.forEach(c => {
      const code = c.charCodeAt(0);
      for (let b = 0; b < 7; b++) {
        if ((code >> b) & 1) ctx.fillRect(x, 0, barWidth, height - 10);
        x += barWidth + 1;
      }
      x += 1;
    });
    // Stop bars
    for (let s = 0; s < 3; s++) { ctx.fillRect(x, 0, barWidth, height - 10); x += barWidth * 2; }
    // Text below
    ctx.fillStyle = '#000';
    ctx.font = `${Math.max(8, Math.floor(height * 0.18))}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(value, width / 2, height);
  }, [value, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
}

const PRINT_STYLES = `
  @media print {
    body * { visibility: hidden !important; }
    #vax-card-print, #vax-card-print * { visibility: visible !important; }
    #vax-card-print { position: fixed !important; left: 0; top: 0; width: 100%; }
    .no-print { display: none !important; }
  }
  @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  .vax-overlay { position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:2000; display:flex; align-items:center; justify-content:center; padding:20px; overflow-y:auto; }
  .vax-modal  { background:#fff; border-radius:16px; box-shadow:0 30px 80px rgba(0,0,0,.3); max-width:860px; width:100%; animation:fadeUp .3s cubic-bezier(.22,1,.36,1) both; }
  .vax-topbar { display:flex; align-items:center; justify-content:space-between; padding:16px 24px; border-bottom:1px solid #e5e7eb; }
  .vax-topbar h3 { font-size:17px; font-weight:800; color:#1f2937; margin:0; }
  .vax-actions { display:flex; gap:10px; }
  .btn-print { height:38px; padding:0 16px; background:#2B5EA6; color:#fff; border:none; border-radius:9px; font-size:13px; font-weight:700; cursor:pointer; }
  .btn-close  { height:38px; padding:0 16px; background:#f1f5f9; color:#374151; border:none; border-radius:9px; font-size:13px; font-weight:700; cursor:pointer; }
  /* Card styles */
  .card-wrap { padding:20px; background:#f8fafc; }
  .card-outer { background:#fff; border:2px solid #000; max-width:820px; margin:0 auto; font-family:'Arial',sans-serif; }
  /* Page 1 */
  .card-p1 { display:grid; grid-template-columns:1fr 1fr; min-height:480px; }
  .card-left { padding:20px 18px; border-right:1.5px solid #000; }
  .card-right { padding:16px 18px; }
  .ord-title { font-size:11px; font-weight:900; text-align:center; line-height:1.4; margin:0 0 6px; }
  .ord-body { font-size:7.5px; line-height:1.5; color:#333; margin-bottom:8px; }
  .ord-section { font-size:8px; font-weight:700; margin:6px 0 3px; }
  .city-header { text-align:center; margin-bottom:12px; }
  .city-logo-row { display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:6px; }
  .city-logo { width:54px; height:54px; border-radius:50%; border:2px solid #1e3a6e; display:flex; align-items:center; justify-content:center; font-size:8px; font-weight:900; color:#1e3a6e; background:#e8f0fb; text-align:center; line-height:1.2; }
  .city-name { font-size:13px; font-weight:900; text-align:center; color:#1e3a6e; letter-spacing:.05em; }
  .city-office { font-size:9px; font-weight:700; text-align:center; color:#444; margin:1px 0; }
  .city-subtitle { font-size:10px; font-weight:900; text-align:center; color:#1e3a6e; margin:6px 0 12px; letter-spacing:.03em; }
  .reg-no-row { display:flex; align-items:center; gap:6px; margin-bottom:12px; font-size:9px; font-weight:700; }
  .reg-no-line { flex:1; border-bottom:1.5px solid #000; }
  .info-table { width:100%; border-collapse:collapse; }
  .info-table td { border:1.5px solid #000; padding:6px 8px; font-size:9px; vertical-align:top; }
  .info-label { font-weight:700; font-size:8px; color:#555; display:block; margin-bottom:2px; }
  .info-value { font-size:10px; font-weight:700; color:#000; }
  .info-half { width:50%; }
  .info-full { width:100%; }
  .barcode-row { margin-top:10px; display:flex; flex-direction:column; align-items:flex-end; }
  /* Page 2 */
  .card-p2 { border-top:2.5px solid #000; }
  .vax-table-wrap { display:grid; grid-template-columns:1fr 1fr; }
  .vax-col { border-right:1.5px solid #000; }
  .vax-col:last-child { border-right:none; }
  .vax-table { width:100%; border-collapse:collapse; }
  .vax-table th { border:1px solid #000; padding:5px 6px; font-size:8px; font-weight:700; background:#f0f4ff; text-align:center; }
  .vax-table td { border:1px solid #000; padding:8px 6px; font-size:8.5px; vertical-align:top; height:52px; }
  .vax-table td .vax-date { font-weight:700; font-size:9px; color:#1e3a6e; }
  .vax-table td .vax-name { font-size:8px; color:#333; margin-top:1px; }
  .vax-table td .vax-lot  { font-size:7.5px; color:#666; }
  .vax-table td .vax-vet  { font-size:8px; color:#444; margin-top:2px; }
  .vax-table td .vax-lic  { font-size:7.5px; color:#888; }
`;

export function VaccinationCard({ pet, history, onClose, onPrint }: Props) {
  const handlePrint = () => {
    if (onPrint) { onPrint(); return; }
    window.print();
  };

  // Normalize: accept both snake_case (DB) and camelCase (mapped) pet objects
  const petName   = pet.pet_name || (pet as any).petName || '';
  const ownerName = pet.owner_name || (pet as any).ownerName || '';
  const tagId     = pet.pet_tag_id || (pet as any).petTagId || pet.id;
  const regDate   = pet.registration_date || (pet as any).registrationDate || '';
  const petPhoto  = pet.photo || '';

  const address = [pet.address, pet.barangay ? `Brgy. ${pet.barangay}` : '', 'Calaca City, Batangas'].filter(Boolean).join(', ');
  const regNo   = tagId;

  // Split history into 2 columns of 6 rows each (12 total slots)
  const slots = Array.from({ length: 12 }, (_, i) => history[i] || null);
  const leftSlots  = slots.slice(0, 6);
  const rightSlots = slots.slice(6, 12);

  return (
    <>
      <style>{PRINT_STYLES}</style>
      <div className="vax-overlay no-print" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="vax-modal">
          <div className="vax-topbar no-print">
            <h3 style={{display:"flex",alignItems:"center",gap:6}}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 2v2m4-2v2M5 10l14 4-3 3-5-5-3 3-3-5z"/><path d="m18 14-3 3"/></svg>Anti-Rabies Vaccination Card — {petName}</h3>
            <div className="vax-actions">
              <button className="btn-print" onClick={handlePrint} style={{display:"flex",alignItems:"center",gap:6}}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>Print Card</button>
              <button className="btn-close"  onClick={onClose}>✕ Close</button>
            </div>
          </div>

          <div className="card-wrap" id="vax-card-print">
            <div className="card-outer">

              {/* ── PAGE 1 ── */}
              <div className="card-p1">

                {/* LEFT — Ordinance text */}
                <div className="card-left">
                  <p className="ord-title">City Ordinance No. 25-268<br/>
                    "Anti-Rabies Ordinance of the City of Calaca, 2025"
                  </p>
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

                {/* RIGHT — Card info */}
                <div className="card-right">
                  <div className="city-header">
                    <div className="city-logo-row">
                      <div className="city-logo"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg><br/>CALACA</div>
                    </div>
                    <div className="city-name">CITY OF CALACA</div>
                    <div className="city-office">OFFICE OF THE CITY VETERINARIAN</div>
                    <div className="city-subtitle">ANTI-RABIES VACCINATION RECORD</div>
                  </div>

                  <div className="reg-no-row">
                    <span>Registration No.:</span>
                    <span style={{ fontWeight: 900, fontSize: 10 }}>{regNo}</span>
                    <span className="reg-no-line" />
                  </div>

                  <table className="info-table">
                    <tbody>
                      <tr>
                        <td style={{ width: '100%' }} colSpan={2}>
                          <span className="info-label">Name of Pet</span>
                          <span className="info-value">{petName}</span>
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
                          <span className="info-value">{pet.age ? String(pet.age) : '—'}</span>
                        </td>
                        <td className="info-half">
                          <span className="info-label">Breed</span>
                          <span className="info-value">{pet.breed || '—'}</span>
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2}>
                          <span className="info-label">Distinguishing Mark / Color</span>
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

                  {/* Barcode bottom-right with pet ID */}
                  <div className="barcode-row">
                    <div style={{ marginTop: 12 }}>
                      <Barcode value={pet.id} width={160} height={44} />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── PAGE 2 — Vaccination records ── */}
              <div className="card-p2">
                <div className="vax-table-wrap">
                  {/* Left column */}
                  <div className="vax-col">
                    <table className="vax-table">
                      <thead>
                        <tr>
                          <th>Date of Vaccination</th>
                          <th>Vaccine Used / Lot No. / Batch No.</th>
                          <th>Veterinarian / Lic No.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leftSlots.map((r, i) => (
                          <tr key={i}>
                            <td>
                              {r && <span className="vax-date">{fmt(r.date_of_vaccination)}</span>}
                            </td>
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
                          <th>Vaccine Used / Lot No. / Batch No.</th>
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

            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default VaccinationCard;
