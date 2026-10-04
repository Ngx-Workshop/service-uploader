# service-uploader

NestJS microservice scaffolded from the Ngx-Workshop seed-service-nestjs template.

Use Node.js 22 or newer, matching the seeds.

## Development

```sh
npm ci
cp .env.example .env
# Supply reachable MongoDB and auth settings, then:
npm run start:dev
# Build/OpenAPI (generation mode only):
GENERATE_OPENAPI=true npm run build
npm --prefix contracts/service-uploader ci
npm run contracts:service-uploader:gen
npm run contracts:service-uploader:build
```

## Integration

Native API: /uploader; browser API: /api/uploader.
Default port: 3010. Confirm this port is available on your service host.
Contracts: @tmdjr/service-uploader-contracts; directory: contracts/service-uploader.
The gateway snippet below strips /api and preserves /uploader. Replace the example host with your actual private service host.
MongoDB and auth are external prerequisites. Compose requires the external ngx-net network.
All uploader endpoints require `RemoteAuthGuard`. `POST /uploader/upload` accepts
one multipart `file` up to 25 MiB, stores it in DigitalOcean Spaces, then returns
HTTP 201 with `READY`, `storageKey`, and `storageUrl`. Configure
`SPACES_ACCESS_KEY_ID` and `SPACES_SECRET_ACCESS_KEY` in the runtime environment.
Defaults: bucket `ngx-workshop-assets`, endpoint
`https://sfo3.digitaloceanspaces.com`, ACL `public-read` for public static assets.
Use `SPACES_OBJECT_ACL=private` for restricted objects; the origin URL alone does
not grant read access. The deployment workflow passes the organization-level
GitHub secrets to Docker at runtime; grant this repository access to those secrets.
Uploads fail with 503 when Spaces rejects the transfer. Database completion errors
return no success and can leave a pending record/object requiring reconciliation.
Existing pending-only uploads must be uploaded again. DELETE remains metadata-only;
archiving does not revoke public object access. The gateway must allow 25 MiB plus
multipart overhead (for example `client_max_body_size 26m` on the upload route).

## Seed adoption

This service now owns asset metadata and upload intake. Read
[architecture](docs/architecture.md), [development](docs/development.md), and
[integration guidance](WORKSHOP.md) for storage and deployment details.

Scaffolding saves seed deployment examples in .ngx-workshop/workflows. Run ngx-workshop deploy . to publish and deploy this project. For services, the CLI updates/pushes Nginx and waits for its deployment to succeed before dispatching service deployment. Configure Actions secrets first; see the CLI deployment guide. Contracts publishing and MFE registration remain separate operations.
