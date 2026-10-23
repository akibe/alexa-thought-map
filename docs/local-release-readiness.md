# Local release readiness — source-only copy

Verified 2026-10-23 JST, dispatch `ctx_6e136f1c5a39`. **Fresh installation, 49 local tests, demo startup/rebuild, MCP tools/resource, and demo cleanup passed. This is not submission or product acceptance.** Follow-up `ctx_63744e8904a5` fixed the host CSP bootstrap and passed 50 tests. Final check `ctx_1b08492ef9d7` also passed cache-only installation and build with the revised dependency graph. Independent [bounded local browser acceptance](browser-acceptance.md) subsequently passed, including both the CSP bootstrap and keyboard-modal fixes; live quality, hardware and user product gates remain open. See the evidence and remaining gates below.

## Scope and reproducibility

The working tree is uncommitted. A disposable directory, `/tmp/alexa-local-release-1ags2p9u`, contained a `project/` copy of exactly 36 regular files from this allowlist:

- `package.json`, `package-lock.json`, `README.md`, `.gitignore`.
- `src/`, `scripts/`, `skills/`, `web/` source, `demo/`, and `tests/` including fixtures.

The copy excluded `node_modules`, generated `web/dist`, `.git`, data/databases, credentials, docs, artifacts, and unrelated user files. Symlinks were rejected. No dependency symlink pointed back to the original workspace. SHA-256 comparison found no change to those 36 original files between copying and the final verification checkpoint. The sorted filename/hash manifest digest was `d2080e13ffee7d504ec375d599e7d49ca411a9c77b95071dc54abd0130fd265f`.

Runtime: **Node v26.0.0**, **npm 11.3.0**, local macOS. This verifies a clean source copy on this machine, not a committed checkout, another OS, or a public download.

The successful installation command, from the disposable `project/`, was:

```sh
env -u AWS_PROFILE -u AWS_DEFAULT_PROFILE -u AWS_ACCESS_KEY_ID -u AWS_SECRET_ACCESS_KEY -u AWS_SESSION_TOKEN -u NODE_PATH -u NODE_OPTIONS BEDROCK_ENABLED=0 AWS_EC2_METADATA_DISABLED=true AWS_CONFIG_FILE=/dev/null AWS_SHARED_CREDENTIALS_FILE=/dev/null npm ci --offline --cache /Users/akibe/.npm --logs-dir /tmp/alexa-local-release-1ags2p9u/npm-logs --no-audit --no-fund
```

Result: **293 packages installed**, exit 0, using only the available npm cache. No network dependency download, audit request, new dependency, AWS/profile command, or model call was needed. The ordinary README command remains `npm ci`; `--offline` constrained this verification to cache use.

The successful test command was:

```sh
env -u AWS_PROFILE -u AWS_DEFAULT_PROFILE -u AWS_ACCESS_KEY_ID -u AWS_SECRET_ACCESS_KEY -u AWS_SESSION_TOKEN -u NODE_PATH -u NODE_OPTIONS BEDROCK_ENABLED=0 AWS_EC2_METADATA_DISABLED=true AWS_CONFIG_FILE=/dev/null AWS_SHARED_CREDENTIALS_FILE=/dev/null TMPDIR=/tmp/alexa-local-release-1ags2p9u/tmp PORT=0 SANDBOX_PORT=0 npm test
```

Output was redirected to scratch `test.log`. `pretest` ran the documented build automatically. **49 tests passed, 0 failed, 0 skipped, 0 cancelled**; reported test duration was 946.362417 ms. This includes real local HTTP/MCP, persistence/restart, Skill loading, validation, demo isolation, and UI state tests. Inference tests use injected fake clients. The demo-isolation test intentionally sets the demo child's Bedrock flag to 1 and asserts its provider stays null; it does not invoke AWS.

## Demo and package evidence

After the test run, the copy's `web/dist/` was removed again. A disposable assert-based Node probe spawned **`npm run demo`**, inheriting the same sanitized environment, `TMPDIR`, `PORT=0`, `SANDBOX_PORT=0`, and `BEDROCK_ENABLED=0` shown above. The equivalent standalone README invocation in that environment is:

```sh
PORT=0 SANDBOX_PORT=0 BEDROCK_ENABLED=0 npm run demo
```

Both the test build and demo build produced self-contained HTML solely from the copy and its freshly installed dependencies: `map.html` 582,376 bytes, `simulator.html` 421,626 bytes, `sandbox.html` 1,643 bytes. Demo startup printed host port **51403** and sandbox port **51404**. They were selected automatically and are not persistent endpoints.

The probe verified:

- HTTP 200 for `/simulator` and the valid sandbox URL; `/ui-config` reported the separate sandbox origin and `demo: true`.
- Real Streamable HTTP `tools/list` exposed `capture_thought`, `show_map`, and `focus_root`. `show_map` exactly matched the English saved fixture; `focus_root` returned the selected root. A newly captured arbitrary thought changed the response to `pending`, without a fixture answer for new input.
- `resources/list` and `resources/read` returned `ui://thought-map/map.html`, MIME `text/html;profile=mcp-app`, byte-for-byte matching the newly built HTML.
- Sending SIGINT to only the probe's own npm/demo process group exited **0**. Its `thought-map-demo-aqBrCr/thoughts.sqlite` and containing directory disappeared, and connections to both listeners failed afterward.

An additional packaging dry run succeeded:

```sh
npm pack --dry-run --json --offline --cache /tmp/alexa-local-release-1ags2p9u/pack-cache --logs-dir /tmp/alexa-local-release-1ags2p9u/npm-logs
```

Its 34-file inventory included `skills/infer-thought-roots/SKILL.md`, `demo/section8-map.en.json`, the build script, web source, server, and README. Generated `web/dist` was excluded and rebuilds successfully. npm omits `package-lock.json` and `.gitignore` from its tarball; **the verified GitHub/source-copy deliverable includes both**, so the npm tarball is not the reproducible-install deliverable. `package.json` remains `private: true`; no npm publication was attempted. The first dry run using the default npm cache hit sandbox EPERM; selecting a disposable cache resolved it without changing ownership or permissions on the user's cache.

Before dependency installation, the 36 candidate source files had **0 suspicious credential/database filenames**, **0 AWS access-key patterns**, **0 private-key markers**, **0 GitHub-token patterns**, and **0 long AWS secret/session-token assignment patterns**. Only counts were output; no secret values were printed. This bounded filename/pattern scan is not an exhaustive secret audit or Git-history scan.

## Current acceptance gates

Read-only basis: [submission readiness](submission-readiness.md) and [submission materials status](submission/README.md). Their earlier implementation inventories are historical; this report updates only local reproducibility evidence and does not edit those records or freshly validate official event rules.

1. **Bounded local browser gate — passed:** independent dispatch `ctx_8890b182acd3` verified the actual HTTP resource/AppBridge/sandbox lifecycle, four stages, focus/originals, both sizes/themes, reduced motion, keyboard controls, capture/draft and stale-dialog races, forbidden calls/spoof boundaries and identical demo restart. Both discovered browser blockers were fixed and retested. See [browser acceptance](browser-acceptance.md) for screenshots and explicit unverified paths; the installation worker's earlier Node evidence alone did not establish this outcome.
2. **Live Bedrock and judge access:** the prepared, expressly authorized profile and scoped model/data/budget approval remain absent from this verification. Real root inference, attributes, priority/focus quality, actual usage feedback, and an arrangement for judges to exercise claimed analysis without personal credentials remain unproven. The English fixture is `demo:section8-english-handwritten`, with synthetic provenance and no model usage; it proves the saved interface contract only.
3. **User product review:** the user must review the actual experience and whether the English explanation preserves the intended listening-then-map concept. Test success and handwritten grouping/next actions are not acceptance of inference quality or product intent. Final product-feedback claims and personal reuse intentions also need confirmation.
4. **Repository access, rights, and publication:** final GitHub URL/visibility and publication are not established. The cited submission documents record no project license decision/file: public sharing requires the appropriate license, or the private route requires reviewer access. Final source/assets/instructions, eligibility, ownership, permissions, English submission materials, and required feedback must be reconciled before publication. No commit, push, invitation, licensing choice, or publication was performed.
5. **Real video and final submission:** the existing script/storyboard is not a public working-demo video. Capture the corrected working application, clearly label simulation/fixed results, finish English narration/subtitles and the under-three-minute video, obtain publication approval, and verify the public URL. Final applicant/form/track information, deliverable links and required feedback, deadline/access checks, and explicit final submission approval remain outstanding. Hosting is not added as a blocker; the existing research records a local-public-repository route.

No browser/device/Echo/Alexa, live AWS, external judge-machine, public-link, legal/eligibility, video, or final-submission acceptance was performed here. The independent browser task retained ownership of its report, artifacts, ports, and processes. Only this report was added to the workspace. The probe stopped its own processes, and the uniquely created scratch tree was removed after verification.

## Follow-up: scoped CSP correction

Dispatch `ctx_63744e8904a5`, 2026-10-23 JST: `web/simulator.js` now uses SDK `CfWorkerJsonSchemaValidator` and sets Zod `jitless` before SDK module initialization. The compatible optional peer `@cfworker/json-schema` **4.1.1** was added exactly to `package.json`/lock; an offline install found it absent from cache, and the authorized registry installation added one package. No CSP weakening, custom partial validator, backend/Skill/demo/submission changes, or live inference was needed.

The new `tests/csp.test.js` executes the real built simulator bundle with string/Wasm code generation disabled and counts even caught Function probes. Before the fix it observed **two attempts** and connection failure; configuring Zod only after static SDK imports still left **one attempt**. The final initialization order and validator produce **zero attempts**, successfully initialize/list tools, accept valid output, and reject schema-invalid `pending_count: -1` while retaining the original input. DOM and HTTP responses are test boundaries, so this is not a real-browser result. Existing UI-state boundary doubles were updated only for the new imports/configuration.

`npm run build && node --test tests/csp.test.js tests/ui-state.test.js tests/layout.test.js` passed **18/18**. The full `npm test`, run with `BEDROCK_ENABLED=0`, AWS profile/auth variables unset, AWS config/credentials files `/dev/null`, and ephemeral ports, passed **50/50** with no skipped/failed/cancelled tests on Node **v26.0.0**. All three HTML files rebuilt; simulator is now **457,944 bytes**, while map/sandbox sizes are unchanged. The independent browser worker was notified to reload its existing 50648/50649 demo and retest CSP/AppBridge; its processes and artifacts were untouched.

The earlier 36-file clean-copy manifest, 293-package install, 49-test result, and build sizes above describe the **pre-fix snapshot**, not this revised dependency graph. A second fresh-copy installation was deferred to the bounded final check recorded below. Browser interaction, visual/product, live Bedrock, publication/video and final-submission gates are not closed by these local tests.

## Final dependency reproducibility check

Dispatch `ctx_1b08492ef9d7`, 2026-10-23 JST, Node **v26.0.0**, npm **11.3.0**. Created `/tmp/alexa-final-deps-svyjh3rl/project` from the same source allowlist above, now **37 regular files** including the CSP regression. No original `node_modules`, `web/dist`, data, credentials, `.git`, docs, artifacts, or unrelated files were copied. Both dependency and output directories were confirmed absent before installation.

The successful commands, run inside that copy, were:

```sh
env -u AWS_PROFILE -u AWS_DEFAULT_PROFILE -u AWS_ACCESS_KEY_ID -u AWS_SECRET_ACCESS_KEY -u AWS_SESSION_TOKEN -u NODE_PATH -u NODE_OPTIONS BEDROCK_ENABLED=0 AWS_EC2_METADATA_DISABLED=true AWS_CONFIG_FILE=/dev/null AWS_SHARED_CREDENTIALS_FILE=/dev/null npm ci --offline --cache /Users/akibe/.npm --logs-dir /tmp/alexa-final-deps-svyjh3rl/npm-logs --no-audit --no-fund
env -u AWS_PROFILE -u AWS_DEFAULT_PROFILE -u AWS_ACCESS_KEY_ID -u AWS_SECRET_ACCESS_KEY -u AWS_SESSION_TOKEN -u NODE_PATH -u NODE_OPTIONS BEDROCK_ENABLED=0 AWS_EC2_METADATA_DISABLED=true AWS_CONFIG_FILE=/dev/null AWS_SHARED_CREDENTIALS_FILE=/dev/null npm run build
```

Both exited **0**. Cache-only `npm ci` installed **294 packages**, without network downloads. Assertions confirmed `@cfworker/json-schema` **4.1.1** in the manifest, lockfile, and newly installed dependency, with its resolved directory inside the disposable copy. Build output was `map.html` **582,376 bytes**, `simulator.html` **457,944 bytes**, and `sandbox.html` **1,643 bytes**. Each contains one inline module and no external script URL or remaining dynamic import; existing build assertions also reject external imports/split chunks. The dynamic SDK bootstrap is therefore rebuilt into the self-contained output without depending on the original workspace.

Per the coordinator's dispatch, the P1 bootstrap fix is independently confirmed in the real browser; remaining interaction review is pending. This final worker did not repeat backend tests, demo/browser acceptance, or AWS calls: the prior **50/50** test evidence remains separate. Only this report changed, and only the uniquely owned `/tmp/alexa-final-deps-svyjh3rl` scratch tree was removed after successful verification. No commit, publication, or submission occurred.

## Independent browser closeout

Dispatch `ctx_8890b182acd3` subsequently passed the bounded real-browser checks in [browser-acceptance.md](browser-acceptance.md). The earlier pending-browser statements above are historical verification checkpoints. Final App HTML is 582,600 bytes after the separate keyboard-modal fix; simulator/sandbox sizes remain 457,944/1,643 bytes. No full backend-suite rerun is claimed for this browser dispatch. User product review, live provider quality, real voice/Alexa/Echo, publication/video and final submission remain separate open gates.

## Bounded loopback responsiveness evidence

Dispatch `ctx_afcdc1913556`, 2026-10-23 07:45 JST: **210/210 measured tool roundtrips were below 500 ms; maximum 7.490 ms.** This supplies local evidence for [canonical section 10, risk 7](2026-10-22-alexa-thought-map.md#10-課題とリスク). No actionable responsiveness failure was observed in this workload; Alexa/network SLA and production latency remain unverified.

Environment: Apple M4 Pro (14 logical CPUs), macOS/Darwin 25.6.0 arm64, Node **v26.0.0**, MCP SDK **1.29.0**, current uncommitted workspace. A disposable assert-based probe used SDK `Client` + `StreamableHTTPClientTransport` against three actual child server processes on `127.0.0.1`, ephemeral MCP/sandbox ports, and separate temporary SQLite databases. `BEDROCK_ENABLED=0`; all inherited `AWS_*` variables and `NODE_OPTIONS`/`NODE_PATH` were removed, then metadata access disabled and AWS config/credentials paths set to `/dev/null`. No AWS/profile/auth or paid API calls occurred.

Method: `performance.now()` immediately before `client.callTool` until its promise resolved, including serialization, HTTP, server handling/SQLite, and SDK response parsing/validation. One initialized SDK client per server; the server itself is stateless per HTTP request. Initialization, tool discovery and each client's first tool call are separate below. Each measured state has 30 sequential samples, no trimming; p50/p95 use nearest ranks (15th/29th). Total run including startup, provider waits, assertions and shutdown: **46.215 seconds**.

| Established-client state | Count | p50 ms | p95 ms | Max ms |
| --- | ---: | ---: | ---: | ---: |
| Idle `capture_thought`, Bedrock disabled | 30 | 0.844 | 1.618 | 2.101 |
| `show_map`, disabled/pending | 30 | 0.765 | 0.910 | 1.531 |
| `show_map`, initial background scheduling | 30 | 2.656 | 6.316 | 6.343 |
| Repeated `show_map`, analyzing while fake provider pending | 30 | 0.911 | 1.434 | 1.475 |
| `capture_thought` while fake provider pending | 30 | 0.790 | 1.129 | 1.457 |
| Saved ready map, 60 fragments / one synthetic root | 30 | 1.197 | 5.669 | 7.490 |
| Saved enriched ready fixture, 16 fragments / two roots, Bedrock disabled | 30 | 1.289 | 1.776 | 1.842 |

The fake child imported the actual `src/server.js` and used the existing analysis-test pattern to inject a provider into `RootAnalysis.showMap` in that child only. Production source was unchanged. Its roots-only `infer` awaited a **1,500 ms timer**, then returned explicitly synthetic valid results (`test:latency-fake-1500ms`). Thirty distinct versions scheduled 30 jobs; observed provider duration min/p50/p95/max was **1499.927 / 1501.669 / 1502.909 / 1503.658 ms**. All 30 analyzing polls and 30 busy captures finished during the first unresolved job, with the database still `analyzing` after each call. Subsequent versions grew to 60 fragments; saved ready results included the real layout calculation. The separate enriched case persisted `tests/fixtures/section8-map.json` before server startup and asserted its returned fields and layout presence.

Startup observations are single samples per process, not startup percentiles; listening detection used 5 ms polling:

| Process | Spawn → listening ms | SDK connect ms | Tool discovery ms | First `show_map` ms |
| --- | ---: | ---: | ---: | ---: |
| Disabled, empty DB | 158.502 | 32.768 | 15.096 | 4.315 (empty) |
| Fake provider, empty DB | 112.324 | 13.936 | 7.734 | 2.552 (empty) |
| Disabled, saved enriched map | 131.267 | 15.993 | 10.627 | 3.513 (ready) |

Assertions preserved exact Japanese text, leading/trailing spaces, newline, tab, emoji and tag-like characters across all 90 captured rows (30 idle + 60 fake); ready-map text and text/structured response equality also passed. All three owned child servers exited 0 and their recorded listeners refused connections afterward. Only this subsection was added; the owned `/tmp/alexa-response-ctx_afcdc1913556-9E63m6` scripts, results and databases were removed. No user DB, product/source/package/README/canonical/submission file, commit or publication was changed.

Limits: one local run, sequential requests, small databases and short synthetic utterances; no load/contention, large-history or maximum-input benchmark. The fake models asynchronous waiting, not CPU-bound work or real provider transport/quality; live attribute/priority stages were not exercised. Functional/browser suites were not repeated. This closes only the bounded local responsiveness evidence gap: real Alexa/Echo, external network/hosting, real Bedrock quality/usage and user acceptance remain open, with the existing AWS authorization gates unchanged.
