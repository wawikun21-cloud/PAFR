import {
  Users, UserCheck, ShieldCheck, GraduationCap,
  ClipboardCheck, AlertTriangle, TrendingUp, TrendingDown,
  BookOpen, Calendar, Clock, MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap = { Users, UserCheck, ShieldCheck, GraduationCap, ClipboardCheck, AlertTriangle };

const colorMap = {
  blue:    { bg: "bg-blue-50 dark:bg-blue-500/10",    icon: "text-blue-600 dark:text-blue-400",    border: "border-blue-100 dark:border-blue-500/20" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-500/10", icon: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-100 dark:border-emerald-500/20" },
  indigo:  { bg: "bg-indigo-50 dark:bg-indigo-500/10",  icon: "text-indigo-600 dark:text-indigo-400",  border: "border-indigo-100 dark:border-indigo-500/20" },
  amber:   { bg: "bg-amber-50 dark:bg-amber-500/10",   icon: "text-amber-600 dark:text-amber-400",   border: "border-amber-100 dark:border-amber-500/20" },
  orange:  { bg: "bg-orange-50 dark:bg-orange-500/10", icon: "text-orange-600 dark:text-orange-400", border: "border-orange-100 dark:border-orange-500/20" },
  red:     { bg: "bg-red-50 dark:bg-red-500/10",      icon: "text-red-600 dark:text-red-400",      border: "border-red-100 dark:border-red-500/20" },
};

const trainingStatusIconMap = {
  BCMT: BookOpen,
  ADT: Calendar,
  VADT: Clock,
  ROTC: GraduationCap,
  Others: MoreHorizontal,
};

const trainingStatusColorMap = {
  BCMT: { bg: "bg-blue-50 dark:bg-blue-500/10", icon: "text-blue-600 dark:text-blue-400", border: "border-blue-100 dark:border-blue-500/20" },
  ADT: { bg: "bg-emerald-50 dark:bg-emerald-500/10", icon: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-100 dark:border-emerald-500/20" },
  VADT: { bg: "bg-indigo-50 dark:bg-indigo-500/10", icon: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-100 dark:border-indigo-500/20" },
  ROTC: { bg: "bg-amber-50 dark:bg-amber-500/10", icon: "text-amber-600 dark:text-amber-400", border: "border-amber-100 dark:border-amber-500/20" },
  Others: { bg: "bg-orange-50 dark:bg-orange-500/10", icon: "text-orange-600 dark:text-orange-400", border: "border-orange-100 dark:border-orange-500/20" },
};

function KPICard({ item }) {
  const Icon = iconMap[item.icon];
  const c = colorMap[item.color];

  return (
    <div className={cn(
      "relative flex flex-col gap-3 rounded-xl p-4",
      "border border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900",
      "hover:border-neutral-300 dark:hover:border-neutral-700",
      "hover:shadow-sm dark:hover:shadow-none",
      "transition-all duration-200",
      "group"
    )}>
      <div className="flex items-start justify-between">
        <span className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg",
          c.bg, c.border, "border"
        )}>
          <Icon size={17} className={c.icon} strokeWidth={1.8} />
        </span>

        {item.trend === "up" && (
          <span className="flex items-center gap-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <TrendingUp size={12} /> Up
          </span>
        )}
        {item.trend === "down" && (
          <span className="flex items-center gap-0.5 text-[11px] font-medium text-red-500 dark:text-red-400">
            <TrendingDown size={12} /> Down
          </span>
        )}
        {item.trend === "warn" && (
          <span className="flex items-center gap-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            <AlertTriangle size={12} /> Alert
          </span>
        )}
      </div>

      <div>
        <p className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 leading-none">
          {item.value}
        </p>
        <p className="mt-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-500 leading-snug">
          {item.label}
        </p>
      </div>

      <p className={cn(
        "text-[11px] font-medium",
        item.trend === "up"   && "text-emerald-600 dark:text-emerald-400",
        item.trend === "down" && "text-red-500 dark:text-red-400",
        item.trend === "warn" && "text-amber-600 dark:text-amber-400",
        !item.trend           && "text-neutral-400 dark:text-neutral-500"
      )}>
        {item.sub}
      </p>

      <span className={cn(
        "absolute bottom-0 left-4 right-4 h-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200",
        item.color === "blue"    && "bg-blue-400",
        item.color === "emerald" && "bg-emerald-400",
        item.color === "indigo"  && "bg-indigo-400",
        item.color === "amber"   && "bg-amber-400",
        item.color === "orange"  && "bg-orange-400",
        item.color === "red"     && "bg-red-400",
      )} />
    </div>
  );
}

function TrainingStatusCard({ status, count }) {
  const Icon = trainingStatusIconMap[status];
  const c = trainingStatusColorMap[status];

  return (
    <div className={cn(
      "relative flex flex-col gap-3 rounded-xl p-4",
      "border border-neutral-200 dark:border-neutral-800",
      "bg-white dark:bg-neutral-900",
      "hover:border-neutral-300 dark:hover:border-neutral-700",
      "hover:shadow-sm dark:hover:shadow-none",
      "transition-all duration-200",
      "group"
    )}>
      <div className="flex items-start justify-between">
        <span className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg",
          c.bg, c.border, "border"
        )}>
          <Icon size={17} className={c.icon} strokeWidth={1.8} />
        </span>
      </div>

      <div>
        <p className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 leading-none">
          {count.toLocaleString()}
        </p>
        <p className="mt-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-500 leading-snug">
          {status === "BCMT" && "Basic Citizen Military Training"}
          {status === "ADT" && "Active Duty Training"}
          {status === "VADT" && "Voluntary Active Duty Training"}
          {status === "ROTC" && "Reserve Officers' Training Corps"}
          {status === "Others" && "Other Training Status"}
        </p>
      </div>
    </div>
  );
}

function buildKPIData(kpis) {
  if (!kpis) return [];
  return [
    {
      id: "total-reservists",
      label: "Total Reservists",
      value: (kpis.total_reservists || 0).toLocaleString(),
      sub: `${kpis.active_reservists || 0} active`,
      icon: "Users",
      trend: null,
      color: "blue",
    },
    {
      id: "active-reservists",
      label: "Active Reservists",
      value: (kpis.active_reservists || 0).toLocaleString(),
      sub: `${kpis.standby_reservists || 0} standby`,
      icon: "UserCheck",
      trend: null,
      color: "emerald",
    },
    {
      id: "readiness-score",
      label: "Avg Readiness Score",
      value: `${kpis.avg_readiness_score || 0}%`,
      sub: `Training ${kpis.avg_training_participation || 0}% · Attend ${kpis.avg_attendance_rate || 0}%`,
      icon: "ShieldCheck",
      trend: null,
      color: "indigo",
    },
    {
      id: "trainings",
      label: "Total Trainings",
      value: (kpis.total_trainings || 0).toString(),
      sub: `${kpis.completed_trainings || 0} completed · ${kpis.ongoing_trainings || 0} ongoing`,
      icon: "GraduationCap",
      trend: null,
      color: "amber",
    },
    {
      id: "attendance-rate",
      label: "Avg Attendance Rate",
      value: `${kpis.overall_attendance_rate || 0}%`,
      sub: "Across all trainings",
      icon: "ClipboardCheck",
      trend: null,
      color: "orange",
    },
    {
      id: "below-threshold",
      label: "Below Threshold",
      value: (kpis.below_threshold_count || 0).toString(),
      sub: "Readiness < 65%",
      icon: "AlertTriangle",
      trend: kpis.below_threshold_count > 0 ? "warn" : null,
      color: "red",
    },
  ];
}

export default function KPIStatsGrid({ data, filters }) {
  const isTrainingStatusSelected = filters?.reservistStatus && filters.reservistStatus !== "All Reservist Status";

  if (isTrainingStatusSelected) {
    const statusCounts = data?.training_status_counts || { bcmt: 0, adt: 0, vadt: 0, rotc: 0, others: 0 };

    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {[
          { id: "bcmt", status: "BCMT" },
          { id: "adt", status: "ADT" },
          { id: "vadt", status: "VADT" },
          { id: "rotc", status: "ROTC" },
          { id: "others", status: "Others" },
        ].map(({ id, status }) => (
          <TrainingStatusCard
            key={id}
            status={status}
            count={statusCounts[id] || 0}
          />
        ))}
      </div>
    );
  }

  const kpiData = buildKPIData(data);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {kpiData.map((item) => (
        <KPICard key={item.id} item={item} />
      ))}
    </div>
  );
}