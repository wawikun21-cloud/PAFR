import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit, Trash2, FileText, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { getReports, getReportById, deleteReport } from '@/services/reportsService';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ReportForm from '@/components/reports/ReportForm';
import ReportDetailsModal from '@/components/reports/ReportDetailsModal';
import { cn } from '@/lib/utils';

export default function Reports() {
  const { isAnyAdmin } = useAuth();
  const { addToast } = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const [showForm, setShowForm] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [viewingReport, setViewingReport] = useState(null);
  const [viewingLoading, setViewingLoading] = useState(false);
  const [editLoadingId, setEditLoadingId] = useState(null);

  const searchRef = useRef(null);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [search]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit,
        search: debouncedSearch || undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
      };
      const result = await getReports(params);
      if (result.success) {
        setReports(result.data?.reports || []);
        setTotalCount(result.data?.pagination?.total || 0);
      } else {
        setError(result.message || 'Failed to fetch reports');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, typeFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilter]);

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingReport(null);
  };

  const handleFormSubmit = () => {
    setShowForm(false);
    setEditingReport(null);
    fetchReports();
  };

  const handleEditReport = async (report) => {
    setEditingReport(null);
    setEditLoadingId(report.id);
    try {
      const result = await getReportById(report.id);
      if (result.success && result.data) {
        setEditingReport(result.data);
        setShowForm(true);
      } else {
        addToast(result.message || 'Failed to load report details', 'error');
      }
    } catch {
      addToast('Network error. Could not load report.', 'error');
    } finally {
      setEditLoadingId(null);
    }
  };

  const handleViewReport = async (report) => {
    setViewingReport(report);
    setViewingLoading(true);
    try {
      const result = await getReportById(report.id);
      if (result.success && result.data) {
        setViewingReport(result.data);
      } else {
        addToast(result.message || 'Failed to load report details', 'error');
      }
    } catch {
      addToast('Network error. Could not load report.', 'error');
    } finally {
      setViewingLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setViewingReport(null);
    setViewingLoading(false);
  };

  const handleEditFromDetails = () => {
    const report = viewingReport;
    handleCloseDetails();
    setEditingReport(report);
    setShowForm(true);
  };

  const handleDeleteFromDetails = () => {
    const report = viewingReport;
    handleCloseDetails();
    setDeleteTarget(report);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const result = await deleteReport(deleteTarget.id);
      if (result.success) {
        addToast('Report deleted successfully', 'success');
        setDeleteTarget(null);
        fetchReports();
      } else {
        addToast(result.message || 'Failed to delete report', 'error');
      }
    } catch {
      addToast('Network error. Please try again.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  const typeStyles = {
    attendance: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    readiness: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    logistics: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    custom: 'bg-neutral-50 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700',
  };

  return (
    <div className="space-y-6">
      {/* ── Actions ── */}
      {isAnyAdmin && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => { setEditingReport(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold"
          >
            <Plus size={16} />
            Create Report
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports..."
            className="w-full px-3 py-2 pl-9 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all cursor-pointer"
        >
          <option value="all">All Types</option>
          <option value="attendance">Attendance</option>
          <option value="readiness">Readiness</option>
          <option value="logistics">Logistics</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reports.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                <div className="text-neutral-400 dark:text-neutral-500 mb-2">
                  <FileText className="h-12 w-12 mx-auto" />
                </div>
                <p className="text-neutral-500 dark:text-neutral-400">No reports found</p>
                {isAnyAdmin && (
                  <button
                    type="button"
                    onClick={() => { setEditingReport(null); setShowForm(true); }}
                    className="mt-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Create your first report
                  </button>
                )}
              </div>
            ) : (
              reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  isAnyAdmin={isAnyAdmin}
                  editLoading={editLoadingId === report.id}
                  onView={() => handleViewReport(report)}
                  onEdit={() => handleEditReport(report)}
                  onDelete={() => setDeleteTarget(report)}
                />
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, totalCount)} of {totalCount} reports
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 text-sm">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showForm && (
        <ReportForm
          report={editingReport}
          onClose={handleCloseForm}
          onSubmit={handleFormSubmit}
        />
      )}

      {viewingReport && (
        <ReportDetailsModal
          report={viewingReport}
          loading={viewingLoading}
          isAnyAdmin={isAnyAdmin}
          onClose={handleCloseDetails}
          onEdit={handleEditFromDetails}
          onDelete={handleDeleteFromDetails}
          addToast={addToast}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete report?"
        description={deleteTarget ? `"${deleteTarget.title}" will be permanently removed. This action cannot be undone.` : ''}
        confirmLabel="Delete report"
        cancelLabel="Keep report"
        destructive
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => !deleteLoading && setDeleteTarget(null)}
      />
    </div>
  );
}

function ReportCard({ report, isAnyAdmin, editLoading, onView, onEdit, onDelete }) {
  const typeStyles = {
    attendance: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    readiness: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    logistics: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    custom: 'bg-neutral-50 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700',
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onView}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onView?.(); } }}
      className={cn(
      'relative flex flex-col gap-4 rounded-xl p-5 cursor-pointer',
      'border border-neutral-200 dark:border-neutral-800',
      'bg-white dark:bg-neutral-900',
      'hover:border-neutral-300 dark:hover:border-neutral-700',
      'hover:shadow-lg dark:hover:shadow-none',
      'transition-all duration-200'
    )}>
      <span className={cn(
        'absolute top-3 right-3 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide',
        report.event_type === 'external'
          ? 'bg-violet-50 text-violet-600 border border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20'
          : 'bg-sky-50 text-sky-600 border border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20'
      )}>
        {report.event_type === 'external' ? 'External' : 'Internal'}
      </span>

      <div className="pr-16">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 truncate">
          {report.title}
        </h3>
        {report.event_date && (
          <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            <Calendar size={12} />
            {new Date(report.event_date).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border',
          typeStyles[report.type] || typeStyles.custom
        )}>
          {report.type}
        </span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-neutral-50 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700 uppercase">
          {report.format}
        </span>
      </div>

      {report.summary && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
          {report.summary}
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
          {report.created_at ? new Date(report.created_at).toLocaleDateString() : 'N/A'}
        </p>
        {isAnyAdmin && (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              disabled={editLoading}
              className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
              title="Edit"
            >
              {editLoading ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
              ) : (
                <Edit size={14} className="text-neutral-500" />
              )}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              title="Delete"
            >
              <Trash2 size={14} className="text-red-500" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}