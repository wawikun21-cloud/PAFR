import { useState } from "react";
import { Search, X, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SortIcon
 */
function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ChevronsUpDown size={12} className="text-neutral-300 dark:text-neutral-700" />;
  return sortDir === "asc"
    ? <ChevronUp   size={12} className="text-indigo-500" />
    : <ChevronDown size={12} className="text-indigo-500" />;
}

/**
 * ManagementTable
 * Reusable table with search, column sort, and filter slot.
 *
 * @param {{
 *   columns: { key: string, label: string, sortable?: boolean, className?: string }[],
 *   data: object[],
 *   renderRow: (row: object, i: number) => React.ReactNode,
 *   searchKeys: string[],
 *   searchPlaceholder?: string,
 *   filterSlot?: React.ReactNode,
 *   emptyMessage?: string,
 * }} props
 */
export default function ManagementTable({
  columns,
  data,
  renderRow,
  searchKeys = [],
  searchPlaceholder = "Search…",
  filterSlot,
  emptyMessage = "No records found.",
}) {
  const [search,   setSearch]   = useState("");
  const [sortField, setSortField] = useState(null);
  const [sortDir,   setSortDir]   = useState("asc");

  // Search filter
  const searched = search.trim()
    ? data.filter((row) =>
        searchKeys.some((key) =>
          String(row[key] ?? "").toLowerCase().includes(search.toLowerCase())
        )
      )
    : data;

  // Sort
  const sorted = sortField
    ? [...searched].sort((a, b) => {
        const av = a[sortField] ?? "";
        const bv = b[sortField] ?? "";
        const cmp = typeof av === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      })
    : searched;

  const handleSort = (key) => {
    if (sortField === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative w-full min-w-0 flex-1 sm:min-w-[220px] sm:max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className={cn(
              "w-full rounded-lg border py-2 pl-8 pr-7 text-sm",
              "border-neutral-200 dark:border-neutral-700",
              "bg-white dark:bg-neutral-900",
              "text-neutral-800 dark:text-neutral-200",
              "placeholder:text-neutral-400 dark:placeholder:text-neutral-600",
              "outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400",
              "transition-all duration-150"
            )}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* External filter slot */}
        {filterSlot}

        {/* Result count */}
        <span className="ml-auto text-xs text-neutral-400 dark:text-neutral-600 shrink-0">
          {sorted.length} record{sorted.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Table ────────────────────────────────────────────── */}
      <div className={cn(
        "overflow-hidden rounded-xl border",
        "border-neutral-200 dark:border-neutral-800"
      )}>
        <div className="overflow-x-auto styled-scroll">
          <table className="w-full min-w-[640px] text-sm">
            {/* Head */}
            <thead>
              <tr className={cn(
                "border-b border-neutral-200 dark:border-neutral-800",
                "bg-neutral-50 dark:bg-neutral-900"
              )}>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={cn(
                      "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider",
                      "text-neutral-500 dark:text-neutral-500",
                      col.sortable && "cursor-pointer select-none hover:text-neutral-700 dark:hover:text-neutral-300",
                      col.className
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      {col.label}
                      {col.sortable && (
                        <SortIcon field={col.key} sortField={sortField} sortDir={sortDir} />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 bg-white dark:bg-neutral-900">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-sm text-neutral-400 dark:text-neutral-600">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                sorted.map((row, i) => renderRow(row, i))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}