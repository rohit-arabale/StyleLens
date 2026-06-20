# Virtual Try-On SaaS — Comprehensive PRD

**Owner:** Rohit Arabale  
**Developer:** Rohit Arabale  
**Status:** Ready for build  
**Scope:** Chrome Extension + Web App + Backend (AI orchestration)  
**Goal:** Let users see garments on themselves before buying; minimize returns; keep infra cost-aware and swappable.

---

## 1) Objectives & Success

- Deliver realistic try-on previews in < 3s p95 end-to-end (upload → preview URL).
- Preserve user face identity and pose; garment fidelity to color, pattern, and fit.
- Zero-friction flows: extension drag-drop → preview; web onboarding/history/account.
- Resilient, swappable AI stack: Gemini 2.5 Flash Image primary; OSS fallback with identical contract.
- Cost visibility: per-generation cost and cache-hit metrics visible in telemetry.

## 2) Scope & Out-of-Scope

- In scope: Chrome extension popup (drag/drop or file upload), web app (onboarding, history, account), backend APIs, AI orchestration, storage, CDN, auth, observability, and data lifecycle (export/delete).
- Out of scope (initial): merchant bulk upload, AR/3D try-on, multi-person scenes, video try-on, social sharing feed, payments.

## 3) Personas & Use Cases

- Shopper (B2C): Tries garments while browsing; wants quick preview and download; expects privacy.
- Returning user: Manages selfie, views history, downloads results, deletes data.
- (Later) Merchant/B2B: Could embed widget or supply catalog; not required now but keep API design extensible.

## 4) End-to-End Flows (Source of Truth)

### Extension Flow (primary)

1. Open popup on any fashion site.
2. Drag/drop garment image (or file picker). Client resizes to 512x512, strips EXIF, shows lightweight preview.
3. Click "Try On" → POST `/api/v1/tryon` with garment image base64 + user JWT + options.
4. Server: fetch stored selfie; run garment parser + person parser; build prompt; call generation (Gemini or fallback).
5. Store preview in GCS; respond with jobId + previewUrl; show in extension.
6. Async: write history record; CDN caches thumbnail; extension can Save/Download/Retry.

### Web App Flow

1. Onboarding: upload selfie (front-facing, shoulders visible); validate face present; optional height/weight/body type.
2. Dashboard/History: grid of try-ons; filters (date/category/source); open item for full view; download; optional "shop similar" link.
3. Account: update selfie; delete history; export data; sign-out.

### Backend Orchestration Flow

- Receive try-on → validate token/payload → fetch selfie → vision parsers (garment + person) → prompt assembly → generation → store preview + metadata → respond with preview URL + jobId → async history write → surfaces to web and extension.

## 5) Architecture & Responsibilities

- **Chrome Extension (MV3):** Popup UI only; permissions `storage`, `activeTab`, host `https://api.yoursaas.com/*`; JS bundle < 200KB; client-side resize/EXIF strip; offline-friendly error states.
- **Web App (current repo: Vite React):** Onboarding/selfie upload, auth guard, history gallery, account settings, download/export.
- **API Gateway (Cloud Run Gen2):** JWT auth, request validation, rate limiting, input sanitation, signed URL issuance, orchestration calls.
- **Vision Parsers:** Garment parser (object localization, segmentation, attributes), Person parser (face detect, pose, lighting, hair/glasses/beard).
- **Generation Engine:** Gemini 2.5 Flash Image primary; OSS fallback (OOTDiffusion) on GKE/Run with same IO contract; switchable via feature flag.
- **Storage/CDN:** GCS buckets (selfies, generations, thumbs); Cloud CDN; signed URLs for private assets; lifecycle rules for expiry.
- **Database:** Firestore `users`, `generations`, `history`; indexes for userId + createdAt.
- **Queue (optional):** Cloud Tasks for async writes/retries; not mandatory for initial happy path.
- **Observability:** Cloud Trace/Logging/Monitoring; metrics for latency, error codes, occlusion rejects, cost per gen, CDN hit rate.

## 6) Functional Requirements (with acceptance)

- Drag-drop/file upload in extension; client resizes to 512x512 and strips EXIF before upload.
  - Accept: image/jpeg or image/png; max raw 5MB; reject others with clear message.
- Auth required for try-on, selfie upload, history access; guest mode not supported initially.
- Try-on generation preserves face and pose; garment matches category, color, pattern.
- History persisted per user; supports pagination and filters (date range, category, source: web/extension).
- Download: provide signed URL; expires after short TTL; regenerate on demand.
- Account: update selfie (previous one revoked), delete history entry, export all data, delete account (cascades storage + DB).
- Error handling: user-facing, actionable messages (occlusion, side view, missing face, rate limit, model unavailable).
- Caching: if identical garment hash + selfie hash exists, return cached generation when freshness policy allows.

## 7) Non-Functional Requirements

- Latency: p95 < 3.0s end-to-end; p50 < 1.5s on cached hits.
- Availability: 99.5% target for API; graceful degradation to fallback model.
- Throughput: scale to bursts of 20 RPS try-ons without queueing for MVP.
- Size: extension bundle < 200KB; API responses compressed (gzip/br).
- Reliability: retries for transient AI/service errors with idempotent jobId.
- Privacy: no raw embeddings stored; only hashed descriptors.
- Accessibility: extension and web meet basic keyboard nav and color-contrast checks.

## 8) API Contracts (detailed)

### POST `/api/v1/tryon`

Request (JSON):

```
{
  "garmentImage": "data:image/jpeg;base64,...",  // required
  "garmentUrl": "https://example.com/item.jpg",   // optional
  "options": { "preservePose": true, "lightingMatch": "auto" },
  "client": { "source": "extension", "version": "1.0.0" }
}
```

Auth: Bearer JWT (userId inside).  
Response 200:

```
{
  "jobId": "tryon_6a08f9b2c1",
  "status": "completed",
  "previewUrl": "https://cdn.yoursaas.com/gen/tryon_6a08f9b2c1.png",
  "expiresAt": "2026-01-26T12:00:00Z",
  "metadata": {
    "garmentDetected": "polo-shirt",
    "confidence": 0.94,
    "processingTimeMs": 1240,
    "source": "extension"
  }
}
```

Errors: GARMENT_OCCLUDED, SIDE_VIEW, FACE_MISSING, RATE_LIMIT, MODEL_UNAVAILABLE, INVALID_IMAGE.

### GET `/api/v1/history?limit=20&cursor=...`

Response 200:

```
{
  "generations": [
    {
      "jobId": "tryon_6a08f9b2c1",
      "previewUrl": "https://cdn.yoursaas.com/gen/tryon_6a08f9b2c1.png",
      "garmentUrl": "https://zara.com/shirt.jpg",
      "createdAt": "2026-01-25T10:30:00Z",
      "metadata": { "category": "top", "color": "navy-blue", "source": "extension" }
    }
  ],
  "nextCursor": "..."
}
```

### POST `/api/v1/selfie`

- Multipart or base64 JSON; validates one face detected, frontal, not occluded.
- Stores original + normalized 1024x1024; returns `selfieUrl`, `selfieHash`.

### DELETE `/api/v1/history/:jobId`

- Deletes history pointer; leaves generation object but marks soft-deleted or hard-deletes based on policy.

### POST `/api/v1/account/delete`

- Cascades: delete Firestore user doc, history subcollection, generations owned by user, GCS objects; revoke URLs.

## 9) Data Model (Firestore)

- `users/{userId}`: selfieUrl, selfieHash, createdAt, updatedAt, attrs { heightCm?, weightKg?, bodyType? }, settings { marketingOptIn?, cacheReuse? }.
- `generations/{jobId}`: userId, previewUrl, garmentUrl?, garmentHash?, selfieHash, occlusionScore, viewAngle, processingMs, modelUsed, createdAt, status.
- `history/{userId}/items/{jobId}`: pointer to generation, createdAt, deletedAt?, source (extension|web), rating? (thumbs up/down).

## 10) Storage Layout (GCS)

- Buckets: `selfies/` (private), `generations/full/`, `generations/thumbs/`.
- Filenames: `{userId}/{hash}.{ext}`; thumbs at 512px.
- Signed URLs for download (TTL 10–60 minutes).
- Lifecycle: optional auto-delete generations older than policy; thumbnails retained longer for cache.

## 11) AI Orchestration

### Vision Parsing

- Garment: largest clothing object; segmentation mask; attributes (category, subType, neckline, sleeveLength, fit); dominant color (RGB); pattern tag; occlusion score; view angle.
- Person: face detect; skin tone RGB; pose landmarks; head tilt; lighting class; glasses/beard; hair length/color; shoulder width px.

### Prompting (Gemini 2.5 Flash Image)

- System: professional fashion photographer; preserve face/pose; match lighting; no body alteration; output only image.
- User prompt: rendered from garment/person JSON + composition rules (upper body, garment clearly visible, natural shadows).
- Generation config: temperature 0.3, top_p 0.8, safety settings default, output 1024x1024 image.
- Safety: reject if input NSFW detected; do not store such inputs.

### Fallback Model

- OOTDiffusion (or similar) on GKE Autopilot/Run; same input/output JSON contract; enabled via flag; logged which model used.

### Caching

- Key: hash(selfieHash + garmentHash + modelVersion + promptVersion).
- On cache hit: skip generation; return stored preview and metadata; still log request.

## 12) Validation & Rejection Rules

- Occlusion > 0.35 → reject; message: "Garment is obstructed; try a clearer image."
- View angle > 30° side → reject; request front view.
- No face in selfie → reject upload/try-on; ask to re-upload.
- Low contrast (dark-on-dark) → warn with suggestion.
- File too large/unsupported type → reject early client-side when possible.
- Rate limit per user and IP; 429 returns retry-after; client backs off.

## 13) Quality, Metrics, and Telemetry

- KPIs: garment identity > 85%, face identity > 90%, user rating > 4.0/5, occlusion reject 15–25%, API error < 2%.
- Metrics: latency per stage (upload, vision, generation, storage), cache hit rate, per-model cost, CDN hit rate, retry counts.
- Tracing: spans per jobId; IDs returned to clients for support.
- Logging: structured JSON with requestId, userId, jobId, modelUsed, errors.

## 14) Security & Privacy

- JWT auth everywhere; TLS 1.3.
- CMEK for GCS; signed URLs short-lived; no public buckets.
- PII minimization: store selfie URL + hash; no raw embeddings; hashes only.
- GDPR-style export/delete; COPPA gate (<13 reject onboarding).
- Extension permissions minimal (`storage`, `activeTab`, host allowlist).
- Input sanitization: strip EXIF; virus-scan optional; NSFW detection pre-generation.

## 15) Performance & Cost Guardrails

- Target < 3s p95 end-to-end; fail fast on invalid inputs.
- Use thumbnails (512px) by default; fetch full (1024px) on demand.
- Cache reuse for identical garment/selfie; show "served from cache" metadata.
- Batch generation optional when queue depth high; backoff on model 429.
- Cost alerts: when avg cost/gen > threshold (e.g., $0.05); switch to OSS fallback automatically if needed.

## 16) Observability & Operations

- Dashboards: latency by stage, error codes, model usage split, cache hit, CDN hit, cost per gen.
- Alerts: p95 latency > SLO, error rate > 2%, cache hit < target, cost spike, CDN miss spike.
- Runbook: retry policy, failover to fallback model, how to purge cache, how to rotate signed URL keys, how to revoke a compromised selfie.
- Audit: log admin actions (deletes/exports).

## 17) Delivery Plan (sequenced, no dates)

- Foundation: extension scaffold (drag-drop/upload, JWT wiring); web onboarding + selfie upload; API skeleton with mocks; storage/DB setup; signed URL flow.
- Core AI: garment parser, person parser, prompt builder, Gemini integration, fallback switch, cache keying, E2E happy path.
- Polish: error handling, retries/backoff, history/gallery filters, download/export, CDN/thumb optimization, telemetry dashboards.
- Launch readiness: extension store assets/review, analytics, affiliate/shopping link plumbing, security review, data deletion/export verification.

## 18) Risks & Mitigations

- Gemini pricing/limits: keep OSS fallback; support batch mode; enforce cache reuse.
- Extension store rejection: minimal permissions; no content scripts; privacy policy ready.
- Poor generation quality: prompt versioning, human eval set, fast rollback to prior prompt/model.
- Legal/biometric: explicit consent, no face recognition storage, regional bucket control.
- Cost overrun: alerts, throttle free tier, force fallback when budget exceeded.

## 19) Open Questions

- Offer merchant-side ingestion/API at this stage?
- Default max resolution 1024 or 768 to balance cost/quality?
- Support side-profile selfies later?
- Hosting web on Vercel vs Cloud Run (latency vs simplicity)?
