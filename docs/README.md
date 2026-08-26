# AgentGate Documentation

This directory is the durable source of truth for AgentGate product, UX, architecture, contracts, development, and technology references.

## Authority order

When documents disagree, use this order:

1. Versioned API/contracts and accepted architecture decision records.
2. Current documents under `docs/product/`, `docs/architecture/`, `docs/contracts/`, and `docs/ux/`.
3. The current master implementation plan under `.hermes/plans/`.
4. Root-level historical product notes and implementation plans.
5. UI reports and screenshots.
6. Conversation history.

Conversation ideas must be promoted into project documentation before they become implementation requirements.

## Current source documents

### Product

- [`product/continuous-improvement.md`](product/continuous-improvement.md) — response feedback, evaluated changes, versioning, canaries, and rollback.
- [`product/technology-intelligence.md`](product/technology-intelligence.md) — weekly global/Chinese research Jobs and Companion delivery.
- [`product/conversation-control-and-focus-presence.md`](product/conversation-control-and-focus-presence.md) — multi-message turns, manual voice floor control, communication routing, screen sharing, Focus Room, and desktop Companion modes.
- [`product/attention-notifications.md`](product/attention-notifications.md) — source-bound attention summary and planned notification delivery boundary.

### Architecture

- [`architecture/software-supply-chain.md`](architecture/software-supply-chain.md) — packages, libraries, containers, SBOMs, vulnerabilities, licenses, and update ownership.

### References

- [`references/technology-catalog.md`](references/technology-catalog.md) — repositories and technology adoption decisions.

### Development

- [`development/fast-ui-loop.md`](development/fast-ui-loop.md) — laptop Vite HMR through a Tailscale/SSH tunnel to the server runtime.
- [`development/team.md`](development/team.md) — scoped development roles, worktrees, concurrency, and review pipeline.

### Master plans

- [Product architecture and foundation plan](../.hermes/plans/2026-08-26_012753-agentgate-product-architecture-foundation.md)
- [Reference technology catalog plan](../.hermes/plans/2026-08-26_012753-agentgate-reference-technology-catalog.md)

## Status language

Every feature/status in documentation and UI must be one of:

- **Live:** source-bound and verified.
- **Degraded:** partially working with a known failure.
- **Offline:** the source reports unavailable.
- **Stale:** last evidence is older than its freshness policy.
- **Blocked:** waiting for a dependency, permission, or owner decision.
- **Empty:** supported but no objects currently exist.
- **Planned:** documented but not implemented.
- **Unknown:** insufficient evidence.

Never use a green badge, “connected,” “healthy,” “secure,” or “updated” based only on intended configuration.

## Documentation rule

New domains must document:

- purpose and non-goals;
- source of truth;
- owner-facing UX;
- API/event contract;
- security/privacy boundary;
- loading/empty/stale/degraded/error states;
- tests and acceptance criteria;
- migration and rollback;
- relevant repositories and licenses.
