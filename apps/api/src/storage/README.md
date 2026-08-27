# Object storage

Uploaded course assets (video, documents, resources — Task 12) are stored
behind `StoragePort`, never through a vendor SDK called directly from domain
code. `ContentItemsService` depends only on this interface.

- **`S3StorageProvider`** (production): presigned PUT/GET URLs against any
  S3-compatible endpoint (AWS S3, MinIO, Cloudflare R2, ...). The client
  uploads/downloads the bytes directly; this API never proxies them.
- **`LocalDiskStorageProvider`** (dev only): writes to `STORAGE_LOCAL_DIR` on
  local disk. Its "upload URL" is this API's own `PUT /uploads/objects/:key`
  endpoint, and the body is base64-encoded JSON rather than a raw streamed
  PUT (`ponytail`: fine for small dev assets, wrong for production — the
  upgrade path is switching `STORAGE_PROVIDER=s3`, not changing this
  interface).

Select the provider with `STORAGE_PROVIDER=local|s3` (default `local`).
Setting `s3` requires `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`,
`S3_SECRET_ACCESS_KEY` (and optionally `S3_ENDPOINT` for a non-AWS
provider) — the app refuses to boot without them (`validateEnv`).

Both providers are always instantiated (the module picks one via a
factory), so neither may require its own config at construction time —
`S3StorageProvider` resolves its client and bucket lazily, on first actual
call, precisely so selecting `local` never requires S3 credentials to be
present.
