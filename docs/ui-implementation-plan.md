# MCP Apps UI and local simulator: implementation plan

Research date: 2026-10-23 JST. **Preparation only; Tasks 6–8 are not implemented or accepted.** The [canonical design](2026-10-22-alexa-thought-map.md), especially sections 1–8 and task ordering, remains authoritative. This document is the only repository file changed by this research; `docs/submission/` is outside scope.

## Decision and current evidence

Use vanilla browser JavaScript and CSS, the official `App` / `AppBridge` SDK, and a small local two-origin host. Keep the existing MCP server and inference path. A standalone HTML rendering of JSON does not demonstrate MCP Apps.

Source inspection confirms:

- `src/server.js` uses MCP SDK **1.29.0**, stateless Streamable HTTP, JSON responses, loopback binding, Host/Origin checks, and `capture_thought` / `show_map`. It has no UI resource, simulator route, or `focus_root` implementation.
- `show_map` returns `structuredContent` and text content; ready data includes a versioned fragment snapshot and roots. Focus/next action remain null; topic attributes and layout positions are absent. Preserve capture's minimal acknowledgement and existing schema validation.
- Inspector **2.12.0** brings Apps SDK **2.0.3**, MCP client/core **2.3.1**, and Vite **8.3.5** transitively into this installation. Availability in `node_modules` is not a direct application dependency or runtime integration.
- Current upstream Apps 2.x uses the split MCP 2.x packages. Do not import its server helpers into the existing 1.x server on an assumption of compatibility. The official [2.x package manifest](https://github.com/modelcontextprotocol/ext-apps/blob/main/package.json) and [cross-version tests](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/interop-v1.test.ts) distinguish wire interoperability from SDK object compatibility.

**Smallest compatible dependency proposal:** add exact runtime dependency `@modelcontextprotocol/ext-apps: 1.7.5`, retaining `@modelcontextprotocol/sdk: 1.29.0` and `zod: 4.6.5`; declare exact dev dependency `vite: 8.3.5` for browser bundling. Apps [v1.7.5 peer dependencies](https://github.com/modelcontextprotocol/ext-apps/blob/v1.7.5/package.json) explicitly accept SDK `^1.29.0` and Zod 4; React is optional. This is an intentional compatible release pin, **not a claim that 1.7.5 is latest**. Keep Inspector's independent 2.x dependency; verify the resulting lockfile at implementation time. Nothing was installed or changed here.

Bundle the host and App entries using [Vite library mode](https://vite.dev/guide/build.html#library-mode), then place the App's built JS and CSS into one HTML resource using a small Node build step. Fail the build if unresolved imports or external asset references remain. No React, graph engine, CDN, TypeScript toolchain, or single-file plugin is required. The build step must safely escape script-closing sequences in bundled code; user data never enters this HTML template. A bundler is an implementation choice to consume official SDK imports, not a protocol requirement.

## Source-linked protocol contracts

The [stable MCP Apps specification](https://github.com/modelcontextprotocol/ext-apps/blob/v1.7.5/specification/2026-01-26/apps.mdx) identifies extension `io.modelcontextprotocol/ui` and Apps protocol version `2026-01-26`. This is separate from the server's MCP version `2025-11-25`.

| Surface | Contract for this project |
| --- | --- |
| MCP initialize | Client advertises `capabilities.extensions["io.modelcontextprotocol/ui"].mimeTypes = ["text/html;profile=mcp-app"]`. |
| `tools/list`: `show_map` | `_meta.ui.resourceUri = "ui://thought-map/map.html"`; visibility `["model", "app"]`. |
| `tools/list`: `focus_root` | Future app-only tool: `_meta.ui.visibility = ["app"]`; server validates version and root identity. |
| `resources/list` / `resources/read` | Same `ui://` URI; MIME `text/html;profile=mcp-app`; read returns valid HTML in `contents[].text`. |
| App startup | `ui/initialize` request, response, then `ui/notifications/initialized`; only then host sends tool input followed by tool result. |
| App interaction | `tools/call` through host; app-only visibility is enforced by host, not merely displayed as metadata. |

Use [v1.7.5 server helpers](https://github.com/modelcontextprotocol/ext-apps/blob/v1.7.5/src/server/index.ts): `registerAppTool` normalizes both nested `_meta.ui.resourceUri` and legacy `_meta["ui/resourceUri"]`; `registerAppResource` defaults the correct MIME. Put `_meta.ui.csp` on resource metadata and its returned content item, with empty `connectDomains`, `resourceDomains`, and `frameDomains`. Content-item metadata takes precedence over listing metadata. Do not place the template URI only on the tool result. Keep structured results useful for clients without Apps support.

The existing stateless server creates an MCP server per POST: do not assume client capabilities survive into later `tools/list` requests. Keep static UI metadata plus ordinary data responses for this local implementation; the simulator advertises Apps support during initialization. Capability-dependent tool registration would require explicitly preserving session state and is not needed here.

## Minimal host and actual HTTP path

Proposed ports are examples: host/API `http://127.0.0.1:3000`, sandbox `http://127.0.0.1:3001`. Bind both to loopback and handle occupied ports explicitly.

```text
Simulator page (3000) ── StreamableHTTPClientTransport ── /mcp (3000)
       │                                                   │
       │ AppBridge + postMessage                           └─ Bedrock/SQLite (server only)
       ▼
Sandbox proxy (3001) ── postMessage ── inner App document
```

1. Serve simulator HTML/assets from the existing server origin. Its bundled SDK `Client` connects to `new URL('/mcp', location.origin)` with `StreamableHTTPClientTransport`, then lists tools/resources. This avoids adding CORS. A file URL or another development-server port is not interchangeable with this setup.
2. Ordinary submitted transcript → `client.callTool({name:'capture_thought', arguments:{text: original}})`. Recognized “show/organize” command → `show_map`. Match commands using a separate normalized copy; never trim or rewrite captured text. Acknowledgement stays minimal.
3. Read `show_map` tool metadata using `getToolUiResourceUri`; fetch via `client.readResource({uri})`. **Do not navigate/fetch `ui://` as an HTTP URL.** Validate URI, MIME and one HTML content item before rendering.
4. Load the separate-origin sandbox proxy and wait for `sandbox-proxy-ready`. Attach `AppBridge` / `PostMessageTransport` to that specific iframe; send the fetched HTML with `sendSandboxResourceReady`. Register all initialization/result handlers before connecting. On Apps initialization, send tool arguments and the actual MCP result. These steps follow the official [v1.7.5 basic host](https://github.com/modelcontextprotocol/ext-apps/blob/v1.7.5/examples/basic-host/src/implementation.ts).
5. Prefer `new AppBridge(null, hostInfo, {serverTools:{}}, {hostContext})` with an explicit `oncalltool` handler. Allow only `show_map` (ordinary polling, never automatic `retry:true`) and the future `focus_root`; validate app visibility and arguments, then call the existing client. This avoids the reference bridge's broad automatic forwarding. Host UI alone handles capture. Do not advertise sampling, arbitrary resource reads, external links, microphone, or other unimplemented capabilities. See [bridge implementation](https://github.com/modelcontextprotocol/ext-apps/blob/v1.7.5/src/app-bridge.ts).
6. App registers result handlers before `app.connect()`. On `analyzing`, bounded serialized `app.callServerTool({name:'show_map',arguments:{}})` polling updates that same view from the returned result. Stop on ready, error, teardown, timeout, or superseding version; never issue concurrent polls or silently retry inference. Do not use repeated initialization notifications for refresh. A pending/disabled/failed response gets an honest status, not invented roots.

The SDK owns HTTP initialization, headers, JSON/SSE response parsing and error handling. The [Streamable HTTP contract](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) requires Accept support for JSON and event streams, negotiated protocol headers on subsequent requests, and rejection of invalid Origins. Existing POST-only responses and GET 405 are compatible with declining the optional standalone SSE stream; test that the chosen client tolerates this. Preserve Host/Origin validation; no wildcard CORS or new public listener.

AWS credentials stay in the Node provider's existing credential resolution. Neither iframe nor simulator imports AWS SDK, receives credentials, or calls Bedrock directly. Do not expose repository directories, environment/config files, raw errors, or logs containing private thought text. A future authenticated remote MCP server would need a server-side credential boundary; this localhost plan does not establish that deployment.

## Sandbox and display contracts

The [official sandbox reference](https://github.com/modelcontextprotocol/ext-apps/blob/v1.7.5/examples/basic-host/src/sandbox.ts) uses a separate-origin outer frame and inner App frame, validates parent origin/source, and relays JSON-RPC. For this single local App, use fixed expected origins and window identities in both directions, permit scripts in the inner frame, and grant no microphone/camera/navigation permissions. Apply restrictive **HTTP CSP headers**, including `connect-src 'none'`, `object-src 'none'`, no external resources and no nested App frames. Outer proxy needs the spec's `allow-scripts allow-same-origin`; App content must never run at the simulator/API origin. Verify CSP inheritance and inner document loading in a real browser.

Do not copy the example [development server's CSP](https://github.com/modelcontextprotocol/ext-apps/blob/v1.7.5/examples/basic-host/serve.ts) wholesale: it permits eval, blob workers and same-origin network traffic for its multi-example gallery. Our bundle needs no such features. Preserve MIT notices for any adapted reference source. A single same-origin iframe without this host lifecycle is only a standalone preview.

Product-specific plan, derived from canonical section 6:

- One **768×480** logical stage. Test at 768×480 and 1280×800 (5/3 scale; canonical 1.667 rounded). Do not shrink controls below 48×48 actual CSS pixels. Simulator can dedicate its device canvas to stage 3; advertise fullscreen only when its host handler actually expands that canvas and reports the changed context.
- Server creates deterministic positions for scatter → topic groups → roots → focused root, keyed by snapshot version and fragment ID. Use a simple fixed grid/slots with bounded card rectangles; no client force simulation, randomness, or inference. Future layout output can be additive result `_meta` while root sentence/next action stay in structured data for audio-only consumers. Validate finite coordinates, viewport bounds, membership and stable IDs server-side.
- Animate only transforms/opacity on the same DOM nodes so cross-topic movement is visible. Add Next/Replay controls and a visible stage label; replay reuses the same result and never calls the model. Keep unmatched fragments accessible through every stage. Stable root IDs must be scoped to the analysis version; reject stale focus requests server-side.
- Bubble text 12–14px, root sentences 20–24px; minimum 48px buttons and root targets, keyboard operation, visible focus, semantic buttons and accessible names. Long Japanese/English text wraps; show full original text in the root-detail list. Visual shortening must not modify stored data or remove access to the original.
- Light/dark CSS variables follow host context and context-change notifications. Verify at least 4.5:1 for small text in both themes; fading other roots must preserve readable interactive labels. No flashing. `prefers-reduced-motion: reduce` removes positional transitions and automatic playback while retaining explicit stage-by-stage controls.
- Create user/model text with `textContent` and DOM APIs, including fragment text, roots, errors and next action. No interpolated `innerHTML`, raw SVG text, arbitrary styles/URLs or data inside executable scripts. Treat tool results as untrusted; reject malformed versions/positions and display a fixed error message.

## Ordering, demo data and verification

Task 3's real inference acceptance is still marked unverified in current docs. Task 4 must supply focus/reason/next action before stage 3 is real. If Task 5 is deferred, stage 1 still requires explicitly sourced topic groups; the UI must not invent them or silently present fixture topics as live inference. These are implementation gates, not reasons to stop this preparatory research.

After those gates: **Task 6** adds the App/resource/layout and validates it in an actual host; **Task 7** adds the simulator path above; **Task 8** adds isolated deterministic replay of saved inputs, analysis, layout and provenance. Use a separate demo database/artifact, label fixed results as replay, never overwrite the user's live store, and never silently fall back to fixtures on a live failure. Handwritten section 8 results remain synthetic, not evidence of Bedrock quality.

For minimum simulator scope, accept entered transcripts and clearly label the experience as simulation. This does not verify speech recognition or real Alexa behavior. Any microphone/voice adapter requires a separate supported-browser and consent/data-flow check; do not claim the voice portion complete from typed-input success.

| Gate | Required evidence during implementation |
| --- | --- |
| MCP contract | Existing tests plus real Streamable HTTP client tests: Apps capability, tool metadata, resource MIME/HTML/CSP, ordinary non-App results, invalid Origin, denied app tools, stale focus IDs. Temporary DB and Bedrock disabled. |
| Bridge lifecycle | Browser trace proves `resources/read` loaded the rendered HTML, sandbox-ready, Apps initialize/initialized, input/result delivery, and root click → MCP `tools/call` → returned detail. Cover slow init, failed resource, teardown and out-of-order results. |
| Layout/replay | Assert deterministic coordinates, bounds, complete membership and version association; identical frozen inputs/results reproduce all stages without model calls. Include empty, one fragment, 16 examples, five roots, unmatched items and oversized text. Define overflow presentation without discarding stored text. |
| Security | Script-like fragment/root strings render literally; forged postMessages fail source/origin checks; App cannot read parent DOM, fetch API/external URLs, or call capture/retry; bundle/network contain no credentials. Inspect CSP violations and ensure valid loading still works. |
| Visual | Screenshots and manual review for all stages/statuses at both sizes, both themes and reduced motion; measure hitboxes and contrast, check long Japanese/English text, keyboard focus, root detail, stale/pending/error states and replay. Record frame behavior; no hardware performance claim from desktop screenshots. |
| End to end | Capture retains original input; show command displays real MCP App; focus works; fixed replay repeats after restart. Distinguish local protocol pass, visual pass, inference quality, voice, and Echo/Alexa acceptance. |

If the host cannot be completed, label a direct page **“Standalone UI preview — MCP Apps host bridge not implemented”**. Even a page that calls real MCP tools is not proof of the App protocol without resource discovery and the Apps lifecycle. Do not use fallback to mark Tasks 6–7 accepted.

No source/package edits, installs, app execution, browser verification, paid calls, publication or commits were performed. The proposed SDK pin is supported by published peer contracts; installation, end-to-end interoperability, visual acceptance and physical-device behavior remain unverified.
