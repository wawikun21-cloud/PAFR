import { useState, useEffect, useCallback } from 'react';
import { Search, CheckCircle, XCircle, Clock, Edit } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getAttendance, markAttendance } from '@/services/attendanceService';
import { getTrainings } from '@/services/trainingsService';
import { cn } from '@/lib/utils';

export default function Attendance() {
  const { isAdmin } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters
  const [search, setSearch] = useState('');
  const [selectedTraining, setSelectedTraining] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  
  // Trainings for dropdown
  const [trainings, setTrainings] = useState([]);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = {
        page,
        limit,
        search: search || undefined,
        training_id: selectedTraining || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined
      };
      
      const data = await getAttendance(params);
      
      if (data.status === 'success') {
        setAttendanceRecords(data.data?.attendance || []);
        setTotalCount(data.data?.pagination?.total || 0);
      } else {
        setError(data.message || 'Failed to fetch attendance records');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, selectedTraining, statusFilter]);

  const fetchTrainings = async () => {
    try {
      const data = await getTrainings({ limit: 100, status: 'ongoing,upcoming' });
      if (data.status === 'success') {
        setTrainings(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch trainings:', err);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  useEffect(() => {
    fetchTrainings();
  }, []);

  const handleMarkAttendance = async (recordId, newStatus) => {
    try {
      const data = await markAttendance({ id: recordId, status: newStatus });
      if (data.status === 'success') {
        fetchAttendance();
      } else {
        alert(data.message || 'Failed to update attendance');
      }
    } catch {
      alert('Network error. Please try again.');
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Attendance Marking
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Mark and track attendance for trainings and activities
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            />
          </div>
          
          <select
            value={selectedTraining}
            onChange={(e) => setSelectedTraining(e.target.value)}
            className="px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/60"
          >
            <option value="">All Trainings</option>
            {(Array.isArray(trainings) ? trainings : []).map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/60"
          >
            <option value="all">All Status</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="excused">Excused</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Attendance Table */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Reservist
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Training
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Time In
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {attendanceRecords.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center text-neutral-500 dark:text-neutral-400">
                        No attendance records found
                      </td>
                    </tr>
                  ) : (
                    attendanceRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {record.reservist_name || 'Unknown'}
                          </div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            {record.service_number || ''}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">
                          {record.training_title || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">
                          {record.attendance_date ? new Date(record.attendance_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">
                          {record.time_in || 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
                            record.status === 'present' && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                            record.status === 'absent' && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
                            record.status === 'late' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
                            record.status === 'excused' && "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          )}>
                            {record.status || 'pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => handleMarkAttendance(record.id, 'present')}
                                  className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                  title="Mark Present"
                                >
                                  <CheckCircle size={14} />
                                </button>
                                <button
                                  onClick={() => handleMarkAttendance(record.id, 'absent')}
                                  className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                  title="Mark Absent"
                                >
                                  <XCircle size={14} />
                                </button>
                                <button
                                  onClick={() => handleMarkAttendance(record.id, 'late')}
                                  className="p-1.5 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded transition-colors"
                                  title="Mark Late"
                                >
                                  <Clock size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalCount)} of {totalCount} records
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 text-sm">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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
    </div>
  );
}
