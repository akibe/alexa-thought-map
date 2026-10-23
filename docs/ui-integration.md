# Thought Map UI: integration handoff

2026-10-23 JST. Implemented files are limited to `web/`, `src/layout.js`, `tests/layout.test.js`, and `scripts/build-ui.js`. No server routes or inference code were changed by the UI worker. This is **Task 6 implementation and Task 7 browser preparation**, not completed end-to-end acceptance.

## Build and exact routes

Dependencies installed by the backend owner: `@modelcontextprotocol/ext-apps` **1.7.5**, existing `@modelcontextprotocol/sdk` **1.29.0**, and Vite **8.3.5**. React is not used.

```sh
node scripts/build-ui.js
node --test tests/layout.test.js
```

The build writes self-contained `web/dist/map.html`, `web/dist/simulator.html`, and `web/dist/sandbox.html`. Each includes its own inline bundled script; map/simulator CSS is inline too. Build assertions reject external imports, dynamic imports, split output and unsafe style terminators. Generated files contain SDK code but no thought data or credentials. Add the build command to the server owner's chosen package scripts; rebuild after edits and include these outputs in runtime packaging. Generated output need not be committed.

| Server owner integration | Exact expectation |
| --- | --- |
| API/host origin | Loopback, e.g. `http://127.0.0.1:3000`; keep existing Host/Origin checks. |
| `GET /simulator` | Serve `web/dist/simulator.html` as `text/html; charset=utf-8`. |
| `GET /ui-config` | JSON `{ "sandboxOrigin": "http://127.0.0.1:3001", "demo": false }`; do not include environment variables or credentials. `demo` must be boolean. |
| Sandbox origin | A **different** loopback origin, no MCP/API routes, no repository-directory static serving. |
| `GET /sandbox.html` | Serve `web/dist/sandbox.html`, with the HTTP security headers below. The host adds `?hostOrigin=<encoded host origin>`; validate the query against the configured API/host origin server-side too. |
| `show_map` definition | `_meta.ui.resourceUri = "ui://thought-map/map.html"`, visibility `["model", "app"]`; use official `registerAppTool`. |
| UI resource | `registerAppResource` at `ui://thought-map/map.html`; `resources/read` returns one text content item with the same URI and MIME `text/html;profile=mcp-app`, whose text is the built map HTML. |
| Resource security metadata | `_meta.ui.csp` with empty `connectDomains`, `resourceDomains`, `frameDomains`; no permission grants. Resource content-item metadata takes precedence over listing metadata. |
| Ready result | Keep existing `structuredContent`. Attach top-level MCP result `_meta: { layout: createLayout(data.analysis) }` using `import { createLayout } from './layout.js'`. Do not attach layout inside the analysis object or text JSON only. Non-ready responses require no layout. |
| `focus_root` | App-visible tool; arguments `{version,root_id}` positive integers. Success `structuredContent: {version,root_id,root_sentence,reason,next_action,fragments}`. `next_action` is string or null; fragments retain full original text. Stale/invalid inputs return MCP `isError`, never newer-map data. |

Suggested **sandbox response** policy (replace the last origin with the exact configured host):

```text
Content-Security-Policy: default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors http://127.0.0.1:3000
Permissions-Policy: camera=(), microphone=(), geolocation=(), clipboard-write=()
X-Content-Type-Options: nosniff
Cache-Control: no-store
```

The outer sandbox creates an initial blank inner frame and writes the fetched HTML into it, following the official [reference pattern](https://github.com/modelcontextprotocol/ext-apps/blob/v1.7.5/examples/basic-host/src/sandbox.ts). Both sandbox frames have `allow-scripts allow-same-origin`; they are on the isolated sandbox origin, not the API origin. The outer frame accepts messages only from its expected parent origin/window; the inner relay accepts only the inner window and sandbox origin. The host adds a capture-phase origin guard around the SDK transport, pins outgoing postMessage origins, and checks every App tool call. **Verify inherited HTTP CSP, blank-frame creation/document writing and SDK execution under the restrictive policy in the integrated browser; do not solve failures by adding wildcard networking or unsafe-eval.**

The host page can use its own CSP: scripts/styles inline plus self, `connect-src 'self'`, `frame-src` only the configured sandbox origin, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`, `frame-ancestors 'none'`. Serve no other local files. Do not apply the sandbox's `connect-src 'none'` to the host: its MCP client needs same-origin HTTP.

## UI/data behavior

The App uses the agreed analysis fields: `version`, `source`, `fragments`, `topics:[{topic,fragment_ids}]`, roots with `root_id/sentence/fragment_ids`, `unmatched_fragment_ids`, and optional/null `focus` with `root_id/sentence/reason/next_action`. Missing topics disables Gather; missing focus explains the older/incomplete result; null focus explains that no saved action is available. No topics, roots, priorities or next actions are invented in browser code.

`createLayout(analysis)` returns `{version,width:480,height:252,nodes,overflow_ids}` for the map region within the 768×480 App. Each node has ID, topic/root indexes, focused flag, and four `{x,y,width:108,height:48}` positions. The helper rejects invalid versions, duplicate/unknown/missing memberships, duplicate roots and invalid focus. It does not mutate input or depend on text length/randomness. Every stage repositions the **same bubble DOM nodes** with transform/opacity. Sixteen bubbles fit without overlaps; larger maps show a counted overflow indicator and retain every original thought in the full list. This visible-cap limit is explicit, not silent data truncation.

The stage buttons and Next move through scatter → topics → roots → focus. Replay resets the current saved map and optionally plays the transitions; it calls no tools. Reduced motion disables transitions and automatic replay, retaining manual steps. Roots are keyboard-accessible buttons with minimum 48px targets, displaying 20px sentences; detail dialogs contain complete originals. Bubble text is visually clipped to two lines only. User and model text always enters through `textContent`; only the trusted MCP HTML resource is document-written inside the isolated sandbox.

The App scales its 768×480 logical canvas up to fit larger viewports, including 1280×800, and never scales controls below 1×. The fixed simulator uses 768×480; narrower screens scroll instead of shrinking tap targets. Host theme changes update the App. Stage 3 uses the entire dedicated device canvas but the host advertises **inline only**, since no browser fullscreen API is implemented.

`analyzing` starts serialized 1.5-second `show_map({})` checks, capped at 60; no automatic `retry:true`. Pending, failure, timeout and cancellation are explicit. Teardown or replacement invalidates outstanding results. Root taps call the real `focus_root`; stale errors ask to reopen the map. Older root-only results without `root_id` expose their saved originals locally, explicitly without a saved judgment.

The simulator uses SDK Streamable HTTP to `/mcp`, reads the actual resource via `resources/read`, connects `AppBridge`, waits for proxy-ready and Apps initialization, then sends tool-input and the actual tool-result. It has no fake-host/standalone fallback. Its App bridge permits only app-visible `show_map` and positive versioned `focus_root` calls, rejects capture and `retry:true`, and advertises no sampling or network permissions. Capture input is sent unchanged; only command matching uses a trimmed copy. Recognized show commands include `show my map`, `show me the map`, `organize thoughts`, `見せて`, and `整理して`.

## Fixed demo and remaining acceptance

Set `demo:true` only for the isolated server's fixed-demo mode. That server must load synthetic saved results from its separate fixture/database and guarantee no model provider is invoked. The browser hides capture in this mode and labels the simulator synthetic/fixed. App provenance labels `demo:*` as **SYNTHETIC · FIXED DEMO** and `test:*` as **SYNTHETIC · TEST DATA**; other sources are **SAVED ANALYSIS**, not a claim of live quality. The browser never changes a fixture's provenance. Typed input is a transcript simulation; no voice capture or real Alexa behavior is implemented.

Executed checks: **6 layout/host-contract tests passed**, including the backend's actual synthetic section 8 fixture, all node bounds/non-overlap, long unsafe-looking text, empty/singleton/five-root/overflow cases, invalid memberships, forbidden app calls, command matching and separate-origin validation. `node scripts/build-ui.js` successfully bundled all three HTML files; JS syntax checks passed. The worker did not run the full backend suite or any inference.

Next integration task must verify real HTTP initialization and GET-405 tolerance; UI resource MIME/metadata; both sandbox layers and restrictive CSP; origin/source spoof rejection; exact capture; loading/analyzing/ready/error/old-map states; root-call stale handling; theme and keyboard behavior; light/dark/reduced-motion screenshots at 768×480 and 1280×800; long English/Japanese text; no browser credentials or unexpected network requests; fixed replay after restart. Measure contrast and actual 48px target bounds in the browser. Build success is **not** visual acceptance or MCP Apps interoperability proof. No browser/visual, AWS, Echo or Alexa acceptance is claimed by this handoff.

## P2 UI race fixes — 2026-10-23

Both findings in `docs/ui-review.md` were reproduced before editing the UI source using the new `tests/ui-state.test.js` VM harness. It executes the actual module bodies with DOM/SDK boundary doubles and deferred tool responses: **4 passed, 7 failed** before the fix. Late root A success replaced Read thoughts' 16 originals with A's 8 originals, late success/error also overwrote root B, and capture success erased a newly typed unsaved draft.

`web/map.js` now assigns each dialog selection a generation and accepts root successes/errors only while that selection and the map generation remain current and the dialog remains open. Closing invalidates the selection; a queued close event from an earlier dialog does not invalidate a reopened selection. `web/simulator.js` clears capture input only when its current value still equals the exact submitted text, preserving a newer draft through both capture and unmount completion.

Verified after the fix:

- `node --test tests/ui-state.test.js tests/layout.test.js`: **17/17 passed**. Delayed root success/error cannot alter a closed dialog, Read thoughts, a pending replacement root, or a completed replacement root; the latest root still loads, including after a queued old close event. Current errors remain visible. Capture sends whitespace/markup unchanged, clears unchanged input, and preserves a new Japanese/English draft without submitting it.
- `npm run build`: all three self-contained HTML outputs rebuilt successfully.
- `node --test tests/ui-integration.test.js`: **4/4 passed**, including exact original-text persistence through real local MCP, rebuilt resource content, metadata, versioned root responses, HTTP boundaries and fixed-demo isolation. The sandbox initially denied loopback listeners (`EPERM`); the same tests passed with local-listener permission. No provider/AWS calls were made.

Browser E2E remains separately assigned: the VM tests do not prove native dialog focus/event behavior, iframe/postMessage execution, visual appearance or hardware acceptance. No backend/package/README/submission changes, commits or publishing were performed for these fixes.

## P1 host CSP fix — 2026-10-23

Independent browser acceptance found that the simulator could not connect: the SDK Client's default Ajv output-schema compiler used `Function` during `tools/list`, forbidden by the existing CSP. Zod also attempted a caught eval-capability probe while the SDK initialized its schemas. `tests/csp.test.js` reproduced **two code-generation attempts** and the unavailable-connection message by executing the actual bundled simulator with VM string/Wasm code generation disabled.

The host now supplies the SDK's `CfWorkerJsonSchemaValidator`, using its compatible optional peer pinned as runtime dependency **`@cfworker/json-schema` 4.1.1**. It calls `z.config({ jitless: true })` before importing the SDK Client, transport, and AppBridge: static imports initialized schemas before the configuration ran, leaving one forbidden probe, so these imports must occur after configuration. The build still inlines everything into one script; there are no runtime module downloads. Tool-output validation, strict CSP, origins, and permissions remain enforced. No custom validator or `unsafe-eval` allowance was added.

Verification:

- `npm run build && node --test tests/csp.test.js tests/ui-state.test.js tests/layout.test.js`: **18/18 passed**. The real bundled SDK completed initialization and `tools/list` with **zero Function attempts**, accepted valid capture output, and rejected `pending_count: -1` against the advertised output schema while preserving the unsaved original text. This invalid value passes the UI's separate safe-integer check, so the regression specifically proves SDK schema validation remains active. Only HTTP/DOM boundaries are simulated in this regression; the Client, transport, Zod, and validator are real bundled code.
- `BEDROCK_ENABLED=0 PORT=0 SANDBOX_PORT=0 npm test` with AWS credential/profile variables removed and AWS config files set to `/dev/null`: **50/50 passed**, including the existing UI-state, layout, and four local HTTP/MCP integration tests. Node **v26.0.0**, npm **11.3.0**. No AWS/model calls were made.
- Rebuilt HTML sizes: map **582,376**, simulator **457,944**, sandbox **1,643** bytes. The optional peer was absent from cache, so the authorized exact dependency was installed with `npm install --save-exact --prefer-offline --no-audit --no-fund @cfworker/json-schema@4.1.1`.

Browser retest was requested from independent dispatch `ctx_8890b182acd3` using its existing demo on ports 50648/50649; those processes were not modified or stopped. This worker claims the scoped code/test fix only, not browser/AppBridge, visual, hardware, or product acceptance. See the independently owned browser acceptance report for the actual browser verdict.

## P2 nested-frame dialog keyboard fix — 2026-10-23

Independent browser testing found that Tab escaped from an open native details dialog to the host's Show map button, leaving Escape unable to close the dialog. The inspected dialog has one interactive control, Close, plus scrollable original text. `web/map.js` now prevents Tab/Shift+Tab's default traversal only while that dialog is open and returns focus to Close. Escape/cancel and other keys, including text scrolling, retain their native behavior. Both close paths restore the actual invoking root, connected-thoughts button, or Read thoughts button. The existing queued-close guard and asynchronous detail-generation checks remain intact. If interactive controls are added to the dialog, the documented one-control containment must become a focusable-element cycle.

The actual-source VM harness in `tests/ui-state.test.js` now records focus and cancellable keyboard events, with native dialog Escape/cancel behavior modeled at the DOM boundary. Before the product fix, all **4 new keyboard cases failed** at Tab containment while the previous **11 cases passed**. After the fix, `npm run build && node --test tests/ui-state.test.js tests/layout.test.js tests/csp.test.js` passed **22/22**, including both Tab directions, Escape and click-close restoration to root/Read thoughts, no containment while closed, unchanged scrolling keys, all late-response regressions, and the CSP regression. The root cases also resolve asynchronous detail content before closing, checking that updates preserve the opener.

The build produced map **582,600 bytes**, simulator **457,944 bytes**, and sandbox **1,643 bytes**. Browser dispatch `ctx_8890b182acd3` received retest request `msg_a64fa71b976f`; the coordinator received built-status message `msg_5f5b6afd7b4c`. No browser acceptance is claimed here: the VM does not reproduce native nested-frame focus traversal, and the independent real-browser result remains separately owned. No backend/package/dependency, submission, AWS, commit, or publication work was performed for this fix; the full backend suite was not repeated.
