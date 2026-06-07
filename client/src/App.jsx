import { createBrowserRouter, RouterProvider } from "react-router-dom";
import AppLayout from "@/layout/AppLayout";
import { lazy, Suspense } from "react";

import { ToastProvider } from "@/components/Toast";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";

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

const router = createBrowserRouter([
  {
    path: "/login",
    element: wrap(Login),
  },
  {
    path: "/",
    element: (
      <ErrorBoundary>
        <ToastProvider>
          <AppLayout />
        </ToastProvider>
      </ErrorBoundary>
    ),
    children: [
      { index: true, element: AdminProtectedWrapper(Dashboard), handle: { title: "Dashboard" } },
      { path: "landing", element: ProtectedWrapper(Landing), handle: { title: "Landing Page" } },
      { path: "profile", element: ProtectedWrapper(Profile), handle: { title: "Profile" } },
      { path: "announcements", element: AdminProtectedWrapper(Announcements), handle: { title: "Announcements" } },
      { path: "reservists", element: ReservistAdminProtectedWrapper(Reservists), handle: { title: "Reservists" } },
      { path: "trainings", element: ProtectedWrapper(Trainings), handle: { title: "Trainings & Activities" } },
      { path: "attendance", element: ProtectedWrapper(Attendance), handle: { title: "Attendance" } },
      { path: "analytics", element: AdminProtectedWrapper(Analytics), handle: { title: "Readiness & Analytics" } },
      { path: "logistics", element: AdminProtectedWrapper(Logistics), handle: { title: "Logistics & Supplies" } },
      { path: "alerts", element: ProtectedWrapper(Alerts), handle: { title: "Alerts" } },
      { path: "reports", element: ProtectedWrapper(Reports), handle: { title: "Reports" } },
      { path: "settings", element: SuperAdminProtectedWrapper(Settings), handle: { title: "Settings" } },
      { path: "audit-logs", element: SuperAdminProtectedWrapper(AuditLogs), handle: { title: "Audit Logs" } },
      { path: "airbase", element: AdminProtectedWrapper(AirbaseOverview), handle: { title: "Airbase Overview" } },
      { path: "airbase/arcens", element: SuperAdminProtectedWrapper(ManageArcens), handle: { title: "Manage Arcens" } },
      { path: "airbase/groups", element: AdminProtectedWrapper(ManageGroups), handle: { title: "Manage Groups" } },
      { path: "airbase/squadrons", element: AdminProtectedWrapper(ManageSquadrons), handle: { title: "Manage Squadrons" } },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}