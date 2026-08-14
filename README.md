# AgentGate

AgentGate is a local-first personal dashboard for one Hermes agent. It provides
one private UI for Hermes chat sessions, ToolGate verification requests,
MemoryGate context, Hermes cron jobs, suggestions, apps, and character settings.

## What Works Now

- Responsive desktop sidebar and mobile hamburger navigation.
- Hermes session list, create, rename/delete proxy routes, fork route, and SSE
  chat streaming.
- ToolGate verification inbox and owner approve/reject decisions.
- Hermes cron job list, create, pause, resume, run-now, and delete routes.
- Local suggestions and personal app registry with Home pinning, health checks,
  and removal.
- ToolGate and MemoryGate summary screens.
- One inspectable character profile and context preview stored locally.
- A scoped AgentGate MCP bridge for Hermes to create suggestions and register
  apps.
- Installable PWA shell.

Hermes, ToolGate, and MemoryGate remain the source of truth for their own data.
AgentGate never sends their credentials to the browser.

## Prerequisites

- Docker Engine with Compose plugin.
- Hermes API server enabled on port `8642`.
- ToolGate and MemoryGate running when their screens are needed.

## First Run

Use the Compose-driven stack in `conker` as the supported boot path:

```bash
cd ../conker
./install.sh --local
```

Open `http://127.0.0.1:8030`, then sign in with the `AGENTGATE_ADMIN_KEY`
stored in `../conker/.env`.

## Connect And Verify

AgentGate reads the service URLs and private keys only from `.env`. Configure
`HERMES_URL`, `HERMES_API_KEY`, `TOOLGATE_URL`, `TOOLGATE_ADMIN_KEY`,
`MEMORYGATE_URL`, `MEMORYGATE_ADMIN_KEY`, and `MEMORYGATE_AGENT_ID` before
starting it. Do not put these values in the browser or a Hermes MCP file.

After sign-in, use Home to confirm all three health cards are connected. Then
perform these owner-safe checks:

1. Create a chat and send a harmless prompt; confirm token and tool activity
   stream into the chat.
2. Open ToolGate and MemoryGate; confirm their summaries load without exposing
   keys or raw secret values.
3. Create a paused Hermes cron job, use `Run now`, then delete it.
4. If a ToolGate verification is pending, review its redacted action details
   and decide it only when the bound action is correct.

The dashboard requires the Hermes API server to be running. Its bearer key is
required even on loopback because that API can use Hermes' full toolset.

To verify the full local stack, run:

```bash
cd ../conker
./install.sh verify
```

## Backup And Restore

AgentGate-owned UI state is stored only in `data/agentgate.db`; conversations,
tools, memories, and cron execution history remain in their source systems.

Stop AgentGate before copying the database, then use:

```powershell
Set-Location P:\repos\agentgate
Copy-Item data\agentgate.db backups\agentgate-$(Get-Date -Format yyyyMMdd-HHmmss).db
```

To restore, stop AgentGate and replace `data\agentgate.db` with the chosen
backup. Do not copy `.env` into backups or version control.

## Development

For local development, rebuild and restart through the Compose stack:

```bash
cd ../conker
docker compose up -d --build agentgate
```

## Hermes MCP Output Bridge

Add `integrations/mcp/agentgate.hermes.mcp.json` to the Hermes MCP configuration
and replace the placeholder `AGENTGATE_MCP_KEY` with the private value from
AgentGate `.env`.

Hermes receives only two AgentGate tools:

- `agentgate_create_suggestion`
- `agentgate_register_app`

The bridge cannot approve actions, read private dashboard data, or access owner
credentials.

## Verification

```bash
cd ../conker
./install.sh verify
```

## Current Limits

- Voice, video, realtime avatar, native mobile packages, rich document editing,
  autonomous Missions, and generated-app deployment are intentionally deferred.
- Character settings are stored in AgentGate. Global `SOUL.md` sync is the next
  integration step because Hermes dashboard management may require its own local
  auth configuration.
- MemoryGate incognito is displayed as a preference until Hermes exposes
  per-request enforced tool filtering for the active profile.

## Security

- Keep `.env` local and never commit it.
- Use AgentGate only on localhost, Tailscale, or another authenticated private
  network.
- AgentGate routes browser requests through its backend so upstream keys remain
  server-side.
- ToolGate remains the authority for action approval binding and one-time
  verification consumption.
