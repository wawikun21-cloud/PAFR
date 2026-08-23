import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import AppLayout from "@/layout/AppLayout";
import { lazy, Suspense } from "react";

import { ToastProvider } from "@/components/Toast";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

// Pages
const Dashboard         = lazy(() => import("@/pages/Dashboard"));
const Landing           = lazy(() => import("@/pages/Landing"));
const Profile           = lazy(() => import("@/pages/Profile"));
const Reservists        = lazy(() => import("@/pages/Reservists"));
const Trainings         = lazy(() => import("@/pages/Trainings"));
const Attendance        = lazy(() => import("@/pages/Attendance"));
const Analytics         = lazy(() => import("@/pages/Analytics"));
const Logistics         = lazy(() => import("@/pages/Logistics"));
const Reports           = lazy(() => import("@/pages/Reports"));
const Settings          = lazy(() => import("@/pages/Settings"));
const Alerts            = lazy(() => import("@/pages/Alerts"));
const AuditLogs         = lazy(() => import("@/pages/AuditLogs"));
const Announcements     = lazy(() => import("@/pages/Announcements"));
const Login             = lazy(() => import("@/pages/Login"));
const PublicReservist   = lazy(() => import("@/pages/PublicReservist"));

// Airbase pages
const AirbaseOverview   = lazy(() => import("@/pages/airbase/AirbaseOverview"));
const ManageArcens      = lazy(() => import("@/pages/airbase/ManageArcens"));
const ManageGroups      = lazy(() => import("@/pages/airbase/ManageGroups"));
const ManageSquadrons   = lazy(() => import("@/pages/airbase/ManageSquadrons"));

// RBAC role groups (match server)
const ADMIN_ROLES = ['admin', 'admin_arsen', 'admin_group', 'admin_squadron'];
const SUPER_ADMIN_ROLES = ['admin'];
// Reservists list: all admin roles can access the page.
// The backend scope filter restricts what data each role actually sees.
// admin_squadron sees only reservists in their squadron (server-enforced).
// canMutate in Reservists.jsx ensures read-only UI for non-super-admins.
const RESERVIST_ADMIN_ROLES = ['admin', 'admin_arsen', 'admin_group', 'admin_squadron'];

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    </div>
  );
}

function wrap(Component) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

// Auth-only wrapper — every authenticated role (including reservist) can
// reach the page. Used for pages that are visible to everyone but render
// read-only vs. manageable content per-row based on the backend's
// `can_manage` flag (Airbase Overview / ARCENs / Groups / Squadrons).
function ProtectedWrapper(Component) {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProtectedRoute>
        <Component />
      </ProtectedRoute>
    </Suspense>
  );
}

function AdminProtectedWrapper(Component) {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProtectedRoute allowedRoles={ADMIN_ROLES}>
        <Component />
      </ProtectedRoute>
    </Suspense>
  );
}

function ReservistAdminProtectedWrapper(Component) {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProtectedRoute allowedRoles={RESERVIST_ADMIN_ROLES}>
        <Component />
      </ProtectedRoute>
    </Suspense>
  );
}

function SuperAdminProtectedWrapper(Component) {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProtectedRoute allowedRoles={SUPER_ADMIN_ROLES}>
        <Component />
      </ProtectedRoute>
    </Suspense>
  );
}

function ProtectedLayout() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppLayout />
      </ToastProvider>
    </ErrorBoundary>
  );
}

const router = createBrowserRouter([
  {
    path: "/login",
    element: wrap(Login),
  },
  {
    // Public, no-login Digital ID view — sits outside ProtectedLayout so it
    // has no sidebar/nav. SPA fallback serves the app shell on refresh.
    path: "/id/:token",
    element: wrap(PublicReservist),
  },
  {
    path: "/",
    element: <ProtectedLayout />,
    children: [
      { index: true, element: AdminProtectedWrapper(Dashboard), handle: { title: "Dashboard" } },
      { path: "landing", element: ProtectedWrapper(Landing), handle: { title: "Landing" } },
      { path: "profile", element: ProtectedWrapper(Profile), handle: { title: "Profile" } },
      { path: "announcements", element: AdminProtectedWrapper(Announcements), handle: { title: "Announcements" } },
      { path: "reservists", element: ReservistAdminProtectedWrapper(Reservists), handle: { title: "Reservists" } },
      { path: "trainings", element: ProtectedWrapper(Trainings), handle: { title: "Trainings & Activities" } },
      { path: "attendance", element: ProtectedWrapper(Attendance), handle: { title: "Attendance" } },
      { path: "analytics", element: AdminProtectedWrapper(Analytics), handle: { title: "Readiness & Analytics" } },
      { path: "logistics", element: AdminProtectedWrapper(Logistics), handle: { title: "Logistics & Supplies" } },
      { path: "alerts", element: ProtectedWrapper(Alerts), handle: { title: "Alerts" } },
      { path: "reports", element: AdminProtectedWrapper(Reports), handle: { title: "Reports" } },
      { path: "settings", element: SuperAdminProtectedWrapper(Settings), handle: { title: "Settings" } },
      { path: "audit-logs", element: SuperAdminProtectedWrapper(AuditLogs), handle: { title: "Audit Logs" } },
      // Airbase hierarchy pages: open to every authenticated role. Each page
      // renders manage controls or read-only content per-row based on the
      // backend's `can_manage` flag — the route itself no longer gates by role.
      { path: "airbase", element: ProtectedWrapper(AirbaseOverview), handle: { title: "Airbase Overview" } },
      { path: "airbase/arcens", element: AdminProtectedWrapper(ManageArcens), handle: { title: "Manage Arcens" } },
      { path: "airbase/groups", element: AdminProtectedWrapper(ManageGroups), handle: { title: "Manage Groups" } },
      { path: "airbase/squadrons", element: AdminProtectedWrapper(ManageSquadrons), handle: { title: "Manage Squadrons" } },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}