# AgentGate Release Hardening Operations

## Purpose and non-goals

This runbook covers the server-only release hardening baseline for AgentGate: deterministic outage contracts, backup/restore, upgrade/migration, safe production startup, health verification, rollback, and static/secret boundary scans.

Non-goals: this document does not claim any live deployment was performed, does not add voice/audio/camera/avatar/appearance work, and does not authorize feature behavior changes outside release hardening checks, documentation, and tooling.

## Source of truth

- Product/status language: `docs/README.md`.
- Supply-chain and browser-boundary requirements: `docs/architecture/software-supply-chain.md`.
- Runtime ownership boundaries: `AGENTS.md`.
- Current API implementation and tests under `api/`.
- Dashboard build/static artifacts under `dashboard/`.

Do not claim live, healthy, connected, secure, or updated unless the claim is source-bound and verified by the relevant command or upstream response. If only the AgentGate process responds, say that the process is live and dependencies are not checked.

## Deterministic outage and partial-failure contracts

AgentGate must make partial failures boring and reproducible:

- `/api/health` is process-only. It reports whether the AgentGate API process can answer and points to `/api/health/dependencies`; it does not imply Brain, ToolGate, MemoryGate, or SystemGate are live.
- `/api/health/dependencies` is owner-authenticated and queries Brain, ToolGate, MemoryGate, and SystemGate in a stable order: `brain`, `toolgate`, `memorygate`, `systemgate`.
- Dependency statuses must use only the documented status vocabulary: `live`, `degraded`, `offline`, `stale`, `blocked`, `empty`, `planned`, or `unknown`.
- 401/403/auth-required responses map to `blocked`, not live and not a raw upstream status.
- connection failures/timeouts map to `offline` or `degraded` with sanitized detail only.
- response payloads must not expose provider URLs, admin keys, authorization headers, host paths, Docker socket paths, hidden prompts, raw args, logs, or environment dumps.

Contract tests live in `api/tests/test_release_hardening.py`.

## Backup

Before an upgrade or migration:

1. Stop traffic or put AgentGate in maintenance mode at the ingress/reverse proxy if one exists.
2. Stop the AgentGate API process after confirming no write operation is in progress.
3. Record the exact git commit, branch, and package lockfile versions:
   - `git rev-parse HEAD`
   - `git status --short`
   - `sha256sum dashboard/pnpm-lock.yaml` when the dashboard lockfile exists.
4. Back up only server-side state and configuration references:
   - `AGENTGATE_DATA_DIR` contents, including the SQLite database.
   - deployment service unit/container manifest/reverse proxy config.
   - environment variable names and secret-store references, not raw secret values.
5. Store the backup outside the working tree with owner-readable permissions only.
6. Verify the backup artifact exists, is non-empty, and includes the database file before proceeding.

Never copy provider keys, Gate admin keys, OAuth tokens, or raw `.env` files into browser-accessible directories, issue trackers, logs, screenshots, or dashboard static assets.

## Restore

Restore is required to be rehearsable without claiming a production result:

1. Stop AgentGate and keep the old backup intact.
2. Restore `AGENTGATE_DATA_DIR` from the selected backup onto the target server.
3. Restore deployment manifests from reviewed configuration management or the backed-up server-side copy.
4. Reapply environment variables from the secret manager or local secure store; do not paste raw secrets into the repository.
5. Start AgentGate using the safe startup procedure below.
6. Verify `/api/health` and authenticated `/api/health/dependencies`.
7. If dependency health is `blocked`, `degraded`, `offline`, `stale`, or `unknown`, report that exact status and do not claim full service recovery.

## Upgrade and migration

For each upgrade:

1. Review the diff and lockfile changes against `origin/develop`.
2. Run the API and dashboard checks listed in `AGENTS.md`.
3. Run the static/secret scan after the dashboard build creates `dashboard/dist`.
4. Back up state before starting the new version.
5. Apply migrations only from reviewed code in the release branch. AgentGate currently initializes its local SQLite schema through `Database.initialize()`; any future destructive schema migration must have its own red/green test and rollback note before release.
6. Start the new version with the same secret-store references.
7. Verify process health and dependency health. Treat partial dependency failure as `degraded`/`blocked`/`offline` rather than success.
8. Preserve the previous artifact and backup until the owner accepts the release.

## Safe production startup

Required environment variables:

- `AGENTGATE_ADMIN_KEY` with at least 16 characters.
- `AGENTGATE_MCP_KEY` with at least 16 characters.
- `AGENTGATE_SESSION_SECRET` with at least 32 characters.
- `AGENTGATE_DATA_DIR` pointing to persistent server-side storage.
- upstream URLs/keys for Brain, ToolGate, MemoryGate, and SystemGate as available.

Startup verification:

1. Start the API with the production process manager or container runtime.
2. Query process health from the server or trusted network:
   - `curl -fsS http://127.0.0.1:8030/api/health`
3. Log in through the owner-authenticated flow and query dependencies:
   - `GET /api/health/dependencies`
4. Verify every visible status uses the documented vocabulary.
5. Do not claim live dependencies from `/api/health`; it is process-only.
6. If any dependency is not `live` or `empty`, publish the exact degraded state and owner-impact note.

## Static scan and secret scan

Run after building the dashboard and before packaging/deploying static assets:

```bash
python3 scripts/security/static-boundary-scan.py dashboard/dist
```

The scanner fails on AgentGate-specific forbidden browser/static content:

- Gate/admin/API key names and secret-shaped tokens.
- browser-visible authorization headers.
- provider upstream URLs.
- host paths and Docker socket paths.
- hidden prompt/raw argument labels.

A clean scan means only that these deterministic patterns were not found in the scanned artifacts. It is not a general proof that the release is secure.

## Rollback

Rollback when checks fail, migration cannot be verified, static scan finds forbidden content, or dependency health contradicts release expectations:

1. Stop the new AgentGate process or remove it from service.
2. Restore the previous artifact/container/image and server-side deployment manifest.
3. Restore the pre-upgrade `AGENTGATE_DATA_DIR` backup if the new version ran migrations or writes.
4. Start the previous version.
5. Verify `/api/health` process status and `/api/health/dependencies` authenticated dependency statuses.
6. Report the exact source-bound state. Do not claim live recovery until the source-bound checks support it.

## Acceptance checks

- API outage/partial-failure contract tests pass.
- Release runbook contains backup, restore, upgrade/migration, startup/health verification, static scan, secret scan, and rollback instructions.
- Dashboard build succeeds before scanning `dashboard/dist`.
- Static boundary scanner returns zero findings on the built artifacts.
- Generated artifacts are removed before commit unless they are intentional source files.
