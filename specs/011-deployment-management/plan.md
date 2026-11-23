# Plan

Baseline HEAD: `d5e3fe1a8e2df28afbb9453526b697d70f4dc1da`. Audit found jobs publish, deploy;
deploy prerequisites were `publish`.
Use the central Node CLI policy and reviewed service-specific job profile. Separate
validation from publication, make deploy need validate only, preserve transport
steps and existing contract/version semantics. Main-only guards protect mutation;
OIDC write permission belongs only to manual publish. Preserve domain/access rules;
no application/schema changes. Verify YAML parsing, event gates, source transport
comparison and CLI drift check. No live deployment verification is requested.
