# Service logging and heartbeat

This service uses native NestJS 11 `ConsoleLogger` JSON output to stdout/stderr, with `Logger` context for application events. No Angular logger or application-held Grafana credential is used. HTTP logs contain validated or generated request ID, method, route template, status and duration; bodies, cookies, authorization headers, concrete identifiers and query strings are not logged by the middleware. Health polling is excluded from access logs. Avoid embedding secrets or personal search text in domain log messages.

## Domain events and correlation

Native output stores structured fields inside `message`, not at the top level:

```json
{
  "level": "log",
  "context": "UploaderService",
  "message": {
    "event": "asset_upload",
    "requestId": "14f7cf25-e527-4a2c-8a5d-488c8733b49c",
    "operationId": "d151ad20-2eb6-4d01-9c9f-2780c27c9f7d",
    "durationMs": 42,
    "outcome": "success"
  }
}
```

Additional native fields include timestamp and pid. Mutations emit
`asset_create`, `asset_upload`, `asset_update` (including archive/moves),
`asset_delete`, `folder_create`, `folder_update` and `folder_delete`. The S3
adapter emits `spaces_put` once per bounded SDK call, not per retry. Reads and
transaction retry callbacks do not produce per-item events. Success is `log`;
failure is `warn`, with a bounded reason (`invalid_input`, `not_found`, `conflict`,
`unavailable`, `unexpected_error`). HTTP still emits `error` for 5xx and `warn`
for 4xx. Domain and upstream summaries represent distinct boundaries, without
duplicated raw exception stacks. A failed attempt to persist STORAGE_FAILED emits
one `asset_upload_failure_record` error with duration and
`reason: reconciliation_required`; the caller still receives the existing 503.

The middleware accepts only a single canonical UUID-shaped `X-Request-ID`
(versions 1-5, valid variant), normalizes it to lowercase, or generates one.
It echoes the resulting ID on non-health responses. This ID is correlation
metadata, not trusted identity. AsyncLocalStorage carries it across awaited
domain work; nested storage events share the enclosing operation's generated ID.
Direct/background callers outside request context get an operation ID without
a request ID. Concurrent operations are isolated. Background work deliberately
scheduled inside an operation inherits that context; this is not a detached-job
tracing system. No header is forwarded to auth/S3, and there is no distributed
trace or gateway propagation claim.

Events never include file contents, names/descriptions, checksums, object keys,
URLs (including signed URLs), credentials, raw upstream errors or input DTOs.
Use operation/request IDs for log correlation and persisted storage status for
reconciliation. Do not promote IDs or names into high-cardinality Loki labels.

For collectors retaining native JSON, parse nested fields rather than querying
a nonexistent top-level `event`. Replace `service_name` with the deployed
collector's actual service label if necessary:

```logql
{service_name="service-uploader"} | json event="message.event", outcome="message.outcome" | event="asset_upload" | outcome="failure"
{service_name="service-uploader"} | json requestId="message.requestId" | requestId="14f7cf25-e527-4a2c-8a5d-488c8733b49c"
```

Maintenance validation (2026-11-22): actual Nest JSON shape, success/failure
levels, canary redaction, concurrent request isolation, nested storage correlation,
invalid IDs, non-HTTP context and quiet GET/HEAD health polls are covered locally.
See [maintenance evidence](../specs/010-code-maintenance/handoff.md). Query syntax
and ingestion must still be confirmed against the external collector/live stack;
these examples do not establish Grafana receipt.

`GET /health` and HEAD return the anonymous operational Terminus heartbeat with `status: ok` and `heartbeat: up`, plus `Cache-Control: no-store`. This is liveness only; it does not claim MongoDB or upstream readiness. Existing business-route authentication remains enforced. The gateway's exact read-only heartbeat is the only exception to its normalized proxy-envelope requirement. The operational endpoint is excluded from business Swagger/contracts where that service generates them.

Docker probes `/health` every 30 seconds. Deployments bound each container's local JSON log files to 10 MiB × 3. Host Alloy discovers active service names and ships logs and private HTTP heartbeat probe metrics to Grafana Cloud stack `ivorytoffee195`. Collector configuration/dashboard lives in infrastructure owner `nginx-ngx-workshop.io/ops/grafana`; its ingestion token remains host-owned, scoped to logs/metrics write, and requires account authorization before activation. No production credential belongs in this repository.

Validation on 2026-11-21: the isolated observability HTTP suite passed (5 scenarios), build passed, Linux-targeted lockfile dry run passed. Guarded services additionally passed the anonymous-heartbeat/protected-business-route HTTP test. Gateway production ingress e2e passed (51 scenarios), including exact-path/method heartbeat boundaries. Gateway and publisher lint passed. Full existing unit suites passed except Backstage's unchanged Octokit ESM test-loader failure, reproduced on its pre-change HEAD. Uploader tests pass under its documented `npm test` command; its 10 optional cases remain skipped. Publisher persistence e2e cases require the isolated Mongo URI and remain skipped when unavailable. These are local checks, not evidence of Grafana ingestion or live deployment.

Live rollout correction (2026-11-21): health is explicitly public through the auth-client AuthType.None decorator where global authentication guards apply. The BFF legacy text /health handler is removed so only the Terminus JSON route owns that path. Regression HTTP tests include real authentication/role guards or the actual BFF controller.
