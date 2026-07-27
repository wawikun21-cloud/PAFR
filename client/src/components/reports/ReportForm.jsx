import { useState, useEffect, useRef } from 'react';
import { X, Upload, Trash2, FileText, Image, File, ClipboardList, Users, Eye, Download } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { createReport, updateReport, uploadDocumentation, deleteDocumentation, downloadDocumentation } from '@/services/reportsService';
import { getTrainings, getExternalTrainings, getInternalTrainingParticipants, getExternalTrainingParticipants } from '@/services/trainingsService';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { cn } from '@/lib/utils';

const inputCls =
  'w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all';

const ACCEPTED_FILE_TYPES = '.pdf,.jpg,.jpeg,.png';
const ACCEPTED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_MB = 10;

const str = (v) => (v == null ? '' : String(v));

const getDocName = (doc, idx) => doc?.name || doc?.file_name || doc?.filename || `File ${idx + 1}`;

// Opens a blank tab synchronously (so browsers don't block it as a popup),
// then points it at the file once the authenticated download resolves.
async function viewDocument(reportId, doc, addToast) {
  const newTab = window.open('', '_blank');
  const result = await downloadDocumentation(reportId, doc.id);
  if (!result.success || !result.blob) {
    newTab?.close();
    addToast?.(result.message || 'Failed to open file', 'error');
    return;
  }
  const blobUrl = URL.createObjectURL(result.blob);
  if (newTab) newTab.location = blobUrl;
}

async function downloadDocumentFile(reportId, doc, idx, addToast) {
  const result = await downloadDocumentation(reportId, doc.id);
  if (!result.success || !result.blob) {
    addToast?.(result.message || 'Failed to download file', 'error');
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

const docIcon = (doc, idx) => {
  const hint = `${getDocName(doc, idx)} ${doc?.type || ''}`.toLowerCase();
  if (hint.includes('pdf')) return <FileText size={16} className="text-red-500" />;
  if (hint.match(/\.(jpg|jpeg|png|gif|webp)$/) || hint.includes('image')) {
    return <Image size={16} className="text-indigo-500" />;
  }
  return <File size={16} className="text-blue-500" />;
};

function ExistingDocumentation({ reportId, docs, removedIds, onRemove, addToast }) {
  const visible = docs.filter((d) => !removedIds.includes(d.id));
  if (visible.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          Uploaded Documentation
        </label>
        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
          {visible.length} file{visible.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-2">
        {visible.map((doc, idx) => (
          <div
            key={doc.id ?? idx}
            className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg"
          >
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 flex items-center justify-center shrink-0">
              {docIcon(doc, idx)}
            </div>
            <p className="flex-1 min-w-0 text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">
              {getDocName(doc, idx)}
            </p>
            <button
              type="button"
              onClick={() => viewDocument(reportId, doc, addToast)}
              title="View"
              className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            >
              <Eye size={14} />
            </button>
            <button
              type="button"
              onClick={() => downloadDocumentFile(reportId, doc, idx, addToast)}
              title="Download"
              className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            >
              <Download size={14} />
            </button>
            <button
              type="button"
              onClick={() => onRemove(doc)}
              title="Remove"
              className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormGroup({ label, required, hint, children, error }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-[11px] text-neutral-400 dark:text-neutral-500">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function DocumentationUpload({ files, onFilesChange }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState('');

  const processFiles = (incoming) => {
    setFileError('');
    const valid = [];
    for (const f of incoming) {
      if (!ACCEPTED_MIME.includes(f.type)) {
        setFileError('Only PDF, JPEG, and PNG files are accepted.');
        continue;
      }
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        setFileError(`File must be under ${MAX_FILE_MB}MB.`);
        continue;
      }
      valid.push(f);
    }
    if (valid.length) onFilesChange([...files, ...valid]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) processFiles(dropped);
  };

  const removeFile = (idx) => {
    onFilesChange(files.filter((_, i) => i !== idx));
  };

  const getFileIcon = (f) => {
    if (f.type === 'application/pdf') return <FileText size={16} className="text-red-500" />;
    if (f.type.startsWith('image/')) return <Image size={16} className="text-indigo-500" />;
    return <File size={16} className="text-blue-500" />;
  };

  const formatSize = (bytes) => {
    if (bytes == null) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          Documentations
        </label>
        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
          PDF, JPG, PNG — max {MAX_FILE_MB}MB each
        </span>
      </div>

      {files.length > 0 && (
        <div className="space-y-2 mb-3">
          {files.map((f, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 flex items-center justify-center shrink-0">
                {getFileIcon(f)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">{f.name}</p>
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">{formatSize(f.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-lg border-2 border-dashed cursor-pointer transition-all',
          dragOver
            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-500/5 dark:border-indigo-500'
            : 'border-neutral-200 dark:border-neutral-700 hover:border-indigo-300 dark:hover:border-indigo-600/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
        )}
      >
        <div className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
          dragOver ? 'bg-indigo-100 dark:bg-indigo-500/20' : 'bg-neutral-100 dark:bg-neutral-800'
        )}>
          <Upload size={16} className={dragOver ? 'text-indigo-500' : 'text-neutral-400 dark:text-neutral-500'} />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
            {dragOver ? 'Drop to attach' : 'Upload documentation photos / files'}
          </p>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
            Drag & drop or{' '}
            <span className="text-indigo-500 dark:text-indigo-400 font-semibold">browse files</span>
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        className="hidden"
        multiple
        onChange={(e) => { processFiles(Array.from(e.target.files || [])); e.target.value = ''; }}
      />
      {fileError && <p className="mt-1 text-xs text-red-500">{fileError}</p>}
    </div>
  );
}

export default function ReportForm({ report, onClose, onSubmit }) {
  const { addToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventSearch, setEventSearch] = useState('');
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const [attendanceData, setAttendanceData] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const eventDropdownRef = useRef(null);

  const [existingDocs] = useState(
    () => report?.documentations || report?.documents || report?.attachments || []
  );
  const [removedDocIds, setRemovedDocIds] = useState([]);
  const [docPendingRemoval, setDocPendingRemoval] = useState(null);

  const [form, setForm] = useState({
    title: str(report?.title || ''),
    event_type: report?.event_type || 'internal',
    event_source_id: report?.event_source_id ? String(report.event_source_id) : '',
    event_date: str(report?.event_date || ''),
    summary: str(report?.summary || ''),
    type: report?.type || 'custom',
    format: report?.format || 'pdf',
    documentationFiles: [],
  });

  useEffect(() => {
    setEventsLoading(true);
    Promise.all([
      getTrainings({ status: 'completed', limit: 100 }),
      getExternalTrainings({ status: 'completed', limit: 100 }),
    ]).then(([internalRes, externalRes]) => {
      const internalEvents = (internalRes?.data?.trainings || []).map((t) => ({
        ...t,
        _source: 'internal',
        displayTitle: t.title,
        displayDate: t.start_datetime || t.start_date,
      }));
      const externalEvents = (externalRes?.data?.trainings || []).map((t) => ({
        ...t,
        _source: 'external',
        displayTitle: t.title,
        displayDate: t.start_date || t.start_datetime,
      }));
      const all = [...internalEvents, ...externalEvents].sort((a, b) => {
        const da = new Date(a.displayDate || 0);
        const db = new Date(b.displayDate || 0);
        return db - da;
      });
      setEvents(all);
    }).catch(() => {
      addToast('Failed to load events', 'error');
    }).finally(() => {
      setEventsLoading(false);
    });
  }, []);

  const activeQuery = (eventSearch || form.title || '').trim().toLowerCase();
  const filteredEvents = activeQuery
    ? events.filter((e) => e.displayTitle.toLowerCase().includes(activeQuery))
    : [];

  const selectedEvent = form.event_source_id
    ? events.find((e) => String(e.id) === String(form.event_source_id) && e._source === form.event_type)
    : null;

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleEventSelect = async (evt) => {
    setAttendanceData(null);
    setAttendanceLoading(true);
    let attendance = [];
    try {
      if (evt._source === 'internal') {
        const participantsRes = await getInternalTrainingParticipants(evt.id);
        attendance = participantsRes?.data || [];
      } else {
        const participantsRes = await getExternalTrainingParticipants(evt.id);
        attendance = participantsRes?.data || [];
      }
    } catch (e) {
      addToast('Could not load attendance data for this event', 'warning');
    } finally {
      setAttendanceLoading(false);
      setAttendanceData({ attendance });
    }
    setForm((prev) => ({
      ...prev,
      event_type: evt._source,
      event_source_id: String(evt.id),
      event_date: evt.displayDate ? String(evt.displayDate).slice(0, 10) : prev.event_date,
      title: evt.displayTitle,
    }));
    setEventSearch(evt.displayTitle);
    setShowEventDropdown(false);
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Event name is required.';
    if (!form.event_type) errs.event_type = 'Event type is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      const payload = {
        title: form.title.trim(),
        event_type: form.event_type,
        event_source_id: form.event_source_id ? Number(form.event_source_id) : null,
        event_date: form.event_date || null,
        summary: form.summary.trim() || null,
        type: form.type,
        format: form.format,
        participants: attendanceData?.attendance || [],
      };

      let result;
      if (report?.id) {
        result = await updateReport(report.id, payload);
      } else {
        result = await createReport(payload);
      }

      if (!result?.success) {
        const serverErrors = result?.errors || [];
        if (serverErrors.length > 0) {
          const fieldErrors = {};
          serverErrors.forEach((err) => {
            const field = err.path || err.param;
            if (field) fieldErrors[field] = err.msg || err.message;
          });
          setErrors(fieldErrors);
        } else {
          setErrors({ submit: result?.message || 'Failed to save report.' });
        }
        return;
      }

      const reportId = result.data?.id ?? report?.id;

      if (removedDocIds.length > 0 && reportId) {
        for (const docId of removedDocIds) {
          try {
            await deleteDocumentation(reportId, docId);
          } catch {
            addToast('Failed to remove one of the existing files', 'warning');
          }
        }
      }

      if (form.documentationFiles.length > 0 && reportId) {
        for (const file of form.documentationFiles) {
          const uploadResult = await uploadDocumentation(reportId, file);
          if (!uploadResult?.success) {
            addToast(`Failed to upload ${file.name}`, 'warning');
          }
        }
      }

      addToast(report ? 'Report updated successfully' : 'Report created successfully', 'success');
      onSubmit?.();
    } catch (error) {
      setErrors({ submit: error.response?.data?.message || 'Failed to save report.' });
    } finally {
      setSubmitting(false);
    }
  };

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
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-50">
              {report ? 'Edit Report' : 'Create Report'}
            </h2>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
              {report ? 'Update the report details below.' : 'Summarize a completed training or event.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <FormGroup label="Event Name" required error={errors.title}>
              <div className="relative" ref={eventDropdownRef}>
                <input
                  type="text"
                  role="combobox"
                  aria-expanded={showEventDropdown && activeQuery.length > 0}
                  value={form.title}
                  onChange={(e) => {
                    handleChange('title', e.target.value);
                    setEventSearch(e.target.value);
                    setShowEventDropdown(true);
                  }}
                  onFocus={() => {
                    if (activeQuery.length > 0) setShowEventDropdown(true);
                  }}
                  onBlur={() => setTimeout(() => setShowEventDropdown(false), 150)}
                  className={inputCls}
                  placeholder="Search completed events or enter a custom title..."
                />
                {showEventDropdown && activeQuery.length > 0 && (
                  <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg text-sm">
                    {eventsLoading ? (
                      <p className="px-3 py-2 text-xs text-neutral-500">Loading events...</p>
                    ) : filteredEvents.filter((e) => e._source === form.event_type).length === 0 ? (
                      <p className="px-3 py-2 text-xs text-neutral-500">No completed events found.</p>
                    ) : (
                      filteredEvents
                        .filter((e) => e._source === form.event_type)
                        .map((evt) => (
                          <button
                            key={`name-${evt._source}-${evt.id}`}
                            type="button"
                            className={cn(
                              'w-full text-left px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800',
                              String(evt.id) === String(form.event_source_id) && evt._source === form.event_type && 'bg-indigo-50 dark:bg-indigo-950/50'
                            )}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleEventSelect(evt)}
                          >
                            <span className="font-medium text-neutral-900 dark:text-neutral-100 block">{evt.displayTitle}</span>
                            {evt.displayDate && (
                              <span className="text-neutral-500 text-xs">{new Date(evt.displayDate).toLocaleDateString()}</span>
                            )}
                          </button>
                        ))
                    )}
                  </div>
                )}
              </div>
            </FormGroup>

            <FormGroup label="Event Source" hint="Select a completed training or event">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange('event_type', 'internal')}
                    className={cn(
                      'px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors',
                      form.event_type === 'internal'
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    )}
                  >
                    Internal Training
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('event_type', 'external')}
                    className={cn(
                      'px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors',
                      form.event_type === 'external'
                        ? 'bg-violet-50 dark:bg-violet-500/10 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    )}
                  >
                    External Training
                  </button>
                </div>

                {selectedEvent && (
                  <div className="flex items-center gap-2 p-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                    <ClipboardList size={14} className="text-indigo-500 shrink-0" />
                    <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300 truncate">{selectedEvent.displayTitle}</span>
                    <button
                      type="button"
                      onClick={() => { handleChange('event_source_id', ''); handleChange('event_date', ''); }}
                      className="ml-auto p-0.5 rounded hover:bg-indigo-200/50 dark:hover:bg-indigo-800/50 text-indigo-500 shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                {attendanceLoading && (
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">Loading attendance data...</p>
                )}

                {attendanceData && (
                  <div className="mt-2 p-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Users size={14} className="text-neutral-500" />
                      <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase">
                        Attendance ({attendanceData.attendance.length})
                      </span>
                    </div>
                    <div className="max-h-40 overflow-y-auto text-xs">
                      {attendanceData.attendance.length === 0 ? (
                        <p className="text-neutral-400">No participants recorded</p>
                      ) : (
                        <ul className="space-y-1">
                          {attendanceData.attendance.map((p, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                              <span className="truncate">
                                {p.rank} {p.first_name} {p.last_name}
                                {p.service_number && ` (${p.service_number})`}
                                {p.squadron_name && ` - ${p.squadron_name}`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </FormGroup>

            <FormGroup label="Event Date" hint="Actual date the event started">
              <input
                type="date"
                value={form.event_date}
                onChange={(e) => handleChange('event_date', e.target.value)}
                className={inputCls}
              />
            </FormGroup>

            <FormGroup label="Summary">
              <textarea
                value={form.summary}
                onChange={(e) => handleChange('summary', e.target.value)}
                rows={3}
                className={cn(inputCls, 'resize-none')}
                placeholder="Summarize the event outcomes, key points, or notes..."
              />
            </FormGroup>

            <div className="grid grid-cols-2 gap-3">
              <FormGroup label="Report Type">
                <select value={form.type} onChange={(e) => handleChange('type', e.target.value)} className={inputCls}>
                  <option value="attendance">Attendance</option>
                  <option value="readiness">Readiness</option>
                  <option value="logistics">Logistics</option>
                  <option value="custom">Custom</option>
                </select>
              </FormGroup>
              <FormGroup label="Format">
                <select value={form.format} onChange={(e) => handleChange('format', e.target.value)} className={inputCls}>
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                  <option value="csv">CSV</option>
                </select>
              </FormGroup>
            </div>

            <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800 space-y-4">
              <ExistingDocumentation
                reportId={report?.id}
                docs={existingDocs}
                removedIds={removedDocIds}
                onRemove={(doc) => setDocPendingRemoval(doc)}
                addToast={addToast}
              />
              <DocumentationUpload
                files={form.documentationFiles}
                onFilesChange={(files) => handleChange('documentationFiles', files)}
              />
            </div>

            {errors.submit && (
              <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-xs text-red-600 dark:text-red-400">
                {errors.submit}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors shadow-sm shadow-indigo-500/20">
              {submitting ? 'Saving...' : report ? 'Update Report' : 'Create Report'}
            </button>
          </div>
        </form>
      </div>

      <ConfirmationDialog
        isOpen={!!docPendingRemoval}
        onClose={() => setDocPendingRemoval(null)}
        onConfirm={() => {
          setRemovedDocIds((prev) => [...prev, docPendingRemoval.id]);
        }}
        title="Remove file?"
        message={
          docPendingRemoval
            ? `"${docPendingRemoval.name || docPendingRemoval.file_name || docPendingRemoval.filename || 'This file'}" will be removed from this report once you save. This can't be undone.`
            : ''
        }
        confirmText="Remove file"
        cancelText="Keep file"
        variant="destructive"
      />
    </div>
  );
}