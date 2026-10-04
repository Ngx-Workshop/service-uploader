# Implementation plan: Auth-client global guards

Status: Complete
Spec: [spec.md](spec.md)
Updated: 2026-10-04

## Source baseline

`src/uploader/uploader.module.ts` already imports `NgxAuthClientModule` and
stubs `RemoteAuthGuard` in generation mode. `uploader.controller.ts` and
`folders.controller.ts` each apply that guard directly. The referenced
user-metadata module establishes the platform pattern: `HttpModule`,
`NgxAuthClientModule`, and `APP_GUARD` providers for `AuthenticationGuard` and
`RolesGuard`.

## Design and requirement mapping

| Requirement | Approach | Files/boundaries affected |
| --- | --- | --- |
| FR-001 | Register `AuthenticationGuard` with `APP_GUARD`; retain generation-mode `RemoteAuthGuard` stub for its dependency. | `src/uploader/uploader.module.ts` |
| FR-002 | Register `RolesGuard` with `APP_GUARD`. | `src/uploader/uploader.module.ts` |
| FR-003 | Remove duplicate controller guards while retaining Swagger auth metadata; revise test harness to provide a global guard. | Controllers and focused tests |

## Constitution check

- Bounded domain: satisfied; no cross-service data access changes.
- Explicit HTTP contract: satisfied; response/request shapes and OpenAPI auth
  metadata are unchanged.
- Service-boundary access: satisfied; all existing endpoints continue through
  platform authentication and now support global role metadata.
- Verification: focused tests and generation-mode build passed.

## Data, API, and integration contracts

No HTTP request, response, route, persistence, or generated client shape changes.
Authentication moves from controller metadata to module-level global providers.
`@tmdjr/ngx-auth-client` moves to production dependencies because runtime
providers import it.

## External dependencies and delivery order

| Owner repository | Required contract/change | Compatibility and ordering | Local fallback / pending check |
| --- | --- | --- | --- |
| service-auth | Existing `@tmdjr/ngx-auth-client@0.0.21` exports and auth endpoint behavior. | No external deployment change required. | Unit tests use guard doubles; live auth remains external. |

## Verification plan

| Acceptance scenario | Check/test | Environment or prerequisites |
| --- | --- | --- |
| AC-001 / AC-002 | Focused uploader module and HTTP Jest tests. | Installed Node dependencies |
| OpenAPI generation | `GENERATE_OPENAPI=true npm run build`. | Generation-mode model/storage/guard stubs |

## Risks and migration

The changed attachment point could leave routes unguarded if the global provider
is omitted. The module metadata and HTTP tests specifically detect that failure.
There is no consumer migration because the HTTP contract is unchanged.

## Decisions and open questions

No endpoints receive `@Roles` in this change. Role enforcement is enabled only
where metadata is added by a future, scoped authorization requirement.
