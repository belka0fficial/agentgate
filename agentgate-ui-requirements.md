# AgentGate UI Overhaul — Requirements & Design System

You are redesigning the AgentGate dashboard. This document is the complete requirement set. Loop on it until every acceptance item passes. Do not substitute your own aesthetic defaults — every deviation from a mainstream dashboard template in here is deliberate.

## Context

AgentGate is the owner's single surface for a local-first personal AI stack: a Pi-based agent (persona name configurable, currently "Hermes") behind ToolGate (capability control + approvals), MemoryGate (memory/entities/skills), SystemGate (host telemetry). One user: the owner. Runs as PWA on desktop + phone over Tailscale. Backend contract is FROZEN — this is a frontend/presentation overhaul plus small read-only proxy additions only. Do not change approval semantics, API auth, or any gate.

Current state: nav is already restructured (Command · Chats · Approvals · Automations · Memory · System · Suggestions · Character). The problem is the presentation layer: it reads as a generic enterprise-SaaS template (Linear/ticket-list clone) — padded pill badges, repeated summary cards, decorative panels, no live behavior. That entire aesthetic gets replaced.

## Design North Star

**An instrument, not a brochure.** The owner's reference feeling: "Jarvis in a clean modern UI." That is not a skin — it is BEHAVIOR: the interface visibly reacts to the real system. Things pulse when active, tick when values change, arrive when events fire, and sit perfectly still when nothing is happening. Study for logic, not copying: Linear (motion restraint), Vercel dashboard (data density), Raycast (command surface), Grafana dark (telemetry), Perplexity's voice orb (live core), arwes.dev (reactive sci-fi system — steal the event-driven logic, tone the styling way down).

Explicitly banned looks: enterprise ticket-list SaaS; luxury/editorial (cream, serif, gold/brown "royal" palettes); retro terminal cosplay (scanlines, glow-everything, Cascadia-style hacker fonts as decoration); gradient "AI product" landing-page style; glassmorphism.

## Design Tokens (authoritative)

Color — dark-only for v1:
- `--bg`        #0A0C10  (app background)
- `--surface`   #10141B  (panels; ONE elevation step only)
- `--line`      #1E2530  (1px borders, true separations only)
- `--text`      #E8EDF4
- `--text-dim`  #8A94A6  (labels, secondary)
- `--accent`    #35E0C8  (cold cyan-green — means "system activity" and NOTHING else: live indicators, active states, the core element, event flashes)
- `--danger`    #FF4D5E  (errors, reject, kill)
- `--warn`      #FFB454  (pending, degraded)
No other colors. No gradients. No shadows. Accent used on less than 5% of any screen — it must stay rare enough that motion + accent = "something is happening right now."

Type — two families, strict roles:
- UI face: Inter or Geist — all labels, prose, buttons, headings.
- Data face: Geist Mono (or JetBrains Mono) — ONLY for values: numbers, IDs, hashes, ports, timestamps, logs, JSON, budgets, metrics. Any datum a machine produced is mono; anything written for a human is not. This split is the core of the instrument feel — apply it everywhere without exception.
- Scale: exactly two working sizes (13px data/body, 11px uppercase-tracked labels) plus one screen title size. No decorative display sizes inside screens.

Layout & chrome:
- Density over air: the current UI shows ~9 facts per screenful; target 3–4x that. Compact rows (~32px), tables over cards wherever content is homogeneous.
- Borders: 1px `--line` only where data types genuinely separate. No card-per-item. No rounded-pill badges — status is a 6px dot (accent=online/active, warn=pending, danger=error, dim=idle) + mono word.
- Radius: 4px max. Spacing on a 4px grid.
- Keyboard: Ctrl+K omnibar everywhere, j/k list navigation, a/r approve-reject when an approval is focused, visible focus rings.
- Responsive to 380px (PWA phone use is primary for approvals). Respect prefers-reduced-motion (motion collapses to instant state changes, never removed information).

## The Motion Law (non-negotiable)

**Every animation must be caused by a real system event. Zero decorative motion.** Sources: the chat SSE stream, approval/suggestion arrivals, health polls, SystemGate vitals polls, cron/automation run events.
- New list item (approval, suggestion, activity row) → slides in once, 150ms, with a single accent flash that decays.
- A number changed (vitals, budget, counts) → value ticks/rolls to the new value, 200ms.
- Health heartbeat → the status dot does one subtle opacity pulse per successful poll. A dead service's dot goes still and dim BEFORE it goes red — stillness itself is information.
- Streaming tokens → text renders as it arrives (no artificial typewriter on completed text).
- Nothing idles, loops, shimmers, or floats. If the system is quiet, the screen is a still photograph.

## The Signature Element: the Core

One canvas/WebGL element representing the agent's live state — the single place boldness is spent. Everything else on every screen stays quiet and disciplined so the Core reads.
- States, driven ONLY by real events from the SSE/chat stream and run registry: `idle` (near-still slow drift), `listening` (gentle responsive ripple while owner is typing), `thinking` (tight fast internal motion between prompt-sent and first token), `speaking` (amplitude follows token arrival rate), `executing` (one discrete pulse per tool_execution event), `blocked` (steady warn-colored attention glow while an approval is pending), `error` (single danger flash, then still).
- Geometry: abstract — a particle/line orb or ring, drawn in `--accent` on `--bg`. NOT a face, NOT a character sprite, NOT a GIF (a rigged character skin is a possible later swap; build the state machine so skins are swappable).
- Placement: medium on Command (top area, beside the omnibar), small persistent version in the top bar of all other screens (doubles as global "agent is doing something" indicator), full-screen on a future voice overlay (do not build the overlay; keep the component scalable).
- Implement as: one component, prop = state + intensity, driven by a global event bus fed by the SSE stream. Must run at 60fps on a mid phone; degrade particle count, never framerate.

## Screens (routes exist; this defines their target presentation)

**01 Command `/`** — the Jarvis screen. Everything on it is either actionable or live; kill anything that is neither.
- Top: omnibar (extends Ctrl+K): type intent → route to chat/new session; slash-commands for quick actions (`/approve`, `/status`, `/chat`). Beside it: the Core.
- Vitals strip: one mono line — CPU · RAM · disk · agent status · last backup timestamp · pending approvals count. From SystemGate + existing endpoints. Values tick on change.
- Briefing: pending approvals (top 3, decidable INLINE right here — approve/reject without leaving Command) + top suggestions + any anomaly (service down, backup stale > 26h, disk > 85%).
- Live activity ticker: last ~10 events (tool calls, runs, cron fires, approvals decided), one mono line each, newest slides in. This is the heartbeat of the screen.
- Pinned apps: one compact row of text links, not cards.
- Remove: duplicated queue summaries, "Open queue →" panels that restate the sidebar, any count shown twice.

**02/03 Chats `/chats`** — session list: compact rows (title, one-line last message, relative time), search. Chat detail: message stream with streaming render; per-assistant-message expandable trace (tool calls with args digest, duration, result summary — data all mono); right rail (collapsible, hidden on phone) = current run state: mode, model, live tool activity, injected memories/skills when available. Stop button appears during a run, wired to the existing stop endpoint. "Promote to mission" button may render disabled with tooltip "missions: coming" — do NOT build missions.

**04 Approvals `/approvals`** — the product's safety boundary; clearest screen in the app.
- Queue of pending items: source tag, one-sentence human summary, and the EXACT binding always visible without a click: object type, object id, version, argument digest — mono block, diff-like presentation ("this precise action, nothing else").
- Approve (accent) / Reject (danger) large enough for thumbs; keyboard a/r; optimistic UI with reconcile.
- Decided items collapse into a history list below (decision, timestamp, actor).
- Empty state: "Nothing needs you." — the goal state, let it be calm.

**05 Suggestions `/suggestions`** — each suggestion has one-tap outcomes using EXISTING capabilities only: Ask agent (opens chat seeded with it), Save to memory, Dismiss. No fake "convert to automation" buttons unless the API truly supports it.

**06 Automations `/automations`** — merged cron + ToolGate automations, presented as one concept: "things that run alone." Table: name, schedule (mono cron + human phrasing), last run status dot + time, next run, last output preview. Row actions: run now, pause/resume, edit. Failure rows surface to Command anomalies.

**07 Memory `/memory`** — search-first: one big query box, results grouped by kind (memory/entity/episode/skill). Recent memories timeline. Skills section: list + editor (title, body markdown, linked tools, active toggle) against MemoryGate's skill endpoints. Lineage: from any memory, "show evidence" expands its source chain. "What does the agent believe about X" = search presented conversationally.

**08 System `/system`** — SystemGate's face; Grafana-energy. Vitals with 15-min sparklines (poll history kept client-side is fine), container table (name, image, status dot, uptime, CPU/mem — all mono), backup panel (last archive time, size, verified-restore date, next scheduled — stale >26h = warn state + Command anomaly), error-log tail, package freshness summary. Everything read-only.

**09 Character `/settings/character`** — form: name, avatar (this may later skin the Core), personality, speaking style, boundaries, response-length dial (straight / detailed / verbose). Saving regenerates the SOUL export the adapter reads. Copy explains: "Boundaries here are persona-level. Hard limits live in ToolGate and cannot be loosened from this screen."

Global: left sidebar = 7 nav items + Character/Settings bottom-anchored, section labels 11px uppercase tracked, active item = accent text + 2px left accent bar (no filled backgrounds). Top bar = breadcrumb, mini-Core, connection status dot. Every screen has a designed empty state (direction, not mood) and a designed error state (what failed + retry).

## Copy rules

Owner-facing words describe what the owner controls, not how the backend is built: "Waiting for you", not "verification queue objects". Buttons say what happens: "Approve", "Run now", "Save character". No marketing tone, no exclamation marks, no apologies in errors. Gate names (ToolGate/MemoryGate/SystemGate) appear only as small source tags on items, never as owner-facing section headers.

## Engineering constraints

- Work inside the existing AgentGate dashboard app and build pipeline (`npm run build` must pass); keep the existing proxy pattern — upstream keys never reach the browser (grep the built bundle for key env names as a check).
- One shared event bus module: SSE + polling flow in, Core states + motion triggers + ticker flow out. All reactive UI subscribes to it; no component owns its own polling loop for the same data.
- CSS: design tokens as CSS variables in one file; delete unused legacy styles as screens are converted. Beware selector-specificity conflicts between section-level and element-level classes (paddings/margins cancelling out).
- No new heavy UI framework. Canvas or lightweight WebGL for the Core; no three.js unless already present.
- Commit per screen: `ui: <screen> <summary>`. Screenshot each finished screen (desktop + 380px) into `docs/ui/` for review.

## Acceptance checklist (loop until all pass)

1. Zero rounded-pill badges, gradients, or shadows anywhere; status = dot + mono word.
2. Every machine value on every screen renders in the mono face; every human sentence in the UI face.
3. Accent color audit: appears only on live/active/actionable elements, <5% of any screenful.
4. Motion audit: reproduce each animation and name the real event that caused it; any animation without an event source is removed.
5. The Core: all seven states reachable and visibly distinct, driven by a real chat round-trip (idle→listening→thinking→speaking→idle) and a real tool call (executing pulse), a real pending approval (blocked), a killed run (error).
6. Command: an approval can be decided start-to-finish without leaving the screen; vitals tick; ticker receives a real event.
7. Approvals: binding block (type/id/version/digest) visible without interaction; a/r keys work; reject path leaves the run in a clean continued state.
8. Phone (380px): Command, Approvals, and Chat are fully usable one-handed; PWA installed view has no horizontal scroll anywhere.
9. prefers-reduced-motion: verified — states still readable with motion collapsed.
10. `npm run build` clean; no upstream key names in bundle; all existing API tests pass; no backend contract changes.
11. Screenshots for all 9 screens (2 viewports) committed to `docs/ui/`.
12. Self-critique pass done: view each screenshot and remove one element per screen that isn't earning its place (Chanel rule), then re-screenshot.
