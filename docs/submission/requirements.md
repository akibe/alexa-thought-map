# Alexa+ submission requirements

Rechecked against official public pages on 2026-10-24 JST. This is a preparation checklist, not a submitted entry or a declaration of eligibility. Implementation is being handled separately; the implementation baseline below was refreshed on October 24 from the README and bounded browser acceptance record. Official overview, rules and FAQ were rechecked October 24; the authenticated submission form has not been inspected.

## Sources

- [R — Official Rules](https://amazonappdev2026.devpost.com/rules): sections 1, 3–6; controlling requirements.
- [O — Official overview](https://amazonappdev2026.devpost.com/): “What to Build” and “What to Submit.”
- [F — Official FAQ](https://amazonappdev2026.devpost.com/details/faqs): preview tools, hardware, repository access and hosting.

## Requirement matrix

| Item | Requirement | Evidence to prepare / missing fact | Source |
| --- | --- | --- | --- |
| Deadline | **2026-10-23 12:00 PDT (UTC−07:00) = 19:00 UTC = 2026-10-24 04:00 JST.** | Submitted Devpost entry, not merely a saved draft. Registration and submission status unknown. | [R §1](https://amazonappdev2026.devpost.com/rules) |
| Entry | Register and complete required submission fields. | Confirm entrant, representative and final track selection. | [R §4](https://amazonappdev2026.devpost.com/rules) |
| Alexa+ platform | Working Agent Skill or self-hosted MCP; for MCP, use spec 2025-11-25 over Streamable HTTP. Detailed rules qualify later versions as “once confirmed,” although the overview says “or later.” | Demonstrate actual execution; confirm acceptance before relying on a later protocol version. README mentions alone are insufficient. | [R §4](https://amazonappdev2026.devpost.com/rules), [O](https://amazonappdev2026.devpost.com/) |
| Simulation alternative | Any AI/agentic web simulation; no prescribed SDK/framework/MCP surface or runtime-hook requirement; include source and working demo. | Explicitly label simulation, fixture data and differences from Alexa+. This allowance does not change the agreed MCP-based design. | [R §4](https://amazonappdev2026.devpost.com/rules) |
| Device/access | No Alexa hardware required; preview Category SDK, MCP Toolkit, CLI and Web Simulator unavailable to participants. | Do not claim Amazon simulator or real Echo testing. | [F](https://amazonappdev2026.devpost.com/details/faqs) |
| Description | Explain features and operation. | English description must match demonstrated behavior. | [O](https://amazonappdev2026.devpost.com/) |
| GitHub | Source, assets and run instructions; public with OSS license, or private with reviewer access. | Repository URL, license and reproducible setup still need final verification. | [O](https://amazonappdev2026.devpost.com/) |
| Public license | License detectable in GitHub About. | Verify license file recognition after authorized publication. | [R §4](https://amazonappdev2026.devpost.com/rules) |
| Video | Under three minutes; public YouTube/Vimeo URL; demonstrate functioning intended platform; permission for third-party media. | Missing final recording, duration, URL and media-rights confirmation. | [O](https://amazonappdev2026.devpost.com/) |
| Language | English or English translations for all materials. | Translate narration/captions, description, testing instructions and submitted documentation. | [R §4](https://amazonappdev2026.devpost.com/rules) |
| Feedback | Every used tool/API/SDK: purpose, positives, problems, onboarding, reuse intention. | Reconcile [feedback draft](product-feedback.md) with final tool inventory and participant answers. | [O](https://amazonappdev2026.devpost.com/) |
| Optional feedback | Feature requests: rationale/priority; friction: task, steps, expected/actual, severity, workaround, suggestion. | Use observed records; never manufacture incidents. | [O](https://amazonappdev2026.devpost.com/) |
| Originality | New work, or demonstrate significant updates since August 31, 2026, 10:15 PT. | Confirm project history and ownership. | [R §4](https://amazonappdev2026.devpost.com/rules) |
| Judging access | Free unrestricted evaluation through November 20, 2026, noon PT; private website credentials supplied. | Confirm clean-machine run instructions and any credentials through the submission's testing channel. | [R §§1,4](https://amazonappdev2026.devpost.com/rules) |
| Hosting | Locally runnable public repo plus video suffices; continuous hosting unnecessary. | Do not make deployment a submission blocker. | [F](https://amazonappdev2026.devpost.com/details/faqs) |

## Competition requirements versus project acceptance

The canonical project's Inspector/restart checks, Bedrock analysis, loaded Skill, MCP Apps, three-stage map and 768×480 readability checks are project acceptance criteria, not universal competition requirements. Preserve the agreed design and verify features actually claimed; do not present these checks as prerequisites for every permitted simulation entry. Real Echo testing and continuous hosting are not competition gates. A concept-only video still does not establish a functioning simulation. [R §4](https://amazonappdev2026.devpost.com/rules), [F](https://amazonappdev2026.devpost.com/details/faqs)

## Private repository access

Before the deadline, invite **testing@devpost.com**, **knmeiss**, **giolaq**, **anishamalde**, **mosesroth**, and **emersonsklar**. Acceptance is required; invitations expire after seven days. Public licensed repositories need no reviewer invitations. The email was decoded from the official FAQ's protected email link. [F](https://amazonappdev2026.devpost.com/details/faqs)

Recommended verification: confirm each reviewer can access the final submission version, retain the submitted revision identifier, and do not expose personal thoughts or service secrets in the repository or video. No invitations or account changes were made for this research.

## Judging and optional challenges

Stage 1 checks viability/track fit. Stage 2 equally weights Tech Implementation, Design, Potential Impact, and Quality of the Idea. Friction logs can add up to 10%; the bonus is discretionary. [R §6](https://amazonappdev2026.devpost.com/rules)

AWS Builder requires documented AWS use and service-specific feedback; Kiro Crew development use alone can qualify, without an AWS runtime call. Open Source requires an additional project/contribution, contribution URL, repo URL, GitHub username and explanation. Neither is automatically claimed here. [O](https://amazonappdev2026.devpost.com/)

Suggested evidence for this project: show capture → grouping → root regrouping → focus; identify fixed demo results; explain the intended customer problem without claiming measured impact. Bedrock plans alone do not prove AWS use. An OSS license for the primary submission alone does not establish an additional contribution.

## Participant questions — unresolved

Under [R §§3–4](https://amazonappdev2026.devpost.com/rules): adult/eligible residence? Authorized team representative? Organizer/judge/affiliate/family/household conflicts? Sponsor financial/preferential support? Ownership and third-party permissions?

The [FAQ](https://amazonappdev2026.devpost.com/details/faqs) names Brazil, Quebec, Russia, Crimea, Cuba, Iran, North Korea and comprehensive OFAC sanctions, alongside broader legal exclusions. Japan is not named; that does not establish this entrant's eligibility. Do not infer residence, age, employment, ownership or affiliation from the workspace or language.

## Evidence still needed before submission

- Final participant answers and registration status.
- Final GitHub URL, selected access route, license/access verification and runnable submission revision.
- Recorded working simulator/MCP flow and final English video URL.
- Accurate English description, translations and complete tool feedback with genuine reuse answers.
- Final implementation/test report. The [canonical design §11](../2026-10-22-alexa-thought-map.md) now records two passing tests and successful Inspector CLI capture/read/restart checks on October 23. The [browser acceptance record](../browser-acceptance.md) now covers the local MCP App, simulator and fixed demo. Live Bedrock quality, voice/Echo, final video and judge access remain unverified.

This document does not authorize publication, account changes or submission. Recheck the official pages and authenticated submission form before the participant submits; the form itself was not accessed.
