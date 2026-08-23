import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Calendar, MapPin, AlertCircle, ScanLine, ClipboardList, Wifi, WifiOff } from 'lucide-react';
import AttendanceDashboard from '@/components/trainings/AttendanceDashboard';
import AttendanceScanner from '@/components/trainings/AttendanceScanner';
import AttendanceList from '@/components/trainings/AttendanceList';
import {
  scanInternalTraining,
  scanExternalTraining,
  manualCheckInInternal,
  manualCheckInExternal,
  getInternalAttendance,
  getExternalAttendance,
  updateAttendanceStatus,
  getMyAttendance,
} from '@/services/attendanceApiService';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeScannedQR } from '@/lib/qr';

export default function Attendance() {
  const { isReservist } = useAuth();
  const [view, setView] = useState('dashboard');
  const [eventType, setEventType] = useState('internal');
  const [trainingId, setTrainingId] = useState(null);
  const [training, setTraining] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('scan');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [personalAttendance, setPersonalAttendance] = useState([]);
  const [loadingPersonal, setLoadingPersonal] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const urlEventType = urlParams.get('type') || 'internal';
  const urlTrainingId = urlParams.get('trainingId') ? Number(urlParams.get('trainingId')) : null;

  useEffect(() => {
    if (urlTrainingId) {
      setEventType(urlEventType);
      setTrainingId(urlTrainingId);
      setView('event');
    }
  }, [urlTrainingId, urlEventType]);

  const loadPersonalAttendance = useCallback(async () => {
    setLoadingPersonal(true);
    setError(null);
    try {
      const res = await getMyAttendance();
      setPersonalAttendance(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load personal attendance');
    } finally {
      setLoadingPersonal(false);
    }
  }, []);

  useEffect(() => {
    if (isReservist && view === 'dashboard') {
      loadPersonalAttendance();
    }
  }, [isReservist, view, loadPersonalAttendance]);

  const loadAttendance = useCallback(async () => {
    if (!trainingId) return;
    setLoading(true);
    setError(null);
    try {
      let response;
      if (eventType === 'internal') {
        response = await getInternalAttendance(trainingId);
      } else {
        response = await getExternalAttendance(trainingId);
      }
      const data = response.data?.data;
      if (data) {
        setTraining(data.training);
        setParticipants(data.participants || data.attendees || []);
        setStats(data.stats);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [trainingId, eventType]);

  useEffect(() => {
    if (trainingId && view === 'event') {
      loadAttendance();
    }
  }, [trainingId, view, loadAttendance]);

  useEffect(() => {
    if (view === 'event' && activeTab === 'list' && autoRefresh && trainingId) {
      const interval = setInterval(loadAttendance, 10000);
      return () => clearInterval(interval);
    }
  }, [view, activeTab, autoRefresh, trainingId, loadAttendance]);

  const handleSelectEvent = async (type, id, eventData) => {
    setEventType(type);
    setTrainingId(id);
    setTraining(eventData);
    setView('event');
    setActiveTab('scan');
    setError(null);
  };

  const handleScan = async (qrCode, scanMethod) => {
    const token = normalizeScannedQR(qrCode);
    let response;
    if (eventType === 'internal') {
      response = await scanInternalTraining(trainingId, token, scanMethod);
    } else {
      response = await scanExternalTraining(trainingId, token, scanMethod);
    }
    await loadAttendance();
    return response?.data?.data;
  };

  const handleStatusChange = async (attendanceId, newStatus) => {
    await updateAttendanceStatus(attendanceId, eventType, newStatus);
    await loadAttendance();
  };

  const handleManualCheckIn = async (reservistId, registrationId, status) => {
    if (eventType === 'internal') {
      await manualCheckInInternal(trainingId, reservistId, status);
    } else {
      // For external trainings, pass both reservist_id and registration_id
      await manualCheckInExternal(trainingId, reservistId, registrationId, status);
    }
    await loadAttendance();
  };

  const handleBack = () => {
    setView('dashboard');
    setTrainingId(null);
    setTraining(null);
    setParticipants([]);
    setStats(null);
    setError(null);
    window.history.replaceState({}, '', window.location.pathname);
  };

  if (view === 'dashboard') {
    if (isReservist) {
      return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">My Attendance</h1>
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                    <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Training</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {loadingPersonal ? (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-neutral-500">Loading...</td></tr>
                  ) : personalAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-12 text-center text-neutral-500">
                        No attendance records found.
                      </td>
                    </tr>
                  ) : (
                    personalAttendance.map((record) => (
                      <tr key={record.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                        <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">{record.training_title}</td>
                        <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                          {record.start_datetime
                            ? new Date(record.start_datetime).toLocaleDateString()
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            record.status === 'present' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' :
                            record.status === 'absent' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' :
                            record.status === 'late' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' :
                            record.status === 'excused' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' :
                            'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <AttendanceDashboard onSelectEvent={handleSelectEvent} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Attendance</h1>
            {training && (
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                <span className="font-medium text-neutral-700 dark:text-neutral-300">{training.title}</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {training.start_datetime
                    ? new Date(training.start_datetime).toLocaleDateString()
                    : training.start_date}
                </span>
                {training.venue && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {training.venue}
                  </span>
                )}
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  training.status === 'ongoing' || training.status === 'open'
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}>
                  {training.status}
                </span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  eventType === 'internal'
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                    : 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
                }`}>
                  {eventType}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'list' && (
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                autoRefresh
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              {autoRefresh ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 text-center">
            <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50">{stats.total_participants || stats.total_attendees || 0}</p>
            <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase">Total</p>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 text-center">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stats.present_count || 0}</p>
            <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase">Present</p>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 text-center">
            <p className="text-lg font-bold text-red-600 dark:text-red-400">{stats.absent_count || 0}</p>
            <p className="text-[10px] font-medium text-red-600 dark:text-red-400 uppercase">Absent</p>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 text-center">
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{stats.late_count || 0}</p>
            <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase">Late</p>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 text-center">
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.excused_count || 0}</p>
            <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase">Excused</p>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 text-center">
            <p className="text-lg font-bold text-neutral-500 dark:text-neutral-400">{stats.pending_count || 0}</p>
            <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase">Pending</p>
          </div>
        </div>
      )}

      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-700">
        <button
          onClick={() => setActiveTab('scan')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'scan'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <span className="flex items-center gap-2">
            <ScanLine className="h-4 w-4" />
            Scan
          </span>
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'list'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <span className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Attendance List
          </span>
        </button>
      </div>

      {activeTab === 'scan' && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">QR Code Scanning</h2>
          <AttendanceScanner
            onScan={handleScan}
            disabled={loading}
          />
        </div>
      )}

      {activeTab === 'list' && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Attendance Records</h2>
          <AttendanceList
            eventType={eventType}
            training={training}
            participants={participants}
            stats={null}
            loading={loading}
            onStatusChange={handleStatusChange}
            onManualCheckIn={handleManualCheckIn}
            autoRefresh={autoRefresh}
            onRefresh={loadAttendance}
          />
        </div>
      )}
    </div>
  );
}
