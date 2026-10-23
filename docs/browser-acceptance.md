# Integrated browser acceptance — 2026-10-23

**PASS for the bounded local simulator/fixed-demo acceptance below.** Two defects found in the real browser were fixed by separate workers and independently retested. No unresolved blocker remains in the exercised flows. This is not live inference, real voice/Alexa/Echo, publication, or user product acceptance.

Reviewer dispatch: `ctx_8890b182acd3`. Product source remained read-only for this reviewer; the coordinator separately authorized the final status-document updates.

## Environment and method

- Ran actual `PORT=0 SANDBOX_PORT=0 BEDROCK_ENABLED=0 npm run demo`, including its build. Demo host/sandbox were `127.0.0.1:50648` / `127.0.0.1:50649`; restart used those same ports and a new automatically created demo DB.
- Started normal mode with `BEDROCK_ENABLED=0`, ports 51388/51389 and a fresh `/private/tmp/thought-map-acceptance.B2UwMV/thoughts.sqlite`. No user DB, AWS/profile, paid call, commit/push, publishing, or `docs/submission/**` changes.
- Orca embedded Chromium 150 reproduced the initial bootstrap defect and rendered the corrected final demo. Installed Playwright CLI with headed Chrome **154.0.8037.59** supplied precise frame inspection, keyboard input, media emulation, geometry, and delayed real HTTP responses. Orca's final ref-click reported success without dispatching the button action; invoking that observed button's DOM click opened the real demo. Definitive input/keyboard checks used Playwright.
- All App content came from actual MCP HTTP `resources/read`; no mocked AppBridge, standalone map, fabricated analysis, or weakened CSP. Race checks delayed delivery of `route.fetch()` responses without changing their bodies.
- Read README, UI integration/review, connected server/UI/demo/layout code, actual race fixes and existing HTTP integration tests. Did not repeat backend suites. The separate workers' test counts remain their evidence, not this reviewer's browser results.
- Final generated sizes: map **582,600**, simulator **457,944**, sandbox **1,643** bytes.

## Confirmed browser evidence

| Check | Observed result |
| --- | --- |
| Real lifecycle | `/ui-config` → MCP initialize/initialized → tools/list → resources/read of `ui://thought-map/map.html` → resources/list → separate sandbox GET → `ui/initialize`/initialized → actual `show_map` result → 16 rendered thoughts. Optional MCP GET 405 is tolerated. |
| Origin separation | Host origin 50648; outer sandbox and inner `about:blank` both have browser `window.origin` 50649. Normal mode similarly uses 51388/51389. No API origin inheritance by the App. |
| Four stages | Scatter, topics, roots and focus all render. The same 16 bubble DOM nodes survive all transitions; no extra tool call occurs while manually stepping. Seven topics, two roots and three ungrouped originals remain represented. |
| Root tool and originals | Keyboard root selection calls real `focus_root({version:16,root_id:1})`; full root sentence, reason, next action and eight originals appear. Root B returns five originals. Read thoughts contains all 16 strings exactly matching the received demo originals, including their original ordering. Full details scroll to the last item. |
| Keyboard after fix | Enter opens a focused root; Tab/Shift+Tab keep the inner Close control focused and host focus on the App frame. Escape and click-close restore the actual root or Read thoughts opener. Tab after closing advances normally. PageDown scrolls the full list (measured scrollTop 265, clientHeight 430, scrollHeight 695). |
| Response races | Delayed real root A success cannot replace Read thoughts (still 16 originals) or a completed root B selection (still B's title and five originals). Repeated the Read thoughts case against the final keyboard fix; it still passes. Error-response race permutations remain covered by the previously reviewed actual-source tests, not newly fabricated browser responses. |
| Replay | Full automatic replay from stage 0 to 3 generated **zero browser requests**, hence no tool/provider request. Reduced-motion replay also generated zero requests, stayed at stage 0 after 3.5 seconds, announced manual steps and had computed transition `0s`; manual Next still works. |
| Normal capture | Empty state opens through the real host. Submitted `  原文をそのまま残す。\n<script>window.acceptanceInjected=true</script>  ` with an actual newline; a read-only SQLite assertion confirmed exact leading/trailing spaces, newline, Japanese and markup. While its real response was held, typing `次の未保存の下書き / next unsaved draft` survived completion. Only the first original was in the DB; the new draft was not submitted. |
| Normal pending | Show map reports one saved thought and “Analysis is not available yet” with Bedrock disabled. No fabricated ready map or automatic retry appears. |
| Forbidden App calls | Sent capture and `show_map({retry:true})` through the actual inner-frame relay; both returned JSON-RPC `-32603`, “This App cannot call that operation”, with **zero backend HTTP requests**. |
| Spoof boundaries | Native messages from wrong window sources were rejected by host and sandbox. Synthetic `MessageEvent`s with the expected WindowProxy but wrong origin were also rejected; no HTTP call or theme change. Wrong-origin events are explicit handler tests, not a claim that a browser lets a remote page forge `event.origin`. |
| Network/CSP | All observed request hosts were the four loopback ports above. After the CSP fix, passive violation arrays in host/outer/inner frames were empty and page script exception list was empty through final checks. Console still records expected optional GET 405, missing favicon 404 and Chromium's sandbox-combination warning; this is not a claim of an entirely empty console. The separate-origin host boundary is retained. |
| Restart | Stopped only the reviewer's first demo process; its temporary DB disappeared. Restart created a different private DB. The entire actual `show_map` result, including structured content and layout, was identical before/after restart (15,726-character JSON comparison), and the map rendered again. |

## Visual and accessibility measurements

The default App's actual inner viewport and `.app` bounds were **768×480**; its dedicated map region was **480×252**. All four stages had zero pairwise bubble overlaps and zero document horizontal/vertical overflow. The fixed simulator was also inspected at a **1280×800 host viewport** in light and dark themes.

For the larger App test, resized only the existing host iframe/container CSS to **1280×800**, keeping the same real HTTP resource, separate-origin sandbox and AppBridge. The App scaled to exactly 1280×800, the map region to 800×420, with zero document overflow or bubble overlap. This is an explicit resize harness; the shipped simulator itself remains fixed at 768×480.

All measured App controls were at least **48×48 CSS pixels** at default size: stage controls 70×48, Replay/Close 48×48, root buttons 208×79.5. At the larger scale footer controls were at least 80px high. Details were 650×432 inside the 768×480 frame. No accidental visual overlap or inaccessible clipping was seen in the inspected screenshots. Bubble previews and the root-list sentence intentionally ellipsize to two lines; full originals/sentences remain available in scrollable details. The focus panel is independently scrollable to its connected-thoughts button.

Representative contrast ratios from actual computed theme colors:

| Pair | Light | Dark |
| --- | ---: | ---: |
| Main ink / surface | 11.96:1 | 11.88:1 |
| Muted text / background | 5.49:1 | 8.91:1 |
| Accent / soft background | 5.69:1 | 6.34:1 |

These are representative text-pair checks, not a complete WCAG audit. Synthetic provenance remains visible; no live model quality is implied. The coordinator additionally inspected selected light-stage, full-detail and dark-large screenshots and found them coherent/readable; user acceptance remains separate.

## Screenshots

All files are in [artifacts/browser-acceptance](../artifacts/browser-acceptance/). Screenshot filenames identify the measured CSS viewport. Playwright element captures round the fractional host-frame offset outward, so default App PNGs are 768×481 and larger App PNGs are 1280×801; the DOM viewport/App measurements above are exactly 768×480 and 1280×800. Whole-host screenshots are exactly 1280×800. The final Orca image is 2648×2046 device pixels for a 1324×1023 CSS viewport.

- Four default light stages: [0](../artifacts/browser-acceptance/stage0-light-768x480.png), [1](../artifacts/browser-acceptance/stage1-light-768x480.png), [2](../artifacts/browser-acceptance/stage2-light-768x480.png), [3](../artifacts/browser-acceptance/stage3-light-768x480.png).
- Default dark/reduced: [roots](../artifacts/browser-acceptance/stage2-dark-768x480.png), [focus](../artifacts/browser-acceptance/stage3-dark-768x480.png), [reduced-motion reset](../artifacts/browser-acceptance/stage0-dark-reduced-768x480.png).
- Larger real App: [dark focus 1280×800](../artifacts/browser-acceptance/stage3-dark-reduced-1280x800.png), [light topics 1280×800](../artifacts/browser-acceptance/stage1-light-reduced-1280x800.png).
- Host: [light 1280×800](../artifacts/browser-acceptance/demo-host-light-1280x800.png), [dark 1280×800](../artifacts/browser-acceptance/demo-host-dark-1280x800.png), [final Orca rendering](../artifacts/browser-acceptance/orca-final-demo.png).
- Details: [full root](../artifacts/browser-acceptance/root-detail-light-768x480.png), [last originals via scrolling](../artifacts/browser-acceptance/all-originals-scroll-light.png), [fixed keyboard focus](../artifacts/browser-acceptance/dialog-keyboard-fixed-768x480.png), [stale response keeps all thoughts](../artifacts/browser-acceptance/stale-root-keeps-all-thoughts.png).
- Normal mode: [empty](../artifacts/browser-acceptance/normal-empty-768x480.png), [new draft preserved](../artifacts/browser-acceptance/normal-new-draft-preserved.png), [pending](../artifacts/browser-acceptance/normal-pending-768x480.png).
- [Restarted demo](../artifacts/browser-acceptance/restarted-stage0-light-768x480.png).

## Defects discovered and resolved

1. **P1: host schema validator violated CSP and blocked startup.** Initial browser had successful initialize and tools/list HTTP responses, then disabled controls and “Local MCP connection unavailable”; Ajv reported generated-function compilation failure. Two `script-src`/`eval` violation events were recorded before resource loading. [Failure screenshot](../artifacts/browser-acceptance/initial-csp-blocker.png). Separate fix `ctx_63744e8904a5` selected the SDK's CfWorker validator with exact peer 4.1.1 and configured Zod jitless before SDK initialization. Strict CSP and validation remain. Independent browser retest passed the full lifecycle with zero violation events.
2. **P2: Tab escaped the iframe's native modal.** Root Enter opened correctly, but one Tab focused the host Show map button; Escape then did not close the still-open dialog. [Failure screenshot](../artifacts/browser-acceptance/dialog-tab-escapes-host.png). Separate fix `ctx_c9a8bc12172b` contains Tab/Shift+Tab and restores the actual opener. Real nested-frame retest passed both directions, Escape/click-close, ordinary closed-dialog navigation, scrolling and the stale-response regression.

## Limits and cleanup

Live Bedrock output/quality/cost, real speech capture, Alexa+/Echo hardware, other browser engines/devices, end-to-end latency/SLA, long arbitrary Japanese ready-map rendering, and user product acceptance remain **unverified**. Actual browser coverage is saved ready/empty/disabled-provider pending; live analyzing/provider-error/legacy-map permutations were not manufactured for this run. Existing tests/source were reviewed for those paths. This report authorizes no deployment, purchase, publication, video upload or submission.

Cleanup completed: closed only Playwright session `thought-map-acceptance` and Orca page `1449d59d-b033-4722-ae3b-ab4ce8ccbcc3`; stopped only this reviewer's demo/normal node processes (both exited 0). All four listener ports refused connections afterward, both demo databases were removed by normal shutdown, and this reviewer's normal-mode temporary DB and generated CLI diagnostic directory were removed. Screenshots and this report remain; other agents' resources were not stopped.
