# VidForge maintenance backlog

This is a practical backlog for improving VidForge as a real open-source project. Each item should result in a focused change, a test or reproducible verification step, and a traceable commit or issue. The list is intentionally ordered by risk reduction and contributor value rather than by activity volume.

## Reliability and security

- [ ] Add integration tests for the health and authentication endpoints.
- [x] Add database migrations and document the production migration workflow.
- [ ] Verify production startup fails safely when required secrets are missing.
- [ ] Add request-size and upload-type limits to every media upload path.
- [ ] Add rate limiting guidance and a deployable default for authentication endpoints.
- [ ] Add structured error codes for provider, queue, storage, and composition failures.
- [ ] Add idempotency handling for video-creation requests and retry paths.
- [ ] Add queue shutdown/drain behavior and a recovery runbook.
- [ ] Add a security test for path traversal and unsafe media filenames.
- [ ] Review dependency update PRs in isolated branches before merging.

## Video pipeline value

- [ ] Define a provider interface for text, vision, video, TTS, and embeddings.
- [ ] Add a deterministic local fixture mode for composition without paid providers.
- [ ] Add a minimal end-to-end smoke path from product asset to rendered artifact.
- [ ] Add media metadata validation before FFmpeg composition.
- [ ] Add explicit audio, subtitle, aspect-ratio, and duration validation.
- [ ] Add resumable per-shot generation and failed-shot replay.
- [ ] Add output artifact checksums and trace links.
- [ ] Add a small benchmark fixture for generation latency and estimated cost.
- [ ] Add quality-agent evaluation criteria with documented limitations.
- [ ] Add sample product assets and a reproducible example under a clear license.

## Multi-agent and observability

- [ ] Document the agent state machine and node contracts.
- [ ] Add trace correlation IDs from HTTP request through queue and FFmpeg jobs.
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
