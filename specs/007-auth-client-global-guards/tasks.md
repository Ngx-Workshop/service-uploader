# Tasks: Auth-client global guards

Spec: [spec.md](spec.md)
Plan: [plan.md](plan.md)
Updated: 2026-10-04

## Local implementation

- [x] T001 — Register auth-client authentication and role global guards in
  `src/uploader/uploader.module.ts` and remove redundant controller guards.
  Covers FR-001, FR-002, FR-003. Verify: module metadata test.
- [x] T002 — Update focused module/HTTP tests for global guard wiring. Covers
  AC-001 and AC-002. Depends on: T001. Verify: focused Jest command.

## Integration and documentation

- [x] T003 — Update runtime dependency and affected context documentation.
  Depends on: T001. Verify: manifest and documentation review.
- [x] T004 — Run the focused tests and generation-mode build; record outcomes in
  [handoff.md](handoff.md). Depends on: T001, T002, T003.

## Progress and evidence

| Task | Result or blocker | Evidence |
| --- | --- | --- |
| T001 | Complete | `UploaderModule` has `APP_GUARD` registrations. |
| T002 | Complete | Module test added; HTTP test uses a global auth double. |
| T003 | Complete | Manifest and auth documentation updated. |
| T004 | Complete | Focused tests and generation-mode build passed. |
