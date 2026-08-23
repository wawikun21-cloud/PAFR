# Digital ID Flippable Card — Implementation Plan

## Objective
Add a flippable "Digital ID" card (front = identity, back = QR + emergency info) to the
existing **Profile** page, placed inside the current **QR Code tab**. Adapt the reference
DIGITAL_ID components (`ProfileCard*`, `useFlipCard`) to the reservist data model and add
the two missing fields (`bio`, `avatar_url`) with full backend support.

## Decisions (confirmed with user)
- **Placement:** The card lives in the existing **QR Code tab** (replaces the current
  standalone big-QR view). The tab keeps its "Generate QR" affordance (wired into the card back).
- **Missing fields:** Full backend support — add `bio` (TEXT) + `avatar_url` columns, an avatar
  upload endpoint, and edit UI for both.
- **QR rendering:** Reuse the already-installed `qrcode` package to render the back QR as a
  data URL via `QRCode.toDataURL(profile.qr_code)` (no new dependency). Alternative
  (`qrcode.react` `QRCodeCanvas`) is possible but adds a dep; not recommended.
- **Avatar serving:** Store the file under `uploads/avatars/<reservistId>.<ext>` and serve it via
  a **scoped public static route** `/uploads/avatars`. `avatar_url` holds the public path
  (`/uploads/avatars/12.png`) so a plain `<img src>` works without auth headers.
  (An authenticated GET route would NOT work for `<img>` — it strips the Bearer token.)
- **Theming:** Use the app palette (navy `#132F45`, teal `#32667F`, gold) instead of the
  reference's `#1d4ed8`, for consistency.
- **Decorative assets:** The reference's `wave-top-bg.png` / `blob-bottom-bg.png` do not exist.
  Replace with a lightweight CSS gradient header (no new binary assets).

## Field mapping
**Front (`ReservistCardFront`)**
- Avatar (image if `avatar_url` else initials from `first_name`)
- Full name = `{first_name} {last_name}` on ONE line
- Rank
- Service number
- Bio (new)

**Back (`ReservistCardBack`)**
- QR code (value = `profile.qr_code`); placeholder + "Generate QR" button when absent
  (reuse the corner-bracket + "SCAN ME" edge framing from the reference `ProfileCardBack`)
- Emergency contact name (`emergency_contact_name`)
- Emergency contact phone (`emergency_contact_phone`)
- Address (`address`)
- *Optional enhancement:* a small "Unit / Squadron" line (`group_name` / `squadron_name`,
  already returned by `GET /my/profile`) for ID clarity — add if space allows.

## Backend changes (`server/`)
1. **Migration (run against DB, e.g. `pafr`):**
   ```sql
   ALTER TABLE reservists
     ADD COLUMN bio TEXT NULL AFTER address,
     ADD COLUMN avatar_url VARCHAR(512) NULL AFTER bio;
   ```
   (Ad-hoc like existing `run_alerts_migration.js`; no migration framework present.)

2. **`routes/reservists.js` — `PUT /my/profile`:** add `bio` validation
   (`body('bio').optional().isLength({ max: 1000 })`) and include `'bio'` in `allowedFields`.

3. **`routes/reservists.js` — new `POST /my/profile/avatar`:**
   - `multer` memory storage, image-only filter (jpeg/png/gif/webp), max ~2MB.
   - Resolve reservist by `req.user.id`; write file to
     `path.join(getUploadRoot(), 'avatars', `${reservistId}${ext}`)`
     (overwrite previous file of same id to avoid orphans).
   - `UPDATE reservists SET avatar_url = ? WHERE id = ?` with
     `/uploads/avatars/${reservistId}${ext}`.
   - Return `{ status:'success', data:{ avatar_url } }`. Return 400 on bad type/size.

4. **`server.js` — scoped static serve** (add near other `app.use`):
   ```js
   const { getUploadRoot } = require('./config/uploads');
   const path = require('path');
   app.use('/uploads/avatars',
     express.static(path.join(getUploadRoot(), 'avatars')));
   ```
   (Scoped to avatars only — does not expose other upload dirs.)

## Frontend changes (`client/`)
1. **New folder `client/src/components/digital-id/`:**
   - `ReservistCardFront.jsx` — props `{ profile, avatarUrl }`; navy-gradient header,
     circular avatar (img or initials), name one line, rank, service number, bio.
   - `ReservistCardBack.jsx` — props `{ profile, qrDataUrl, onGenerate }`; QR image
     (or placeholder + generate button), emergency contact name/phone, address; include
     the small `CornerBracket` / `ScanMeEdge` helpers copied from the reference back.
   - `ReservistCard.jsx` — flip container reusing `@/DIGITAL_ID/useFlipCard`; passes
     `qrDataUrl` + `onGenerate` to the back.

2. **`client/src/index.css` — add flip CSS** (currently undefined). Standard 3D flip:
   ```css
   .card-flip-container { perspective: 1200px; }
   .card-flip-inner { position: relative; width: 100%; height: 100%;
     transform-style: preserve-3d; transition: transform .6s; }
   .card-flip-inner.is-flipped { transform: rotateY(180deg); }
   .card-flip-face { position: absolute; inset: 0; backface-visibility: hidden;
     -webkit-backface-visibility: hidden; }
   .card-flip-face--back { transform: rotateY(180deg); }
   ```
   (The container needs an explicit height since faces are absolutely positioned;
   use the existing `aspect-[3/5]` wrapper from `ProfileCard.jsx`.)

3. **`pages/Profile.jsx`:**
   - **QR Code tab:** replace the current content with `<ReservistCard profile={profile}
     qrDataUrl={qrDataUrl} onGenerate={handleGenerateQR} />`. Keep `handleGenerateQR`
     (already exists) so the back's button works. Remove/keep the now-redundant large QR
     block.
   - **Profile tab (edit form):**
     - Add `bio` to `PERSONAL_FIELDS` as a `textarea` (so it is included in
       `ALL_EDITABLE_FIELDS` → sent by `handleSave` → saved via `PUT /my/profile`).
     - Add an **avatar editor** section (circular preview from `profile.avatar_url`,
       "Change photo" button → hidden file input → upload via `api.post('/reservists/my/profile/avatar', form, { 'Content-Type':'multipart/form-data' })` →
       `setProfile(prev => ({ ...prev, avatar_url: res.data.data.avatar_url }))`).
     - Add a `uploadAvatar` service helper in `services/api.js`
       (`uploadMyAvatar(formData)`).

## Validation
- `npm run lint` in `client/` and `server/` (if configured) pass.
- Manual: open Profile → QR Code tab shows flippable card; click flips to QR/emergency back.
- Edit bio + change photo in Profile tab → Save → reload → card front reflects both.
- Upload non-image / >2MB → rejected with clear error.
- Re-upload avatar overwrites previous file; `avatar_url` path loads via `/uploads/avatars/...`.
- Confirm `<img>` avatar loads WITHOUT login token (public static route).

## Risks / open questions
- Profile photos become publicly readable by URL guess — acceptable for an ID photo; flag if
  stricter privacy is required (would need blob-URL fetch instead).
- The DIGITAL_ID reference files are unused/WIP; we are creating independent, working
  components rather than importing the broken references (except reusing `useFlipCard`).
- `bio` length capped at 1000 chars; adjust if needed.
