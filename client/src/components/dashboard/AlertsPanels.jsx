import {
  AlertTriangle, Info, CheckCircle2, Bell,
  TrendingDown, Activity, Users, Dumbbell,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── LOW PERFORMING AREAS ─────────────────────────────────────────

function ReadinessBar({ score }) {
  const color =
    score >= 80 ? "bg-emerald-400" :
    score >= 70 ? "bg-indigo-400" :
    score >= 65 ? "bg-amber-400" : "bg-red-400";

  const text =
    score >= 80 ? "text-emerald-600 dark:text-emerald-400" :
    score >= 70 ? "text-indigo-600 dark:text-indigo-400" :
    score >= 65 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${score}%` }} />
      </div>
      <span className={cn("w-[38px] shrink-0 text-right text-[11px] font-bold", text)}>
        {score}%
      </span>
    </div>
  );
}

function FlagBadge({ flag }) {
  const isCritical = flag === "critical";
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
      isCritical
        ? "bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
        : "bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
    )}>
      {isCritical
        ? <AlertTriangle size={9} className="shrink-0" />
        : <TrendingDown size={9} className="shrink-0" />
      }
      {isCritical ? "Critical" : "Warning"}
    </span>
  );
}

export function LowPerformingAreas({ data }) {
  const items = data || [];

  return (
    <div className={cn(
      "rounded-xl border border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900 p-4 sm:p-5"
    )}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={14} className="text-amber-500 dark:text-amber-400 shrink-0" strokeWidth={1.8} />
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 tracking-tight">
          Low Performing Areas
        </h3>
        <span className="ml-auto shrink-0 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
          {items.length} flagged
        </span>
      </div>

      {items.length > 0 ? (
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="mb-2 grid grid-cols-[1fr_70px_52px_64px] sm:grid-cols-[1fr_80px_64px_72px] gap-2 min-w-[340px]">
            {["Area", "Readiness", "Attend.", "Status"].map((h) => (
              <span key={h} className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-600">
                {h}
              </span>
            ))}
          </div>

          <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800 min-w-[340px]">
            {items.map((row, i) => (
              <div
                key={row.name || i}
                className={cn(
                  "grid grid-cols-[1fr_70px_52px_64px] sm:grid-cols-[1fr_80px_64px_72px] gap-2 items-center py-3 px-1 rounded-lg",
                  "transition-colors duration-150",
                  (row.readiness || 0) < 60
                    ? "hover:bg-red-50/40 dark:hover:bg-red-500/5"
                    : "hover:bg-amber-50/40 dark:hover:bg-amber-500/5"
                )}
              >
                <span className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                  {row.name}
                </span>
                <ReadinessBar score={row.readiness || 0} />
                <span className={cn(
                  "text-[11px] font-semibold",
                  (row.attendance || 0) < 70
                    ? "text-red-600 dark:text-red-400"
                    : (row.attendance || 0) < 85
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
                )}>
                  {row.attendance || 0}%
                </span>
                <FlagBadge flag={(row.readiness || 0) < 60 ? "critical" : "warning"} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex h-24 items-center justify-center text-xs text-neutral-400">
          No low performing areas
        </div>
      )}

      <div className="mt-4 flex items-start gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 px-3 py-2.5">
        <Info size={12} className="mt-0.5 shrink-0 text-amber-500" />
        <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-snug">
          Areas below 65% readiness are flagged critical and require immediate intervention.
        </p>
      </div>
    </div>
  );
}

// ─── ALERTS & INSIGHTS ────────────────────────────────────────────

const alertConfig = {
  critical: {
    icon: AlertTriangle,
    containerCn: "border-red-100 bg-red-50/60 dark:border-red-500/20 dark:bg-red-500/5",
    iconCn: "text-red-500 dark:text-red-400",
    badgeCn: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
    label: "Critical",
  },
  warning: {
    icon: AlertTriangle,
    containerCn: "border-amber-100 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/5",
    iconCn: "text-amber-500 dark:text-amber-400",
    badgeCn: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
    label: "Warning",
  },
  info: {
    icon: CheckCircle2,
    containerCn: "border-indigo-100 bg-indigo-50/60 dark:border-indigo-500/20 dark:bg-indigo-500/5",
    iconCn: "text-indigo-500 dark:text-indigo-400",
    badgeCn: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400",
    label: "Info",
  },
};

function AlertItem({ alert }) {
  const type = alert.target_role === "all" ? "info" : "warning";
  const cfg = alertConfig[type] || alertConfig.info;
  const Icon = cfg.icon;

  return (
    <div className={cn(
      "flex gap-3 rounded-lg border p-3",
      "transition-all duration-150",
      cfg.containerCn
    )}>
      <span className={cn("mt-0.5 shrink-0", cfg.iconCn)}>
        <Icon size={14} strokeWidth={1.8} />
      </span>
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
            cfg.badgeCn
          )}>
            {cfg.label}
          </span>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-600 ml-auto shrink-0">
            {alert.created_at ? new Date(alert.created_at).toLocaleDateString() : ""}
          </span>
        </div>
        <p className="text-[12px] text-neutral-700 dark:text-neutral-300 leading-snug">
          {alert.message || alert.title}
        </p>
      </div>
    </div>
  );
}

export function AlertsInsights({ data }) {
  const items = data || [];

  return (
    <div className={cn(
      "rounded-xl border border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900 p-4 sm:p-5"
    )}>
      <div className="flex items-center gap-2 mb-4">
        <Bell size={14} className="text-indigo-500 dark:text-indigo-400 shrink-0" strokeWidth={1.8} />
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 tracking-tight">
          Alerts & Insights
        </h3>
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <span className="rounded-full bg-indigo-100 dark:bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-400">
            {items.length} active
          </span>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="flex flex-col gap-2">
          {items.map((alert) => (
            <AlertItem key={alert.id} alert={alert} />
          ))}
        </div>
      ) : (
        <div className="flex h-24 items-center justify-center text-xs text-neutral-400">
          No active alerts
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-[11px] text-neutral-400 dark:text-neutral-600">
          {items.length} total alerts
        </span>
      </div>
    </div>
  );
}