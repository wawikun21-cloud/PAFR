import { useState, useEffect } from "react";
import { Filter, ChevronDown, RefreshCw, Loader } from "lucide-react";
import { cn } from "@/lib/utils";
import { getReservistFilterMetadata } from "@/services/api";

/**
 * FilterSelect
 * Reusable styled <select> wrapper.
 */
function FilterSelect({ label, value, options, onChange, placeholder }) {
  return (
    <div className="flex flex-col gap-1 w-full sm:w-auto">
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
            "transition-all duration-150 cursor-pointer w-full sm:min-w-[130px] sm:w-auto"
          )}
        >
          <option value="">{placeholder || "All"}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
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
  const [metadata, setMetadata] = useState(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const handleArsenChange = (val) => onChange({ ...filters, arsenId: val, groupId: "", squadronId: "" });
  const handleGroupChange = (val) => onChange({ ...filters, groupId: val, squadronId: "" });
  const patch = (key) => (val) => onChange({ ...filters, [key]: val });

  useEffect(() => {
    let cancelled = false;
    setMetaLoading(true);
    getReservistFilterMetadata()
      .then((res) => {
        if (!cancelled && res.data.status === "success") setMetadata(res.data.data);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setMetaLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleReset = () =>
    onChange({
      arsenId: "",
      groupId: "",
      squadronId: "",
      reserveStatus: "",
      sourceOfCommission: "",
      category: "",
      dateRange: "May 1 – May 31, 2025",
    });

  const arsenOptions = metadata?.arsens?.map((a) => ({ value: String(a.id), label: a.name })) ?? [];
  const groupOptions = metadata?.groups?.map((g) => ({ value: String(g.id), label: g.name })) ?? [];
  const squadronOptions = metadata?.squadrons?.map((s) => ({ value: String(s.id), label: s.name })) ?? [];
  const reserveStatusOptions = metadata?.reserveStatuses?.map((rs) => ({ value: rs, label: rs })) ?? [];
  const sourceOptions = metadata?.sourcesOfCommission?.map((s) => ({ value: s, label: s })) ?? [];
  const categoryOptions = metadata?.categories?.map((c) => ({ value: c, label: c })) ?? [];

  return (
    <div className={cn(
      "flex flex-col gap-3 rounded-xl border px-3 py-3 sm:px-4",
      "border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900"
    )}>
      {/* Label */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 dark:text-neutral-600">
        <Filter size={12} />
        Filters
        {metaLoading && <Loader size={12} className="animate-spin text-neutral-400 dark:text-neutral-500 shrink-0 ml-1" />}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
        <FilterSelect
          label="ARSEN"
          value={filters.arsenId}
          options={arsenOptions}
          onChange={handleArsenChange}
          placeholder="All ARSENs"
        />
        <FilterSelect
          label="Group"
          value={filters.groupId}
          options={groupOptions}
          onChange={handleGroupChange}
          placeholder="All Groups"
        />
        <FilterSelect
          label="Squadron"
          value={filters.squadronId}
          options={squadronOptions}
          onChange={patch("squadronId")}
          placeholder="All Squadrons"
        />
        <FilterSelect
          label="Reserve Status"
          value={filters.reserveStatus}
          options={reserveStatusOptions}
          onChange={patch("reserveStatus")}
          placeholder="All Reserve Statuses"
        />
        <FilterSelect
          label="Source"
          value={filters.sourceOfCommission}
          options={sourceOptions}
          onChange={patch("sourceOfCommission")}
          placeholder="All Sources"
        />
        <FilterSelect
          label="Category"
          value={filters.category}
          options={categoryOptions}
          onChange={patch("category")}
          placeholder="All Categories"
        />

        {/* Reset */}
        <div className="col-span-2 flex flex-col gap-1 sm:self-end">
          <div className="hidden h-[14px] sm:block" /> {/* spacer for label row */}
          <button
            onClick={handleReset}
            className={cn(
              "flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium sm:w-auto",
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
    </div>
  );
}