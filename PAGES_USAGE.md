# PAGES_USAGE.md — Airforce System Page Documentation

> Document version: 2026-07-26  
> Project: Airforce System — Personnel & Attendance Force Readiness  
> Stack: React (Vite) frontend + Express/Node.js backend + MySQL

---

## Table of Contents

1. [Authentication](#authentication)
2. [Public Landing Page](#landing)
3. [Dashboard](#dashboard)
4. [Alerts](#alerts)
5. [Announcements](#announcements)
6. [Reservists](#reservists)
7. [Trainings](#trainings)
8. [Attendance](#attendance)
9. [Analytics — Readiness & Analytics](#analytics)
10. [Reports](#reports)
11. [Logistics & Supplies](#logistics)
12. [Settings](#settings)
13. [Profile](#profile)
14. [Audit Logs](#audit-logs)
15. [Airbase Hierarchy](#airbase-hierarchy)
    - [Airbase Overview](#airbase-overview)
    - [Manage ARCENs](#manage-arcens)
    - [Manage Groups](#manage-groups)
    - [Manage Squadrons](#manage-squadrons)
16. [Legacy / Stub Pages](#legacy--stub-pages)
17. [Role-Based Access Control Summary](#role-based-access-control-summary)
18. [Server API Routes](#server-api-routes)

---

## Authentication

### Login

- **Route:** `/login`
- **Component:** `client/src/pages/Login.jsx`
- **Purpose:** Authentication entry point. Users sign in with their ID Number and password.
- **Features:**
  - Form with ID Number and Password fields, toggleable password visibility.
  - Rate-limiting: 5 attempts before temporary lockout; cooldown timer displayed.
  - Client-side redirect after successful login: admins go to `/`, reservists go to `/landing`.
  - Embedded 8th ARCEN logo (base64).
- **Backend:** `server/routes/auth.js` — validates credentials, issues JWT, returns user role and scope.

---

## Landing

### Landing (Home)

- **Route:** `/landing`
- **Component:** `client/src/pages/Landing.jsx`
- **Purpose:** Public-facing homepage accessible to all authenticated users. Serves as the default redirect for reservists after login.
- **Features:**
  - **Announcement Carousel** — rotating slides of admin-created announcements (Swiper.js autoplay).
  - **Internal Trainings Section** — paginated grid (9 per page) of upcoming internal training sessions with摘要 cards.
  - **External Events Section** — paginated grid of external training events with registration previews.
  - Clicking a training card scrolls to the Trainings page.
  - Loading and error states with appropriate UI feedback.
- **Backend:** `landingAnnouncements` and `landingTrainings` hooks fetch from the Announcements and Trainings APIs.

---

## Dashboard

### Dashboard

- **Route:** `/` (default authenticated route)
- **Component:** `client/src/pages/Dashboard.jsx`
- **Access:** Admin roles only (`admin`, `admin_arsen`, `admin_group`, `admin_squadron`)
- **Purpose:** System-wide overview with KPIs, charts, and insights for force readiness management.
- **Features:**
  - **Dashboard Filters** — filter by ARCEN, Group, Squadron, reserve status, source of commission, category, and date range.
  - **KPI Stats Grid** — four metric cards: BCMT, ADT, VADT, ROTC counts.
  - **Quick Stats Strip** — total reservists, active, standby, and ready reserve counts.
  - **Force Distribution Chart** — bar chart of reservists by area/ARCEN.
  - **Training Activity Chart** — training sessions by area.
  - **Attendance Analytics** — attendance rates with composition breakdown.
  - **Readiness Score Chart** — readiness distribution across units.
  - **Reservist Profile Overview** — rank and profession distribution.
  - **Low Performing Areas** — list of ARCENs below the readiness threshold.
  - **Alerts Insights** — top training squadrons, highest attendance rates, overall force readiness percentage.
  - All data loads in parallel via `Promise.all` for performance.
- **Backend:** `server/routes/dashboard.js` — aggregates data from multiple SQL queries against views (`v_overall_readiness`, `v_arsen_readiness`, etc.) and applies RBAC scope filters per user role.

---

## Alerts

### Alerts

- **Route:** `/alerts`
- **Component:** `client/src/pages/Alerts.jsx`
- **Purpose:** Central alert/broadcast management system. Displays system alerts and allows admins to create broadcast alerts.
- **Features:**
  - **Summary Cards** — counts for Critical, Warning, Info, and Unread alerts.
  - **Filter Bar** — filter by severity (critical/warning/info), type (readiness_low, no_training, low_attendance, supply_low, supply_overdue, profile_incomplete, training_upcoming, broadcast), date range, search text, and unread-only toggle.
  - **Alert List** — grouped by relative date (Today, Yesterday, This Week, Older). Each alert shows title, source, entity name, message, timestamp, and a "Mark as read" button.
  - **Pagination** — 25 alerts per page with URL-synced filter state.
  - **Create Broadcast Modal** — admin-only; compose a broadcast with title, message, and target scope (all users, admins only, reservists only, optionally scoped to a group/squadron/area).
  - **Positive Insights Section** — top training squadrons, highest attendance rates, and overall force readiness percentage.
  - "Mark page read" and "Refresh" buttons.
- **Backend:** `server/routes/alerts.js` — CRUD for alerts, scoped by user role.

---

## Announcements

### Announcements

- **Route:** `/announcements`
- **Component:** `client/src/pages/Announcements.jsx`
- **Access:** Admin roles only
- **Purpose:** Manage system announcements/dispatches visible to all users on the landing page.
- **Features:**
  - **Filter Bar** — search by title/body/author, filter by type, priority, and status.
  - **Announcement Grid** — responsive card grid (1/2/3 columns) showing filtered announcements.
  - **Create/Edit/Delete** — admin-only actions. Create modal with form; edit inline; delete with confirmation dialog.
  - **Empty states** for no results and no announcements at all.
  - Toast notifications for success/error feedback.
- **Backend:** `server/routes/announcements.js` — full CRUD with RBAC enforcement.

---

## Reservists

### Reservists

- **Route:** `/reservists`
- **Component:** `client/src/pages/Reservists.jsx`
- **Access:** Admin roles (`admin`, `admin_arsen`, `admin_group`, `admin_squadron`). Read-only for non-ARSEN admins.
- **Purpose:** Comprehensive reservist management — view, create, edit, delete, assign group/squadron, bulk upload, and export.
- **Features:**
  - **Stats Bar** — total, active, BCMT, ADT, VADT, ROTC counts.
  - **Search & Filters** — debounced (400ms) search and multi-filter panel (status, ARCEN, group, squadron, rank, reserve status, specialization, category, source of commission, blood type, sex, civil status).
  - **Reservist Table** — sortable columns, actions per row (View, Edit, Delete, Toggle Status).
  - **Add/Edit Modal** — full form with all personal, emergency contact, education, and military fields. Group/Squadron assignment handled via separate `POST /:id/assign` endpoint.
  - **Bulk Upload** — Excel file upload for mass reservist creation (admin/ARSEN admin only).
  - **Export** — export all filtered reservists to XLSX.
  - **Detail Panel** — side panel showing full reservist details with edit capability.
  - **View Modal** — read-only view of a reservist's complete profile.
  - **Delete Confirmation** — soft delete (sets `is_active = FALSE`).
  - **Pagination** — 100 records per page.
  - RBAC enforcement: `canMutate` flag controls whether mutation UI is shown; backend enforces scope for non-super-admins.
- **Backend:** `server/routes/reservists.js` — extensive route with GET (list), GET (detail), POST (create), PUT (update), DELETE (soft delete), POST (assign), POST (reset-password), GET (export), POST (import), POST (bulk-upload). All endpoints enforce RBAC scope guards.

---

## Trainings

### Trainings & Activities

- **Route:** `/trainings`
- **Component:** `client/src/pages/Trainings.jsx`
- **Purpose:** Manage internal and external training events. View all trainings, filter, sort, and drill down into details.
- **Features:**
  - **Create Buttons** — admin-only: "Internal training" (blue) and "External training" (violet) buttons.
  - **Training Stats** — summary statistics across all trainings.
  - **Training Filters** — filter by source (internal/external/all), status, activity type, and search term. Sort toggle (asc/desc by date).
  - **Training Table** — columns for Status, Source, Title, Date, Location, Type. Each row is clickable for detail view.
  - **Training Detail Modal** — shows full training info, attendees, activities, and actions (Edit, Delete, Attendance).
  - **Training Form Modal** — create/edit form with dynamic fields based on internal vs. external training type.
  - **Delete Confirmation** — with destructive warning.
  - **Pagination** — 12 trainings per page.
  - **Attendance Navigation** — from the detail modal, navigates to `/attendance?type=internal|external&trainingId=N`.
- **Backend:** `server/routes/trainings.js` — routes for internal trainings (`/internal`), external trainings (`/external`), activities, registrations, attachments, slot availability, and statistics.

---

## Attendance

### Attendance

- **Route:** `/attendance`
- **Component:** `client/src/pages/Attendance.jsx`
- **Purpose:** Track and manage attendance for both internal and external training events.
- **Features:**
  - **Dashboard View** — `AttendanceDashboard` component listing available training events with filter by type (internal/external).
  - **Event View** — when a training is selected, shows:
    - **Training Header** — title, date, venue, status, type badge.
    - **Stats Bar** — total, present, absent, late, excused, pending counts.
    - **Two Tabs:**
      - **Scan Tab** — `AttendanceScanner` component for QR code scanning (both internal and external).
      - **List Tab** — `AttendanceList` showing all attendees with status dropdown, manual check-in, and auto-refresh toggle (10-second interval).
  - **Manual Check-In** — for both internal and external events, admins/facilitators can manually mark a reservist's attendance status.
  - **QR Scanning** — `scanInternalTraining` and `scanExternalTraining` API calls for QR-based check-in.
  - **Auto-refresh** — toggleable live refresh for the attendance list during active events.
  - **URL Params** — `?type=internal|external&trainingId=N` for deep-linking to an event.
- **Backend:** `server/routes/attendance.js` — scanned-based check-in (`/scan/internal/:trainingId`, `/scan/external/:externalTrainingId`), manual check-in (`/manual/internal/:trainingId`, `/manual/external/:externalTrainingId`), attendance retrieval (`/internal/:trainingId`, `/external/:externalTrainingId`), status updates (`PATCH /:eventType/:id`), and facilitator management.

---

## Analytics — Readiness & Analytics

### Analytics

- **Route:** `/analytics`
- **Component:** `client/src/pages/Analytics.jsx`
- **Access:** Admin roles only
- **Purpose:** Multi-level readiness analytics — from overview down to individual reservist drill-down.
- **Features:**
  - **Six Navigation Levels** with breadcrumb navigation:
    1. **Overview** — KPI summary (Avg Readiness, Training Participation, Attendance, Active Status, Below Threshold), readiness distribution pie chart, ranking charts by ARCEN, Group, and Squadron.
    2. **Arsen Level** — ARCEN detail card with stats, component radar chart (Training/Attendance/Active), and group comparison bar chart.
    3. **Group Level** — group detail card, component radar, squadron comparison chart.
    4. **Squadron Level** — squadron detail card, radar chart, and reservist table with search.
    5. **Reservists List** — filtered reservist table within a squadron, with search by name/rank/service number.
    6. **Individual Detail** — per-reservist readiness breakdown (score, component percentages, training history with status).
  - **Charts** — PieChart (readiness distribution), BarChart (comparison), RadarChart (component breakdown), Ranking bars.
  - **Search** — text search by name, rank, or service number at the reservist list level.
  - **"View All" modals** for groups and squadrons when there are more than 10 entries.
- **Backend:** `server/routes/readiness.js` — provides aggregated readiness data at multiple aggregation levels (overview, arsen, group, squadron, reservist, distribution).

---

## Reports

### Reports

- **Route:** `/reports`
- **Component:** `client/src/pages/Reports.jsx`
- **Purpose:** View, create, edit, and delete custom reports.
- **Features:**
  - **Report Cards Grid** — responsive grid (1/2/3 columns) showing report title, event date, type badge (attendance/readiness/logistics/custom), format badge, and summary snippet.
  - **Search & Filter** — text search and type filter (attendance, readiness, logistics, custom).
  - **CRUD Operations:**
    - **Create** — "Create Report" button opens `ReportForm` modal.
    - **View** — `ReportDetailsModal` shows full report content.
    - **Edit** — from the detail modal or card.
    - **Delete** — with confirmation dialog.
  - **Pagination** — 10 reports per page.
  - Admin-only create/delete buttons.
- **Backend:** `server/routes/reports.js` — report CRUD endpoints.

---

## Logistics & Supplies

### Logistics

- **Route:** `/logistics`
- **Component:** `client/src/pages/Logistics.jsx`
- **Access:** Admin roles only
- **Purpose:** Supply inventory management and uniform tracking/assignment.
- **Features:**
  - **Two Tabs:**
    - **Inventory** — supply item management.
    - **Uniform Tracker** — reservist uniform assignment tracking.
  - **Inventory Tab:**
    - **KPI Cards** — total supply items, total stock units, low stock count, lowest squadron uniform coverage.
    - **Low Stock Alert Banner** — items at or below reorder level.
    - **Supply Table** — item name, category (badge), stock level with visual bar, location, supplier. Actions: Detail, Adjust Stock, Edit, Delete.
    - **Supply Form Modal** — create/edit supply items.
    - **Stock Adjust Form Modal** — adjust stock quantity.
    - **Supply Detail Modal** — full item details with stock level bar.
  - **Uniform Tracker Tab:**
    - **Search** — filter by name, rank, service number.
    - **Grouped List** — reservists organized by Squadron > Group, showing uniform assignments per person.
    - **Assign Item Modal** — assign a supply item to a reservist with quantity, issuance type, due return date, and notes.
  - **Delete Confirmation** with destructive warning.
- **Backend:** `server/routes/supplies.js`, `server/routes/issuances.js` — supply CRUD, stock adjustments, and issuance/assignment APIs.

---

## Settings

### Settings

- **Route:** `/settings`
- **Component:** `client/src/pages/Settings.jsx`
- **Access:** Super admin (`admin`) only
- **Purpose:** System configuration — role/user management and general settings.
- **Features:**
  - **Two Tabs:**
    - **Role Management** — manage user roles and assignments.
    - **General Settings** — system configuration key-value store and user profile.
  - **Role Management Tab:**
    - **Stats** — count of users per role (System Admin, ARCEN Admin, Group Admin, Squadron Admin, Reservist).
    - **Role Sections** — collapsible sections per role with user listing table (name, ID number, email, scope, status).
    - **Search** within each role section.
    - **Pagination** — 10 users per page for admin/reservist sections.
    - **Actions per user:**
      - **History** — view role change history modal.
      - **Edit Role** — change user role with scope selection (ARCEN, Group, or Squadron depending on role).
      - **Deactivate** — soft-delete user account.
    - **Add User Modal** — create new user with email, role, and scope.
    - **Edit Role Modal** — modal with role selection buttons, scope dropdowns, save/cancel.
    - **Role History Modal** — timeline of role changes for a user.
  - **General Settings Tab:**
    - **My Profile** — edit email, change password (current + new), save profile.
    - **Settings List** — system configuration settings with edit (inline), add, and value display.
- **Backend:** `server/routes/settings.js`, `server/routes/auth.js` — user/role CRUD, profile update, password change.

---

## Profile

### Profile

- **Route:** `/profile`
- **Component:** `client/src/pages/Profile.jsx`
- **Purpose:** Personal profile management for all authenticated users (reservists and admins).
- **Features:**
  - **Two Tabs:**
    - **Profile** — editable personal, emergency contact, education, and military information.
    - **QR Code** — generate and display personal QR code for event check-in.
  - **Profile Tab Layout (Bento Grid):**
    - **Personal Information** (hero tile, 2-col field grid) — first/last name, rank, phone, DOB, place of birth, sex, civil status, blood type, citizenship, address.
    - **Emergency Contact** (compact card) — name, phone, address.
    - **Educational Background** (compact card) — highest education, course/degree, school, year graduated.
    - **Military Information** (full-width banner) — position, category, reserve status, source of commission, date enlisted, specialization. Read-only fields: Reserve Center, Group, Squadron.
    - **Change Password** (compact tile) — current password, new password, change button.
  - **QR Code Tab:**
    - QR code generated from `profile.qr_code` using `qrcode` library.
    - "Generate QR Code" button if no QR exists.
    - Display of the QR code value.
  - **Save** — all editable fields saved in a single payload via `updateMyProfile`.
  - **Password Change** — validated (min 6 chars), sent via `updateProfile`.
- **Backend:** `server/routes/reservists.js` (GET `/my/profile`, PATCH for update), `server/routes/auth.js` (password change).

---

## Audit Logs

### Audit Logs

- **Route:** `/audit-logs`
- **Component:** `client/src/pages/AuditLogs.jsx`
- **Access:** Super admin (`admin`) only
- **Purpose:** Read-only audit trail of all system changes for compliance and security monitoring.
- **Features:**
  - **Stats Bar** — total event count badge.
  - **Filter Bar** — search (action, entity, user email), action filter (e.g., `reservist.updated`), entity type filter (e.g., `reservist`), date range (from/to), and clear button.
  - **Audit Log Table** — columns: Timestamp, User (email + role), Action, Entity (type + ID), IP Address, and a detail eye icon.
  - **Detail Modal** — when an eye icon is clicked, shows:
    - Full audit entry details (user, action, entity, IP).
    - **Before (old_values)** — JSON view of pre-change data.
    - **After (new_values)** — JSON view of post-change data.
    - User Agent string.
  - **Pagination** — 20 records per page.
  - **Read-only** — all entries are immutable; no edit or delete capability.
  - Debounced search (350ms) for performance.
- **Backend:** `server/routes/audit-logs.js` — read-only audit log retrieval with filtering and pagination.

---

## Airbase Hierarchy

### Airbase Overview

- **Route:** `/airbase`
- **Component:** `client/src/pages/airbase/AirbaseOverview.jsx`
- **Access:** All authenticated users (every role)
- **Purpose:** Interactive map-based visualization of the Airbase hierarchy with drill-down capabilities.
- **Features:**
  - **Leaflet Map** — centered on Mindanao, Philippines with OpenStreetMap tiles.
  - **Layer Switcher** — toggle between ARSENs, Groups, Squadrons, and Locations layers.
  - **Boundary Toggle** — show/hide territory boundary polygons (convex hull or circle for <3 points).
  - **Custom Markers** — color-coded by ARCEN, size-scaled by reservist count, with selected/hovered states.
  - **Drill-Down Selection** — click any marker to zoom in and open a summary sidebar showing:
    - Personnel count, unit type badge, breadcrumb navigation.
    - For ARSEN/Group: breakdown of child groups/squadrons with click-to-navigate.
    - For Squadrons: code, specialization, location, hierarchy path.
  - **Connection Lines** — hierarchical polyline connections from parent to child nodes.
  - **Hierarchy View** — accordion-style list with search, collapse-all, and summary stats (Airbases, ARCENs, Groups, Squadrons, Reservists).
  - **Legend** — dynamic legend reflecting the active layer.
- **Backend:** `server/routes/hierarchy.js`, `server/routes/map.js` — provides `getGroups` (hierarchical), `getMapSquadrons`, and `getMapSummary` endpoints.

### Manage ARCENs

- **Route:** `/airbase/arcens`
- **Component:** `client/src/pages/airbase/ManageArcens.jsx`
- **Access:** Super admin (`admin`) only for mutation; all roles can view.
- **Purpose:** Create, edit, deactivate, and view details of ARCEN (Air Reserve Center) units.
- **Features:**
  - **Stats Cards** — total ARCENs, active/inactive counts, total reservists.
  - **Management Table** — columns: Name, Code, Commander, Location, Groups, Squadrons, Reservists, Status.
  - **Detail Modal** — shows full ARCEN info with stats (reservists, groups, squadrons, status) and information section. Footer has Delete and Activate/Deactivate + Edit buttons (admin only).
  - **Add/Edit Modal** — form with name, code, commander, location, status fields.
  - **Delete Confirmation** — soft deactivation (sets `is_active = FALSE`).
  - **Toggle Status** — activate/deactivate with confirmation toast.
  - RBAC: ARSEN creation/edit/deletion restricted to super admin per `RBAC_WORKFLOW.md`.
- **Backend:** `server/routes/arsens.js` (uses `getGroups` with `hierarchical=true`, then `createArsen`, `updateArsen`, `deleteArsen`).

### Manage Groups

- **Route:** `/airbase/groups`
- **Component:** `client/src/pages/airbase/ManageGroups.jsx`
- **Access:** All authenticated roles can view; `admin` and `admin_arsen` can mutate.
- **Purpose:** Create, edit, deactivate, and view details of Reserve Groups within ARCENs.
- **Features:**
  - **Stats Cards** — total groups, active/inactive counts, total squadrons.
  - **Management Table** — columns: Name, Code, ARCEN, Commander, Squadrons, Reservists, Status. Filterable by ARCEN.
  - **Detail Modal** — group info with stats and assignment section showing ARCEN.
  - **Add/Edit Modal** — form with name, code, ARCEN selector, commander, status. Admin_arsen scope locked to their own ARCEN.
  - **Delete Confirmation** — soft deactivation.
  - **Toggle Status** — activate/deactivate.
  - RBAC: `admin_arsen` can only create groups within their own ARSEN; `admin_group` can only assign squadrons within their group.
- **Backend:** `server/routes/groups.js` — group CRUD with scope guards.

### Manage Squadrons

- **Route:** `/airbase/squadrons`
- **Component:** `client/src/pages/airbase/ManageSquadrons.jsx`
- **Access:** All authenticated roles can view; `admin`, `admin_arsen`, and `admin_group` can mutate. `admin_squadron` is read-only.
- **Purpose:** Create, edit, deactivate, and view details of Squadrons within Groups.
- **Features:**
  - **Stats Cards** — total squadrons, active/inactive counts, total members.
  - **Management Table** — columns: Name, Code, Group, ARCEN, Location, Specialization, Members, Status. Filterable by ARCEN, Group, Specialization, and Status.
  - **Detail Modal** — squadron info with information and assignment sections.
  - **Add/Edit Modal** — form with name, code, group selector, location, specialization, status. Admin_group scope locked to their own group; admin_arsen scope limited to their ARSEN's groups.
  - **Delete Confirmation** — soft deactivation.
  - **Toggle Status** — activate/deactivate.
  - Specialization dropdown with predefined values (Security, Engineering, Communications, Medical, etc.).
  - RBAC: `admin_squadron` can view but not create/edit/delete.
- **Backend:** `server/routes/squadron.js` — squadron CRUD with scope guards and assignment validation.

---

## Legacy / Stub Pages

### Groups (Legacy Stub)

- **Route:** `/groups` (via `client/src/pages/Groups.jsx`)
- **Purpose:** Legacy stub page; the `ManageGroups` page under `/airbase/groups` is the current functional replacement.
- **Component:** Simple stub returning a `<div>` with "Groups content." text.

### Reservations (Legacy Stub)

- **Route:** `/reservations` (via `client/src/pages/Reservations.jsx`)
- **Purpose:** Legacy stub page; the `Reservists` page under `/reservists` is the current functional replacement.
- **Component:** Simple stub returning a `<div>` with "Manage Reservists" text.

---

## Role-Based Access Control Summary

| Role | Description | Accessible Pages | Mutation Rights |
|------|-------------|-----------------|-----------------|
| `admin` | System Super Admin | All pages | Full CRUD on all pages |
| `admin_arsen` | ARCEN-level Admin | All pages (read) | Can mutate reservists, groups, squadrons within their ARSEN scope; ARCENs are read-only |
| `admin_group` | Group-level Admin | All pages (read) | Can mutate squadrons and reservations within their group; groups are read-only |
| `admin_squadron` | Squadron-level Admin | All pages (read) | Read-only on most pages; can view reservists in their squadron |
| `reservist` | Standard Reservist | Landing, Profile, Trainings (view), Attendance, Reports, etc. | Read-only; can update own profile and register for external trainings |

**RBAC Enforcement:**
- **Frontend:** Route guards (`ProtectedRoute` with `allowedRoles`) and `canMutate` flags in components control UI visibility.
- **Backend:** Every API endpoint enforces scope filters — `admin_arsen` users only see/modify data within their ARSEN, `admin_group` within their group, `admin_squadron` within their squadron. Non-admin users' data is filtered at the SQL level via `reservist_assignments` joins.

---

## Server API Routes

The backend is organized under `server/routes/` with the following route files and their purposes:

| Route File | Base Path | Purpose |
|------------|-----------|---------|
| `auth.js` | `/api/auth` | Login, logout, authentication middleware |
| `dashboard.js` | `/api/dashboard` | Aggregated dashboard KPIs, charts, and analytics data |
| `reservists.js` | `/api/reservists` | Full reservist CRUD, assign, reset-password, export, import, bulk-upload |
| `trainings.js` | `/api/trainings` | Internal/external training CRUD, activities, registrations, attachments, statistics |
| `attendance.js` | `/api/attendance` | QR scanning, manual check-in, attendance retrieval, status updates, facilitator management |
| `alerts.js` | `/api/alerts` | Alert CRUD, broadcast creation, mark-read, insights |
| `announcements.js` | `/api/announcements` | Announcement CRUD |
| `reports.js` | `/api/reports` | Report CRUD |
| `settings.js` | `/api/settings` | System settings CRUD, user role management, profile |
| `hierarchy.js` | `/api/hierarchy` | Hierarchical tree data for Airbase (ARSEN > Group > Squadron) |
| `map.js` | `/api/map` | Map data — squadron positions, ARCEN summaries |
| `groups.js` | `/api/groups` | Group CRUD (used by ManageGroups and hierarchy) |
| `squadron.js` | `/api/squadron` | Squadron CRUD |
| `arsens.js` | `/api/arsens` | ARCEN CRUD |
| `areas.js` | `/api/areas` | Geographic area data |
| `assignments.js` | `/api/assignments` | Reservist assignment management |
| `readiness.js` | `/api/readiness` | Readiness scores at multiple aggregation levels |
| `audit-logs.js` | `/api/audit-logs` | Audit log retrieval |
| `organization.js` | `/api/organization` | Organization structure data |
| `supplies.js` | `/api/supplies` | Supply inventory CRUD |
| `issuances.js` | `/api/issuances` | Supply issuance/assignment tracking |

---

*End of PAGES_USAGE.md*
