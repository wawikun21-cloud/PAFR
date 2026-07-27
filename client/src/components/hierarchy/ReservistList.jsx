import { useState } from "react";
import {
  Users, UserPlus, CheckCircle2, Clock, XCircle,
  Phone, Tag, Calendar, Search, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { reservistsBySquadron } from "@/data/reservistsData";
import AddReservistModal from "./AddReservistModal";

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function StatusPill({ status }) {
  const map = {
    active:   { icon: CheckCircle2, label: "Active",   cn: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" },
    training: { icon: Clock,        label: "Training", cn: "bg-indigo-50  text-indigo-700  border-indigo-200  dark:bg-indigo-500/10  dark:text-indigo-400  dark:border-indigo-500/20"  },
    inactive: { icon: XCircle,      label: "Inactive", cn: "bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-500 dark:border-neutral-700" },
  };
  const cfg = map[status] ?? map.inactive;
  const Icon = cfg.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
      cfg.cn
    )}>
      <Icon size={9} className="shrink-0" />
      {cfg.label}
    </span>
  );
}

function ReservistCard({ reservist }) {
  const initials = reservist.name
    .split(" ")
    .filter((w) => /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  return (
    <div className={cn(
      "group flex items-start gap-3 rounded-xl border p-3.5",
      "border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900",
      "hover:border-neutral-300 dark:hover:border-neutral-700",
      "hover:shadow-sm dark:hover:shadow-none",
      "transition-all duration-150"
    )}>
      {/* Avatar */}
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-[11px] font-bold text-white shadow-sm">
        {initials || "?"}
      </span>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200 leading-tight truncate">
            {reservist.name}
          </p>
          <StatusPill status={reservist.status} />
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-500">
            <Tag size={10} className="text-indigo-400" /> {reservist.rank}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-600">
            <Phone size={10} /> {reservist.contact}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-600">
            <Calendar size={10} /> Since {reservist.joined}
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600">
        <Users size={22} strokeWidth={1.5} />
      </span>
      <div>
        <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">No reservists found</p>
        <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-600">
          This squadron has no enrolled personnel yet.
        </p>
      </div>
      <button
        onClick={onAdd}
        className="mt-1 flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-semibold text-white transition-colors duration-150"
      >
        <UserPlus size={13} /> Add First Reservist
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────

/**
 * ReservistList
 * Presentational + local state (search + modal trigger).
 * Reads from reservistsBySquadron mock; accepts extra runtime entries.
 *
 * @param {{
 *   squadronId: string,
 *   squadronName: string,
 *   arcenName?: string,
 *   groupName?: string,
 * }} props
 */
export default function ReservistList({ squadronId, squadronName, arcenName, groupName }) {
  const [search, setSearch]       = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [extras, setExtras]       = useState([]);   // runtime-added reservists

  const base     = reservistsBySquadron[squadronId] ?? [];
  const all      = [...base, ...extras];
  const filtered = search.trim()
    ? all.filter((r) =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.rank.toLowerCase().includes(search.toLowerCase()) ||
        r.status.toLowerCase().includes(search.toLowerCase())
      )
    : all;

  const counts = {
    total:    all.length,
    active:   all.filter((r) => r.status === "active").length,
    training: all.filter((r) => r.status === "training").length,
    inactive: all.filter((r) => r.status === "inactive").length,
  };

  const handleNewReservist = (r) => setExtras((prev) => [r, ...prev]);

  return (
    <>
      {/* ── Panel header ─────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Users size={14} className="shrink-0 text-indigo-500" strokeWidth={1.8} />
              <h3 className="truncate text-[13px] font-bold text-neutral-800 dark:text-neutral-200">
                {squadronName} · Personnel
              </h3>
            </div>
            {/* Stat pills */}
            <div className="mt-1.5 flex flex-wrap gap-2">
              {[
                { label: `${counts.total} total`,    color: "text-neutral-500 dark:text-neutral-500"  },
                { label: `${counts.active} active`,   color: "text-emerald-600 dark:text-emerald-400" },
                { label: `${counts.training} training`, color: "text-indigo-600 dark:text-indigo-400" },
                counts.inactive > 0 && { label: `${counts.inactive} inactive`, color: "text-neutral-400" },
              ].filter(Boolean).map((s) => (
                <span key={s.label} className={cn("text-[11px] font-medium", s.color)}>
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          {/* Add button */}
          <button
            onClick={() => setModalOpen(true)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold",
              "bg-indigo-600 hover:bg-indigo-700 text-white",
              "shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30",
              "transition-colors duration-150"
            )}
          >
            <UserPlus size={12} /> Add Reservist
          </button>
        </div>

        {/* Search */}
        {all.length > 0 && (
          <div className="relative">
            <Search
              size={12}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-600"
            />
            <input
              type="text"
              placeholder="Search by name, rank, status…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                "w-full rounded-lg border py-2 pl-8 pr-8 text-xs",
                "border-neutral-200 dark:border-neutral-700",
                "bg-white dark:bg-neutral-900",
                "text-neutral-800 dark:text-neutral-200",
                "placeholder:text-neutral-400 dark:placeholder:text-neutral-600",
                "outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400",
                "transition-all duration-150"
              )}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X size={11} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── List ─────────────────────────────────────────────── */}
      <div className="mt-3 flex flex-col gap-2">
        {all.length === 0 ? (
          <EmptyState onAdd={() => setModalOpen(true)} />
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-400 dark:text-neutral-600 italic">
            No results for "{search}"
          </p>
        ) : (
          filtered.map((r) => <ReservistCard key={r.id} reservist={r} />)
        )}
      </div>

      {/* ── Modal ────────────────────────────────────────────── */}
      <AddReservistModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        context={{
          arcen:    arcenName    ?? undefined,
          group:    groupName    ?? undefined,
          squadron: squadronName ?? undefined,
        }}
        onSubmit={handleNewReservist}
      />
    </>
  );
}