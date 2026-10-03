# Development and verification

Run commands from this repository root. Use Node 22, matching Docker/CI, and the
committed lockfiles. Registry access may be required for `@tmdjr/ngx-auth-client`.

## Runtime setup

Install with `npm ci`. Supply a local `.env` or environment containing:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/seed_service_dev
PORT=3003
AUTH_BASE_URL=http://localhost:3000
```

The URI is an example for a disposable local database. The auth URL is a
placeholder for your actual auth service; it does not launch one. Inspect the
installed auth-client package for additional configuration before testing guarded
routes. Never set `GENERATE_OPENAPI=true` when running the real API.

| Purpose | Command | Notes |
| --- | --- | --- |
| Development | `npm run start:dev` | Requires reachable MongoDB |
| Build and OpenAPI | `GENERATE_OPENAPI=true npm run build` | `postbuild` generates `openapi.json`; explicit flag avoids import-order issue |
| Regenerate OpenAPI | `GENERATE_OPENAPI=true npm run openapi` | Uses existing compiled output; build first after source changes |
| Production runtime | `npm run start:prod` | Runs compiled code with runtime environment |
| Unit tests | `npm test -- --runInBand` | No source unit specs currently present |
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

## Docker

The tracked Compose file is named `docker-compose.yml `, with a trailing space.
Use `docker compose -f 'docker-compose.yml ' up --build` until that filename is
deliberately corrected. The file expects `.env` and an existing `ngx-net` network;
it does not start MongoDB or auth. Container connections need addresses reachable
from inside Docker, not the host-only localhost example above.

## Verification for implementations

- Add focused tests for changed controller/service behavior, DTO rejection,
  access policy, not-found/conflict responses, archive state, and version changes
  as applicable. Use model/guard doubles for unit tests.
- For HTTP tests, reproduce the global validation and cookie setup from `main.ts`.
  Use a disposable database when verifying real persistence behavior.
- For changed endpoints, build and regenerate contracts, then validate representative
  requests/responses. For auth changes include allowed and denied cases.
- Record commands, pass/fail/blocked outcomes, and missing environment requirements
  in the handoff. Unit or build success does not prove live gateway integration.
- For documentation-only changes, check paths, links, accuracy, and whitespace;
  application builds are normally unnecessary.

## Known inherited limitations

Source observations from 2026-09-29; these are not executed test results.

- `src/swagger.ts` imports `AppModule` before setting `GENERATE_OPENAPI` inside its
  function. Conditional imports/providers are evaluated earlier. Set the flag in
  the command environment as shown above; Docker and CI already do this.
- `test/app.e2e-spec.ts` expects `GET /` to return `Hello World!`, but this module
  has no root controller. It imports the real application/database and does not
  mirror the runtime's global pipe/cookie setup or close the app. Do not count it
  as a working API regression suite.
- No `src/**/*.spec.ts` tests exist in this baseline. A no-tests exit is not a pass;
  add meaningful coverage for implementation work rather than suppressing it.
- Only `auth-test` has a guard. The demonstration write endpoints are unguarded;
  a production feature must define its access requirements explicitly.
- `UpdateExampleMongodbDocDto` is declared in both DTO files. The controller uses
  `update.dto.ts`; avoid extending the unused duplicate by accident.
- IDs are passed directly to Mongoose; `findByIdAndUpdate` does not request
  `runValidators`. Query values other than literal `true`/`false` leave archive
  filtering unset. Decide and test the intended semantics when touching these areas.
- The contracts entry point uses `@ts-ignore` for generated exports. A successful
  compile alone is insufficient: verify generated public exports exist and match
  consumer imports.

Remove/update limitations when fixed. Update architecture and environment guidance
whenever the corresponding implementation changes.


## Docker deployment environment file

The Actions workflow writes raw `KEY=value` lines for `docker run --env-file`.
Do not JSON-encode or shell-quote values: Docker retains those characters in the
container environment, invalidating the MongoDB URI and port. Newline and NUL
validation remains in place. Local dotenv parsing and Compose have different
quoting rules. This mechanical workflow correction changes no API contracts.
