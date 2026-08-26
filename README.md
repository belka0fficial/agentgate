# AgentGate

AgentGate is a local-first personal dashboard for one brain runtime. It provides one private UI for chat sessions, ToolGate verification requests, MemoryGate context, brain cron jobs, suggestions, apps, and character settings.

## What Works Now

- Session list, create, rename/delete proxy routes, fork route, and SSE chat streaming.
- ToolGate verification inbox and owner approve/reject decisions.
- Brain cron job list, create, pause, resume, run-now, and delete routes.
- Local suggestions and personal app registry with Home pinning, health checks, and removal.
- ToolGate and MemoryGate summary screens.
- One inspectable character profile and context preview stored locally.
- A scoped AgentGate MCP bridge for the brain runtime to create suggestions and register apps.

ToolGate, MemoryGate, and the brain runtime remain the source of truth for their own data. AgentGate never sends their credentials to the browser.

## Prerequisites

- Docker Engine with Compose plugin.
- Pi auth already authorized on this host at `~/.pi/agent/auth.json`.
- ToolGate and MemoryGate running when their screens are needed.

## First Run

Use the Compose-driven stack in `conker` as the supported boot path:

```bash
cd ../conker
./install.sh --local
```

Open `http://127.0.0.1:8030`, then sign in with the `AGENTGATE_ADMIN_KEY` stored in `../conker/.env`.

## Connect And Verify

AgentGate reads the service URLs and private keys only from `.env`. Configure `BRAIN_URL`, `BRAIN_API_KEY`, `TOOLGATE_URL`, `TOOLGATE_ADMIN_KEY`, `MEMORYGATE_URL`, `MEMORYGATE_ADMIN_KEY`, and `MEMORYGATE_AGENT_ID` before starting it.

After sign-in, use Home to confirm the health cards are connected. Then perform these owner-safe checks:

1. Create a chat and send a harmless prompt; confirm token and tool activity stream into the chat.
2. Open ToolGate and MemoryGate; confirm their summaries load without exposing keys or raw secret values.
3. Create a paused brain cron job, use `Run now`, then delete it.
4. If a ToolGate verification is pending, review its redacted action details and decide it only when the bound action is correct.

To verify the full local stack, run:

```bash
cd ../conker
./install.sh verify
```

## Development

For local development, rebuild and restart through the Compose stack:

```bash
cd ../conker
docker compose up -d --build agentgate
```

## Repo Layout

- `api/` is the AgentGate backend service.
- `dashboard/` is the current AgentGate frontend workspace.
- `docs/ui/current/` holds the official latest screenshot register for review.
- `docs/ui/archive/` holds earlier UI passes, experiments, and calibration captures.
- `docs/refs/` holds visual and motion references used during the redesign process.
- `docs/README.md` is the authoritative documentation index.
- `docs/product/` holds current product behavior, including Continuous Improvement and Technology Intelligence.
- `docs/architecture/` holds system ownership and Software Supply Chain design.
- `docs/references/technology-catalog.md` records repository/technology adoption decisions.

## Brain MCP Output Bridge

The bundled MCP bridge lets the brain runtime create suggestions and register apps without direct database access.

## Security

- Keep `.env` local and never commit it.
- Use AgentGate only on localhost, Tailscale, or another authenticated private network.
- AgentGate routes browser requests through its backend so upstream keys remain server-side.
- ToolGate remains the authority for action approval binding and one-time verification consumption.
