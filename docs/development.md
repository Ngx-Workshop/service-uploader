# Development and verification

Run commands from this repository root. Use Node 22, matching Docker/CI, and the
committed lockfiles. Registry access may be required for `@tmdjr/ngx-auth-client`.

## Runtime setup

Install with `npm ci`. Supply a local `.env` or environment containing:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/service_uploader_dev?replicaSet=rs0
PORT=3010
AUTH_BASE_URL=http://localhost:3000
SPACES_ACCESS_KEY_ID=your-spaces-key
SPACES_SECRET_ACCESS_KEY=your-spaces-secret
SPACES_BUCKET=ngx-workshop-assets
SPACES_ENDPOINT=https://sfo3.digitaloceanspaces.com
SPACES_OBJECT_ACL=public-read
```

The URI is an example for a disposable local replica-set database. MongoDB 6+
with transactions (replica set/Atlas or a sharded cluster) is required for folder
membership and deletion; standalone MongoDB is no longer sufficient. The auth URL is a
placeholder for your actual auth service; it does not launch one. Inspect the
installed auth-client package for additional configuration before testing guarded
routes. Never set `GENERATE_OPENAPI=true` when running the real API.

| Purpose | Command | Notes |
| --- | --- | --- |
| Development | `npm run start:dev` | Requires reachable MongoDB |
| Build and OpenAPI | `GENERATE_OPENAPI=true npm run build` | `postbuild` generates `openapi.json`; explicit flag avoids import-order issue |
| Regenerate OpenAPI | `GENERATE_OPENAPI=true npm run openapi` | Uses existing compiled output; build first after source changes |
| Production runtime | `npm run start:prod` | Runs compiled code with runtime environment |
| Unit/HTTP tests | `npm test -- --runInBand` | Uploader/model/storage/auth doubles; opt-in database tests skip without their URI |
| End-to-end tests | `npm run test:e2e -- --runInBand` | Existing test is stale; see below |
| Lint | `npm run lint` | Uses `--fix` and can modify files; inspect resulting changes |

## API/contract changes

1. Update DTO decorators, controller responses, service behavior, and schema as
   required by the feature; keep compatibility decisions in its plan.
2. Run `GENERATE_OPENAPI=true npm run build`.
3. Install contract tooling with `npm --prefix contracts/service-uploader ci`.
4. Run `npm run contracts:service-uploader:gen` and
   `npm run contracts:service-uploader:build`.
5. Review OpenAPI and generated type differences, public exports, required/optional
   fields, status codes, and downstream impact. Record the results.

Publishing is a separate release action. The publish script invokes
`prepublishOnly`, which cleans, regenerates, and builds the contract package.
Generated files must not replace DTO/controller source as the source of truth.
Do not claim a version is published merely because local generation succeeded.

`POST /uploader/upload` accepts browser image/video MIME families (`image/*` and
`video/*`) plus PDFs (`application/pdf`). The HTTP file validator checks detected
file signatures and falls back to the declared MIME type for formats without
binary signatures; direct service callers receive the same MIME allowlist
validation.
Uploaded filenames are reduced to a basename, Unicode-normalized, stripped of
control characters, and have whitespace collapsed before they are persisted or
used as the default display name.

## Folders and duplicate detection

Folders are virtual, flat, and authenticated. Create/rename via
`POST /uploader/folders` or `PATCH /uploader/folders/:id` with `{ "name": "Brand" }`.
Use the returned `_id` in asset create/upload metadata or
`PATCH /uploader/:id` with `{ "folderId": "<id>" }`. Move to root with
`{ "folderId": null }`. S3 keys/URLs stay unchanged.
List a folder using `GET /uploader?folderId=<id>`; root uses `?root=true`.
Do not combine `folderId` with `root=true`. Delete only empty folders; archived,
failed and metadata-only assets still count as members.

Identical file bytes return 409 across folders and archived assets. Failed storage
uploads can retry; pending uncertain outcomes require reconciliation. Deleting
asset metadata releases duplicate protection but does not delete S3 bytes.
Index creation runs at runtime startup, even when Mongoose auto-indexing is off.

Before rollout, audit the target database (read-only):

```javascript
db.assets.aggregate([
  { $match: {
    checksumSha256: { $type: "string" },
    storageStatus: { $in: ["PENDING_STORAGE", "READY"] }
  } },
  { $group: { _id: "$checksumSha256", ids: { $push: "$_id" }, count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
]);
```

For each group, explicitly choose a canonical asset, reconcile links, and remove
duplicate metadata or correct genuinely failed status. Do not mark successful
uploads failed just to bypass deduplication. Do not automatically delete objects.
The service fails startup if these duplicates remain. Legacy assets without a
checksum require retrieving their original bytes to backfill; absent checksums
cannot be deduplicated. Existing assets without a folder ID need no migration.

For real database verification, supply a URI for an isolated replica set:

```bash
MONGODB_FOLDER_TEST_URI='mongodb://127.0.0.1:27017/?replicaSet=rs0' \
  npm test -- --runInBand --testPathPattern=uploader
```

The integration suite creates a unique `uploader_folders_test_*` database and drops
only that database at teardown. It exercises real indexes, transactions, duplicate
upload races and delete/assignment/move races; storage remains mocked. Do not point
test tooling at production infrastructure. Test scripts enable Node's experimental
VM modules because Nest's file-signature validator dynamically imports ESM
`file-type`; otherwise valid multipart fixtures are rejected inside Jest.

## Docker

Use `docker compose -f docker-compose.yml up --build`. The file expects `.env`
and an existing `ngx-net` network;
it does not start MongoDB or auth. Container connections need addresses reachable
from inside Docker, not the host-only localhost example above.

## Verification for implementations

- Add focused tests for changed controller/service behavior, DTO rejection,
  access policy, not-found/conflict responses, archive state, and version changes
  as applicable. Use model/guard doubles for unit tests.
- For HTTP tests, reproduce the global validation and cookie setup from `main.ts`;
  supply auth-client guard doubles when the test module does not import
  `UploaderModule`.
  Use a disposable database when verifying real persistence behavior.
- For changed endpoints, build and regenerate contracts, then validate representative
  requests/responses. For auth changes include allowed and denied cases.
- Record commands, pass/fail/blocked outcomes, and missing environment requirements
  in the handoff. Unit or build success does not prove live gateway integration.
- For documentation-only changes, check paths, links, accuracy, and whitespace;
  application builds are normally unnecessary.

## Known limitations

Source observations from 2026-09-29; these are not executed test results.

- `src/swagger.ts` imports `AppModule` before setting `GENERATE_OPENAPI` inside its
  function. Conditional imports/providers are evaluated earlier. Set the flag in
  the command environment as shown above; Docker and CI already do this.
- `test/app.e2e-spec.ts` expects `GET /` to return `Hello World!`, but this module
  has no root controller. It imports the real application/database and does not
  mirror the runtime's global pipe/cookie setup or close the app. Do not count it
  as a working API regression suite.
- Default uploader tests use model/auth/storage doubles. The opt-in integration
  suite tests real MongoDB, not live auth, S3 or gateway. Verify the deployed
  HTTP path and runtime auth/storage configuration before production.
- Multipart intake buffers at most 25 MiB per request and uploads synchronously.
  Concurrent uploads multiply memory usage. Storage failures return 503; there is
  no durable retry queue. Pending/failed records require inspection and reupload
  or reconciliation; do not treat them as ready assets.
- Public read is the default for this static-asset bucket. To restrict downloads,
  set `SPACES_OBJECT_ACL=private`; signed downloads are not implemented here.
  DELETE and archive affect metadata only, not object bytes or permissions.
- Ensure the gateway request body limit allows 25 MiB plus multipart overhead.
  Live Spaces/MongoDB/auth/gateway checks remain deployment verification.
- `UpdateExampleMongodbDocDto` is declared in both DTO files. The controller uses
  `update.dto.ts`; avoid extending the unused duplicate by accident.
- The inactive `src/example-crud` seed remains as reference code and retains its
  inherited limitations; `AppModule` does not mount it.

Remove/update limitations when fixed. Update architecture and environment guidance
whenever the corresponding implementation changes.


## Docker deployment environment file

The Actions workflow writes raw `KEY=value` lines for `docker run --env-file`.
Do not JSON-encode or shell-quote values: Docker retains those characters in the
container environment, invalidating the MongoDB URI and port. Newline and NUL
validation remains in place. Local dotenv parsing and Compose have different
quoting rules. This mechanical workflow correction changes no API contracts.

## Spaces deployment

The Actions workflow requires organization secrets `SPACES_ACCESS_KEY_ID` and
`SPACES_SECRET_ACCESS_KEY`, accessible to this repository. It validates nonempty,
single-line values and supplies them to the container in the protected runtime
file, never the Docker build. Local runtime needs the same keys; OpenAPI generation
uses an inert storage provider and requires none. Endpoint/bucket/ACL settings
have defaults shown above; deployment writes them explicitly.

After deployment, upload through `/api/uploader/upload` with authentication, check
201/READY and download `storageUrl`; compare SHA-256 with `checksumSha256`. Restart
the service and confirm the object still downloads. If private ACL is selected,
verify via authenticated S3 tooling instead. Organization secrets are not readable
in this local checkout, so local tests use doubles.
