# Alexa Thought Map submission readiness

Checked **2026-10-23 JST** against current official event pages. Preparatory research only; this does not complete implementation tasks or authorize publishing, deployment, spending, or submission. The [canonical design](2026-10-22-alexa-thought-map.md) remains unchanged.

## Official-source checklist

The following requirements are confirmed documentation, not evidence that this project satisfies them. Unchecked boxes are submission gates.

### Rules and rights

Source: [Official Rules, sections 1, 3, 4 and 7](https://amazonappdev2026.devpost.com/rules).

- [ ] Submit by **2026-10-23 12:00 PDT (UTC−07:00) = 19:00 UTC = 2026-10-24 04:00 JST**.
- [ ] Verify entrant eligibility, ownership, and third-party licenses/media permissions.
- [ ] Standard route: working Agent Skill or self-hosted MCP; MCP **2025-11-25**, Streamable HTTP, actual runtime integration. Later protocol versions require confirmation.
- [ ] Simulation alternative: source and working demonstration required; no prescribed framework, SDK, MCP surface, or runtime-technology hook.
- [ ] All submission materials need English or English translations.
- [ ] Provide unrestricted, free judge access through **November 20, 2026, 12:00 Pacific**.
- [ ] Public GitHub requires a detectable open-source license; private GitHub requires reviewer sharing.
- [ ] Ownership remains with entrants; submission grants judging use and promotional rights, including contributor likeness/voice, during the event and three subsequent years.

Interpretation: simulation is an explicit alternative, not merely a mock device for MCP. This does **not** itself establish a hosting waiver. The separate FAQ below supplies that evidence. The canonical design intentionally includes MCP and a loaded Skill; retain those acceptance gates unless the user approves a design change.

### Deliverables

Source: [Official event overview, What to Submit](https://amazonappdev2026.devpost.com/).

- [ ] GitHub URL with complete source, assets, setup/run instructions; project description explaining functionality.
- [ ] Public YouTube/Vimeo working-demo video, under three minutes; clearly identify simulation and any fixed results.
- [ ] Feedback for **each** tool/API/SDK: purpose, strengths, problems, onboarding, and whether/why to use it again.
- [ ] Identify Alexa+ track and any mini-challenges; describe significant changes if pre-existing work.
- [ ] Optional Friction Log: attempted task, steps, expected/actual behavior, severity, workaround, actionable suggestion; up to 10% bonus.
- [ ] Optional AWS Builder: document actual AWS usage/integration in feedback. Open Source requires an additional project/contribution and contribution URL, repository URL, GitHub username, and explanation; publishing this app alone should not be assumed sufficient.

### Hosting and preview access

Source: [Official FAQ, Alexa+ hosting, server lifetime, preview access and private repositories](https://amazonappdev2026.devpost.com/details/faqs).

**Confirmed:** a locally runnable **public** repository plus demo video suffices; deployment is not required. An MCP server need not remain running after submission. Gated Alexa+ tools cannot be requested by hackathon entrants; a custom web simulator/front end is permitted, without physical hardware.

Private repositories must be shared before the deadline with Amazon reviewers `knmeiss`, `giolaq`, `anishamalde`, `mosesroth`, `emersonsklar`, and the Devpost contact linked in the FAQ. Invitations require acceptance and expire after seven days. The extracted Devpost email was obscured; verify it on the live page instead of guessing.

**Unresolved for this project:** how judges run Bedrock-backed analysis without providing their own paid account. Local execution permission does not prove dependency access or erase judge-access obligations. Prepare reproducible instructions and an explicit testing arrangement; do not distribute personal AWS credentials. Whether a fixed-result demo alone satisfies evaluation of the claimed analysis remains unconfirmed.

### AWS credit availability

Source: [Official Resources, October 7 update](https://amazonappdev2026.devpost.com/resources).

Credit codes are exhausted and new requests closed. The FAQ still describes individual $150 requests; do not budget on receiving new credits. Existing redeemed credits and remaining balance were not checked.

## Local evidence and critical gaps

Read-only inspection on 2026-10-23:

| Check | Observed | Not established |
|---|---|---|
| AWS CLI | `aws-cli/2.34.29` available; local version command succeeded | Account identity, IAM permissions, service availability |
| AWS files | Config and credentials files present, one section each; region setting and authentication settings present | Credentials validity, matching usable profile, selected Bedrock region/model access |
| AWS environment | No checked authentication, profile, or region environment overrides present | Other credential-provider state |
| Submission files | README contains Task 1 setup/Inspector instructions; no project license, Skill, feedback or friction-log file found by filename search | GitHub visibility/sharing, uploaded video, Devpost registration/submission |
| Implementation status | Canonical record says Task 1 acceptance remains incomplete and later tasks are pending | Current runtime result: no tests, Inspector, server or device run performed in this research |

No credential values, identifiers, profile names, or region values were printed. No STS, Bedrock, billing, deployment, or other AWS service call was made. Files/settings existing means **locally configured**, not authenticated or ready for inference. The shared workspace may change after this snapshot.

## Minimal next steps, in order

1. Coordinator finishes the canonical **Task 1** live Inspector/tool/restart acceptance gate; the historical environment failure is not a fresh test result. Continue Tasks 2 onward only in canonical order.
2. Obtain user decisions before the relevant actions: AWS account/profile, region and allowed models, inference budget, permitted test data; public versus private GitHub and license; demo language/name; repository/video publication and final submission. Hosting is optional under the cited FAQ, not a prerequisite to start implementation.
3. At the existing submission-materials task, close the deliverable checklist, validate a clean-machine judge run, and distinguish recorded fixtures, live Bedrock output, simulator behavior and untested Alexa+ behavior.
4. Immediately before authorized submission, recheck official pages, link accessibility, reviewer acceptance if private, and the exact deadline. No implementation, publication, invitations or submission were performed by this research task.
