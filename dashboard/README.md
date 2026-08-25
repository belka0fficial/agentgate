# AgentGate Dashboard

AgentGate is the private dashboard layer for a local personal-agent stack. This repository contains the presentation layer only: a high-contrast desktop/mobile UI for command, approvals, chats, system visibility, gates, character settings, and supporting agent surfaces.

The main work currently represented here is the UI overhaul completed in August 2026: a denser command center, a lab-style animated core, wider chat layouts with built-in voice/camera/live-call controls, and a cleaned dark visual language shaped around AgentGate instead of the original template baseline.

## Scope

This repo includes:

- Command screen UI and animated core surface
- Approval and verification review flows
- Chat surfaces with rich composer controls
- System, gates, cron, and settings screens
- Responsive layouts for desktop and Android-sized mobile views

This repo does not own:

- Hermes runtime orchestration
- Tool execution policy enforcement
- Memory storage or retrieval backends
- Host provisioning or infrastructure automation

Those systems are expected to exist beside this UI. AgentGate is the operator-facing shell that talks to them through the backend contract.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Radix UI
- TanStack Router
- TanStack Query

## Run Locally

```bash
pnpm install
pnpm dev
```

Default dev server:

- `http://localhost:5173`

## Quality Checks

```bash
pnpm format:check
pnpm lint
pnpm build
pnpm test
```

For the current UI pass, the working release gate has been:

- Prettier check
- ESLint
- TypeScript build
- Vite production build
- Browser QA screenshots for desktop and mobile

## UI References

Current captured UI references live under [docs/ui/current](docs/ui/current).

Desktop screenshots currently included:

- `character-detail-route.png`
- `character-list-route.png`
- `character-persona-list-cards.png`
- `character-studio-fork-step.png`
- `character-studio-mid-flow.png`
- `character-studio-preview-chat.png`

## GitHub Cleanup Notes

- Local-only QA artifacts such as `.playwright-cli/`, `.tanstack/tmp/`, and `.agentgate-lan-proxy.cjs` are intentionally ignored.
- Service credentials, private API keys, and machine-specific scripts should stay outside this repository.
- The main story of this branch is the AgentGate UI overhaul, not backend contract changes.

## License

Licensed under the [MIT License](LICENSE).
