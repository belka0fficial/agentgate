# Attention and Notifications

## Purpose

AgentGate exposes a bounded owner-facing attention summary so Conker and the UI can show what needs review without inventing a notification system.

The foundation scope is read-only state aggregation for:

- pending owner approvals from ToolGate requests and stored Brain verification references;
- degraded, offline, stale, or blocked Gate dependencies;
- failed recent Brain/Pi jobs when `/api/jobs` reports durable job metadata or run history;
- new local AgentGate suggestions created from explicit owner/MCP inputs.

## Non-goals

Foundation attention state does not provide browser push, mobile push, background execution, voice/audio, camera, avatar behavior, or a separate fake activity feed.

## Source of truth

| Attention row | Authority |
| --- | --- |
| Pending ToolGate approvals | ToolGate `/v2/requests` verification rows |
| Pending Brain approvals | AgentGate `verification_refs` created from real Brain/Pi run approval references |
| Dependency state | Gate health/status endpoints |
| Failed/recent jobs | Brain/Pi `/api/jobs` metadata and run history |
| Suggestions | AgentGate local `suggestions` table populated by owner or MCP contract |

If one source is unavailable, only that source is marked degraded/blocked/offline; other source-backed rows remain usable.

## API contract

`GET /api/attention` returns browser-safe metadata only:

```json
{
  "metadata_only": true,
  "status": "empty|live|degraded",
  "source_status": {
    "brain": {"status": "live", "source": "brain"},
    "toolgate": {"status": "degraded", "source": "toolgate"},
    "memorygate": {"status": "offline", "source": "memorygate"},
    "systemgate": {"status": "stale", "source": "systemgate"},
    "toolgate_requests": {"status": "live", "source": "toolgate"},
    "brain_jobs": {"status": "live", "source": "brain"}
  },
  "summary": {
    "pending_approvals": 0,
    "degraded_dependencies": 0,
    "failed_recent_jobs": 0,
    "new_suggestions": 0
  },
  "items": [],
  "empty_state": "empty",
  "notifications": {
    "status": "planned",
    "source": "agentgate",
    "delivery": [],
    "reason": "No durable browser push or background delivery notification contract is available."
  }
}
```

Item shapes are intentionally small and source-bound:

- `pending_approval` rows include source, source_id, sanitized title/severity, and a read-only `/approvals?...` href.
- `degraded_dependency` rows include the dependency source and canonical state.
- `failed_recent_job` rows include a sanitized job id, generic title, optional sanitized `last_run`, and `/flow-execution/{id}` href.
- `new_suggestion` rows include sanitized suggestion metadata and `/suggestions` href.

## Security/privacy boundary

The browser response must not include raw prompts, memory prose, tool args/results, logs, secrets, provider URLs, host paths, Docker socket paths, command lines, environment dumps, or upstream private errors. Rows use generic titles where source-authored names may contain private runtime text.

## States

- `empty`: all queried sources are available and no attention rows exist.
- `live`: at least one source-bound attention row exists and no queried source is degraded/offline/stale/blocked.
- `degraded`: any queried source is degraded/offline/stale/blocked, even if some rows are still present.
- `planned`: durable notification delivery metadata when no push/background notification contract exists.

## Tests and acceptance criteria

Contract tests cover:

- aggregation from real current sources;
- partial-failure status behavior;
- no fake browser/background notification delivery;
- redaction of prompts, tool arguments/results, logs, secrets, paths, provider URLs, and private job names;
- empty state without invented activity.

## Migration and rollback

No database migration is required. Rollback is removing `/api/attention` and this documentation; existing approval, job, health, and suggestion endpoints/tables are unchanged.
