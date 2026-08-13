# VidForge maintenance backlog

This is a practical backlog for improving VidForge as a real open-source project. Each item should result in a focused change, a test or reproducible verification step, and a traceable commit or issue. The list is intentionally ordered by risk reduction and contributor value rather than by activity volume.

## Reliability and security

- [ ] Add integration tests for the health and authentication endpoints.
- [x] Add database migrations and document the production migration workflow.
- [x] Add a Docker Compose environment for local PostgreSQL/pgvector and Redis.
- [ ] Verify production startup fails safely when required secrets are missing.
- [ ] Add request-size and upload-type limits to every media upload path.
- [ ] Add rate limiting guidance and a deployable default for authentication endpoints.
- [ ] Add structured error codes for provider, queue, storage, and composition failures.
- [x] Add idempotency handling for material-analysis enqueue and retry paths.
- [x] Add queue health re-checks and shutdown behavior; document recovery runbook next.
- [x] Persist deterministic ARK responses in Redis with a bounded in-memory fallback.
- [x] Recover pending Agent runs on startup and mark interrupted running runs for explicit replay.
- [ ] Add a security test for path traversal and unsafe media filenames.
- [ ] Review dependency update PRs in isolated branches before merging.

## Video pipeline value

- [x] Define provider interfaces for text, video, TTS, object storage, and media processing.
- [x] Add a deterministic local fixture mode for composition without paid providers.
- [x] Add a minimal end-to-end smoke path from product asset to rendered artifact.
- [ ] Add media metadata validation before FFmpeg composition.
- [ ] Add explicit audio, subtitle, aspect-ratio, and duration validation.
- [ ] Add resumable per-shot generation and failed-shot replay.
- [ ] Add output artifact checksums and trace links.
- [x] Add a small offline benchmark fixture for cache-key latency and estimated provider cost.
- [ ] Add quality-agent evaluation criteria with documented limitations.
- [ ] Add sample product assets and a reproducible example under a clear license.

## Multi-agent and observability

- [ ] Document the agent state machine and node contracts.
- [x] Add trace correlation IDs from HTTP request through async work and optional OTLP export.
- [ ] Add structured JSON logs with secret and prompt redaction.
- [ ] Add a provider latency, failure, and cost dashboard contract.
- [ ] Add human-review checkpoints for policy-sensitive outputs.
- [ ] Add bounded retry and backoff policies per provider class.
- [ ] Add a run export format for reproducing and debugging a completed task.

## Contributor and community experience

- [ ] Add a first-contribution walkthrough that reaches a passing local test.
- [ ] Add labels and milestones for reliability, video, agents, docs, and good-first-issue work.
- [ ] Add a contributor-facing architecture decision record template.
- [ ] Publish a short comparison of VidForge boundaries with Remotion, LangGraph, Temporal, and OpenTelemetry patterns.

## Reference projects

These are references for patterns, not dependencies to copy blindly:

- [Remotion](https://github.com/remotion-dev/remotion): React-first, programmatic video composition and renderer ergonomics.
- [LangGraph](https://github.com/langchain-ai/langgraph): stateful graph execution, interrupts, and agent orchestration patterns.
- [Temporal](https://github.com/temporalio/temporal): durable execution and recovery semantics for long-running workflows.
- [OpenTelemetry JS](https://github.com/open-telemetry/opentelemetry-js): vendor-neutral traces, metrics, and logs.
- [OpenTelemetry JS Contrib](https://github.com/open-telemetry/opentelemetry-js-contrib): community instrumentation ownership and stability conventions.

The reference links were checked on 2026-08-13. Re-evaluate licenses and API compatibility before adopting any implementation or dependency.
