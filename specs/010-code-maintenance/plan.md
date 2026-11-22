# Implementation plan: Code Maintenance

Status: Implemented and locally verified · Updated: 2026-11-22
Spec: [spec.md](spec.md)

## Source baseline

Repository: `service-uploader` · audited HEAD: `da36f7e`.
NestJS core declared: `^11.0.1`;
Prettier declared: `^3.4.2`.
Existing workflow: present; retained.
Prettier exists; Husky/lint-staged were absent. Native JSON HTTP logging exists.
No runtime maintenance or application checks have been completed by setup.

Inspect these actual module/controller/service paths first:

- `src/app.module.ts`
- `src/observability/observability.module.ts`
- `src/uploader/uploader.module.ts`
- `src/observability/health.controller.ts`
- `src/uploader/folders.controller.ts`
- `src/uploader/uploader.controller.ts`
- `src/uploader/folders.service.ts`
- `src/uploader/spaces-storage.service.ts`
- `src/uploader/uploader.service.ts`

Also inspect `src/main.ts`, any bootstrap/config/adapter/DTO/schema files,
`src/observability/`, `package.json`, `package-lock.json`, Prettier/ESLint configs,
`Dockerfile`, `.dockerignore`, `.github/workflows/`, existing tests and local docs.

## Design and requirement mapping

| Requirement | Planned approach                                                                                             | Evidence  |
| ----------- | ------------------------------------------------------------------------------------------------------------ | --------- |
| FR-001      | Record baseline commands, dependency map and findings by source path in `audit.md` here                      | T001–T002 |
| FR-002/003  | Characterize behavior, then extract only concrete misplaced responsibilities; keep module public APIs narrow | T003–T004 |
| FR-004      | Implement staged Prettier, guarded hook setup and CI checks without collateral formatting                    | T005–T006 |
| FR-005      | Inventory existing events, add safe use-case/upstream events and useful correlation through existing logger  | T007–T008 |
| FR-006      | Verify, update local docs and record remaining external acceptance                                           | T009–T010 |

Service focus: Preserve upload validation, filename normalization, folder semantics and Spaces storage behavior. Never log file contents, signed URLs or storage credentials. Use the repository-specific ESM-compatible test command.

## Constitution check

T001/T002 evidence and the full dependency map are in [audit.md](audit.md).
Selected changes are optional query-ID pipe wiring, guarded staged formatting/CI,
cookie-parser type-safe bootstrap, and safe mutation/storage events with async
context. Retain the folder transaction coordinator and uploader module boundaries;
their current cohesion does not justify splitting services or models.
Only touched files enter an expanded formatting baseline; source/tests already
pass. Incoming UUID request IDs may be reused, otherwise generated locally.
HTTP errors remain error-level; bounded domain failure outcomes use warnings.
No consumer, DTO, schema, index or upstream protocol change is intended.

Keep domain ownership, contracts/access, persistence semantics, meaningful
verification and repository-local context intact. Recheck each local constitution
principle in T002 after source inspection and again in T010; justify any deviation.
No architecture-quality claim is made by adding this plan.

## Formatting and installation details

Use project-local pinned compatible devDependencies and regenerate the lockfile.
A prepare hook that invokes a missing script/tool will break images that copy only
`package*.json` before `npm ci`. Inspect the Dockerfile before choosing a lifecycle:
either make preparation self-contained and guarded in the manifest, or explicitly
copy the guarded installer before installing. Skip hooks for CI, `HUSKY=0`,
production/no-dev installs and no-Git environments without skipping other required
install scripts. Preserve existing lifecycle behavior. Verify using disposable
checkouts/directories, not fabricated pass messages. Avoid network-on-commit
fallbacks. Exclude generated paths from Prettier/lint-staged/CI consistently.
Choose a documented formatting baseline or format touched files; do not silently
claim existing whole-repo drift is clean or make CI unexpectedly fail on old drift.

## Logging and collector compatibility

Read `docs/observability.md` and existing logging tests. Native JSON output wraps
structured payloads according to the installed NestJS version; confirm actual
field placement before documenting LogQL. Existing HTTP IDs are generated locally;
there is no automatic domain correlation just because an access record has an ID.
Prefer a small singleton context provider/AsyncLocalStorage if propagation is
needed; verify isolation and background-work behavior. Keep untrusted IDs bounded
and validated, don't create high-cardinality Loki labels, and preserve heartbeat
behavior. Extend existing tests with safe success/failure/canary coverage and
record useful query examples only after checking the emitted structure.

## Compatibility, dependencies and delivery

No intended consumer/schema change or migration. Preserve installed auth clients,
protocol adapters and generated output sources. If source inspection reveals a
necessary contract change, document consumer impact and producer-first delivery
before changing it; do not silently broaden maintenance scope. Other services,
Grafana/Alloy and production hosts are external owners; do not require sibling
checkouts. No publication or deployment is authorized by this task.

## Verification

T001 records actual scripts/baseline results. Use supported local tests and a
non-mutating lint command; existing `lint` scripts often include `--fix`.
AC-001 uses meaningful characterization/HTTP tests. AC-002/003 use disposable Git
and install fixtures, partial staging and a negative formatting check. AC-004 uses
existing observability tests plus domain success/failure/redaction/context checks.
AC-005 records build, lint, format and applicable contract checks. Separate local,
mocked, container and live Grafana results. Do not install latest NestJS-only
logging features without checking the pinned major version.

## References

- [NestJS modules](https://docs.nestjs.com/modules)
- [NestJS controllers](https://docs.nestjs.com/controllers)
- [NestJS logging](https://docs.nestjs.com/techniques/logger)
- [Prettier pre-commit integration](https://prettier.io/docs/precommit)
- [Husky installation](https://typicode.github.io/husky/get-started.html)
- [Husky CI/Docker/production guidance](https://typicode.github.io/husky/how-to.html)

Consult documentation matching installed versions before implementation.
