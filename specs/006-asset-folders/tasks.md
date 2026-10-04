# Tasks: Asset folders

Spec: [spec.md](spec.md) | Plan: [plan.md](plan.md)

- [x] T001: Folder schema, DTOs, service/controller and module wiring (FR-001/004).
- [x] T002: Membership fields, moves, list filters and checksum index (FR-002/003).
  Depends on T001.
- [x] T003: Focused DTO/service/HTTP/database tests; validate build and lint (FR-001-005).
  Depends on T001/T002.
- [x] T004: Generate/build OpenAPI/contracts and update context/handoff (FR-005).
  Depends on T003.
- [ ] X001: Deployment owner: audit legacy checksums and verify MongoDB replica-set
  races, live storage/auth and gateway. Depends on T004.
- [ ] X002: Consumer owners: publish/install contracts and adopt folders/moves/409.
  Depends on T004.

## Evidence

T001-T003: 89 tests across 10 suites pass, including real MongoDB 6.0.1 indexes
and transactions on an isolated local replica set. Uploader lint passes.
T004: Explicit generation-mode service build, OpenAPI generation, and contract
generation/build pass. API paths, nullable move fields and upload 409 checked.
X001/X002 remain deployment/consumer work, not local implementation blockers.
