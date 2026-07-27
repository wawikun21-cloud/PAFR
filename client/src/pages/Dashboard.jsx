import { useState, useEffect } from "react";
import { getDashboard, getAlerts } from "@/services/api";
import { cn } from "@/lib/utils";
import { ShieldCheck, Zap, UserCheck, Award } from "lucide-react";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import KPIStatsGrid from "@/components/dashboard/KPIStatsGrid";
import ForceDistributionChart from "@/components/dashboard/ForceDistributionChart";
import TrainingActivityChart from "@/components/dashboard/TrainingActivityChart";
import AttendanceAnalytics from "@/components/dashboard/AttendanceAnalytics";
import ReadinessScoreChart from "@/components/dashboard/ReadinessScoreChart";
import ReservistProfileOverview from "@/components/dashboard/ReservistProfileOverview";
import { LowPerformingAreas, AlertsInsights } from "@/components/dashboard/AlertsPanels";
import { Loader } from "lucide-react";

const DEFAULT_FILTERS = {
  arsenId: "",
  groupId: "",
  squadronId: "",
  reserveStatus: "",
  sourceOfCommission: "",
  category: "",
  dateRange: "May 1 – May 31, 2025",
};

export default function Dashboard() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const colorMap = {
    blue:    { bg: "bg-blue-50 dark:bg-blue-500/10",    icon: "text-blue-600 dark:text-blue-400",    border: "border-blue-100 dark:border-blue-500/20" },
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-500/10", icon: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-100 dark:border-emerald-500/20" },
    indigo:  { bg: "bg-indigo-50 dark:bg-indigo-500/10",  icon: "text-indigo-600 dark:text-indigo-400",  border: "border-indigo-100 dark:border-indigo-500/20" },
    amber:   { bg: "bg-amber-50 dark:bg-amber-500/10",   icon: "text-amber-600 dark:text-amber-400",   border: "border-amber-100 dark:border-amber-500/20" },
  };

  useEffect(() => {
    loadDashboardData(filters);
  }, [filters]);

  const loadDashboardData = async (activeFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (activeFilters.arsenId) params.arsen_id = activeFilters.arsenId;
      if (activeFilters.groupId) params.group_id = activeFilters.groupId;
      if (activeFilters.squadronId) params.squadron_id = activeFilters.squadronId;
      if (activeFilters.reserveStatus) params.reserve_status = activeFilters.reserveStatus;
      if (activeFilters.sourceOfCommission) params.source_of_commission = activeFilters.sourceOfCommission;
      if (activeFilters.category) params.category = activeFilters.category;

      const [dashRes, alertsRes] = await Promise.all([
        getDashboard(params),
        getAlerts({ params: { limit: 6, severity: 'critical' } })
      ]);
      if (dashRes.data.status === 'success') {
        const data = dashRes.data.data;
        if (alertsRes.data?.status === 'success') {
          data.live_critical_alerts = alertsRes.data.data?.alerts || [];
          data.alert_summary = alertsRes.data.data?.summary || null;
        }
        setDashboardData(data);
      }
    } catch (err) {
      console.error('Dashboard error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-800 dark:text-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-10 sm:gap-6">
      <DashboardFilters filters={filters} onChange={setFilters} />

      <KPIStatsGrid data={dashboardData?.kpis} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'BCMT', value: dashboardData?.kpis?.bcmt ?? 0, Icon: ShieldCheck, color: 'blue' },
          { label: 'ADT', value: dashboardData?.kpis?.adt ?? 0, Icon: Zap, color: 'emerald' },
          { label: 'VADT', value: dashboardData?.kpis?.vadt ?? 0, Icon: UserCheck, color: 'indigo' },
          { label: 'ROTC', value: dashboardData?.kpis?.rotc ?? 0, Icon: Award, color: 'amber' },
        ].map((item) => (
          <div key={item.label} className={cn(
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
                colorMap[item.color].bg, colorMap[item.color].border, "border"
              )}>
                <item.Icon size={17} className={colorMap[item.color].icon} strokeWidth={1.8} />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 leading-none">
                {item.value}
              </p>
              <p className="mt-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-500 leading-snug">
                {item.label}
              </p>
            </div>
            <span className={cn(
              "absolute bottom-0 left-4 right-4 h-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200",
              item.color === "blue"    && "bg-blue-400",
              item.color === "emerald" && "bg-emerald-400",
              item.color === "indigo"  && "bg-indigo-400",
              item.color === "amber"   && "bg-amber-400",
            )} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-2">
        <ForceDistributionChart data={dashboardData?.force_distribution} />
        <TrainingActivityChart data={dashboardData?.trainings} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-2">
        <AttendanceAnalytics 
          data={dashboardData?.attendance} 
          composition={dashboardData?.readiness?.composition} 
        />
        <ReadinessScoreChart data={dashboardData?.readiness} />
      </div>

      <ReservistProfileOverview 
        rankData={dashboardData?.rank_distribution} 
        professionData={dashboardData?.profession_distribution} 
      />

      <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-2">
        <LowPerformingAreas data={dashboardData?.low_performing} />
        <AlertsInsights 
          data={dashboardData?.alerts} 
          liveCriticalAlerts={dashboardData?.live_critical_alerts}
          alertSummary={dashboardData?.alert_summary}
        />
      </div>
    </div>
  );
}