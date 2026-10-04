# Feature: Spaces storage
Status: Implemented; live integration pending
Created: 2026-10-03

## Problem and scope
Finish authenticated multipart uploads by persisting bytes in the existing
ngx-workshop-assets Spaces bucket in sfo3. Existing intake discards bytes.
Metadata CRUD and archive semantics remain; DELETE remains metadata-only.
No direct browser uploads, background worker, scanning, or deployment execution.

## Requirements and acceptance
- FR-001 / AC-001: Valid uploads return 201 and READY only after Spaces and MongoDB acknowledge success; response includes storageKey and storageUrl.
- FR-002 / AC-002: Storage failure returns 503, records STORAGE_FAILED, and never returns READY. Initial database failure must prevent transfer.
- FR-003 / AC-003: Final database failure never returns success; preserve PENDING_STORAGE and its object location for reconciliation. Do not delete potentially stored bytes.
- FR-004 / AC-004: Validate credentials at runtime startup; generation mode needs no secrets. Deployment passes organization secrets as runtime environment only.
- FR-005 / AC-005: Keep authenticated access, 25 MiB limit, checksums, and server-generated keys; invalid files do not trigger storage.

## Assumptions and boundaries
Public static assets are the intended use: default ACL public-read, configurable
private. storageUrl is an origin address, not a guarantee of anonymous access.
Existing PENDING_STORAGE records contain no recoverable bytes and require reupload.
Use local storage/model doubles; live bucket, MongoDB, auth and gateway verification
remain explicit integration checks. Secrets are not available locally.
