# Implementation plan: Upload filename normalization

Status: Implemented; integration pending
Spec: [spec.md](spec.md)
Updated: 2026-10-03

## Design and requirement mapping

| Requirement | Approach | Files/boundaries affected |
| --- | --- | --- |
| FR-001 | Normalize basename with NFKC and whitespace collapse; repair recognized lossless UTF-8 mojibake. | `src/uploader/uploader.service.ts` |
| FR-002 | Validate the normalized value and use it for `originalFilename` and fallback `name`. | Uploader service and tests |
| FR-003 | Derive the random key extension from the normalized filename. | Uploader service |

## Constitution check

The service retains business validation at the service boundary while leaving
multipart transport concerns in the controller. The response shape is unchanged;
only the documented `originalFilename` value becomes normalized.

## Compatibility and risks

New uploads with path components or mojibake return a cleaned filename in
metadata. Existing assets are unchanged. A filename consisting only of removable
characters is rejected before persistence. The normalization does not inspect
media content or alter user-supplied display names.
