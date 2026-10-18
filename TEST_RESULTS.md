# Verified results

Verification date: **18 October 2026, Asia/Kolkata**. Windows, Node 24.20.0, npm 11.19.0, installed Google Chrome.

- **Dependency installation:** passed. Pinned dependencies and `package-lock.json` are delivered. The initial network-restricted install was replaced by an approved normal-network installation.
- **Final `npm test`:** **50 passed, 0 failed**, across five suites: booking, conversation, persistence, speech, and database. Runtime: approximately 2.7 seconds.
- **Final `npm run test:e2e`:** **10 passed, 0 failed**, five scenarios each on desktop Chrome and an emulated iPhone viewport in Chromium. Runtime: approximately 31 seconds.
- **Final `npm run build`:** passed with Vite 7.3.7, 1,768 transformed modules. Main JS: 460.94 kB (142.95 kB gzip); CSS: 41.31 kB (9.97 kB gzip).
- **Production preview smoke:** six direct routes returned HTTP 200 and rendered their headings; a typed receptionist conversation succeeded against the compiled bundle; all six pages fit a 390px viewport; **0 browser runtime/console errors**.
- **Final `npm audit --audit-level=low`:** **0 known vulnerabilities**. This is a point-in-time advisory check, not a guarantee against unknown vulnerabilities.
- **Secret scan:** no credential/private-key patterns found in project source. `.env.example` contains empty placeholders. No real environment file or service credentials were created.
- **Screenshots:** actual Playwright captures for desktop/mobile landing, overview, voice agent, and appointments are included under `screenshots/` and were visually inspected during implementation.

## Core coverage

Booking tests exercise valid booking, past and closed-day rejection, working-hour boundaries, exact/partial overlap, buffer conflicts, valid buffered/zero-buffer boundaries, retained original buffers, idempotency, cancellation and slot release, customer/phone/service validation, invalid dates/times, DST gaps and repeated times, UTC day boundaries, alternative slot validity, advance/notice/cancellation limits, conversation relationships, and configuration validation.

Conversation tests exercise greetings, configurable services/business information, multi-message collection, retained fields, missing details, ambiguous dates/times, explicit confirmation, no booking from merely mentioning a time, unavailable slots and alternative selection, conflict at commit time, persistence failure reporting, unknown requests, ending, identified/confirmed cancellation, changed proposals, configured new services, and named-month requests with names supplied in the first message.

Persistence tests recreate the repository against the same storage, retain actual messages and booking relationships, deduplicate simultaneous requests, verify local reset without affecting unrelated keys, recover malformed storage, propagate failed writes, and persist configuration/cancellation.

Speech tests use an isolated browser API test double to verify that recognition does not start before a listening action, duplicated final events produce a single message, recognition stops before synthesis, cancellation/disposal works, permission/network failures are explained, and text fallback is available without recognition. They do not claim actual audio input or output was tested.

## PostgreSQL validation

The **unmodified complete migration** executed in PGlite PostgreSQL with `btree_gist`. A local test shim provided the Supabase `auth.users`, `auth.uid()`, `anon`, and `authenticated` roles. Executed checks included:

- Tenant creation and invalid configuration rejection.
- Atomic booking plus confirmation creation.
- Idempotent duplicate request handling.
- Overlap/buffer rejection and an allowed buffer boundary.
- Denied direct appointment updates for authenticated users.
- RLS hiding another tenant's records.
- Unauthorized cancellation RPC rejection.
- Cancellation releasing a slot while retaining historical confirmations.
- Actual message order, deduplication, preserved booking links, and booking outcome after transcript updates.

This verifies SQL execution and authorization behavior in local PostgreSQL. It **does not verify hosted Supabase, live Auth/PostgREST, provider configuration, or production multi-connection load**. No cloud credentials were available. Database concurrency protection consists of tenant row locks plus an exclusion constraint; the PGlite test instance itself serializes database queries.

## Browser journeys

The complete desktop/mobile journey used actual application controls and local writes: landing → Demo Mode → agent start → service inquiry → service/name/future date/time collection → review → confirmation → exact appointment → calendar → saved transcript/booking link → labelled SMS preview → dashboard totals → conflicting request and alternatives → cancellation → booking the released slot → refresh and persisted records. The test asserts there is no appointment before confirmation and no extra booking after the conflict.

Additional scenarios check invalid manual date handling, valid reviewed manual booking, phone-recipient preview, cancellation and status filtering, saved business/agent configuration, confirmed local reset, cross-tab Web Locks rejecting one of two concurrent conflicting repository requests, desktop/mobile screenshots and page widths.

Browser tests use new isolated contexts, so their customer records do not modify the user's persistent browser profile. The two-tab concurrency check invokes the actual local repository in both pages, without mocked booking responses.

## Failures found and resolved

- Sandboxed Vitest temp-file renames and Vite port binding were denied by this environment. Final tests/build/preview used approved execution outside that sandbox.
- A numbered alternative was initially treated as an ambiguous bare hour; option selection now clears that ambiguity and the regression test passes.
- A SQL test expected different rejection wording for a negative buffer; the assertion now matches the actual correctly rejected validation branch.
- Initial dependency advisories were removed with compatible patched Vite, Vitest, and React Router releases. Final audit is clean.

The Playwright runner emitted a host-environment `NO_COLOR`/`FORCE_COLOR` warning. It was not an application browser warning. Application browser error assertions and the production smoke check passed.

## Not independently verified

- Real microphone hardware, remote browser recognition availability/quality, audible synthesis, and physical iOS/Safari behavior.
- Clipboard access when the user's browser denies permissions. The copy action handles rejection and allows manual selection.
- Live Supabase connectivity/credentials, real Vapi or phone calls, real SMS delivery, and hosted deployment. These are not claimed to work. SMS is always explicitly simulated.
- Automatic restoration of an active dialogue after refresh; saved records persist, but a new conversation must be started.
- Cross-tab serialization on browsers without Web Locks; those browsers should use a single demo tab.
