# AgentGate UI — Design Language Addendum v2: "The Specimen"

This file EXTENDS agentgate-ui-requirements.md. Everything there about structure, screens, density, motion law, copy, and engineering constraints remains binding. This addendum replaces ONLY the aesthetic layer (palette details, texture, the Core's visual identity) because v1's execution landed on generic dark-teal dashboard. Priority order is absolute and resolves every conflict:

1. USABILITY — the spec's screens, density, keyboard flow, inline approvals. If an aesthetic idea costs usability, the aesthetic loses. Always.
2. BASE SYSTEM — clean dashboard craft in the register of dashboardstack.sh: calm dark surfaces, precise 1px outlines, generous-but-dense spacing rhythm, restrained type, quiet controls. This is 90% of every screen and it must stand alone as a excellent, boring, professional dashboard BEFORE the layer below is added.
3. SIGNATURE LAYER — the specimen aesthetic, applied in few deliberate places. This is the last 10% and it is what makes the product unmistakable.

## The concept (read this before styling anything)

Reference folder: docs/ui/refs/ (owner-provided images — study them before writing any CSS).
What the references share: a black void; monochrome scientific line-work (anatomical etching, wireframe, blueprint annotation); ONE living iridescent object as the sole full-color element; tiny technical micro-labels around it, like a lab plate documenting a specimen.

The metaphor for this product: **the dashboard is a laboratory document, and the agent is the specimen under observation.** Something possibly-alive being studied with scientific seriousness. Mysterious, serious, slightly unsettling, beautiful. NOT cyberpunk, NOT neon-hacker, NOT friendly-mascot. The owner's phrase: "like we build something on the level of human brain neurons science — a super human." The tension the design must hold: *status: unknown* — never declaring the thing alive (kitsch) or dead (boring).

## Palette revision

- Background goes deeper: `--bg` #050608 (true void, near-black). Surfaces #0C0F14. Lines #1A1F29 with a brighter #2A3140 for emphasized outlines.
- Text: #E8EDF4 / dim #7E8798.
- KILL the flat teal accent as the identity. Replace with a two-part system:
  - `--signal` #C8CFDA (cold pale silver) — the working accent for active states, focus, selected nav. Monochrome, calm, blueprint-like.
  - `--life` — an IRIDESCENT treatment, not a single hex: a subtle spectral shift (cyan→violet→magenta, like light through glass — see the orb and flower refs). Implemented as a slim animated gradient or canvas shader. RESERVED EXCLUSIVELY for: the Core, live-streaming text cursor, the one currently-executing item, and approval-pending pulse. If --life appears in more than ~2 places per screen, it's wrong. Everything else is monochrome.
- danger #FF4D5E and warn #FFB454 unchanged (they're semantics, not aesthetics).
- Still zero gradients on surfaces/panels. Iridescence lives only in --life elements.

## Texture & line-work (the blueprint layer)

Use sparingly — these are seasoning, not sauce:
- Micro-annotations: 9–10px uppercase mono labels with hairline leader-lines on the Core and on section corners of key panels (e.g. "SPECIMEN: HERMES · STATE: THINKING", "GATE 03 · MEMORY"). Real data only — every annotation must display a true value from the system, never lorem-tech gibberish. Max ~3 annotations visible per screen.
- Hairline structure: 0.5–1px rules, occasional corner ticks (registration marks) on the most important panel of a screen only (Command's briefing, Approvals' binding block). Not on every card.
- Dot-matrix/halftone texture (see dotted flower ref): permitted ONLY as the rendering style of the Core's particles and as ultra-subtle (<3% opacity) background field behind the Core area. Never behind text.
- A faint background grid (blueprint graph) is allowed on Command and System only, <2% opacity, must be invisible in screenshots unless looked for.

## The Core, redefined (this is the centerpiece — spend the effort here)

The Core is the specimen: a particle/line structure that reads as something between a neuron cluster, a hologram, and an organism. Rendering direction from the refs: thousands of fine monochrome dots/lines forming a sphere-ish organic mass, with iridescent (--life) light playing across it only when active. Orbit rings or measurement arcs (thin, monochrome) may surround it, annotated with 2–3 live micro-labels (state, model, tokens this session).
- All seven event-driven states from v1 remain the contract (idle/listening/thinking/speaking/executing/blocked/error). Idle = monochrome, nearly still, dim — a specimen at rest. Activity brings the iridescence in, proportional to intensity. Error = one danger flash, then monochrome stillness.
- The mini-Core in the top bar keeps the same rendering at small scale (can drop to a simple particle ring for perf).
- 60fps on phone stays the bar; degrade particle count first.
- This component is where "AI-controlled UI" begins and ends for v1: the system visibly drives the specimen. Do NOT build agent-generated dialog windows/custom UI generation in this pass — it's a later capability; note it as a TODO in the report and nothing more.

## What stays strictly base-system (do not specimen-ify)

Approvals content, forms, tables, chat text, settings — all pure base system. The binding block on Approvals may carry corner ticks; nothing else decorative near a decision. A screen with no live agent activity should look like a immaculate quiet instrument, full stop. The specimen aesthetic must never make any datum harder to read — acceptance item: every screenshot passes the question "could a stranger operate this screen instantly?"

## Anti-slop guards for this pass (learned from v1's result)

- No uniform teal-on-black everywhere: monochrome first, --signal for interaction, --life scarce.
- No glow/box-shadow bloom on panels or buttons. Iridescence ≠ glow: it's color shift on the object itself, not light bleeding around rectangles.
- No decorative scanlines, noise overlays, corner brackets on every element, or fake "terminal" chrome.
- Fonts unchanged from v1 (Inter/Geist + mono for machine data). The scientific character comes from line-work, annotation, and the Core — not from a stylized font.
- The Chanel rule from v1's checklist now runs per screen against THIS addendum: if a blueprint element doesn't reference real data or real structure, remove it.

## Acceptance additions (extend the v1 checklist)

13. Side-by-side: each screen screenshotted with the Core idle vs active — idle must read calm monochrome instrument; active must read visibly alive via --life without layout shift.
14. Annotation audit: every micro-label on every screen traced to a real API value.
15. --life audit: count its appearances per screen; >2 fails.
16. Ref fidelity: place docs/ui/refs images beside final screenshots in the report; a reviewer should see the family resemblance in the Core and the annotation language WITHOUT the screens looking like posters — they're working instruments wearing the aesthetic, not artworks.
