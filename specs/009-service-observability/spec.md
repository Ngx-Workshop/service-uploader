# Service observability

FR-001: Use NestJS 11 ConsoleLogger JSON on stdout and contextual Nest Logger calls; frontend logging stays unchanged. FR-002: Log HTTP method, route template, status, duration and generated request ID without bodies, headers, query values or raw request URLs. FR-003: GET /health returns a dependency-free Terminus heartbeat, unauthenticated, without runtime secrets. FR-004: Preserve authentication and production ingress for every other route. FR-005: Bound Docker log storage and enable private Grafana Alloy collection.

AC-001: Heartbeat returns HTTP 200/Terminus up and no dependency calls. AC-002: Existing guarded endpoints remain protected. AC-003: HTTP logs are machine-readable and exclude sensitive input. AC-004: Collector exports service-labelled logs and heartbeat probe metrics after host-owned ingestion credentials are configured.
