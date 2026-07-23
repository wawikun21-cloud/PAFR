import { useState, useEffect, useMemo } from "react";
import { Users, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { cn } from "@/lib/utils";
import ManagementTable from "@/components/airbase/ManagementTable";
import { StatusBadge, MonoCode, PrimaryButton, FilterSelect } from "@/components/airbase/AirbaseUI";
import AddEditModal, { FormField, FormInput, FormSelect } from "@/components/airbase/AddEditModal";
import DetailModal, { DetailSection, DetailRow, DetailStatCard } from "@/components/airbase/DetailModal";
import { getGroupsList, getArcens, createGroup, updateGroup, deleteGroup } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// ─── Constants ────────────────────────────────────────────────────────────────
// NOTE: "type" is NOT a real DB column on `groups`. It is removed from the form
// and payload entirely. If your schema ever adds it, re-introduce it here.

const EMPTY_FORM = { name: "", code: "", commander: "", arcenId: "", status: "active" };

const COLUMNS = [
  { key: "name",      label: "Group",     sortable: true  },
  { key: "code",      label: "Code",      sortable: true  },
  { key: "arcenName", label: "ARCEN",     sortable: true  },
  { key: "commander", label: "Commander", sortable: true  },
  { key: "squadrons", label: "Squadrons", sortable: true  },
  { key: "reservists",label: "Reservists",sortable: true  },
  { key: "status",    label: "Status",    sortable: false },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function ManageGroups() {
  const { user } = useAuth();
  const { addToast: toast } = useToast();

  // Only super-admin and admin_arsen can mutate groups
  const canMutate = user?.role === "admin" || user?.role === "admin_arsen";

  // admin_arsen is scoped to their own ARSEN — lock the ARSEN dropdown to their scope
  // so they cannot accidentally (or intentionally) assign a group to a different ARSEN.
  const isArsenAdmin = user?.role === "admin_arsen";

  const [data,         setData]         = useState([]);
  const [arcenOptions, setArcenOptions] = useState([]);
  const [loading,      setLoading]      = useState(false);

  // Detail panel
  const [detail,       setDetail]       = useState(null);

  // Add / Edit modal
  const [editModal,    setEditModal]    = useState(false);
  const [editMode,     setEditMode]     = useState("add");  // "add" | "edit"
  const [editRow,      setEditRow]      = useState(null);   // the row being edited
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [errors,       setErrors]       = useState({});
  const [submitting,   setSubmitting]   = useState(false);
  const [apiError,     setApiError]     = useState(null);

  // Delete confirm dialog
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading,setDeleteLoading]= useState(false);

  // Filters
  const [arcenFilter,  setArcenFilter]  = useState("");

  // ─── Data fetching ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchArcenOptions();
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchArcenOptions = async () => {
    try {
      const response = await getArcens();
      if (response.data.status === "success") {
        // FIX: was using `arcen.name` for BOTH value fields — now uses arcen.code for label suffix
        let options = response.data.data.map((arcen) => ({
          value: String(arcen.id),
          label: `${arcen.name} — ${arcen.code}`,
          arcenName: arcen.name,
          arcenCode: arcen.code,
        }));

        // admin_arsen can only assign groups within their own ARSEN — filter to their scope
        if (isArsenAdmin && user?.scope_arsen_id) {
          options = options.filter((o) => o.value === String(user.scope_arsen_id));
        }

        setArcenOptions(options);
      }
    } catch (err) {
      console.error("Failed to fetch ARCENs:", err);
    }
  };

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await getGroupsList();
      if (response.data.status === "success") {
        const transformed = response.data.data.map((group) => ({
          id:              `group-${group.id}`,
          dbId:            group.id,
          name:            group.name,
          code:            group.code,
          commander:       group.commander_name || "",
          reservists:      group.squadron_count  || 0,  // API doesn't return reservist count here; keep 0 unless added later
          squadrons:       group.squadron_count  || 0,
          activeSquadrons: group.squadron_count  || 0,
          arcenId:         String(group.arsen_id),
          arcenName:       group.arsen_name      || "",
          arcenCode:       group.arsen_code      || "",
          // FIX: was using group.arsen_code for arcenFull — now consistent
          arcenFull:       group.arsen_code      || "",
          // FIX: properly derive status from is_active boolean
          status:          group.is_active ? "active" : "inactive",
        }));
        setData(transformed);
      }
    } catch (err) {
      console.error("Failed to fetch groups:", err);
      toast("Failed to load groups", "error");
    } finally {
      setLoading(false);
    }
  };

  // ─── Filtering ──────────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!arcenFilter) return data;
    return data.filter((r) => r.arcenId === arcenFilter);
  }, [data, arcenFilter]);

  // ─── Modal helpers ──────────────────────────────────────────────────────────
  const openAdd = () => {
    // Pre-fill arcenId for admin_arsen — they can only create groups in their own ARSEN
    const defaultArcenId = isArsenAdmin && user?.scope_arsen_id
      ? String(user.scope_arsen_id)
      : "";
    setForm({ ...EMPTY_FORM, arcenId: defaultArcenId });
    setErrors({});
    setApiError(null);
    setEditMode("add");
    setEditRow(null);
    setEditModal(true);
  };

  const openEdit = (row) => {
    setForm({
      name:      row.name,
      code:      row.code,
      commander: row.commander,
      arcenId:   row.arcenId,
      status:    row.status,
    });
    setErrors({});
    setApiError(null);
    setEditMode("edit");
    setEditRow(row);       // FIX: store the row being edited (was using `detail` which could be null)
    setEditModal(true);
    setDetail(null);
  };

  const closeEdit = () => {
    setEditModal(false);
    setErrors({});
    setApiError(null);
    setEditRow(null);
  };

  // ─── Validation ─────────────────────────────────────────────────────────────
  const validateForm = () => {
    const e = {};
    if (!form.name?.trim())   e.name   = "Group Name is required";
    if (!form.code?.trim())   e.code   = "Code is required";
    if (!form.arcenId)        e.arcenId= "ARCEN is required";
    // commander and status are optional — no validation needed
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Error message extractor (mirrors ManageArcens) ─────────────────────────
  const getErrorMessage = (err) => {
    const body = err?.response?.data;
    if (body?.code === "DUPLICATE_CODE")
      return "This group code already exists for the selected ARCEN. Use a unique code.";
    if (body?.code === "ARSEN_NOT_FOUND")
      return "The selected ARCEN no longer exists. Please choose a different one.";
    if (body?.errors?.length > 0)
      return body.errors.map((e) => e.msg).join(" ");
    return body?.message || err.message || "An unexpected error occurred";
  };

  // ─── Submit (Create / Update) ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    setApiError(null);

    try {
      // FIX: removed `type` — it doesn't exist in the DB schema
      // FIX: status is only sent on update (backend doesn't accept it on create)
      const basePayload = {
        arsen_id:       parseInt(form.arcenId, 10),
        code:           form.code.trim(),
        name:           form.name.trim(),
        commander_name: form.commander.trim() || null,
      };

      if (editMode === "add") {
        const response = await createGroup(basePayload);
        if (response.data.status === "success") {
          await fetchGroups();
          closeEdit();
          toast("Group created successfully", "success");
        }
      } else if (editRow) {
        // FIX: was using `detail` (which was set to null in openEdit) — now uses `editRow`
        // FIX: is_active is now properly sent so status actually persists
        const response = await updateGroup(editRow.dbId, {
          ...basePayload,
          is_active: form.status === "active",
        });
        if (response.data.status === "success") {
          await fetchGroups();
          closeEdit();
          toast("Group updated successfully", "success");
        }
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      setApiError(msg);
      toast(msg, "error");
      console.error("Failed to save group:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────────────────
  const openDeleteDialog  = (row) => setDeleteTarget(row);
  const cancelDelete      = ()    => { if (!deleteLoading) setDeleteTarget(null); };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const response = await deleteGroup(deleteTarget.dbId);
      if (response.data.status === "success") {
        // FIX: was using browser confirm() + alert() — now uses ConfirmDialog + toast
        setData((prev) => prev.filter((r) => r.id !== deleteTarget.id));
        setDetail(null);
        setDeleteTarget(null);
        toast(`${deleteTarget.name} deleted successfully`, "success");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Failed to delete group";
      toast(msg, "error");
      console.error("Failed to delete group:", err);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Toggle Status ───────────────────────────────────────────────────────────
  const toggleStatus = async (row) => {
    const newActive = row.status !== "active";
    try {
      const response = await updateGroup(row.dbId, {
        arsen_id:       parseInt(row.arcenId, 10),
        code:           row.code,
        name:           row.name,
        commander_name: row.commander || null,
        // FIX: was toggling optimistically then not persisting is_active — now always sends it
        is_active:      newActive,
      });
      if (response.data.status === "success") {
        const updated = { ...row, status: newActive ? "active" : "inactive" };
        setData((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
        setDetail(updated);
        toast(
          `${row.name} ${newActive ? "activated" : "deactivated"} successfully`,
          "success"
        );
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to toggle status";
      toast(msg, "error");
      console.error("Failed to toggle status:", err);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 pb-10">
      {canMutate && (
        <div className="flex justify-end">
          <PrimaryButton icon={Plus} onClick={openAdd}>Add Group</PrimaryButton>
        </div>
      )}

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Total Groups",     value: data.length },
          { label: "Active",           value: data.filter((r) => r.status === "active").length,   color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Inactive",         value: data.filter((r) => r.status === "inactive").length, color: "text-neutral-400" },
          { label: "Total Squadrons",  value: data.reduce((a, r) => a + r.squadrons, 0).toLocaleString() },
        ].map((s) => (
          <div
            key={s.label}
            className={cn(
              "flex flex-col rounded-xl border px-4 py-2.5 min-w-[120px]",
              "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
            )}
          >
            <span className={cn("text-xl font-bold leading-none", s.color ?? "text-neutral-900 dark:text-neutral-50")}>
              {s.value}
            </span>
            <span className="mt-0.5 text-[10px] text-neutral-400">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <ManagementTable
        columns={COLUMNS}
        data={filteredData}
        loading={loading}
        searchKeys={["name", "code", "arcenName", "commander"]}
        searchPlaceholder="Search group name, code, ARCEN…"
        emptyMessage="No groups found."
        filterSlot={
          <FilterSelect
            value={arcenFilter}
            onChange={setArcenFilter}
            options={arcenOptions.map((o) => ({ value: o.value, label: o.label }))}
            placeholder="All ARCENs"
          />
        }
        renderRow={(row) => (
          <tr
            key={row.id}
            onClick={() => setDetail(row)}
            className="group cursor-pointer hover:bg-indigo-50/60 dark:hover:bg-indigo-500/5 transition-colors duration-100"
          >
            <td className="px-4 py-3">
              <span className="text-[13px] font-bold text-neutral-800 dark:text-neutral-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                {row.name}
              </span>
            </td>
            <td className="px-4 py-3"><MonoCode>{row.code}</MonoCode></td>
            <td className="px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{row.arcenName}</span>
                <span className="text-[10px] text-neutral-400">{row.arcenFull}</span>
              </div>
            </td>
            <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">{row.commander}</td>
            <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">{row.activeSquadrons}</span>
              <span className="text-neutral-400">/{row.squadrons}</span>
            </td>
            <td className="px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {row.reservists.toLocaleString()}
            </td>
            <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
          </tr>
        )}
      />

      {/* ── Detail Modal ──────────────────────────────────────────────────────── */}
      {detail && (
        <DetailModal
          open={!!detail}
          onClose={() => setDetail(null)}
          icon={Users}
          iconColor="bg-blue-600"
          title={detail.name}
          subtitle={`${detail.arcenName} · ${detail.arcenFull}`}
          badge={detail.code}
          size="lg"
          footer={
            canMutate && (
              <div className="flex w-full flex-wrap items-center justify-between gap-2">
                <button
                  onClick={() => openDeleteDialog(detail)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium",
                    "border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400",
                    "hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-150"
                  )}
                >
                  <Trash2 size={14} /> Delete
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => toggleStatus(detail)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium",
                      "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400",
                      "hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all duration-150"
                    )}
                  >
                    {detail.status === "active"
                      ? <><ToggleRight size={14} className="text-emerald-500" /> Deactivate</>
                      : <><ToggleLeft  size={14} className="text-neutral-400" /> Activate</>}
                  </button>
                  <button
                    onClick={() => openEdit(detail)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
                      "bg-indigo-600 text-white hover:bg-indigo-700",
                      "shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30 transition-all duration-150"
                    )}
                  >
                    <Pencil size={14} /> Edit Group
                  </button>
                </div>
              </div>
            )
          }
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
            <DetailStatCard label="Reservists"       value={detail.reservists.toLocaleString()} color="text-indigo-600 dark:text-indigo-400" />
            <DetailStatCard label="Total Squadrons"  value={detail.squadrons}                   color="text-blue-600 dark:text-blue-400" />
            <DetailStatCard label="Active Squadrons" value={detail.activeSquadrons}              color="text-emerald-600 dark:text-emerald-400" />
            <DetailStatCard
              label="Status"
              value={detail.status === "active" ? "Active" : "Inactive"}
              color={detail.status === "active" ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400"}
            />
          </div>

          <DetailSection title="Group Information">
            <DetailRow label="Group Name" value={detail.name}      />
            <DetailRow label="Code"       value={detail.code}      />
            <DetailRow label="Commander"  value={detail.commander} />
          </DetailSection>

          <DetailSection title="Assignment">
            <DetailRow label="ARCEN"      value={detail.arcenName} />
            <DetailRow label="ARCEN Code" value={detail.arcenFull} />
          </DetailSection>
        </DetailModal>
      )}

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      <AddEditModal
        open={editModal}
        title={editMode === "add" ? "Add New Group" : `Edit ${editRow?.name ?? "Group"}`}
        onClose={closeEdit}
        onSubmit={handleSubmit}
        submitLabel={editMode === "add" ? "Add Group" : "Save Changes"}
        loading={submitting}
      >
        {/* API-level error banner */}
        {apiError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            {apiError}
          </div>
        )}

        <FormField label="Group Name" required error={errors.name}>
          <FormInput
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="e.g. 509th Reserve Group"
          />
        </FormField>

        <FormField label="Code" required error={errors.code}>
          <FormInput
            value={form.code}
            onChange={(v) => setForm((f) => ({ ...f, code: v }))}
            placeholder="e.g. 509RG"
          />
        </FormField>

        <FormField label="ARCEN" required error={errors.arcenId}>
          <FormSelect value={form.arcenId} onChange={(v) => setForm((f) => ({ ...f, arcenId: v }))}>
            <option value="">Select ARCEN…</option>
            {arcenOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </FormSelect>
        </FormField>

        {/* NOTE: "Type" field removed — no `type` column exists in the `groups` table */}

        <FormField label="Commander (Optional)">
          <FormInput
            value={form.commander}
            onChange={(v) => setForm((f) => ({ ...f, commander: v }))}
            placeholder="e.g. Col. Marcos Dela Torre"
          />
        </FormField>

        {/* Status is only meaningful on edit — hidden on add (defaults to active server-side) */}
        {editMode === "edit" && (
          <FormField label="Status">
            <FormSelect value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </FormSelect>
          </FormField>
        )}
      </AddEditModal>

      {/* ── Delete Confirm Dialog ────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Group?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" (${deleteTarget.code}) will be deactivated. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete Group"
        cancelLabel="Keep Group"
        destructive
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}