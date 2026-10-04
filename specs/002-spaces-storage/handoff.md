# Handoff: Spaces storage
Status: Implemented; live integration pending
Spec: [spec.md](spec.md)
Plan: [plan.md](plan.md)
Tasks: [tasks.md](tasks.md)
Updated: 2026-10-03

## Delivered behavior
Authenticated multipart upload now stores bytes in ngx-workshop-assets at sfo3
using the already installed S3 SDK. Server-generated keys preserve only a safe
extension. Metadata saves before transfer as PENDING_STORAGE and after confirmed
transfer as READY. The response is HTTP 201 with storageKey/storageUrl, replacing
202/pending-only semantics. Storage failure attempts to record STORAGE_FAILED and
returns generic 503 without provider details. If final metadata persistence fails,
no success is returned; pending metadata/object may need manual reconciliation.
Transfer deadlines/SDK retries do not imply a distributed transaction: a timeout
can still leave bytes in Spaces. No durable retry worker was introduced.

Runtime credentials are required; OpenAPI uses an inert provider without secrets.
The Actions workflow passes SPACES_ACCESS_KEY_ID/SPACES_SECRET_ACCESS_KEY from
organization secrets into a protected Docker env file, with missing/multiline
validation. Bucket/endpoint are configured to the user-provided bucket. ACL is
public-read for static assets; local configuration can select private. No deployment,
publication, or live bucket mutation was performed during implementation.

## Verification
- PASS: `npm test -- --runInBand uploader`: 5 suites, 23 tests. Model/SDK doubles cover successful bytes/metadata, failed storage, database failure before and after transfer, invalid configuration, and existing input/guard checks.
- PASS: `npx eslint 'src/uploader/**/*.ts'`.
- PASS: `GENERATE_OPENAPI=true npm run build` without Spaces credentials.
- PASS: `npm run contracts:service-uploader:gen` and `npm run contracts:service-uploader:build`.
- PASS: deployment Python env-file script with synthetic secrets; credential preservation, defaults, 0600 permissions, missing/newline/carriage-return rejection.
- PASS: `git diff --check`.
- NOT RUN: live Spaces, MongoDB, auth, gateway and restart checks. No live credentials available locally. Local tools used Node 24.9.0; deployment remains Node 22.
- Inherited stale e2e suite and full-repository lint issues documented in development.md remain outside this scope; focused checks passed.

## Consumer and infrastructure handoff
Consumers must accept HTTP 201 for upload and READY/STORAGE_FAILED enum values,
and adopt regenerated AssetDto fields. Contracts are generated locally, not
published. Existing pending-only records have no binary to recover; reupload.
DELETE remains metadata-only and archive does not revoke public object access.
Confirm organization-secret repository access and bucket key permissions for
PutObject/public-read before deployment. Gateway body limit must permit 25 MiB
plus multipart overhead; request timeout should accommodate transfer completion.
X001: after deployment, authenticate and upload through /api/uploader/upload,
check 201/READY, download storageUrl and compare SHA-256 with checksumSha256.
Restart the container and confirm the object still downloads. Private objects
require authenticated S3 reads; signed download endpoints are not in this change.

## Context maintenance
README, WORKSHOP, architecture/development, .env.example and feature index updated.
Historical 001 handoff links here. User package/lockfile changes were preserved.
