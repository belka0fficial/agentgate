# AgentGate Product Architecture and Foundation Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Preserve the complete AgentGate product vision as a versioned documentation system, reconcile the current contradictory implementation, and build a clean, source-bound text-first foundation for companions, chats, approvals, workforce, orchestration, jobs, capabilities, memory, apps, system security, and settings before adding voice, camera, emotion, 2D, or 3D runtimes.

**Architecture:** AgentGate is a local-first, single-owner personal AI operating system and owner-facing backend-for-frontend. The browser calls one same-origin AgentGate API; that API composes the Pi runtime adapter, ToolGate, MemoryGate, SystemGate, and AgentGate-owned presentation/orchestration metadata while preserving each service as source of truth. Heavy presence features remain behind future adapters so the foundation does not depend on powerful hardware.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Tailwind CSS 4, Radix UI, TanStack Router, TanStack Query, Zod, Zustand only for local canvas/editor state, Vitest browser tests, Playwright, FastAPI/Pydantic for the AgentGate BFF, SSE for observable run events, `@xyflow/react` for future Flow/Loop construction, PostgreSQL/Qdrant only through MemoryGate, ToolGate MCP for controlled app/tool access, SystemGate read-only telemetry.

**Companion Reference Catalog:** `.hermes/plans/2026-08-26_012753-agentgate-reference-technology-catalog.md` records researched repositories, licenses when verified, adoption decisions, Chinese ecosystem watch targets, supply-chain tools, evaluation systems, MCP/App patterns, and deferred presence technology.

---

## 1. Non-Negotiable Product Decisions

1. AgentGate is not a generic service dashboard. It is the user's personal AI operating system and human relationship surface.
2. Conker is the main Companion and Chief. The Companion space is where proactive findings, requests, completed work, and QoL ideas are presented.
3. There is no standalone Suggestions/QoL destination in the final navigation. Those items become Companion Journal entries with evidence and actions.
4. Jobs and ToolGate Automations are different:
   - **Job:** scheduled or triggered recurring work owned by the Pi/Hermes runtime.
   - **ToolGate Automation:** versioned deterministic tool workflow that compresses repeated tool/script patterns.
5. **Agent Definition** is the reasoning, model, memory, capability, and authority configuration.
6. **Character Profile** is the identity/presentation layer attached to a human-facing agent.
7. **Companion** is a persistent conversational agent with a Character Profile.
8. **Worker** is a reusable nameless specialist definition.
9. **Subagent** is a temporary runtime instance of a worker or delegated role.
10. **Team** defines who participates; **Flow** defines ordered work; **Loop** defines bounded repetition; **Run** is one execution.
11. Personality and appearance never grant permissions. ToolGate and runtime grants remain authoritative.
12. AgentGate-owned Apps expose a normal authenticated API to humans and a scoped MCP interface to ToolGate. They do not embed provider secrets.
13. The UI must never claim connected, healthy, secure, active, speaking, collaborating, or completed without source-bound evidence.
14. The browser never receives provider keys, gate admin keys, hidden prompts, raw broad memory, unrestricted tool arguments, command lines, host paths, environment dumps, Docker socket paths, or provider upstream URLs.
15. Initial implementation is text-first and hardware-light. Voice, camera, emotional telemetry, Live2D/3D, and realtime calls are documentation-only future phases.
16. Packages, libraries, container images, lockfiles, licenses, and vulnerabilities form a Software Supply Chain domain under System; SystemGate observes and ToolGate performs approved changes.
17. Feedback may produce change candidates, never direct prompt mutation. Every Agent, Skill, Tool, Automation, Job, App, and prompt change is versioned, evaluated, diffed, approved according to risk, canaried where possible, and rollback-capable.
18. Weekly technology intelligence uses public or owner-authorized sources, verifies original sources, respects terms/licenses, and produces cited proposals rather than automatically installing discoveries.

## 2. Current Repository Findings

- `README.md` and `AGENTGATE_IMPLEMENTATION_PLAN.md` describe an older FastAPI BFF architecture with one Hermes character, Suggestions, merged cron/Automations language, and legacy route names.
- The live dashboard currently proxies `/api` directly to the Pi adapter from `dashboard/vite.config.ts`.
- `api/agentgate/main.py` already contains a second AgentGate BFF, local SQLite storage, suggestions, apps, character profile, cron proxying, gate aggregation, and system proxying.
- The dashboard uses TanStack Router, not React Router 7 as stated in the older implementation plan.
- `dashboard/src/features/agentgate/command.tsx` contains hardcoded sparkline histories and specimen language that violate the source-bound rule.
- `dashboard/src/features/agentgate/automations.tsx` and `/api/automations` merge Jobs and ToolGate Automations, which contradicts the clarified taxonomy.
- `dashboard/src/features/agentgate/suggestions.tsx` creates a separate destination that should become Companion Journal behavior.
- The dashboard lacks domain-level tests for Command, Chats, Approvals, Jobs, Memory, System, Agent Studio, and future orchestration.
- ToolGate already owns typed tools, deterministic Automations, bounded loops/retries, approval binding, audit, local Ollama generation, and MCP exposure.
- MemoryGate already owns evidence, analysis, memory, entities, episodes, lineage, semantic retrieval, and its own administrative dashboard.
- SystemGate is intentionally read-only and currently exposes health, vitals, containers, processes, error logs, packages, and backups.
- Pi adapter is the active runtime and already owns persisted Jobs, scoped agent/team grants, owner sessions, model routing, approvals, and safe run history.

## 3. Target Documentation Tree

The first implementation phase creates and commits this source-of-truth pack:

```text
docs/
  README.md
  product/
    vision.md
    principles.md
    taxonomy.md
    information-architecture.md
    owner-journeys.md
    scope-and-phases.md
    copy-and-status-language.md
    continuous-improvement.md
    technology-intelligence.md
  ux/
    placement-rules.md
    interaction-patterns.md
    responsive-and-accessibility.md
    screens/
      companion.md
      command.md
      chats.md
      approvals.md
      workforce.md
      agent-studio.md
      orchestration.md
      jobs.md
      capabilities.md
      memory.md
      apps.md
      system.md
      software-supply-chain.md
      improvement-review.md
      settings.md
  architecture/
    system-context.md
    data-ownership.md
    agentgate-bff.md
    event-and-trace-model.md
    orchestration-model.md
    app-platform.md
    security-boundaries.md
    software-supply-chain.md
    continuous-improvement-loop.md
    technology-intelligence-pipeline.md
    repository-modules.md
  contracts/
    upstream-capability-matrix.md
    facade-api.md
    event-schema.md
    security-posture-schema.md
    app-manifest-schema.md
    character-profile-schema.md
    software-component-schema.md
    feedback-event-schema.md
    change-proposal-schema.md
    evaluation-run-schema.md
  development/
    local-setup.md
    fast-ui-loop.md
    testing.md
    deployment.md
    documentation-rules.md
  future/
    realtime-call-architecture.md
    developer-mode-telemetry.md
    character-presence.md
    voice-and-speech.md
    camera-and-emotion.md
    group-calls-and-scaling.md
  decisions/
    0001-single-agentgate-bff.md
    0002-domain-ownership.md
    0003-jobs-vs-toolgate-automations.md
    0004-sse-before-websockets.md
    0005-text-first-presence-later.md
    0006-app-http-plus-mcp.md
    0007-software-supply-chain-ownership.md
    0008-proposals-not-silent-updates.md
    0009-feedback-requires-evaluation.md
    0010-public-authorized-intelligence-sources.md
  references/
    README.md
    technology-catalog.md
    orchestration-and-observability.md
    evaluation-and-self-improvement.md
    supply-chain-and-updates.md
    mcp-and-app-platform.md
    chinese-ai-ecosystem.md
    realtime-presence.md
    source-monitoring.md
  roadmap/
    foundation.md
    future-presence.md
    acceptance-matrix.md
```

Old root documents remain temporarily but receive a clear superseded banner and links to the new documentation index. Do not silently delete historical reasoning until the new pack is reviewed.

## 4. Target Product Navigation

```text
Main Companion face
  -> Companion space / Journal / quick chat

Personal
  - Chats
  - Approvals

Control
  - Command
  - Orchestration
  - Workforce

Intelligence and execution
  - Jobs
  - Capabilities
  - Memory

Outputs
  - Apps

Operations
  - System

Footer
  - Theme
  - Settings
  - Account
```

### Placement Rules

- **Full screen:** repeated browsing, filtering, history, comparison, or operation.
- **Dialog:** quick glance or one short task without leaving context.
- **Drawer:** inspect/edit one item while preserving list context.
- **Settings:** rare global defaults/policies only.
- **Entity Studio:** substantial configuration of a durable object such as a Companion, Worker, Team, Flow, or App.

### Gateway Responsibility Split

- Settings → Models & Providers: provider connection, global route, privacy/routing policy.
- System → AI Runtime: health, latency, model availability, degraded routes.
- Agent Studio → Models & Reasoning: agent-specific primary/fallback route.

## 5. Source-of-Truth Ownership Matrix

| Domain | Source of truth | AgentGate responsibility |
| --- | --- | --- |
| Owner session | AgentGate BFF / reviewed auth contract | Same-origin owner session and CSRF |
| Runtime sessions/messages | Pi adapter | Normalize and render; never duplicate hidden runtime state |
| Agent/worker definitions | Pi adapter runtime contract | Owner-facing CRUD/editor and presentation joins |
| Character/presentation profiles | AgentGate | Identity, portrait metadata, appearance metadata, future voice/scene references |
| Teams and grants | Pi adapter | Team editor and source-bound runtime status |
| Flow/Loop definitions and Runs | Pi adapter orchestration extension | Visual constructor, trace viewer, start/stop/approve UI |
| Jobs | Pi adapter | CRUD, schedules, run history, safe outputs |
| Tools/Automations/requests/secrets | ToolGate | Bounded summary, Automation proposals, approval links; no secret or duplicate executor |
| Memory/evidence/entities/episodes | MemoryGate | Search and bounded owner views; no broad raw dump |
| Host/container/package/log/backup telemetry | SystemGate | Read-only visualization and security posture |
| Software component inventory/SBOM | SystemGate scanner outputs plus repository lockfiles | Read-only inventory, freshness, license, provenance, and risk views |
| Package/image update execution | ToolGate and repository CI | Approval-bound branch/build/test/deploy/rollback; AgentGate never runs package managers directly |
| Response feedback and correction marks | AgentGate | Durable owner feedback events linked to response, agent/skill/model versions, and safe context references |
| Prompt/Skill/Agent improvement proposals | AgentGate evaluation registry plus authoritative target repository | Candidate versions, regression dataset, comparison, approval, canary, rollback; no silent overwrite |
| Technology intelligence findings | Companion Journal with source/evidence links | Deduplicate, verify original sources, rank value, propose spikes/updates; never auto-install |
| Companion Journal | AgentGate | Human-facing proactive inbox linked to source evidence/run/request |
| Hosted App registry and presentation | AgentGate | Catalog, health, manifest, links, lifecycle visibility |
| App domain data | Each App | Never duplicate into AgentGate or MemoryGate wholesale |
| App AI requests | AgentGate AI Broker | Scoped capability request; centrally routed model/provider |
| App actions for AI | ToolGate MCP connector | Typed, approved operations against App domain service |

## 6. Technology Decisions

### Foundation (implement now)

- Keep React 19 + TypeScript + Vite + Tailwind + Radix.
- Keep TanStack Router for file routes and TanStack Query for server state.
- Use Zod for frontend validation of versioned facade responses.
- Use FastAPI/Pydantic for the dedicated AgentGate BFF.
- Use SSE for server-to-browser run/activity/trace updates; use POST/PATCH/DELETE for commands.
- Use Recharts only for real bounded telemetry histories.
- Use SVG/CSS for accessible security rings; do not use WebGL for the security map.
- Add `@xyflow/react` only when the Flow Constructor phase begins.
- Use Zustand only for local Flow canvas selection, undo/redo, and unsaved draft state; do not mirror server state in Zustand.
- Use versioned JSON Schema/Pydantic/Zod contracts for events, app manifests, character profiles, feedback, change proposals, evaluation Runs, and Flows.
- Spike Trivy first for broad package/image/filesystem/SBOM/vulnerability/license coverage; compare Syft+Grype and OSV-Scanner before standardizing.
- Use Renovate or a comparable proposal engine only to create reviewed update branches/PRs; no blind auto-merge.
- Spike promptfoo and DeepEval against the same small private regression set; select one primary evaluation runner.
- Use OpenTelemetry-compatible trace/span identifiers even if AgentGate initially stores events natively.
- Keep the researched repository catalog in `docs/references/` and review dependencies by pinned version, license, resource cost, telemetry, attack surface, and removal plan before adoption.

### Future presence (document now, do not install)

- Calls: WebRTC for media; WebSocket/data channel for bidirectional realtime events only when voice phase starts.
- Face landmarks: MediaPipe.
- Speech recognition: benchmark SenseVoice and faster-whisper; SenseVoice is preferred when emotion/audio-event tags are useful.
- Realtime TTS: benchmark a low-latency local engine first; Parler-TTS is a quality option, Bark is not the primary realtime engine because it is heavier and less deterministic.
- 2D presence: Live2D-compatible adapter or layered 2D renderer.
- 3D presence: VRM with Three.js/React Three Fiber behind an adapter.
- Audio visualization: Web Audio API with real amplitude/FFT data.
- Emotion fusion: timestamped probability tracks, never asserted emotional truth.
- Raw camera/audio retention: opt-in and separate from derived metadata retention.

## 7. Phased Delivery

### Phase 0 — Documentation and contract freeze

Create the full documentation pack, reconcile terminology, choose one BFF path, inventory real upstream endpoints, and define acceptance matrices. No feature UI implementation proceeds until this phase is reviewed.

### Phase 1 — Source-bound shell and developer workflow

Create the final navigation, split frontend modules by domain, remove fixture/hardcoded runtime claims, standardize query keys/errors/status states, and establish a fast local UI loop against the server through a reviewed private tunnel/proxy.

### Phase 2 — Companion text foundation and Chats

Build the text-only Main Companion space and Journal; complete session list/detail, companion/group views, dual incognito semantics, source toggles, structured runtime activity, and safe artifact links. No voice/avatar runtime.

### Phase 3 — Approvals, Jobs, Capabilities, Memory, Apps, System

Complete the existing high-value operational surfaces using real contracts. Split Jobs from ToolGate Automations. Build the source-bound security-layer map and App manifest/catalog.

### Phase 4 — Workforce and Agent Studio

Implement Companion, Worker, Subagent, Chief, Team, and Character Profile taxonomy; build the full text/metadata Agent Studio with no live voice/3D dependency.

### Phase 5 — Orchestration foundation

Add Flow/Loop/Run/Trace contracts, a visual constructor, bounded loop guardrails, live Run viewer, activity timeline, and source-bound handoff evidence.

### Phase 6 — Proactive Automation, continuous improvement, and App platform

Route repeated-pattern proposals through the Main Companion; connect accepted proposals to ToolGate AI drafting/validation/approval; add response feedback, versioned change proposals, regression evaluation, Software Supply Chain inventory/update proposals, Technology Intelligence Jobs, and the App AI Broker/HTTP+MCP contracts.

### Deferred Phase 7 — Voice

Only after Phases 0–6 pass on current hardware: streaming ASR/TTS, barge-in, waveform, call timeline, and retention controls.

### Deferred Phase 8 — Character presence

Only after voice is stable: 2D/Live2D first, then optional VRM/3D, rooms, idle/working states, chibi expression packs, outfits, and call composition.

### Deferred Phase 9 — Camera/emotion and group calls

Opt-in face landmarks, voice/face emotion probability tracks, Developer Mode overlays, synchronized call inspection, and resource-bounded group calls.

---

## 8. Detailed Task Plan

### Task 1: Create the documentation index and supersession policy

**Objective:** Establish one authoritative entry point and prevent workers from treating conflicting root notes as current requirements.

**Files:**
- Create: `docs/README.md`
- Create: `docs/development/documentation-rules.md`
- Modify later: `README.md`
- Modify later: `AGENTGATE_PRODUCT_NOTES.md`
- Modify later: `AGENTGATE_IMPLEMENTATION_PLAN.md`
- Modify later: `agentgate-ui-requirements.md`

**Steps:**
1. Write `docs/README.md` with document categories, authority order, status labels, and links.
2. Define labels: `authoritative`, `contract`, `decision`, `roadmap`, `historical`.
3. State that chat summaries and screenshots are not source of truth until captured in docs.
4. Add superseded banners to the three old root documents without deleting content.
5. Run `npx --yes pnpm@10.34.5 format:check` from `dashboard/`; expect no unrelated formatting changes.
6. Commit: `docs: establish AgentGate documentation authority`.

### Task 2: Capture product vision and principles

**Objective:** Preserve the full personal AI operating-system vision independently of implementation details.

**Files:**
- Create: `docs/product/vision.md`
- Create: `docs/product/principles.md`
- Create: `docs/product/scope-and-phases.md`

**Steps:**
1. Document Conker as Main Companion and Chief.
2. Document proactive QoL discovery, Journal delivery, Team/Flow execution, ToolGate approval, and App creation loop.
3. Document local-first, owner-only, modular, source-bound, and safety principles.
4. Document text-first scope and explicitly deferred voice/presence phases.
5. Add concrete non-goals: fake dashboards, browser-held secrets, unbounded autonomy, duplicated gate engines, automatic heavy runtime installs.
6. Commit: `docs: define AgentGate product vision and principles`.

### Task 3: Freeze the product taxonomy

**Objective:** Give every frontend/backend object exactly one meaning.

**Files:**
- Create: `docs/product/taxonomy.md`
- Create: `docs/decisions/0003-jobs-vs-toolgate-automations.md`

**Steps:**
1. Define Agent Definition, Character Profile, Companion, Main Companion, Chief, Worker, Subagent, Team, Flow, Loop, Run, Trace, Activity, System Log, Job, Tool, Skill, ToolGate Automation, Approval, Memory, Journal Entry, App, App Manifest, and Setting.
2. Include “is/is not” examples for each term.
3. Include forbidden ambiguous terms such as “chat team” and “automation = cron.”
4. Add migration mapping from current routes/data names.
5. Commit: `docs: freeze AgentGate domain vocabulary`.

### Task 4: Define UX placement and interaction rules

**Objective:** Make screen/dialog/drawer/settings choices deterministic.

**Files:**
- Create: `docs/ux/placement-rules.md`
- Create: `docs/ux/interaction-patterns.md`
- Create: `docs/product/copy-and-status-language.md`

**Steps:**
1. Define when to use screen, dialog, drawer, popover, Studio, and Settings.
2. Define source status vocabulary: live, degraded, offline, stale, blocked, empty, planned, unknown.
3. Ban fake connected/healthy/collaboration claims.
4. Define user language versus backend labels.
5. Define motion law: every operational animation needs a real event; future character idle animation is explicitly a presence feature, not operational evidence.
6. Commit: `docs: define AgentGate UX placement and status rules`.

### Task 5: Define final information architecture and owner journeys

**Objective:** Freeze navigation and prove it supports real owner workflows.

**Files:**
- Create: `docs/product/information-architecture.md`
- Create: `docs/product/owner-journeys.md`

**Steps:**
1. Document final sidebar groups and footer.
2. Map all current routes to keep, rename, merge, redirect, or remove.
3. Write journeys for morning briefing, normal chat, approval, Job failure, Team Run, ToolGate Automation proposal, Memory correction, hosted App creation, and system incident.
4. Verify every journey has a source of truth and approval boundary.
5. Commit: `docs: map AgentGate information architecture and journeys`.

### Task 6: Write Companion, Command, Chats, and Approvals screen specifications

**Objective:** Define the first human-facing vertical slices in enough detail to build without guessing.

**Files:**
- Create: `docs/ux/screens/companion.md`
- Create: `docs/ux/screens/command.md`
- Create: `docs/ux/screens/chats.md`
- Create: `docs/ux/screens/approvals.md`

**Steps:**
1. For every screen document purpose, routes, data contract, desktop/mobile layout, empty/loading/stale/error states, actions, keyboard behavior, and acceptance tests.
2. Companion: Journal tabs `Today`, `Found for you`, `Completed`, `Needs you`, `Building`, `History`; text-only initially.
3. Command: operational summary, real vitals, pending approvals, active Runs/Jobs, recent activity; remove hardcoded histories.
4. Chats: Sessions, Companions, Group Chats; define dual incognito and Web/Memory/Tools source controls.
5. Approvals: exact immutable binding, source, expiry, decision reconciliation, inline mirrors.
6. Commit: `docs: specify Companion Command Chats and Approvals`.

### Task 7: Write Workforce and Agent Studio specifications

**Objective:** Separate human-facing characters from runtime workers and temporary subagents.

**Files:**
- Create: `docs/ux/screens/workforce.md`
- Create: `docs/ux/screens/agent-studio.md`
- Create: `docs/contracts/character-profile-schema.md`

**Steps:**
1. Define Workforce tabs: Companions, Workers, Teams, Runtime Instances/Runs.
2. Define Agent Studio sections: Overview, Identity, Soul & Behaviour, Models & Reasoning, Memory, Capabilities, Permissions, Proactivity, Teams & Flows, Activity, Versions.
3. Include Appearance & Scene and Voice & Speech as metadata-only future sections with explicit unavailable state in the initial phase.
4. Define presentation profile linkage by stable `agent_id`; personality never changes grants.
5. Define versioning and rollback expectations.
6. Commit: `docs: specify Workforce and Agent Studio`.

### Task 8: Write Orchestration, Flow, Loop, Run, and Trace specifications

**Objective:** Define observable multi-agent collaboration and a bounded visual constructor.

**Files:**
- Create: `docs/ux/screens/orchestration.md`
- Create: `docs/architecture/orchestration-model.md`
- Create: `docs/architecture/event-and-trace-model.md`
- Create: `docs/contracts/event-schema.md`

**Steps:**
1. Define Team = cast, Flow = choreography, Loop = bounded cycle, Run = execution.
2. Define constructor nodes: trigger, agent step, tool step, decision, parallel, review, approval, human input, memory read, memory candidate, delay, output, bounded loop.
3. Define loop guardrails: max iterations, deadline, token/cost budget, retry budget, stop condition, failure fallback, approval boundary.
4. Define structured event envelope with `schema_version`, event ID, timestamp, trace/run/parent IDs, actor, target, event type, safe summary, status, artifact refs, and approval refs.
5. Define Activity versus Trace versus System Log.
6. Define live Run viewer, edge handoff proof, timeline, filters, playback, and no hidden chain-of-thought exposure.
7. Commit: `docs: specify observable flows loops runs and traces`.

### Task 9: Write Jobs and Capabilities specifications

**Objective:** Correct the cron/Automation confusion and preserve ToolGate authority.

**Files:**
- Create: `docs/ux/screens/jobs.md`
- Create: `docs/ux/screens/capabilities.md`
- Create: `docs/decisions/0002-domain-ownership.md`

**Steps:**
1. Define Jobs list, detail, schedule, next/last run, output, failure, pause/resume/run/delete.
2. Define Capabilities tabs: Tools, Skills, ToolGate Automations, Connections.
3. Define Automation proposal lifecycle: trace pattern → Companion explanation → owner allows draft → ToolGate AI generates → validate → sandbox/dry run → permission manifest → owner approval → versioned library.
4. State that AgentGate does not execute arbitrary scripts or duplicate ToolGate editors.
5. Commit: `docs: separate Jobs from ToolGate Automations`.

### Task 10: Write Memory, Apps, System, and Settings specifications

**Objective:** Complete the hardware-light operational product map.

**Files:**
- Create: `docs/ux/screens/memory.md`
- Create: `docs/ux/screens/apps.md`
- Create: `docs/ux/screens/system.md`
- Create: `docs/ux/screens/settings.md`
- Create: `docs/contracts/app-manifest-schema.md`
- Create: `docs/contracts/security-posture-schema.md`

**Steps:**
1. Memory: search, facts/theories/context, candidates, entities, episodes, lineage, scopes; bounded views only.
2. Apps: registry, health, open, version, creator Run, App API status, MCP status, AI Broker scope, backups, stop/archive links through approved authority.
3. System: overview, AI Runtime, gates, resources, security, logs, terminal link; SystemGate remains read-only.
4. Security rings: layers, control state, evidence, source, checked time, remediation; no “secure” aggregate without evidence.
5. Settings: Models & Providers, privacy defaults, notification defaults, security/sessions, real global preferences only.
6. Commit: `docs: specify Memory Apps System and Settings`.

### Task 11: Write system architecture and BFF decisions

**Objective:** Remove the competing direct-Pi versus legacy-FastAPI ambiguity.

**Files:**
- Create: `docs/architecture/system-context.md`
- Create: `docs/architecture/data-ownership.md`
- Create: `docs/architecture/agentgate-bff.md`
- Create: `docs/architecture/repository-modules.md`
- Create: `docs/decisions/0001-single-agentgate-bff.md`

**Steps:**
1. Choose browser → AgentGate BFF → Pi/ToolGate/MemoryGate/SystemGate/AgentGate registry.
2. Define that `dashboard/vite.config.ts` targets the AgentGate BFF in the final development topology.
3. Inventory which endpoints in `api/agentgate/main.py` can be retained, rewritten, split, or removed.
4. Define separate clients in the BFF for Pi, ToolGate, MemoryGate, and SystemGate.
5. Ban unrestricted reverse proxy routes.
6. Define partial failure, timeout, redaction, correlation, and capability negotiation behavior.
7. Commit: `docs: choose one AgentGate backend facade`.

### Task 12: Write upstream capability matrix and facade contract

**Objective:** Ensure every UI action is backed by a real endpoint or explicitly blocked/planned.

**Files:**
- Create: `docs/contracts/upstream-capability-matrix.md`
- Create: `docs/contracts/facade-api.md`

**Steps:**
1. Record current Pi adapter endpoints for sessions, Jobs, agents, teams, model routes, approvals, Runs, and health.
2. Record ToolGate endpoints for status, tools, Automations, requests, services, events, and AI proposals.
3. Record MemoryGate endpoints for briefing, memory search, entities, episodes, evidence, patterns, and candidates.
4. Record SystemGate endpoints and missing `/security/posture` capability.
5. Mark each desired action `supported`, `requires facade`, `requires upstream`, `read-only`, or `deferred`.
6. Define versioned facade response schemas before any new screen code.
7. Commit: `docs: inventory upstream contracts and facade API`.

### Task 13: Document the hosted App platform and AI Broker

**Objective:** Make AI-built server Apps modular and provider-independent.

**Files:**
- Create: `docs/architecture/app-platform.md`
- Create: `docs/decisions/0006-app-http-plus-mcp.md`

**Steps:**
1. Define human client → App HTTPS API.
2. Define Agent → ToolGate → App MCP connector.
3. Define App → AgentGate AI Broker for scoped inference/agent requests.
4. Define App-owned domain data; MemoryGate receives only meaningful summaries/evidence.
5. Define App manifest, internal port, private route, health endpoint, data volume, permissions, MCP capabilities, AI scopes, backup policy, and version.
6. Define reverse-proxy naming so users do not remember random ports.
7. Define App creation lifecycle from Companion proposal through Team Run, ToolGate approval, deployment, registration, health, and Journal completion.
8. Commit: `docs: define modular hosted App platform`.

### Task 14: Document security boundaries and posture visualization

**Objective:** Turn the security-layer idea into an honest, source-bound contract.

**Files:**
- Create: `docs/architecture/security-boundaries.md`
- Create: `docs/decisions/0002-domain-ownership.md` if not already created; append security ownership only if unique.

**Steps:**
1. Define device, network, host, container, application, AI action, and data layers.
2. Define posture states and evidence freshness.
3. Define which controls SystemGate can observe and which require manual/configuration evidence.
4. Define browser exclusions and redaction.
5. Define quick System Info dialog summary versus full System Security screen.
6. Define threat model: endpoint compromise, prompt/tool abuse, session bugs, supply chain, container escape, stale backups, and unsafe generated Apps.
7. Commit: `docs: define AgentGate security posture model`.

### Task 15: Document future voice, camera, developer telemetry, and character presence

**Objective:** Preserve the ambitious presence design without burdening the foundation.

**Files:**
- Create: `docs/future/realtime-call-architecture.md`
- Create: `docs/future/developer-mode-telemetry.md`
- Create: `docs/future/character-presence.md`
- Create: `docs/future/voice-and-speech.md`
- Create: `docs/future/camera-and-emotion.md`
- Create: `docs/future/group-calls-and-scaling.md`
- Create: `docs/decisions/0004-sse-before-websockets.md`
- Create: `docs/decisions/0005-text-first-presence-later.md`

**Steps:**
1. Document synchronized camera metadata, audio metadata, transcript, agent content, TTS, expression, and animation tracks.
2. Document Developer Mode face mesh, confidence distribution, waveform, latency, channels, packet loss, and call timeline.
3. Document Presence Avatar, chibi emotion portrait pack, room/scene, animation states, outfits, and per-device display/performance controls.
4. Document 2D/Live2D-first and optional VRM/3D adapter strategy.
5. Document retention defaults and opt-in raw media recording.
6. Document group-call turn taking and on-demand agent inference instead of continuously running all models.
7. Include copyright/licensing rule: product ships upload/adapters, not unlicensed characters.
8. Commit: `docs: preserve future realtime companion architecture`.

### Task 16: Build the revised roadmap and acceptance matrix

**Objective:** Convert the documentation into ordered, reviewable delivery gates.

**Files:**
- Create: `docs/roadmap/foundation.md`
- Create: `docs/roadmap/future-presence.md`
- Create: `docs/roadmap/acceptance-matrix.md`

**Steps:**
1. Map every screen to required facade endpoints and upstream support.
2. Define “done” as real data plus loading/empty/stale/degraded/error states and tests.
3. Separate Phases 0–6 from deferred Phases 7–9.
4. Add hardware budget and performance acceptance for each future phase.
5. Add explicit stop gates: no voice until foundation E2E passes; no avatar until voice works; no camera emotion until retention/privacy UX works.
6. Commit: `docs: define AgentGate phased roadmap and gates`.

### Task 17: Establish the fast local UI development loop

**Objective:** Remove the repeated edit/push/remote-build cycle for ordinary UI work.

**Files:**
- Create: `docs/development/fast-ui-loop.md`
- Modify later: `dashboard/vite.config.ts`
- Create later: `dashboard/.env.development.example`

**Steps:**
1. Document a private SSH/Tailscale port-forward from local Windows to the server BFF.
2. Run the dashboard locally from `C:/Users/The1a/agentgate-work/dashboard` so Vite HMR reflects edits immediately.
3. Keep secrets server-side; local Vite talks only to a forwarded same-origin-like BFF target.
4. Document remote deployment only for verified checkpoints, not every CSS edit.
5. Add a health preflight and contract check before local dev starts.
6. Verify local HMR with a harmless text change, then revert it.
7. Commit: `docs: add fast AgentGate UI development loop`.

### Task 18: Create shared frontend contracts and test harness

**Objective:** Replace the growing monolithic `features/agentgate/api.ts` with versioned domain contracts and deterministic fixtures.

**Files:**
- Create: `dashboard/src/lib/agentgate/api-client.ts`
- Create: `dashboard/src/lib/agentgate/query-keys.ts`
- Create: `dashboard/src/lib/agentgate/contracts/common.ts`
- Create: `dashboard/src/lib/agentgate/contracts/companion.ts`
- Create: `dashboard/src/lib/agentgate/contracts/chats.ts`
- Create: `dashboard/src/lib/agentgate/contracts/approvals.ts`
- Create: `dashboard/src/lib/agentgate/contracts/workforce.ts`
- Create: `dashboard/src/lib/agentgate/contracts/orchestration.ts`
- Create: `dashboard/src/lib/agentgate/contracts/jobs.ts`
- Create: `dashboard/src/lib/agentgate/contracts/capabilities.ts`
- Create: `dashboard/src/lib/agentgate/contracts/memory.ts`
- Create: `dashboard/src/lib/agentgate/contracts/apps.ts`
- Create: `dashboard/src/lib/agentgate/contracts/system.ts`
- Create: `dashboard/src/test-utils/agentgate-fixtures.ts`
- Test: `dashboard/src/lib/agentgate/api-client.test.ts`

**TDD steps:**
1. Write failing tests for safe JSON errors, CSRF mutation headers, version validation, and secret-shaped field rejection in fixtures.
2. Run `npx --yes pnpm@10.34.5 test -- src/lib/agentgate/api-client.test.ts`; expect failure.
3. Implement the minimal client and Zod contracts.
4. Run the targeted test; expect pass.
5. Run `npx --yes pnpm@10.34.5 build`; expect pass.
6. Commit: `refactor: add versioned AgentGate frontend contracts`.

### Task 19: Refactor the AgentGate BFF into bounded domain clients

**Objective:** Turn `api/agentgate/main.py` from a monolith into the single reviewed facade.

**Files:**
- Modify: `api/agentgate/main.py`
- Modify: `api/agentgate/config.py`
- Modify: `api/agentgate/upstream.py`
- Create: `api/agentgate/routes/`
- Create: `api/agentgate/clients/pi.py`
- Create: `api/agentgate/clients/toolgate.py`
- Create: `api/agentgate/clients/memorygate.py`
- Create: `api/agentgate/clients/systemgate.py`
- Create: `api/agentgate/schemas/`
- Create: `api/tests/contracts/`
- Modify: `api/tests/test_core.py`

**TDD steps:**
1. Write a failing contract test for one bounded aggregate route and one upstream failure.
2. Run `python -m pytest api/tests -q`; expect the new test to fail.
3. Extract one client and one route without changing response behavior.
4. Re-run the targeted test; expect pass.
5. Repeat per domain with frequent commits.
6. Add redaction tests for authorization, cookies, provider URLs, host paths, raw prompts, and tool args.
7. Commit each extraction separately: `refactor(api): extract <domain> facade`.

### Task 20: Replace navigation and eliminate fake destination concepts

**Objective:** Make the shell match the authoritative information architecture.

**Files:**
- Modify: `dashboard/src/components/layout/data/sidebar-data.ts`
- Modify: `dashboard/src/components/layout/app-sidebar.tsx`
- Modify: `dashboard/src/routes/_authenticated/`
- Modify: `dashboard/src/routeTree.gen.ts` only through TanStack generation
- Test: `dashboard/src/components/layout/app-sidebar.test.tsx`

**TDD steps:**
1. Write failing navigation tests for Companion, Chats, Approvals, Command, Orchestration, Workforce, Jobs, Capabilities, Memory, Apps, System, and Settings footer.
2. Verify Suggestions and merged Automations are absent as final destinations.
3. Run the targeted test; expect failure.
4. Implement route shells with honest unavailable/empty states only where contracts are missing.
5. Generate route tree using `npx --yes @tanstack/router-cli generate`.
6. Run test/build; expect pass.
7. Commit: `ui: adopt final AgentGate information architecture`.

### Task 21: Remove hardcoded operational claims from Command

**Objective:** Make Command truthful before adding new features.

**Files:**
- Modify: `dashboard/src/features/agentgate/command.tsx`
- Modify: `dashboard/src/features/agentgate/core.tsx`
- Create: `dashboard/src/features/command/command-page.tsx`
- Test: `dashboard/src/features/command/command-page.test.tsx`

**TDD steps:**
1. Write failing tests proving fake histories, fixed free-memory text, default confidence, and specimen live labels do not render without source data.
2. Run targeted test; expect failure.
3. Render explicit empty/stale/unavailable states from real facade data.
4. Keep operational animation disabled unless a real event source exists.
5. Run tests/build; expect pass.
6. Commit: `fix: remove unsourced Command telemetry`.

### Task 22: Implement the text-only Companion Journal

**Objective:** Replace Suggestions with the Main Companion's human-facing proactive inbox.

**Files:**
- Create: `dashboard/src/features/companion/`
- Create: `dashboard/src/routes/_authenticated/companion.tsx`
- Modify: `api/agentgate/db.py`
- Create: `api/agentgate/routes/journal.py`
- Test: `dashboard/src/features/companion/companion-page.test.tsx`
- Test: `api/tests/test_journal.py`

**TDD steps:**
1. Define Journal entry schema with source/evidence/status/actions.
2. Write failing backend state-transition tests.
3. Implement minimal Journal storage/migration preserving old suggestions through a migration adapter.
4. Write failing frontend tests for Today, Found for you, Completed, Needs you, Building, History.
5. Implement text-only UI with `Ask Conker`, dismiss, save, and related approval/run/app links.
6. Verify no voice/avatar dependency is imported.
7. Commit backend and frontend separately.

### Task 23: Complete Chats as the relationship surface

**Objective:** Support Sessions, Companions, and Group Chats without mixing agent configuration into conversation UI.

**Files:**
- Modify/extract: `dashboard/src/features/agentgate/chats.tsx`
- Modify/extract: `dashboard/src/features/agentgate/chat-detail.tsx`
- Create: `dashboard/src/features/chats/`
- Modify: `dashboard/src/routes/_authenticated/chats/`
- Create tests under: `dashboard/src/features/chats/*.test.tsx`

**TDD steps:**
1. Test session list, companion filter, group chat labeling, and no worker contact unless promoted.
2. Test both incognito toggles and their exact guarantee text.
3. Test Web/Memory/Tools source controls as permissions/preferences, not forced execution claims.
4. Test structured tool/subagent activity, stop, reconnect, failure, and approval mirrors.
5. Implement incrementally against real facade contracts.
6. Commit per journey.

### Task 24: Complete Approvals, Jobs, Capabilities, Memory, Apps, and System slices

**Objective:** Deliver the useful non-heavy control plane before Workforce and Orchestration complexity.

**Files:**
- Extract current pages from `dashboard/src/features/agentgate/` into domain directories.
- Create domain tests for each feature.
- Add/modify bounded BFF routes under `api/agentgate/routes/`.

**Steps:**
1. Approvals: exact binding and read-back verification after decisions.
2. Jobs: migrate `/api/cron/jobs` owner language to Jobs while preserving runtime contract.
3. Capabilities: separate ToolGate Automations from Jobs.
4. Memory: bounded search and lineage links; no broad raw evidence.
5. Apps: registry and manifest health only; no arbitrary process control.
6. System: real vitals/containers/backups/error logs/packages; security posture marks missing evidence unknown.
7. Run frontend tests, backend tests, build, lint, and secret scan after each domain.
8. Commit each domain separately.

### Task 25: Implement Workforce and metadata-only Agent Studio

**Objective:** Create professional classification and configuration without voice/3D runtime work.

**Files:**
- Create: `dashboard/src/features/workforce/`
- Create: `dashboard/src/features/agent-studio/`
- Create routes under: `dashboard/src/routes/_authenticated/workforce/`
- Add BFF joins for Pi agent/team data and AgentGate character metadata.
- Add tests in both frontend and backend.

**Steps:**
1. Companions list and detail.
2. Workers list and strict role contract.
3. Teams list, roles, grants, and runtime status.
4. Runtime subagents shown as instances, not editable characters.
5. Agent Studio sections for identity, soul, models, memory, capabilities, permissions, proactivity, teams/flows, activity, and versions.
6. Appearance/Voice sections store only future metadata and show “runtime not installed”; no generated fake preview.
7. Commit per entity type.

### Task 26: Implement Flow/Loop contracts and read-only Run viewer

**Objective:** Prove observable collaboration before building the visual editor.

**Files:**
- Add Pi adapter contract work in its repository after a separate reviewed plan.
- Create: `dashboard/src/features/orchestration/`
- Create: `dashboard/src/lib/agentgate/event-bus.ts`
- Add BFF run/trace routes.
- Add tests for event ordering, unknown events, reconnect, and redaction.

**Steps:**
1. Implement versioned event normalization.
2. Render Run list and trace timeline from real events.
3. Render read-only graph from a Flow definition.
4. Animate edges only for actual handoff events.
5. Show blocked/approval/error/completed states.
6. Verify safe summaries do not expose hidden reasoning or raw broad tool args.
7. Commit: `feat: add observable orchestration runs`.

### Task 27: Implement the Flow/Loop Constructor

**Objective:** Let the owner arrange two or more agents into ordered, parallel, conditional, and bounded-loop work.

**Files:**
- Add dependency: `@xyflow/react`
- Create: `dashboard/src/features/orchestration/flow-builder/`
- Create: `dashboard/src/features/orchestration/flow-builder-store.ts`
- Add schema validators and API endpoints.
- Add unit and browser tests.

**TDD steps:**
1. Test valid linear flow serialization.
2. Test rejection of orphan nodes, missing outputs, illegal cycles, and unbounded loops.
3. Test parallel and approval nodes.
4. Test undo/redo and unsaved-change warning.
5. Implement minimal canvas after schema tests pass.
6. Test save, plan/check, approval, start Run, and source-bound live trace.
7. Commit schema, canvas, and execution integration separately.

### Task 28: Integrate Companion-driven ToolGate Automation proposals

**Objective:** Preserve ToolGate AI authority while making Conker the user-facing proposer.

**Files:**
- Create Companion Journal proposal type.
- Add bounded ToolGate AI proposal facade routes.
- Add proposal detail UI linked to ToolGate request/approval.
- Add contract tests.

**Steps:**
1. Ingest repeated-pattern summaries from traces/logs without raw secret arguments.
2. Let Conker explain expected benefit, evidence, risk, and proposed sequence.
3. Require owner consent before drafting if generation consumes resources or accesses sensitive context.
4. Submit to ToolGate AI local planner.
5. Show generated manifest, validation, sandbox/dry-run results, diff, permissions, and rollback.
6. Require ToolGate approval before installation.
7. Verify Automation appears in Capabilities, not Jobs.
8. Commit per lifecycle state.

### Task 29: Implement App manifests and central AI Broker foundation

**Objective:** Make generated Apps modular without embedding Gemini/provider keys in each App.

**Files:**
- Extend AgentGate App registry models and routes.
- Create: `api/agentgate/routes/ai_broker.py`
- Create: `api/agentgate/schemas/app_manifest.py`
- Add frontend App detail and health views.
- Add contract/security tests.

**Steps:**
1. Validate versioned App manifest.
2. Register human API, health, MCP capability references, AI scopes, data ownership, resources, and backup policy.
3. Implement one bounded AI Broker capability with no provider secret returned.
4. Implement one test App fixture exposing HTTP API and MCP metadata.
5. Verify Agent → ToolGate → App MCP and User → App API remain separate.
6. Verify App domain data remains in the App; only summaries/evidence enter MemoryGate.
7. Commit registry, broker, and test fixture separately.

### Task 30: Foundation-wide quality gate

**Objective:** Prove the text-first product is complete before any heavy presence work begins.

**Files:**
- Create/update: `docs/roadmap/acceptance-matrix.md`
- Create E2E tests under the existing dashboard/browser harness.
- Create backend contract tests under `api/tests/contracts/`.

**Verification commands:**

```bash
cd C:/Users/The1a/agentgate-work/dashboard
npx --yes pnpm@10.34.5 format:check
npx --yes pnpm@10.34.5 lint
npx --yes pnpm@10.34.5 test
npx --yes pnpm@10.34.5 build
npx --yes pnpm@10.34.5 knip
```

```bash
cd C:/Users/The1a/agentgate-work
python -m pytest api/tests -q
```

**Required E2E journeys:**
1. Owner login/logout and CSRF mutation.
2. Companion Journal item arrives with source evidence and opens related chat.
3. Text chat streams, shows safe activity, stops, reconnects, and preserves session.
4. Approval read-back proves the exact source decision.
5. Job create/edit/pause/resume/run/delete works without appearing as a ToolGate Automation.
6. ToolGate Automation is visible under Capabilities only.
7. Memory search shows bounded results and evidence links.
8. App registration, health, open, and MCP/AI-scope status work.
9. System outage leaves other domains usable and marks status degraded.
10. Security ring shows verified/unknown/degraded with evidence timestamps.
11. Companion/Worker/Team classification remains distinct.
12. Flow Run displays real handoffs and bounded Loop state.
13. Production bundle secret scan finds no provider/gate keys, raw URLs, or secret-shaped fixture values.
14. Desktop and 380px mobile screenshots exist for every implemented screen.
15. No voice, camera, face model, TTS, Live2D, Three.js, VRM, or 3D dependency is installed in the foundation release.

**Commit:** `test: verify AgentGate text-first foundation`.

### Task 31: Publish the researched reference library

**Objective:** Convert the companion plan catalog into committed, maintainable product references instead of leaving repository links buried in chat.

**Files:**
- Create: `docs/references/README.md`
- Create: `docs/references/technology-catalog.md`
- Create: `docs/references/orchestration-and-observability.md`
- Create: `docs/references/evaluation-and-self-improvement.md`
- Create: `docs/references/supply-chain-and-updates.md`
- Create: `docs/references/mcp-and-app-platform.md`
- Create: `docs/references/chinese-ai-ecosystem.md`
- Create: `docs/references/realtime-presence.md`
- Create: `docs/references/source-monitoring.md`

**Steps:**
1. Start from `.hermes/plans/2026-08-26_012753-agentgate-reference-technology-catalog.md`.
2. For every repository record URL, intended feature, license, adoption decision, runtime/resource requirements, security/telemetry concerns, smallest spike, and removal plan.
3. Separate `adopt candidate`, `integrate through adapter`, `study patterns`, `deferred`, and `reject for now`.
4. Pin any adopted dependency to a reviewed version/tag; never depend on a moving `main` branch.
5. Add review dates and a quarterly stale-reference Job.
6. Commit: `docs: add AgentGate technology reference library`.

### Task 32: Define and implement Software Supply Chain inventory

**Objective:** Track packages/libraries as inspectable system components without turning AgentGate into a package manager or host shell.

**Files:**
- Create: `docs/architecture/software-supply-chain.md`
- Create: `docs/ux/screens/software-supply-chain.md`
- Create: `docs/contracts/software-component-schema.md`
- Create: `docs/decisions/0007-software-supply-chain-ownership.md`
- Create later in SystemGate: read-only SBOM/inventory scanner module and tests
- Create: `dashboard/src/features/system/supply-chain/`
- Create tests for inventory, vulnerability, license, stale, unknown, and partial scan states

**Component classes:**
- OS packages (`apt`, base image packages).
- Container images and image digests.
- JavaScript direct/transitive dependencies and lockfiles (`pnpm`, `npm`, `yarn`).
- Python direct/transitive dependencies and lockfiles (`uv`, `pip`, Poetry where present).
- Go/Rust/Java/.NET packages when a hosted App uses those ecosystems.
- MCP server packages, model/runtime binaries, downloaded models, and system libraries.
- Hosted App manifests and their SBOM references.

**Required fields:**
- stable component ID/PURL when available;
- ecosystem/name/version/directness;
- source project/container/App;
- lockfile/image digest/provenance;
- license and confidence;
- known vulnerabilities, severity, fix availability, exploitability context;
- latest known version and update type;
- first/last observed timestamps;
- scanner/tool version and checked time;
- status: current, outdated, vulnerable, unsupported, unpinned, unknown, ignored with reason;
- owner, update policy, test suite, rollback reference.

**TDD steps:**
1. Write schema tests for package, container, and unknown component records.
2. Write a failing SystemGate contract test proving secrets, host paths, and unbounded package output are excluded.
3. Spike Trivy against one AgentGate image and one source tree; record duration, peak resources, package coverage, licenses, vulnerabilities, and output size.
4. Spike Syft+Grype and OSV-Scanner on the same targets.
5. Select the smallest combination that meets the contract; do not run three permanent scanners.
6. Store generated SBOM artifacts server-side and return bounded summaries plus opaque references.
7. Build `System → Software Supply Chain` with overview, Components, Vulnerabilities, Licenses, Updates, Scans, and per-App/container filters.
8. Verify the screen remains useful when one scanner is missing or stale.
9. Commit scanner, contract, and UI separately.

### Task 33: Build the safe dependency update proposal pipeline

**Objective:** Allow automatic discovery and testing of updates while preventing silent package installation or production breakage.

**Files:**
- Create: `docs/decisions/0008-proposals-not-silent-updates.md`
- Create BFF schemas/routes for update proposals and evaluations
- Add ToolGate capability/Automation only after a separate ToolGate plan and approval
- Create frontend proposal/diff/test views under `dashboard/src/features/system/supply-chain/`
- Add backend/frontend tests

**Pipeline:**

```text
Inventory scan
  -> update candidate
  -> release notes/license/security review
  -> compatibility/risk classification
  -> isolated branch or image rebuild
  -> lockfile update
  -> unit/lint/build/contract/E2E tests
  -> SBOM and vulnerability re-scan
  -> before/after diff
  -> owner approval
  -> canary/reviewed deployment
  -> health verification
  -> promote or rollback
```

**Policy:**
- Patch updates may be auto-tested, never silently deployed in foundation.
- Minor updates require compatibility/test evidence and owner approval.
- Major updates require explicit migration review.
- Security emergency updates surface urgently but still preserve rollback and exact action binding.
- Lockfile, image digest, and package provenance must be updated atomically.
- Renovate/Dependabot may generate branches/PRs; ToolGate owns local execution; AgentGate owns presentation and approval links.

**TDD steps:**
1. Test risk classification and blocked missing-test state.
2. Test exact binding to repo, branch, lockfile/image digest, candidate version, and test artifact digest.
3. Test failed build, failed security re-scan, expired approval, changed branch, successful canary, and rollback.
4. Verify AgentGate never receives package-manager credentials or arbitrary shell commands.
5. Commit: `feat: add reviewed software update proposals`.

### Task 34: Add response feedback and correction marks

**Objective:** Let the owner express what was good or wrong in a way that supports evaluation and future improvement without treating a single like/dislike as truth.

**Files:**
- Create: `docs/product/continuous-improvement.md`
- Create: `docs/contracts/feedback-event-schema.md`
- Create: `docs/ux/screens/improvement-review.md`
- Create: `dashboard/src/features/chats/components/response-feedback.tsx`
- Create: `dashboard/src/features/chats/components/response-feedback.test.tsx`
- Add AgentGate BFF feedback routes/storage and backend tests

**Feedback UX:**
- Like.
- Dislike.
- Optional structured reasons: factually wrong, misunderstood intent, ignored context, too verbose, too short, bad tone, unsafe, bad tool choice, failed action, slow, excellent reasoning, excellent tone, other.
- Optional owner note/correction.
- Optional selected text mark linked to exact message span.
- “Use this as a regression example” explicit toggle for sensitive content.

**Feedback event fields:**
- feedback ID and timestamp;
- message/session/agent IDs;
- agent, prompt/SOUL, skill, tool, model route, and app versions active for the response;
- rating and reason tags;
- owner note and selected-span reference;
- safe context/artifact references, never hidden chain-of-thought;
- privacy/incognito status;
- eligible-for-evaluation flag;
- resolution/change-proposal links.

**TDD steps:**
1. Test like/dislike without a note.
2. Test selected-text correction and sensitive evaluation opt-out.
3. Test incognito behavior and deletion/retention policy.
4. Test duplicate update/idempotency and cross-version links.
5. Test that one feedback item cannot directly mutate an Agent/Skill/prompt.
6. Commit backend and frontend separately.

### Task 35: Implement versioned continuous-improvement proposals

**Objective:** Turn patterns from chats, ratings, marks, traces, and failures into evaluated change proposals for prompt-based and configuration-based artifacts.

**Files:**
- Create: `docs/architecture/continuous-improvement-loop.md`
- Create: `docs/contracts/change-proposal-schema.md`
- Create: `docs/contracts/evaluation-run-schema.md`
- Create: `docs/decisions/0009-feedback-requires-evaluation.md`
- Create BFF proposal/evaluation routes and storage
- Create `dashboard/src/features/improvement-review/`
- Add tests and a small local evaluation fixture set

**Artifact classes and authority:**
- Companion/Chief SOUL and prompts: authoritative profile repository/version store.
- Worker role/instruction: Pi runtime definition.
- Skill: skill repository/version.
- Tool: ToolGate proposal and approval.
- ToolGate Automation: ToolGate versioned workflow and approval.
- Job: Pi Job configuration and owner approval for changed schedule/model/tools.
- Flow/Loop: Pi orchestration definition and bounded validation.
- Hosted App: App repository/build/deployment pipeline.
- Package/library/image: Software Supply Chain pipeline.

**Improvement loop:**

```text
Feedback/traces/failures
  -> cluster by artifact and version
  -> identify repeatable failure pattern
  -> create cited improvement hypothesis
  -> create candidate version/diff
  -> build regression cases from owner-approved examples
  -> run current vs candidate on fixed dataset
  -> measure quality, safety, latency, cost, and tool behavior
  -> adversarial/edge-case evaluation
  -> proposal with evidence and uncertainty
  -> owner approval according to risk
  -> canary target or limited traffic
  -> monitor feedback/regressions
  -> promote or automatic rollback to previous version
```

**Rules:**
- Likes/dislikes are signals, not ground truth.
- Never optimize only for approval rate; preserve correctness, safety, uncertainty, and user autonomy.
- Candidate generation cannot edit the evaluator's rules or its own approval threshold.
- Evaluation examples are versioned, reviewable, and privacy-scoped.
- No hidden chain-of-thought is stored or compared.
- Agent/Skill prompt changes begin owner-approved only; later trusted canaries require a separate policy decision.

**Evaluation framework spike:**
1. Create five deterministic local examples: factual correction, tone correction, tool misuse, verbosity preference, and safety boundary.
2. Run the same set through promptfoo and DeepEval.
3. Compare local model support, custom metrics, privacy, runtime, artifacts, and CI integration.
4. Select one primary runner and record ADR; keep native unit/contract tests authoritative for deterministic behavior.
5. Build side-by-side current/candidate review with exact diff and per-case outcomes.
6. Commit proposal registry, evaluator adapter, and review UI separately.

### Task 36: Add weekly Technology Intelligence Jobs

**Objective:** Continuously learn from global and Chinese AI ecosystems while respecting source access, verifying originals, and producing useful Companion Journal findings instead of noisy copied hype.

**Files:**
- Create: `docs/product/technology-intelligence.md`
- Create: `docs/architecture/technology-intelligence-pipeline.md`
- Create: `docs/decisions/0010-public-authorized-intelligence-sources.md`
- Create: `docs/references/source-monitoring.md`
- Create Pi Job templates only after source contracts exist
- Add ToolGate bounded research connectors only through separate reviewed proposals
- Add tests for source provenance, dedupe, translation, ranking, and injection handling

**Source tiers:**
1. Origin/research: GitHub releases/trending, arXiv, Hugging Face, official model/framework blogs, standards, security advisories.
2. Chinese adaptation/productization: ModelScope, Gitee, OpenI, GitCode, AgentScope, Qwen, Dify, RAGFlow, MetaGPT, ChatDev, Bilibili technical sources, Zhihu, Juejin, CSDN, InfoQ China, 机器之心, 量子位, PaperWeekly, and public/authorized WeChat Official Account feeds.
3. Western social signal: X and Instagram only through official APIs, owner-authorized exports, or terms-compliant connectors; no credential scraping.

**Weekly Jobs:**
- `technology-radar-global`: releases, papers, models, security, developer tools.
- `technology-radar-china`: Chinese repositories, communities, productization patterns, demos, benchmarks, and source links.
- `agentgate-reference-refresh`: updates existing catalog entries and flags stale/archived/license-changed projects.
- `agent-skill-quality-review`: clusters owner feedback and drafts improvement hypotheses.
- `supply-chain-update-review`: scans dependencies/images and prepares update proposals.

**Pipeline:**

```text
collect public/authorized source metadata
  -> preserve original URL/time/author/language
  -> treat all content as untrusted
  -> normalize and translate without discarding original
  -> deduplicate against origin and prior findings
  -> locate primary/original source
  -> classify: paper, model, library, product, demo, security, workflow, rumor
  -> score relevance, novelty, evidence, license, cost, hardware, safety
  -> compare with AgentGate capabilities/gaps
  -> propose: ignore, watch, reference update, spike, dependency update, Skill/Tool/App idea
  -> Conker presents high-value findings in Journal
  -> owner chooses whether any proposal advances
```

**Anti-hype and anti-copy rules:**
- Chinese adaptation sources are valuable because they often reveal rapid productization, but nationality is not evidence of quality.
- Always trace claims to original repositories/papers/models when possible.
- Preserve license and attribution; do not copy private code/content or bypass paywalls/authentication.
- No source text becomes an instruction to the agent.
- No finding installs packages, edits prompts, or creates tools automatically.
- Rank by actual AgentGate leverage, not likes/views alone.
- Set weekly token/time/source budgets and stop on repeated rate limits.

**TDD steps:**
1. Test duplicate Western-origin/Chinese-summary collapse while preserving both citations.
2. Test translation retains original title/URL.
3. Test prompt-injection text remains inert evidence.
4. Test unsupported/private source becomes blocked rather than scraped.
5. Test one finding becomes a Journal item and then an owner-approved spike proposal.
6. Test low-value items remain in the research archive and do not notify.
7. Commit source registry, normalizer, ranking, and Job templates separately.

## 9. Risks and Tradeoffs

1. **Competing backend paths:** Direct Vite→Pi and old AgentGate FastAPI currently coexist. Phase 0/Task 11 must choose and migrate without breaking owner auth.
2. **Upstream capability gaps:** Visual Flows/Loops require Pi adapter contracts that may not exist. Do not fake execution; ship read-only unavailable states until upstream is implemented and tested.
3. **Scope size:** This is a platform, not one screen. Documentation and vertical slices must be reviewed independently.
4. **Character scope:** Metadata-only Agent Studio may tempt appearance work early. Enforce the phase gate.
5. **Source-bound motion:** Existing Core/specimen animations conflict with the no-fake-state rule. Operational motion must derive from events; future presence idle animation belongs to a separate optional mode.
6. **System security evidence:** SystemGate does not currently expose every desired security control. Unknown/configured-unverified states are mandatory until evidence exists.
7. **MCP misuse:** MCP is for agent-to-service operations, not the primary phone/web App transport.
8. **Generated code:** ToolGate AI output is untrusted until validated, sandboxed, permissioned, owner-approved, versioned, and rollback-capable.
9. **Memory duplication:** Apps and AgentGate must not copy detailed domain data into MemoryGate; submit bounded evidence/summaries.
10. **Performance:** Group agents and future calls must use on-demand inference; do not assume simultaneous full-model execution.
11. **Licensing:** User-provided character assets may be personal; a distributable product cannot ship unlicensed copyrighted characters.
12. **Deployment speed:** Remote deploy for every UI change is too slow. Task 17 is required before broad frontend work.
13. **Scanner sprawl:** Trivy, Syft, Grype, OSV-Scanner, ORT, and Dependency-Track overlap. Benchmark and select the smallest sufficient set; do not install the entire catalog.
14. **Unsafe updates:** “Automatic update” can destroy the stack. Foundation automation may discover, branch, test, and propose; production mutation remains exact, approval-bound, health-checked, and rollback-capable.
15. **Feedback overfitting:** Likes/dislikes are subjective and sparse. Require clusters, regression sets, counterexamples, and safety metrics before changing behavior.
16. **Self-modification capture:** A candidate Agent/Skill must not control evaluator prompts, approval thresholds, or its own promotion. Separate proposer, evaluator, and owner authority.
17. **Social-source access:** X, Instagram, WeChat, Xiaohongshu, and other platforms may restrict APIs/scraping. Use public/official/authorized sources and show blocked coverage honestly.
18. **Research hype/injection:** Social posts and repositories are untrusted evidence. Verify primary sources, preserve citations/licenses, scan hostile instructions, and never execute discovered code automatically.

## 10. Open Questions to Resolve in Documentation Review

1. Should the owner-facing name remain AgentGate while the internal runtime remains Pi/Hermes, or should “Conker” replace generic “brain” copy everywhere?
2. Does Pi adapter already have authoritative CRUD for agent/worker definitions and team templates, or does a new versioned runtime contract need to be added?
3. Should Flow/Loop definitions live in Pi adapter or a separate orchestration module behind the AgentGate BFF? Recommendation: Pi runtime owns execution definitions; AgentGate owns presentation drafts only.
4. Does Companion Journal need its own durable AgentGate table, or can it be a normalized view over runtime outputs plus a small read/unread/dismiss state table? Recommendation: normalized view plus small owner state.
5. Which SystemGate evidence can be added safely for security posture without creating host mutation capability?
6. What stable private reverse-proxy naming scheme will Apps use over Tailscale?
7. Which one bounded AI Broker capability should be the first vertical slice? Recommendation: schema-constrained classify/summarize, not general unrestricted chat.
8. Which existing root docs become historical after the new pack is approved?
9. Which scanner combination wins the measured spike: Trivy alone, Syft+Grype, or Trivy plus OSV-Scanner?
10. Which evaluation runner best supports local/private models and custom owner metrics: promptfoo or DeepEval?
11. Which feedback examples may be retained for regression tests, and how should incognito/sensitive corrections expire?
12. Which Chinese/social sources have lawful public feeds or official APIs on the deployment date, and which must remain unavailable?
13. Which artifact classes may eventually use automatic canary promotion, if any? Foundation recommendation: none without owner approval.

## 11. Definition of Foundation Done

The foundation is done only when the owner can use AgentGate without voice/avatar hardware to:

- receive a source-bound Companion Journal;
- talk in persistent text sessions;
- understand and decide approvals;
- inspect and manage Jobs separately from ToolGate Automations;
- inspect tools, skills, Automations, memory, Apps, and System state;
- classify and configure Companions, Workers, Teams, and metadata-only Character Profiles;
- construct or inspect bounded Flows/Loops when runtime support exists;
- see real Run traces and agent handoffs;
- view honest security layers with evidence;
- open modular hosted Apps through stable private routes;
- inspect package/library/container/App inventory with source-bound SBOM, license, vulnerability, freshness, and scanner evidence;
- receive tested update proposals with exact diffs, approvals, canary/health evidence, and rollback rather than silent mutation;
- like/dislike and mark response problems with privacy-scoped feedback linked to exact artifact versions;
- review evaluated Agent/Skill/prompt/Job/Automation change proposals without allowing self-approval;
- run bounded weekly global and Chinese technology-intelligence Jobs that preserve citations, deduplicate origins, resist prompt injection, and report through Conker;
- keep all provider/gate secrets out of the browser;
- pass all contract, browser, build, security, mobile, and partial-failure tests;
- run comfortably on the current machine/server without voice, camera, or 3D dependencies.

Only after that gate passes should the future presence roadmap be considered for implementation.
