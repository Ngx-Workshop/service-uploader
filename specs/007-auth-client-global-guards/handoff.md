# Handoff: Auth-client global guards

Status: Complete
Spec: [spec.md](spec.md)
Plan: [plan.md](plan.md)
Tasks: [tasks.md](tasks.md)
Updated: 2026-10-04

## Delivered behavior

The uploader module now imports the platform HTTP/auth-client modules and
provides `AuthenticationGuard` and `RolesGuard` via `APP_GUARD`.
Uploader and folder controllers no longer declare `RemoteAuthGuard` directly.
The OpenAPI-only `RemoteAuthGuard` double remains because
`AuthenticationGuard` depends on it.

## Acceptance and verification evidence

| Scenario/check | Command or method | Result | Evidence/limitation |
| --- | --- | --- | --- |
| AC-001 / AC-002 | `npm test -- --runInBand uploader.module.spec.ts uploader.controller.spec.ts folders.http.spec.ts` | PASS | 3 suites, 15 tests passed; HTTP tests use a global auth double. |
| OpenAPI generation | `GENERATE_OPENAPI=true npm run build` | PASS | Nest build and postbuild Swagger generation completed; no live auth/database connection used. |

## Contract and consumer handoff

| Owner repository | Exact required action | Interface/version | Ordering and acceptance |
| --- | --- | --- | --- |
| service-auth | None; provide the already consumed auth-client package and runtime auth endpoint. | `@tmdjr/ngx-auth-client@0.0.21` | Verify deployed requests with valid and invalid credentials. |

## Remaining work and next action

No local work remains. Live service-auth verification remains an external
deployment check before rollout.

## Context maintenance

Updated `README.md`, `docs/architecture.md`, and `docs/development.md` to
describe global platform authentication. No API contract regeneration is needed
unless generation-mode build changes `openapi.json`.
