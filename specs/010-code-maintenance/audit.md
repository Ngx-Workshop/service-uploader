# Maintenance audit

Updated: 2026-11-22. Source baseline: `da36f7e`.

## T001 baseline evidence

- Initial worktree: modified `AGENTS.md`, `specs/README.md`; untracked
  `.github/copilot-instructions.md`, `.github/prompts/`, this feature folder.
  These user-prepared records are retained.
- Node 24.9.0 / npm 11.6.0 initially active. Node 22.23.3 is installed locally
  and will be used for final checks; Docker/CI select Node 22.
- Installed Nest common 11.1.3, Prettier 3.6.2, ESLint 9.30.0.
- `npm test -- --runInBand`: 11 suites / 85 tests passed; one suite / 10 real
  MongoDB cases skipped without `MONGODB_FOLDER_TEST_URI`.
- `GENERATE_OPENAPI=true npm run build`: passed; generated OpenAPI unchanged.
- `npx --no-install eslint "{src,apps,libs,test}/**/*.ts"`: failed with one
  unsafe-call error at `src/main.ts:15` (missing cookie-parser declarations),
  and one floating-bootstrap-promise warning at line 22.
- `npx --no-install prettier --check "src/**/*.ts" "test/**/*.ts"`: passed.
  Config check additionally found pre-existing drift in `eslint.config.mjs`.
- npm reports a pre-existing unknown user configuration warning
  (`scripts-prepend-node-path`); no project configuration is changed to hide it.
- Stale root-route e2e is not an API regression suite. Live MongoDB, auth, Spaces,
  gateway and Grafana are not required or exercised for this local maintenance.

## T002 dependency and responsibility audit

| Source                                                             | Ownership and dependency flow                                                                                                                                                                                                                  |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app.module.ts`                                                | Explicit observability/config/uploader imports; only ConfigModule global. Runtime Mongoose connection; generation skips it.                                                                                                                    |
| `src/observability/observability.module.ts`                        | Terminus and public GET/HEAD health controller, no domain exports.                                                                                                                                                                             |
| `src/uploader/uploader.module.ts`                                  | HTTP/auth client and two Mongoose models; folders controller before asset controller; global auth/role guards. No exports, duplicate local providers, cycles, service locator or forwardRef. Generation-only inert model/storage/auth doubles. |
| `src/uploader/uploader.controller.ts`                              | Transport metadata, file limits/signature validation, DTOs, strict booleans and delegation. One manual query-ID pipe construction.                                                                                                             |
| `src/uploader/folders.controller.ts`                               | Transport metadata and delegation only.                                                                                                                                                                                                        |
| `src/uploader/uploader.service.ts`                                 | Asset CRUD, shared filename/MIME rules, checksum reservation and upload state machine. Depends on asset model, folder coordinator, storage adapter.                                                                                            |
| `src/uploader/folders.service.ts`                                  | Folder CRUD plus atomic asset membership/deletion; two local models belong to the same domain. Shared folder writes and retry-safe document creation serialize races. Splitting these transactions is not justified.                           |
| `src/uploader/spaces-storage.service.ts`                           | Config-validated S3 adapter, 3 SDK attempts, 60-second deadline, client teardown. No controller/persistence dependency.                                                                                                                        |
| `src/uploader/dto/`, `schemas/`, `pipes/`, `persistence-errors.ts` | Explicit validation/storage constraints; partial unique active checksum index; narrowed Mongo duplicate handling. No changed contract required.                                                                                                |
| `src/main.ts`, `src/observability/observability.ts`                | Runtime JSON logger, validation/cookies, HTTP log redaction and health exclusions. Request IDs currently do not propagate to async domain work.                                                                                                |

Reviewed prior folders/auth/observability handoffs (006/007/009); deployed claims
there are historical, not new verification. The agent entry point's unguarded-seed
description is stale; inspected source and auth regression tests establish current
global guards. The inactive seed limitation in development docs is also stale:
there is no `src/example-crud` in this checkout.

## Prioritized findings and selected scope

1. **P1, observability:** request ID is local to HTTP finish callback; no domain
   outcome/upstream timings. Add AsyncLocalStorage in the existing observability
   utility, validate incoming UUIDs, and instrument asset mutations, folder CRUD
   mutations and Spaces transfer. Fixed event/error categories, no payloads, raw
   errors, filenames, checksums, storage keys/URLs or credentials. Do not log
   transaction retries/per-item reads. HTTP retains ownership of error-level
   request summaries; domain failures use warnings, reconciliation-write failure
   gets its own safe error event.
2. **P1, tooling:** no staged formatter, ignores or CI validation gate. Add pinned
   Husky/lint-staged, manifest-contained guarded preparation (package-only images),
   explicitly scoped non-mutating checks and staged supported-file matching.
   Keep the passing source/test format baseline; format only changed configuration.
3. **P2, controller:** inline `new ParseObjectIdPipe` bypasses Nest pipe wiring.
   Add a dedicated optional subclass and delegate query validation through Nest;
   preserve absent, malformed and repeated-query behavior. Characterize first.
4. **P2, bootstrap:** missing cookie-parser types prevent a useful lint gate;
   add compatible declarations, use callable CommonJS import and explicitly log
   safe startup failure before a nonzero exit. No broad raw-error serialization.
5. **Not selected:** splitting the folder coordinator/upload service, framework
   upgrades, auth changes, schema/index migration, stale e2e replacement, live
   infrastructure work or formatting untouched documentation/source.

## Compatibility / constitution

All six principles are retained: one asset/folder domain, unchanged DTO/HTTP/auth
contracts, existing guards, unchanged transactions/indexes/storage lifecycle,
focused regressions plus local tooling fixtures, repository-local evidence and
external-owner handoff. No exception or consumer migration is required.
Correlation is an additive response-header behavior; UUID validation does not
authorize requests. No outgoing auth/S3 trace headers or cross-service tracing
claim is introduced. Domain operation IDs also support callers outside HTTP.

## Verification record

Final results and fixture checks are recorded in [handoff.md](handoff.md).
