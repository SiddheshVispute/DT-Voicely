# Verified results — redesign and voice repair

Verification date: **19 October 2026, Asia/Kolkata**. Windows, Node 24.20.0, npm 11.19.0, installed Google Chrome. The revised app uses **localhost:5188** with a strict port.

## Passed checks

- **Core regression:** 58 tests passed across seven suites: booking, conversation, spoken-language parsing, persistence, browser speech, local audio resampling, and PostgreSQL migration/security. No core test failures remain.
- **Desktop/mobile journeys:** 20 browser workflow tests passed, covering the complete booking demonstration, manual booking/review, cancellation/slot release, browser refresh persistence, configuration/reset, two-tab conflict protection, immediate typing and composer focus, working prompt buttons, stalled-recognizer handling, duplicate recognition events, and automatic listening after assistant replies. The two passed accessibility suites bring the final browser run to **22 passed, 0 failed** (approximately 1.2 minutes).
- **Accessibility:** two additional desktop/mobile suites passed using axe-core WCAG A/AA rules. They scan all six pages, active conversation messages, expanded receptionist settings, appointment details/SMS preview, and the calendar. Tested states have no reported rule violations. Keyboard-scroll focus, readable contrast, accessible dialog names, and visible-label matching were repaired. Automated checks do not replace a complete assistive-technology audit.
- **Real speech-model transcription:** the production WebAssembly worker transcribed a generated English WAV using the real quantized Whisper Tiny model. The first uncached model load took about **121 seconds**; inference took about **2.2 seconds** on this machine.
- **Real microphone capture path:** the revised production UI acquired Chrome's synthetic microphone, recorded with MediaRecorder, decoded/resampled the recording, ran actual local transcription, proposed an appointment, and saved it only after clicking confirmation. Browser runtime errors: **0**.
- **Delivered voice test:** `npm run test:voice` also passed against the development app, using the real capture, inference, dialogue, and persistence implementations. It uses a dedicated browser profile and generated audio, not the user's microphone or profile. Microphone audio, transcription, and booking success are not mocked.
- **In-app browser:** a service inquiry and `Book a consultation tomorrow at 4 PM. My name is Demo Visitor.` produced a review, an explicitly confirmed persisted booking, a saved transcript, and a visible **Simulated — Not Sent** SMS preview. This used the actual app beside the chat.
- **Production build:** passed with Vite 7.3.7. The speech model runs in a separate worker; its WASM runtime is emitted as a static asset. Model weights are downloaded/cached on first voice use rather than committed as credentials or paid API dependencies.
- **Dependency audit:** final installed dependencies reported **0 known vulnerabilities**. This is a point-in-time advisory check, not a guarantee against unknown vulnerabilities.
- **Screenshots:** actual desktop/mobile landing, overview, agent and appointment captures, plus a recorded-speech booking screenshot, are included under `screenshots/`.

## Actual speech result

The source fixture is explicitly synthetic and contains this sentence. The real transcription returned:

> I would like to book a consultation tomorrow at 4pm. My name is Alex Morgan.

The delivered test verified **no premature booking**, then confirmed and persisted:

- Customer: Alex Morgan
- Service: Consultation
- Business time: 20 October 2026, 16:00, Asia/Kolkata
- Stored instant: `2026-10-20T10:30:00Z`
- Verification reference: `VC-986E82DF`

Test references and dates change on later runs. `tests/fixtures/README.md` documents the generated audio. The repeatable script writes detailed results to the ignored `test-results/voice-verification.json`.

## Database validation

The complete SQL migration executed in PGlite PostgreSQL with `btree_gist` and a local Supabase Auth shim. Tests verify tenant creation/config validation, atomic booking/confirmation writes, idempotency, overlap/buffers, cancellation and slot release, preserved transcripts/relationships, denied direct authenticated appointment writes, RLS hiding another tenant's records, and unauthorized RPC rejection.

This validates local SQL execution and authorization behavior. Hosted Supabase Auth/PostgREST, actual credentials, and production multi-connection load remain unverified. The database design uses business-row locks plus an exclusion constraint; PGlite itself serializes its test queries.

## Defects found and fixed

1. Another local app also bound port 5173, and the in-app browser showed that app at the previous link. Voicely now uses strict port 5188.
2. Essential typography was too small and low contrast. The redesign increases the layout scale and message/input text to 16px; automated contrast checks now cover the primary and expanded states.
3. The old recognizer reported “Listening” before a real start event and could stall indefinitely. Native recognition now has separate Connecting/Listening states, timeouts, and actionable recovery.
4. Voice startup previously required an unobvious second microphone action, and replies were silent by default. Voice mode now starts an explicit speak/listen loop, with immediate text input, visible microphone controls, replay and mute.
5. An AudioWorklet capture attempt stalled after acquiring the microphone during the real audio test. That path was replaced with verified MediaRecorder capture; the audio context is unlocked during the user's click.
6. Creating a persistent test profile inside the Vite root initially exposed a Windows file-watcher lock error. The profile, screenshots and test outputs are now explicitly excluded from the watcher, and the delivered voice test passes without stopping the site.
7. Spoken clock words, natural confirmations, sentence-ended names, and price questions needed better parsing. Added regression tests pass.
8. Dialog names, transcript keyboard focus, visible-label matching, and SMS/calendar contrast defects found by axe-core were repaired.

The Node/Playwright runner may print the host's `NO_COLOR`/`FORCE_COLOR` environment warning. It is not an application browser warning.

## Verification boundaries

Physical microphone hardware, different speakers/accents/noise conditions, audible output from the user's speakers, and physical iOS/Safari have not been independently tested. Synthetic microphone tests verify the actual capture/transcription/booking path, not those hardware conditions. First-use downloads require internet access; typed booking remains available while models load or if audio is unavailable.

Supabase live connectivity, Vapi/PSTN calls, SMS delivery, and hosted deployment are not claimed. SMS remains explicitly simulated. Saved records survive refresh, but an active in-memory dialogue starts fresh. Browsers without Web Locks should use a single demo tab.
