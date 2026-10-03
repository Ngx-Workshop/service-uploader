# Architecture and external context

Source baseline: 2026-09-29, commit `4a76d8a`. Recheck source when changing behavior.

## Role in Ngx-Workshop

Ngx-Workshop combines Angular micro-frontends, NestJS services, MongoDB, and an
Nginx/gateway layer. Services own bounded data domains and share contracts through
published npm packages. A frontend accesses browser-relative API paths through the
gateway; it does not connect directly to MongoDB.

This service is the example CRUD producer. It owns `ExampleMongodbDoc` persistence,
HTTP routes, validation, OpenAPI generation, and the contracts package. It does not
own authentication accounts, user profile metadata, navigation, or shell composition.

## Source map and request flow

HTTP → controller/guards/validation → service → Mongoose model → MongoDB.

| Concern | Source | Current behavior |
| --- | --- | --- |
| Runtime | `src/main.ts` | Cookies, global whitelist/forbid-extra-fields validation, port 3003 on `0.0.0.0` |
| Configuration/database | `src/app.module.ts` | Global ConfigModule and `MONGODB_URI`; conditional DB imports |
| Feature wiring | `src/example-crud/example-crud.module.ts` | Mongoose model, auth client, generation-only stub providers |
| HTTP | `src/example-crud/example-crud.controller.ts` | `/example-crud` endpoints and Swagger metadata |
| Business operations | `src/example-crud/example-crud.service.ts` | CRUD/archive, missing-record errors, duplicate-name conflicts |
| Input/output shapes | `src/example-crud/dto/create.dto.ts`, `update.dto.ts` | Decorated DTOs and partial update DTO |
| Persistence | `src/example-crud/schemas/example-mongodb-doc.schema.ts` | Unique name, defaults, update version hook |
| OpenAPI | `src/swagger.ts`, `openapi.json` | Generated spec, without listening on a port |
| Consumer package | `contracts/service-uploader/` | Generated types/models and package exports |

### Data behavior

`name` is required and unique; `type` uses `SOME_ENUM` or `SOME_OTHER_ENUM`.
Defaults include `version: 1`, `archived: false`, a description, and a timestamp.
An optional address object has street/city/state/zip fields; the DTO requires all
four nonempty strings if the object is present. Service create/update operations
set `lastUpdated`; the schema update hook increments `version`. IDs and `__v`
come from MongoDB/Mongoose. Archive/unarchive reuse update logic.

### Native HTTP routes

There is no `/api` prefix in `src/main.ts`; the gateway owns the browser prefix.

| Method | Path | Current access | Result |
| --- | --- | --- | --- |
| GET | `/example-crud/auth-test` | `RemoteAuthGuard` | Authentication message |
| GET | `/example-crud` | No explicit guard | List; optional `archived=true` or `false` |
| GET | `/example-crud/:id` | No explicit guard | Document or 404 |
| GET | `/example-crud/name/:name` | No explicit guard | Document or 404 |
| POST | `/example-crud` | No explicit guard | Created document, 201; duplicate name 409 |
| PATCH | `/example-crud/:id` | No explicit guard | Updated document; missing 404, duplicate name 409 |
| DELETE | `/example-crud/:id` | No explicit guard | 204; missing 404 |
| PATCH | `/example-crud/:id/archive` | No explicit guard | Updated document |
| PATCH | `/example-crud/:id/unarchive` | No explicit guard | Updated document |

This access table is an observation, not the intended access policy for new
products. Invalid ID behavior and query coercion need explicit requirements/tests
when changed; malformed IDs are not currently validated with a dedicated pipe.

## External owners and contracts

| External owner | Boundary | Isolated-repository approach |
| --- | --- | --- |
| `seed-mfe-remote` and other consumers | `@tmdjr/service-uploader-contracts`, DTOs and native API behavior | Generate/build locally; hand off the required consumer version and migration |
| `service-auth` | `@tmdjr/ngx-auth-client` module/guard, `AUTH_BASE_URL` configuration | Inspect installed package behavior; mock auth in unit tests |
| `service-bff-ngx-workshop` / `nginx-ngx-workshop.io` | Routes browser `/api/example-crud` to native `/example-crud` | Record desired mapping; do not assume a locally running gateway |
| MongoDB infrastructure | `MONGODB_URI` supplied at runtime | Use a disposable/local database for integration checks |

Names above identify repositories, not filesystem prerequisites. The local
contracts manifest says `0.0.1`; the frontend seed currently requests published
`0.0.7`. Release versions must be verified independently rather than inferred from
this checkout. Generated types describe shapes, not successful runtime integration.

## Runtime and release boundaries

`MONGODB_URI` is needed for normal runtime; `PORT` defaults to 3003. Auth configuration
is consumed through the external auth client. `GENERATE_OPENAPI=true` is a build
mode that bypasses database wiring and supplies stubs; it must be set before module
evaluation. See the development guide for the current generator ordering caveat.

Docker uses Node 22. The existing Compose filename contains a trailing space and
uses the external `ngx-net` network. The GitHub workflow deploys the service on
pushes to `main`. It also supports a gateway-verified manual dispatch for
coordinated deployments. It contains seed-specific targets and database
constraints; review those when adopting the seed.
