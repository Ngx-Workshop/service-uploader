# Uploader deployment recovery — 2026-10-04

## Cause and infrastructure changes

Run `37218039948` built successfully and published
`@tmdjr/service-uploader-contracts@0.0.11`, but deployment failed. MongoDB server
logs during the failed rollout recorded `E11000` for
`workshop-viewer.assets.unique_active_checksum`. The rollback removed the failed
container before preserving its application logs.

MongoDB 8.0.17 was already installed directly as the `mongod` systemd service.
No version upgrade was performed. Converted the existing database to authenticated
single-member replica set `rs0`, retaining `/var/lib/mongodb` and the existing
private address `10.116.0.2:27017`. Authentication and the firewall remain enabled.
The member keyfile is `/etc/mongodb-keyfile`, owned by `mongodb`, mode `0400`.

The configuration in `/etc/mongod.conf` now includes:

```yaml
security:
  authorization: enabled
  keyFile: /etc/mongodb-keyfile
replication:
  replSetName: rs0
setParameter:
  disableSplitHorizonIPCheck: true
```

The existing network, storage, and logging configuration was retained. The IP
configuration option is deliberate: current services already use this fixed VPC
address. MongoDB recommends hostnames; move to stable private DNS before changing
addresses or expanding the replica set. This setting does not disable client
authentication or expose MongoDB publicly. A single member supports transactions
but has no failover or redundant data copy.

Reference: [MongoDB 8 server parameters](https://www.mongodb.com/docs/v8.0/reference/parameters/#mongodb-parameter-param.disableSplitHorizonIPCheck).

The operator initialized the replica set from their existing administrator shell:

```javascript
rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "10.116.0.2:27017" }] })
```

The uploader repository's GitHub Actions `MONGODB_URI` secret now explicitly
includes `replicaSet=rs0`, preserving credentials, database, and authentication
source. This is a repository override; organization-level secrets were not changed.
The failed deployment job was rerun successfully without republishing contracts.

## Backup and dummy-data reconciliation

The user explicitly identified all asset records as disposable dummy data and
approved interruption of the shared database. Before changing MongoDB, stopped
`mongod`, archived its entire data directory, and saved the original configuration.
Verified archive integrity and copied the backup to the application droplet.

On both the database and application droplets, the root-only backup directory is:

```text
/var/backups/mongodb-pre-rs0-20261004T171930Z/
  mongodb-data.tar.gz
  mongod.conf
  mongod.conf.rs0
  SHA256SUMS
```

The application-droplet copy passed `sha256sum -c SHA256SUMS`. The archive is a
stopped-database backup, not a live filesystem copy. Treat it as sensitive because
it contains all databases and authentication data. Restoring it would roll back
all database writes since the backup; do not extract it over a running database.

After primary election, one transaction copied three redundant records into
`workshop-viewer.uploader_migration_backup_20261004` and removed them from `assets`:

- `6ac1c58d9835685385964b8b`: older duplicate screen recording.
- `6ac19625678bfac526e4363c`: old pending "Testing" upload.
- `6ac1b9a79835685385964b78`: older successful "Testing 2" upload.

Kept the newer screen recording and "Name Testing" record. Five original assets
remained. No legacy Spaces objects were deleted. Successfully created the partial unique
`unique_active_checksum` index using the application's exact filter.

## Verification

- PASS: `rs0` elected `10.116.0.2:27017` primary.
- PASS: real transaction committed backup insertion and duplicate removal.
- PASS: unique checksum index creation.
- PASS: MongoDB restart after initialization; the uploader reconnected to the
  writable `rs0` primary and confirmed the records and unique index persisted.
- PASS: [deployment rerun](https://github.com/Ngx-Workshop/service-uploader/actions/runs/37218039948/job/111488773898).
- PASS: unauthenticated native `/uploader` and gateway `/api/uploader` and
  `/api/uploader/folders` return 401.
- PASS: deployed service classes against the live database: folder creation,
  assignment, filtering, nonempty deletion rejection with rollback, rename,
  move to root, empty-folder deletion, and asset deletion. Temporary smoke-test
  records were cleaned up. These calls bypass HTTP/auth and do not establish
  authenticated folder-route coverage or concurrency coverage.
- PASS: deployed service classes performed a real Spaces upload into a folder,
  persisted READY, rejected the same content at root with 409, downloaded the
  public object with HTTP 200, and verified exact bytes and SHA-256. The temporary
  metadata, folder, and Spaces object were removed after verification.
- PASS: uploader container restart; guarded HTTP endpoint became ready, and an
  existing asset still downloaded with a matching SHA-256.
- PASS (user-assisted): after reauthentication the user uploaded
  `Screenshot 2026-10-04 at 1.27.30 PM.png` through the browser form. Observed
  "File uploaded and stored", the Stored asset card, and six total assets.
  Independently verified the new record is READY and its public download returns
  HTTP 200 with matching SHA-256 after the uploader restart. The user's new asset
  was preserved. Automated browser file selection was blocked by extension file
  permissions; no permission change was needed for this user-assisted check.
- PASS (user-reported): the user manually retried a duplicate asset and confirmed
  rejection, then successfully uploaded a new asset. No extension-setting change
  is needed for this user-assisted verification.
- Remaining scope: authenticated folder mutations through the browser/gateway
  and deployed concurrency checks. The service-level checks above establish
  transaction/storage behavior, not those HTTP/consumer scenarios.
- Consumer adoption of published folder/move/409 contracts remains separate work.

No application code was changed for this recovery.
