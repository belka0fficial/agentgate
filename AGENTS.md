# AgentGate Project Rules

## Product boundary

AgentGate is a local-first, single-owner personal AI operating system. It is still being built; do not treat it as finished infrastructure.

Production ownership:

- AgentGate: owner-facing UI, BFF, Character presentation, Companion Journal, App registry, orchestration UX.
- Pi adapter: production Agent runtime, sessions, Jobs, Agents, Teams, Runs, and future Flow/Loop execution.
- MemoryGate: evidence, personal memory, entities, episodes, patterns, and future procedural-memory Skills.
- ToolGate: Tools, secrets, deterministic Automations, approvals, execution, policy, and audit.
- SystemGate: read-only machine/system/security telemetry.
- Hermes: development harness only; AgentGate must still work if Hermes is uninstalled.

## Source of truth

Read `docs/README.md` first. Accepted contracts/ADRs and current docs override historical root notes and UI reports.

Never invent a live backend capability from a product idea. Mark it planned/blocked until a real contract exists.

## Security

The browser must never receive provider keys, Gate admin keys, OAuth tokens, hidden prompts, unrestricted raw memory, broad tool arguments, command lines, host paths, environment dumps, Docker socket paths, or provider upstream URLs.

Dangerous actions go through ToolGate. Personality/appearance never grants permissions.

## Development workflow

- `main` is stable.
- `develop` is integration.
- Each implementation task uses an isolated Git worktree/branch.
- Never edit `main` directly.
- Do not overwrite another worker's worktree.
- One task, one owner, one acceptance contract.
- Implementation requires spec review, then code/QA review.

## Checks

Dashboard:

```bash
cd dashboard
npx --yes pnpm@10.34.5 format:check
npx --yes pnpm@10.34.5 lint
npx --yes pnpm@10.34.5 test
npx --yes pnpm@10.34.5 build
```

API:

```bash
python -m pytest api/tests -q
```

Run targeted tests first. Never report completion from intention or a worker summary; verify the real output.

## UX rules

- Every status is source-bound: live, degraded, offline, stale, blocked, empty, planned, or unknown.
- No dashboard theatre or fake health/connected/activity claims.
- Settings contain rare global defaults only.
- Full screens support recurring browsing/history/operation.
- Dialogs are quick contextual tasks.
- Drawers inspect/edit one object while preserving list context.

## Scope order

Build the hardware-light text foundation first. Do not install or implement voice, camera emotion, Live2D, VRM/3D, digital-human, or heavy local-model runtimes until foundation acceptance gates pass and the owner explicitly starts that phase.

## Terminology

- Job is scheduled/triggered Agent work.
- ToolGate Automation is a deterministic versioned Tool workflow.
- Companion is a persistent conversational Agent with a Character Profile.
- Worker is a reusable nameless specialist definition.
- Subagent is a temporary runtime instance.
- Team defines participants; Flow defines order; Loop defines bounded repetition; Run is one execution.
