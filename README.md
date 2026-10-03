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
All uploader endpoints use `RemoteAuthGuard`. `POST /uploader/upload` accepts one
multipart `file` up to 25 MiB, fingerprints it, and records
`PENDING_STORAGE`; it does not persist the binary yet. Choose durable storage and
the transfer mechanism to the Nginx/static-file host before promising asset URLs.

## Seed adoption

This service now owns asset metadata and upload intake. Read
[architecture](docs/architecture.md), [development](docs/development.md), and
[integration guidance](WORKSHOP.md) before extending the pending-storage flow.

Scaffolding saves seed deployment examples in .ngx-workshop/workflows. Run ngx-workshop deploy . to publish and deploy this project. For services, the CLI updates/pushes Nginx and waits for its deployment to succeed before dispatching service deployment. Configure Actions secrets first; see the CLI deployment guide. Contracts publishing and MFE registration remain separate operations.
