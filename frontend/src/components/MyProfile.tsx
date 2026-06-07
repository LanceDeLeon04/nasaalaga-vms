import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import type { User } from '../App';

interface MyProfileProps {
  user: User;
  onUserUpdate?: (updated: Partial<User>) => void;
}

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Administrator',
  admin: 'Administrator',
  bahw: 'Barangay Animal Health Worker',
  petOwner: 'Pet Owner',
  owner: 'Pet Owner',
  livestockManager: 'Livestock Manager',
  both: 'Pet Owner & Livestock Manager',
  guest: 'Guest',
  cityHealth: 'City Health Officer',
};

export function MyProfile({ user, onUserUpdate }: MyProfileProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'profile' | 'password'>('profile');
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [form, setForm] = useState({
    username: '',
    email: '',
    phone: '',
    barangay: '',
    address: '',
    calacazen_id: '',
    household_number: '',
    avatar: '',
  });
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.getMyProfile();
      setProfileData(data);
      setForm({
        username: data.username || '',
        email: data.email || '',
        phone: data.phone || '',
        barangay: data.barangay || '',
        address: data.address || '',
        calacazen_id: data.calacazen_id || '',
        household_number: data.household_number || '',
        avatar: data.avatar || '',
      });
      if (data.avatar) setAvatarPreview(data.avatar);
    } catch {
      // use user object as fallback
      setForm({
        username: user.username || '',
        email: user.email || '',
        phone: '',
        barangay: '',
        address: '',
        calacazen_id: '',
        household_number: '',
        avatar: '',
      });
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setAvatarPreview(base64);
      setForm(p => ({ ...p, avatar: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const updated = await api.updateMyProfile(form);
      toast.success('Profile updated successfully!');
      if (onUserUpdate) onUserUpdate({ username: form.username, email: form.email, avatar: form.avatar || undefined });
      setProfileData(updated);
      // Update sessionStorage so Header avatar refreshes immediately
      const stored = sessionStorage.getItem('nasaalaga_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.username = form.username;
          parsed.avatar = form.avatar || parsed.avatar;
          sessionStorage.setItem('nasaalaga_user', JSON.stringify(parsed));
          window.dispatchEvent(new Event('nasaalaga_profile_updated'));
        } catch {}
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.current) { toast.error('Enter your current password'); return; }
    if (pwForm.next.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (pwForm.next !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await api.changePassword({ currentPassword: pwForm.current, newPassword: pwForm.next });
      toast.success('Password changed successfully!');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = ROLE_LABELS[user.role || 'guest'] || user.role || 'User';
  const initials = (form.username || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const roleColor: Record<string, string> = {
    superadmin: '#7c3aed', admin: '#2B5EA6', bahw: '#0891b2',
    petOwner: '#16a34a', owner: '#16a34a', livestockManager: '#ea580c',
    both: '#0d9488', cityHealth: '#db2777', guest: '#6b7280',
  };
  const color = roleColor[user.role || 'guest'] || '#6b7280';

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px', fontFamily: 'inherit' }}>
      {/* Header card */}
      <div style={{
        background: `linear-gradient(135deg, ${color}18 0%, white 60%)`,
        border: `1.5px solid ${color}30`,
        borderRadius: 20,
        padding: '32px 36px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        flexWrap: 'wrap',
      }}>
        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: 96, height: 96, borderRadius: '50%',
              background: avatarPreview ? 'transparent' : color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', overflow: 'hidden',
              boxShadow: `0 0 0 4px white, 0 0 0 6px ${color}40`,
              position: 'relative',
            }}
          >
            {avatarPreview
              ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: 'white', fontSize: 32, fontWeight: 700 }}>{initials}</span>
            }
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity .2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
            >
              <svg width={24} height={24} fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx={12} cy={13} r={4} />
              </svg>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 28, height: 28, borderRadius: '50%',
              background: color, border: '2px solid white',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 12,
            }}
            title="Change photo"
          >
            <svg width={12} height={12} fill="none" stroke="white" strokeWidth={2.5} viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1f2937' }}>{form.username || user.username}</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>{form.email || user.email}</p>
          <span style={{
            display: 'inline-block', marginTop: 8,
            padding: '3px 12px', borderRadius: 99,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
            background: `${color}18`, color: color, border: `1px solid ${color}30`,
          }}>
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1.5px solid #e5e7eb' }}>
        {(['profile', 'password'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 20px', fontSize: 13, fontWeight: 600,
            background: 'none', border: 'none', cursor: 'pointer',
            color: tab === t ? color : '#6b7280',
            borderBottom: tab === t ? `2.5px solid ${color}` : '2.5px solid transparent',
            marginBottom: -1.5,
            transition: 'all .15s',
          }}>
            {t === 'profile' ? '👤 Profile Info' : '🔒 Change Password'}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e5e7eb', padding: '28px 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            {[
              { label: 'Display Name', key: 'username', placeholder: 'Your full name' },
              { label: 'Email Address', key: 'email', placeholder: 'your@email.com', type: 'email' },
              { label: 'Phone Number', key: 'phone', placeholder: '09XXXXXXXXX' },
              { label: 'Barangay', key: 'barangay', placeholder: 'Your barangay' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {f.label}
                </label>
                <input
                  type={f.type || 'text'}
                  value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: '1.5px solid #d1d5db', fontSize: 14, color: '#1f2937',
                    outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color .15s',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = color}
                  onBlur={e => e.currentTarget.style.borderColor = '#d1d5db'}
                />
              </div>
            ))}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Home Address
              </label>
              <input
                value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                placeholder="Full home address"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  border: '1.5px solid #d1d5db', fontSize: 14, color: '#1f2937',
                  outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => e.currentTarget.style.borderColor = color}
                onBlur={e => e.currentTarget.style.borderColor = '#d1d5db'}
              />
            </div>
            {['petOwner','owner','livestockManager','both'].includes(user.role || '') && (
              <>
                {[
                  { label: 'Calacazen ID', key: 'calacazen_id', placeholder: 'CAL-XXXX-XXXXX' },
                  { label: 'Household Number', key: 'household_number', placeholder: 'HH-XX-XXX' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {f.label}
                    </label>
                    <input
                      value={(form as any)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 10,
                        border: '1.5px solid #d1d5db', fontSize: 14, color: '#1f2937',
                        outline: 'none', boxSizing: 'border-box',
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = color}
                      onBlur={e => e.currentTarget.style.borderColor = '#d1d5db'}
                    />
                  </div>
                ))}
              </>
            )}
          </div>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSaveProfile}
              disabled={loading}
              style={{
                padding: '12px 32px', borderRadius: 10, border: 'none',
                background: color, color: 'white', fontWeight: 700, fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {loading ? '⏳ Saving...' : '💾 Save Profile'}
            </button>
          </div>
        </div>
      )}

      {/* Password Tab */}
      {tab === 'password' && (
        <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e5e7eb', padding: '28px 32px' }}>
          <div style={{ maxWidth: 400 }}>
            {[
              { label: 'Current Password', key: 'current' as const },
              { label: 'New Password', key: 'next' as const },
              { label: 'Confirm New Password', key: 'confirm' as const },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {f.label}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw[f.key] ? 'text' : 'password'}
                    value={pwForm[f.key]}
                    onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 44px 10px 14px', borderRadius: 10,
                      border: '1.5px solid #d1d5db', fontSize: 14, color: '#1f2937',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = color}
                    onBlur={e => e.currentTarget.style.borderColor = '#d1d5db'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => ({ ...p, [f.key]: !p[f.key] }))}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0,
                    }}
                  >
                    {showPw[f.key] ? '🙈' : '👁'}
                  </button>
                </div>
                {f.key === 'next' && pwForm.next && pwForm.next.length < 8 && (
                  <p style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>At least 8 characters required</p>
                )}
              </div>
            ))}

            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
              padding: '12px 16px', marginBottom: 20, fontSize: 12, color: '#166534',
            }}>
              💡 Use a mix of letters, numbers, and symbols for a strong password.
            </div>

            <button
              onClick={handleChangePassword}
              disabled={loading}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
                background: color, color: 'white', fontWeight: 700, fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? '⏳ Updating...' : '🔒 Change Password'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
