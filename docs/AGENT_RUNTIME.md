# VidForge Agent Runtime

VidForge uses a deterministic LangGraph workflow with specialized agents. The
graph keeps the high-cost media steps behind explicit state boundaries:

```text
material_analysis -> script_generation -> video_composition -> quality_control
                                      ^                         |
                                      |----- quality replan ----|
```

## Runtime guarantees

- `POST /api/agent/run` creates a durable `agent_runs` control-plane record and
  returns a task ID immediately; `GET /api/agent/status/:taskId` reads the
  latest state from PostgreSQL rather than process memory.
- The database record is the durable control plane for status and final output.
  It also carries an optional idempotency key, worker ownership, attempt count,
  lease expiry, heartbeat, graph thread ID and the latest checkpoint ID. The
  metadata prevents two workers from claiming the same pending run and links
  the control-plane record to LangGraph's persisted state.
- `Idempotency-Key` can be sent with `POST /api/agent/run`. Repeating the same
  key for the same authenticated user returns the existing run instead of
  creating another provider-consuming task. The key is capped at 200
  characters and is backed by a database unique index.
- The API process only writes the run record and enqueues an `agent-run` job.
  `PROCESS_ROLE=agent-worker` starts a separate Nest application context with
  the BullMQ consumer; the worker claims a pending run with a conditional
  status update. Progress updates renew its lease and heartbeat.
- LangGraph is compiled with `PostgresSaver` and invoked with the run's stable
  `thread_id`. Each graph super-step is persisted. When a worker lease expires,
  the next worker changes the run back to `pending` and invokes the same thread
  with `null` input, so LangGraph resumes from the latest unfinished node
  rather than replaying completed nodes.
- Checkpointer tables are initialized explicitly with
  `pnpm checkpointer:setup`; schema setup is never hidden in a request path.
  The CI PostgreSQL job runs a failure-and-resume smoke test that asserts the
  completed predecessor node executes exactly once.
- Provider, database, and transient network failures use LangGraph retry
  policies with exponential backoff.
- Cancellation, syntax/type errors, and HTTP 4xx input errors are not retried.
- Quality failures re-enter `script_generation`, so the quality feedback is
  actually available to the next plan instead of repeating the same render.
- The replan budget is bounded by `AGENT_QC_MAX_RETRIES` (default `2`).
- The complete workflow is persisted as an `agent_workflow` trace span with
  status, retry count, final node, quality score, and trace span count.
- Status reads and cancellation are scoped to the authenticated user, so a task
  ID cannot be used to inspect another user's run.
- Long-term agent memory is stored separately in `agent_memories`, rather than
  being mixed into product-space configuration. Memories are scoped by user
  and optionally product space, carry a source run ID, importance, expiry and
  access metadata, and can be listed or deleted through `/api/agent/memory`.
- Workflow startup performs bounded, deterministic retrieval of relevant
  memories. Retrieved items are hints only; they never replace the current
  request or bypass authorization. A successful quality-controlled run may
  write one `success_pattern` memory. Memory-write idempotency and HTTP run
  idempotency are separate concerns.
- Retrieved memories enter the script prompt through a bounded context packet.
  The packet keeps hit IDs, kinds and scores, escapes control/markup characters,
  labels the content as reference data rather than instructions, and enforces
  `AGENT_MEMORY_MAX_CHARS` before model invocation.
- Script generation retains the seed RAG references in `scriptGeneration` and
  the workflow trace metadata, so a future hybrid retriever or reranker can be
  evaluated against evidence instead of only the final text.
- The initial retriever is lexical and provider-neutral. It is intentionally a
  stable seam for a later pgvector hybrid retriever or reranker without making
  the workflow depend on a specific embedding vendor.

## Tuning

```dotenv
AGENT_MAX_RETRIES=3
AGENT_RETRY_BASE_DELAY_MS=2000
AGENT_QC_MAX_RETRIES=2
AGENT_MEMORY_TOP_K=6
AGENT_MEMORY_MAX_CHARS=1800
AGENT_LEASE_DURATION_MS=120000
# PROCESS_ROLE=api                 # agent-worker on the dedicated consumer
# AGENT_WORKER_ID=agent-worker-1
# QUEUE_INLINE_FALLBACK=false      # production default
```

Values are clamped by the runtime to prevent accidental retry storms or
unbounded prompt growth. The
workflow remains deterministic at the graph level; model calls are isolated in
specialized nodes so later work can replace one node with a router, subagent,
or human approval step without changing the media pipeline contract.

## Reliability boundary

The durable execution boundary is now implemented for the LangGraph workflow:

- PostgreSQL protects the run record, duplicate create requests and graph
  checkpoints;
- BullMQ + Redis provides durable dispatch, retry and independent worker
  execution;
- the conditional claim and lease reclaimer protect a run from concurrent
  ownership and recover stale workers;
- the composition node stores stable ARK operation keys and reuses checkpointed
  remote task IDs or completed URLs where possible. A provider must honor the
  `Idempotency-Key` header for provider-side deduplication; the graph's own
  state and the run control plane remain the source of truth;
- PostgreSQL/Redis must be configured in production. Inline execution is only
  a development fallback and should not be enabled for a production API.

Human approval checkpoints, cost budgets and richer provider operation ledgers
remain follow-up milestones rather than undocumented guarantees.

## Deployment checklist

Run the TypeORM migrations and initialize the LangGraph tables against the same
PostgreSQL instance before accepting Agent traffic:

```bash
pnpm --filter @vidforge/backend migration:run
pnpm checkpointer:setup
```

Run the API and Agent Worker as separate processes with the same
`DATABASE_URL`, `REDIS_URL`, and provider credentials:

```bash
PROCESS_ROLE=api pnpm --filter @vidforge/backend start:prod
PROCESS_ROLE=agent-worker pnpm --filter @vidforge/backend start:worker
```

`render.yaml` contains both service definitions. For Railway, deploy the
normal `railway.json` as the API service and use `railway.worker.json` for a
second service. The worker does not expose HTTP; its health is represented by
BullMQ activity and the AgentRun lease heartbeat.
