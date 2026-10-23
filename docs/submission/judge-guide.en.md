# Go On — reviewer quick start

**An AI that listens. For thoughts still taking shape.**

Go On is a listening-first experience designed for Alexa+, demonstrated through a custom local web simulator that uses a real MCP client and server. The implementation currently displays **Thought Map** inside the app; **Go On** is the submission title for the same project.

## Run the demonstrated experience

Requirements: Node.js **26 or newer**, npm, and a current Chromium-based browser. Download the submitted repository and run these commands from its root:

```sh
npm ci
BEDROCK_ENABLED=0 npm run demo
```

Open **http://127.0.0.1:3000/simulator** and choose **Open fixed demo**. If those ports are occupied:

```sh
PORT=3100 SANDBOX_PORT=3101 BEDROCK_ENABLED=0 npm run demo
```

Then open **http://127.0.0.1:3100/simulator**. No AWS credentials, account, microphone, or payment are needed for this fixed demo. Both listeners are local-only.

1. Start with the scattered thoughts. There are 16 original fragments.
2. Move through the stages: topics, roots, then focus. The words remain while their relationships change.
3. Select a root to inspect its complete sentence, reasoning, next action and connected originals.
4. Use **Read thoughts** to inspect all original fragments, including those not assigned to a root.
5. Use **Replay** to revisit the transitions. With reduced motion enabled, step through manually.

The example connects job titles and estimates under the possible root **“I have not chosen how to describe my work.”** Its next action is **“Write a one-sentence introduction using one job title.”** This is a hypothesis illustrated by the fixture, not a diagnosis of a real person.

Stop with Ctrl-C. Demo mode uses a fresh temporary database and removes it on normal shutdown. It does not replace the normal-mode database.

## What this demonstrates

The browser performs real MCP initialization, tool calls and resource loading over Streamable HTTP. The map is an MCP App in a separate-origin sandbox. Root selection retrieves the corresponding original fragments from the server.

The 16 thoughts and analysis are **handwritten synthetic fixture data**, identified in the UI as **SYNTHETIC · FIXED DEMO**. No model runs during the fixed demo. The demo proves the interaction, transport and display; it does not prove inference quality. Speech scenes in the accompanying video illustrate the intended interaction rather than live speech recognition or Alexa device operation.

The repository includes an asynchronous Bedrock inference path and a loaded reasoning Skill. Live Bedrock quality and actual voice/Alexa+/Echo behavior remain unverified. See the [implementation README](../../README.md) for the full architecture and boundaries.

## Optional checks

```sh
npm test
```

Tests use temporary databases and do not call AWS. The [browser acceptance report](../browser-acceptance.md) records the tested local UI, keyboard and persistence behavior.

To inspect typed capture separately, stop demo mode, build once, and start normal mode with an isolated database:

```sh
npm run build
review_dir=$(mktemp -d)
DB_PATH="$review_dir/thoughts.sqlite" BEDROCK_ENABLED=0 npm start
```

Open **http://127.0.0.1:3000/simulator**, type a synthetic thought, and request the map. With inference disabled, saved thoughts remain pending; normal mode does **not** substitute a fixture result. The temporary folder is retained after shutdown so persistence can be inspected. Do not enter personal information for this evaluation.
