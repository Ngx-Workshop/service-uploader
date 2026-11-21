# Handoff

Implemented native Nest JSON logs, privacy-conscious request logging, anonymous heartbeat and bounded Docker logs. See [observability](../../docs/observability.md) for exact behavior and validation limits. Business APIs/contracts and frontend logger remain unchanged. Infrastructure collector and importable dashboard are prepared for ivorytoffee195; write-only token authorization and live ingestion remain pending. Main pushes keep existing validation/deployment ownership.

Live rollout correction: the installed global auth-client guard requires explicit `@Auth(AuthType.None)` on the heartbeat handler. Added it and regression GET/HEAD tests with real AuthenticationGuard/RolesGuard, plus a protected route rejection. All six focused tests and the build pass. Live receipt still requires the token to be installed on the host.
