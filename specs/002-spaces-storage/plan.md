# Plan: Spaces storage
Status: Implemented; live integration pending
Spec: [spec.md](spec.md)

Use the pre-existing @aws-sdk/client-s3 dependency without overwriting user changes.
Add a ConfigService-backed SpacesStorageService provider; stub only for OpenAPI.
Save pending metadata with a generated UUID key and safe filename extension before
sending PutObject; on failure record STORAGE_FAILED and return generic 503. On
success save READY. If final save fails, retain the pending record/object for
manual reconciliation. No distributed transaction is implied.
Expose storageKey/storageUrl and new enum values through DTOs and regenerated
contracts; change upload 202 to 201 and document 503. Supply secrets in deploy.yml
and raw Docker env file with existing newline/NUL validation.
Constitution: domain ownership, authenticated routes, source contracts, predictable
lifecycle, focused failure tests, and local documentation satisfied; no deviations.
Validate unit tests, focused lint, application/OpenAPI build, contract generation
and build, and deployment env-file validation with fake credentials.
References: https://docs.digitalocean.com/products/spaces/reference/aws-sdks/
Integration: gateway body limit must accommodate 25 MiB plus multipart overhead.
