# Handoff: Code Maintenance

Status: Implemented; locally verified, live integration pending · Updated: 2026-11-22
[Spec](spec.md) · [Plan](plan.md) · [Tasks](tasks.md)

## Delivered

Source baseline: `da36f7e`. The user-prepared entry point, feature records and
older unfinished work are preserved. [Audit](audit.md) records the dependency
map, priorities, baseline commands and constitution check.

- Controller query-ID validation now uses an optional Nest pipe, preserving
  missing/invalid/repeated-query behavior. Asset/folder transactions, minimal
  module exports, guards, DTOs, routes, indexes and storage semantics are retained.
- Pinned Husky 9.1.7 / lint-staged 16.2.7, guarded manifest prepare, staged-only
  formatting, generated/vendor exclusions, non-mutating format/lint checks and
  PR/main validation gates. No source-wide formatting rewrite.
- Missing cookie-parser declarations added; callable CommonJS bootstrap import
  and safe explicit startup failure handling resolve the lint baseline.
- Existing native JSON logging now carries validated UUID request context across
  async domain operations. Mutation/storage outcomes contain duration and operation
  IDs, fixed event/reason categories and no private content/upstream errors.
  Health exclusions and HTTP severity/shape are retained.
- Architecture/development/observability and agent context updated. No publication,
  deployment, push or commit in the real checkout.

## Verification evidence

Final checks use Node 22.23.3 (locally installed), with its npm, via:
`export PATH=/Users/ba5ik7/.nvm/versions/node/v22.23.3/bin:$PATH`.
Docker/CI retain their existing Node 22.23.5 selection.

| Task / acceptance  | Command or method                                                                                                                                                                            | Actual result                                                                                                                                                                                                                                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T001-T002 / AC-001 | Source audit and initial status; baseline tests/build/lint/format                                                                                                                            | Source map and priorities in audit. 85 tests passed, 10 database cases skipped; build/TS format passed; existing bootstrap lint error/warning and config drift identified.                                                                                                                                             |
| T003 / AC-001      | `npm test -- --runInBand folders.http.spec.ts uploader.service.spec.ts folders.service.spec.ts uploader.module.spec.ts observability.spec.ts spaces-storage.service.spec.ts` before refactor | 6 suites / 66 tests passed, including newly characterized optional/repeated query IDs and double storage/database failure. Existing access/validation/conflict/state/transaction assertions retained.                                                                                                                  |
| T004/T007-T008     | Same targeted command after implementation                                                                                                                                                   | 6 suites / 74 tests passed; native JSON, canary redaction, contextual outcomes, nested storage and concurrent request isolation verified.                                                                                                                                                                              |
| T005-T006 / AC-002 | `npm run test:maintenance -- --installs`                                                                                                                                                     | Local fixture commits format staged supported files, including spaces in paths; partial staging and unrelated unstaged content preserved. Generated invalid TS excluded. Invalid syntax blocks commit and restores index/worktree. Actual format:check rejects drift without mutation.                                 |
| T006 / AC-003      | Same fixture command; full offline `npm ci --no-audit --no-fund` with lifecycle scripts enabled                                                                                              | Clean developer Git checkout installs hooks; CI, package-only/no-Git, production Git checkout with `--omit=dev`, and `HUSKY=0` installs pass without hook setup. Production has no Husky dependency. Fixtures removed at teardown. This is Docker-order-equivalent installation evidence, not a container image build. |
| T009 / AC-005      | `npm test -- --runInBand`                                                                                                                                                                    | 11 suites / 95 tests passed; one suite / 10 opt-in MongoDB cases skipped. No empty suite counted as coverage.                                                                                                                                                                                                          |
| T009               | `npm run lint:check`                                                                                                                                                                         | Passed with zero errors/warnings.                                                                                                                                                                                                                                                                                      |
| T009               | `npm run format:check`                                                                                                                                                                       | Passed for the explicit source/test/tooling baseline.                                                                                                                                                                                                                                                                  |
| T009               | `GENERATE_OPENAPI=true npm run build`                                                                                                                                                        | Passed, including postbuild generation.                                                                                                                                                                                                                                                                                |
| T009 / FR-003      | `git diff --exit-code -- openapi.json contracts/`                                                                                                                                            | Passed: generated HTTP definitions and contracts unchanged; no contract regeneration/publication needed.                                                                                                                                                                                                               |
| T010               | Local documentation, task/index evidence and whitespace/link checks                                                                                                                          | Context and external-owner next steps recorded; local tasks complete.                                                                                                                                                                                                                                                  |

Implementation-time failures were corrected: lock-only install initially invoked
prepare before Husky existed (rerun with `HUSKY=0`, then normal `npm ci`); initial
patch placement/type-aware lint issues were corrected and regressions rerun.
They are not outstanding failures. The npm install reported 56 dependency advisory
findings (6 low, 21 moderate, 24 high, 5 critical); these were not assessed or
remediated with out-of-scope dependency upgrades.

## Compatibility and remaining external verification

No route, DTO, authorization, data/index migration or upstream protocol change.
Valid incoming UUID request IDs are now echoed; invalid IDs are replaced, never
logged. This additive correlation behavior is not authorization or distributed
tracing. Collector event fields remain nested under native `message`.

| Owner                                                                     | Required action / ordering                                                                                                                                                                                                        | Acceptance                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Infrastructure owner `Ngx-Workshop/nginx-ngx-workshop.io` (Alloy/Grafana) | After normal deployment, confirm native `message.event`, `message.requestId`, `message.operationId`, level/context parsing. Retain existing service labels; do not label request/operation IDs. No application credential needed. | Observe one successful and one failed upload/folder operation in the live stack; correlate domain/HTTP entries, and confirm quiet health polling. Live Grafana receipt/authorization remains pending, not inferred from local JSON tests. |
| Service deployment / MongoDB / auth / Spaces owners                       | Use existing transaction-capable isolated test URI for optional DB regression, then normal deployed smoke checks. No schema/index migration or new runtime secret.                                                                | Authenticated CRUD/upload, READY/download checksum, duplicate 409, folder transactions, generic storage 503; validate forwarded/generated request ID if gateway propagation is desired. No live checks executed in this task.             |
| API / contracts consumers                                                 | No adoption or release action required for maintenance.                                                                                                                                                                           | Existing contracts stay byte-identical.                                                                                                                                                                                                   |

The stale root-route e2e is not executed; live auth/S3/gateway and actual Docker
builds are outside local fixture coverage. Optional MongoDB tests remain skipped
without `MONGODB_FOLDER_TEST_URI`.

## Next action

Review the local changes, then have the external infrastructure/deployment owners
perform the checks above using the existing release process. Local T001-T010 are
complete; do not treat live ingestion as verified or older unfinished specs as
silently completed. No further feature was selected.
