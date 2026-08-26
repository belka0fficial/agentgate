# AgentGate Development Team

## Principle

Hermes is development infrastructure only. Team profiles, their Skills, Kanban state, and worktrees are not AgentGate production dependencies.

## Roles

### Conker — Chief

- owns product decisions, Kanban routing, integration, and owner reporting;
- freezes acceptance criteria before implementation;
- assigns one owner per task;
- merges only after spec and QA review;
- resolves cross-domain conflicts.

### AgentGate Architect

- owns contracts, ADRs, domain boundaries, and data ownership;
- checks that AgentGate does not duplicate Pi/MemoryGate/ToolGate/SystemGate;
- reviews schema/version/migration decisions;
- does not perform broad feature implementation unless assigned.

### AgentGate UI Engineer

- owns React/TanStack UX, responsive behavior, accessibility, and source-bound states;
- works only against accepted contracts;
- preserves the polished product feel without placeholder theatre.

### AgentGate Systems Engineer

- owns AgentGate BFF, Pi adapter integration, Gate clients, events, redaction, Docker/server integration, and contract tests;
- never exposes secrets or unrestricted proxy/host authority.

### AgentGate QA/Security

- writes/reviews tests, reproduces failures, checks exact approvals, scans bundles, verifies mobile/error/degraded states, and challenges worker claims;
- does not approve its own implementation.

### Scout

- runs bounded global/Chinese technology research and reference refresh;
- produces cited candidates and spike proposals, never automatic installs.

## Concurrency

- Maximum active implementation workers: 2.
- Optional third worker is read-only review/research.
- QA follows implementation rather than racing on the same files.
- More profiles may exist, but they are launched only when assigned.

## Worktree contract

- one task = one branch = one worktree = one owner;
- base from updated `develop`;
- no shared writable worktree;
- no direct edits to `main` or integration;
- commit small verified units;
- remove finished worktrees after merge;
- preserve a shared pnpm cache but separate `node_modules` state where needed.

## Review pipeline

```text
accepted task/spec
  -> implementation owner
  -> Architect spec-compliance review
  -> QA/security/code-quality review
  -> Conker integration
  -> develop verification
  -> owner review
  -> main promotion
```

## Model use

- Strong reasoning model: architecture, difficult implementation, merge conflicts, security-sensitive review.
- Faster/cheaper model: documentation indexing, repository scouting, straightforward test generation.
- No local large model is required for the development team.
- Paid model use must be bounded by task and acceptance criteria.

## Worker completion contract

A worker reports:

- branch/worktree;
- exact files changed;
- tests run and real output;
- known limitations;
- commit SHA;
- anything still blocked.

Worker self-report is not proof. Conker/QA reads the diff and reruns the checks.
