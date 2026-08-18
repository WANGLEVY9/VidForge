# Agent reliability model

This document describes the reliability boundary that is implemented in the
repository today. It is intentionally narrower than a general durable-workflow
platform: it documents observable guarantees and remaining failure windows so
operators and contributors can make safe changes.

## Control planes

An Agent run has three persisted views, each with a different purpose:

| Record                | Storage                      | Purpose                                                                              |
| --------------------- | ---------------------------- | ------------------------------------------------------------------------------------ |
| `agent_runs`          | PostgreSQL                   | User-scoped run lifecycle, lease ownership, progress, attempt count and final result |
| LangGraph checkpoints | PostgreSQL (`PostgresSaver`) | Node-boundary state used to resume an unfinished graph thread                        |
| `provider_operations` | PostgreSQL                   | Sanitized audit ledger for external video-provider side effects                      |
| `agent_outbox_events` | PostgreSQL                   | Transactional Agent dispatch intent and at-least-once BullMQ delivery                |

The API process creates an `agent_runs` row and an `agent_outbox_events` row in
one transaction. The outbox dispatcher delivers an `agent-run` job with a
stable BullMQ job ID. Only a dedicated `PROCESS_ROLE=agent-worker` consumer
claims and executes the graph. A conditional `pending → running` update and a
renewable lease keep two workers from owning the same run.

## Video-provider operation lifecycle

For each generated shot, the Composition Agent uses the stable key
`<runId>:shot:<shotId>`:

```text
pending local operation
  → provider accepts request
  → remoteOperationId persisted
  → provider polling
  → succeeded | failed
```

The ledger stores the provider name, capability, node name, key, deterministic
request hash, safe request metadata, remote task ID, attempt count, result
metadata and bounded error text. It does not store credentials or the raw
prompt in the public audit response.

If a worker restarts after the remote task ID has been saved, a resumed graph
polls that task instead of submitting another one. If it restarts after the
provider accepted a request but before VidForge saved the remote ID, VidForge
submits the same stable idempotency key again. This reduces duplicate work only
when the selected provider honors that key.

## What is and is not guaranteed

Implemented:

- user-scoped HTTP idempotency for `POST /api/agent/run`;
- one durable `agent_runs` record per accepted idempotency key and user;
- queue dispatch with bounded BullMQ retries when Redis is configured;
- independent Agent Worker ownership, lease renewal and stale-lease recovery;
- LangGraph node-boundary resume with PostgreSQL checkpoints;
- stable video-provider operation keys plus persisted remote IDs and audit
  records;
- compact checkpoint history, redacted state inspection and Provider operation
  audit for the run owner;
- LangGraph `interrupt()` / `Command(resume)` human review for opt-in runs;
- owner-scoped checkpoint replay and isolated fork runs with a copied thread;
- transactional Agent outbox delivery with bounded retry and stale-lock recovery;
- multiple Agent Worker processes with a bounded per-process concurrency.
- JSON-serializable media jobs for shot generation, composition and export;
- independent Media Worker execution for all three media queues, with stable job
  IDs, bounded concurrency and processor failures propagated to BullMQ retry/DLQ.

Not yet implemented:

- exactly-once external provider calls independent of provider idempotency;
- event-sourced workflow history, workflow code versioning or global replay
  compatibility checks;
- an organization-level role, budget and policy engine.

## Owner audit API

`GET /api/agent/runs/:taskId/audit` is authenticated and scoped to the run
owner. It returns:

- the normal run status and control-plane metadata;
- a compact checkpoint timeline (ID, timestamp, step, status, current node,
  progress and retry count); and
- sanitized Provider operations for that run.

Additional owner-scoped controls are available through:

- `GET /api/agent/runs/:taskId/checkpoints/:checkpointId` for a redacted state
  projection;
- `POST /api/agent/runs/:taskId/resume` for an interrupted human review;
- `POST /api/agent/runs/:taskId/replay` to continue from the latest checkpoint;
- `POST /api/agent/runs/:taskId/fork?checkpointId=...` to create an isolated
  child thread from a checkpoint.

Raw checkpoint values are intentionally excluded because they can contain
prompts, material URLs, retrieval context and user-provided content. The API
is an operational inspection surface, not a public graph replay endpoint.

## Deployment and incident procedure

Before routing Agent traffic to a new environment:

```bash
pnpm --filter @vidforge/backend migration:run
pnpm checkpointer:setup
```

Run the API, Agent Worker and Media Worker separately with the same PostgreSQL
and Redis URLs. If a media task appears stuck, verify that the Media Worker is
consuming `creation-shot`, `creation-compose`, `export-encode` and
`material-analyze`. If an Agent task appears stuck, inspect its owner audit
first, then verify:

1. `agent_runs.leaseUntil` and `heartbeatAt` are progressing;
2. the `agent-run` queue has an active Worker;
3. `provider_operations.remoteOperationId` is present before retrying a paid
   operation;
4. the provider task's remote status agrees with the local ledger.

Do not manually delete checkpoint, operation or outbox rows to retry a paid
task. Use replay and the stable run/operation keys so the provider can
deduplicate safely.

## Verification

The CI checkpointer job initializes a real PostgreSQL checkpointer schema and
executes a failure/resume smoke test. The backend test suite also validates the
provider-operation migration and deterministic request-hash behavior. These
tests do not prove third-party provider idempotency; that remains an
integration responsibility for each adapter.
