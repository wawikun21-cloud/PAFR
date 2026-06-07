import { Filter, ChevronDown, RefreshCw, ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterOptions } from "@/data/dashboardData";

/**
 * FilterSelect
 * Reusable styled <select> wrapper.
 */
function FilterSelect({ label, value, options, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-600 px-0.5">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "appearance-none rounded-lg border pr-7 pl-3 py-2 text-xs font-medium",
            "border-neutral-200 dark:border-neutral-700",
            "bg-white dark:bg-neutral-900",
            "text-neutral-700 dark:text-neutral-300",
            "outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400",
            "transition-all duration-150 cursor-pointer min-w-[140px]"
          )}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <ChevronDown
          size={12}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-600"
        />
      </div>
    </div>
  );
}

/**
 * DashboardFilters
 * Smart filter bar — owns display; parent owns state.
 *
 * @param {{ filters: object, onChange: (patch: object) => void }} props
 */
export default function DashboardFilters({ filters, onChange }) {
  const patch = (key) => (val) => onChange({ ...filters, [key]: val });

  const handleReset = () =>
    onChange({
      dateRange: filterOptions.dateRanges[0],
      group:     filterOptions.groups[0],
      area:      filterOptions.areas[0],
      status:    filterOptions.statuses[0],
      reservistStatus: filterOptions.reservistStatuses[0],
    });

  return (
    <div className={cn(
      "flex flex-wrap items-end gap-3 rounded-xl border px-4 py-3",
      "border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900"
    )}>
      {/* Label */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 dark:text-neutral-600 self-end pb-2 mr-1">
        <Filter size={12} />
        Filters
      </div>

      <FilterSelect
        label="Date Range"
        value={filters.dateRange}
        options={filterOptions.dateRanges}
        onChange={patch("dateRange")}
      />
      <FilterSelect
        label="Group"
        value={filters.group}
        options={filterOptions.groups}
        onChange={patch("group")}
      />
      <FilterSelect
        label="Area"
        value={filters.area}
        options={filterOptions.areas}
        onChange={patch("area")}
      />
      <FilterSelect
        label="Status"
        value={filters.status}
        options={filterOptions.statuses}
        onChange={patch("status")}
      />

      {/* Training Status Toggle */}
      <div className="flex flex-col gap-1 self-end">
        <div className="h-[14px]" /> {/* spacer for label row */}
        <button
          onClick={() => {
            const hasTrainingStatus = filters.reservistStatus && filters.reservistStatus !== "All Reservist Status";
            onChange({ ...filters, reservistStatus: hasTrainingStatus ? "All Reservist Status" : "BCMT" });
          }}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium",
            "border-neutral-200 dark:border-neutral-700",
            "text-neutral-500 dark:text-neutral-400",
            "hover:text-neutral-800 dark:hover:text-neutral-200",
            "hover:bg-neutral-50 dark:hover:bg-neutral-800",
            "hover:border-neutral-300 dark:hover:border-neutral-600",
            "transition-all duration-150",
            filters.reservistStatus && filters.reservistStatus !== "All Reservist Status" && "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300"
          )}
        >
          <ListFilter size={11} />
          Training Status
        </button>
      </div>

      {/* Reset */}
      <div className="flex flex-col gap-1 self-end">
        <div className="h-[14px]" /> {/* spacer for label row */}
        <button
          onClick={handleReset}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium",
            "border-neutral-200 dark:border-neutral-700",
            "text-neutral-500 dark:text-neutral-400",
            "hover:text-neutral-800 dark:hover:text-neutral-200",
            "hover:bg-neutral-50 dark:hover:bg-neutral-800",
            "hover:border-neutral-300 dark:hover:border-neutral-600",
            "transition-all duration-150"
          )}
        >
          <RefreshCw size={11} />
          Reset
        </button>
      </div>
    </div>
  );
}