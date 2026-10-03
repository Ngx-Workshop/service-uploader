# Feature: Asset uploader API

Status: Implemented; storage integration pending
Feature ID: 001-asset-uploader
Created: 2026-10-03
Updated: 2026-10-03
Request/source: User request to replace the seed behavior with asset CRUD and an upload process.

## Problem and audience

Asset producers need a service-owned HTTP contract for asset metadata and file
intake. The service and the Nginx static-file host run on different servers, and
the durable storage/transfer mechanism has not been selected. The API must expose
useful CRUD and receive uploads without falsely claiming that file bytes are
durable or available from Nginx.

## Scope

In scope:
- Authenticated CRUD for asset metadata owned by this service.
- Authenticated multipart intake with file-size validation, metadata capture, and
  a SHA-256 checksum.
- An explicit storage status that distinguishes metadata awaiting a file from a
  received file awaiting durable storage.
- MongoDB persistence, OpenAPI generation, contract generation, tests, and a
  consumer/infrastructure handoff.

Out of scope:
- Durable binary storage, cross-server transfer, Nginx configuration, and static
  file serving.
- Malware scanning, image transformation, and content-type verification from
  file signatures.
- Authentication account or role management.

## Current behavior and evidence

`src/app.module.ts` imports the seed `ExampleMongodbDocModule`. Its controller is
already mounted at `/uploader`, but it still exposes example-document DTOs,
schema, and behavior. Only its `auth-test` endpoint is guarded. No endpoint accepts
multipart data and no asset storage lifecycle is represented.

## User scenarios and acceptance

### AC-001 — Create and manage asset metadata

- Given an authenticated caller and valid metadata
- When the caller creates, lists, reads, updates, archives, or deletes an asset
- Then the service persists and returns the asset metadata with explicit errors
  for missing or malformed IDs
- Covers: FR-001, FR-003, FR-004, FR-005
- Priority: required

### AC-002 — Receive an asset pending durable storage

- Given an authenticated caller and a non-empty file within the configured limit
- When the caller posts multipart data to `/uploader/upload`
- Then the service records original filename, media type, byte size, upload time,
  and SHA-256 checksum, returns HTTP 202, marks the asset `PENDING_STORAGE`, and
  does not claim the binary is durable
- Covers: FR-002, FR-003, FR-005
- Priority: required

### AC-003 — Reject invalid requests

- Given an unauthenticated caller, malformed ID, invalid metadata, missing file,
  empty file, or file larger than the limit
- When the caller invokes the relevant endpoint
- Then the service rejects the request with a 4xx response and creates no asset
- Covers: FR-001, FR-002, FR-004, FR-005
- Priority: required

## Functional requirements

- FR-001: The service shall expose create, list, read, update, archive, unarchive,
  and delete operations for owned asset metadata under `/uploader`.
- FR-002: The service shall accept one multipart field named `file`, limited to
  25 MiB, and optional `name` and `description` fields.
- FR-003: Uploaded-file metadata shall include the untrusted client filename and
  media type, size, SHA-256 checksum, and receipt time; binary content shall not
  be persisted until a storage adapter is selected.
- FR-004: IDs, DTO fields, query values, and files shall be validated, with 404
  for absent records and 400 for malformed input.
- FR-005: Every uploader endpoint shall require `RemoteAuthGuard`; authorization
  is authenticated-only with no role restriction in this increment.
- FR-006: OpenAPI and generated local contracts shall describe the implemented
  requests, responses, status codes, and storage lifecycle.

## Quality requirements

- Upload buffering is capped at 25 MiB per request to bound container memory use.
- Database writes use schema validation; update operations cannot mutate immutable
  receipt/storage fields through the public update DTO.
- Logs, DTOs, and responses do not include binary file contents.
- File-supplied media type and filename are metadata only and must not be trusted
  as a future storage path or content verification signal.

## Data and external boundaries

This service owns the `Asset` MongoDB collection. The auth service owns caller
authentication through `@tmdjr/ngx-auth-client`. A future storage owner must
consume the recorded checksum and metadata or replace the temporary intake
strategy. The gateway/Nginx owner must route `/api/uploader` but no Nginx static
location is changed here.

## Success criteria

Focused tests pass for create/upload/update/not-found/validation behavior; the
application builds; OpenAPI and local contracts regenerate and build. Live auth,
MongoDB, gateway, and static-file serving integration are not required for this
increment and must remain explicit handoff items.

## Assumptions and unresolved decisions

| ID | Assumption or question | Impact | Resolution/evidence |
| --- | --- | --- | --- |
| Q-001 | Where should durable bytes live and how should the service reach it? | Binary durability and Nginx serving | Deferred by request. `PENDING_STORAGE` prevents a false success claim. |
| Q-002 | What callers may use the API? | Endpoint access | Authenticated callers via the existing `RemoteAuthGuard`; roles deferred. |
| Q-003 | What is the initial upload limit? | Memory and client compatibility | 25 MiB, configurable later when storage requirements are known. |
