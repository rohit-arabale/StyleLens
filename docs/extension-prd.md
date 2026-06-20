# Chrome Extension PRD — Virtual Try-On

**Purpose:** Product + engineering spec for the Manifest V3 extension that lets users drag/drop garment images on any fashion site, submit to backend, and view generated previews.

**Developer:** Rohit Arabale

**Scope:** Popup-only extension (no content scripts). Handles image intake, auth, upload, preview display, history fetch, and error states. Integrates with backend APIs defined in backend PRD.

---

## 1) Objectives

- 1-click drag/drop → preview flow under 3s p95 (network + backend included).
- Keep bundle < 200KB (JS+assets) and idle CPU/network minimal.
- Minimal permissions: `storage`, `activeTab`, host `https://api.yoursaas.com/*`.
- Resilient UX: clear validation, retries/backoff, cached preview reuse.

## 2) User Flows

- Open popup on any page → drag/drop garment image (or file picker) → client resize to 512x512 + EXIF strip → click Try On → send to `/api/v1/tryon` with JWT → show loading → display preview → actions: Save (history), Download, Retry.
- If user not onboarded (no selfie), show CTA to open web app onboarding.
- History shortcut: fetch latest items to show lightweight list (optional, read-only).

## 3) Architecture (extension-side)

- **Popup UI** (React or vanilla): screens for idle, loading, success, error.
- **Background/service worker**: holds auth token, handles notifications, performs fetch to backend with JWT, centralized retry/backoff.
- **Optional offscreen doc**: for image operations if needed; else do in-popup with Canvas/Web API.
- **Storage**: chrome.storage.local for JWT, minimal prefs; caches last preview URL per jobId for quick reopen.
- **Networking**: fetch to backend APIs with Authorization Bearer; JSON payloads; enforce timeouts and abort signals.

## 4) Permissions & Manifest (MV3)

- Permissions: `storage`, `activeTab`.
- Host permissions: `https://api.yoursaas.com/*`.
- No content scripts by default; no `tabs` unless later required for context reading.
- Action popup defaults to `popup.html`; background service worker registered.

## 5) UX States

- Idle: drop zone + file picker; shows accepted formats and size limit.
- Loading: spinner with text "Generating preview…"; allow cancel.
- Success: preview image, metadata snippet (category/color), buttons Save/Download/Retry/New.
- Error: code-specific messaging (occlusion, side view, face missing, rate limit, offline, model unavailable); Retry with backoff.
- Not onboarded: explain need for selfie upload; deep link to web app onboarding.

## 6) Data & Validation

- Client-side validation: type in {jpeg,png}, max 5MB raw; warn if image dims < 256px.
- Preprocess: resize longest edge to 512px; strip EXIF; compute garmentHash client-side for cache hint.
- Attach `client` object { source: "extension", version: <ext_version> } to requests.
- Idempotency: generate `Idempotency-Key` per submit to avoid duplicate charges; reuse on retry of same image.

## 7) API Integration (consumer view)

- **POST /api/v1/tryon**: send garmentImage (data URI), options, client block; expect { jobId, previewUrl, status, metadata }.
- **GET /api/v1/history?limit=10&source=extension**: optional lightweight history for quick access.
- **POST /api/v1/account/delete**: accessible via web only; extension links out.
- Auth: Bearer JWT stored in chrome.storage; refresh via web app OAuth/session handoff (out of scope here but extension reads token).

## 8) Error Handling & Retry

- Map backend codes to UX:
  - `GARMENT_OCCLUDED` → "Garment is obstructed; try clearer image."
  - `SIDE_VIEW` → "Front-facing garment works best."
  - `FACE_MISSING` → "Upload a selfie in the web app first."
  - `RATE_LIMIT` → show retry-after countdown.
  - `MODEL_UNAVAILABLE` → fallback message; allow retry; note if cache hit exists.
- Network/offline: detect navigator.onLine; allow local requeue; retry with exponential backoff (e.g., 1s, 2s, 4s, max 3 tries).
- Idempotent retries: reuse Idempotency-Key and jobId where provided by backend.

## 9) Caching Strategy (client-side)

- Store last successful previewUrl per jobId in chrome.storage.local (with TTL, e.g., 24h) to show instantly on reopen.
- If backend returns servedFromCache, display accordingly; still fetch to ensure validity.
- Do not store raw garment images after upload; keep hashes only for cache hint.

## 10) Performance Targets

- UI thread idle; image processing (resize) under 150ms for 5MB input on mid-tier laptop.
- Network timeout set to 8–10s with abort; user-visible progress.
- Bundle size < 200KB (gzip) for JS + CSS; defer non-critical assets.

## 11) Security & Privacy

- Never persist JWT in plain text outside chrome.storage; namespace keys.
- Strip EXIF before upload to remove GPS/PII.
- HTTPS only; fail closed on mixed content.
- No third-party trackers; only first-party analytics events (anonymized, non-PII).
- Respect COPPA/GDPR flows: if backend flags age restriction, block actions and show message.

## 12) Telemetry (minimal)

- Events: `tryon_submit`, `tryon_success`, `tryon_error`, `tryon_cache_hit`, `history_view`, `download_click`.
- Payload fields: requestId, jobId, source=extension, extVersion, timing (client-side), errorCode.
- Sampling: 100% for MVP; can throttle later.

## 13) UI Components (abstract)

- DropZone: drag/drop + click to upload; shows accepted types/sizes.
- PreviewCard: displays preview image, metadata, actions.
- ErrorBanner: code-specific copy and CTA.
- HistoryList (optional): small list with thumbnails and timestamps.
- SettingsLink: opens web onboarding/account in new tab.

## 14) File/Folder Expectations (inside extension/)

- `manifest.json` (MV3).
- `src/popup/` UI code.
- `src/background/` service worker for networking/retries.
- `src/utils/` image helpers (resize/EXIF strip/hash), storage helpers, api client.
- `assets/` icons at required sizes.
- Build output to `dist/` for packing.

## 15) Build & Release

- Build: Vite/webpack/rollup targeting MV3; produces `dist` with manifest and assets.
- Lint: ESLint + Prettier; type-check if TS used.
- Packaging: `chrome://extensions` load unpacked for dev; zip `dist` for store upload.
- Versioning: align ext version with backend contract changes; bump on breaking API shifts.

## 16) Store Compliance Checklist

- Minimal permissions; clear privacy policy link.
- No content scripts or page scraping; popup-only workflow.
- Icons/screenshots sized per Chrome Web Store requirements.
- Handles offline/error states gracefully; no crashes on denied permissions.

## 17) Open Questions

- Should we surface "Shop similar" from history inside popup or web-only?
- Do we allow pasting image URLs, or only file/drag-drop? (If yes, need fetch+cors handling.)
- Should preview auto-save to history or require explicit Save?
