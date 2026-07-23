import { useState, useEffect, useMemo } from "react";
import { Layers, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import ManagementTable from "@/components/airbase/ManagementTable";
import { StatusBadge, MonoCode, PrimaryButton, FilterSelect } from "@/components/airbase/AirbaseUI";
import AddEditModal, { FormField, FormInput, FormSelect } from "@/components/airbase/AddEditModal";
import DetailModal, { DetailSection, DetailRow, DetailStatCard } from "@/components/airbase/DetailModal";
import { getSquadrons, getArcens, getGroupsList, createSquadron, updateSquadron, deleteSquadron } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// ─── Constants ────────────────────────────────────────────────────────────────
const SPECIALIZATIONS = [
  "Security", "Engineering", "Communications", "Medical", "Supply",
  "Transport", "Maintenance", "Air Defense", "Radar Ops", "Intelligence",
  "Surveillance", "Cyber", "Dental", "Nursing", "Administrative",
];

const EMPTY_FORM = {
  name: "", code: "", groupId: "", specialization: "", location: "", status: "active",
};

const COLUMNS = [
  { key: "name",           label: "Squadron",       sortable: true  },
  { key: "code",           label: "Code",           sortable: true  },
  { key: "groupName",      label: "Group",          sortable: true  },
  { key: "arcenName",      label: "ARCEN",          sortable: true  },
  { key: "location",       label: "Location",       sortable: true  },
  { key: "specialization", label: "Specialization", sortable: true  },
  { key: "members",        label: "Members",        sortable: true  },
  { key: "status",         label: "Status",         sortable: false },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function ManageSquadrons() {
  const { user } = useAuth();
  const { addToast: toast } = useToast();

  // admin, admin_arsen, and admin_group can all mutate squadrons per RBAC_WORKFLOW.md.
  // admin_squadron is read-only (they can view but not create/edit/delete).
  const canMutate = user?.role === "admin" || user?.role === "admin_arsen" || user?.role === "admin_group";

  // Scope helpers — used to restrict dropdowns so unit admins cannot assign
  // squadrons outside their authorised scope.
  const isArsenAdmin  = user?.role === "admin_arsen";
  const isGroupAdmin  = user?.role === "admin_group";

  const [data,          setData]          = useState([]);
  const [groupOptions,  setGroupOptions]  = useState([]);
  const [arcenOptions,  setArcenOptions]  = useState([]);
  const [loading,       setLoading]       = useState(false);

  // Detail panel
  const [detail,        setDetail]        = useState(null);

  // Add / Edit modal
  const [editModal,     setEditModal]     = useState(false);
  const [editMode,      setEditMode]      = useState("add");
  const [editRow,       setEditRow]       = useState(null);   // FIX: dedicated state, not detail
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [errors,        setErrors]        = useState({});
  const [submitting,    setSubmitting]    = useState(false);
  const [apiError,      setApiError]      = useState(null);

  // Delete confirm dialog
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Filters
  const [arcenFilter,   setArcenFilter]   = useState("");
  const [groupFilter,   setGroupFilter]   = useState("");
  const [specFilter,    setSpecFilter]    = useState("");
  const [statusFilter,  setStatusFilter]  = useState("");

  // ─── Data fetching ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchArcenOptions();
    fetchGroupOptions();
    fetchSquadrons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchArcenOptions = async () => {
    try {
      const response = await getArcens();
      if (response.data.status === "success") {
        setArcenOptions(
          response.data.data.map((a) => ({
            value: String(a.id),
            label: `${a.name} — ${a.code}`,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to fetch ARCENs:", err);
    }
  };

  const fetchGroupOptions = async () => {
    try {
      const response = await getGroupsList();
      if (response.data.status === "success") {
        let options = response.data.data.map((g) => ({
          value:     String(g.id),
          label:     `${g.name} — ${g.arsen_name || ""}`,
          groupName: g.name,
          groupCode: g.code,
          arcenId:   String(g.arsen_id),   // FIX: was missing; needed for ARCEN-scoped group filter
          arcenName: g.arsen_name || "",
          arcenCode: g.arsen_code || "",
        }));

        // admin_group can only assign squadrons within their own group
        if (isGroupAdmin && user?.scope_group_id) {
          options = options.filter((o) => o.value === String(user.scope_group_id));
        }
        // admin_arsen can only assign squadrons within their ARSEN's groups
        else if (isArsenAdmin && user?.scope_arsen_id) {
          options = options.filter((o) => {
            const group = response.data.data.find((g) => String(g.id) === o.value);
            return group && String(group.arsen_id) === String(user.scope_arsen_id);
          });
        }

        setGroupOptions(options);
      }
    } catch (err) {
      console.error("Failed to fetch groups:", err);
    }
  };

  const fetchSquadrons = async () => {
    setLoading(true);
    try {
      const response = await getSquadrons();
      if (response.data.status === "success") {
        setData(
          response.data.data.map((sq) => ({
            id:             `sq-${sq.id}`,
            dbId:           sq.id,
            name:           sq.name,
            code:           sq.code           || "",
            status:         sq.is_active ? "active" : "inactive",
            members:        sq.members        || 0,
            specialization: sq.specialization || "",
            location:       sq.location       || "",
            groupId:        String(sq.group_id),
            groupName:      sq.group_name     || "",
            groupCode:      sq.group_code     || "",
            // FIX: arcenId was hardcoded '' — now properly derived so ARCEN filter works
            arcenId:        sq.arsen_id ? String(sq.arsen_id) : "",
            arcenName:      sq.arsen_name     || "",
            arcenCode:      sq.arsen_code     || "",
          }))
        );
      }
    } catch (err) {
      console.error("Failed to fetch squadrons:", err);
      toast("Failed to load squadrons", "error");
    } finally {
      setLoading(false);
    }
  };

  // ─── Derived options ────────────────────────────────────────────────────────
  // When an ARCEN filter is active, only show groups belonging to that ARCEN
  const filteredGroupOptions = useMemo(() =>
    arcenFilter
      ? groupOptions.filter((g) => g.arcenId === arcenFilter)
      : groupOptions,
    [arcenFilter, groupOptions]
  );

  // ─── Table filtering ────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    let d = data;
    // FIX: was comparing arcenName string against an ID value — now ID vs ID
    if (arcenFilter)  d = d.filter((r) => r.arcenId === arcenFilter);
    if (groupFilter)  d = d.filter((r) => r.groupId === groupFilter);
    if (specFilter)   d = d.filter((r) => r.specialization === specFilter);
    if (statusFilter) d = d.filter((r) => r.status === statusFilter);
    return d;
  }, [data, arcenFilter, groupFilter, specFilter, statusFilter]);

  // Changing ARCEN filter resets the group filter to avoid orphaned selection
  const handleArcenFilter = (val) => { setArcenFilter(val); setGroupFilter(""); };

  // ─── Modal helpers ──────────────────────────────────────────────────────────
  const openAdd = () => {
    // Pre-fill groupId for admin_group — they can only create squadrons in their own group
    const defaultGroupId = isGroupAdmin && user?.scope_group_id
      ? String(user.scope_group_id)
      : "";
    setForm({ ...EMPTY_FORM, groupId: defaultGroupId });
    setErrors({});
    setApiError(null);
    setEditMode("add");
    setEditRow(null);
    setEditModal(true);
  };

  const openEdit = (row) => {
    setForm({
      name:           row.name,
      code:           row.code,
      groupId:        row.groupId,
      specialization: row.specialization,
      location:       row.location,
      status:         row.status,
    });
    setErrors({});
    setApiError(null);
    setEditMode("edit");
    setEditRow(row);     // FIX: was storing in detail which openEdit then cleared
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
    if (!form.name?.trim())    e.name    = "Squadron Name is required";
    if (!form.groupId)         e.groupId = "Group is required";
    // code, location, specialization are all optional per the backend validateSquadron
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Error message extractor ─────────────────────────────────────────────────
  const getErrorMessage = (err) => {
    const body = err?.response?.data;
    if (body?.code === "GROUP_NOT_FOUND")
      return "The selected group no longer exists. Please choose a different one.";
    if (body?.code === "HAS_ASSIGNMENTS")
      return "Cannot delete: squadron has active reservist assignments. Reassign them first.";
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
      // FIX: removed `members` — not a DB column, backend ignores it
      const basePayload = {
        group_id:       parseInt(form.groupId, 10),
        name:           form.name.trim(),
        code:           form.code.trim()           || null,
        location:       form.location.trim()       || null,
        specialization: form.specialization        || null,
      };

      if (editMode === "add") {
        const response = await createSquadron(basePayload);
        if (response.data.status === "success") {
          await fetchSquadrons();
          closeEdit();
          toast("Squadron created successfully", "success");
        }
      } else if (editRow) {
        // FIX: was using `detail` (null after openEdit) — now uses `editRow`
        // FIX: is_active now properly sent so status persists on save
        const response = await updateSquadron(editRow.dbId, {
          ...basePayload,
          is_active: form.status === "active",
        });
        if (response.data.status === "success") {
          await fetchSquadrons();
          closeEdit();
          toast("Squadron updated successfully", "success");
        }
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      setApiError(msg);
      toast(msg, "error");
      console.error("Failed to save squadron:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────────────────
  const openDeleteDialog = (row) => setDeleteTarget(row);
  const cancelDelete     = ()    => { if (!deleteLoading) setDeleteTarget(null); };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const response = await deleteSquadron(deleteTarget.dbId);
      if (response.data.status === "success") {
        // FIX: was confirm() + alert() — now ConfirmDialog + toast
        setData((prev) => prev.filter((r) => r.id !== deleteTarget.id));
        setDetail(null);
        setDeleteTarget(null);
        toast(`${deleteTarget.name} deleted successfully`, "success");
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      toast(msg, "error");
      console.error("Failed to delete squadron:", err);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Toggle Status ───────────────────────────────────────────────────────────
  const toggleStatus = async (row) => {
    const newActive = row.status !== "active";
    try {
      const response = await updateSquadron(row.dbId, {
        group_id:       parseInt(row.groupId, 10),
        name:           row.name,
        code:           row.code           || null,
        location:       row.location       || null,
        specialization: row.specialization || null,
        // FIX: is_active was never sent — status change never persisted
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
          <PrimaryButton icon={Plus} onClick={openAdd}>Add Squadron</PrimaryButton>
        </div>
      )}

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Total Squadrons", value: data.length },
          { label: "Active",          value: data.filter((r) => r.status === "active").length,   color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Inactive",        value: data.filter((r) => r.status === "inactive").length, color: "text-neutral-400" },
          { label: "Total Members",   value: data.reduce((a, r) => a + r.members, 0).toLocaleString() },
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
        searchKeys={["name", "code", "groupName", "arcenName", "location", "specialization"]}
        searchPlaceholder="Search squadron, location, group…"
        emptyMessage="No squadrons found."
        filterSlot={
          <>
            <FilterSelect
              value={arcenFilter}
              onChange={handleArcenFilter}
              options={arcenOptions}
              placeholder="All ARCENs"
            />
            <FilterSelect
              value={groupFilter}
              onChange={setGroupFilter}
              options={filteredGroupOptions.map((g) => ({ value: g.value, label: g.label }))}
              placeholder="All Groups"
            />
            <FilterSelect
              value={specFilter}
              onChange={setSpecFilter}
              options={SPECIALIZATIONS}
              placeholder="All Spec."
            />
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "active",   label: "Active"   },
                { value: "inactive", label: "Inactive" },
              ]}
              placeholder="All Status"
            />
          </>
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
            <td className="px-4 py-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300">{row.groupName}</td>
            <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-500">{row.arcenName}</td>
            <td className="px-4 py-3">
              <span className="flex items-center gap-1 text-xs text-neutral-500">
                <MapPin size={11} className="shrink-0 text-neutral-400" /> {row.location}
              </span>
            </td>
            <td className="px-4 py-3">
              {row.specialization && (
                <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                  {row.specialization}
                </span>
              )}
            </td>
            <td className="px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {row.members.toLocaleString()}
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
          icon={Layers}
          iconColor="bg-sky-600"
          title={detail.name}
          subtitle={`${detail.groupName} · ${detail.arcenName}`}
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
                    <Pencil size={14} /> Edit Squadron
                  </button>
                </div>
              </div>
            )
          }
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
            <DetailStatCard label="Members"        value={detail.members.toLocaleString()} color="text-indigo-600 dark:text-indigo-400" />
            <DetailStatCard label="Specialization" value={detail.specialization || "—"}    color="text-sky-600 dark:text-sky-400" />
            <DetailStatCard label="Location"       value={detail.location || "—"}          color="text-blue-600 dark:text-blue-400" />
            <DetailStatCard
              label="Status"
              value={detail.status === "active" ? "Active" : "Inactive"}
              color={detail.status === "active" ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400"}
            />
          </div>

          <DetailSection title="Squadron Information">
            <DetailRow label="Name"           value={detail.name}                />
            <DetailRow label="Code"           value={detail.code}                />
            <DetailRow label="Specialization" value={detail.specialization}      />
            <DetailRow label="Location"       value={detail.location}            />
            <DetailRow label="Members"        value={detail.members.toLocaleString()} />
          </DetailSection>

          <DetailSection title="Assignment">
            <DetailRow label="Group"      value={detail.groupName} />
            <DetailRow label="Group Code" value={detail.groupCode} />
            <DetailRow label="ARCEN"      value={detail.arcenName} />
            <DetailRow label="ARCEN Code" value={detail.arcenCode} />
          </DetailSection>
        </DetailModal>
      )}

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      <AddEditModal
        open={editModal}
        title={editMode === "add" ? "Add New Squadron" : `Edit ${editRow?.name ?? "Squadron"}`}
        onClose={closeEdit}
        onSubmit={handleSubmit}
        submitLabel={editMode === "add" ? "Add Squadron" : "Save Changes"}
        loading={submitting}
      >
        {/* API-level error banner */}
        {apiError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            {apiError}
          </div>
        )}

        <FormField label="Squadron Name" required error={errors.name}>
          <FormInput
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="e.g. Butuan, Surigao, Cagayan"
          />
        </FormField>

        <FormField label="Code (Optional)">
          <FormInput
            value={form.code}
            onChange={(v) => setForm((f) => ({ ...f, code: v }))}
            placeholder="e.g. BTN-SQ"
          />
        </FormField>

        <FormField label="Group" required error={errors.groupId}>
          <FormSelect value={form.groupId} onChange={(v) => setForm((f) => ({ ...f, groupId: v }))}>
            <option value="">Select Group…</option>
            {groupOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </FormSelect>
        </FormField>

        <FormField label="Location (Optional)">
          <FormInput
            value={form.location}
            onChange={(v) => setForm((f) => ({ ...f, location: v }))}
            placeholder="e.g. Butuan City, Agusan del Norte"
          />
        </FormField>

        <FormField label="Specialization (Optional)">
          <FormSelect value={form.specialization} onChange={(v) => setForm((f) => ({ ...f, specialization: v }))}>
            <option value="">Select Specialization…</option>
            {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </FormSelect>
        </FormField>

        {/* NOTE: Members field removed — it is derived from reservist_assignments,
            not a stored column on the squadron table. */}

        {/* Status only shown on edit — defaults to active on create */}
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
        title="Delete Squadron?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}"${deleteTarget.code ? ` (${deleteTarget.code})` : ""} will be deactivated. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete Squadron"
        cancelLabel="Keep Squadron"
        destructive
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}