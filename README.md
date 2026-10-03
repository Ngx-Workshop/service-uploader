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
The inherited example CRUD endpoints remain unguarded; only auth-test uses RemoteAuthGuard. Choose access policy and adapt example DTOs/schema/tests before production use.

## Seed adoption

This is a starting scaffold with inherited example code. Read [seed adoption](docs/seed-adoption.md), [development limitations](docs/development.md), and [integration guidance](WORKSHOP.md). Replace example behavior with your product, adapt tests, and regenerate contracts as needed.

Scaffolding saves seed deployment examples in .ngx-workshop/workflows. Run ngx-workshop deploy . to publish and deploy this project. For services, the CLI updates/pushes Nginx and waits for its deployment to succeed before dispatching service deployment. Configure Actions secrets first; see the CLI deployment guide. Contracts publishing and MFE registration remain separate operations.
