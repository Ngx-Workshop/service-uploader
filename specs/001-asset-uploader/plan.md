# Implementation plan: Asset uploader API

Status: Implemented; storage integration pending
Spec: [spec.md](spec.md)
Updated: 2026-10-03

## Source baseline

The seed app imports `src/example-crud/example-crud.module.ts`, whose controller
is mounted at `/uploader` but retains example-document persistence and mostly
unguarded routes. Nest 11, Mongoose 8, platform-express/Multer 2, class-validator,
Swagger, Jest, and the auth client are already installed. The worktree had a
pre-existing deletion of the example controller's temporary `hello` endpoint;
that file will not be modified.

## Design and requirement mapping

| Requirement | Approach | Files/boundaries affected |
| --- | --- | --- |
| FR-001, FR-004 | New asset schema, DTOs, ObjectId pipe, service, and controller | `src/uploader/**` |
| FR-002, FR-003 | Memory-backed Multer intake, 25 MiB limit, SHA-256 fingerprint, pending status | `src/uploader/uploader.controller.ts`, `uploader.service.ts` |
| FR-005 | Controller-level `RemoteAuthGuard` and generation stub | `src/uploader/uploader.controller.ts`, `uploader.module.ts` |
| FR-006 | Swagger decorators, generated OpenAPI/contracts | `openapi.json`, `contracts/service-uploader/src/**` |

## Constitution check

1. Satisfied: the service owns only asset metadata.
2. Satisfied: DTOs, errors, Swagger responses, and generated contracts are updated.
3. Satisfied: all new routes are authenticated at the controller boundary.
4. Satisfied: service owns operations, schema owns constraints, IDs and updates
   are explicitly validated.
5. Planned: focused unit/validation checks plus build and generated contracts.
6. Satisfied: feature artifacts and external handoff remain in this repository.

## Data, API, and integration contracts

`Asset` records contain a caller-visible name/description/tags, archive state,
version, storage status, optional receipt metadata, and timestamps. JSON
`POST /uploader` creates `AWAITING_UPLOAD` metadata. Multipart
`POST /uploader/upload` returns 202 with `PENDING_STORAGE`. CRUD and archive routes
return the response DTO; delete returns 204. List accepts an optional strict
boolean `archived` query. All routes require the remote auth guard.

No binary is put into MongoDB, a filesystem, or a response. Multer's in-memory
buffer exists only for the request and checksum calculation.

## External dependencies and delivery order

| Owner repository | Required contract/change | Compatibility and ordering | Local fallback / pending check |
| --- | --- | --- | --- |
| Auth service | Validate the existing auth cookie/token through `RemoteAuthGuard` | Must be reachable before live API use | Guard is overridden in focused tests and stubbed only during OpenAPI generation |
| Gateway/Nginx owner | Route `/api/uploader` to this service; later serve chosen asset storage | API route can be configured now; static serving follows storage design | Native controller and OpenAPI verify local shape only |
| Storage infrastructure (TBD) | Persist bytes and expose transfer/public-location semantics | Required before an upload can become durable/servable | Current endpoint records `PENDING_STORAGE` and discards request buffer |

## Verification plan

| Acceptance scenario | Check/test | Environment or prerequisites |
| --- | --- | --- |
| AC-001 | Service and DTO unit tests | Model doubles; no database |
| AC-002 | Upload service/controller metadata tests and OpenAPI inspection | Model doubles; no durable storage |
| AC-003 | DTO/ObjectId/file validation tests; guard metadata/HTTP contract review | Auth guard mocked for local tests |
| AC-001–003 | `GENERATE_OPENAPI=true npm run build`, contract generation/build | Installed dependencies |

## Risks and migration

This replaces the active seed module, so seed example routes are intentionally no
longer mounted. Existing consumers of the accidental example-shaped `/uploader`
contract must migrate to the asset contract. In-memory intake is bounded but is
not suitable as a durability mechanism. Rollback is the app-module import change;
stored asset metadata can remain isolated in its own collection.

## Decisions and open questions

The route prefix remains `/uploader` to preserve gateway expectations. The API
uses 202 for received-but-not-durable files. Storage provider, transfer method,
public URL model, retention, deduplication, and content scanning remain explicit
future decisions and do not block metadata CRUD.
