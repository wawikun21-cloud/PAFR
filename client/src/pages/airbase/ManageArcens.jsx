import { useState, useEffect } from "react";
import {
  Shield, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

import ManagementTable from "@/components/airbase/ManagementTable";
import { StatusBadge, MonoCode, PrimaryButton } from "@/components/airbase/AirbaseUI";
import AddEditModal, { FormField, FormInput, FormSelect } from "@/components/airbase/AddEditModal";
import DetailModal, { DetailSection, DetailRow, DetailStatCard } from "@/components/airbase/DetailModal";
import { getGroups, createArsen, updateArsen, deleteArsen } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const EMPTY_FORM = { name: "", code: "", commander: "", location: "", status: "active" };

const COLUMNS = [
  { key: "name",       label: "ARCEN",      sortable: true },
  { key: "code",       label: "Code",       sortable: true },
  { key: "commander",  label: "Commander",  sortable: true },
  { key: "location",   label: "Location",   sortable: true },
  { key: "groups",     label: "Groups",     sortable: true },
  { key: "squadrons",  label: "Squadrons",  sortable: true },
  { key: "reservists", label: "Reservists", sortable: true },
  { key: "status",     label: "Status",     sortable: false },
];

export default function ManageArcens() {
  const { user } = useAuth();
  // ARSENs can only be created/edited/deleted by the super admin (role === 'admin')
  // per RBAC_WORKFLOW.md — all other roles (including admin_arsen) are read-only here
  const canMutate = user?.role === "admin";

  const [data, setData] = useState([]);
  const [detail, setDetail] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [editMode, setEditMode] = useState("add");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editRow, setEditRow] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { addToast: toast } = useToast();

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      const response = await getGroups({ hierarchical: true });
      if (response.data.status === 'success') {
        const transformed = transformApiData(response.data.data);
        setData(transformed);
      }
    } catch (err) {
      console.error('Failed to fetch hierarchy:', err);
    }
  };

  function transformApiData(apiData) {
    if (!apiData?.airbase?.arcens) return [];
    return apiData.airbase.arcens.map(arcen => ({
      id: `arcen-${arcen.id}`,
      dbId: arcen.id,
      name: arcen.name,
      code: arcen.code,
      commander: arcen.commander || '',
      location: arcen.location || '',
      reservists: arcen.reservists || 0,
      groups: arcen.groups?.length || 0,
      squadrons: arcen.groups?.reduce((a, g) => a + (g.squadrons?.length || 0), 0) || 0,
      status: arcen.is_active ? "active" : "inactive",
    }));
  }

  const openDetail = (row) => setDetail(row);
  const closeDetail = () => setDetail(null);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setApiError(null);
    setEditMode("add");
    setEditModal(true);
  };

  const openEdit = (row) => {
    setForm({ name: row.name, code: row.code, commander: row.commander, location: row.location, status: row.status });
    setErrors({});
    setApiError(null);
    setEditMode("edit");
    setEditRow(row);
    setEditModal(true);
    setDetail(null);
  };

  const closeEdit = () => {
    setEditModal(false);
    setErrors({});
    setApiError(null);
    setEditRow(null);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!form.name?.trim()) newErrors.name = "ARCEN Name is required";
    if (!form.code?.trim()) newErrors.code = "Code is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getErrorMessage = (err) => {
    const data = err?.response?.data;
    if (data?.code === 'DUPLICATE_CODE') return "This code is already in use. Please use a unique code.";
    if (data?.errors?.length > 0) {
      return data.errors.map(e => e.msg).join(' ');
    }
    return data?.message || err.message || 'An unexpected error occurred';
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    setApiError(null);

    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        location: form.location.trim() || null,
        commander_name: form.commander.trim() || null,
      };

      if (editMode === "add") {
        const response = await createArsen(payload);
        if (response.data.status === 'success') {
          await fetchData();
          closeEdit();
          toast("ARCEN created successfully", "success");
        }
      } else if (editRow) {
        const response = await updateArsen(editRow.dbId, {
          ...payload,
          is_active: form.status === "active"
        });
        if (response.data.status === 'success') {
          await fetchData();
          closeEdit();
          toast("ARCEN updated successfully", "success");
        }
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      setApiError(msg);
      toast(msg, "error");
      console.error('Failed to save ARCEN:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteDialog = (row) => setDeleteTarget(row);

  const cancelDelete = () => {
    if (!deleteLoading) setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const response = await deleteArsen(deleteTarget.dbId);
      if (response.data.status === 'success') {
        setData((prev) => prev.map((r) => r.id === deleteTarget.id ? { ...r, status: "inactive" } : r));
        closeDetail();
        setDeleteTarget(null);
        toast(`${deleteTarget.name} deleted successfully`, "success");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to delete ARCEN';
      toast(msg, "error");
      console.error('Failed to delete ARCEN:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleStatus = async (row) => {
    try {
      const response = await updateArsen(row.dbId, {
        code: row.code,
        name: row.name,
        location: row.location,
        commander_name: row.commander,
        is_active: row.status !== "active"
      });
      if (response.data.status === 'success') {
        const updated = { ...row, status: row.status === "active" ? "inactive" : "active" };
        setData((prev) => prev.map((r) => r.id === row.id ? updated : r));
        setDetail(updated);
        toast(`${row.name} ${updated.status === "active" ? "activated" : "deactivated"} successfully`, "success");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to toggle status";
      toast(msg, "error");
      console.error('Failed to toggle status:', err);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex justify-end">
        {canMutate && (
          <PrimaryButton icon={Plus} onClick={openAdd}>Add ARCEN</PrimaryButton>
        )}
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Total ARCENs",     value: data.length },
          { label: "Active",           value: data.filter((r) => r.status === "active").length,   color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Inactive",         value: data.filter((r) => r.status === "inactive").length, color: "text-neutral-400" },
          { label: "Total Reservists", value: data.reduce((a, r) => a + r.reservists, 0).toLocaleString() },
        ].map((s) => (
          <div key={s.label} className={cn(
            "flex flex-col rounded-xl border px-4 py-2.5 min-w-[120px]",
            "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
          )}>
            <span className={cn("text-xl font-bold leading-none", s.color ?? "text-neutral-900 dark:text-neutral-50")}>{s.value}</span>
            <span className="mt-0.5 text-[10px] text-neutral-400">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <ManagementTable
        columns={COLUMNS}
        data={data}
        searchKeys={["name", "code", "commander", "location"]}
        searchPlaceholder="Search ARCEN name, commander, location..."
        emptyMessage="No ARCENs found."
        renderRow={(row) => (
          <tr
            key={row.id}
            onClick={() => openDetail(row)}
            className="group cursor-pointer hover:bg-indigo-50/60 dark:hover:bg-indigo-500/5 transition-colors duration-100"
          >
            <td className="px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-bold text-neutral-800 dark:text-neutral-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                  {row.name}
                </span>
              </div>
            </td>
            <td className="px-4 py-3"><MonoCode>{row.code}</MonoCode></td>
            <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">{row.commander}</td>
            <td className="px-4 py-3">
              <span className="flex items-center gap-1 text-xs text-neutral-500">
                <MapPin size={11} className="shrink-0 text-neutral-400" /> {row.location}
              </span>
            </td>
            <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{row.groups}</td>
            <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{row.squadrons}</td>
            <td className="px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">{row.reservists.toLocaleString()}</td>
            <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
          </tr>
        )}
      />

      {/* Detail Modal */}
      {detail && (
        <DetailModal
          open={!!detail}
          onClose={closeDetail}
          icon={Shield}
          iconColor="bg-indigo-600"
          title={detail.name}
          badge={detail.code}
          size="lg"
          footer={
            canMutate && (
              <div className="flex w-full flex-wrap items-center justify-between gap-2">
                {/* Left - destructive */}
                <button
                  onClick={() => openDeleteDialog(detail)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium",
                    "border-red-200 dark:border-red-500/30",
                    "text-red-600 dark:text-red-400",
                    "hover:bg-red-50 dark:hover:bg-red-500/10",
                    "transition-all duration-150"
                  )}
                >
                  <Trash2 size={14} /> Delete
                </button>

                {/* Right - secondary + primary */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => toggleStatus(detail)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium",
                      "border-neutral-200 dark:border-neutral-700",
                      "text-neutral-600 dark:text-neutral-400",
                      "hover:bg-neutral-50 dark:hover:bg-neutral-800",
                      "transition-all duration-150"
                    )}
                  >
                    {detail.status === "active"
                      ? <><ToggleRight size={14} className="text-emerald-500" /> Deactivate</>
                      : <><ToggleLeft  size={14} className="text-neutral-400" /> Activate</>
                    }
                  </button>
                  <button
                    onClick={() => openEdit(detail)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
                      "bg-indigo-600 text-white",
                      "hover:bg-indigo-700 active:bg-indigo-800",
                      "shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30",
                      "transition-all duration-150"
                    )}
                  >
                    <Pencil size={14} /> Edit ARCEN
                  </button>
                </div>
              </div>
            )
          }
        >
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
            <DetailStatCard label="Reservists"  value={detail.reservists.toLocaleString()} color="text-indigo-600 dark:text-indigo-400" />
            <DetailStatCard label="Groups"      value={detail.groups}     color="text-blue-600 dark:text-blue-400" />
            <DetailStatCard label="Squadrons"   value={detail.squadrons}  color="text-sky-600 dark:text-sky-400" />
            <DetailStatCard label="Status"      value={detail.status === "active" ? "Active" : "Inactive"}
              color={detail.status === "active" ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400"} />
          </div>

          {/* Details */}
          <DetailSection title="ARCEN Information">
            <DetailRow label="Name"  value={detail.name}  />
            <DetailRow label="Code"  value={detail.code}  />
            <DetailRow label="Commander"  value={detail.commander} />
            <DetailRow label="Location"   value={detail.location}  />
          </DetailSection>
        </DetailModal>
      )}

      {/* Add / Edit Modal */}
      <AddEditModal
        open={editModal}
        title={editMode === "add" ? "Add New ARCEN" : `Edit ${editRow?.name ?? "ARCEN"}`}
        onClose={closeEdit}
        onSubmit={handleSubmit}
        submitLabel={editMode === "add" ? "Add ARCEN" : "Save Changes"}
        loading={submitting}
      >
        {apiError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            {apiError}
          </div>
        )}
        <FormField label="ARCEN Name" required error={errors.name}>
          <FormInput value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. 1st ARCEN" />
        </FormField>
        <FormField label="Code" required error={errors.code}>
          <FormInput value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} placeholder="e.g. 1ARCEN" />
        </FormField>
        <FormField label="Commander (Optional)">
          <FormInput value={form.commander} onChange={(v) => setForm((f) => ({ ...f, commander: v }))} placeholder="e.g. Brig. Gen. Antonio Reyes" />
        </FormField>
        <FormField label="Location (Optional)">
          <FormInput value={form.location} onChange={(v) => setForm((f) => ({ ...f, location: v }))} placeholder="e.g. Villamor Air Base, Pasay City" />
        </FormField>
        <FormField label="Status">
          <FormSelect value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </FormSelect>
        </FormField>
      </AddEditModal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete ARCEN?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" (${deleteTarget.code}) will be deactivated. This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete ARCEN"
        cancelLabel="Keep ARCEN"
        destructive
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}