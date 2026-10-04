# Handoff: Upload filename normalization

Status: Implemented; integration pending
Spec: [spec.md](spec.md)
Plan: [plan.md](plan.md)
Tasks: [tasks.md](tasks.md)
Updated: 2026-10-03

## Delivered behavior

The upload service now persists only sanitized and normalized file basenames.
The same value supplies the display name when callers omit `name`; random storage
keys remain unchanged apart from taking their extension from that normalized name.

## Verification

- PASS: `npm test -- --runInBand uploader.service.spec.ts` — 1 suite / 13
  tests, including the supplied mojibake filename and persisted metadata.
- PASS: `npx eslint src/uploader/uploader.service.ts
  src/uploader/uploader.service.spec.ts src/uploader/dto/asset.dto.ts`.
- PASS: `GENERATE_OPENAPI=true npm run build` — generated OpenAPI without
  runtime credentials.
- PASS: `npm run contracts:service-uploader:gen && npm run
  contracts:service-uploader:build`.

## Consumer handoff

Consumers receive normalized `originalFilename` values for new uploads. The
response field remains optional and its TypeScript shape is unchanged.

## Remaining work

No local work remains. Live gateway, browser, MongoDB, and Spaces checks remain
deployment work.
