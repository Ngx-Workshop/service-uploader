# Implementation plan: HTML video upload validation

Status: Implemented; integration pending
Spec: [spec.md](spec.md)
Updated: 2026-10-03

## Source baseline

The upload controller uses `ParseFilePipeBuilder` for required-file and size
validation. The uploader service creates metadata before calling Spaces. Existing
tests use model and storage doubles.

## Design and requirement mapping

| Requirement | Approach | Files/boundaries affected |
| --- | --- | --- |
| FR-001 | Define the explicit HTML video MIME allowlist and validate it in the service. | `src/uploader/uploader.service.ts` |
| FR-002 | Add Nest's signature-aware file type validator before invoking the service. | `src/uploader/uploader.controller.ts` |
| FR-003 | Document the multipart field and 400 response, then regenerate artifacts. | Controller, README, architecture, OpenAPI, contracts |

## Constitution check

The change preserves the authenticated route and keeps request validation in the
controller and business validation in the service. The HTTP contract is explicit
in OpenAPI and repository documentation. No persistence model or authorization
scope changes are required.

## Data, API, and integration contracts

`POST /uploader/upload` becomes intentionally restrictive: clients must submit
`video/mp4`, `video/webm`, or `video/ogg`; other media now receive 400. Existing
response shapes, storage lifecycle, and metadata schema are unchanged. Consumers
must switch unsupported uploads before deployment.

## Verification plan

| Acceptance scenario | Check/test | Environment |
| --- | --- | --- |
| AC-001 / AC-002 | Uploader service Jest suite | Local model/storage doubles |
| FR-003 | OpenAPI build and generated contract build | `GENERATE_OPENAPI=true` |

## Risks and migration

The validator identifies container types, not codec compatibility. Browser support
varies by codec and browser, so callers remain responsible for producing broadly
compatible encodings. Upload clients that previously sent images or arbitrary
files must use a supported video format.
