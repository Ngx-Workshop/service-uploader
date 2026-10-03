# Adopting this seed for a new service

1. Specify the owned document/domain, consumers, user outcomes, and out-of-scope
   responsibilities. Keep other services' persistence behind their APIs.
2. Rename package identity, feature module/controller/service/schema/DTOs, Swagger
   title, contracts directory/package/scripts/exports, Docker service/container,
   ports, and workflow names/targets. Do not blindly replace identifiers inside
   contracts without reviewing the generated output.
3. Replace example fields, routes, and validation with the new domain. Specify
   required/optional fields, uniqueness, archive/delete semantics, versioning,
   timestamp ownership, status codes, and error behavior.
4. Explicitly choose public/authenticated/role-restricted access per route. Use the
   platform auth-client integration and verify denial behavior. Do not copy the
   seed's unguarded writes as an implicit production policy.
5. Resolve applicable inherited limitations, replace the stale e2e scaffold, and
   add tests for the actual behavior. Keep generation mode isolated from runtime.
6. Generate OpenAPI and build the new contracts package. Document producer version,
   consumer changes, gateway mapping, auth setup, and any data migration needs.
   Local artifacts and a handoff are useful even without other repo checkouts.
7. Review copied CI before pushing to `main`: it publishes and deploys using the
   seed's package/target and database checks. Configure the new npm identity, OIDC
   publishing relationship, runtime environment, and deployment target deliberately.
8. Rewrite README, `AGENTS.md`, constitution, architecture/development docs, and
   source baseline for the new service. Keep reusable workflow/templates; remove
   seed-specific facts and unrelated historical feature records.

Completion means an agent opening only this new repository can identify data
ownership, HTTP contracts, access policy, commands, consumers, and pending work.
