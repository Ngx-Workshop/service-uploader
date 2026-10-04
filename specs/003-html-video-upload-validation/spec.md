# Feature: HTML video upload validation

Status: Implemented; integration pending
Feature ID: 003-html-video-upload-validation
Created: 2026-10-03
Updated: 2026-10-03
Request/source: Limit uploaded video types to HTML video supported formats.

## Problem and scope

The upload endpoint previously accepted arbitrary binary media. Consumers need
assets suitable for native HTML video playback.

In scope:

- Accept MP4, WebM, and Ogg video uploads only.
- Reject unsupported declared media types before metadata persistence or storage.
- Reject non-video content at the HTTP boundary when its detected signature does
  not match the allowlist.
- Document the changed HTTP contract and regenerate local API artifacts.

Out of scope:

- Codec-level compatibility validation.
- Browser, gateway, authentication, or storage-provider changes.
- Existing non-video assets and metadata-only records.

## Current behavior and evidence

[`src/uploader/uploader.controller.ts`](../../src/uploader/uploader.controller.ts)
limited size and presence but not media type. [`src/uploader/uploader.service.ts`](../../src/uploader/uploader.service.ts)
persisted the caller-provided media type without an allowlist.

## User scenarios and acceptance

### AC-001 — accepted HTML video upload

- Given an authenticated multipart upload with an MP4, WebM, or Ogg video
- When the content signature and media type match an allowed type
- Then upload processing continues with the allowed media type.
- Covers: FR-001
- Priority: required

### AC-002 — rejected unsupported upload

- Given an upload with a non-video or unsupported video media type
- When the service receives it
- Then it returns HTTP 400 before metadata persistence or storage transfer.
- Covers: FR-002
- Priority: required

## Functional requirements

- FR-001: The upload endpoint must support only `video/mp4`, `video/webm`, and
  `video/ogg`.
- FR-002: Unsupported media types must be rejected at the HTTP and service
  boundaries before creating an asset or transferring bytes.
- FR-003: API documentation must declare the supported upload formats.

## Success criteria

Focused unit tests prove allowed media reaches storage and disallowed media does
not create metadata or transfer bytes. The generated OpenAPI description and
local contract package build successfully. Live gateway/browser compatibility is
deployment verification, not part of this local scope.
