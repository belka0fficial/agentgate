# Fast AgentGate Development Loop

## Goal

Edit the dashboard on the laptop with instant Vite HMR while the Pi adapter and Gates remain on `alexeylab`. Backend/integration workers use isolated server worktrees. Remote deployment is a checkpoint, not the inner UI loop.

## Topology

```text
Laptop dashboard :5175
  -> Vite /api and /health proxy
  -> localhost:18644
  -> SSH/Tailscale tunnel
  -> alexeylab 127.0.0.1:8644
  -> Pi adapter and Gates
```

No owner token, Gate key, provider key, or server `.env` is copied to the laptop dashboard.

## Branches

- `main` — stable/releasable.
- `develop` — integration.
- `agentgate/<task-slug>` — one worktree branch per task.

Server integration worktree:

```text
/home/alexeybe1kin/agentgate-worktrees/integration
```

The original `/home/alexeybe1kin/agentgate` checkout remains `main` and contains local runtime-only `agentgate-stack/` data ignored by Git.

## One-time prerequisite

The local SSH alias `agentgate-dev` must resolve through Tailscale using the dedicated development automation key. Verify:

```bash
ssh -o BatchMode=yes agentgate-dev 'hostname && whoami'
```

Expected:

```text
alexeylab
alexeybe1kin
```

## Start development

Terminal 1:

```bash
cd C:/Users/The1a/agentgate-work
bash scripts/dev/tunnel-agentgate.sh
```

Terminal 2:

```bash
cd C:/Users/The1a/agentgate-work
bash scripts/dev/preflight.sh
bash scripts/dev/start-dashboard.sh
```

Open:

```text
http://127.0.0.1:5175
```

Edit dashboard files locally. Vite HMR updates the browser without a Git commit or server pull.

## Stop development

Stop the Vite and tunnel processes with Ctrl+C in their terminals. The server stack continues running.

## Server integration

Workers create task worktrees from `develop`:

```bash
cd ~/agentgate-worktrees/integration
git fetch origin
git switch develop
git pull --ff-only

git worktree add ../<task-slug> -b agentgate/<task-slug> develop
```

After implementation and review:

```text
worker branch
  -> spec review
  -> code/QA review
  -> merge develop
  -> integration verification
  -> merge/promote main
```

Do not edit the integration or main checkout directly for feature work.

## Ports

- `5173` — server integration preview.
- `5175` — laptop local Vite preview.
- `18644` — laptop tunnel endpoint for server Pi adapter `8644`.
- `8644` — Pi adapter loopback on server.

Override local ports only through environment variables:

```bash
AGENTGATE_LOCAL_API_PORT=28644 AGENTGATE_DASHBOARD_PORT=6175 bash scripts/dev/start-dashboard.sh
```

## Troubleshooting

### SSH succeeds interactively but fails in scripts

Run:

```bash
ssh -vvv -o BatchMode=yes agentgate-dev true
```

The dedicated automation key should sign without a prompt. Do not remove or weaken the passphrase on the existing owner key.

### Preflight cannot reach health

Confirm the tunnel process is still running. The API remains loopback-only on the server; opening `127.0.0.1:18644` without the tunnel should fail.

### Port already used

Use the process manager to identify the tracked process. Do not start duplicate tmux/Vite sessions and let Vite silently choose another port.

### Browser login/session trouble

Use the normal AgentGate owner login. Do not put `AGENTGATE_OWNER_TOKEN` in dashboard source, local storage, committed `.env` files, or Vite build variables.

## Verification gate

Before merging a UI task:

```bash
cd dashboard
npx --yes pnpm@10.34.5 format:check
npx --yes pnpm@10.34.5 lint
npx --yes pnpm@10.34.5 test
npx --yes pnpm@10.34.5 build
```

Verify the changed screen against live source-bound data through the tunnel and at a phone-width viewport where relevant.
