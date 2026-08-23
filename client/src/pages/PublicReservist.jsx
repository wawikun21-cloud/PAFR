import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle, UserX, LogIn } from 'lucide-react';
import { getPublicReservist } from '@/services/api';
import { ReservistCardFront } from '@/components/digital-id/ReservistCardFront';
import { Phone, Home, Landmark, ShieldCheck } from 'lucide-react';

function ContactRow({ icon: Icon, label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 text-sm font-bold text-neutral-900">
        <Icon size={14} style={{ color: '#32667F' }} />
        {label} :
      </div>
      <p className="pl-0.5 text-sm text-neutral-600">{value || '—'}</p>
    </div>
  );
}

export default function PublicReservist() {
  const { token } = useParams();
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus('loading');
      setErrorMsg('');
      try {
        const res = await getPublicReservist(token);
        if (cancelled) return;
        if (res.data?.status === 'success' && res.data?.data) {
          setProfile(res.data.data);
          setStatus('ready');
        } else {
          setStatus('notfound');
        }
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 404) {
          setStatus('notfound');
        } else {
          setErrorMsg(err.response?.data?.message || 'Failed to load Digital ID');
          setStatus('error');
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-4 flex items-center justify-center gap-2 text-sm font-semibold text-neutral-600 dark:text-neutral-300">
          <ShieldCheck size={16} style={{ color: '#32667F' }} />
          Public Digital ID
        </div>

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-white dark:bg-slate-800 p-10 shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            <p className="text-sm text-neutral-500">Loading Digital ID…</p>
          </div>
        )}

        {status === 'notfound' && (
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-white dark:bg-slate-800 p-10 text-center shadow-xl">
            <UserX size={40} className="text-neutral-400" />
            <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">ID not found</h1>
            <p className="text-sm text-neutral-500">
              This Digital ID is invalid or no longer active.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-white dark:bg-slate-800 p-10 text-center shadow-xl">
            <AlertCircle size={40} className="text-red-400" />
            <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">Something went wrong</h1>
            <p className="text-sm text-neutral-500">{errorMsg}</p>
          </div>
        )}

        {status === 'ready' && profile && (
          <div className="space-y-4">
            <div className="aspect-[1.586/1] w-full overflow-hidden rounded-3xl shadow-xl">
              <ReservistCardFront profile={profile} avatarUrl={profile.avatar_url} />
            </div>

            <div className="rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-xl">
              <div className="space-y-3">
                <ContactRow
                  icon={Landmark}
                  label="Unit / Squadron"
                  value={[profile.group_name, profile.squadron_name].filter(Boolean).join(' / ')}
                />
                <ContactRow
                  icon={Phone}
                  label="Emergency Contact"
                  value={profile.emergency_contact_name}
                />
                <ContactRow
                  icon={Phone}
                  label="Emergency Phone"
                  value={profile.emergency_contact_phone}
                />
                <ContactRow
                  icon={Home}
                  label="Address"
                  value={profile.address}
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center">
          <Link
            to="/login"
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: '#132F45' }}
          >
            <LogIn size={16} />
            Log in to the system
          </Link>
        </div>

        <p className="mt-4 text-center text-xs text-neutral-400">
          This is a public Digital ID. Information shown is provided by the reservist.
        </p>
      </div>
    </div>
  );
}
