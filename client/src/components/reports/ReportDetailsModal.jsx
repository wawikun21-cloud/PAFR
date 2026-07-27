import { X, Calendar, FileText, Users, Download, Eye, File, Image as ImageIcon, Edit, Trash2 } from 'lucide-react';
import { downloadDocumentation } from '@/services/reportsService';
import { cn } from '@/lib/utils';

const getDocName = (doc, idx) => doc?.name || doc?.file_name || doc?.filename || `File ${idx + 1}`;

// Opens a blank tab synchronously (so browsers don't block it as a popup),
// then points it at the file once the authenticated download resolves.
async function viewDocument(reportId, doc, onError) {
  const newTab = window.open('', '_blank');
  const result = await downloadDocumentation(reportId, doc.id);
  if (!result.success || !result.blob) {
    newTab?.close();
    onError?.(result.message || 'Failed to open file');
    return;
  }
  const blobUrl = URL.createObjectURL(result.blob);
  if (newTab) newTab.location = blobUrl;
}

async function downloadDocumentFile(reportId, doc, idx, onError) {
  const result = await downloadDocumentation(reportId, doc.id);
  if (!result.success || !result.blob) {
    onError?.(result.message || 'Failed to download file');
    return;
  }
  const blobUrl = URL.createObjectURL(result.blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = getDocName(doc, idx);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

const typeStyles = {
  attendance: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  readiness: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  logistics: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  custom: 'bg-neutral-50 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700',
};

function Section({ label, children }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
        {label}
      </p>
      {children}
    </div>
  );
}

function getFileIcon(fileNameOrType = '') {
  const val = String(fileNameOrType).toLowerCase();
  if (val.includes('pdf')) return <FileText size={16} className="text-red-500" />;
  if (val.match(/\.(jpg|jpeg|png|gif|webp)$/) || val.startsWith('image/')) {
    return <ImageIcon size={16} className="text-indigo-500" />;
  }
  return <File size={16} className="text-blue-500" />;
}

export default function ReportDetailsModal({ report, loading, isAnyAdmin, onClose, onEdit, onDelete, addToast }) {
  if (!report && !loading) return null;

  const documentations = report?.documentations || report?.documents || report?.attachments || [];
  const participants = report?.participants || report?.attendance || [];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide border',
                report?.event_type === 'external'
                  ? 'bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20'
                  : 'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20'
              )}>
                {report?.event_type === 'external' ? 'External' : 'Internal'}
              </span>
              {report?.type && (
                <span className={cn(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border',
                  typeStyles[report.type] || typeStyles.custom
                )}>
                  {report.type}
                </span>
              )}
              {report?.format && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-neutral-50 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700 uppercase">
                  {report.format}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 truncate">
              {report?.title || 'Loading…'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={18} className="text-neutral-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Section label="Event Date">
                  <p className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                    <Calendar size={13} className="text-neutral-400" />
                    {report.event_date ? new Date(report.event_date).toLocaleDateString() : 'N/A'}
                  </p>
                </Section>
                <Section label="Created">
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">
                    {report.created_at ? new Date(report.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </Section>
              </div>

              {report.summary && (
                <Section label="Summary">
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                    {report.summary}
                  </p>
                </Section>
              )}

              {participants.length > 0 && (
                <Section label={`Attendance (${participants.length})`}>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 p-3">
                    <div className="flex items-center gap-2 mb-2 text-neutral-500">
                      <Users size={13} />
                    </div>
                    <ul className="space-y-1 text-xs">
                      {participants.map((p, idx) => (
                        <li key={idx} className="text-neutral-700 dark:text-neutral-300 truncate">
                          {p.rank} {p.first_name} {p.last_name}
                          {p.service_number && ` (${p.service_number})`}
                          {p.squadron_name && ` - ${p.squadron_name}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Section>
              )}

              {documentations.length > 0 && (
                <Section label={`Documentation (${documentations.length})`}>
                  <div className="space-y-2">
                    {documentations.map((doc, idx) => {
                      const hasId = doc?.id != null;
                      return (
                        <div
                          key={doc.id ?? idx}
                          className="flex items-center gap-3 p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg"
                        >
                          <div className="w-8 h-8 rounded-lg bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 flex items-center justify-center shrink-0">
                            {getFileIcon(doc.name || doc.file_name)}
                          </div>
                          <p className="flex-1 min-w-0 text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">
                            {doc.name || doc.file_name || `File ${idx + 1}`}
                          </p>
                          {hasId ? (
                            <>
                              <button
                                type="button"
                                onClick={() => viewDocument(report.id, doc, (msg) => addToast?.(msg, 'error'))}
                                title="View"
                                className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors shrink-0"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => downloadDocumentFile(report.id, doc, idx, (msg) => addToast?.(msg, 'error'))}
                                title="Download"
                                className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors shrink-0"
                              >
                                <Download size={14} />
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-neutral-400 shrink-0">Unavailable</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {!report.summary && participants.length === 0 && documentations.length === 0 && (
                <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-6">
                  No additional details for this report.
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 shrink-0">
          {isAnyAdmin && !loading && (
            <>
              <button
                type="button"
                onClick={onDelete}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
                Delete
              </button>
              <button
                type="button"
                onClick={onEdit}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold"
              >
                <Edit size={14} />
                Edit Report
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}