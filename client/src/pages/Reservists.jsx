import { useState, useMemo, useEffect, useCallback } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Plus, Loader, Upload, Download } from "lucide-react";
import { getReservists, getReservist, createReservist, updateReservist, deleteReservist, assignReservist } from "@/services/api";
import * as XLSX from "xlsx";
import { PrimaryButton } from "@/components/airbase/AirbaseUI";
import ReservistStatsBar    from "@/components/reservists/ReservistStatsBar";
import ReservistTable       from "@/components/reservists/ReservistTable";
import ReservistModal       from "@/components/reservists/ReservistModal";
import ReservistViewModal from "@/components/reservists/ReservistViewModal";
import BulkUploadModal from "@/components/reservists/BulkUploadModal";
import ReservistDetailPanel from "@/components/reservists/ReservistDetailPanel";
import SearchAndFilters, { DEFAULT_FILTERS } from "@/components/reservists/SearchAndFilters";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const EMPTY_FORM = {
  id: '', userId: '', assignmentId: '',
  firstName: '', lastName: '', serialNo: '', dateEnlisted: '',
  rank: '', status: 'active', squadronId: '', groupId: '', arcen: '', airbase: '',
  specialization: '', civilOccupation: '', contact: '', address: '',
  email: '', password: '', position: '',
  dateOfBirth: '', placeOfBirth: '', age: '', sex: '', civilStatus: '',
  citizenship: 'Filipino', height: '', weight: '', bloodType: '',
  reserveCenter: '', category: '', rankDateOfAppointment: '',
  sourceOfCommission: '', reserveStatus: 'Ready Reserve',
  highestEducation: '', courseDegree: '', school: '', yearGraduated: '',
  employerCompany: '', officeAddress: '',
  basicTraining: '', basicTrainingDateCompleted: '',
  statusBcmt: false, statusAdt: false, statusVadt: false, statusRotc: false, statusOthers: '',
  emergencyContactName: '', emergencyContactNumber: '', emergencyContactAddress: '',
};

export default function Reservists() {
  const { user } = useAuth();
  const { addToast } = useToast();
  // Per RBAC_WORKFLOW.md: POST/PUT/DELETE/bulk-upload reservists is allowed for
  // admin (super admin) and admin_arsen (manages reservists within their ARSEN scope).
  // admin_group and admin_squadron can VIEW the list but cannot create, edit, or delete.
  const canMutate = user?.role === "admin" || user?.role === "admin_arsen";

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  // Pending (un-committed) filter/search values — updated immediately for UI responsiveness
  const [pendingSearch, setPendingSearch] = useState("");
  const [pendingFilters, setPendingFilters] = useState(DEFAULT_FILTERS);
  const debouncedSearch  = useDebounce(pendingSearch,  400);
  const debouncedFilters = useDebounce(pendingFilters, 400);
  const [modal, setModal] = useState({ open: false, mode: "add", row: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [detailRow, setDetailRow] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [reopenPanel, setReopenPanel] = useState(null); // 'detail' | 'view' | null
  const [bulkUploadModal, setBulkUploadModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({ total:0, active:0, bcmt:0, adt:0, vadt:0, rotc:0 });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });

  const formatDate = (val) => {
    if (!val) return '';
    if (typeof val === 'string') {
      return val.slice(0, 10);
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const transformReservistData = (apiData) => {
    return apiData.map(r => ({
      id: r.id,
      userId: r.user_id,
      firstName: r.first_name || '',
      lastName: r.last_name || '',
      serialNo: r.service_number || '',
      rank: r.rank || '',
      status: r.is_active ? 'active' : 'inactive',
      position: r.position || '',
      dateOfBirth: formatDate(r.date_of_birth),
      placeOfBirth: r.place_of_birth || '',
      age: r.age != null ? String(r.age) : '',
      sex: r.sex || '',
      civilStatus: r.civil_status || '',
      citizenship: r.citizenship || 'Filipino',
      height: r.height != null ? String(r.height) : '',
      weight: r.weight != null ? String(r.weight) : '',
      bloodType: r.blood_type || '',
      contact: r.phone_number || '',
      address: r.address || '',
      email: r.email || '',
      reserveCenter: r.reserve_center != null ? String(r.reserve_center) : '',
      category: r.category || '',
      dateEnlisted: formatDate(r.date_enlisted),
      sourceOfCommission: r.source_of_commission || '',
      rankDateOfAppointment: formatDate(r.rank_date_appointment),
      specialization: r.specialization || '',
      reserveStatus: r.reserve_status || 'Ready Reserve',
      highestEducation: r.highest_education || '',
      courseDegree: r.course_degree || '',
      school: r.school || '',
      yearGraduated: r.year_graduated != null ? String(r.year_graduated) : '',
      civilOccupation: r.occupation || '',
      employerCompany: r.employer || '',
      officeAddress: r.office_address || '',
      basicTraining: r.basic_training_completed || '',
      basicTrainingDateCompleted: formatDate(r.basic_training_date),
      statusBcmt: !!r.status_bcmt,
      statusAdt: !!r.status_adt,
      statusVadt: !!r.status_vadt,
      statusRotc: !!r.status_rotc,
      statusOthers: r.status_others || '',
      emergencyContactName: r.emergency_contact_name || '',
      emergencyContactNumber: r.emergency_contact_phone || '',
      emergencyContactAddress: r.emergency_contact_address || '',
      assignmentId: r.assignment_id || '',
      squadronId: r.squadron_id != null ? String(r.squadron_id) : '',
      groupId: r.group_id != null ? String(r.group_id) : '',
      squadron: r.squadron_name || '',
      group: r.group_name || '',
      arcen: r.arcen_name || '',
      airbase: r.squadron_location || '',
    }));
  };

  // Debounce filter/search changes — wait 400 ms after the last change before fetching.
  // This prevents an API call on every keystroke or every select interaction.
  // useDebounce already delays these values by 400 ms — this effect fires
  // only once the user has stopped typing/selecting for 400 ms.
  useEffect(() => {
    setSearch(debouncedSearch);
    setFilters(debouncedFilters);
    loadReservists(1, debouncedSearch, debouncedFilters);
  }, [debouncedSearch, debouncedFilters]);

  const loadReservists = async (page = 1, searchOverride, filtersOverride) => {
    setLoading(true);
    setCurrentPage(page);
    try {
      // Use override values when called from debounce (avoids stale closure),
      // fall back to committed state for direct calls (pagination, post-save reload).
      const f = filtersOverride ?? filters;
      const q = searchOverride  ?? search;
      const params = { page, limit: 100 };
      if (q)                                        params.search             = q;
      if (f.status          && f.status !== 'all') params.status             = f.status;
      if (f.arsenId)                               params.arsen_id           = parseInt(f.arsenId, 10);
      if (f.groupId)                               params.group_id           = parseInt(f.groupId, 10);
      if (f.squadronId)                            params.squadron_id        = parseInt(f.squadronId, 10);
      if (f.rank)                                  params.rank               = f.rank;
      if (f.reserveStatus)                         params.reserve_status     = f.reserveStatus;
      if (f.specialization)                        params.specialization     = f.specialization;
      if (f.category)                              params.category           = f.category;
      if (f.sourceOfCommission)                    params.sourceOfCommission = f.sourceOfCommission;
      if (f.bloodType)                             params.bloodType          = f.bloodType;
      if (f.sex)                                   params.sex                = f.sex;
      if (f.civilStatus)                           params.civilStatus        = f.civilStatus;
      const response = await getReservists(params);
      if (response.data.status === 'success') {
        setData(transformReservistData(response.data.data));
        setTotalPages(response.data.pagination?.pages || 1);
        setTotalCount(response.data.pagination?.total || 0);
        if (response.data.stats) setStats(response.data.stats);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load reservists', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Server handles all filtering — data already contains only matching records.
  // Keep filteredData as an alias so downstream JSX needs no changes.
  const filteredData = data;

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setModal({ open: true, mode: "add", row: null });
  };

  const openEdit = (row, reopenAs = null) => {
    setForm({
      ...EMPTY_FORM,
      id: row.id || '',
      userId: row.userId || '',
      assignmentId: row.assignmentId || '',
      firstName: row.firstName || '',
      lastName: row.lastName || '',
      serialNo: row.serialNo || '',
      dateEnlisted: row.dateEnlisted || '',
      rank: row.rank || '',
      status: row.status || 'active',
      position: row.position || '',
      squadronId: row.squadronId != null ? String(row.squadronId) : '',
      groupId: row.groupId != null ? String(row.groupId) : '',
      arcen: row.arcen || '',
      airbase: row.airbase || '',
      specialization: row.specialization || '',
      civilOccupation: row.civilOccupation || '',
      contact: row.contact || '',
      address: row.address || '',
      email: row.email || '',
      dateOfBirth: row.dateOfBirth || '',
      placeOfBirth: row.placeOfBirth || '',
      age: row.age != null ? String(row.age) : '',
      sex: row.sex || '',
      civilStatus: row.civilStatus || '',
      citizenship: row.citizenship || 'Filipino',
      height: row.height != null ? String(row.height) : '',
      weight: row.weight != null ? String(row.weight) : '',
      bloodType: row.bloodType || '',
      reserveCenter: row.reserveCenter != null ? String(row.reserveCenter) : '',
      category: row.category || '',
      rankDateOfAppointment: row.rankDateOfAppointment || '',
      sourceOfCommission: row.sourceOfCommission || '',
      reserveStatus: row.reserveStatus || 'Ready Reserve',
      highestEducation: row.highestEducation || '',
      courseDegree: row.courseDegree || '',
      school: row.school || '',
      yearGraduated: row.yearGraduated != null ? String(row.yearGraduated) : '',
      employerCompany: row.employerCompany || '',
      officeAddress: row.officeAddress || '',
      basicTraining: row.basicTraining || '',
      basicTrainingDateCompleted: row.basicTrainingDateCompleted || '',
      statusBcmt: !!row.statusBcmt,
      statusAdt: !!row.statusAdt,
      statusVadt: !!row.statusVadt,
      statusRotc: !!row.statusRotc,
      statusOthers: row.statusOthers || '',
      emergencyContactName: row.emergencyContactName || '',
      emergencyContactNumber: row.emergencyContactNumber || '',
      emergencyContactAddress: row.emergencyContactAddress || '',
    });
    setModal({ open: true, mode: "edit", row });
    setDetailRow(null);
    setViewRow(null);
    setReopenPanel(reopenAs);
  };

  const closeModal = () => {
    setModal((m) => ({ ...m, open: false }));
    setReopenPanel(null);
  };

const handleSubmit = async () => {
    try {
      if (modal.mode === "add") {
        const requestData = {
          email: form.email || `${form.firstName.toLowerCase()}.${form.lastName.toLowerCase()}@example.com`,
          password: form.password || 'password123',
          first_name: form.firstName,
          last_name: form.lastName,
          service_number: form.serialNo,
          rank: form.rank,
          position: form.position,
          phone_number: form.contact,
          address: form.address,
          specialization: form.specialization,
          occupation: form.civilOccupation,
          date_of_birth: form.dateOfBirth || null,
          place_of_birth: form.placeOfBirth || null,
          age: form.age ? parseInt(form.age, 10) : null,
          sex: form.sex || null,
          civil_status: form.civilStatus || null,
          citizenship: form.citizenship || 'Filipino',
          height: form.height ? parseFloat(form.height) : null,
          weight: form.weight ? parseFloat(form.weight) : null,
          blood_type: form.bloodType || null,
          reserve_center: form.reserveCenter || null,
          category: form.category || null,
          date_enlisted: form.dateEnlisted || null,
          source_of_commission: form.sourceOfCommission || null,
          rank_date_appointment: form.rankDateOfAppointment || null,
          reserve_status: form.reserveStatus || 'Ready Reserve',
          highest_education: form.highestEducation || null,
          course_degree: form.courseDegree || null,
          school: form.school || null,
          year_graduated: form.yearGraduated ? parseInt(form.yearGraduated, 10) : null,
          employer: form.employerCompany || null,
          office_address: form.officeAddress || null,
          basic_training_completed: form.basicTraining || null,
          basic_training_date: form.basicTrainingDateCompleted || null,
          status_bcmt: form.statusBcmt ? 1 : 0,
          status_adt: form.statusAdt ? 1 : 0,
          status_vadt: form.statusVadt ? 1 : 0,
          status_rotc: form.statusRotc ? 1 : 0,
          status_others: form.statusOthers || null,
          emergency_contact_name: form.emergencyContactName || null,
          emergency_contact_phone: form.emergencyContactNumber || null,
          emergency_contact_address: form.emergencyContactAddress || null,
          group_id: form.groupId || null,
          squadron_id: form.squadronId || null,
        };

        const response = await createReservist(requestData);
        if (response.data.status === 'success') {
          setData((prev) => [...prev, transformReservistData([response.data.data])[0]]);
          addToast('Reservist created successfully', 'success');
        }
      } else {
        const requestData = {
          first_name: form.firstName || null,
          last_name: form.lastName || null,
          rank: form.rank || null,
          position: form.position || null,
          phone_number: form.contact || null,
          address: form.address || null,
          specialization: form.specialization || null,
          occupation: form.civilOccupation || null,
          date_of_birth: form.dateOfBirth || null,
          place_of_birth: form.placeOfBirth || null,
          age: form.age ? parseInt(form.age, 10) : null,
          sex: form.sex || null,
          civil_status: form.civilStatus || null,
          citizenship: form.citizenship || 'Filipino',
          height: form.height ? parseFloat(form.height) : null,
          weight: form.weight ? parseFloat(form.weight) : null,
          blood_type: form.bloodType || null,
          reserve_center: form.reserveCenter || null,
          category: form.category || null,
          date_enlisted: form.dateEnlisted || null,
          source_of_commission: form.sourceOfCommission || null,
          rank_date_appointment: form.rankDateOfAppointment || null,
          reserve_status: form.reserveStatus || 'Ready Reserve',
          highest_education: form.highestEducation || null,
          course_degree: form.courseDegree || null,
          school: form.school || null,
          year_graduated: form.yearGraduated ? parseInt(form.yearGraduated, 10) : null,
          employer: form.employerCompany || null,
          office_address: form.officeAddress || null,
          basic_training_completed: form.basicTraining || null,
          basic_training_date: form.basicTrainingDateCompleted || null,
          status_bcmt: form.statusBcmt ? 1 : 0,
          status_adt: form.statusAdt ? 1 : 0,
          status_vadt: form.statusVadt ? 1 : 0,
          status_rotc: form.statusRotc ? 1 : 0,
          status_others: form.statusOthers || null,
          emergency_contact_name: form.emergencyContactName || null,
          emergency_contact_phone: form.emergencyContactNumber || null,
          emergency_contact_address: form.emergencyContactAddress || null,
          group_id: form.groupId || null,
          squadron_id: form.squadronId || null,
        };
        const reservistId = modal.row.id;
        const response = await updateReservist(reservistId, requestData);
        if (response.data.status === 'success') {
          // The core PUT /:id route only touches the reservists table — Group/
          // Squadron assignment lives in a separate reservist_assignments table
          // and is only ever changed via POST /:id/assign. Without this call,
          // any Group/Squadron edit made in the form is silently dropped.
          if (form.groupId && form.squadronId) {
            try {
              await assignReservist(reservistId, {
                group_id: Number(form.groupId),
                squadron_id: Number(form.squadronId),
              });
            } catch (assignErr) {
              // 409 just means it's already assigned to that exact group/squadron —
              // not a real failure, so don't surface it as one.
              if (assignErr.response?.status !== 409) {
                addToast(assignErr.response?.data?.message || 'Failed to update assignment', 'error');
              }
            }
          }

          // Re-fetch this single record so the response reflects both the
          // profile update above and any assignment change just made.
          const freshResponse = await getReservist(reservistId);
          const updatedReservist = transformReservistData([freshResponse.data.data])[0];
          await loadReservists(currentPage);
          // Sync open panels to the freshly-loaded record.
          if (reopenPanel === 'detail') setDetailRow(updatedReservist);
          if (reopenPanel === 'view') setViewRow(updatedReservist);
          addToast('Reservist updated successfully', 'success');
        }
      }
      closeModal();
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.errors && Array.isArray(errorData.errors)) {
        addToast(errorData.errors.map(e => e.msg || e.path).join(', '), 'error');
      } else {
        addToast(errorData?.message || 'Operation failed', 'error');
      }
    }
  };

  const handleDelete = async (id) => {
    setDeleteConfirm({ open: true, id });
  };

  const confirmDelete = async () => {
    const { id } = deleteConfirm;
    setDeleteConfirm({ open: false, id: null });
    try {
      await deleteReservist(id);
      setData((prev) => prev.filter((r) => r.id !== id));
      if (detailRow?.id === id) setDetailRow(null);
      addToast('Reservist deleted successfully', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const toggleStatus = async (id) => {
    try {
      const reservist = data.find(r => r.id === id);
      const response = await updateReservist(id, {
        is_active: reservist.status !== 'active'
      });
      if (response.data.status === 'success') {
        const updatedReservist = transformReservistData([response.data.data])[0];
        await loadReservists(currentPage);
        if (detailRow?.id === id) setDetailRow(updatedReservist);
        addToast('Reservist status updated successfully', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Status update failed', 'error');
    }
  };

  const handleExport = () => {
    const exportData = filteredData.map((r, idx) => ({
      'No.': idx + 1,
      'Serial No.': r.serialNo,
      'Last Name': r.lastName,
      'First Name': r.firstName,
      'Rank': r.rank,
      'Status': r.status,
      'Squadron': r.squadron,
      'Group': r.group,
      'ARCEN': r.arcen,
      'Contact': r.contact,
      'Email': r.email,
      'Date Enlisted': r.dateEnlisted,
      'Specialization': r.specialization,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reservists');
    XLSX.writeFile(wb, `reservists_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      {loading && (
        <div className="flex h-40 items-center justify-center">
          <Loader className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      )}

      {!loading && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              {canMutate && (
                <PrimaryButton icon={Upload} onClick={() => setBulkUploadModal(true)} variant="secondary" className="flex-1 sm:flex-none">
                  <span className="hidden sm:inline">Bulk Upload</span>
                  <span className="sm:hidden">Upload</span>
                </PrimaryButton>
              )}
              <PrimaryButton icon={Download} onClick={handleExport} variant="secondary" className="flex-1 sm:flex-none">
                <span className="hidden sm:inline">Export All</span>
                <span className="sm:hidden">Export</span>
              </PrimaryButton>
              {canMutate && (
                <PrimaryButton icon={Plus} onClick={openAdd} className="flex-1 sm:flex-none">
                  <span className="hidden sm:inline">Add Reservist</span>
                  <span className="sm:hidden">Add</span>
                </PrimaryButton>
              )}
            </div>

            <ReservistStatsBar stats={stats} />

<SearchAndFilters
              search={pendingSearch}
              onSearchChange={setPendingSearch}
              filters={pendingFilters}
              onFiltersChange={setPendingFilters}
              resultCount={filteredData.length}
            />

            <ReservistTable
              data={filteredData}
              onView={setViewRow}
              onEdit={canMutate ? openEdit : null}
              onDelete={canMutate ? handleDelete : null}
              onToggleStatus={canMutate ? toggleStatus : null}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-500">
                <div>
                  Showing {(currentPage - 1) * 100 + 1}–{Math.min(currentPage * 100, totalCount)} of {totalCount}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadReservists(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1 disabled:opacity-40 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    ← Prev
                  </button>
                  <span className="px-2 tabular-nums">Page {currentPage} / {totalPages}</span>
                  <button
                    onClick={() => loadReservists(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1 disabled:opacity-40 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {canMutate && (
            <ReservistModal
              open={modal.open}
              mode={modal.mode}
              form={form}
              onChange={setForm}
              onClose={closeModal}
              onSubmit={handleSubmit}
            />
          )}

          {canMutate && (
            <BulkUploadModal
              isOpen={bulkUploadModal}
              onClose={() => setBulkUploadModal(false)}
              onSuccess={loadReservists}
            />
          )}

          {detailRow && (
            <ReservistDetailPanel
              reservist={detailRow}
              onClose={() => setDetailRow(null)}
              onEdit={canMutate ? () => openEdit(detailRow, 'detail') : null}
            />
          )}

          <ReservistViewModal
            reservist={viewRow}
            onClose={() => setViewRow(null)}
            onEdit={canMutate ? (row) => { setViewRow(null); openEdit(row, 'view'); } : null}
          />

          <ConfirmDialog
            open={deleteConfirm.open}
            title="Delete Reservist"
            description="This action cannot be undone. Are you sure you want to delete this reservist?"
            confirmLabel="Delete"
            destructive
            onConfirm={confirmDelete}
            onCancel={() => setDeleteConfirm({ open: false, id: null })}
          />
        </>
      )}
    </div>
  );
}