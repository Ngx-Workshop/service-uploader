# Agent entry point — service-uploader

This repository is the NestJS service seed for Ngx-Workshop. Assume you have
access to this repository only. Frontends, gateway, auth service, and other data
services are external owners; do not require their source to begin local work.

## Read before implementation

1. [Constitution](.specify/memory/constitution.md): durable design rules.
2. [Architecture](docs/architecture.md): responsibilities, source map, external contracts.
3. [Development](docs/development.md): commands, verification, known limitations.
4. [Workflow](.specify/README.md): specify → plan → tasks → implement → verify.
5. The relevant feature folder listed in [specs](specs/README.md), if one exists.

For a newly cloned product repository, also follow [seed adoption](docs/seed-adoption.md).
All links above resolve within this checkout. Do not assume a sibling repository exists.

## Working rules

- Inspect relevant source and `git status` before editing; preserve unrelated changes.
- Maintain a local spec, plan, tasks, and handoff for features and behavior changes.
  Small docs edits and mechanical fixes can use a concise change/verification summary.
- Distinguish current implementation from intended rules. Uploader/folder CRUD
  uses global auth-client authentication/role guards; GET/HEAD health is explicitly
  public. Do not silently expand authentication scope or equate local doubles with
  verified production authorization.
- Keep controllers, DTO validation, service logic, and persistence responsibilities
  clear. Do not access another service's collections to bypass its API.
- Regenerate OpenAPI and local contracts for API changes; document consumer impact.
  Do not hand-edit generated artifacts as the source of a contract change.
- Use the explicit OpenAPI generation environment described in the development
  guide. Generation stubs are not runtime authentication or database behavior.
- Resolve routine choices and record assumptions. Ask only for missing decisions
  that materially affect requirements or compatibility; continue independent work.
- Verify changed behavior and record actual results, pre-existing failures, and
  unavailable infrastructure separately. Do not report empty suites as coverage.
- Update affected context docs and leave a handoff for external contract consumers.

This is a Markdown workflow inspired by Spec Kit. It does not install Spec Kit,
register slash commands, or require a particular AI tool.

## Code Maintenance

The selected work is [Code Maintenance](specs/010-code-maintenance/spec.md) (locally verified).
Read its [plan](specs/010-code-maintenance/plan.md), [tasks](specs/010-code-maintenance/tasks.md) and
[handoff](specs/010-code-maintenance/handoff.md). Local T001-T010 are complete; retain older unfinished
feature records without treating them as the next task. The requested work covers
NestJS module/domain boundaries, thin controllers, cohesive services, Prettier
with Husky/lint-staged, CI checks and safe domain logging through existing
observability. Live collector and deployment smoke checks remain external-owner work.
