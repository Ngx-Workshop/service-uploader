# Implementation plan: Browser asset upload formats

Status: Implemented; integration pending
Spec: [spec.md](spec.md)
Updated: 2026-10-03

## Design and requirement mapping

| Requirement | Approach | Files/boundaries affected |
| --- | --- | --- |
| FR-001 / FR-002 | Share one MIME regular expression between service validation and Nest file validation. | Uploader service and controller |
| FR-003 | Update multipart OpenAPI descriptions, repository documentation, and generated contracts. | Controller, docs, OpenAPI, contracts |

## Constitution check

The authenticated endpoint and storage lifecycle remain unchanged. Validation is
enforced in both HTTP and service layers, and the changed request contract is
recorded and regenerated locally.

## Compatibility and risks

This is an additive change for image/PDF clients and removes the prior rejection
of browser image formats. Binary signature detection continues where available;
the declared MIME type is used only for formats that cannot expose a binary
signature, including SVG. Browser support depends on a client's browser and
chosen codec; accepting a MIME type is not a rendering guarantee.
