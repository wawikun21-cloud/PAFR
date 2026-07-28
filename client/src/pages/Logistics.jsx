import { useState, useEffect, useMemo, useCallback, Fragment, useRef } from "react";
import {
  Package, Plus, Pencil, Trash2, AlertTriangle, Search, X, Loader, Boxes,
  UserCheck, ChevronRight, ChevronDown, ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  getSupplies, getSupplyCategories, createSupply, updateSupply, deleteSupply,
  adjustSupplyStock, getLowStockSupplies,
  getUniformTracker, createIssuance,
} from "@/services/api";
import SupplyForm from "@/components/logistics/SupplyForm";
import StockAdjustForm from "@/components/logistics/StockAdjustForm";
import { KPICard, StockLevelBar } from "@/components/logistics/LogisticsUI";

const TABS = [
  { key: "inventory", label: "Inventory", icon: Package },
  { key: "uniform-tracker", label: "Uniform Tracker", icon: Boxes },
];

export default function Logistics() {
  const toast = useToast();

  // ── Data state ──
  const [supplies, setSupplies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [uniformTracker, setUniformTracker] = useState([]);
  const [uniformTrackerLoading, setUniformTrackerLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("inventory");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // ── Modal state ──
  const [supplyFormOpen, setSupplyFormOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState(null);
  const [stockAdjustOpen, setStockAdjustOpen] = useState(false);
  const [adjustingSupply, setAdjustingSupply] = useState(null);
  const [detailSupply, setDetailSupply] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [assignModal, setAssignModal] = useState(null);

  // ── Load data ──
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === "uniform-tracker" && uniformTracker.length === 0) {
      loadUniformTracker();
    }
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [suppliesRes, categoriesRes, lowStockRes] = await Promise.all([
        getSupplies({ limit: 100 }),
        getSupplyCategories(),
        getLowStockSupplies(),
      ]);

      if (suppliesRes.data.status === "success") {
        setSupplies(suppliesRes.data.data.supplies || []);
      }
      if (categoriesRes.data.status === "success") {
        setCategories(categoriesRes.data.data.categories || []);
      }
      if (lowStockRes.data.status === "success") {
        setLowStock(lowStockRes.data.data.supplies || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load logistics data");
    } finally {
      setLoading(false);
    }
  };

  const loadUniformTracker = async () => {
    setUniformTrackerLoading(true);
    try {
      const res = await getUniformTracker();
      if (res.data.status === "success") {
        setUniformTracker(res.data.data.tracker || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load uniform tracker");
    } finally {
      setUniformTrackerLoading(false);
    }
  };

  // ── KPI computations ──
  const kpis = useMemo(() => {
    const totalItems = supplies.length;
    const totalStock = supplies.reduce((a, s) => a + (s.quantity_available || 0), 0);
    const lowStockCount = lowStock.length;
    return { totalItems, totalStock, lowStockCount };
   }, [supplies, lowStock]);
   const lowestSquadronData = useMemo(() => {
     if (!uniformTracker || uniformTracker.length === 0) return null;

     let minAvg = Infinity;
     let lowestSquadron = null;

     uniformTracker.forEach(sqGroup => {
       const totalReservists = sqGroup.reservists.length;
       if (totalReservists === 0) return;

       const totalUniforms = sqGroup.reservists.reduce((sum, r) => sum + (r.uniforms?.length || 0), 0);
       const avg = totalUniforms / totalReservists;

       if (avg < minAvg) {
         minAvg = avg;
         lowestSquadron = {
           squadronName: sqGroup.squadron_name || "Unassigned",
           groupName: sqGroup.group_name || "No Group",
           totalReservists,
           totalUniforms,
           avg
         };
       }
     });

     return lowestSquadron;
   }, [uniformTracker])

   // ── Filtered data ――
   const filteredSupplies = useMemo(() => {
    let d = supplies;
    if (categoryFilter) d = d.filter((s) => s.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      d = d.filter(
        (s) =>
          (s.name || "").toLowerCase().includes(q) ||
          (s.category || "").toLowerCase().includes(q) ||
          (s.location || "").toLowerCase().includes(q) ||
          (s.description || "").toLowerCase().includes(q)
      );
    }
    return d;
  }, [supplies, categoryFilter, search]);

  // ── Supply CRUD handlers ──
  const handleCreateSupply = async (data) => {
    try {
      const res = await createSupply(data);
      if (res.data.status === "success") {
        toast.success("Supply item created successfully");
        setSupplyFormOpen(false);
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create supply item");
    }
  };

  const handleUpdateSupply = async (data) => {
    try {
      const res = await updateSupply(editingSupply.id, data);
      if (res.data.status === "success") {
        toast.success("Supply item updated successfully");
        setSupplyFormOpen(false);
        setEditingSupply(null);
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update supply item");
    }
  };

  const handleDeleteSupply = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await deleteSupply(deleteConfirm.id);
      if (res.data.status === "success") {
        toast.success("Supply item deleted successfully");
        setDeleteConfirm(null);
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete supply item");
      setDeleteConfirm(null);
    }
  };

  const handleAdjustStock = async (data) => {
    try {
      const res = await adjustSupplyStock(data);
      if (res.data.status === "success") {
        toast.success(`Stock adjusted. New quantity: ${res.data.data.new_quantity}`);
        setStockAdjustOpen(false);
        setAdjustingSupply(null);
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to adjust stock");
    }
  };

  const openEdit = (supply) => {
    setEditingSupply(supply);
    setSupplyFormOpen(true);
  };

  const openAdd = () => {
    setEditingSupply(null);
    setSupplyFormOpen(true);
  };

  const openAdjust = (supply) => {
    setAdjustingSupply(supply);
    setStockAdjustOpen(true);
  };

  const openDetail = (supply) => {
    setDetailSupply(supply);
  };

  const handleAssignItem = async (data) => {
    try {
      if (Array.isArray(data.reservist_ids)) {
        const results = await Promise.all(
          data.reservist_ids.map((reservist_id) =>
            createIssuance({
              reservist_id,
              supply_id: data.supply_id,
              quantity_issued: data.quantity_issued,
              due_return_date: data.due_return_date,
              issuance_type: data.issuance_type,
              notes: data.notes,
            })
          )
        );
        const successCount = results.filter((r) => r.data.status === "success").length;
        toast.success(`Assigned ${data.quantity_issued} item(s) to ${successCount} reservist${successCount !== 1 ? 's' : ''}`);
      } else {
        const res = await createIssuance(data);
        if (res.data.status === "success") {
          toast.success(`Assigned ${data.quantity_issued} item(s) to ${assignModal?.reservist?.last_name || ''} ${assignModal?.reservist?.first_name || ''}`.trim());
        }
      }
      setAssignModal(null);
      loadData();
      loadUniformTracker();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign item");
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 pb-10">
      {/* ── KPI Cards ── */}
<div className="flex flex-wrap gap-3">
        <KPICard
          icon={Boxes}
          label="Total Supply Items"
          value={kpis.totalItems}
          subtext={`${kpis.totalStock.toLocaleString()} total units in stock`}
          color="text-indigo-600 dark:text-indigo-400"
          bgColor="bg-indigo-50 dark:bg-indigo-500/10"
        />
        <KPICard
          icon={AlertTriangle}
          label="Low Stock Items"
          value={kpis.lowStockCount}
          subtext={kpis.lowStockCount > 0 ? "Items below reorder level" : "All items stocked"}
          color={kpis.lowStockCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}
          bgColor={kpis.lowStockCount > 0 ? "bg-amber-50 dark:bg-amber-500/10" : "bg-emerald-50 dark:bg-emerald-500/10"}
        />
         {lowestSquadronData && (
           <KPICard
             icon={UserCheck}
             label="Lowest Uniform Coverage"
             value={`${lowestSquadronData.squadronName} - ${lowestSquadronData.groupName}`}
             subtext={`${lowestSquadronData.avg.toFixed(2)} avg uniforms per reservist (${lowestSquadronData.totalReservists} reservists)`}
             color="text-indigo-600 dark:text-indigo-400"
             bgColor="bg-indigo-50 dark:bg-indigo-500/10"
           />
         )}
      </div>

      {/* ── Low Stock Alert Banner ── */}
      {lowStock.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-200 text-sm">Low Stock Alert</h3>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              {lowStock.length} item(s) at or below reorder level:{" "}
              {lowStock.slice(0, 5).map((s) => s.name).join(", ")}
              {lowStock.length > 5 && ` and ${lowStock.length - 5} more`}
            </p>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch(""); }}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all flex-1 justify-center",
                activeTab === tab.key
                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 shadow-sm"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
              )}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Header with Action Buttons ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">
          {activeTab === "inventory" && `${filteredSupplies.length} item${filteredSupplies.length !== 1 ? "s" : ""}`}
          {activeTab === "uniform-tracker" && `${uniformTracker.reduce((acc, sg) => acc + sg.reservists.length, 0)} reservist${uniformTracker.reduce((acc, sg) => acc + sg.reservists.length, 0) !== 1 ? "s" : ""}`}
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "inventory" && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus size={14} /> Add Item
            </button>
          )}
        </div>
      </div>

      {/* ── Tab Content ── */}
      {activeTab === "inventory" && (
        <InventoryTab
          supplies={filteredSupplies}
          categories={categories}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          search={search}
          setSearch={setSearch}
          onEdit={openEdit}
          onDelete={(s) => setDeleteConfirm(s)}
          onAdjust={openAdjust}
          onDetail={openDetail}
        />
      )}

      {activeTab === "uniform-tracker" && (
        <UniformTrackerTab
          search={search}
          setSearch={setSearch}
          uniformTracker={uniformTracker}
          loading={uniformTrackerLoading}
          supplies={supplies}
          onAssign={(item) => setAssignModal(item)}
        />
      )}

      {/* ── Modals ── */}
      <SupplyForm
        open={supplyFormOpen}
        onClose={() => { setSupplyFormOpen(false); setEditingSupply(null); }}
        onSubmit={editingSupply ? handleUpdateSupply : handleCreateSupply}
        initialData={editingSupply}
      />

      <StockAdjustForm
        open={stockAdjustOpen}
        onClose={() => { setStockAdjustOpen(false); setAdjustingSupply(null); }}
        onSubmit={handleAdjustStock}
        supply={adjustingSupply}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Delete Supply Item"
        description={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteSupply}
        onCancel={() => setDeleteConfirm(null)}
        destructive
      />

      {/* ── Supply Detail Modal ── */}
      {detailSupply && (
        <SupplyDetailModal supply={detailSupply} onClose={() => setDetailSupply(null)} />
      )}

      {/* ── Assign Item Modal ── */}
      <AssignItemModal
        context={assignModal}
        supplies={supplies}
        reservists={(() => {
          const map = new Map();
          uniformTracker.forEach((g) => g.reservists.forEach((r) => map.set(r.id, r)));
          return Array.from(map.values());
        })()}
        open={!!assignModal}
        onClose={() => setAssignModal(null)}
        onSubmit={handleAssignItem}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// INVENTORY TAB
// ═══════════════════════════════════════════════════════════════
function InventoryTab({
  supplies, categories, categoryFilter, setCategoryFilter,
  search, setSearch, onEdit, onDelete, onAdjust, onDetail,
}) {
  const groupedSupplies = useMemo(() => {
    const groups = {};
    supplies.forEach((s) => {
      const cat = s.category || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    });
    return groups;
  }, [supplies]);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items, categories, locations…"
            className={cn(
              "w-full rounded-lg border py-2 pl-9 pr-8 text-sm",
              "border-neutral-200 dark:border-neutral-700",
              "bg-white dark:bg-neutral-900",
              "text-neutral-800 dark:text-neutral-200",
              "placeholder:text-neutral-400 dark:placeholder:text-neutral-600",
              "outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400",
              "transition-all"
            )}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
              <X size={13} />
            </button>
          )}
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className={cn(
            "rounded-lg border py-2 pl-3 pr-8 text-sm",
            "border-neutral-200 dark:border-neutral-700",
            "bg-white dark:bg-neutral-900",
            "text-neutral-700 dark:text-neutral-300",
            "outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400",
            "cursor-pointer"
          )}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="ml-auto text-xs text-neutral-400 dark:text-neutral-600 shrink-0">
          {supplies.length} item{supplies.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Grouped Supply List */}
      <div className="flex flex-col gap-4">
        {Object.entries(groupedSupplies).length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 py-12 text-center">
            <p className="text-sm text-neutral-400">No supply items found</p>
            <button onClick={() => setSearch("")} className="mt-2 text-xs text-indigo-500 hover:underline">Clear search</button>
          </div>
        ) : (
          Object.entries(groupedSupplies).sort(([a], [b]) => a.localeCompare(b)).map(([category, items]) => (
            <div key={category} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{category}</h3>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-600">{items.length} item{items.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Item</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Stock</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Location</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Assigned Reservists</th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 bg-white dark:bg-neutral-900">
                      {items.map((supply) => {
                        const isLow = supply.quantity_available <= supply.reorder_level;
                        const reservists = supply.assigned_reservists
                          ? JSON.parse(supply.assigned_reservists || '[]')
                          : [];
                        return (
                          <tr key={supply.id} className="group hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                            <td className="px-4 py-3">
                              <button
                                onClick={() => onDetail(supply)}
                                className="text-left hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                              >
                                <span className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                                  {supply.name}
                                </span>
                                {supply.description && (
                                  <p className="text-[10px] text-neutral-400 mt-0.5 max-w-[200px] truncate">{supply.description}</p>
                                )}
                              </button>
                            </td>
                            <td className="px-4 py-3 min-w-[120px]">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-sm font-bold",
                                  supply.quantity_available === 0
                                    ? "text-red-500"
                                    : isLow
                                      ? "text-amber-600 dark:text-amber-400"
                                      : "text-neutral-800 dark:text-neutral-200"
                                )}>
                                  {supply.quantity_available}
                                </span>
                                <span className="text-[10px] text-neutral-400">{supply.unit}</span>
                              </div>
                              <div className="mt-1">
                                <StockLevelBar
                                  current={supply.quantity_available}
                                  reorder={supply.reorder_level}
                                  max={supply.max_stock || Math.max(supply.quantity_available, supply.reorder_level) * 2}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">
                              {supply.location || "—"}
                            </td>
                            <td className="px-4 py-3">
                              {reservists.length === 0 ? (
                                <span className="text-xs text-neutral-400 dark:text-neutral-600">No reservists assigned</span>
                              ) : (
                                <div className="space-y-1">
                                  {reservists.map((r) => (
                                    <div key={r.reservist_id} className="flex items-center gap-2 text-xs">
                                      <span className="font-medium text-neutral-700 dark:text-neutral-300">
                                        {r.last_name}, {r.first_name}
                                      </span>
                                      <span className="text-neutral-400">{r.rank}</span>
                                      <span className="text-neutral-400">·</span>
                                      <span className="text-neutral-500">Qty: {r.quantity_issued}</span>
                                      {r.due_return_date && (
                                        <span className="text-neutral-400">Due: {r.due_return_date}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => onAdjust(supply)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400 transition-all"
                                  title="Adjust Stock"
                                >
                                  <ArrowUpDown size={13} />
                                </button>
                                <button
                                  onClick={() => onEdit(supply)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400 transition-all"
                                  title="Edit"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() => onDelete(supply)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-all"
                                  title="Delete"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ASSIGN ITEM MODAL
// ═══════════════════════════════════════════════════════════════
function AssignItemModal({ context, supplies, reservists, open, onClose, onSubmit }) {
  const preselectedSupply = context?.supply || null;
  const preselectedReservists = context?.reservists || [];
  const preselectedSingleReservist = context?.reservist || null;

  const [selectedSupply, setSelectedSupply] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [issuanceType, setIssuanceType] = useState("issued");
  const [dueReturnDate, setDueReturnDate] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedReservistIds, setSelectedReservistIds] = useState([]);
  const [reservistSearch, setReservistSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [panelSize, setPanelSize] = useState({ width: 480, height: 520 });
  const [panelPosition, setPanelPosition] = useState({ x: 0, y: 0 });
  const dragState = useRef({ dragging: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const resizeState = useRef({ resizing: false, startX: 0, startY: 0, originW: 0, originH: 0 });

  useEffect(() => {
    if (!open) return;
    setSelectedSupply(preselectedSupply);
    setQuantity(1);
    setIssuanceType("issued");
    setDueReturnDate("");
    setNotes("");
    setSubmitting(false);
    setReservistSearch("");
    setPanelSize({ width: 480, height: 520 });
    setPanelPosition({ x: 0, y: 0 });
    if (preselectedSingleReservist) {
      setSelectedReservistIds([preselectedSingleReservist.id]);
    } else if (preselectedReservists.length > 0) {
      setSelectedReservistIds(preselectedReservists.map((r) => r.id));
    } else {
      setSelectedReservistIds([]);
    }
  }, [open, preselectedSupply, preselectedSingleReservist, preselectedReservists]);

  const handleMouseDown = (event) => {
    dragState.current = {
      dragging: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: panelPosition.x,
      originY: panelPosition.y,
    };
    const handleMouseMove = (moveEvent) => {
      if (!dragState.current.dragging) return;
      const dx = moveEvent.clientX - dragState.current.startX;
      const dy = moveEvent.clientY - dragState.current.startY;
      setPanelPosition({
        x: dragState.current.originX + dx,
        y: dragState.current.originY + dy,
      });
    };
    const handleMouseUp = () => {
      dragState.current.dragging = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleResizeMouseDown = (event) => {
    event.stopPropagation();
    resizeState.current = {
      resizing: true,
      startX: event.clientX,
      startY: event.clientY,
      originW: panelSize.width,
      originH: panelSize.height,
    };
    const handleMouseMove = (moveEvent) => {
      if (!resizeState.current.resizing) return;
      const dx = moveEvent.clientX - resizeState.current.startX;
      const dy = moveEvent.clientY - resizeState.current.startY;
      setPanelSize({
        width: Math.max(360, resizeState.current.originW + dx),
        height: Math.max(320, resizeState.current.originH + dy),
      });
    };
    const handleMouseUp = () => {
      resizeState.current.resizing = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const selectedSupplyId = selectedSupply?.supply_id || selectedSupply?.id;
  const availableSupplies = useMemo(() => (supplies || []).filter((s) => (s.quantity_available || 0) > 0), [supplies]);
  const resolvedSupply = useMemo(() => availableSupplies.find((s) => (s.supply_id || s.id) === selectedSupplyId) || selectedSupply, [availableSupplies, selectedSupplyId, selectedSupply]);
  const uniqueReservists = useMemo(() => {
    const map = new Map();
    (reservists || []).forEach((r) => map.set(r.id, r));
    preselectedReservists.forEach((r) => map.set(r.id, r));
    if (preselectedSingleReservist) map.set(preselectedSingleReservist.id, preselectedSingleReservist);
    return Array.from(map.values());
  }, [reservists, preselectedReservists, preselectedSingleReservist]);

  const filteredReservists = useMemo(() => {
    if (!reservistSearch.trim()) return uniqueReservists;
    const q = reservistSearch.toLowerCase();
    return uniqueReservists.filter((r) =>
      `${r.last_name}, ${r.first_name}`.toLowerCase().includes(q) ||
      (r.service_number || "").toLowerCase().includes(q) ||
      (r.rank || "").toLowerCase().includes(q)
    );
  }, [uniqueReservists, reservistSearch]);

  const handleSubmit = useCallback(async () => {
    if (!resolvedSupply || selectedReservistIds.length === 0 || !dueReturnDate) return;
    setSubmitting(true);
    try {
      await onSubmit({
        ...(selectedReservistIds.length === 1
          ? { reservist_id: selectedReservistIds[0] }
          : { reservist_ids: selectedReservistIds }),
        supply_id: resolvedSupply.supply_id || resolvedSupply.id,
        quantity_issued: quantity,
        due_return_date: dueReturnDate,
        issuance_type: issuanceType,
        notes: notes,
      });
    } finally {
      setSubmitting(false);
    }
  }, [resolvedSupply, selectedReservistIds, quantity, dueReturnDate, issuanceType, notes, onSubmit]);

  if (!open) return null;

  const supplyName = resolvedSupply?.name || resolvedSupply?.supply_name || 'this item';
  const resolvedQty = resolvedSupply?.quantity_available ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop:blur-sm" />
      <div
        style={{
          width: Math.min(panelSize.width, window.innerWidth - 32),
          height: Math.min(panelSize.height, window.innerHeight - 32),
          transform: `translate(calc(-50% + ${panelPosition.x}px), calc(-50% + ${panelPosition.y}px))`,
          position: "absolute",
          top: "50%",
          left: "50%",
        }}
        className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          onMouseDown={handleMouseDown}
          className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-6 py-4 cursor-move select-none"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <UserCheck size={18} />
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-neutral-900 dark:text-neutral-50">Assign {supplyName}</h2>
              <p className="text-[11px] text-neutral-400">
                {selectedReservistIds.length === 0
                  ? 'Select reservist(s)'
                  : `${selectedReservistIds.length} reservist${selectedReservistIds.length === 1 ? '' : 's'} selected`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-auto">
          <div>
            <label className="text-[10px] font-medium text-neutral-400 mb-1.5">Item</label>
            <div className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-800 dark:text-neutral-200">
              {supplyName} <span className="text-[10px] text-neutral-400">({resolvedQty} available)</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-neutral-400 mb-1.5">Assign To</label>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                value={reservistSearch}
                onChange={(e) => setReservistSearch(e.target.value)}
                placeholder="Search reservist…"
                className="w-full rounded-lg border py-2 pl-9 pr-8 text-sm border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
              />
            </div>
            <div className="max-h-56 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredReservists.map((r) => {
                const checked = selectedReservistIds.includes(r.id);
                return (
                  <label
                    key={r.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors",
                      checked ? "bg-indigo-50/60 dark:bg-indigo-500/10" : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedReservistIds((prev) =>
                          e.target.checked ? [...prev, r.id] : prev.filter((id) => id !== r.id)
                        );
                      }}
                      className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{r.last_name}, {r.first_name}</span>
                      <span className="text-[10px] text-neutral-400">{r.rank} · {r.service_number}</span>
                    </div>
                  </label>
                );
              })}
            </div>
            <p className="mt-1 text-[10px] text-neutral-400">{selectedReservistIds.length} selected</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium text-neutral-400 mb-1.5">Quantity</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-neutral-400 mb-1.5">Type</label>
              <select
                value={issuanceType}
                onChange={(e) => setIssuanceType(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
              >
                <option value="issued">Issued</option>
                <option value="personal">Personal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-neutral-400 mb-1.5">Due Return Date *</label>
            <input
              type="date"
              value={dueReturnDate}
              onChange={(e) => setDueReturnDate(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-medium text-neutral-400 mb-1.5">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 resize-none"
              rows="2"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 dark:border-neutral-800 px-6 py-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedReservistIds.length === 0 || !dueReturnDate || submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Assigning..." : `Assign to ${selectedReservistIds.length} Reservist${selectedReservistIds.length === 1 ? '' : 's'}`}
          </button>
        </div>
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
        >
          <div className="absolute bottom-1 right-1 h-2 w-2 rounded-sm border-r-2 border-b-2 border-neutral-400" />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// UNIFORM TRACKER TAB — Hierarchical Supply → Reservist Table
// ═══════════════════════════════════════════════════════════════
function UniformTrackerTab({ search, setSearch, uniformTracker, loading, supplies, onAssign }) {
  const [expandedSupplies, setExpandedSupplies] = useState({});

  const supplyHierarchy = useMemo(() => {
    const supplyMap = {};
    (supplies || []).forEach((s) => {
      const sid = s.supply_id || s.id;
      supplyMap[sid] = {
        supply_id: sid,
        supply_name: s.name || s.supply_name,
        category: s.category,
        reservists: [],
        has_active: false,
        total_issued: 0,
        total_returned: 0,
      };
    });
    uniformTracker.forEach((squadronGroup) => {
      squadronGroup.reservists.forEach((reservist) => {
        reservist.uniforms.forEach((uniform) => {
          const key = uniform.supply_id;
          if (!supplyMap[key]) {
            supplyMap[key] = {
              supply_id: uniform.supply_id,
              supply_name: uniform.supply_name,
              category: uniform.category,
              reservists: [],
              has_active: false,
              total_issued: 0,
              total_returned: 0,
            };
          }
          supplyMap[key].reservists.push({
            ...reservist,
            issuance_id: uniform.issuance_id,
            quantity_issued: uniform.quantity_issued,
            issued_date: uniform.issued_date,
            due_return_date: uniform.due_return_date,
            returned_date: uniform.returned_date,
            issuance_type: uniform.issuance_type,
            condition_on_issue: uniform.condition_on_issue,
            condition_on_return: uniform.condition_on_return,
          });
          supplyMap[key].total_issued += uniform.quantity_issued || 0;
          if (!uniform.returned_date) supplyMap[key].has_active = true;
          if (uniform.returned_date) supplyMap[key].total_returned += uniform.quantity_issued || 0;
        });
      });
    });
    return Object.values(supplyMap).sort((a, b) => a.supply_name.localeCompare(b.supply_name));
  }, [uniformTracker, supplies]);

  const supplyMapById = useMemo(() => {
    const m = new Map();
    (supplies || []).forEach((s) => m.set(s.supply_id || s.id, s));
    return m;
  }, [supplies]);

  const totalAssignments = useMemo(() => supplyHierarchy.reduce((a, s) => a + s.reservists.length, 0), [supplyHierarchy]);
  const totalActive = useMemo(() => supplyHierarchy.reduce((a, s) => a + (s.has_active ? 1 : 0), 0), [supplyHierarchy]);
  const totalReturned = useMemo(() => supplyHierarchy.reduce((a, s) => a + s.total_returned, 0), [supplyHierarchy]);
  const totalIssuedQuantity = useMemo(() => supplyHierarchy.reduce((a, s) => a + s.total_issued, 0), [supplyHierarchy]);

  const filteredHierarchy = useMemo(() => {
    if (!search.trim()) return supplyHierarchy;
    const q = search.toLowerCase();
    return supplyHierarchy
      .map((s) => ({
        ...s,
        reservists: s.reservists.filter(
          (r) =>
            `${r.last_name}, ${r.first_name}`.toLowerCase().includes(q) ||
            (r.service_number || "").toLowerCase().includes(q) ||
            (r.rank || "").toLowerCase().includes(q) ||
            (s.supply_name || "").toLowerCase().includes(q)
        ),
      }))
      .filter((s) => s.reservists.length > 0);
  }, [supplyHierarchy, search]);

  const toggleExpand = useCallback((id) => {
    setExpandedSupplies((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search supply, reservist, rank, or service number…"
            className="w-full rounded-lg border py-2 pl-9 pr-8 text-sm border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 py-1.5">
            <Boxes size={13} className="text-neutral-500" />
            <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">{supplyHierarchy.length} item{supplyHierarchy.length === 1 ? '' : 's'}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 py-1.5">
            <UserCheck size={13} className="text-blue-500" />
            <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">{totalActive} active</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 py-1.5">
            <Package size={13} className="text-emerald-500" />
            <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">{totalReturned} returned</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900">
                <th className="w-10 px-3 py-3" />
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Supply Item</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Category</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Assigned Reservist</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Issuance</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Qty</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Accountability</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredHierarchy.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Boxes size={28} className="text-neutral-300 dark:text-neutral-700" />
                      <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">No assignments found</p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-600">Try adjusting your filters or assign a new item.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredHierarchy.map((supply) => {
                  const isExpanded = !!expandedSupplies[supply.supply_id];
                  const isAllReturned = supply.reservists.every((r) => r.returned_date);
                  const isPartial = !isAllReturned && supply.reservists.some((r) => r.returned_date);
                  const missingCount = supply.reservists.filter((r) => r.returned_date).length;
                  const supplyDetail = supplyMapById.get(supply.supply_id);
                  const availableQty = supplyDetail?.quantity_available ?? 0;

                  const complePct = supply.total_issued ? Math.round((supply.total_returned / supply.total_issued) * 100) : 0;
                  return (
                    <Fragment key={supply.supply_id}>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800/70 bg-neutral-50/60 dark:bg-neutral-800/30 hover:bg-neutral-100/70 dark:hover:bg-neutral-800/50 transition-colors">
                        <td className="px-3 py-3">
                          <button
                            onClick={() => toggleExpand(supply.supply_id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400 transition-colors"
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{supply.supply_name}</span>
                            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">Unit available: {availableQty}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:text-neutral-400">
                            {supply.category || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{supply.reservists.length} assigned</span>
                            {isPartial && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400">{missingCount} still out</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{supply.total_issued}</span>
                            <span className="text-[10px] text-neutral-400">{supply.reservists.length} record{supply.reservists.length === 1 ? '' : 's'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">{supply.total_returned}/{supply.total_issued}</span>
                        </td>
                        <td className="px-4 py-3">
                          {isAllReturned ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                              All Returned
                            </span>
                          ) : isPartial ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                              {missingCount} missing
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                onAssign({ supply, reservists: supply.reservists });
                              }}
                              className="flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 text-[10px] font-semibold text-neutral-700 dark:text-neutral-300 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                              title="Assign / Reassign for this supply"
                            >
                              <UserCheck size={12} />
                              <span>{isAllReturned ? 'Assign' : 'Reassign'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        supply.reservists.map((r) => {
                          const rowReturned = !!r.returned_date;

                          return (
                            <tr key={`${supply.supply_id}-${r.id}`} className="border-b border-neutral-100 dark:border-neutral-800/60 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                              <td className="px-3 py-2.5" />
                              <td className="px-4 py-2.5">
                                <div className="pl-3 border-l-2 border-neutral-200 dark:border-neutral-700">
                                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500">↳</span>
                                  <span className="ml-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">{r.last_name}, {r.first_name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="pl-3 flex flex-col text-[11px] text-neutral-500 dark:text-neutral-400">
                                  <span>{r.rank}</span>
                                  <span className="text-[10px] text-neutral-400">{r.service_number}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="inline-flex items-center rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:text-neutral-400">
                                  {r.issuance_type === 'issued' ? 'Issued' : 'Personal'}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">{r.quantity_issued}</span>
                              </td>
                              <td className="px-4 py-2.5">
                                {rowReturned ? (
                                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Returned</span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">Outstanding</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => onAssign({ supply, reservist: r })}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400 transition-colors"
                                    title="Assign / Reassign"
                                  >
                                    <UserCheck size={11} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUPPLY DETAIL MODAL
// ═══════════════════════════════════════════════════════════════
function SupplyDetailModal({ supply, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-lg rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Package size={18} />
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-neutral-900 dark:text-neutral-50">{supply.name}</h2>
              <p className="text-[11px] text-neutral-400">{supply.category}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {supply.description && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{supply.description}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
              <p className="text-[10px] font-medium text-neutral-400">Available</p>
              <p className={cn(
                "text-xl font-bold mt-0.5",
                supply.quantity_available <= supply.reorder_level
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-neutral-900 dark:text-neutral-50"
              )}>
                {supply.quantity_available} <span className="text-xs font-normal text-neutral-400">{supply.unit}</span>
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
              <p className="text-[10px] font-medium text-neutral-400">Reorder Level</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50 mt-0.5">
                {supply.reorder_level} <span className="text-xs font-normal text-neutral-400">{supply.unit}</span>
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
              <p className="text-[10px] font-medium text-neutral-400">Max Stock</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50 mt-0.5">
                {supply.max_stock || "—"}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
              <p className="text-[10px] font-medium text-neutral-400">Location</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50 mt-0.5">
                {supply.location || "—"}
              </p>
            </div>
          </div>
          {supply.supplier && (
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
              <p className="text-[10px] font-medium text-neutral-400">Supplier</p>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">{supply.supplier}</p>
            </div>
          )}
<div>
             <p className="text-[10px] font-medium text-neutral-400 mb-1.5">Stock Level</p>
             <StockLevelBar
               current={supply.quantity_available}
               reorder={supply.reorder_level}
               max={supply.max_stock || Math.max(supply.quantity_available, supply.reorder_level) * 2}
             />
           </div>
           {(() => {
             const reservists = supply.assigned_reservists
               ? JSON.parse(supply.assigned_reservists || '[]')
               : [];
             if (reservists.length === 0) return null;
             return (
               <div>
                 <p className="text-[10px] font-medium text-neutral-400 mb-1.5">Assigned Reservists ({reservists.length})</p>
                 <div className="space-y-2">
                   {reservists.map((r) => (
                     <div key={r.reservist_id} className="flex items-center justify-between rounded-lg border border-neutral-100 dark:border-neutral-700 p-2.5">
                       <div className="flex items-center gap-2">
                         <div className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                           {r.last_name.charAt(0)}{r.first_name.charAt(0)}
                         </div>
                         <div>
                           <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">{r.last_name}, {r.first_name}</p>
                           <p className="text-[10px] text-neutral-400">{r.rank} · {r.service_number}</p>
                         </div>
                       </div>
                       <div className="text-right">
                         <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Qty: {r.quantity_issued}</p>
                         <p className="text-[10px] text-neutral-400">Due: {r.due_return_date}</p>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             );
           })()}
         </div>
      </div>
    </div>
  );
}
