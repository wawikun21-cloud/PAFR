import { X, Users, Tag, CheckCircle2, XCircle, MapPin, Shield, Layers, PlaneTakeoff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHierarchy } from "./HierarchyContext";

/**
 * Resolve breadcrumb from the squadron's own parent properties.
 * Works with both mock data and API data.
 */
function resolveBreadcrumb(squadron) {
  // API/data v2: squadron has group_name, arsen_name directly
  if (squadron.group_name && squadron.arsen_name) {
    return {
      arcen: squadron.arsen_name,
      arcenFull: squadron.arsen_name,
      group: squadron.group_name,
    };
  }
  // Legacy mock-style: squadron has group with arcen nested
  if (squadron.group && squadron.group.arcen) {
    return {
      arcen: squadron.group.arcen.name,
      arcenFull: squadron.group.arcen.fullName || squadron.group.arcen.name,
      group: squadron.group.name,
    };
  }
  return null;
}

export default function SelectedSquadronPanel() {
  const { selectedSquadron, selectSquadron, openMembersModal } = useHierarchy();
  if (!selectedSquadron) return null;

  const bc = resolveBreadcrumb(selectedSquadron);
  const isActive = selectedSquadron.status === "active" || selectedSquadron.status === true;

  return (
    <div className={cn(
      "sticky bottom-3 mx-3 max-w-3xl sm:bottom-4 sm:mx-auto",
      "rounded-2xl border shadow-xl shadow-black/10 dark:shadow-black/40",
      "border-indigo-200 dark:border-indigo-500/30",
      "bg-white dark:bg-neutral-900",
      "animate-in slide-in-from-bottom-2 fade-in duration-200"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <MapPin size={13} strokeWidth={2} />
          </span>
          <div>
            <p className="text-[13px] font-bold text-neutral-900 dark:text-neutral-50 leading-none">
              {selectedSquadron.name} Squadron
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-neutral-400">{selectedSquadron.code}</p>
          </div>
        </div>
        <button
          onClick={() => selectSquadron(selectedSquadron)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="grid grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-4 sm:gap-4 sm:px-5">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Status</span>
          <span className={cn(
            "flex items-center gap-1.5 text-[12px] font-semibold",
            isActive ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-500"
          )}>
            {isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Members</span>
          <button
            onClick={() => openMembersModal(selectedSquadron)}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-neutral-800 dark:text-neutral-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer text-left"
            title="View all reservists in this squadron"
          >
            <Users size={12} className="text-indigo-500" /> {selectedSquadron.members ?? 0} <span className="text-[10px] text-indigo-400 ml-1">view →</span>
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Specialization</span>
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-neutral-800 dark:text-neutral-200">
            <Tag size={12} className="text-indigo-500" /> {selectedSquadron.specialization || '—'}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Location</span>
          <span className="flex items-center gap-1 text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
            <MapPin size={11} className="text-indigo-500 shrink-0" />
            <span className="truncate">{selectedSquadron.location || '—'}</span>
          </span>
        </div>
      </div>

      {/* Breadcrumb trail */}
      {bc && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-neutral-100 dark:border-neutral-800 px-4 py-2.5 text-[10px] text-neutral-400 dark:text-neutral-600 sm:px-5">
          <PlaneTakeoff size={9} />
          <span>PAFR Airbase</span>
          <span>›</span>
          <Shield size={9} />
          <span className="font-medium">{bc.arcen}</span>
          {bc.arcenFull && bc.arcenFull !== bc.arcen && (
            <span className="text-neutral-300 dark:text-neutral-700">({bc.arcenFull})</span>
          )}
          <span>›</span>
          <Layers size={9} />
          <span className="font-medium">{bc.group}</span>
          <span>›</span>
          <MapPin size={9} />
          <span className="font-semibold text-indigo-500 dark:text-indigo-400">{selectedSquadron.name}</span>
        </div>
      )}
    </div>
  );
}