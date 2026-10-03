# Architecture and external context

Source baseline: 2026-09-29, commit `4a76d8a`. Recheck source when changing behavior.

## Role in Ngx-Workshop

Ngx-Workshop combines Angular micro-frontends, NestJS services, MongoDB, and an
Nginx/gateway layer. Services own bounded data domains and share contracts through
published npm packages. A frontend accesses browser-relative API paths through the
gateway; it does not connect directly to MongoDB.

This service owns asset metadata, authenticated CRUD and multipart intake,
OpenAPI generation, and the contracts package. It does not own authentication
accounts, gateway routing, Nginx static serving, or durable binary storage yet.

## Source map and request flow

HTTP → controller/guards/validation → service → Mongoose model → MongoDB.

| Concern | Source | Current behavior |
| --- | --- | --- |
| Runtime | `src/main.ts` | Cookies, global whitelist/forbid-extra-fields validation, port 3010 on `0.0.0.0` |
| Configuration/database | `src/app.module.ts` | Global ConfigModule and `MONGODB_URI`; conditional DB imports |
| Feature wiring | `src/uploader/uploader.module.ts` | Asset model, auth client, generation-only stubs |
| HTTP | `src/uploader/uploader.controller.ts` | Authenticated `/uploader` CRUD, archive, and multipart upload |
| Business operations | `src/uploader/uploader.service.ts` | Metadata operations, checksum calculation, pending-storage lifecycle |
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
in-memory buffer is discarded after the record is saved. Updates increment
`version`; Mongoose timestamps maintain `createdAt` and `updatedAt`.

### Native HTTP routes

There is no `/api` prefix in `src/main.ts`; the gateway owns the browser prefix.

| Method | Path | Current access | Result |
| --- | --- | --- | --- |
| GET | `/uploader` | `RemoteAuthGuard` | List, optionally filtered by strict boolean `archived` |
| GET | `/uploader/:id` | `RemoteAuthGuard` | Asset or 404; malformed ID is 400 |
| POST | `/uploader` | `RemoteAuthGuard` | Create metadata as `AWAITING_UPLOAD`, 201 |
| POST | `/uploader/upload` | `RemoteAuthGuard` | Receive multipart file, record `PENDING_STORAGE`, 202 |
| PATCH | `/uploader/:id` | `RemoteAuthGuard` | Update mutable caller metadata |
| DELETE | `/uploader/:id` | `RemoteAuthGuard` | Delete metadata, 204 |
| PATCH | `/uploader/:id/archive` | `RemoteAuthGuard` | Archive metadata |
| PATCH | `/uploader/:id/unarchive` | `RemoteAuthGuard` | Unarchive metadata |

## External owners and contracts

| External owner | Boundary | Isolated-repository approach |
| --- | --- | --- |
| Frontend consumers | `@tmdjr/service-uploader-contracts`, DTOs and native API behavior | Generate/build locally; publish/version separately and hand off consumer migration |
| `service-auth` | `@tmdjr/ngx-auth-client` module/guard, `AUTH_BASE_URL` configuration | Inspect installed package behavior; mock auth in unit tests |
| `service-bff-ngx-workshop` / `nginx-ngx-workshop.io` | Routes browser `/api/uploader` to native `/uploader`; later serves durable static assets | Record desired mapping; do not assume a locally running gateway |
| MongoDB infrastructure | `MONGODB_URI` supplied at runtime | Use a disposable/local database for integration checks |
| Storage infrastructure (TBD) | Durable bytes and transfer between service and static host | `PENDING_STORAGE` is not a successful durable upload; select and implement this boundary next |

Names above identify repositories, not filesystem prerequisites. The local
contracts manifest says `0.0.1`; release versions must be verified independently
rather than inferred from this checkout. Generated types describe shapes, not
successful runtime integration.

## Runtime and release boundaries

`MONGODB_URI` is needed for normal runtime; `PORT` defaults to 3010. Auth configuration
is consumed through the external auth client. `GENERATE_OPENAPI=true` is a build
mode that bypasses database wiring and supplies stubs; it must be set before module
evaluation. See the development guide for the current generator ordering caveat.

Docker uses Node 22. The existing Compose filename contains a trailing space and
uses the external `ngx-net` network. The GitHub workflow deploys the service on
pushes to `main`. It also supports a gateway-verified manual dispatch for
coordinated deployments. It contains seed-specific targets and database
constraints; review those when adopting the seed.
