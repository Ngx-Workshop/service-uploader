# Feature: Auth-client global guards

Status: Complete
Feature ID: 007-auth-client-global-guards
Created: 2026-10-04
Updated: 2026-10-04
Request/source: Replace controller-level NestJS authentication wiring with the
platform auth-client module and its global guards, following service-user-metadata.

## Problem and audience

Uploader routes currently repeat `RemoteAuthGuard` on each controller. Service
operators need the uploader to use the platform's standard global
authentication and role authorization mechanism consistently.

## Scope

In scope:
- Register `NgxAuthClientModule`, `AuthenticationGuard`, and `RolesGuard` in
  the uploader feature module.
- Keep every uploader and folder route authenticated without repeated
  controller guard decorators.
- Preserve OpenAPI-generation guard stubbing and public OpenAPI security
  metadata.

Out of scope:
- Adding role restrictions to endpoints that have no role metadata.
- Changing API paths, DTOs, storage, or external services.

## Current behavior and evidence

Before this feature, [uploader.module.ts](../../src/uploader/uploader.module.ts)
imported `NgxAuthClientModule`, while both controllers declared
`@UseGuards(RemoteAuthGuard)`.

## User scenarios and acceptance

### AC-001 — Uploader routes remain authenticated

- Given an uploader or folder endpoint is requested without valid authentication
- When the application evaluates global guards
- Then `AuthenticationGuard` rejects the request before the controller executes.
- Covers: FR-001
- Priority: required

### AC-002 — Role metadata is enforceable

- Given an endpoint is subsequently annotated with auth-client role metadata
- When a request reaches the uploader module
- Then `RolesGuard` participates in global guard evaluation.
- Covers: FR-002
- Priority: required

## Functional requirements

- FR-001: The uploader module must register auth-client authentication globally
  using `AuthenticationGuard`.
- FR-002: The uploader module must register auth-client role authorization
  globally using `RolesGuard`.
- FR-003: Both controllers must rely on the module-level authentication policy,
  retaining their OpenAPI bearer/cookie and unauthorised-response metadata.

## Quality requirements

The auth-client package must be a runtime dependency. OpenAPI generation must
not call a live auth service.

## Data and external boundaries

The external `service-auth` owner supplies `@tmdjr/ngx-auth-client`.
`AuthenticationGuard` uses its `RemoteAuthGuard` dependency; this repository
continues to substitute that guard only when `GENERATE_OPENAPI=true`.

## Success criteria

Focused module and HTTP tests demonstrate registration and denied/allowed
request behavior. A generation-mode build verifies the generated OpenAPI path.
Live auth integration remains outside this repository's local acceptance scope.

## Assumptions and unresolved decisions

| ID | Assumption or question | Impact | Resolution/evidence |
| --- | --- | --- | --- |
| Q-001 | Existing routes have no role metadata. | `RolesGuard` does not add endpoint-specific restrictions. | Verified by controller inspection. |
