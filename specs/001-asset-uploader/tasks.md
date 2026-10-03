# Tasks: Asset uploader API

Spec: [spec.md](spec.md)
Plan: [plan.md](plan.md)
Updated: 2026-10-03

## Local implementation

- [x] T001 — Implement asset DTOs, schema, service, controller, module, and app
  wiring in `src/uploader/**` and `src/app.module.ts`. Covers FR-001–FR-005 /
  AC-001–AC-003. Depends on: none. Verify: focused Jest tests.
- [x] T002 — Add meaningful service, DTO, ID, and controller-contract tests in
  `src/uploader/**/*.spec.ts`. Covers AC-001–AC-003. Depends on: T001. Verify:
  `npm test -- --runInBand uploader`.

## Integration and documentation

- [x] T003 — Regenerate OpenAPI and contracts. Depends on: T001. Verify:
  generation and contract TypeScript build pass and expose uploader shapes.
- [x] T004 — Update architecture/development/README context and final verification
  in `handoff.md`. Depends on: T001–T003. Verify: acceptance coverage is recorded.

## External work

- [ ] X001 — Owner: gateway/Nginx and storage infrastructure. Required change:
  select durable storage/transfer, implement persistence, and serve only verified
  durable objects. Blocks: files becoming durable/static, not local CRUD.
  Acceptance: an uploaded checksum resolves to durable content through the agreed
  static URL after restart/redeploy.

## Progress and evidence

| Task | Result or blocker | Evidence |
| --- | --- | --- |
| T001 | Complete | `src/uploader/**` and `src/app.module.ts` |
| T002 | Complete | 4 suites / 12 tests passed with `npm test -- --runInBand uploader` |
| T003 | Complete | OpenAPI generation and contract TypeScript build passed |
| T004 | Complete | Architecture, development, README, WORKSHOP, and this handoff updated |
| X001 | Deferred by request | Storage location and transfer mechanism intentionally undecided |
