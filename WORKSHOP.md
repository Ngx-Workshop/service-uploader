# service-uploader integration checklist

Native API: /uploader; browser API: /api/uploader.
Default port: 3010. Confirm this port is available on your service host.
Contracts: @tmdjr/service-uploader-contracts; directory: contracts/service-uploader.
The gateway snippet below strips /api and preserves /uploader. Replace the example host with your actual private service host.
MongoDB and auth are external prerequisites. Compose requires the external ngx-net network.
All uploader routes require `RemoteAuthGuard`. The upload endpoint records a
SHA-256 fingerprint and `PENDING_STORAGE` metadata but intentionally discards the
request buffer. The gateway/static-file owner must not advertise an asset URL
until durable storage and cross-server transfer are implemented.

Scaffolding saves seed deployment examples in .ngx-workshop/workflows. Run ngx-workshop deploy . to publish and deploy this project. For services, the CLI updates/pushes Nginx and waits for its deployment to succeed before dispatching service deployment. Configure Actions secrets first; see the CLI deployment guide. Contracts publishing and MFE registration remain separate operations.

The architecture and development docs describe the implemented local API and the
remaining storage integration boundary. Existing source-baseline commits may
still refer to the seed.
