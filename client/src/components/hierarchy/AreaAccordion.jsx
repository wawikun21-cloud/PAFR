import { useState } from "react";
import { ChevronRight, Users, Layers, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHierarchy } from "./HierarchyContext";
import SquadronList from "./SquadronList";

/**
 * AreaAccordion
 * Renders an Area (top-level) containing nested ARCEN → Group → Squadron
 * with expand/collapse accordion behavior.
 */
export default function AreaAccordion({ area }) {
  const [open, setOpen] = useState(false);
  const { expandedAreaId, toggleArea } = useHierarchy();
  const isOpen = expandedAreaId === area.id;

  const totalReservists = area.reservists || 0;
  const totalGroups = area.arcens?.reduce((sum, arc) => sum + (arc.groups?.length || 0), 0) || 0;
  const totalSquadrons = area.arcens?.reduce((sum, arc) =>
    sum + (arc.groups?.reduce((s, g) => s + (g.squadrons?.length || 0), 0) || 0), 0) || 0;

  return (
    <>
      {/* Area header */}
      <div className={cn(
        "rounded-lg border overflow-hidden transition-colors duration-150",
        isOpen
          ? "border-indigo-200 dark:border-indigo-500/30"
          : "border-neutral-200 dark:border-neutral-800"
      )}>
        <div
          onClick={() => toggleArea(area.id)}
          className={cn(
            "flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5 cursor-pointer sm:px-4 sm:py-3",
            "transition-all duration-150",
            isOpen
              ? "bg-indigo-50 dark:bg-indigo-500/10"
              : "bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800/60"
          )}
        >
          {/* Expand toggle */}
          <ChevronRight
            size={14}
            className={cn(
              "shrink-0 text-neutral-400 dark:text-neutral-600 transition-transform duration-200",
              isOpen && "rotate-90 text-indigo-500 dark:text-indigo-400"
            )}
          />

          {/* Area icon */}
          <span className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded",
            isOpen
              ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
          )}>
            <MapPin size={14} strokeWidth={1.8} />
          </span>

          {/* Area name + code */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className={cn(
              "text-[14px] font-bold truncate",
              isOpen ? "text-indigo-700 dark:text-indigo-300" : "text-neutral-800 dark:text-neutral-200"
            )}>
              {area.name}
            </span>
            <span className="shrink-0 rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 font-mono text-[9px] text-neutral-500">
              {area.code}
            </span>
            {area.region && (
              <span className="hidden shrink-0 text-[10px] text-neutral-400 dark:text-neutral-600 sm:inline">
                {area.region}
              </span>
            )}
          </div>

          {/* Stats pills */}
          <div className="ml-8 flex shrink-0 items-center gap-2 sm:ml-0">
            <span className="flex items-center gap-1 text-[10px] text-neutral-500">
              <Users size={9} /> {totalReservists}
            </span>
            <span className="text-[9px] text-neutral-400">
              {totalSquadrons} sqdn · {totalGroups} grp
            </span>
          </div>
        </div>

        {/* ── ARCEN list (nested) ─────────────────────────────── */}
        <div className={cn(
          "overflow-hidden transition-all duration-200 ease-out",
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-950/40 px-3 py-3">
            {area.arcens && area.arcens.length > 0 ? (
              <div className="flex flex-col gap-3">
                {area.arcens.map((arcen) => (
                  <ArsenBlock key={arcen.id} arcen={arcen} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400 text-center py-4">
                No ARCENs configured for this area.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * ArsenBlock — displays a single ARCEN with its nested Groups and Squadrons.
 */
function ArsenBlock({ arcen }) {
  const [open, setOpen] = useState(false);

  const totalReservists = arcen.reservists || 0;
  const totalSquadrons = arcen.groups?.reduce((sum, g) => sum + (g.squadrons?.length || 0), 0) || 0;
  const activeSquadrons = arcen.groups?.reduce((sum, g) =>
    sum + (g.squadrons?.filter(s => s.status === "active").length || 0), 0) || 0;

  return (
    <div className={cn(
      "rounded-lg border overflow-hidden",
      "border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900"
    )}>
      {/* ARCEN header */}
      <div
        onClick={() => setOpen(!open)}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
      >
        <ChevronRight
          size={12}
          className={cn(
            "shrink-0 text-neutral-400 dark:text-neutral-600 transition-transform duration-200",
            open && "rotate-90 text-indigo-500 dark:text-indigo-400"
          )}
        />

        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
          <Layers size={12} strokeWidth={1.8} />
        </span>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-[13px] font-bold text-neutral-800 dark:text-neutral-200 truncate">
            {arcen.name}
          </span>
          <span className="shrink-0 rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 font-mono text-[9px] text-neutral-500">
            {arcen.code}
          </span>
          {arcen.commander && (
            <span className="hidden truncate text-[10px] text-neutral-400 dark:text-neutral-600 sm:inline">
              {arcen.commander}
            </span>
          )}
        </div>

        <div className="ml-7 flex shrink-0 items-center gap-2 sm:ml-0">
          <span className="flex items-center gap-1 text-[10px] text-neutral-500">
            <Users size={9} /> {totalReservists}
          </span>
          <span className="text-[9px] text-neutral-400">
            {activeSquadrons}/{totalSquadrons} active
          </span>
        </div>
      </div>

      {/* Groups + Squadrons */}
      <div className={cn(
        "overflow-hidden transition-all duration-200 ease-out",
        open ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="border-t border-neutral-100 dark:border-neutral-800 px-3 py-2">
          {arcen.groups && arcen.groups.length > 0 ? (
            arcen.groups.map((group) => (
              <GroupBlock key={group.id} group={group} />
            ))
          ) : (
            <p className="text-xs text-neutral-400 text-center py-3">
              No groups under this ARCEN.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * GroupBlock — displays a single Group with its nested Squadrons.
 */
function GroupBlock({ group }) {
  const [open, setOpen] = useState(false);
  const { expandedGroupId, toggleGroup } = useHierarchy();
  const isOpen = expandedGroupId === group.id;

  const activeCount = group.squadrons?.filter(s => s.status === "active").length || 0;
  const inactiveCount = (group.squadrons?.length || 0) - activeCount;

  return (
    <div className="mb-1">
      <div
        onClick={() => toggleGroup(group.id)}
        className={cn(
          "rounded-lg border overflow-hidden transition-colors duration-150 cursor-pointer",
          isOpen
            ? "border-blue-200 dark:border-blue-500/30"
            : "border-neutral-100 dark:border-neutral-800",
          isOpen
            ? "bg-blue-50 dark:bg-blue-500/10"
            : "bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800/60"
        )}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2">
          <ChevronRight
            size={11}
            className={cn(
              "shrink-0 text-neutral-400 dark:text-neutral-600 transition-transform duration-200",
              isOpen && "rotate-90 text-blue-500 dark:text-blue-400"
            )}
          />

          <span className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded",
            isOpen
              ? "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
          )}>
            <Layers size={10} strokeWidth={1.8} />
          </span>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className={cn(
              "text-[12px] font-bold truncate",
              isOpen ? "text-blue-700 dark:text-blue-300" : "text-neutral-700 dark:text-neutral-300"
            )}>
              {group.name}
            </span>
            <span className="shrink-0 rounded bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 font-mono text-[8px] text-neutral-500">
              {group.code}
            </span>
            {group.type && (
              <span className="hidden shrink-0 text-[9px] text-neutral-400 dark:text-neutral-600 sm:inline">
                {group.type}
              </span>
            )}
            {group.commander && (
              <span className="hidden truncate text-[9px] text-neutral-400 dark:text-neutral-600 sm:inline">
                {group.commander}
              </span>
            )}
          </div>

          <div className="ml-6 flex shrink-0 items-center gap-1.5 sm:ml-0">
            <span className="flex items-center gap-1 text-[9px] text-neutral-500">
              <Users size={8} /> {group.reservists}
            </span>
            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">
              {activeCount} active
            </span>
            {inactiveCount > 0 && (
              <span className="text-[9px] text-neutral-400 dark:text-neutral-600">
                · {inactiveCount} inact
              </span>
            )}
          </div>
        </div>

        {/* Squadrons */}
        <div className={cn(
          "overflow-hidden transition-all duration-200 ease-out",
          isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="border-t border-blue-100 dark:border-blue-500/20 bg-blue-50/40 dark:bg-blue-500/5 px-3 py-2">
            <p className="mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-widest text-blue-400 dark:text-blue-500">
              <span className="inline-block h-px w-2 bg-blue-300 dark:bg-blue-600" />
              Squadrons ({group.squadrons?.length || 0})
            </p>
            <SquadronList squadrons={group.squadrons || []} />
          </div>
        </div>
      </div>
    </div>
  );
}