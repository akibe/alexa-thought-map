# Independent UI review — 2026-10-23

What this change does: It displays saved thoughts through an MCP Apps view and a local simulator, with topic/root/focus stages and saved root details. The simulator reads the real UI resource and uses AppBridge; replay does not request inference.

Reviewed `web/**` source, `src/layout.js`, `scripts/build-ui.js`, `tests/layout.test.js`, and `docs/ui-integration.md`, plus the connected analysis/root response code and installed SDK implementation. Assumed one local user with delayed/asynchronous tool responses. Server integration was still owned by another worker: this review does not treat its unfinished work as a defect.

## Must fix

1. **P2 — An old root response replaces a newer dialog** (`web/map.js:56-66`, `web/map.js:162-163`).
   - **What this is:** `rootDetails()` checks the map generation after `focus_root` returns, but opening or closing a dialog does not change that generation.
   - **Problem:** Open a root, close it before its response arrives, then open Read thoughts (or another root). The old response replaces the current dialog. A VM harness executing the actual module reproduced Read thoughts changing from all 16 originals to the previous root's 8 originals.
   - **Fix:** Give each detail request/dialog selection a token; invalidate it on every dialog replacement and close, and accept success/error only for the current token. Add one delayed-response regression test covering close → Read thoughts → old response.
   - **If we skip it:** Users see the wrong selection's title, reasoning, action and originals. Map-version validation does not prevent this same-version race.

2. **P2 — Saving one thought deletes the next unsaved draft** (`web/simulator.js:19`, `web/simulator.js:80-88`).
   - **What this is:** The textarea stays editable while capture is pending; success always clears its current value.
   - **Problem:** Submit a thought, then type another thought before the response arrives. The first request saves its original text correctly, but success erases the new draft without saving it. A VM harness executing the actual module reproduced this with a deferred `capture_thought` response.
   - **Fix:** Clear the textarea only if its current value still equals the submitted text, or disable editing for the pending capture. Add one delayed-capture regression test asserting the newer draft remains.
   - **If we skip it:** Unsaved words are lost during ordinary typing on a slow connection. Already saved database text is unaffected.

## Verified evidence

- `node --test tests/layout.test.js`: **6/6 passed**. Bounds/non-overlap, membership rejection, overflow, fixture compatibility, command handling and the app tool allowlist passed. `node scripts/build-ui.js`: all three self-contained HTML bundles built successfully. These checks do not exercise DOM races; the two findings came from separate inline VM harnesses, with no test/source files changed.
- Installed `@modelcontextprotocol/ext-apps` **1.7.5**: actual `App` and `AppBridge` instances completed initialize/initialized, tool-input/result (including `_meta.layout`), and `callServerTool` through in-memory transports. Source confirms the simulator waits for sandbox-ready and Apps initialization before tool delivery (`web/simulator.js:49-67`). This is protocol/API evidence, not HTTP/postMessage interoperability acceptance.
- Origin/source checks: host capture-phase guard plus SDK source filtering (`web/simulator.js:42-58`); sandbox parent and child source/origin comparisons and exact outgoing target origins (`web/sandbox.js:15-26`). A VM event harness rejected wrong-origin and wrong-source resource messages and checked both relay targets. The inner App uses the SDK's default transport, which checks its parent source and sends to `"*"`; the outer relay is the origin-enforcement boundary. No browser spoof/navigation acceptance is claimed.
- `validateAppCall` permits only app-visible `show_map` without `retry:true` and positive versioned `focus_root`; capture and extra arguments are rejected. Polling is serialized, capped at 60 and generation-guarded; replay calls no tools. A normal `show_map` can start an initial analysis under backend policy; this is not a blanket claim that all map calls are free.
- Original thought input is sent unchanged. Text rendering uses `textContent`, full detail originals use `white-space: pre-wrap`, and only the trusted UI HTML resource is document-written. The capture harness confirmed leading/trailing whitespace is sent exactly; finding 2 concerns the later draft.
- Root detail responses check version/root ID and required fields before display. Older roots without IDs show their saved originals locally. The connected enrichment/response shape supplies root-specific reason/action; finding 1 remains despite that correct response contract.
- Layout source keeps 48px minimum button targets, a 768×480 logical canvas, bounded bubbles, scrollable insight/detail content, native dialog controls and visible focus outlines. Reduced-motion CSS disables transitions/animation, replay remains manual, and a preference change cancels its timer. These are source checks, not measured accessibility or visual acceptance.

## Browser-only acceptance still open

After integration, verify real Streamable HTTP initialization/GET-405 tolerance, both iframe layers under the restrictive HTTP CSP, inherited CSP on the blank document, module execution without unsafe-eval, and real message spoof rejection. Measure keyboard order/focus restoration, tap bounds, contrast, overflow and long English/Japanese content at 768×480 and 1280×800 in light/dark/reduced-motion modes. Exercise delayed detail/capture responses, analyzing/error/cancel/old-map states, teardown/replacement, network requests and fixed-demo restart/replay.

Verdict: fix 1 and 2 first, then perform integrated browser acceptance. No verified P1 finding.

Not checked: browser E2E, full backend suite, AWS/profile/provider calls, Echo/Alexa hardware or deployment. No source fixes, commits/pushes or `docs/submission/**` edits; the review file and regenerated build outputs are the only writes from this review.
