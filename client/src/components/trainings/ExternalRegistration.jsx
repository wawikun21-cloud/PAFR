import { useState } from 'react';
import { Users, AlertCircle, CheckCircle2, Clock, Loader, UserPlus, X, Shield } from 'lucide-react';

export default function ExternalRegistration({
   capacity,
   currentRegistrations = 0,
   onRegister,
   loading = false,
   currentUser = null,
 }) {
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const slotsRemaining = capacity != null ? capacity - currentRegistrations : null;
  const isAtCapacity = slotsRemaining !== null && slotsRemaining <= 0;
  const isNearCapacity = slotsRemaining !== null && slotsRemaining > 0 && slotsRemaining <= 5;

  const handleFieldChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isAtCapacity) {
      setError('This training has reached its capacity limit.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      // Always inject reservist_id so the backend can send a personal alert.
      // currentUser.reservist_id is the reservists.id linked to this user account.
      const payload = {
        ...formData,
        ...(currentUser?.reservist_id ? { reservist_id: currentUser.reservist_id } : {}),
      };
      await onRegister(payload);
      setSuccess('Registration submitted successfully!');
      setFormData({});
    } catch (err) {
      setError(err?.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const registrationFields = [
    { name: 'full_name', label: 'Full Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone Number', type: 'text', required: false },
    { name: 'organization', label: 'Organization', type: 'text', required: false },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          External Training Registration
        </h3>
        {capacity != null && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            isAtCapacity
              ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
              : isNearCapacity
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
          }`}>
            <Users className="h-3.5 w-3.5" />
            {currentRegistrations}/{capacity} registered
            {slotsRemaining !== null && !isAtCapacity && (
              <span className="opacity-75">({slotsRemaining} slots left)</span>
            )}
          </div>
        )}
      </div>

      {isAtCapacity && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-800 dark:text-red-200">
            This training has reached its capacity limit. No further registrations are accepted.
          </p>
        </div>
      )}

      {isNearCapacity && !isAtCapacity && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Only {slotsRemaining} slot{slotsRemaining !== 1 ? 's' : ''} remaining!
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 dark:text-red-200 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-800 dark:text-emerald-200 flex-1">{success}</p>
          <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {!isAtCapacity && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {registrationFields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  value={formData[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  required={field.required}
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none"
                  placeholder={field.placeholder || ''}
                  disabled={submitting}
                />
              ) : field.type === 'select' ? (
                <select
                  value={formData[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  required={field.required}
                  className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  disabled={submitting}
                >
                  <option value="">Select...</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type || 'text'}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  required={field.required}
                  className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  placeholder={field.placeholder || ''}
                  disabled={submitting}
                />
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={submitting || loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {submitting ? 'Submitting...' : 'Register for Training'}
          </button>
        </form>
      )}
    </div>
  );
}

export function RegistrationManager({ registrations = [], onApprove, onReject, loading = false }) {
  const [filter, setFilter] = useState('all');

  const filtered = registrations.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Registrations ({registrations.length})
        </h3>
        <div className="flex gap-1">
          {['all', 'pending', 'approved', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 text-xs rounded-lg capitalize transition-colors ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((reg) => {
            const data = typeof reg.participant_data === 'string'
              ? (() => { try { return JSON.parse(reg.participant_data); } catch { return {}; } })()
              : reg.participant_data || {};

            return (
              <div
                key={reg.id}
                className="p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {data.full_name || `${reg.first_name || ''} ${reg.last_name || ''}`.trim() || 'Unknown'}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-neutral-500">
                      {data.email && <span>{data.email}</span>}
                      {data.phone && <span>{data.phone}</span>}
                      {data.organization && <span className="flex items-center gap-1"><Shield className="h-3 w-3" />{data.organization}</span>}
                    </div>
                    <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Registered: {new Date(reg.registered_at).toLocaleString()}
                    </p>
                  </div>
                  {onApprove && onReject && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => onApprove(reg.id)}
                        className="p-1.5 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                        title="Approve"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onReject(reg.id)}
                        className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                        title="Reject"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-sm text-neutral-500">
          {filter === 'all' ? 'No registrations yet' : `No ${filter} registrations`}
        </div>
      )}
    </div>
  );
}