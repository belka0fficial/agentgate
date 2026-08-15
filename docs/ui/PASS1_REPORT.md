# PASS 1 — Static System

Status: complete. Motion work has not started.

## What changed

- Replaced the dashboard’s visual system with the Specimen base register: void black background, quiet blue-grey panels, hairline structure, silver signal color, and semantic warn/danger only.
- Added `dashboard/src/ui/registry.ts` as the shared source for shortcuts, status tone mapping, entity tags, relative timestamps, and copying machine values.
- Rebuilt the Core as a static, deterministic particle-and-line specimen render. It has no animation frame loop and only reflects its supplied state as a static geometry/color change.
- Updated the PWA theme and manifest background to `#050608`.
- Retained all existing API paths and action semantics. No upstream secret values or API keys were added to browser code.

## Screenshot evidence

Captured with representative browser-only fixture data. The fixture is not part of the app or production bundle.

| Screen | Desktop | 380px |
|---|---|---|
| Command | [desktop](pass1-desktop-command.png) | [mobile](pass1-mobile-command.png) |
| Approvals | [desktop](pass1-desktop-approvals.png) | [mobile](pass1-mobile-approvals.png) |
| Chats | [desktop](pass1-desktop-chats.png) | [mobile](pass1-mobile-chats.png) |
| Chat detail | [desktop](pass1-desktop-chat-detail.png) | [mobile](pass1-mobile-chat-detail.png) |
| Suggestions | [desktop](pass1-desktop-suggestions.png) | [mobile](pass1-mobile-suggestions.png) |
| Automations | [desktop](pass1-desktop-automations.png) | [mobile](pass1-mobile-automations.png) |
| Memory | [desktop](pass1-desktop-memory.png) | [mobile](pass1-mobile-memory.png) |
| System | [desktop](pass1-desktop-system.png) | [mobile](pass1-mobile-system.png) |
| Character | [desktop](pass1-desktop-character.png) | [mobile](pass1-mobile-character.png) |

## PASS 1 checks

- `npm run build`: passed.
- Bundle scan for `BRAIN_API_KEY`, `TOOLGATE_ADMIN_KEY`, `MEMORYGATE_ADMIN_KEY`, and `AGENTGATE_ADMIN_KEY`: no matches.
- Nine routes are captured at desktop and 380px. The chat list and detail are separately captured, matching the specification’s `02/03` split.
- No CSS keyframes, transitions, decorative loops, or Core animation frame loop remain in the PASS 1 implementation.
- The primary data decision surfaces remain plain base-system UI. The only specimen treatment is the Core and one factual label: `SPECIMEN · STATIC RENDER`.

## Deliberately deferred

- PASS 1.5: command palette, keyboard registry integration, copying affordances, destructive-action confirmation, toasts, offline/stale treatment, PWA icon work, and the remainder of the fit-and-finish checklist.
- PASS 2: live event bus integration, all seven animated Core states, the `/dev/core` harness, event arrivals, value ticks, and heartbeats.
- The addendum’s iridescent active-state treatment is deferred to PASS 2. PASS 1 intentionally retains a static monochrome/signal Core.

## Review request

Please approve or redirect the static visual language before PASS 1.5 begins. No motion work has been started.
