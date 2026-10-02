import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ShieldCheck, ScrollText, ChevronDown } from 'lucide-react';

/**
 * Data Privacy Notice gate.
 *
 * Shown after EVERY sign-in (staff, owners, BAHW, City Health, guests) and blocks the dashboard until the
 * user accepts. Declining signs the user out.
 *
 * Acceptance is remembered only for the current session: it is stored in sessionStorage against the
 * session's token (guests: a fixed marker), so a new login always produces a new notice, while a page
 * refresh inside the same session does not nag again. Login.tsx and endSession() clear it as well.
 */

// Bump when the notice text changes materially (it is written to the audit log with each acceptance).
export const PRIVACY_NOTICE_VERSION = '2026-10-02';
export const PRIVACY_ACK_KEY = 'nasaalaga_privacy_ack';

// TODO(before go-live): replace with the office's actual Data Protection Officer details.
const DPO = {
  office: 'Data Protection Officer, Calaca City Veterinary Office',
  email: 'dpo@your-city-domain.gov.ph',
  address: 'Calaca City Veterinary Office, City Hall, Calaca City, Batangas',
};

function sessionMarker(): string {
  try {
    const token = sessionStorage.getItem('nasaalaga_token');
    return token ? `${PRIVACY_NOTICE_VERSION}:${token.slice(-24)}` : `${PRIVACY_NOTICE_VERSION}:guest`;
  } catch { return `${PRIVACY_NOTICE_VERSION}:guest`; }
}

export function hasAcceptedPrivacy(): boolean {
  try { return sessionStorage.getItem(PRIVACY_ACK_KEY) === sessionMarker(); } catch { return false; }
}

export function clearPrivacyAck() {
  try { sessionStorage.removeItem(PRIVACY_ACK_KEY); } catch { /* ignore */ }
}

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="text-[15px] font-bold text-gray-900 mb-2 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-[#2B5EA6]/10 text-[#2B5EA6] text-xs font-black flex items-center justify-center shrink-0">{n}</span>
        {title}
      </h3>
      <div className="text-[13.5px] leading-relaxed text-gray-600 space-y-2 pl-8">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1">
      {items.map(i => <li key={i}>{i}</li>)}
    </ul>
  );
}

interface Props {
  onAccept: () => void;
  onDecline: () => void;
}

export function DataPrivacyNotice({ onAccept, onDecline }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const checkEnd = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 24) setReachedEnd(true);
  };

  // If the notice happens to fit without scrolling (very tall screens), don't lock the checkbox.
  useEffect(() => { checkEnd(); }, []);

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center p-3 sm:p-6 bg-gradient-to-br from-[#1a3a6e] via-[#2B5EA6] to-[#60A85C]"
      role="dialog" aria-modal="true" aria-labelledby="privacy-title"
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden">
        <div className="h-1.5 w-full shrink-0" style={{ background: 'linear-gradient(90deg,#2B5EA6,#60A85C)' }} />

        {/* Header */}
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2B5EA6] to-[#60A85C] flex items-center justify-center shadow-lg shadow-[#2B5EA6]/30 shrink-0">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 id="privacy-title" className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">Data Privacy Notice</h2>
              <p className="text-xs text-gray-500 mt-0.5">NASaAlaga VMS · Calaca City Veterinary Office · Version {PRIVACY_NOTICE_VERSION}</p>
            </div>
          </div>
          <p className="text-[13px] text-gray-500 mt-3 flex items-start gap-2">
            <ScrollText className="w-4 h-4 mt-0.5 shrink-0 text-[#2B5EA6]" />
            Please read this notice in full. You must accept it before you can use the system.
          </p>
        </div>

        {/* Notice body */}
        <div ref={scrollRef} onScroll={checkEnd} className="flex-1 overflow-y-auto px-6 sm:px-8 py-5">
          <p className="text-[13.5px] leading-relaxed text-gray-600 mb-6">
            The Calaca City Veterinary Office (“CVO”, “we”, “us”) respects your right to privacy. This notice explains how
            the NASaAlaga Veterinary Management System (“NASaAlaga”) collects, uses, shares, stores and protects personal
            data, in accordance with <strong>Republic Act No. 10173, the Data Privacy Act of 2012</strong>, its Implementing
            Rules and Regulations, and the issuances of the National Privacy Commission (NPC). It applies to every user:
            administrators, CVO staff, Barangay Animal Health Workers (BAHW), City Health personnel, pet and livestock
            owners, and guests.
          </p>

          <Section n={1} title="Who is responsible for your data">
            <p>The CVO is the Personal Information Controller for the data processed in NASaAlaga. Questions and requests may be sent to our Data Protection Officer (see Section 11).</p>
          </Section>

          <Section n={2} title="What personal data we collect">
            <Bullets items={[
              'Identity and contact details: first, middle and last name, email address, mobile number, profile photo (optional).',
              'Account details: username, role, and a securely hashed password (we never store your password in readable form). One-time PINs (OTP) are used to verify your email or phone.',
              'Location and household details: barangay, complete address, and optional identifiers such as Temporary ID, CalacaZen ID and Household Number.',
              'Animal records you or the CVO register: pet and livestock profiles, ownership, vaccination and rabies records, treatment and consultation history, death and lost-and-found reports, biting incident reports, certificates and related photos.',
              'Feedback, complaints and messages you submit through the system.',
              'Technical and security data: IP address, login attempts, timestamps, and an audit log of actions performed in the system (for example creating, updating or deleting a record).',
              'Data stored on your device: to work in areas with weak signal, the app keeps a temporary offline session, cached records and a queue of unsent entries in your browser storage.',
            ]} />
            <p>Guests who continue without an account do not provide personal data, but may still view public information and are shown this notice for transparency.</p>
          </Section>

          <Section n={3} title="Why we process your data">
            <Bullets items={[
              'To create and secure your account and verify who you are.',
              'To register, identify and maintain records of pets and livestock and their owners.',
              'To schedule, record and monitor vaccination drives, rabies control, and animal health services.',
              'To investigate and respond to disease outbreaks, biting incidents, lost and found animals, and public-health concerns, including coordination with City Health.',
              'To plan resources, such as medicine and supply inventory, deployment and budgets, using summarized and analytical reports.',
              'To issue certificates and official reports, and to respond to feedback and complaints.',
              'To maintain system security, prevent misuse, keep audit trails, and perform backups.',
            ]} />
            <p>We process data on the basis of your consent, the CVO’s mandate and legal obligations as a local government office, and the protection of public health and safety, as allowed by the Data Privacy Act.</p>
          </Section>

          <Section n={4} title="Who can see your data">
            <p>Access is role-based and limited to what each user needs. Owners see their own records; BAHW see records within their assigned barangay; CVO staff and administrators see records needed to deliver services; City Health personnel see information relevant to public-health monitoring.</p>
            <p>We may disclose data to other government agencies when required by law or for public-health and animal-disease control. We do not sell personal data and do not use it for advertising. Service providers that host or support the system, such as cloud hosting, email and SMS/OTP delivery, process data only on our instructions and under appropriate safeguards.</p>
          </Section>

          <Section n={5} title="How long we keep your data">
            <p>Records are kept only as long as needed for the purposes above and as required by government records-retention rules. Account data is kept while your account is active. Audit logs and veterinary and public-health records may be retained longer where the law or the integrity of official records requires it. Data that is no longer needed is deleted, archived or anonymized.</p>
          </Section>

          <Section n={6} title="How we protect your data">
            <Bullets items={[
              'Passwords are hashed; sessions use signed tokens that expire, and idle sessions are signed out automatically.',
              'Role-based access control, additional verification for super administrators, and audit logging of system activity.',
              'Regular backups and restricted administrative access.',
              'Encrypted connections (HTTPS) between your device and the system.',
            ]} />
            <p><strong>Your part:</strong> keep your password private, sign out when finished, and avoid using shared or public devices to stay signed in. When you sign out explicitly, the offline session and cached data are removed from that device.</p>
          </Section>

          <Section n={7} title="Your rights as a data subject">
            <Bullets items={[
              'Be informed about how your data is processed.',
              'Access a copy of your personal data.',
              'Object to processing, or withdraw your consent, where processing is based on consent.',
              'Correct inaccurate or outdated data.',
              'Request suspension, blocking, removal or destruction of data, subject to legal and record-keeping limits.',
              'Data portability, where applicable.',
              'Be indemnified for damages caused by inaccurate, unlawfully obtained or unauthorized use of your data.',
              'Lodge a complaint with the National Privacy Commission (privacy.gov.ph).',
            ]} />
          </Section>

          <Section n={8} title="Data of other people and of minors">
            <p>If you enter information about another person (for example a household member, a pet’s co-owner or a reporter), you confirm that you are authorized to provide it. Accounts are intended for adults; data about minors should be provided only by a parent or legal guardian.</p>
          </Section>

          <Section n={9} title="Consent">
            <p>By ticking the box below and selecting <strong>“I Agree and Continue”</strong>, you confirm that you have read and understood this notice and you freely consent to the collection and processing of your personal data as described. Your acceptance, together with the notice version and the time, is recorded in the system’s audit log.</p>
            <p>If you do not agree, select <strong>“Decline”</strong>. You will be signed out and will not be able to use the system.</p>
          </Section>

          <Section n={10} title="Changes to this notice">
            <p>We may update this notice. Material changes are published here and you will be asked to read and accept the updated version.</p>
          </Section>

          <Section n={11} title="Contact us">
            <p>
              {DPO.office}<br />
              Email: {DPO.email}<br />
              {DPO.address}
            </p>
          </Section>

          <p className="text-[11px] text-gray-400 text-center pt-2 pb-1">— End of notice —</p>
        </div>

        {/* Footer / consent */}
        <div className="px-6 sm:px-8 py-4 border-t border-gray-100 bg-gray-50/70 shrink-0">
          {!reachedEnd && (
            <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5 mb-3">
              <ChevronDown className="w-4 h-4 animate-bounce" /> Scroll to the end of the notice to enable the agreement.
            </p>
          )}
          <label className={`flex items-start gap-3 text-[13px] leading-snug mb-4 ${reachedEnd ? 'text-gray-700 cursor-pointer' : 'text-gray-400 cursor-not-allowed'}`}>
            <input
              type="checkbox"
              className="mt-0.5 w-4 h-4 accent-[#2B5EA6] shrink-0"
              checked={agreed}
              disabled={!reachedEnd}
              onChange={e => setAgreed(e.target.checked)}
            />
            <span>I have read and understood the Data Privacy Notice, and I consent to the processing of my personal data as described.</span>
          </label>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <button
              onClick={onDecline}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              Decline &amp; Sign Out
            </button>
            <button
              onClick={onAccept}
              disabled={!agreed}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#2B5EA6] hover:bg-[#244f8c] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              I Agree and Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Records the acceptance for this session and (for signed-in users) in the audit log. */
export function recordPrivacyAcceptance() {
  try { sessionStorage.setItem(PRIVACY_ACK_KEY, sessionMarker()); } catch { /* ignore */ }

  // Guests have no token, so there is nothing to attach the audit entry to.
  if (!sessionStorage.getItem('nasaalaga_token')) return;
  fetch('/api/audit-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'Accepted Data Privacy Notice',
      resource: 'Data Privacy',
      details: { version: PRIVACY_NOTICE_VERSION, acceptedAt: new Date().toISOString() },
    }),
  }).catch(() => { /* never block the user on logging */ });
}
