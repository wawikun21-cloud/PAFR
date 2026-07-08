import { useState, useEffect } from "react";
import { getDashboard, getAlerts } from "@/services/api";
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
  dateRange: "May 1 – May 31, 2025",
  group: "All Groups",
  area: "All Areas",
  status: "All Status",
  reservistStatus: "All Reservist Status",
};

export default function Dashboard() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, alertsRes] = await Promise.all([
        getDashboard(),
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
    <div className="flex flex-col gap-6 pb-10">
      <DashboardFilters filters={filters} onChange={setFilters} />

      <KPIStatsGrid data={dashboardData?.kpis} filters={filters} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ForceDistributionChart data={dashboardData?.force_distribution} />
        <TrainingActivityChart data={dashboardData?.trainings} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
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

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
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
