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
| Command | [desktop](pass1-register-desktop-command.png) | [mobile](pass1-register-mobile-command.png) |
| Approvals | [desktop](pass1-register-desktop-approvals.png) | [mobile](pass1-register-mobile-approvals.png) |
| Chats | [desktop](pass1-register-desktop-chats.png) | [mobile](pass1-register-mobile-chats.png) |
| Chat detail | [desktop](pass1-register-desktop-chat-detail.png) | [mobile](pass1-register-mobile-chat-detail.png) |
| Suggestions | [desktop](pass1-register-desktop-suggestions.png) | [mobile](pass1-register-mobile-suggestions.png) |
| Automations | [desktop](pass1-register-desktop-automations.png) | [mobile](pass1-register-mobile-automations.png) |
| Memory | [desktop](pass1-register-desktop-memory.png) | [mobile](pass1-register-mobile-memory.png) |
| System | [desktop](pass1-register-desktop-system.png) | [mobile](pass1-register-mobile-system.png) |
| Character | [desktop](pass1-register-desktop-character.png) | [mobile](pass1-register-mobile-character.png) |

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

## Register correction — 2026-08-16

The initial PASS 1 review identified that the base system needed filled card construction rather than a field of outlined strips. Every screen now uses the shared surface-card register: `#0C0F14` surface fill, 6px radius, 1px subdued line, 16px internal padding, and 20px page gutters. Command vitals are now stat cards with large mono values. Toolbars, data regions, forms, the chat composer, and the Core each sit in their own filled card.

| Screen | Desktop | 380px |
|---|---|---|
| Command | [desktop](pass1-register-desktop-command.png) | [mobile](pass1-register-mobile-command.png) |
| Approvals | [desktop](pass1-register-desktop-approvals.png) | [mobile](pass1-register-mobile-approvals.png) |
| Chats | [desktop](pass1-register-desktop-chats.png) | [mobile](pass1-register-mobile-chats.png) |
| Chat detail | [desktop](pass1-register-desktop-chat-detail.png) | [mobile](pass1-register-mobile-chat-detail.png) |
| Suggestions | [desktop](pass1-register-desktop-suggestions.png) | [mobile](pass1-register-mobile-suggestions.png) |
| Automations | [desktop](pass1-register-desktop-automations.png) | [mobile](pass1-register-mobile-automations.png) |
| Memory | [desktop](pass1-register-desktop-memory.png) | [mobile](pass1-register-mobile-memory.png) |
| System | [desktop](pass1-register-desktop-system.png) | [mobile](pass1-register-mobile-system.png) |
| Character | [desktop](pass1-register-desktop-character.png) | [mobile](pass1-register-mobile-character.png) |

## Review request

Please approve or redirect the static visual language before PASS 1.5 begins. No motion work has been started.
