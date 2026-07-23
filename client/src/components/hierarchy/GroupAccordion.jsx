import { useState } from "react";
import { ChevronRight, Users, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHierarchy } from "./HierarchyContext";
import SquadronList from "./SquadronList";
import MembersModal from "./MembersModal";

export default function GroupAccordion({ group }) {
  const { expandedGroupId, toggleGroup } = useHierarchy();
  const isOpen = expandedGroupId === group.id;
  const [modal, setModal] = useState(false);

  const activeCount   = group.squadrons.filter((s) => s.status === "active").length;
  const inactiveCount = group.squadrons.length - activeCount;

  return (
    <>
      <div className={cn(
        "rounded-lg border overflow-hidden transition-colors duration-150",
        isOpen
          ? "border-blue-200 dark:border-blue-500/30"
          : "border-neutral-200 dark:border-neutral-800"
      )}>
        {/* ── Header ────────────────────────────────────────────── */}
        <div className={cn(
          "flex w-full flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5",
          "transition-all duration-150",
          isOpen
            ? "bg-blue-50 dark:bg-blue-500/10"
            : "bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800/60"
        )}>
          {/* Expand toggle */}
          <button
            onClick={() => toggleGroup(group.id)}
            aria-expanded={isOpen}
            className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 rounded"
          >
            <ChevronRight
              size={13}
              className={cn(
                "shrink-0 text-neutral-400 dark:text-neutral-600 transition-transform duration-200",
                isOpen && "rotate-90 text-blue-500 dark:text-blue-400"
              )}
            />

            <span className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded",
              isOpen
                ? "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
            )}>
              <Layers size={12} strokeWidth={1.8} />
            </span>

            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className={cn(
                "text-[13px] font-bold truncate",
                isOpen ? "text-blue-700 dark:text-blue-300" : "text-neutral-700 dark:text-neutral-300"
              )}>
                {group.name}
              </span>
              <span className="shrink-0 rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 font-mono text-[9px] text-neutral-500">
                {group.code}
              </span>
              <span className="hidden shrink-0 text-[10px] text-neutral-400 dark:text-neutral-600 sm:inline">
                {group.type}
              </span>
            </div>
          </button>

          {/* Right side: stats + members button */}
          <div className="ml-8 flex shrink-0 flex-wrap items-center gap-2 sm:ml-0">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="flex items-center gap-1 text-[10px] text-neutral-500">
                <Users size={10} /> {group.reservists}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                {activeCount} active
              </span>
              {inactiveCount > 0 && (
                <span className="text-[10px] text-neutral-400">· {inactiveCount} inactive</span>
              )}
            </div>

            {/* View Members button */}
            <button
              onClick={(e) => { e.stopPropagation(); setModal(true); }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium",
                "border-blue-200 dark:border-blue-500/30",
                "bg-blue-50 dark:bg-blue-500/10",
                "text-blue-600 dark:text-blue-400",
                "hover:bg-blue-100 dark:hover:bg-blue-500/20",
                "transition-all duration-150"
              )}
            >
              <Users size={11} />
              Members
            </button>
          </div>
        </div>

        {/* ── Squadrons ────────────────────────────────────────── */}
        <div className={cn(
          "overflow-hidden transition-all duration-200 ease-out",
          isOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="border-t border-blue-100 dark:border-blue-500/20 bg-blue-50/40 dark:bg-blue-500/5 px-3 py-3">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-blue-400 dark:text-blue-500">
              <span className="inline-block h-px w-3 bg-blue-300 dark:bg-blue-600" />
              Squadrons — {group.name} ({group.squadrons.length})
            </p>
            <SquadronList squadrons={group.squadrons} />
          </div>
        </div>
      </div>

      {/* Members Modal */}
      <MembersModal
        open={modal}
        node={group}
        nodeType="group"
        onClose={() => setModal(false)}
      />
    </>
  );
}