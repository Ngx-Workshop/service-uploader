# Plan: Asset folders and duplicate prevention

Status: Implemented; deployment integration pending
Spec: [spec.md](spec.md)

## Design

- Folder schema/model, DTOs, guarded `/uploader/folders` controller, and service.
  Flat virtual membership uses nullable ObjectId `folderId` on assets.
- Use PATCH `/uploader/:id` for moves; support `folderId` and `root` list filters.
- Folder service coordinates transactional saves, moves, and removals. Membership
  changes write the folder document to serialize with transactional deletion.
  S3 transfer stays outside transactions.
- Partial unique checksum index includes only PENDING_STORAGE and READY, and is
  explicitly created at runtime startup. Translate checksum/name duplicate-key
  failures into 409, while propagating other database errors.
- Unit doubles exercise failures and transaction wiring; HTTP doubles verify
  validation, auth, routes, and representative responses.

## Constitution and compatibility

Service owns folders and assets only. Controllers/DTOs/service/schema retain their
respective responsibilities. New routes reuse RemoteAuthGuard. Additive optional
fields preserve old callers. Upload 409 is an intentional new outcome. No changes
to storage URLs, public ACL, archive or metadata-only asset DELETE.
MongoDB replica set/Atlas is now required for membership mutation/deletion.
No constitution deviations.

## Migration and delivery

Before deploying, audit checksum duplicates among READY/PENDING_STORAGE records,
select the canonical metadata record, and reconcile/remove duplicates explicitly.
Do not delete S3 objects as an implicit migration. No automatic destructive cleanup.
Unique-index creation fails startup if unresolved duplicates exist.
Missing checksums cannot be deduplicated without retrieving original bytes.
Consumer owners must publish/install regenerated contracts and handle upload 409,
folder CRUD, and moves. Gateway must forward `/api/uploader/folders`.

## Verification

Test folder CRUD/conflicts, missing/invalid IDs, root and folder list filters,
transactional membership changes, failed upload retries, initial-save duplicate
failures without S3 transfer, guard and DTO rejection. Build with explicit
GENERATE_OPENAPI=true, regenerate contracts, build contracts, targeted lint.
Live race tests use an isolated local MongoDB 6.0.1 replica set; record separately
from mocked storage/auth HTTP checks. Test scripts enable experimental VM modules
for the existing Nest file validator's dynamic ESM import in Jest.
