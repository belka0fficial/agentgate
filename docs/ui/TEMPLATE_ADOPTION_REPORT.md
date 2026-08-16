# Template adoption — Command and Chats

Status: approval stop reached. No other screen was ported in this pass.

## What changed

- Adopted the dark-mode visual language and composition patterns of `satnaing/shadcn-admin`: sidebar grouping, 64px header, dashboard cards, standard stat cards, toolbar controls, and table/list treatment.
- Kept AgentGate routing, API calls, approval bindings, static Core slot, and mono machine values.
- Kept the page base darker than the template while preserving its card-to-background contrast.
- Added development-only fixtures for all API-backed screens. They include 9 varied sessions, 6 approvals (4 pending), 20 seeded activity events, 14 memories, 6 suggestions, 6 automations, system telemetry, and a populated chat transcript. Set `VITE_AGENTGATE_FIXTURES=0` to use a live development backend instead.

## Captures

| Screen | Desktop | 380px |
| --- | --- | --- |
| Command | [desktop](template-command-desktop.png) | [380px](template-command-380.png) |
| Chats | [desktop](template-chats-desktop.png) | [380px](template-chats-380.png) |
| Chat detail | [desktop](template-chat-detail-desktop.png) | [380px](template-chat-detail-380.png) |

## Verification

- `npm run build` passes.
- Browser console: 0 errors and 0 warnings during Command/Chats capture.
- No backend routes, request shapes, or production data behavior were changed.

## Deliberately deferred

The remaining seven screens and all motion work await screenshot approval for this Command/Chats template direction.
