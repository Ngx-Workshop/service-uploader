# Tasks: HTML video upload validation

Spec: [spec.md](spec.md)
Updated: 2026-10-03

## Local implementation

- [x] T001 — Restrict multipart and service upload intake to HTML video media
  types in `src/uploader/uploader.controller.ts` and
  `src/uploader/uploader.service.ts`. Covers FR-001 / FR-002.
- [x] T002 — Add accepted/rejected media-type test coverage in
  `src/uploader/uploader.service.spec.ts`. Covers AC-001 / AC-002.
- [x] T003 — Document the API and regenerate OpenAPI/contracts. Covers FR-003.

## Progress and evidence

| Task | Result or blocker | Evidence |
| --- | --- | --- |
| T001 | Complete | Explicit MIME allowlist plus signature-aware HTTP validation |
| T002 | Complete | Focused Jest suite |
| T003 | Complete | OpenAPI build and local contract generation/build passed |
