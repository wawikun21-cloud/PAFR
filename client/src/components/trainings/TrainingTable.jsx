import { Calendar, MapPin, User, Users, Edit, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeTotalSlots } from '@/lib/slotUtils';

const statusConfig = {
  published: {
    label: 'Published',
    dot: 'bg-blue-500',
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  },
  open: {
    label: 'Open',
    dot: 'bg-green-500',
    className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
  },
  ongoing: {
    label: 'In Progress',
    dot: 'bg-emerald-500',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  },
  completed: {
    label: 'Completed',
    dot: 'bg-slate-400',
    className: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
  },
  cancelled: {
    label: 'Cancelled',
    dot: 'bg-red-500',
    className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
  },
  closed: {
    label: 'Closed',
    dot: 'bg-amber-500',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  },
  draft: {
    label: 'Draft',
    dot: 'bg-neutral-400',
    className: 'bg-neutral-50 text-neutral-600 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700',
  },
};

export function TrainingDetailModal({ training, onClose, isAdmin, onEdit, onDelete, onAttendance }) {
  const isExternal = training._source === 'external';
  const displayDate = training.start_datetime || training.start_date;
  const endDate = training.end_datetime || training.end_date;
  const status = statusConfig[training.status] || statusConfig.draft;
  const totalSlots = computeTotalSlots(training);
  const location = training.location || training.venue;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="relative px-6 pt-5 pb-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                  status.className
                )}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
                  {status.label}
                </span>
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide',
                  isExternal
                    ? 'bg-violet-50 text-violet-600 border border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20'
                    : 'bg-sky-50 text-sky-600 border border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20'
                )}>
                  {isExternal ? 'External' : 'Internal'}
                </span>
              </div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-50 leading-snug">
                {training.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {training.description && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1.5">Description</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">{training.description}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-start gap-2.5">
              <Calendar size={14} className="mt-0.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Start Date</p>
                <p className="text-sm text-neutral-700 dark:text-neutral-200 leading-snug">
                  {displayDate ? new Date(displayDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set'}
                </p>
              </div>
            </div>
            {endDate && (
              <div className="flex items-start gap-2.5">
                <Calendar size={14} className="mt-0.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">End Date</p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-200 leading-snug">
                    {new Date(endDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2.5">
              <MapPin size={14} className="mt-0.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Location</p>
                <p className="text-sm text-neutral-700 dark:text-neutral-200 leading-snug">{location || 'Not specified'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <User size={14} className="mt-0.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Facilitator</p>
                <p className="text-sm text-neutral-700 dark:text-neutral-200 leading-snug">{training.instructor || 'Not assigned'}</p>
              </div>
            </div>
            {isExternal && (
              <div className="flex items-start gap-2.5">
                <Users size={14} className="mt-0.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Capacity</p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-200 leading-snug">{totalSlots ? `${totalSlots} slots` : 'Unlimited'}</p>
                </div>
              </div>
            )}
          </div>

          {training.type && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1.5">Activity Type</p>
              <span className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium border bg-neutral-50 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700">
                {training.type.charAt(0).toUpperCase() + training.type.slice(1)}
              </span>
            </div>
          )}

          {training.requirements && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1.5">Requirements</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">{training.requirements}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/60 shrink-0">
          {isAdmin && (
            <>
              <button
                onClick={() => { onClose(); onEdit(); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              >
                <Edit size={13} />
                Edit
              </button>
              {onAttendance && (
                <button
                  onClick={() => { onClose(); onAttendance(); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 transition-colors"
                >
                  Attendance
                </button>
              )}
              <button
                onClick={() => { onClose(); onDelete(); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={13} />
                Delete
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TrainingCard({ training, onDetailClick }) {
  const isExternal = training._source === 'external';
  const displayDate = training.start_datetime || training.start_date;
  const status = statusConfig[training.status] || statusConfig.draft;
  const location = training.location || training.venue;

  return (
    <tr
      className={cn(
        'group',
        'hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer'
      )}
      onClick={onDetailClick}
    >
        <td className="px-4 py-3.5 align-middle">
          <span className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
            status.className
          )}>
            <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
            {status.label}
          </span>
        </td>
        <td className="px-4 py-3.5 align-middle whitespace-nowrap">
          <span className={cn(
            'text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide',
            isExternal
              ? 'bg-violet-50 text-violet-600 border border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20'
              : 'bg-sky-50 text-sky-600 border border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20'
          )}>
            {isExternal ? 'Ext' : 'Int'}
          </span>
        </td>
        <td className="px-4 py-3.5 align-middle">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-[200px]">
              {training.title}
            </p>
          </div>
        </td>
        <td className="px-4 py-3.5 align-middle whitespace-nowrap">
          <span className="text-sm text-neutral-600 dark:text-neutral-300">
            {displayDate
              ? new Date(displayDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
              : <span className="text-neutral-400 italic">TBA</span>}
          </span>
        </td>
        <td className="px-4 py-3.5 align-middle">
          <span className="text-sm text-neutral-600 dark:text-neutral-300 truncate max-w-[150px] block">
            {location || <span className="text-neutral-400 italic">TBA</span>}
          </span>
        </td>
        <td className="px-4 py-3.5 align-middle whitespace-nowrap">
          <span className="text-sm text-neutral-600 dark:text-neutral-300">
            {training.type ? (
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border bg-neutral-50 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700">
                {training.type.charAt(0).toUpperCase() + training.type.slice(1)}
              </span>
            ) : (
              <span className="text-neutral-400">—</span>
            )}
          </span>
        </td>
      </tr>
  );
}