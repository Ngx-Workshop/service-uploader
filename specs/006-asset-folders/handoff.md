# Handoff: Asset folders

Status: Implemented; deployment integration pending
Spec: [spec.md](spec.md) | Plan: [plan.md](plan.md) | Tasks: [tasks.md](tasks.md)

Updated: 2026-10-04

## Delivered behavior

- Authenticated flat virtual folder CRUD at `/uploader/folders`.
- Trimmed, case-insensitively unique folder names; conflict returns 409.
- Optional `folderId` on metadata create and multipart upload. Asset PATCH moves
  to an existing folder or root (`null`), incrementing asset version without
  changing S3 bytes/key/URL. List filters include `folderId` and `root=true`.
- Nonempty folder DELETE returns 409, including archived/failed/metadata-only
  members. Membership changes and deletion serialize using transactions/shared
  folder writes. Folder version also advances on membership operations.
- Global unique SHA-256 reservation for pending/ready records, including archived
  records. Concurrent duplicates return 409 before transfer. Failed uploads can
  retry; uncertain pending results require reconciliation. Metadata deletion
  releases the hash but retains S3 objects.
- Required indexes are created at runtime startup; unresolved legacy checksum
  duplicates fail startup. Existing root assets need no folder-field backfill.
- OpenAPI and contract types/models regenerated. No package was published.

## Verification evidence

| Check | Result | Evidence/limitations |
| --- | --- | --- |
| `MONGODB_FOLDER_TEST_URI=... npm test -- --runInBand --testPathPattern=uploader` | PASS | 89 tests, 10 suites, no skips; isolated MongoDB 6.0.1 replica set |
| Default `npm test -- --runInBand --testPathPattern=uploader` | PASS | 79 tests pass; 10 opt-in database tests skip when no test URI is supplied |
| Database integration suite | PASS | 10 tests: real unique indexes, global duplicate races at root and across folders, archived/pending blocking, failed retries, legacy index failure, moves, filters, rollback, deletion and assignment/move races |
| HTTP suite | PASS | 13 tests: guarded routes, DTO validation, CRUD/moves, strict filters and multipart 409; auth/service doubles |
| `npx eslint 'src/uploader/**/*.ts'` | PASS | No lint errors/warnings |
| `GENERATE_OPENAPI=true npm run build` | PASS | Service type/build and OpenAPI generation |
| Contract generation/build | PASS | `npm run contracts:service-uploader:gen` and `npm run contracts:service-uploader:build` |
| Generated contract assertions | PASS | Folder CRUD routes, nullable membership fields, list filters, 409 and security metadata |
| Deployed S3/auth/gateway | NOT RUN | No deployment executed; storage mocked in local tests |
| Existing stale e2e suite | NOT RUN | Known root-route/database assumptions remain outside this feature |

Test scripts enable experimental VM modules for Nest's ESM file-type validator.
The opt-in integration suite skips without `MONGODB_FOLDER_TEST_URI`; do not count
those skipped tests as coverage. Each run creates/drops its own unique test DB.
The local MongoDB process and temporary data are stopped/removed after verification.
Transient test implementation/import/VM issues were corrected; final checks pass.

## Consumer and rollout handoff

| Owner | Required action | Acceptance/order |
| --- | --- | --- |
| Database/deployment owner (X001) | MongoDB 6+ replica set/Atlas or transaction-capable sharded cluster; audit legacy READY/PENDING checksums using the development guide | Reconcile duplicates before rollout; startup indexes must succeed; verify deployed transaction behavior |
| Contracts release owner (X002) | Publish an appropriately versioned `@tmdjr/service-uploader-contracts` from regenerated sources | Local version remains 0.0.1; not published by this task |
| Frontend consumers (X002) | Install released contracts, implement folder CRUD/filtering, PATCH moves and upload 409 UX | Consume `_id` as folder ID; `folderId: null` moves to root; preserve existing asset URLs |
| `service-bff-ngx-workshop` / `nginx-ngx-workshop.io` (X001) | Forward native folder routes under `/api/uploader/folders` | Ensure generic asset-ID routing does not shadow folder routes; authenticated browser CRUD/upload smoke test |

Before rollout, select canonical legacy duplicate records and reconcile consumers.
Do not silently mark READY assets failed or delete objects. Missing checksums
need retrieval/hash backfill before they can be protected. Asset DELETE remains
metadata-only, so uploading deleted content again creates a new stored object.

## Next action and context

Local T001-T004 complete. X001/X002 require deployment and external consumers.
Run the documented checksum audit on the target database, confirm replica-set
support, then release contracts/service and verify the real gateway/auth/S3 path.
Architecture, development guidance, feature index, spec/plan/tasks are updated.
