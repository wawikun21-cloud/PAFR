import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  User, Phone, Shield, Loader2, Save, Lock, QrCode,
  BookOpen
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { getMyProfile, updateMyProfile, updateProfile, generateMyQR, uploadMyAvatar, removeMyAvatar } from '@/services/api';
import { ReservistCard } from '@/components/digital-id/ReservistCard';
import AvatarAdjustModal from '@/components/digital-id/AvatarAdjustModal';

// ── Editable field groups ──────────────────────────────────────────────
// Each field renders as an input/select/textarea and is included in the
// save payload. Read-only military fields (Reserve Center, Group, Squadron)
// are rendered separately below and are never sent to the update endpoint.

const PERSONAL_FIELDS = [
  { key: 'first_name', label: 'First Name', type: 'text' },
  { key: 'last_name', label: 'Last Name', type: 'text' },
  { key: 'rank', label: 'Rank', type: 'text' },
  { key: 'phone_number', label: 'Phone Number', type: 'tel' },
  { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
  { key: 'place_of_birth', label: 'Place of Birth', type: 'text' },
  { key: 'sex', label: 'Sex', type: 'select', options: ['Male', 'Female', 'Other'] },
  { key: 'civil_status', label: 'Civil Status', type: 'select', options: ['Single', 'Married', 'Widowed', 'Separated', 'Divorced'] },
  { key: 'blood_type', label: 'Blood Type', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'] },
  { key: 'citizenship', label: 'Citizenship', type: 'text' },
  { key: 'address', label: 'Address', type: 'textarea' },
  { key: 'bio', label: 'Bio', type: 'textarea' },
];

const EMERGENCY_CONTACT_FIELDS = [
  { key: 'emergency_contact_name', label: 'Emergency Contact Name', type: 'text' },
  { key: 'emergency_contact_phone', label: 'Emergency Contact Phone', type: 'tel' },
  { key: 'emergency_contact_address', label: 'Emergency Contact Address', type: 'textarea' },
];

const EDUCATION_FIELDS = [
  { key: 'highest_education', label: 'Highest Education', type: 'text' },
  { key: 'course_degree', label: 'Course / Degree', type: 'text' },
  { key: 'school', label: 'School', type: 'text' },
  { key: 'year_graduated', label: 'Year Graduated', type: 'text' },
];

const MILITARY_EDITABLE_FIELDS = [
  { key: 'position', label: 'Position', type: 'text' },
  { key: 'category', label: 'Category', type: 'text' },
  { key: 'reserve_status', label: 'Reserve Status', type: 'select', options: ['Ready Reserve', 'Standby Reserve', 'Retired'] },
  { key: 'source_of_commission', label: 'Source of Commission', type: 'text' },
  { key: 'date_enlisted', label: 'Date Enlisted', type: 'date' },
  { key: 'specialization', label: 'Specialization', type: 'text' },
];

// Read-only military fields — display keys map to fields returned by
// GET /reservists/my/profile (reserve_center is a direct column,
// group_name/squadron_name come from the assignment join).
const MILITARY_READONLY_FIELDS = [
  { key: 'reserve_center', label: 'Reserve Center' },
  { key: 'group_name', label: 'Group' },
  { key: 'squadron_name', label: 'Squadron' },
];

const ALL_EDITABLE_FIELDS = [
  ...PERSONAL_FIELDS,
  ...EMERGENCY_CONTACT_FIELDS,
  ...EDUCATION_FIELDS,
  ...MILITARY_EDITABLE_FIELDS,
];

const SectionCard = ({ title, icon: Icon, children, className }) => (
  <div className={cn(
    "rounded-2xl border border-neutral-200 dark:border-neutral-800",
    "bg-white dark:bg-neutral-900 p-6",
    className
  )}>
    <div className="flex items-center gap-2.5 mb-5">
      {Icon && <Icon size={16} className="text-blue-500 dark:text-blue-400" strokeWidth={1.8} />}
      <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
        {title}
      </h2>
    </div>
    {children}
  </div>
);

// Shared editable field renderer — input / select / textarea
function FieldInput({ field, value, onChange, wrapperClassName }) {
  const baseClass = cn(
    "w-full rounded-md border border-neutral-300 dark:border-neutral-600",
    "bg-white dark:bg-neutral-800 px-3 py-2 text-sm",
    "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
  );

  return (
    <div className={wrapperClassName}>
      <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
        {field.label}
      </label>
      {field.type === 'select' ? (
        <select value={value || ''} onChange={e => onChange(field.key, e.target.value)} className={baseClass}>
          <option value="">Select...</option>
          {field.options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea
          value={value || ''}
          onChange={e => onChange(field.key, e.target.value)}
          rows={2}
          className={cn(baseClass, "resize-none")}
          placeholder={`Enter ${field.label.toLowerCase()}`}
        />
      ) : (
        <input
          type={field.type}
          value={value || ''}
          onChange={e => onChange(field.key, e.target.value)}
          className={baseClass}
          placeholder={`Enter ${field.label.toLowerCase()}`}
        />
      )}
    </div>
  );
}

// Read-only display field — used for Reserve Center / Group / Squadron
function ReadOnlyField({ label, value, wrapperClassName }) {
  return (
    <div className={wrapperClassName}>
      <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
        {label}
      </label>
      <div className={cn(
        "w-full rounded-md border border-dashed border-neutral-300 dark:border-neutral-700",
        "bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2 text-sm",
        "text-neutral-600 dark:text-neutral-400"
      )}>
        {value || <span className="text-neutral-400 dark:text-neutral-600 italic">Not assigned</span>}
      </div>
    </div>
  );
}

// Avatar editor — small circular preview + button that opens the FB-style modal
function AvatarEditor({ profile, avatarUrl, onRemove, onAdjust }) {
  const initials = [profile?.first_name?.[0], profile?.last_name?.[0]].filter(Boolean).join('').toUpperCase();
  return (
    <div className="flex items-center gap-4">
      <div
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 bg-neutral-100 dark:bg-neutral-800"
        style={{ borderColor: '#d9a300' }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Profile photo"
            className="h-full w-full object-cover"
            style={{ objectPosition: `${50 + (profile?.avatar_offset_x || 0)}% ${50 + (profile?.avatar_offset_y || 0)}%` }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xl font-bold text-neutral-400">
            {initials || '?'}
          </div>
        )}
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onAdjust}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white",
              "transition-colors duration-200"
            )}
            style={{ backgroundColor: '#132F45' }}
          >
            Change photo
          </button>
          {avatarUrl && (
            <button
              type="button"
              onClick={onRemove}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-600",
                "hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800",
                "transition-colors duration-200"
              )}
            >
              Remove
            </button>
          )}
        </div>
        <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
          JPEG, PNG, GIF or WEBP · max 10MB
        </p>
      </div>
    </div>
  );
}

export default function Profile() {
  const { addToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '' });
  const [error, setError] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'qr'
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!profile) return;
    const qrValue = `${window.location.origin}/id/${encodeURIComponent(profile.qr_code)}`;
    if (!profile.qr_code) return;
    QRCode.toDataURL(qrValue, { width: 256, margin: 2, color: { dark: '#1e293b', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [profile]);

  const handleGenerateQR = async () => {
    try {
      const res = await generateMyQR();
      if (res.data?.status === 'success') {
        setProfile(prev => ({ ...prev, qr_code: res.data.data.qr_code }));
        addToast('QR code generated successfully', 'success');
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to generate QR code';
      addToast(message, 'error');
    }
  };

  const handleAvatarRemove = async () => {
    try {
      const res = await removeMyAvatar();
      if (res.data?.status === 'success') {
        setProfile(prev => ({ ...prev, avatar_url: null }));
        addToast('Profile photo removed', 'success');
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to remove photo';
      addToast(message, 'error');
    }
  };

  const handleAvatarSave = async ({ file, offsetX, offsetY }) => {
    // Offsets come from the drag handler as floats; the DB column is INT and
    // the server validates with isInt, so round to avoid a 400.
    const roundedX = Math.round(offsetX);
    const roundedY = Math.round(offsetY);

    try {
      let avatarUrl = profile?.avatar_url;
      if (file) {
        const formData = new FormData();
        formData.append('avatar', file);
        const res = await uploadMyAvatar(formData);
        if (res.data?.status !== 'success') {
          throw new Error(res.data?.message || 'Failed to upload photo');
        }
        avatarUrl = res.data.data.avatar_url;
        addToast('Profile photo updated', 'success');
        // Reflect the new photo immediately so it shows without a refresh.
        setProfile(prev => ({ ...prev, avatar_url: avatarUrl }));
      }
      const res = await updateMyProfile({ avatar_offset_x: roundedX, avatar_offset_y: roundedY });
      if (res.data?.status === 'success') {
        setProfile(prev => ({ ...prev, avatar_url: avatarUrl, avatar_offset_x: roundedX, avatar_offset_y: roundedY }));
      } else {
        throw new Error(res.data?.message || 'Failed to save photo position');
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to save photo';
      addToast(message, 'error');
    }
  };

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyProfile();
      if (res.data?.status === 'success') {
        setProfile(res.data.data);
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to load profile data';
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key, value) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const updateData = {};
    ALL_EDITABLE_FIELDS.forEach(f => {
      if (profile?.[f.key] !== undefined) {
        updateData[f.key] = profile[f.key];
      }
    });

    try {
      const res = await updateMyProfile(updateData);
      if (res.data?.status === 'success') {
        setProfile(res.data.data);
        addToast('Profile updated successfully', 'success');
      } else {
        throw new Error(res.data?.message || 'Failed to update profile');
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to update profile';
      addToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.current_password || !passwordData.new_password) {
      addToast('Both current and new password are required', 'error');
      return;
    }
    if (passwordData.new_password.length < 6) {
      addToast('New password must be at least 6 characters', 'error');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await updateProfile(passwordData);
      if (res.data?.status === 'success') {
        addToast('Password changed successfully', 'success');
        setPasswordData({ current_password: '', new_password: '' });
      } else {
        throw new Error(res.data?.message || 'Failed to change password');
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to change password';
      addToast(message, 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-neutral-500 dark:text-neutral-400">Failed to load profile</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Tab bar */}
        <div className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors duration-150",
              activeTab === 'profile'
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
            )}
          >
            <User size={14} />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors duration-150",
              activeTab === 'qr'
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
            )}
          >
            <QrCode size={14} />
            QR Code
          </button>
        </div>

        {activeTab === 'profile' && (
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm",
              "bg-blue-600 hover:bg-blue-700 text-white",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors duration-200"
            )}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Changes
          </button>
        )}
      </div>

      {activeTab === 'profile' && (
        /* Bento grid — cards are sized by how much content they carry rather
           than forced into uniform boxes: Personal Information and Military
           Information are the "hero" tiles, the rest tuck in around them. */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Personal Information — hero tile, wide, 2-col field grid inside */}
          <SectionCard title="Personal Information" icon={User} className="lg:col-span-7">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PERSONAL_FIELDS.map(field => (
                <FieldInput
                  key={field.key}
                  field={field}
                  value={profile[field.key]}
                  onChange={handleInputChange}
                  wrapperClassName={field.type === 'textarea' ? 'sm:col-span-2' : undefined}
                />
              ))}
            </div>
          </SectionCard>

          {/* Right-hand stack — two compact cards riding alongside the hero tile */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <SectionCard title="Emergency Contact" icon={Phone}>
              <div className="space-y-4">
                {EMERGENCY_CONTACT_FIELDS.map(field => (
                  <FieldInput
                    key={field.key}
                    field={field}
                    value={profile[field.key]}
                    onChange={handleInputChange}
                  />
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Educational Background" icon={BookOpen}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {EDUCATION_FIELDS.map(field => (
                  <FieldInput
                    key={field.key}
                    field={field}
                    value={profile[field.key]}
                    onChange={handleInputChange}
                  />
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Profile Photo" icon={User}>
              <AvatarEditor
                profile={profile}
                avatarUrl={profile?.avatar_url}
                onRemove={handleAvatarRemove}
                onAdjust={() => setAvatarModalOpen(true)}
              />
            </SectionCard>
          </div>

          {/* Military Information — full-width banner tile */}
          <SectionCard title="Military Information" icon={Shield} className="lg:col-span-12">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {MILITARY_EDITABLE_FIELDS.map(field => (
                <FieldInput
                  key={field.key}
                  field={field}
                  value={profile[field.key]}
                  onChange={handleInputChange}
                />
              ))}
            </div>

            <div className="pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-600 mb-3">
                Assignment (Read-only)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {MILITARY_READONLY_FIELDS.map(field => (
                  <ReadOnlyField key={field.key} label={field.label} value={profile[field.key]} />
                ))}
              </div>
            </div>
          </SectionCard>

          {/* Change Password — compact tile */}
          <SectionCard title="Change Password" icon={Lock} className="lg:col-span-7">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.current_password}
                  onChange={e => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                  className={cn(
                    "w-full rounded-md border border-neutral-300 dark:border-neutral-600",
                    "bg-white dark:bg-neutral-800 px-3 py-2 text-sm",
                    "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  )}
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.new_password}
                  onChange={e => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                  className={cn(
                    "w-full rounded-md border border-neutral-300 dark:border-neutral-600",
                    "bg-white dark:bg-neutral-800 px-3 py-2 text-sm",
                    "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  )}
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  onClick={handlePasswordChange}
                  disabled={changingPassword}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm",
                    "bg-neutral-800 hover:bg-neutral-900 text-white",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-colors duration-200"
                  )}
                >
                  {changingPassword ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                  Change Password
                </button>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {activeTab === 'qr' && (
        <div className="max-w-2xl mx-auto">
          <SectionCard title="Digital ID" icon={QrCode}>
            <ReservistCard
              profile={profile}
              avatarUrl={profile?.avatar_url}
              qrDataUrl={qrDataUrl}
              onGenerate={handleGenerateQR}
            />
          </SectionCard>
        </div>
      )}

      <AvatarAdjustModal
        open={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        profile={profile}
        onSave={handleAvatarSave}
        onRemove={() => {
          setAvatarModalOpen(false);
          handleAvatarRemove();
        }}
      />
    </div>
  );
}