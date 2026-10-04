# Feature: Upload filename normalization

Status: Implemented; integration pending
Feature ID: 004-upload-filename-normalization
Created: 2026-10-03
Updated: 2026-10-03
Request/source: Sanitize and normalize uploaded file names.

## Problem and scope

Upload metadata currently preserves a client filename verbatim. This retains path
components, control characters, incompatible Unicode whitespace, and UTF-8
mojibake such as `Screen 2026-10-03 at 11.01.50â¯PM.png`.

In scope:

- Remove directory components and control characters.
- Normalize Unicode compatibility characters and whitespace.
- Repair valid UTF-8 mojibake when decoding is lossless.
- Use the resulting filename in asset metadata and the default display name.

Out of scope:

- Changing the MP4/WebM/Ogg upload media-type contract.
- Renaming existing assets or changing random Spaces object keys.

## User scenarios and acceptance

### AC-001 — normalized upload filename

- Given a file named `Screen 2026-10-03 at 11.01.50â¯PM.png`
- When the filename is normalized
- Then its value is `Screen 2026-10-03 at 11.01.50 PM.png`.
- Covers: FR-001

### AC-002 — sanitized persisted metadata

- Given an uploaded filename with a directory component and mojibake
- When no explicit display name is supplied
- Then persisted `originalFilename` and the default `name` contain the sanitized,
  normalized basename.
- Covers: FR-002

## Functional requirements

- FR-001: Filename normalization must be deterministic and lossless except for
  path components, controls, and whitespace normalization.
- FR-002: Metadata must persist only a non-empty normalized filename no longer
  than 255 characters.
- FR-003: Random storage keys must continue to use only the safe extension.
