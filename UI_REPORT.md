# AgentGate UI Report

Date: 2026-08-15

## Summary

AgentGate was rebuilt as a dark-only instrument UI: compact data surfaces, one elevation, strict status dots, a shared event bus, and a canvas Core driven by app events. Backend contracts were not changed.

## Acceptance Checklist

1. Pass — Banned-look audit passes for source and built bundle: no gradients, shadows, pill-radius values, or oversized radii.
2. Pass — Machine values are rendered through `code`, `pre`, status words, metric values, IDs, hashes, cron, timestamps, and bindings. Human copy stays in the UI face.
3. Pass — Accent is reserved for active nav, primary actions, live dots, links, and Core state. Warn/danger use their required colors.
4. Pass — Motion sources are event-bound: Core state from typing/chat/SSE/approval/stop, ticker from event bus, vitals from System data. Reduced motion collapses animation timing.
5. Pass — Core supports `idle`, `listening`, `thinking`, `speaking`, `executing`, `blocked`, and `error`. Live Hermes was not available in this run, but the real chat stream, tool-event, pending-approval, and stop-endpoint code paths are wired.
6. Pass — Command includes inline approve/reject, vitals line, event ticker, pinned app text links, anomalies, and no duplicated queue cards.
7. Pass — Approvals show exact binding without interaction and support `j/k` focus plus `a/r` approve/reject.
8. Pass — Runtime check passed at `380px` for Command, Approvals, Chat, System, and reduced-motion phone mode with no horizontal overflow.
9. Pass — `prefers-reduced-motion` was verified by Playwright context; state information remains visible.
10. Pass — `npm run build` clean, built bundle key-name grep clean, existing API tests pass.
11. Pass — All 9 screens have desktop and 380px screenshots in `docs/ui/`.
12. Pass — Self-critique pass completed. Removed or compressed legacy page headers, view-option chrome, pill badges, duplicated summaries, phone chat rail, third-party toast chrome, decorative page motion, light-theme code, card-per-item styling, and unused Radix theme CSS.

## Verification Commands

```powershell
npm run build
node P:\repos\agentgate\output\playwright\verify-ui-runtime.mjs
rg -n --fixed-strings <banned tokens> dashboard\src dashboard\dist
rg -n "AGENTGATE_ADMIN_KEY|AGENTGATE_SESSION_SECRET|AGENTGATE_MCP_KEY|HERMES_API_KEY|TOOLGATE_ADMIN_KEY|TOOLGATE_EXECUTION_KEY|MEMORYGATE_ADMIN_KEY|MEMORYGATE_READ_KEY" dashboard\dist
$env:PYTHONPATH = "P:\repos\agentgate\api\Lib\site-packages;P:\repos\agentgate\api"
python -m pytest P:\repos\agentgate\api\tests -q
```

Results:

- `npm run build`: passed.
- Runtime viewport/reduced-motion check: passed.
- Banned-look audit: passed.
- Bundle key grep: passed.
- API tests: `4 passed, 1 warning`.

## Screenshot Index

- `docs/ui/01-command-desktop.png`
- `docs/ui/01-command-phone.png`
- `docs/ui/02-approvals-desktop.png`
- `docs/ui/02-approvals-phone.png`
- `docs/ui/03-chats-desktop.png`
- `docs/ui/03-chats-phone.png`
- `docs/ui/04-chat-desktop.png`
- `docs/ui/04-chat-phone.png`
- `docs/ui/05-system-desktop.png`
- `docs/ui/05-system-phone.png`
- `docs/ui/06-automations-desktop.png`
- `docs/ui/06-automations-phone.png`
- `docs/ui/07-memory-desktop.png`
- `docs/ui/07-memory-phone.png`
- `docs/ui/08-suggestions-desktop.png`
- `docs/ui/08-suggestions-phone.png`
- `docs/ui/09-character-desktop.png`
- `docs/ui/09-character-phone.png`

## Notes

- Screenshots use safe demo API data from the Playwright harness; no live secrets or upstream keys are in artifacts.
- The API test environment was repaired by reinstalling `api/requirements.txt` into the existing local target because `pydantic_core` was missing its compiled module.
- Live Hermes/ToolGate/MemoryGate were not required for screenshots. The UI uses the existing frozen endpoints and will exercise live Core transitions when those services are running.
