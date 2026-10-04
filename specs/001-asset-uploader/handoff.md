# Handoff: Asset uploader API

Status: Implemented; storage integration pending
Spec: [spec.md](spec.md)
Plan: [plan.md](plan.md)
Tasks: [tasks.md](tasks.md)
Updated: 2026-10-03

## Delivered behavior

The active app now mounts an authenticated asset uploader module instead of the
seed example module. It provides metadata CRUD, archive/unarchive, strict ObjectId
and DTO validation, and multipart receipt capped at 25 MiB. Upload intake records
the original filename, media type, byte count, SHA-256 checksum, and receipt time
as `PENDING_STORAGE`, returns HTTP 202, and discards the request buffer.

Swagger declares bearer-token and `accessToken` cookie alternatives. The contract
generation layout now preserves both path/operation types and generated model
exports instead of allowing the model generator to overwrite the entry point.

## Acceptance and verification evidence

| Scenario/check | Command or method | Result | Evidence/limitation |
| --- | --- | --- | --- |
| AC-001 | `npm test -- --runInBand uploader` | PASS | Service/DTO/ID tests use model doubles; no live MongoDB |
| AC-002 | Focused tests plus generated OpenAPI inspection | PASS | HTTP 202, multipart binary field, checksum/status behavior verified; durable storage remains out of scope |
| AC-003 | DTO, ID, empty-file, and guard metadata tests | PASS | Live auth denial still requires the external auth service |
| Focused lint | `npx eslint "src/uploader/**/*.ts" src/app.module.ts src/swagger.ts` | PASS | Covers all new code and touched runtime wiring |
| Service/OpenAPI build | `GENERATE_OPENAPI=true npm run build` | PASS | Generated with DB and guard stubs; not a runtime integration test |
| Contract generation/build | `npm run contracts:service-uploader:gen && npm run contracts:service-uploader:build` | PASS | Local generated package only; not published |
| Full lint | `npm run lint` | FAIL (pre-existing) | Inactive `src/example-crud/**` and `src/main.ts` retain seed lint errors; new/touched surfaces pass focused lint |

## Contract and consumer handoff

| Owner repository | Exact required action | Interface/version | Ordering and acceptance |
| --- | --- | --- | --- |
| Frontend consumers | Adopt and publish the regenerated contract when ready | Local `@tmdjr/service-uploader-contracts` 0.0.1 | Version/publish separately, then validate create/upload/list flows |
| Gateway/Nginx owner | Preserve `/api/uploader` proxy mapping and forward auth headers/cookies | Native authenticated `/uploader` API | Verify allowed and denied proxy requests after deployment |
| Storage infrastructure (TBD) | Select storage and transfer mechanism, then replace pending-only intake | `PENDING_STORAGE` asset records and SHA-256 checksum | Required before static asset availability is promised |

## Remaining work and next action

Local tasks T001–T004 are complete. X001 remains intentionally deferred. The next
step is to choose the durable byte store and the transfer boundary between this
container/server and the Nginx static-file server, then define transitions out of
`PENDING_STORAGE`.

## Context maintenance

The feature index, architecture, development guide, README, and integration
checklist now describe the implemented API and pending storage boundary. The
constitution did not require amendment.

## Storage follow-up

The pending-only behavior above is the historical baseline.
[002 Spaces storage](../002-spaces-storage/handoff.md) supersedes the storage
boundary with synchronous Spaces persistence and HTTP 201/READY.
