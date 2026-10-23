# Upload-to-bouquet MVP

## Acceptance status

Implementation is not acceptance. Three successful API calls do not count as three
browser end-to-end runs. Record live results below; mark unavailable checks explicitly.

## Audit (2026-10-23)

| Finding | Evidence / disposition |
| --- | --- |
| GitHub and hosted source diverged | GitHub `3045f35`; hosted `f84be06`. Reconciled the existing exhibition with deployed provider fixes and phased legacy routes. |
| Legacy interface mismatch | GitHub camera panel used `/api/material-translate`, absent from hosted source; hosted `/api/generate` returned 409 requiring phased requests. The upload MVP now uses one implemented `/api/generate` contract. |
| Credentials | A production secret is registered. Previous direct production calls authenticated successfully through the configured gateway; the secret's value is never read or copied. |
| Provider compatibility | Responses image input and Images edits returned real successful results through the existing gateway in earlier tests. No claim is made about arbitrary compatible gateways. |
| Preview origin | The local `terminal.local:4173` origin was missing from validation. Development-only origin support is retained. |
| Preview network | A diagnostic request from the supervised preview returned DNS `EAI_AGAIN / getaddrinfo` for the deployed host; the preview also lacks the production secret. This is separate from production API availability. |
| Camera | Removed from the reused exhibition panel; its import path remains as an upload-only wrapper. |
| Image success | New UI confirms success on browser image `onLoad`; an image decoding error is a generation failure. No fallback is returned by the MVP. |

## Architecture

`/demo` and the existing exhibition panel reuse `ImageBouquetDemo`.
They submit a multipart `image` to `POST /api/generate`.
The Worker validates the upload, calls `/responses`, validates a minimal
`{ description, generationPrompt, metadata }` representation, then calls
multipart `/images/edits`. Base64 output is signature-checked and returned as
a self-contained image data URL. HTTPS URL output, when supplied by a provider,
is retrieved server-side with the same deadline, without forwarding API credentials.

The old album page and its `/api/analyse`, `/api/render`, `/api/qa` flow remain
available. Their historic aesthetic rules do not control the new MVP.

Networking lives in `worker/generation.ts`; provisional product prompts and the
one-pass template renderer live in `worker/generation-prompts.ts`. No final
portrait-to-flower features, species mappings or aesthetic rules are defined.

## Runtime configuration

Configure these in the existing Site's runtime settings, then redeploy:

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Required server secret for vision and, by default, images |
| `OPENAI_BASE_URL` | HTTPS provider API root including `/v1`; defaults to `https://api.openai.com/v1` |
| `OPENAI_VISION_MODEL` | Provider's actual vision-capable alias; current deployment uses `gpt-6-sol` |
| `OPENAI_IMAGE_MODEL` | Provider's actual image-editing alias; default `gpt-image-2` was previously tested |
| `OPENAI_IMAGE_BASE_URL` | Optional separate image API root |
| `OPENAI_IMAGE_API_KEY` | Optional separate image provider secret |
| `VISION_PROMPT` | Replaceable product prompt; request concise JSON with the intermediate fields |
| `GENERATION_RATE_LIMIT` | Attempts per IP per ten minutes, bounded to 1–10; default 3, classroom deployment configured to 5 to allow retries |
| `BOUQUET_IMAGE_PROMPT` | Replaceable product image prompt; accepts `{{description}}` and `{{generationPrompt}}` |

For GitHub Pages, the existing workflow sets `NEXT_PUBLIC_BASE_PATH=/Album-era`
and `NEXT_PUBLIC_GENERATION_API_URL=https://album-era.hazellfish-z.chatgpt.site/api/generate`.
For the full-stack Site, leave those build variables unset to use same-origin APIs.
Never put provider secrets into `NEXT_PUBLIC_*`, source, hosting manifests or logs.

## Errors, deadlines and retry behavior

- Uploads: JPEG/PNG/WebP, nonempty, at most 8 MB; MIME and signatures must agree.
- Request bodies and provider responses have independent size limits.
- Vision: 45 s deadline; generation (including optional URL download): 65 s.
- Browser API request: 120 s; image display: 15 s after a successful response.
- Failures include a safe code, stage, request ID, retryability and optional upstream
  status / Retry-After. Raw provider error bodies and uploaded images are not logged.
- Retries are user-initiated. Paid provider POSTs are not automatically retried.
- A configurable number of valid attempts per IP per ten minutes (default three), best-effort per Worker
  isolate. This is not a durable distributed quota. An upstream failure counts as an attempt.
- A timeout can occur after a provider has begun work; retrying may incur another charge.

## Deployment checklist

- [ ] Feature branch and review link retained; no credentials committed.
- [ ] API contract tests, TypeScript check, production build and existing tests pass.
- [ ] Existing Site identity and audience preserved.
- [ ] Production `/demo` serves over HTTPS and points to the production Worker.
- [ ] Production environment revision and deployed saved version recorded.
- [ ] Invalid image and malformed upload produce distinct errors in production.
- [ ] Three different uploaded images produce actual images in production.
- [ ] For each of those three runs, browser upload, loading, image decoding and
      visible success are observed without replacing results manually.
- [ ] Error and explicit retry behavior observed in a browser.
- [ ] Target classroom browser/network checked; Safari is unverified unless tested.

## Test evidence

Contract suite uses controlled provider responses to exercise upload validation,
missing/invalid credentials, denied models, malformed/split/fenced JSON, incomplete
output, missing/corrupt image data, base64 and URL image outputs, per-stage timeouts,
network failures, provider and application rate limits, CORS and configurable prompts.
These are mocked provider tests, not evidence of real generation or model permissions.

Live production results and browser limitations will be recorded after deployment.

### Current verification results

- TypeScript check and production build passed. Complete suite: 26 tests passed.
- Production `/demo`: HTTP 200. Invalid file: HTTP 415 `UNSUPPORTED_IMAGE_TYPE`.
- Real API run 1: `lunar-veil-cover.webp`, HTTP 200, 44.8 s; actual PNG output.
- Real API run 2: `cherry-static-cover.webp`, HTTP 504, vision deadline at 45.7 s.
- Real API run 3: `moss-memory-cover.webp`, HTTP 200, 35.3 s; actual PNG output.
- Browser (local preview): invalid upload, valid preview, error classification and
  explicit retry verified. Missing-secret retries returned different request IDs.
- Browser display contract: a clearly labelled stub provider used recorded real
  production image bytes. Image decoded successfully at 1254×1254; completion
  appeared only after load. This is not a real-generation end-to-end run.
- Production browser end-to-end acceptance: **0/3 verified**. The supported cloud
  browser is limited to the supervised preview; that preview has no production
  secrets and its outbound DNS failed with `EAI_AGAIN`. No mock is counted as acceptance.
- Safari / classroom browser compatibility remains unverified.

Reproduce production API-only checks with
`node scripts/verify-live-demo.mjs --real`. This makes paid generation calls.
Use `--input cherry-static-cover.webp --output-dir outputs/live-demo-retry` to retry
only the failed fixture. The script records request IDs and timings, never keys or
image contents in its JSON report. Image bytes are kept only as local QA outputs.

### Retry result and final acceptance boundary

The failed `cherry-static-cover.webp` request succeeded on an explicit retry:
HTTP 200, 64.7 s total; 36.0 s vision and 27.8 s image generation. Request ID:
`2e8f1ea4-c6d3-4fe8-aa31-e0f8fc8dea31`. Three different image fixtures now have
successful real production API results, with one prior timeout retained.

The API returned actual PNG bytes even when JPEG was requested; MIME detection
uses response bytes rather than assuming the requested output format.

**Definition of Done is not fully met:** production browser end-to-end runs
remain 0/3 verified. No provider stub, recorded response, local build or API-only
run is included in that count.

The Sites managed-preview guidance requires browser QA on
`http://terminal.local:4173/` and states: “deployed Sites URLs are unreachable
from that browser.” The permitted preview has no production secret and its
outbound production-host lookup previously failed with `EAI_AGAIN`. Supplying a
credential directly in chat or embedding it in a client bundle is not a workaround.
A browser environment capable of opening the actual deployed `/demo` URL and
uploading three references is still required. Target Safari is also unverified.

### Changed files

- `worker/generation.ts`, `worker/generation-prompts.ts`, `lib/generation-contract.ts`:
  provider transport, errors/timeouts, generic intermediate representation and replaceable prompts.
- `worker/index.ts`: route dispatch; legacy phased routes remain.
- `components/image-bouquet-demo.tsx`, `components/camera-translation.tsx`,
  `app/demo/page.tsx`, `app/page.tsx`: upload-only MVP, reuse existing exhibition
  import, navigation, decode validation and completion state.
- `tests/generation-api.test.mjs`, `tests/rendered-html.test.mjs`: provider and
  rendered-route regression coverage.
- `scripts/verify-live-demo.mjs`: repeatable production API-only checks, optionally
  real paid generation; input fixture allowlist and redacted evidence.
- `README.md`, this document: audit, configuration, deployment and acceptance status.
- Existing aesthetic runtime source/docs/tests are reconciled from the prior
  deployment; they are preserved legacy functionality and are not new product decisions.

The GitHub feature branch is not merged into `main`; GitHub Pages remains its
previous build until merge/deployment. Use the separately deployed full-stack
Site `/demo` for this MVP.
