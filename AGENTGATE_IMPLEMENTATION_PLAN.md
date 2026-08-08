# AgentGate Implementation Plan

## 1. Purpose

AgentGate is a local-first, single-owner personal agent dashboard for Hermes.
It provides one calm interface over Hermes, ToolGate, and MemoryGate without
reimplementing any of them.

The first usable release must provide:

- A reliable Hermes chat experience with streaming tool activity.
- Searchable chat history, session creation, deletion, and forking.
- A unified verification inbox for Hermes and ToolGate approvals.
- A quiet suggestions inbox.
- A small app registry with pinned apps.
- Separate ToolGate and MemoryGate overview screens.
- Full Hermes cron-job management.
- Basic character configuration for one Hermes character.
- An installable mobile-friendly web app.

The goal is not to ship every idea in the product notes. The goal is to ship a
small foundation that is immediately useful and does not need to be replaced
when richer features are added.

## 2. V1 Scope Guardrail

### Included in V1

- Home.
- Chats.
- Verifications.
- Suggestions.
- Apps.
- Gates / ToolGate.
- Gates / MemoryGate.
- Cron Jobs.
- Settings / Character.
- Installable PWA shell.
- AgentGate MCP tools for suggestion and app registration.
- Health, errors, reconnect behavior, and audit references.

### Explicitly deferred

- Missions and closed-loop life optimization.
- Voice input, voice calls, emotional audio analysis, and Qwen TTS.
- Video prompting and facial-emotion analysis.
- Animated, 3D, or realtime avatars.
- Native iOS or Android application packages.
- Full document editing.
- Automatic app generation and deployment.
- A general plugin marketplace.
- Multi-user accounts and teams.
- Multiple visible characters.
- Direct modification of MemoryGate knowledge from hidden background logic.
- Duplicating ToolGate's tool, automation, secret, or policy editors.
- Duplicating MemoryGate's memory inspection and lineage editors.

Deferred features remain in `AGENTGATE_PRODUCT_NOTES.md`. They do not influence
V1 database design or navigation unless V1 needs an extension point for them.

## 3. Core Architecture Decision

AgentGate will be an independent repository and service. It will integrate with
the three systems through their supported interfaces.

```text
Browser / installed PWA
          |
          | HTTPS or trusted private network
          v
AgentGate FastAPI :8030
  |       |        |        |
  |       |        |        +-- AgentGate SQLite + asset storage
  |       |        |
  |       |        +----------- MemoryGate API :8020
  |       |
  |       +-------------------- ToolGate API :8010
  |
  +---------------------------- Hermes API server :8642

Hermes
  |
  +-- discovers ToolGate MCP tools
  +-- discovers MemoryGate MCP tools
  +-- discovers small AgentGate MCP output tools
```

The browser talks only to AgentGate. Hermes, ToolGate, and MemoryGate keys stay
on the AgentGate server and never enter browser storage.

AgentGate is an orchestrating backend-for-frontend, not a second agent runtime.
It normalizes responses and errors but does not copy business logic out of the
three source systems.

## 4. Selected Stack

### Frontend

- React 19.
- TypeScript in strict mode.
- Vite 8.
- React Router 7.
- Tailwind CSS 4 using the same visual tokens as the existing gates.
- Lucide React icons.
- TanStack Query for server state, polling, invalidation, and retries.
- Native `fetch`, `ReadableStream`, and SSE parsing for Hermes streams.
- React Hook Form plus Zod for larger settings and cron forms.
- `react-markdown`, `remark-gfm`, and a sanitized syntax highlighter for chat.
- Vite PWA plugin for manifest, installability, and safe static caching.
- Vitest, React Testing Library, and Playwright.

TypeScript is the one deliberate difference from the two current gate
dashboards. Chat event reducers, approval unions, SSE payloads, attachment
states, and three backend contracts are complex enough that static types will
prevent a large class of integration bugs.

### Backend

- Python 3.12.
- FastAPI.
- Pydantic 2.
- HTTPX async client.
- SQLAlchemy 2.
- Alembic migrations.
- SQLite in WAL mode for AgentGate-owned data.
- Uvicorn with one worker for the initial local deployment.
- `python-multipart` for controlled asset uploads.
- Pytest, pytest-asyncio, and HTTPX test clients.

SQLite is appropriate because AgentGate is single-owner, stores modest local UI
state, and must be easy to run. Hermes, ToolGate, and MemoryGate retain their own
databases. AgentGate must not become another copy of their data.

### Mobile strategy

V1 is a responsive PWA. It supports home-screen installation, standalone
display, mobile navigation, offline shell loading, and notification permission
preparation. Native push and background execution are deferred until the web
product proves useful. If native packaging becomes necessary, Capacitor can wrap
the same Vite build later.

### Deliberately not selected

- Next.js: server rendering adds no useful value to a private local dashboard.
- Electron: does not solve the mobile requirement and duplicates the browser.
- Postgres: unnecessary for AgentGate-owned V1 data.
- WebSockets as the default transport: Hermes already exposes structured SSE.
- Redux or a large client state framework: server state belongs in TanStack
  Query and local interaction state can remain in React.

## 5. Visual Direction

AgentGate should visibly belong to the same family as ToolGate and MemoryGate:

- Near-black background.
- Slightly lighter fixed sidebar.
- Quiet one-pixel borders.
- Blue operational accent.
- Compact cards, tables, and list rows.
- Small muted metadata.
- Lucide line icons.
- Desktop sidebar width of 240 pixels.
- Mobile hamburger drawer, as requested, instead of copying the gates' crowded
  bottom overflow menu.
- Content width and density matching the existing command-center screens.

The dashboard should reuse the gates' color variables and component proportions,
but components will be rebuilt locally rather than imported across repositories.
This avoids coupling releases while preserving visual consistency.

Chat is the one screen allowed to feel more personal. It may use the configured
avatar and a slightly warmer empty state, but it must retain the same restrained
operational language.

## 6. Data Ownership

| Data | Source of truth | AgentGate behavior |
| --- | --- | --- |
| Conversations and messages | Hermes | Read and mutate through Hermes session APIs |
| Tool calls and agent-run events | Hermes | Stream and render; retain only temporary UI correlation |
| Models and providers | Hermes | Discover and select per request |
| Hermes skills and toolsets | Hermes | Read-only discovery |
| MCP-visible tools | Hermes toolsets | Read-only display |
| Cron jobs and run state | Hermes | CRUD through Hermes jobs API |
| Hermes run approvals | Hermes | Resolve through run approval endpoint |
| Tool/automation verification | ToolGate | List and decide through ToolGate requests API |
| ToolGate catalog and events | ToolGate | Read-only overview and links to full dashboard |
| Memories and knowledge | MemoryGate | Read-only overview and search in V1 |
| Character presentation | AgentGate | Store avatar, voice metadata, and UI preferences |
| Durable Hermes personality | Hermes `SOUL.md` | Sync through Hermes profile/dashboard API when available |
| Suggestions | AgentGate | Store and expose through UI and scoped MCP tool |
| App registry and pins | AgentGate | Store locally and expose through UI and scoped MCP tool |
| Connection credentials | Server environment | Never return raw values to browser |

## 7. Repository Structure

```text
agentgate/
  README.md
  AGENTGATE_PRODUCT_NOTES.md
  AGENTGATE_IMPLEMENTATION_PLAN.md
  .env.example
  .gitignore
  docker-compose.yml
  Makefile                         optional convenience commands

  api/
    pyproject.toml
    alembic.ini
    alembic/
    agentgate/
      main.py
      config.py
      auth.py
      db.py
      models/
      schemas/
      routes/
        auth.py
        health.py
        home.py
        chats.py
        verifications.py
        suggestions.py
        apps.py
        gates.py
        cron.py
        character.py
        capabilities.py
      clients/
        hermes.py
        toolgate.py
        memorygate.py
      services/
        event_normalizer.py
        verification_inbox.py
        character_sync.py
        asset_store.py
      tests/

  dashboard/
    package.json
    vite.config.ts
    tsconfig.json
    src/
      app/
      components/
      features/
        home/
        chats/
        verifications/
        suggestions/
        apps/
        gates/
        cron/
        character/
      lib/
      styles/
      test/
    public/

  mcp/
    agentgate_mcp.py
    README.md

  integrations/
    mcp/
      agentgate.hermes.mcp.json

  data/                             runtime only; ignored by Git
    agentgate.db
    assets/
```

Features should own their screen, queries, types, and small components. Generic
primitives such as buttons, modal, empty state, badges, and page headers live in
`components/`. Avoid one enormous screen file like the current prototype gate
dashboards.

## 8. Runtime Configuration

The initial environment contract should be:

```dotenv
AGENTGATE_HOST=127.0.0.1
AGENTGATE_PORT=8030
AGENTGATE_PUBLIC_URL=http://127.0.0.1:8030
AGENTGATE_DATA_DIR=./data
AGENTGATE_ADMIN_KEY=replace_me
AGENTGATE_SESSION_SECRET=replace_with_32_plus_random_bytes

HERMES_URL=http://127.0.0.1:8642
HERMES_API_KEY=replace_me
HERMES_PROFILE=default
HERMES_DASHBOARD_URL=http://127.0.0.1:9119

TOOLGATE_URL=http://127.0.0.1:8010
TOOLGATE_ADMIN_KEY=replace_me
TOOLGATE_DASHBOARD_URL=http://127.0.0.1:8011

MEMORYGATE_URL=http://127.0.0.1:8020
MEMORYGATE_ADMIN_KEY=replace_me
MEMORYGATE_AGENT_ID=hermes
MEMORYGATE_DASHBOARD_URL=http://127.0.0.1:8021
```

Only `.env.example` is committed. Real values, databases, avatars, generated
files, and logs are ignored.

The first deployment target is one local process or Docker container on the
same trusted host as Hermes. Remote phone access should use Tailscale, an HTTPS
reverse proxy, or an SSH tunnel. AgentGate must not encourage raw public port
exposure.

## 9. AgentGate API Surface

All browser-facing endpoints live under `/api`. Exact response schemas are
defined before screen implementation.

### Authentication and health

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/health`
- `GET /api/health/dependencies`

### Home

- `GET /api/home`

The home response combines only small summaries: pinned apps, pending approval
count, recent suggestions, running jobs, dependency health, and recent chats.
It must use bounded parallel requests and return partial results when one
dependency is unavailable.

### Chats

- `GET /api/chats`
- `POST /api/chats`
- `GET /api/chats/{session_id}`
- `PATCH /api/chats/{session_id}`
- `DELETE /api/chats/{session_id}`
- `GET /api/chats/{session_id}/messages`
- `POST /api/chats/{session_id}/fork`
- `POST /api/chats/{session_id}/stream`
- `POST /api/runs/{run_id}/stop`
- `POST /api/runs/{run_id}/approval`
- `GET /api/models`

AgentGate proxies Hermes' native session APIs and preserves structured stream
events. It should not flatten tool calls into assistant text.

### Capabilities

- `GET /api/capabilities`
- `GET /api/capabilities/skills`
- `GET /api/capabilities/toolsets`

These proxy Hermes capability discovery. Tool visibility is based on what
Hermes reports for the API-server platform, not assumptions made from ToolGate.

### Verifications

- `GET /api/verifications`
- `GET /api/verifications/{source}/{id}`
- `POST /api/verifications/{source}/{id}/decision`

Responses use one normalized verification schema while retaining `source`,
`source_id`, expiry, binding summary, and original status.

### Suggestions

- `GET /api/suggestions`
- `POST /api/suggestions`
- `GET /api/suggestions/{id}`
- `PATCH /api/suggestions/{id}`
- `POST /api/suggestions/{id}/dismiss`
- `POST /api/suggestions/{id}/save`
- `DELETE /api/suggestions/{id}`

### Apps

- `GET /api/apps`
- `POST /api/apps`
- `GET /api/apps/{id}`
- `PATCH /api/apps/{id}`
- `DELETE /api/apps/{id}`
- `POST /api/apps/{id}/pin`
- `POST /api/apps/reorder-pins`
- `POST /api/apps/{id}/health-check`

### Gates

- `GET /api/gates/toolgate`
- `GET /api/gates/toolgate/activity`
- `GET /api/gates/memorygate`
- `POST /api/gates/memorygate/search`

These are bounded summaries, not generic unrestricted reverse proxies.

### Cron

- `GET /api/cron/jobs`
- `POST /api/cron/jobs`
- `GET /api/cron/jobs/{id}`
- `PATCH /api/cron/jobs/{id}`
- `DELETE /api/cron/jobs/{id}`
- `POST /api/cron/jobs/{id}/pause`
- `POST /api/cron/jobs/{id}/resume`
- `POST /api/cron/jobs/{id}/run`

### Character and settings

- `GET /api/character`
- `PUT /api/character`
- `POST /api/character/avatar`
- `DELETE /api/character/avatar`
- `POST /api/character/sync`
- `GET /api/settings/connections`

Connection responses show only health and whether a credential is configured.
They never return secrets.

## 10. Hermes Integration

AgentGate will negotiate Hermes features at startup and periodically through
`GET /v1/capabilities`. Unsupported capabilities disable the related UI with a
clear version message rather than failing at runtime.

Use these Hermes interfaces:

- Session list/create/read/update/delete and message history for Chats.
- Session fork for Fork.
- Session chat stream for normal turns.
- Runs API where detached progress, stop, or human approval is required.
- Model options for provider/model/intensity selectors.
- Skills and toolsets endpoints for capability display.
- Jobs API for Cron Jobs.
- Detailed health for Home and Connections.

### Chat stream event model

Normalize Hermes events into these frontend event kinds:

- `run.started`
- `assistant.delta`
- `assistant.completed`
- `tool.started`
- `tool.completed`
- `tool.failed`
- `approval.required`
- `subagent.started`
- `subagent.completed`
- `run.completed`
- `run.failed`
- `run.cancelled`
- `transport.reconnecting`

Every event carries a run ID and stable correlation IDs when supplied by
Hermes. Unknown events are logged and safely ignored so newer Hermes versions
do not break the chat.

### Incognito behavior

V1 exposes the two requested toggles with explicit behavior:

- Chat-session incognito creates an AgentGate-only transient conversation and
  sends stateless turns. It is removed when the tab closes or the user exits.
- MemoryGate incognito adds an explicit instruction that memory tools must not
  write and disables MemoryGate write-capable tools if Hermes exposes toolset
  controls for the turn.

MemoryGate incognito cannot be claimed as a security boundary until Hermes can
enforce per-request tool filtering. If only prompt-level control is available,
the UI must label it as a preference, not a guarantee. The secure fallback is
to use a Hermes tool configuration containing only MemoryGate read tools.

### Character sync

Hermes `SOUL.md` remains the durable personality source. AgentGate stores a
structured character profile and renders a preview of the generated SOUL text.

Sync should use the documented Hermes profile SOUL endpoint when available.
If that management endpoint is unavailable, AgentGate keeps the profile locally
and layers it as request instructions for AgentGate chats. It must never guess a
filesystem path or edit an arbitrary Hermes home directory.

## 11. ToolGate Integration

AgentGate uses ToolGate's admin API from its backend for owner-facing screens.
It never exposes the admin key to Hermes or the browser.

V1 reads:

- `/v2/status`
- `/v2/requests`
- `/v2/tools`
- `/v2/automations`
- `/v2/services`
- `/v2/events`

V1 mutates only:

- `/v2/requests/{request_id}/decision`

Tool and automation creation remains in ToolGate's own dashboard. AgentGate
links there when deeper management is needed.

Verification decisions must display the immutable action binding, expiry,
arguments summary, actor, and one-time status returned by ToolGate. AgentGate
must not fabricate an approval result when ToolGate returns a conflict or when a
request expires between loading and tapping Approve.

## 12. MemoryGate Integration

AgentGate uses MemoryGate's admin API only from its backend.

V1 reads a bounded overview from:

- `/health`
- agent briefing.
- memory list and search.
- active observations and patterns.
- selected recent audit activity.

V1 does not create, edit, confirm, contradict, merge, or delete memory objects.
The MemoryGate screen links to the full MemoryGate dashboard for those actions.

The overview should emphasize what Hermes may know, recent changes, unresolved
patterns, and source health. It should not dump raw private evidence onto Home.

## 13. AgentGate MCP Surface

AgentGate needs a very small MCP server so Hermes and cron jobs can send useful
outputs into the dashboard without shell or CLI calls.

V1 MCP tools:

- `agentgate_create_suggestion`
- `agentgate_update_suggestion`
- `agentgate_register_app`
- `agentgate_update_app`

Each tool uses typed JSON Schema, returns structured JSON text, and calls the
local AgentGate API with a scoped integration token. It cannot read other
suggestions, read character settings, approve actions, or reveal dashboard
credentials.

Suggestion input fields:

- Title.
- Summary.
- Category.
- Why it matters.
- Confidence.
- Urgency.
- Evidence references.
- Proposed next action.
- Related Hermes session or cron job.
- Expiry or review-after time.

App registration input fields:

- Name.
- Description.
- URL.
- Optional health URL.
- Icon reference.
- Source folder reference.
- Related suggestion or session.

AgentGate validates local URLs, length limits, allowed schemes, and duplicate
identifiers. Registering an app does not start a process or open a port.

## 14. AgentGate Database

V1 tables:

### `settings`

- `key`
- `value_json`
- `updated_at`

### `character_profiles`

- `id`
- `name`
- `owner_name`
- `pronouns`
- `personality`
- `background`
- `speaking_style`
- `boundaries`
- `avatar_asset_id`
- `voice_config_json`
- `soul_preview`
- `last_synced_at`
- `sync_status`
- timestamps

Only one active character is allowed in V1.

### `assets`

- `id`
- `kind`
- `storage_name`
- `original_name`
- `mime_type`
- `size_bytes`
- `sha256`
- timestamps

### `suggestions`

- `id`
- `title`
- `summary`
- `category`
- `why_it_matters`
- `confidence`
- `urgency`
- `status`
- `evidence_json`
- `next_action_json`
- `source`
- `source_ref`
- `created_at`
- `updated_at`
- `expires_at`

Statuses: `new`, `saved`, `dismissed`, `acted`, `expired`.

### `apps`

- `id`
- `name`
- `description`
- `url`
- `health_url`
- `icon_asset_id`
- `source_folder`
- `status`
- `source`
- `source_ref`
- `last_health_status`
- `last_health_checked_at`
- timestamps

### `pinned_items`

- `id`
- `item_type`
- `item_id`
- `position`
- timestamps

### `verification_refs`

This table stores only ephemeral cross-service correlation needed for Hermes
run approvals and UI recovery:

- `id`
- `source`
- `source_id`
- `run_id`
- `session_id`
- `status`
- `safe_summary_json`
- `expires_at`
- timestamps

### `integration_events`

Bounded operational events for debugging AgentGate itself:

- `id`
- `source`
- `event_type`
- `severity`
- `correlation_id`
- `safe_payload_json`
- `created_at`

Retention defaults to seven days. Secrets, full private messages, raw tool
arguments, and MemoryGate evidence must not be copied into this table.

## 15. Screen Specifications

### Home

Purpose: a quiet command center, not another feed.

Order:

1. Pinned apps.
2. Pending verifications, shown only when present.
3. Up to three new high-value suggestions.
4. Active or recently failed cron jobs.
5. Recent chats.
6. Compact Hermes, ToolGate, and MemoryGate health strip.

No infinite activity feed, generic motivational cards, or vanity statistics.

### Chats list

- Search by title and message search when Hermes supports it.
- Filters: active, archived, forked, incognito.
- Sort: recent, oldest, title.
- New chat button.
- Each row shows title, preview, last activity, source, model, and fork marker.
- Desktop opens the chat in the main workspace.
- Mobile replaces the list with the selected chat and provides a back action.

### Chat workspace

- Header: title, provider, model, intensity, incognito controls, more menu.
- Scrollable message timeline.
- Composer fixed within the workspace, not to the whole browser window.
- Stop button while a run is active.
- Tool activity rendered as collapsible structured rows.
- Approval-required tool calls rendered inline and mirrored in Verifications.
- Message actions: timestamp, copy, share, read aloud using browser speech in
  V1, retry, fork, and quote selection.
- Retry forks at the selected point if Hermes cannot safely rewrite history.
- Multiple selected-text replies are represented as quoted blocks in the next
  user message; persistent annotation threads are deferred.
- Markdown, GFM tables, code blocks, links, and images are rendered safely.

Desktop split view:

- Chat pane on the left.
- Artifact pane on the right.
- Resizable divider.
- V1 previews markdown, text, JSON, images, and PDFs served from safe local
  AgentGate assets or explicit URLs.
- DOCX editing, diagram editing, and arbitrary host-file browsing are deferred.

### Verifications

- Tabs: Pending and History.
- Filters: source, severity, type, age.
- ToolGate and Hermes items use the same card shape with a visible source badge.
- Detail panel shows action, actor, safe arguments, risk, expiry, binding, and
  related chat/run.
- Approve and Reject require a deliberate tap; high-risk approvals use a short
  confirmation dialog.
- The UI refreshes the item after every decision and shows expired/conflicted
  states exactly.

### Suggestions

- Quiet inbox with New, Saved, Dismissed, and Acted views.
- Each card shows title, summary, category, confidence, why it matters, and
  evidence references.
- Actions: save, dismiss, ask Hermes, and mark acted.
- `Ask Hermes` opens a new or related chat with the suggestion attached as
  structured context.
- Creating ToolGate automation directly from a suggestion is deferred; V1 can
  open a Hermes chat to refine it.

### Apps

- Search, filter by status/source, and sort by recent/name.
- Add a manual app.
- Pin or unpin.
- Open app in new tab by default.
- Embedded mode is allowed only for explicitly allowlisted origins that permit
  framing.
- Show last health result, URL, source, and related suggestion.
- V1 manages registrations, not app processes.

### ToolGate gate screen

- Health and lockdown state.
- Counts for active tools, automations, services, and pending requests.
- Recent redacted events.
- Small capability list showing authorization level.
- Link to open the full ToolGate dashboard.
- No secret values or duplicate editors.

### MemoryGate gate screen

- Health.
- Briefing summary.
- Recent memories, active observations, and patterns.
- Search box with bounded results.
- Clear labels for facts versus theories or patterns.
- Link to open the full MemoryGate dashboard.
- No raw evidence on the overview.

### Cron Jobs

- List with status, schedule, next run, last run, model pin, delivery target,
  attached skills, and recent result state.
- Create and edit form using Hermes-supported fields.
- Pause, resume, run now, and delete.
- Explicit warnings for paid model changes and broad toolsets.
- Job detail shows safe run history and output reference when Hermes returns it.
- Agent-less script jobs appear correctly but V1 does not provide an arbitrary
  script editor.

### Character

- One character only.
- Name and owner-address fields.
- Avatar upload and preview.
- Personality, background, speaking style, and boundaries.
- Voice settings are stored but marked unavailable until voice support ships.
- Live generated SOUL preview.
- Save locally and Sync to Hermes actions are separate.
- Show last sync result and explain whether the setting applies globally or
  only to AgentGate chats.

### Connection status

- Hermes, ToolGate, and MemoryGate URL labels.
- Connected, degraded, or offline state.
- Version/capability summary where available.
- Credential configured indicator, never a credential value.
- Test connection buttons.

This is a compact section in the Settings root and first-run setup, not another
sidebar destination. Character remains the only named Settings child in V1.

## 16. Loading, Offline, And Error Behavior

- Every screen has loading, empty, partial, stale, offline, and error states.
- Home renders available sections even if one dependency is down.
- Chat stream disconnects expose Reconnect and Stop; they do not pretend a run
  failed until Hermes reports failure or status polling confirms it.
- Mutations are not automatically retried unless idempotent.
- Verification decisions are never automatically retried.
- Cron create/delete and app delete require explicit success responses.
- Queries use short bounded timeouts and cancellation when screens unmount.
- Service errors include source, safe message, correlation ID, and retry action.
- Raw upstream stack traces and credentials never reach the browser.

The PWA may cache only the app shell and immutable static assets. It must not
cache chats, verifications, suggestions, memory results, or API responses in the
service worker.

## 17. Security Requirements

- Single-owner authentication is still required when AgentGate is reachable
  beyond loopback.
- Login compares the configured key in constant time and issues an HttpOnly,
  SameSite=Strict session cookie.
- Mutation requests validate Origin and a CSRF token.
- CORS is disabled by default because browser traffic is same-origin.
- All upstream credentials remain server-side.
- Logs redact authorization headers, cookies, query secrets, and known key
  shapes.
- Asset uploads use an allowlist of MIME types, random storage names, byte-size
  limits, content sniffing, and no executable serving.
- URLs accepted for apps and previews are validated against allowed schemes and
  configured local/private-network policy.
- Markdown HTML is disabled or sanitized.
- External links use safe target and referrer attributes.
- Dependency health responses expose status, not credentials or internal paths.
- The AgentGate MCP token can only create/update suggestions and app records.
- Character sync can update only the selected Hermes profile's SOUL content.
- AgentGate never offers a general arbitrary upstream proxy endpoint.

## 18. Testing Strategy

### Backend unit tests

- Configuration validation.
- Authentication and CSRF.
- Hermes event normalization.
- ToolGate and MemoryGate error normalization.
- Suggestion state transitions.
- App URL and health URL validation.
- Character SOUL generation.
- Asset upload validation.
- Secret redaction.

### Contract tests

Record minimal redacted fixtures from each service and verify:

- Hermes capabilities, sessions, messages, stream events, models, and jobs.
- ToolGate status, requests, decisions, catalog summaries, and conflicts.
- MemoryGate health, briefing, search, observations, and patterns.

Contract tests should fail clearly when an upstream response shape changes.

### Frontend tests

- Navigation and mobile drawer.
- Chat stream reducer.
- Tool and approval event rendering.
- Verification conflict/expiry states.
- Cron forms and destructive confirmations.
- Suggestion and app state transitions.
- Character preview and sync status.
- Partial Home failures.

### End-to-end tests

Use local fake upstream servers for deterministic CI, then a separate optional
live stack test.

Required V1 E2E journeys:

1. Login, see dependency health, and log out.
2. Create chat, receive streamed text and tool activity, stop a run.
3. Fork a chat and confirm both branches remain visible.
4. Approve and reject ToolGate verification requests.
5. Resolve a Hermes run approval.
6. Create, edit, pause, resume, run, and delete a cron job.
7. Receive a suggestion through the AgentGate MCP adapter and manage it in UI.
8. Register and pin an app.
9. Save character settings and handle successful or unavailable Hermes sync.
10. Use core navigation and chat on a mobile viewport.

### Build checks

- Python lint and type check.
- Backend tests.
- Frontend lint and TypeScript check.
- Frontend unit tests.
- Production frontend build.
- Playwright smoke tests.
- Secret-pattern scan of tracked files.

## 19. Implementation Phases

### Phase 0: Repository foundation

Deliverables:

- Git repository metadata and ignore rules.
- README with prerequisites and architecture.
- Vite React TypeScript dashboard.
- FastAPI application.
- Docker Compose and local development commands.
- Environment validation.
- Database and first Alembic migration.
- CI workflow.

Acceptance:

- One command starts dashboard and API in development.
- Production build is served by the API on port 8030.
- `/api/health` works.
- No real secrets or runtime data are tracked.

### Phase 1: Design system, shell, and connections

Deliverables:

- Shared visual tokens matching ToolGate and MemoryGate.
- Desktop sidebar and mobile hamburger drawer.
- Final navigation structure.
- Login flow.
- Typed API client and error boundary.
- Hermes, ToolGate, and MemoryGate clients.
- Capability negotiation and Connections screen.

Acceptance:

- Every route renders a deliberate placeholder/empty state.
- Three dependency states are visible and independently recoverable.
- Browser contains no upstream key.
- Desktop and mobile layouts pass smoke tests.

### Phase 2: Chats

Deliverables:

- Chat list, search/filter/sort, create, rename, delete.
- Message history.
- Structured SSE streaming.
- Tool activity, subagents, stop, and errors.
- Provider/model/intensity controls.
- Message actions and session fork.
- Incognito UI with accurately stated guarantees.
- Safe markdown and image rendering.

Acceptance:

- A complete multi-turn Hermes conversation works without CLI use.
- Tool progress and failures are visible.
- Refresh restores the Hermes session.
- Fork creates a real Hermes lineage branch.
- Stream cancellation does not corrupt the session.

### Phase 3: Verifications

Deliverables:

- Normalized verification schema.
- ToolGate pending/history polling.
- Hermes run approval capture.
- Inline approval cards in chat.
- Global Verifications screen.
- Expiry, conflict, and already-decided behavior.

Acceptance:

- Approvals and rejections reach the correct source.
- Exact ToolGate binding information is visible.
- The same approval cannot appear successfully consumed twice.
- A decision from mobile updates the open desktop view on refresh/poll.

### Phase 4: Cron Jobs

Deliverables:

- Job list and detail.
- Create/edit forms.
- Pause/resume/run/delete.
- Model, skills, delivery, workdir, and no-agent visibility where supported.
- Run status and safe output summaries.

Acceptance:

- Every supported Hermes job operation works through AgentGate.
- Unsupported fields are hidden based on capabilities.
- Destructive and potentially expensive changes are clearly confirmed.

### Phase 5: Suggestions, Apps, and AgentGate MCP

Deliverables:

- Suggestion database and screen.
- App registry and pinning.
- MCP server with four scoped tools.
- Hermes MCP configuration example.
- Home pinned apps and suggestion sections.

Acceptance:

- Hermes can create a suggestion without CLI or direct database access.
- Duplicate/replayed MCP submissions are idempotent when a source reference is
  supplied.
- An app can be registered, health checked, pinned, opened, and removed.
- MCP cannot approve actions or read private AgentGate data.

### Phase 6: Gate overviews and Home

Deliverables:

- ToolGate overview and activity.
- MemoryGate overview and search.
- Quiet Home aggregation.
- Partial-failure behavior and stale indicators.
- Deep links to both full dashboards.

Acceptance:

- One failed gate does not break Home or the other gate.
- Home shows only bounded, useful information.
- Memory theories/patterns are visually distinct from confirmed facts.

### Phase 7: Character and PWA polish

Deliverables:

- Character form, avatar storage, and SOUL preview.
- Hermes character sync with fallback behavior.
- PWA manifest, icons, standalone display, and update prompt.
- Responsive polish and accessibility pass.
- Final README and screenshots.

Acceptance:

- Character identity appears consistently in AgentGate UI.
- Global Hermes sync result is explicit and testable.
- Dashboard installs on desktop and mobile browsers.
- Keyboard navigation, focus states, labels, and reduced motion are supported.

### Phase 8: Release hardening

Deliverables:

- Full live integration run against current local services.
- Dependency outage testing.
- Backup/restore instructions for AgentGate data.
- Upgrade and migration instructions.
- Security review and secret scan.
- Tagged `v0.1.0` release candidate.

Acceptance:

- All required E2E journeys pass.
- Fresh setup works from README instructions.
- Restart preserves AgentGate-owned data and Hermes sessions remain authoritative.
- No deferred feature is half-exposed in the UI.

## 20. Suggested Commit Sequence

Keep commits independently understandable and testable:

1. `docs: define AgentGate architecture and V1 scope`
2. `chore: scaffold dashboard, API, database, and local runtime`
3. `feat: add authenticated application shell and service connections`
4. `feat: add Hermes chat sessions and structured streaming`
5. `feat: add chat controls, model selection, and session forking`
6. `feat: add unified Hermes and ToolGate verifications`
7. `feat: add Hermes cron job management`
8. `feat: add suggestions, app registry, and AgentGate MCP bridge`
9. `feat: add ToolGate and MemoryGate overview screens`
10. `feat: add quiet home dashboard and pinned apps`
11. `feat: add character settings and Hermes personality sync`
12. `feat: add PWA support and responsive polish`
13. `test: add integration, end-to-end, and security coverage`
14. `docs: finalize setup, operations, and release guide`

Do not combine the whole build into one commit. The user can still squash later,
but readable boundaries make review and rollback safer.

## 21. Definition Of V1 Done

V1 is done when the owner can install AgentGate, connect the three services, and
perform their normal personal-agent workflow without opening a terminal:

- Talk to Hermes and see streaming output, tools, errors, and subagents.
- Find, create, rename, delete, and fork conversations.
- Choose provider, model, and reasoning intensity.
- Review and decide every surfaced Hermes or ToolGate approval.
- Create and manage Hermes cron jobs.
- Receive and manage useful Hermes suggestions.
- Open and pin personal apps.
- See concise ToolGate and MemoryGate state.
- Configure the one Hermes character.
- Use the same core workflow from a phone-sized installed PWA.

V1 is not done merely because all routes exist. Every screen must use real
service data, have correct failure states, and pass its acceptance journey.

## 22. Planned Next Step After Approval

When implementation is authorized, start with Phase 0 and Phase 1 only. Stop
after the running shell and connection clients are verified, show the result,
and then continue into Chats. This creates an early architectural checkpoint
before the most complex streaming work.

## 23. Sources Used For Integration Planning

- Hermes API server: https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server/
- Hermes scheduled tasks: https://hermes-agent.nousresearch.com/docs/user-guide/features/cron/
- Hermes MCP: https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp/
- Hermes personality and SOUL: https://hermes-agent.nousresearch.com/docs/user-guide/features/personality/
- Hermes dashboard management API: https://hermes-agent.nousresearch.com/docs/user-guide/features/web-dashboard/
- Local ToolGate API and dashboard source in `P:/repos/toolgate`.
- Local MemoryGate API and dashboard source in `P:/repos/memorygate`.
