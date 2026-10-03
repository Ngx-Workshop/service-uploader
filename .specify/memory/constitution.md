# Constitution — NestJS service seed

Version: 1.0.0 · Adopted: 2026-09-29

These are requirements for future work, not claims that all seed code already
satisfies them. Current gaps live in the development guide.

## 1. Own one bounded data domain

Ngx-Workshop uses independently maintained services. This seed demonstrates CRUD
for one MongoDB document type. Keep a new service focused on its assigned domain;
do not manipulate another service's documents. Use explicit service contracts for
cross-domain work. The gateway owns browser-facing aggregation and routing.

## 2. Make the HTTP contract explicit

Define validated input DTOs, documented response DTOs, status/error behavior,
authentication, and authorization for changed endpoints. Keep controller metadata,
runtime behavior, OpenAPI, and published types consistent. Record compatibility,
consumer impact, and migration requirements before breaking a contract.

## 3. Enforce access at the service boundary

Reuse the platform auth-client mechanisms where applicable. UI guards and hidden
buttons are not authorization. Explicitly classify new routes as public,
authenticated, or role-restricted; test the corresponding behavior. Never use
OpenAPI-generation stubs in normal service operation or commit credentials.

## 4. Keep persistence behavior predictable

Controllers translate HTTP; services own business operations; schemas own storage
constraints. Preserve documented uniqueness, timestamps, versioning, and archive
semantics. Validate changed input and define not-found, conflict, and malformed-ID
behavior rather than relying on incidental database errors.

## 5. Verify behavior and generated contracts

Specify observable acceptance scenarios before nontrivial implementation. Test
successful operations and relevant validation, access, and persistence failures.
Use isolated test doubles or a disposable database. Build and regenerate contracts
when API definitions change. Report verification gaps honestly.

## 6. Keep knowledge within the repository

Record architecture, environment requirements, commands, API consumers, and active
feature decisions locally. External repositories are owners, not implicit checkout
dependencies. A handoff must make cross-repository work understandable without the
original conversation.

## Amendments

Change these principles intentionally with a rationale and version/date update.
Review affected context and templates together. Record justified feature-specific
exceptions in the plan with impact and follow-up.
