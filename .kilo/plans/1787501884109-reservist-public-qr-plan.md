# Plan: Dual-Use Reservist QR — Public Digital ID View + Attendance

## Goal
Make the reservist's Digital ID QR code work for **both**:
- **External scanner** (phone camera / generic QR app) → opens a **public, no-login** page showing the full Digital ID.
- **App attendance scanner** (facilitator) → still marks attendance, **unchanged** on the backend (same token, same endpoints, same DB).

## Confirmed decisions
1. **QR encodes a URL**, not the raw token. The attendance scanner is made *tolerant*: it extracts the token from the URL (and still accepts a raw token for backward compatibility / barcode guns).
2. **Public page is open to anyone with the link** and shows the **full card** (photo, name, rank, service number, bio, unit, emergency contact, address). No login.
3. **Reuse the existing `qr_code` token** in the URL (no new DB column). Attendance still requires an authenticated facilitator + active event, so link leakage can't spoof attendance.

## URL contract
- Public URL (what the QR encodes): `${window.location.origin}/id/<qr_code>`
  - `<qr_code>` is `encodeURIComponent(profile.qr_code)`, e.g. `/id/RES-1A2B3C4D5E6F7A8B`.
- Server public endpoint: `GET /api/reservists/public/:qrCode` (NO `authenticateToken`).
- Public avatar endpoint: `GET /api/reservists/public/avatar/:qrCode` (NO auth) — mirrors existing `/blob/avatar/:reservistId` but keyed by token.

## Changes

### 1. Server — public read endpoints (`server/routes/reservists.js`)
Add (near other `/my`/public routes, **without** `authenticateToken`):
- `GET /api/reservists/public/:qrCode`
  - `SELECT` an explicit allow-list of non-credential columns by `qr_code` (and `is_active` if desired):
    `id, first_name, last_name, rank, service_number, bio, position, category, reserve_status, address, emergency_contact_name, emergency_contact_phone, group_name, squadron_name, avatar_url, qr_code`.
  - Join assignment for `group_name`/`squadron_name` (same as `/my/profile`).
  - **Never** return `password`, `email`, auth/`user_id` internals.
  - Return `{ status:'success', data:{ ...profile, avatar_url: '/api/reservists/public/avatar/<qrCode>' } }`.
  - 404 (`NOT_FOUND`) if no reservist matches the token.
- `GET /api/reservists/public/avatar/:qrCode`
  - Resolve reservist id from `qr_code`, then stream `blob_files` row (reuse logic from `/blob/avatar/:reservistId` at `reservists.js:2736`).
- No migration required (token column already exists).

### 2. Client — encode URL in the QR (`client/src/pages/Profile.jsx`)
In the QR `useEffect` (~line 219), change:
```js
const qrValue = profile.qr_code;
```
to:
```js
const qrValue = `${window.location.origin}/id/${encodeURIComponent(profile.qr_code)}`;
```
(Keep `generateMyQR()` / `profile.qr_code` as-is; only the *encoded string* changes.)
Optionally update the "SCAN ME" helper text on `ReservistCardBack.jsx` to indicate it opens the public ID or is used for attendance.

### 3. Client — tolerant scanner normalization (the only attendance touch)
- Add helper `normalizeScannedQR(raw)` (new file `client/src/lib/qr.js` or inside `attendanceApiService.js`):
  ```js
  export function normalizeScannedQR(raw) {
    const s = String(raw ?? '').trim();
    const m = s.match(/\/id\/([^/?#]+)/);   // our public URL?
    return m ? decodeURIComponent(m[1]) : s; // extract token, else raw (backward compatible)
  }
  ```
- In `client/src/pages/Attendance.jsx` `handleScan` (line 110): normalize before calling the API:
  ```js
  const token = normalizeScannedQR(qrCode);
  response = await scanInternalTraining(trainingId, token, scanMethod);
  // (and the external branch similarly)
  ```
- **Backend attendance endpoints, `findReservistByQRCode`, and the `qr_code` column are untouched.** Raw-token scans (old badges, manual input, barcode guns) still work because the helper passes them through.

### 4. Client — public route + page
- `client/src/App.jsx`: add a top-level route (outside `ProtectedLayout`, alongside `/login`):
  ```js
  { path: '/id/:token', element: wrap(PublicReservist) }
  ```
  (SPA fallback already serves `index.html` for non-API paths — `server.js:135`.)
- `client/src/services/api.js`: add
  ```js
  export const getPublicReservist = (token) => api.get(`/reservists/public/${encodeURIComponent(token)}`);
  ```
- New page `client/src/pages/PublicReservist.jsx` (standalone, no `AppLayout`):
  - Reads `:token` from `useParams()`.
  - Calls `getPublicReservist(token)`; loading / 404 (invalid/expired) / error states.
  - Renders the **full card** using the existing `ReservistCardFront` (identity) and a read-only details block (emergency contact, address, unit, status) — reuse field layout from `ReservistCardBack`/`ReservistCardFront`.
  - Avatar: `<img src={data.avatar_url} />` (public avatar route above).
  - Small footer noting it's a public Digital ID; optional "Log in to the system" link to `/login`.

## Edge cases / risks
- **Old printed badges** (raw token) still scan for attendance via the pass-through branch; they just won't open a browser page (expected — they predate this feature).
- **Token collision / scraping**: 16 hex = 64-bit space; acceptable for an unauthenticated directory. Optional future: per-IP rate limit on `/public/*`.
- **Inactive / deleted reservist**: return 404 → public page shows "ID not found". Attendance already checks `is_active`.
- **Service-number tokens**: some `qr_code` values are the service number, not `RES-<hex>`; the regex extracts the full path segment, so it works regardless of format.
- **PII exposure**: by design (full card, public). Ensure the select list excludes `password`, `email`, and internal user ids. Confirm with stakeholder this is intended.

## Validation
1. `npm run lint` and `npm run typecheck` (or project equivalents) pass.
2. Generate/refresh a reservist QR in Profile → it encodes `…/id/<token>`.
3. **External**: scan with a phone camera → browser opens `/id/<token>` → full Digital ID renders (photo + details). Scan an invalid token → "not found".
4. **Attendance (no regression)**: in Attendance, scan the *same* URL QR with the camera/manual → attendance recorded. Manually type the raw token → still works. Confirm backend attendance logs unchanged.
5. Refresh on `/id/<token>` (SPA fallback) loads correctly.

## Files touched
- `server/routes/reservists.js` — add 2 public routes (no auth).
- `client/src/pages/Profile.jsx` — QR value → URL.
- `client/src/lib/qr.js` (new) + `client/src/pages/Attendance.jsx` — normalize scanned input.
- `client/src/App.jsx` — add `/id/:token` public route.
- `client/src/services/api.js` — `getPublicReservist`.
- `client/src/pages/PublicReservist.jsx` (new) — public Digital ID view.
- (Optional polish) `client/src/components/digital-id/ReservistCardBack.jsx` — scan hint text.
