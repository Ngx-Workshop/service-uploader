# Feature: Asset folders and duplicate prevention

Status: Implemented; deployment integration pending
Created: 2026-10-04
Request: Folder CRUD, moving assets, and preventing duplicate uploads.

## Scope and decisions

Flat virtual folders, with assets also permitted at the root. Moves never change
S3 keys or URLs. Reject deletion of nonempty folders, including archived assets.
Duplicate content is rejected across the library, including archived assets.
Failed uploads remain retryable. The user approved transaction-capable MongoDB.
No nested folders, object relocation/deletion, ownership changes, or auth expansion.

## Requirements and acceptance

- FR-001 / AC-001: Authenticated users can create, list, read, rename, and delete
  empty folders. Names are trimmed, nonblank, at most 120 characters, and unique
  case-insensitively. Duplicate names and nonempty deletion return 409; missing
  folders return 404; malformed IDs/metadata return 400.
- FR-002 / AC-002: Creation and upload accept an optional folder ID. Asset PATCH
  moves to an existing folder or to root with `folderId: null`, increments version,
  and preserves bytes, checksum, storage key and URL. Missing folders return 404.
  List supports folder filtering and an explicit root filter.
- FR-003 / AC-003: SHA-256 of exact uploaded bytes prevents duplicate pending or
  ready uploads before S3 transfer, returning 409 even under concurrent requests.
  Archived assets count; failed uploads release the reservation. Pending uncertain
  outcomes block retries until reconciled. Deleted metadata no longer blocks.
- FR-004 / AC-004: Concurrent folder deletion and asset assignment cannot produce
  dangling references. Folder operations and membership changes use transactions.
- FR-005 / AC-005: Preserve guard, file validation, upload lifecycle, metadata
  CRUD and archive semantics. Regenerate OpenAPI and consumer contracts.

## Success and boundaries

Focused unit/HTTP/database tests, service build, and contract build pass. Local
MongoDB concurrency is verified; deployed MongoDB and S3/auth/gateway verification
remain explicit deployment checks.
Legacy assets without folder IDs are root assets. Existing checksums are reused;
legacy duplicates must be reconciled before creating the unique index.
