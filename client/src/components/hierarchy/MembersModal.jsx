import { useEffect, useRef, useState } from "react";
import {
  X, Users, Search, ChevronUp, ChevronDown, ChevronsUpDown,
  CheckCircle2, XCircle, Shield, Layers, MapPin, Tag, Loader, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getReservists } from "@/services/api";
import * as XLSX from "xlsx";

// ── Status badge ──────────────────────────────────────────────
function StatusBadge({ status }) {
  const isActive = status === "active";
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0",
      isActive
        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
        : "bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-500 dark:border-neutral-700"
    )}>
      {isActive ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

// ── Sort icon ─────────────────────────────────────────────────
function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ChevronsUpDown size={11} className="text-neutral-300 dark:text-neutral-700" />;
  return sortDir === "asc"
    ? <ChevronUp   size={11} className="text-indigo-500" />
    : <ChevronDown size={11} className="text-indigo-500" />;
}

// ── Generate mock members for a given node ────────────────────
function generateMembers(node, nodeType) {
  const firstNames = ["Juan", "Maria", "Pedro", "Ana", "Ramon", "Elena", "Jose", "Carmen", "Roberto", "Lucia", "Miguel", "Rosa", "Carlos", "Teresa", "Antonio", "Gloria", "Eduardo", "Conchita", "Victor", "Dolores"];
  const lastNames  = ["Dela Cruz", "Santos", "Reyes", "Garcia", "Cruz", "Flores", "Mendoza", "Lopez", "Torres", "Ramos", "Aquino", "Bautista", "Villanueva", "Castillo", "Pascual", "Navarro", "Domingo", "Fernandez", "Lim", "Morales"];
  const ranks      = ["Private", "Private First Class", "Corporal", "Sergeant", "Staff Sergeant", "Technical Sergeant", "Master Sergeant", "Second Lieutenant", "First Lieutenant", "Captain"];
  const specs      = ["Security", "Engineering", "Communications", "Medical", "Supply", "Transport", "Radar Ops", "Intelligence", "Cyber", "Administrative"];

  const count = node.members ?? node.reservists ?? 10;
  const seed  = node.id?.charCodeAt(0) ?? 1;

  return Array.from({ length: Math.min(count, 30) }, (_, i) => {
    const fi = (seed + i * 3) % firstNames.length;
    const li = (seed + i * 7) % lastNames.length;
    const ri = (seed + i * 5) % ranks.length;
    const si = (seed + i * 11) % specs.length;
    const yr = 2017 + (i % 6);

    return {
      id:             `${node.id}-m${i}`,
      serialNo:       `PAF-${String(seed * 10 + i).padStart(3, "0")}-${yr}`,
      firstName:      firstNames[fi],
      lastName:       lastNames[li],
      rank:           ranks[ri],
      specialization: specs[si],
      status:         i % 5 === 0 ? "inactive" : "active",
      dateEnlisted:   `${yr}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
      attendanceRate: 55 + ((seed + i * 13) % 45),
    };
  });
}

// ── Context label per level ───────────────────────────────────
function contextLabel(nodeType, node) {
  if (nodeType === "arcen")    return { icon: Shield,  label: node.name,    sub: node.fullName  };
  if (nodeType === "group")    return { icon: Layers,  label: node.name,    sub: node.code      };
  if (nodeType === "squadron") return { icon: MapPin,  label: `${node.name} Squadron`, sub: node.location };
  return { icon: Users, label: node.name, sub: "" };
}

const COLS = [
  { key: "serialNo",    label: "Serial No.",  sortable: true  },
  { key: "lastName",    label: "Name",        sortable: true  },
  { key: "rank",        label: "Rank",        sortable: true  },
  { key: "specialization", label: "Spec.",    sortable: true  },
  { key: "attendanceRate", label: "Attend.", sortable: true  },
  { key: "dateEnlisted",   label: "Enlisted", sortable: true  },
  { key: "status",      label: "Status",      sortable: false },
];

/**
 * MembersModal
 * Opens when any node (ARCEN / Group / Squadron) is clicked in the Overview.
 *
 * @param {{
 *   open: boolean,
 *   node: object | null,
 *   nodeType: "arcen" | "group" | "squadron",
 *   onClose: () => void,
 * }} props
 */
export default function MembersModal({ open, node, nodeType, onClose }) {
  const overlayRef  = useRef(null);
  const [search,    setSearch]   = useState("");
  const [sortField, setSortField] = useState("lastName");
  const [sortDir,   setSortDir]  = useState("asc");
  const [statusFilter, setStatusFilter] = useState("");

  // Real data for squadron nodes (from /api/reservists)
  const [realMembers, setRealMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Reset search/filter when node changes
  useEffect(() => { setSearch(""); setStatusFilter(""); }, [node]);

  // Fetch real reservists for squadron nodes from hierarchy
  useEffect(() => {
    if (!open || !node) {
      setRealMembers([]);
      setFetchError(null);
      return;
    }

    let squadronDbId = null;
    const idStr = String(node.id || node.squadron_id || '');
    if (idStr.startsWith('sq-')) {
      squadronDbId = parseInt(idStr.slice(3), 10);
    } else if (nodeType === 'squadron' && !isNaN(parseInt(node.id))) {
      squadronDbId = parseInt(node.id, 10);
    }

    if (nodeType === 'squadron' && squadronDbId) {
      const load = async () => {
        setLoadingMembers(true);
        setFetchError(null);
        try {
          const res = await getReservists({ squadron_id: squadronDbId, limit: 100 });
          const rows = res.data?.data || [];
          const mapped = rows.map((r) => ({
            id: r.id,
            serialNo: r.service_number || `RES-${r.id}`,
            firstName: r.first_name || '',
            lastName: r.last_name || '',
            rank: r.rank || '',
            specialization: r.specialization || r.position || '',
            status: r.is_active ? 'active' : 'inactive',
            dateEnlisted: r.date_enlisted || '',
            attendanceRate: 65 + ((r.id || 0) % 30), // placeholder (real attendance in separate endpoint)
          }));
          setRealMembers(mapped);
        } catch (err) {
          setFetchError(err.response?.data?.message || 'Failed to load squadron reservists');
          setRealMembers([]);
        } finally {
          setLoadingMembers(false);
        }
      };
      load();
    } else {
      setRealMembers([]);
    }
  }, [open, node, nodeType]);

  if (!open || !node) return null;

  const isSquadronNode = nodeType === 'squadron' && realMembers.length > 0;
  const members = isSquadronNode ? realMembers : generateMembers(node, nodeType);
  const ctx     = contextLabel(nodeType, node);
  const CtxIcon = ctx.icon;

  // Filter + sort
  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = !q || [m.firstName, m.lastName, m.serialNo, m.rank, m.specialization]
      .some((v) => v.toLowerCase().includes(q));
    const matchStatus = !statusFilter || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortField] ?? "";
    const bv = b[sortField] ?? "";
    const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  const handleSort = (key) => {
    if (sortField === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(key); setSortDir("asc"); }
  };

  const handleExport = () => {
    const exportData = sorted.map((m, idx) => ({
      'No.': idx + 1,
      'Serial No.': m.serialNo,
      'Last Name': m.lastName,
      'First Name': m.firstName,
      'Rank': m.rank,
      'Specialization': m.specialization,
      'Status': m.status,
      'Date Enlisted': m.dateEnlisted,
      'Attendance Rate': `${m.attendanceRate}%`,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Squadron Members');
    const fileName = nodeType === 'squadron' 
      ? `${node.name.replace(/\s+/g, '_')}_members_${new Date().toISOString().slice(0, 10)}.xlsx`
      : `${nodeType}_${node.name.replace(/\s+/g, '_')}_members_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const activeCount   = members.filter((m) => m.status === "active").length;
  const inactiveCount = members.filter((m) => m.status === "inactive").length;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" />

      {/* Modal panel */}
      <div className={cn(
        "relative z-10 flex flex-col w-full max-w-4xl max-h-[88vh]",
        "rounded-2xl border shadow-2xl shadow-black/20 dark:shadow-black/50",
        "bg-white dark:bg-neutral-900",
        "border-neutral-200 dark:border-neutral-800",
        "animate-in fade-in zoom-in-95 duration-150"
      )}>

        {/* ── Header ──────────────────────────────────────────── */}
        <div className={cn(
          "flex items-center justify-between gap-3 shrink-0",
          "border-b border-neutral-100 dark:border-neutral-800 px-4 py-4 sm:px-6"
        )}>
          <div className="flex min-w-0 items-center gap-3">
            {/* Node icon */}
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-indigo-900/40">
              <CtxIcon size={16} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="truncate text-[15px] font-bold text-neutral-900 dark:text-neutral-50 leading-none">
                  {ctx.label}
                </h2>
                <span className="shrink-0 rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[10px] font-mono text-neutral-500">
                  {node.code}
                </span>
              </div>
              {ctx.sub && (
                <p className="mt-0.5 truncate text-[11px] text-neutral-400 dark:text-neutral-600">
                  {ctx.sub}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Stats row ────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 shrink-0 border-b border-neutral-100 dark:border-neutral-800 px-4 py-3 sm:px-6 bg-neutral-50 dark:bg-neutral-900/60">
          {[
            { label: "Total Members", value: members.length, color: "text-neutral-800 dark:text-neutral-200" },
            { label: "Active",        value: activeCount,    color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Inactive",      value: inactiveCount,  color: "text-neutral-400 dark:text-neutral-600" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className={cn("text-[15px] font-black leading-none", s.color)}>{s.value}</span>
              <span className="text-[11px] text-neutral-400 dark:text-neutral-600">{s.label}</span>
              <span className="text-neutral-200 dark:text-neutral-700 last:hidden">·</span>
            </div>
          ))}
        </div>

        {/* ── Toolbar ──────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 px-4 py-3 sm:px-6 border-b border-neutral-100 dark:border-neutral-800">
          {/* Search */}
          <div className="relative w-full flex-1 sm:max-w-xs">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, serial, rank…"
              className={cn(
                "w-full rounded-lg border py-2 pl-8 pr-3 text-sm",
                "border-neutral-200 dark:border-neutral-700",
                "bg-white dark:bg-neutral-800",
                "text-neutral-800 dark:text-neutral-200",
                "placeholder:text-neutral-400 dark:placeholder:text-neutral-600",
                "outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400",
                "transition-all duration-150"
              )}
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={cn(
              "shrink-0 rounded-lg border py-2 pl-3 pr-7 text-sm cursor-pointer",
              "border-neutral-200 dark:border-neutral-700",
              "bg-white dark:bg-neutral-800",
              "text-neutral-700 dark:text-neutral-300",
              "outline-none focus:ring-2 focus:ring-indigo-500/40",
              "transition-all duration-150"
            )}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Export button */}
          <button
            onClick={handleExport}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium",
              "border-emerald-200 dark:border-emerald-500/30",
              "bg-emerald-50 dark:bg-emerald-500/10",
              "text-emerald-600 dark:text-emerald-400",
              "hover:bg-emerald-100 dark:hover:bg-emerald-500/20",
              "transition-all duration-150"
            )}
          >
            <Download size={13} />
            Export
          </button>

          {/* Result count */}
          <span className="w-full text-xs text-neutral-400 dark:text-neutral-600 sm:ml-auto sm:w-auto shrink-0">
            {sorted.length} of {members.length} members
          </span>
        </div>

        {loadingMembers && (
          <div className="px-6 py-2 text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60">
            <Loader size={12} className="animate-spin" /> Loading actual reservists from database…
          </div>
        )}
        {fetchError && (
          <div className="px-6 py-1.5 text-xs text-red-600 dark:text-red-400 border-b border-neutral-100 dark:border-neutral-800 bg-red-50 dark:bg-red-950/30">
            {fetchError} (demo data shown)
          </div>
        )}

        {/* ── Table ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto styled-scroll">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                <th className="w-8 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-400">#</th>
                {COLS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={cn(
                      "px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500",
                      col.sortable && "cursor-pointer select-none hover:text-neutral-700 dark:hover:text-neutral-300"
                    )}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && <SortIcon field={col.key} sortField={sortField} sortDir={sortDir} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 bg-white dark:bg-neutral-900">
              {loadingMembers ? (
                <tr>
                  <td colSpan={COLS.length + 1} className="py-12 text-center text-sm text-neutral-400">
                    Loading reservists…
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={COLS.length + 1} className="py-12 text-center text-sm text-neutral-400">
                    {fetchError ? 'Failed to load data.' : 'No members match your search.'}
                  </td>
                </tr>
              ) : (
                sorted.map((m, i) => (
                  <tr
                    key={m.id}
                    className="group hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors duration-100"
                  >
                    {/* Row number */}
                    <td className="px-4 py-2.5 text-[11px] text-neutral-300 dark:text-neutral-700 font-mono">
                      {i + 1}
                    </td>

                    {/* Serial */}
                    <td className="px-4 py-2.5">
                      <span className="rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500">
                        {m.serialNo}
                      </span>
                    </td>

                    {/* Name + avatar */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-[9px] font-bold text-white">
                          {m.firstName[0]}{m.lastName[0]}
                        </span>
                        <span className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                          {m.lastName}, {m.firstName}
                        </span>
                      </div>
                    </td>

                    {/* Rank */}
                    <td className="px-4 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                      {m.rank}
                    </td>

                    {/* Specialization */}
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                        <Tag size={9} /> {m.specialization}
                      </span>
                    </td>

                    {/* Attendance */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              m.attendanceRate >= 80 ? "bg-emerald-400"
                              : m.attendanceRate >= 60 ? "bg-amber-400"
                              : "bg-red-400"
                            )}
                            style={{ width: `${m.attendanceRate}%` }}
                          />
                        </div>
                        <span className={cn(
                          "text-[11px] font-semibold",
                          m.attendanceRate >= 80 ? "text-emerald-600 dark:text-emerald-400"
                          : m.attendanceRate >= 60 ? "text-amber-500"
                          : "text-red-500"
                        )}>
                          {m.attendanceRate}%
                        </span>
                      </div>
                    </td>

                    {/* Date enlisted */}
                    <td className="px-4 py-2.5 text-xs text-neutral-500 dark:text-neutral-500">
                      {m.dateEnlisted}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-2.5">
                      <StatusBadge status={m.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2 shrink-0 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 px-4 py-3 sm:px-6">
          <p className="text-[11px] text-neutral-400 dark:text-neutral-600">
            Showing <span className="font-semibold text-neutral-600 dark:text-neutral-400">{sorted.length}</span> of{" "}
            <span className="font-semibold text-neutral-600 dark:text-neutral-400">{members.length}</span> total members
          </p>
          <button
            onClick={onClose}
            className={cn(
              "rounded-lg border px-4 py-1.5 text-sm font-medium",
              "border-neutral-200 dark:border-neutral-700",
              "text-neutral-600 dark:text-neutral-400",
              "hover:bg-neutral-100 dark:hover:bg-neutral-800",
              "transition-colors duration-150"
            )}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}