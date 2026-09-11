# Event model and status sync

Gantry uses a **hybrid event model** today. Integrators should rely on structured
`GET /v1/tasks/{id}` results (Invariant I3), not agent chat messages.

## Current architecture

```
Worker (db_upsert_build)  →  builds table + api_tasks  →  GET /v1/tasks/{id}
Agentex status            →  background poller (10s)   →  SSE / webhooks
```

| Path | Role | Status |
|------|------|--------|
| `db_upsert_build` activity | Primary — writes `pr_url`, `branch`, `result` JSON | **Preferred (I3)** |
| `api/services/poller.py` | Polls Agentex for terminal status + lifecycle | Interim |
| Message scrape | Fallback when structured write missing | **Legacy only** |

## Structured results (I3)

On pipeline completion the Foreman calls `POST /internal/db/builds` with:

```json
{
  "pr_url": "https://github.com/org/repo/pull/42",
  "branch": "swarm/task-id",
  "result": { "pr_url": "...", "branch": "...", "quality_score": 8.5 }
}
```

`GET /v1/tasks/{id}` and SSE `done` events read from `builds` + `api_tasks` first.
The poller only fetches Agentex messages when structured fields are absent.

## SSE (`GET /v1/tasks/{id}/events`)

The SSE endpoint is a **polling adapter**: it aggregates Agentex task status and
messages with Gantry metadata every few seconds. It is not a native Temporal or
Agentex push stream.

See also: [`sse-events.md`](sse-events.md).

## Future direction (Phase 2+)

1. Agentex webhook → Gantry API on terminal status (replace 10s poll loop)
2. Temporal workflow signals → task_events for HITL and lifecycle milestones
3. Remove message-scrape fallback once structured writes are reliable in prod

Until then, ensure `GANTRY_API_URL` is reachable from the worker so
`db_upsert_build` succeeds — that is the canonical result path.
