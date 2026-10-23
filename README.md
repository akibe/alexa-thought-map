# Alexa Thought Map

Tasks 1–2 verified; Tasks 3–5 implemented and locally tested under the [canonical design](docs/2026-10-22-alexa-thought-map.md). Tasks 6–8 passed [bounded local browser acceptance](docs/browser-acceptance.md) with the real MCP App, separate-origin simulator and isolated synthetic demo; both browser-discovered blockers were fixed and retested. **Live Bedrock quality, real voice/Alexa/Echo and user product acceptance remain UNVERIFIED.** The coordinator authorized reversible local implementation ahead of the blocked live gate; the fixed demo does not close that gate.

Requires Node.js 26 or newer.

```sh
npm ci
npm start
```

Connect an MCP client to `http://127.0.0.1:3000/mcp` using Streamable HTTP.

- `capture_thought({"text":"the original utterance"})` stores the exact text and receive timestamp. Its response contains only `received` and `pending_count` data.
- `show_map({})` returns `empty`, `pending`, `analyzing`, or `ready`. With Bedrock enabled it starts one background analysis per captured version. A ready response includes the exact analyzed fragments, per-fragment resolution conditions, root sentences/member IDs/leverage, unmatched IDs, model provenance and token usage. `root_sentence` and `next_action` mirror the selected focus, or stay null when no supported actionable root exists. Legacy root-only results keep these fields null.

The SQLite database defaults to `data/thought-map.sqlite`; it survives server restarts and is excluded from git. `DB_PATH` changes its location; `PORT` changes the API/host port (default 3000), and `SANDBOX_PORT` changes the separate sandbox port (default 3001, or ephemeral when `PORT=0`). Both listeners bind only to `127.0.0.1`. Exact local Host/port and Origin checks apply; MCP Inspector's default local UI on port 6274 is also allowed for `/mcp`. Clients without an Origin header can connect. This app stores one local user's thoughts and is intended for local use.

## Root-reasoning skill

[infer-thought-roots](skills/infer-thought-roots/SKILL.md) is a self-contained Agent Skill implementing section 5, step 2: infer resolution conditions, regroup by shared dependencies, name roots as sentences, and leave unsupported matches ungrouped. Other Agent Skills-compatible agents can use its folder independently.

At startup, the server imports `src/root-reasoning.js`, which reads the packaged `SKILL.md` relative to its module location, strips discovery frontmatter, and exports `rootReasoningInstructions` for the inference path. Missing files, missing frontmatter delimiters, and empty instruction bodies fail startup. Include `skills/` alongside `src/` when packaging the server. This loader handles the bundled document's frontmatter delimiters; it is not a general YAML validator.

The actual loaded body is passed verbatim as the Bedrock Converse `system` instruction. Output must satisfy a strict shape and contain every snapshot ID exactly once in conditions and once across roots/unmatched IDs. Unknown/duplicate/missing IDs, more than five roots, incorrect leverage, truncated responses and invalid JSON fail analysis without changing captured text.

## Verification

```sh
npm test
```

Tests use temporary databases. They check raw text preservation, timestamps, safe SQL parameters, a real process restart, protocol `2025-11-25` negotiation, MCP tool calls, input/Host/Origin validation, and clean failure when a port is occupied. Skill tests check the exact packaged instruction body, real server startup failure when the skill is missing, rejection of malformed/empty documents, CRLF handling, and loading changed instructions from a different working directory.

`npm ci` installs the pinned MCP Inspector 2.12.0 along with runtime dependencies. For an isolated Inspector check, start the server with a temporary database (reuse this same path when restarting):

```sh
verification_dir=$(mktemp -d)
DB_PATH="$verification_dir/thoughts.sqlite" npm start
```

In another terminal, launch Inspector:

```sh
npx --no-install @modelcontextprotocol/inspector
```

In Inspector, select **Streamable HTTP**, connect to `http://127.0.0.1:3000/mcp`, and call both tools. Capture a unique thought, stop and restart the server, reconnect, and confirm `show_map` still reports the pending count. Inspector's CLI can also call the tools:

```sh
npx --no-install @modelcontextprotocol/inspector --cli http://127.0.0.1:3000/mcp --transport http --method tools/call --tool-name capture_thought --tool-arg 'text=Inspector persistence check'
npx --no-install @modelcontextprotocol/inspector --cli http://127.0.0.1:3000/mcp --transport http --method tools/call --tool-name show_map
```

## Task 3: asynchronous behavior and live verification

Bedrock is **off by default**. Normal mode never selects fake inference, and `npm test` never calls AWS. Test providers are labelled `test:*`, including persisted results; explicit demo mode instead loads a separate saved `demo:*` fixture with no provider. Attributes and priority/focus run in the same asynchronous job. No live inference or UI acceptance is implied.

- `show_map` schedules work after returning, never awaiting the model. `capture_thought` only saves text and returns the minimal acknowledgement.
- SQLite stores each analysis with its immutable input snapshot, version (last fragment ID), source, status, result and creation time. Only a result whose version matches current input is shown as ready. Capturing during inference remains available; a later `show_map` starts the newer snapshot after the old request settles.
- Polling does not retry. Failed versions return `pending` with `error: attributes_failed`, `analysis_failed` (roots), or `priority_failed`; process interruption becomes `error: interrupted` at the next startup. Captures remain intact. `show_map({"retry":true})` explicitly retries a failed/interrupted current version once (another possible charge); concurrent requests coalesce, and ready versions are not retried. Successful stage checkpoints survive failures/restarts; explicit retry resumes the first unfinished stage without repeating completed calls. A failed map does not expose partial or stale focus, but validated roots remain in SQLite checkpoints. New input permits a new analysis; for a deliberate repeat of a completed fixture, use the isolated command below. No automatic retries, including in the SDK (`maxAttempts: 1`).
- If both result and failure-status writes fail, the background job settles without crashing and logs a fixed diagnostic without private error details. The saved row remains `analyzing`; restore database writes and restart to recover it as `interrupted`, then explicitly request a retry. Polling does not repeat the model call.
- One server process per database is supported. At server startup the sole analysis owner explicitly marks unfinished analyses interrupted; merely opening a ThoughtStore for inspection does not alter running state. There is no distributed worker lease. The provider caps serialized instructions/input at 24,000 UTF-8 bytes, output at 4,096 tokens, and request duration at 60 seconds; larger histories remain captured but cannot yet be analyzed. These are MVP limits, not input deletion or silent truncation.

### Concrete model and expected cost

Checked official docs on 2026-10-23: [AWS Sonnet 4.6 model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-4-6.html) lists Converse support and `us-east-1` Geo availability. The implementation fixes `us.anthropic.claude-sonnet-4-6` at `us-east-1` (US cross-region inference, not Tokyo-only processing). [Converse API](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html) requires `bedrock:InvokeModel` permission. The SDK is pinned at 3.1156.0.

[Official Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) lists Sonnet 4.6 at $3/$15 per million input/output tokens and a 10% premium for regional Bedrock endpoints: estimated US rates are **$3.30 input / $16.50 output per million tokens**; consult [AWS pricing](https://aws.amazon.com/bedrock/pricing/) and account terms before approval. For a roughly 3,000-input-token fixture and the full 4,096 output cap, estimate **$0.0775 for one call**, excluding tax. A conservative 24,000-input-token allowance plus output is about $0.147; reserve **$0.20 for one attempt**. Byte limits are not exact tokenizer counts or a billing-enforced dollar cap. Actual usage is returned and saved on success; failed/timed-out calls can still incur charges.

### Next user action and exact test

The earlier approved single Task 3 attempt stopped at credential resolution without model output; see [the live verification record](docs/task3-live-verification.md). The user chose to prepare a **different AWS profile**; `metsa-deployer` must not be selected or invoked. Further paid calls need a prepared, explicitly authorized profile and scoped authorization. The isolated Task 3 command below remains **one root-only attempt, approximately $0.20**, sending the synthetic Japanese 16 utterances in [section8.json](tests/fixtures/section8.json) plus the packaged Skill and output schema to US Bedrock. No personal thoughts are included. Configure an AWS profile authorized for the model and its US cross-region destinations; complete any required model access/Marketplace prerequisites yourself. No credentials are printed or stored by this app. AWS access, entitlement, quota, and billing settings were not inspected or changed.

After that approval, from the repo root:

```sh
# AWS_PROFILE selects an already configured profile; do not paste credentials.
AWS_PROFILE=your-approved-profile BEDROCK_ENABLED=1 node src/verify-live.js
```

This makes **one** real call, with no model retries or fixture answer injected. It creates and prints a fresh temporary SQLite path (kept for inspection), reports analyzing then ready/pending, prints token usage and result, and exits nonzero on failure or no cross-topic roots. Topic labels are only a local comparison baseline and are not sent to the model. The handwritten result in the unit test is explicitly a fake and proves plumbing only.

Review the saved output: conditions for all 16 IDs; root sentences naming underlying states; cross-topic membership (especially identity/estimates 2 and 5/11, and drawing 6 versus lack of space); unmatched items visible; no invented circumstances or selected focus/next action. Different wording/group membership can be legitimate: a cross-topic flag alone is insufficient. Record actual model/usage/result and human judgment before marking Task 3 accepted; later quality validation should also use user-approved real thoughts.

For interactive MCP use **only after separate full-pipeline budget/data approval**, start `AWS_PROFILE=your-approved-profile BEDROCK_ENABLED=1 npm start`; unlike the single-call verification command, this server can bill for **up to three calls per new input version** requested by `show_map` (Nova attributes → Sonnet roots → Nova priority). The Task 3 single-call approval does not cover this full pipeline. Stop it after testing.

Local verification: `npm test` covers async capture/snapshot isolation, duplicate polling, invalid shape/IDs, provider failure, process-restart result persistence, interrupted recovery, exact system instruction forwarding, request limits/completion handling, and the disabled live-command guard. It also covers MCP ready-result schema, protocol negotiation, input/Host/Origin validation and raw-text preservation. Inspector GUI, real Echo/Alexa+, live AWS access and inference quality remain unverified.


## Tasks 4–5: attributes, priority and consumer contract

The lightweight provider uses `amazon.nova-micro-v1:0` in `us-east-1`. Checked on 2026-10-23: the [official Nova Micro model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-micro.html) documents in-region availability and Converse support, but no native structured outputs. We use the [documented Converse text/system/inferenceConfig contract](https://docs.aws.amazon.com/nova/latest/userguide/using-converse-api.html), request JSON in the prompt, and strictly validate it locally. Model access, entitlement, output quality and live cost have not been verified. This is Bedrock classification, not the TypeSafe jev service.

Each snapshot is treated as one local session. A single attribute request includes its original fragments, each target's preceding three IDs, and instructions to derive a session theme from that context. It returns topic, direction and contextual intensity for every ID exactly once. Topics are grouped deterministically from those labels. All attributed originals are then sent to the unchanged, actually loaded root-reasoning Skill. There is no keyword classifier or fake fallback. Explicit multi-session boundaries remain an MVP limit.

Priority judges each validated root as `yes`, `partial`, or `no`, with a grounded reason and a small next action (`null` only for `no`). Root IDs are the smallest member fragment ID, stable within the saved snapshot. Selection is deterministic: `score = leverage × weight`, with `yes=2`, `partial=1`, `no=0`; ties prefer larger leverage, then smaller root ID. Roots with score zero cannot become focus. All roots stay in the map, including desires and unavailable roots; if none is actionable, focus is null. The score is an implementation rule, not a quality claim about the model's judgments.

When validated roots are empty, priority is skipped: the map is ready with `roots: []`, `focus: null` and all unmatched IDs preserved. No priority provenance or checkpoint is created because no model was called. This also applies when explicitly resuming a failed/interrupted snapshot with an empty-roots checkpoint; ready polling, retries and restarts make no further calls.

The exported `mapAnalysisSchema` in `src/analysis.js` and [full synthetic fixture](tests/fixtures/section8-map.json) are the consumer contract. Existing snake_case fields remain:

| Field | Shape |
|---|---|
| `analysis.fragments[]` | `id`, verbatim `text`, `received_at`, plus `topic`, `direction`, `intensity` |
| `direction` / `intensity` | `want_to / must_do / avoid / uncertain / anxious`; `low / medium / high` |
| `analysis.session_theme` | Short contextual theme, not a replacement for original text |
| `analysis.topics[]` | `{topic, fragment_ids}` in first-occurrence order |
| `analysis.roots[]` | Existing `sentence, fragment_ids, leverage`; adds `root_id, actionability, reason, next_action, score` |
| `analysis.focus` | `null` or `{root_id, sentence, actionability, reason, next_action, score}` |
| `analysis.conditions[]` | Existing `{fragment_id, condition}` |
| `analysis.unmatched_fragment_ids` | Original IDs outside roots, always retained |
| `analysis.provenance` | Executed stages only: `attributes`, `roots`, `priority`, each `{source, usage}` |
| `analysis.source` / `usage` | Original root provider and root token usage, retained for compatibility |
| top-level `root_sentence` / `next_action` | Mirror focus, otherwise null |

The fixture is handwritten synthetic data, explicitly labelled `test:section8-handwritten` at every stage; it is **not** a Bedrock result and is never selected by the server. `tests/fixtures/section8.json` remains unchanged. Legacy saved root-only analyses have no enrichment fields: absence means that stage was not run, not an empty model judgment. Root-only `src/verify-live.js` deliberately retains its one-call contract.

SQLite adds one nullable `checkpoint` JSON column to existing databases without replacing captured data or ready maps. Each successful stage persists its validated output, source and usage before the next call. An explicit retry can use a different provider for the failed stage; retained outputs keep their original provenance. Captures during any stage start a new version on a later poll, with no stale result shown. Model failures never produce fixture answers or automatic retries.

Local tests cover deterministic ties/all-no, malformed enum/action/ID rejection, immediate context, attributes reaching root inference, separate topic and root memberships, full MCP output validation, checkpoint migration, later-stage failures, explicit retry coalescing, source retention, process restart and stale-focus protection. Tests inject fake clients only. The coordinator also requested exact `@modelcontextprotocol/ext-apps` 1.7.5 and dev `vite` 8.3.5 for the separate UI worker; installation does not prove UI integration or acceptance.

## Tasks 6–8: local MCP App and fixed demo

```sh
npm run build
npm run demo
```

Open **http://127.0.0.1:3000/simulator** and choose **Open fixed demo**. `npm run demo` rebuilds the three self-contained HTML files and starts both listeners; Ctrl-C stops them and deletes that run's temporary demo database. For other ports use `PORT=3100 SANDBOX_PORT=3101 npm run demo` and open the printed `/simulator` URL. `PORT=0 SANDBOX_PORT=0 npm run demo` chooses two available ports for automated checks.

The demo uses [section8-map.en.json](demo/section8-map.en.json), a hand-authored English translation of the existing Japanese synthetic fixture, with the same IDs, topic/root memberships and unmatched items. Its source and each stage's provenance are `demo:section8-english-handwritten`, with no model usage. The UI labels it **SYNTHETIC · FIXED DEMO**. This is a saved interface example, not model output or inference-quality evidence.

Every demo startup creates a new private temporary SQLite database, ignores `DB_PATH`, and constructs no Bedrock provider even if `BEDROCK_ENABLED=1` is inherited. Restart restores identical saved inputs/results and deterministic layout. The UI hides capture in demo mode, but a direct `capture_thought` still stores the exact new text in that temporary database: its newer version stays `pending`, with no fixture answer or model call. Restart resets that disposable run. Normal `npm start` keeps the ordinary persistent capture behavior and Bedrock opt-in; build once and open `/simulator` to use the typed-input host.

- `show_map` uses Apps 1.7.5 `registerAppTool` with `_meta.ui.resourceUri = ui://thought-map/map.html` and model/app visibility. Ready results add `_meta.layout = createLayout(analysis)` while preserving text and structured results for non-App clients.
- `registerAppResource` exposes the built map HTML with MIME `text/html;profile=mcp-app` and empty connection/resource/frame domain lists on both listing and content metadata. Missing build output reports a fixed error; it never serves source files.
- App-only `focus_root({version,root_id})` returns `{version,root_id,root_sentence,reason,next_action,fragments}` from the current ready snapshot. Stale versions, missing roots and legacy roots without a saved judgment return `isError`; no inference is started. App visibility is a host-enforced protocol contract, not authentication for arbitrary local MCP clients.
- Host routes are only `/mcp`, `/simulator` and `/ui-config`; the latter returns only `{sandboxOrigin,demo}`. HTML includes all assets inline, so there is no general static directory. The sandbox listener serves only `/sandbox.html?hostOrigin=<exact local host origin>`, with strict Host/Origin checks and no API routes. CSP allows the host's same-origin MCP connection and its separate sandbox frame; sandbox connections and nested frame navigation are denied. Both origins deny external embedding and device permissions except the sandbox's explicitly allowed local parent.

`npm test` builds first, then tests real Streamable HTTP tool/resource metadata, resource HTML, versioned focus, layout attachment, strict routes/Host/Origin/CSP headers, raw input, demo isolation and identical restart, disabled demo providers, both listener shutdowns and port conflicts. The startup packaging test also copies the new server imports so missing root instructions still fail for the intended reason.

**Local browser gate passed:** see [the independent acceptance report and screenshots](docs/browser-acceptance.md) for real AppBridge/CSP, layout, keyboard, reduced-motion, capture/race and restart evidence, plus its explicit limits. Tasks 3–5 still require the user's separate prepared AWS profile and explicitly scoped live authorization; real voice/Alexa/Echo and user product acceptance remain open.
