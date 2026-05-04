import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/layout/AppLayout";

// Pages — lazy-loaded for performance
import { lazy, Suspense } from "react";

const Login = lazy(() => import("@/pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Reservists = lazy(() => import("@/pages/Reservists"));
const Reservations = lazy(() => import("@/pages/Reservations"));
const Groups = lazy(() => import("@/pages/Groups"));
const Areas = lazy(() => import("@/pages/Areas"));
const Trainings = lazy(() => import("@/pages/Trainings"));
const Attendance = lazy(() => import("@/pages/Attendance"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Logistics = lazy(() => import("@/pages/Logistics"));
const Reports = lazy(() => import("@/pages/Reports"));
const Announcements = lazy(() => import("@/pages/Announcements"));

// Simple fallback while lazy chunks load
function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    </div>
  );
}

const router = createBrowserRouter([
  // Public routes (no layout)
  {
    path: "/login",
    element: (
      <Suspense fallback={<PageLoader />}>
        <Login />
      </Suspense>
    ),
  },
  // Protected routes with AppLayout
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoader />}>
            <Dashboard />
          </Suspense>
        ),
      },
      {
        path: "reservists",
        element: (
          <Suspense fallback={<PageLoader />}>
            <Reservists />
          </Suspense>
        ),
      },
      {
        path: "reservations",
        element: (
          <Suspense fallback={<PageLoader />}>
            <Reservations />
          </Suspense>
        ),
      },
      {
        path: "groups",
        element: (
          <Suspense fallback={<PageLoader />}>
            <Groups />
          </Suspense>
        ),
      },
      {
        path: "areas",
        element: (
          <Suspense fallback={<PageLoader />}>
            <Areas />
          </Suspense>
        ),
      },
      {
        path: "trainings",
        element: (
          <Suspense fallback={<PageLoader />}>
            <Trainings />
          </Suspense>
        ),
      },
      {
        path: "attendance",
        element: (
          <Suspense fallback={<PageLoader />}>
            <Attendance />
          </Suspense>
        ),
      },
      {
        path: "analytics",
        element: (
          <Suspense fallback={<PageLoader />}>
            <Analytics />
          </Suspense>
        ),
      },
      {
        path: "logistics",
        element: (
          <Suspense fallback={<PageLoader />}>
            <Logistics />
          </Suspense>
        ),
      },
      {
        path: "reports",
        element: (
          <Suspense fallback={<PageLoader />}>
            <Reports />
          </Suspense>
        ),
      },
      {
        path: "announcements",
        element: (
          <Suspense fallback={<PageLoader />}>
            <Announcements />
          </Suspense>
        ),
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}