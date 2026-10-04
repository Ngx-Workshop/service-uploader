# Architecture and external context

Source baseline: 2026-09-29, commit `4a76d8a`. Recheck source when changing behavior.

## Role in Ngx-Workshop

Ngx-Workshop combines Angular micro-frontends, NestJS services, MongoDB, and an
Nginx/gateway layer. Services own bounded data domains and share contracts through
published npm packages. A frontend accesses browser-relative API paths through the
gateway; it does not connect directly to MongoDB.

This service owns asset metadata, authenticated CRUD and multipart intake,
OpenAPI generation, and the contracts package. It does not own authentication
accounts, gateway routing, Nginx static serving, or bucket infrastructure. It persists binary content through the Spaces API.

## Source map and request flow

HTTP → controller/guards/validation → service → Mongoose model → MongoDB.

| Concern | Source | Current behavior |
| --- | --- | --- |
| Runtime | `src/main.ts` | Cookies, global whitelist/forbid-extra-fields validation, port 3010 on `0.0.0.0` |
| Configuration/database | `src/app.module.ts` | Global ConfigModule and `MONGODB_URI`; conditional DB imports |
| Feature wiring | `src/uploader/uploader.module.ts` | Asset model, auth client, generation-only stubs |
| HTTP | `src/uploader/uploader.controller.ts` | Authenticated `/uploader` CRUD, archive, and multipart upload |
| Business operations | `src/uploader/uploader.service.ts` | Metadata operations, checksum calculation, Spaces upload lifecycle |
| Binary storage | `src/uploader/spaces-storage.service.ts` | S3 SDK, configured bucket/endpoint/ACL, runtime credentials, bounded transfer deadline |
| Input/output shapes | `src/uploader/dto/asset.dto.ts` | Validated create/update/upload DTOs and response shape |
| Persistence | `src/uploader/schemas/asset.schema.ts` | Asset metadata, timestamps, version, archive and storage status |
| OpenAPI | `src/swagger.ts`, `openapi.json` | Generated spec, without listening on a port |
| Consumer package | `contracts/service-uploader/` | Generated types/models and package exports |

### Data behavior

`name` is required. Optional caller metadata includes `description`, up to 50
tags, and archive state. Metadata-only records start as `AWAITING_UPLOAD`.
Multipart intake records the original filename, caller-supplied media type, byte
size, receipt time, and SHA-256 checksum as `PENDING_STORAGE`. Those client fields
are metadata, not trusted storage paths or content verification. The 25 MiB
in-memory buffer is uploaded synchronously to Spaces. The service first saves a
`PENDING_STORAGE` record with a generated `storageKey` and `storageUrl`, sends the
bytes, then saves `READY`. Storage errors attempt to save `STORAGE_FAILED` and
return 503. A timeout during transfer may still leave an object at the recorded key.
A final database error returns no success; a pending record and stored
object may need reconciliation. There is no automatic retry worker or cross-store
transaction. SDK retries are bounded to three attempts and a 60-second deadline.
Default object ACL is `public-read`; `private` is configurable. Archive and DELETE
retain their metadata-only behavior; they do not revoke or remove stored objects.
Pre-integration pending records have no stored bytes and require reupload. Updates increment
`version`; Mongoose timestamps maintain `createdAt` and `updatedAt`.

### Native HTTP routes

There is no `/api` prefix in `src/main.ts`; the gateway owns the browser prefix.

| Method | Path | Current access | Result |
| --- | --- | --- | --- |
| GET | `/uploader` | `RemoteAuthGuard` | List, optionally filtered by strict boolean `archived` |
| GET | `/uploader/:id` | `RemoteAuthGuard` | Asset or 404; malformed ID is 400 |
| POST | `/uploader` | `RemoteAuthGuard` | Create metadata as `AWAITING_UPLOAD`, 201 |
| POST | `/uploader/upload` | `RemoteAuthGuard` | Persist multipart file in Spaces, save `READY`, 201; storage failure 503 |
| PATCH | `/uploader/:id` | `RemoteAuthGuard` | Update mutable caller metadata |
| DELETE | `/uploader/:id` | `RemoteAuthGuard` | Delete metadata, 204 |
| PATCH | `/uploader/:id/archive` | `RemoteAuthGuard` | Archive metadata |
| PATCH | `/uploader/:id/unarchive` | `RemoteAuthGuard` | Unarchive metadata |

## External owners and contracts

| External owner | Boundary | Isolated-repository approach |
| --- | --- | --- |
| Frontend consumers | `@tmdjr/service-uploader-contracts`, DTOs and native API behavior | Generate/build locally; publish/version separately and hand off consumer migration |
| `service-auth` | `@tmdjr/ngx-auth-client` module/guard, `AUTH_BASE_URL` configuration | Inspect installed package behavior; mock auth in unit tests |
| `service-bff-ngx-workshop` / `nginx-ngx-workshop.io` | Routes browser `/api/uploader` to native `/uploader`; routes uploads; clients read asset origin URLs directly | Record desired mapping; do not assume a locally running gateway |
| MongoDB infrastructure | `MONGODB_URI` supplied at runtime | Use a disposable/local database for integration checks |
| DigitalOcean Spaces | `ngx-workshop-assets` bucket at sfo3; S3-compatible API | Requires scoped runtime access keys; public object origin URLs replace Nginx local-file serving |

Names above identify repositories, not filesystem prerequisites. The local
contracts manifest says `0.0.1`; release versions must be verified independently
rather than inferred from this checkout. Generated types describe shapes, not
successful runtime integration.

## Runtime and release boundaries

`MONGODB_URI` is needed for normal runtime; `PORT` defaults to 3010. Auth configuration
is consumed through the external auth client. `GENERATE_OPENAPI=true` is a build
mode that bypasses database wiring and supplies stubs; it must be set before module
evaluation. See the development guide for the current generator ordering caveat.

Docker uses Node 22. The Compose file uses `.env` and
the external `ngx-net` network. The GitHub workflow deploys the service on
pushes to `main`. It also supports a gateway-verified manual dispatch for
coordinated deployments. It contains seed-specific targets and database
constraints; review those when adopting the seed.
