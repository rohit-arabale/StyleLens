# Backend PRD — Virtual Try-On SaaS

**Purpose:** Technical blueprint for the backend that powers the Chrome extension + web app flows. Covers API surface, controllers, middleware, models, orchestration, and operational guardrails.

**Developer:** Rohit Arabale

**Stack (intended):** Node.js (Express/Fastify style), Cloud Run Gen2, Firestore, GCS + CDN, Gemini 2.5 Flash Image (primary), OSS fallback (OOTDiffusion), JWT auth.

---

## 1) Responsibilities

- Expose REST API for try-on, selfie management, history, account lifecycle, health/ops.
- Orchestrate vision parsing + generation via AI provider(s); manage caching.
- Persist user metadata, generations, history pointers; manage signed URLs.
- Enforce auth, validation, rate limits, and safety filters.
- Emit observability signals (logs/metrics/traces) and cost/quality counters.

## 2) Directory Contracts (backend/)

- `app.js` — Express/Fastify app wiring, middleware registration, route mounting.
- `index.js` — bootstrap server (env load, start listener, graceful shutdown hooks).
- `constant.js` — enums/config keys (error codes, roles, bucket names, limits, model ids).
- `controllers/` — request handlers; thin, delegate to services/utils.
- `db/` — database clients (Firestore init), bucket clients (GCS), connection management.
- `middleware/` — auth JWT, validation, rate limit, error handler, request logging, upload parsing, cache check.
- `models/` — data shapes and converters (Firestore collections: users, generations, history), DTO validation schemas.
- `route/` — route definitions mapping paths to controllers + middleware chains.
- `utils/` — helpers: hashing, signed URL helper, prompt builder, image validation, idempotency key, response wrapper, tracing.

## 3) API Surface (v1)

- `POST /api/v1/tryon`
- `GET  /api/v1/history` (paginated)
- `DELETE /api/v1/history/:jobId`
- `POST /api/v1/selfie`
- `POST /api/v1/account/delete`
- `GET  /api/v1/healthz`
- `GET  /api/v1/readyz`

### 3.1 POST /api/v1/tryon

- Auth: Bearer JWT (contains `userId`).
- Input: { garmentImage (data URI or base64), garmentUrl?, options { preservePose?, lightingMatch? }, client { source, version }, idempotencyKey? }
- Flow: validate payload → fetch selfie by userId → vision parse (garment + person) → prompt build → generation (Gemini primary, OSS fallback) → store image (full + thumb) → persist generation + history → respond with { jobId, status, previewUrl, expiresAt, metadata }.
- Errors: INVALID_IMAGE, GARMENT_OCCLUDED, SIDE_VIEW, FACE_MISSING, RATE_LIMIT, MODEL_UNAVAILABLE, UNSUPPORTED_TYPE.

### 3.2 GET /api/v1/history

- Auth required.
- Query: limit (default 20, max 50), cursor, filters { category?, source?, from?, to? }.
- Returns paginated list of generations for user.

### 3.3 DELETE /api/v1/history/:jobId

- Auth required; deletes history pointer; may soft-delete generation or mark redacted.

### 3.4 POST /api/v1/selfie

- Auth required.
- Accepts multipart/form-data or JSON base64; enforces one frontal face present; size/type validation.
- Stores original + normalized 1024x1024; updates `selfieUrl`, `selfieHash` in `users` doc.

### 3.5 POST /api/v1/account/delete

- Auth required; cascades delete: Firestore docs, GCS objects (selfies, generations), revokes signed URLs; returns 202 accepted.

### 3.6 Health/Ready

- `healthz`: process and dependency liveness (responds 200 quickly).
- `readyz`: verifies Firestore and GCS access; returns model availability summary.

## 4) Controllers (abstract functions)

- `controllers/tryonController.js`
  - `createTryon(req, res)`
    - Validates payload; ensures selfie exists; calls `tryonService.processTryon`; returns payload with previewUrl/jobId/metadata.
- `controllers/historyController.js`
  - `listHistory(req, res)` — paginated fetch for userId.
  - `deleteHistoryItem(req, res)` — delete pointer; optional cascade.
- `controllers/selfieController.js`
  - `uploadSelfie(req, res)` — validate face present; store; update user doc.
- `controllers/accountController.js`
  - `deleteAccount(req, res)` — trigger cascade deletion job.
- `controllers/healthController.js`
  - `healthz(req, res)`; `readyz(req, res)`.

Controllers remain thin; business logic in services (may live in utils/services folder if added later).

## 5) Services / Core Logic (can live in utils/ or new services/)

- `tryonService.processTryon({ userId, garmentImage, garmentUrl, options, idempotencyKey })`
  - Steps: hash inputs → check cache → load selfie → vision.garmentParse → vision.personParse → promptBuilder.build → generation.invoke(model) → storage.save(full+thumb) → db.writeGeneration + history → telemetry emit → return response DTO.
- `visionService.garmentParse(image)` — detect bbox, segmentation, occlusion, attributes, dominant color, pattern, view angle.
- `visionService.personParse(selfie)` — face detect, pose landmarks, lighting, hair/glasses/beard, skin tone, head tilt, shoulder width.
- `promptBuilder.build(garmentDesc, personDesc)` — produce system + user prompt strings.
- `generationService.invoke({ prompt, personImage, garmentDesc, modelHint })` — call Gemini 2.5 Flash Image; fallback to OSS on failure/limit; returns image bytes + metadata.
- `storageService.saveGeneration({ userId, jobId, imageBytes })` — write full + thumb to GCS; return URLs; handle signed URL TTL.
- `storageService.saveSelfie({ userId, selfieBytes })` — write selfie; return url+hash.
- `dbService.writeGeneration({ jobId, userId, urls, metadata })` — write `generations` and `history` docs (batched transaction).
- `accountService.cascadeDelete(userId)` — delete user doc, history subcollection, generation docs, GCS objects; idempotent.
- `cacheService.lookup(hashKey)` — optional; return cached generation.

## 6) Middleware

- `authMiddleware` — verify JWT; attach userId; reject if missing/invalid.
- `validateMiddleware(schema)` — per-route payload/schema validation (e.g., Joi/Zod).
- `rateLimitMiddleware` — per-IP and per-user; configurable buckets.
- `loggingMiddleware` — structured logs with requestId/userId/jobId.
- `errorMiddleware` — centralized error to JSON with code/message.
- `uploadMiddleware` — parse multipart/JSON base64; size/type guard; EXIF strip optional.
- `cacheCheckMiddleware` — optional: respond from cache when hash hit and policy allows.

## 7) Models (Firestore logical schema)

- `users/{userId}`
  - Fields: selfieUrl, selfieHash, createdAt, updatedAt, attrs { heightCm?, weightKg?, bodyType? }, settings { cacheReuse?, marketingOptIn? }.
- `generations/{jobId}`
  - Fields: userId, previewUrl, garmentUrl?, garmentHash?, selfieHash, occlusionScore, viewAngle, processingMs, modelUsed, promptVersion, createdAt, status.
- `history/{userId}/items/{jobId}`
  - Fields: generationRef, createdAt, deletedAt?, source (extension|web), rating? (thumbs up/down), servedFromCache?.

Indexing: `history` by userId+createdAt; `generations` by userId+createdAt; optional modelUsed.

## 8) Data Validation & Safety

- Image type allowlist: image/jpeg, image/png; max size 5MB raw.
- Selfie must contain one face; reject multiple/none; pose frontal; occlusion threshold.
- Garment must be front-view (<30°), occlusion <=0.35; otherwise reject with code.
- NSFW check before generation; drop and log.
- Idempotency: optional header `Idempotency-Key`; reuse jobId on retry.

## 9) Storage Strategy (GCS)

- Buckets: `selfies/`, `generations/full/`, `generations/thumbs/` (private); CDN fronts public derivatives if desired.
- Filenames: `{userId}/{jobId or hash}.{png}`; thumbs at 512px.
- Signed URLs for download with short TTL (10–60 min).
- Lifecycle rules: optional expiry for old generations; retain thumbs longer.

## 10) Telemetry & Ops

- Metrics: latency per stage (vision, generation, storage), cache hit rate, error codes, occlusion reject rate, cost per generation, CDN hit.
- Tracing: requestId and jobId spans; propagate to AI calls.
- Logging: JSON logs; include userId, jobId, modelUsed, requestId, source.
- Alerts (suggested): p95 latency > SLO, error rate > 2%, cost spike, cache hit < target, modelUnavailable frequency.

## 11) Performance & Cost Controls

- p95 < 3s target; fail fast on invalid inputs.
- Cache identical garmentHash+selfieHash+modelVersion+promptVersion.
- Serve thumbnails by default; full res on demand.
- Backoff on 429/model quota; auto-switch to fallback when primary exceeds budget or is unavailable.

## 12) Error Codes (canonical)

- `INVALID_IMAGE`, `UNSUPPORTED_TYPE`, `GARMENT_OCCLUDED`, `SIDE_VIEW`, `FACE_MISSING`, `NSFW_DETECTED`, `RATE_LIMIT`, `MODEL_UNAVAILABLE`, `INTERNAL_ERROR`.

## 13) Security & Compliance

- JWT auth; TLS enforced.
- CMEK for GCS; signed URLs only; no public buckets.
- PII minimization: store selfie URL + hash; no raw embeddings.
- GDPR-style delete/export through accountController.
- Input sanitization and basic AV/NSFW checks on uploads.

## 14) Migration / Extensibility Notes

- Keep model/fallback selection behind feature flags.
- Prompt versioning stored per generation; allows rollback.
- Route versioning via `/api/v1`; keep room for `/api/v2` without breaking clients.
- Allow merchant/B2B surface later via separate routes and auth scopes.

## 15) Open Items for Implementation

- Choose framework (Express vs Fastify) and validation lib (Joi/Zod).
- Decide storage bucket naming and TTL policies.
- Decide if cache layer is in-memory (per pod) or shared (Redis/Memcache).
- Finalize NSFW and AV provider (Vertex Safety, Cloud Vision, or OSS?).
