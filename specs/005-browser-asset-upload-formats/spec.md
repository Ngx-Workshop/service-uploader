# Feature: Browser asset upload formats

Status: Implemented; integration pending
Feature ID: 005-browser-asset-upload-formats
Created: 2026-10-03
Updated: 2026-10-03
Request/source: Support browser images, browser videos, and PDFs.

## Problem and scope

The previous upload contract allowed only three video MIME types. Browser-facing
asset intake must also accept browser images and PDF documents.

In scope:

- Accept all valid `image/*` and `video/*` MIME types.
- Accept `application/pdf`.
- Preserve file-type validation at HTTP and service boundaries.

Out of scope:

- Audio, archives, office documents, and arbitrary application types.
- Browser-specific codec/format compatibility guarantees.

## User scenarios and acceptance

### AC-001 — accepted browser assets

- Given a PNG, SVG, MP4, or PDF multipart upload
- When it meets existing size and metadata validation
- Then upload processing persists it with its media type.
- Covers: FR-001

### AC-002 — rejected unsupported assets

- Given audio, archive, or text content
- When it is uploaded
- Then the service returns HTTP 400 before persistence or transfer.
- Covers: FR-002

## Functional requirements

- FR-001: The service must accept `image/*`, `video/*`, and `application/pdf`.
- FR-002: The controller and service must reject every other MIME type.
- FR-003: API documentation must describe the broadened contract.
