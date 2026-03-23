# File Storage — Technical Specification

This document describes the file storage system of revisium-core: storage providers, file plugin, upload workflow, file serving, configuration, and data validation.

## Motivation & Goals

Revisium is deployed in different environments — cloud with S3-compatible storage, self-hosted on bare metal, local development on a laptop. The file storage system must support all of these without code changes.

**Goals:**

- **Zero-config local development** — files work out of the box without S3 credentials
- **Self-hosted without cloud dependencies** — local filesystem storage as a first-class option
- **Backwards compatibility** — existing S3 deployments continue to work without config changes
- **Extensibility** — adding a new storage backend (GCS, Azure Blob, etc.) requires only implementing one interface

**Non-goals:**

- CDN integration — handled at the infrastructure level, not in application code
- File transformation (resize, crop) — out of scope, files are stored as-is
- Multi-provider (e.g. S3 + local fallback) — one provider per deployment

## Design Decisions

### Hash-Based File Addressing

Files are stored by content hash, not by original filename or UUID.

**Why:** Content-addressable storage enables immutable caching (1-year `Cache-Control`) — the URL changes when the content changes, so cache invalidation is never needed. It also provides natural deduplication: uploading the same file twice doesn't consume extra storage.

**Trade-off:** Deleting a specific file by key is not meaningful — the same hash could be referenced by multiple rows. Garbage collection (removing unreferenced hashes) is not implemented yet.

### DB Commit Before File Storage (Post-Action Pattern)

The upload handler updates the database (row data with hash, metadata) inside a transaction, and writes the file to storage *after* the transaction commits (in the post-action phase).

**Why:** If file upload fails after DB commit, the row references a hash that doesn't exist in storage — but this is recoverable (re-upload). The alternative — uploading first, then committing — risks orphaned files in storage if the transaction rolls back, which is harder to clean up.

**Trade-off:** There is a brief window where the row references a file that isn't in storage yet. In practice this is invisible because the full HTTP request hasn't returned to the client.

### .meta Sidecar for MIME Types (Local Storage)

Local storage writes a `{hash}.meta` file alongside each file containing only the MIME type string.

**Why:** The `GET /files/:key` endpoint is unauthenticated and stateless — it receives only the content hash, with no context about which row or table the file belongs to. While `mimeType` is stored in row data, resolving it would require a database query to find a row referencing that hash. The `.meta` sidecar makes the storage layer fully self-contained: files can be served without the database, moved to nginx, or backed up as a directory.

**Alternative considered:** Storing MIME type in the filename (e.g. `{hash}.jpg`) — rejected because the hash should be the sole identifier, and extension-to-MIME mapping is lossy.

### ACL: public-read (S3)

`PutObjectCommand` includes `ACL: 'public-read'` hardcoded.

**Why:** The project's S3 provider (Selectel) requires explicit ACL for public file serving. This preserves the original behavior from before the storage abstraction was introduced.

**Trade-off:** AWS S3 buckets created after April 2023 default to "Bucket owner enforced" which disables ACLs — this will fail. For AWS, either remove the ACL or use bucket policies. This is documented but not yet configurable via env var.

### File Immutability After Upload

Once a file field reaches `status=uploaded`, only `fileName` can be modified by the user. The `url` field is computed (overwritten by `computeRows` on every read) and excluded from the immutability check, but is not user-editable in practice. All other fields (`hash`, `size`, `mimeType`, etc.) are locked.

**Why:** File metadata is derived from the binary content. Allowing arbitrary edits would break the content-hash invariant and could lead to data corruption (e.g. hash says X but actual file is Y).

### Null Provider Instead of Feature Flag

When storage is not configured, a `NullStorageService` is injected instead of conditionally disabling file features.

**Why:** The Null Object pattern keeps the rest of the codebase free from `if (storageEnabled)` checks. The plugin and handlers always have a valid `IStorageService` — `NullStorageService` simply throws on upload and returns empty URLs on read. This is cleaner than a feature flag and impossible to forget to check.

## Security Model

- **Authentication:** File upload requires JWT token + `update:row` permission on the project
- **File size limit:** 50 MB enforced by `MaxFileSizeValidator` at the controller level
- **System table guard:** Uploads are blocked on system tables (`__schema`, `__migration`, etc.)
- **Path traversal protection:** The `GET /files/:key` endpoint rejects keys containing `..`, `/`, or `\`
- **No directory listing:** The storage controller serves individual files by exact hash only
- **Immutable cache:** `Cache-Control: public, max-age=31536000, immutable` — safe because URLs are content-addressed

## Extensibility

To add a new storage provider (e.g. Google Cloud Storage):

1. Create a class implementing `IStorageService` (4 members: `isAvailable`, `canServeFiles`, `uploadFile`, `getPublicUrl`)
2. Add a new case in `StorageModule` factory (`STORAGE_PROVIDER=gcs`)
3. Add env vars to `.env.example` and `ENV.md`

No changes needed in the file plugin, upload handler, or any other module — they depend only on the `STORAGE_SERVICE` token.

## Storage Architecture

### Provider Abstraction

All storage operations go through the `IStorageService` interface:

```typescript
interface IStorageService {
  readonly isAvailable: boolean;
  readonly canServeFiles: boolean;
  uploadFile(file: Express.Multer.File, path: string): Promise<{ key: string }>;
  getPublicUrl(key: string): string;
}
```

- `isAvailable` — whether the provider is configured and ready
- `canServeFiles` — whether the provider can serve files via built-in HTTP endpoint (only `local`)
- `uploadFile` — stores file binary, returns storage key
- `getPublicUrl` — returns public URL for a given key (content hash)

The provider is selected by `STORAGE_PROVIDER` env variable. Registration happens in `StorageModule` via a factory provider bound to the `STORAGE_SERVICE` injection token.

### Provider Selection Logic

```text
STORAGE_PROVIDER=s3     → S3StorageService
STORAGE_PROVIDER=local  → LocalStorageService
(unset or empty)        → auto-detect:
                           if S3_* env vars present → S3StorageService
                           otherwise               → NullStorageService (files disabled)
(any other value)       → same as empty (falls through to auto-detect)
```

The factory uses a `switch` with explicit `'s3'` and `'local'` cases; everything else (including unset, empty string, or any unrecognized value like `"null"`) falls through to the `default` branch which attempts S3 auto-detection and falls back to `NullStorageService`.

Auto-detection exists for backwards compatibility with deployments that configured S3 before `STORAGE_PROVIDER` was introduced.

### Providers

#### S3StorageService

Stores files in an S3-compatible object storage (AWS S3, Selectel, MinIO, etc.).

- **Upload:** `PutObjectCommand` with `ACL: 'public-read'`, immutable cache headers
- **Public URL:** `{FILE_PLUGIN_PUBLIC_ENDPOINT}/{hash}`
- **File serving:** disabled (`canServeFiles=false`) — clients access S3 directly
- **Required env vars:** `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `FILE_PLUGIN_PUBLIC_ENDPOINT`

Upload parameters:

```text
Key:            {hash}
Body:           file buffer (stream)
ContentType:    file MIME type
ContentLength:  file size in bytes
CacheControl:   public, max-age=31536000, immutable
ACL:            public-read
```

> **Note:** `ACL: 'public-read'` is required by some S3-compatible providers (e.g. Selectel). On AWS S3 buckets with "Bucket owner enforced" (default since April 2023), this will fail — remove the ACL or use bucket policies instead.

#### LocalStorageService

Stores files on the local filesystem. Designed for development and self-hosted deployments.

- **Storage path:** `STORAGE_LOCAL_PATH` (default: `./uploads`)
- **File layout:** `{storagePath}/{hash}` + `{storagePath}/{hash}.meta` (MIME type sidecar)
- **Public URL:** auto-generated as `http://localhost:{PORT}/files/{hash}` (where `PORT` is the application's HTTP port env var, default `8080`) or custom `FILE_PLUGIN_PUBLIC_ENDPOINT`
- **File serving:** enabled (`canServeFiles=true`) — serves via built-in `GET /files/:key` endpoint
- **Directory init:** creates storage directory on startup if it doesn't exist

The `.meta` sidecar file contains only the MIME type string (e.g. `image/jpeg`). This preserves content type across server restarts without a database lookup.

#### NullStorageService

No-op implementation when storage is disabled.

- `isAvailable=false`
- `uploadFile()` throws `"Storage is not configured"` error
- `getPublicUrl()` returns empty string (safe for computeRows when no storage configured)

## File Plugin

### Overview

`FilePlugin` implements `IPluginService` and hooks into the row lifecycle:

| Hook              | When                        | What it does                                       |
|-------------------|-----------------------------|----------------------------------------------------|
| `afterCreateRow`  | New row created             | Assigns `fileId` (nanoid) and `status=ready`       |
| `afterUpdateRow`  | Row data updated            | Validates immutability of uploaded file fields      |
| `computeRows`     | Row data read/returned      | Computes `url` from hash via storage service        |
| `afterMigrateRows`| Schema migration applied    | Assigns `fileId` to new file fields from migration  |

### File Field Schema

Files are declared in JSON Schema using a `$ref`:

```json
{
  "$ref": "urn:jsonschema:io:revisium:file-schema:1.0.0"
}
```

This expands to an object with 10 properties:

| Field      | Type    | Description                                  |
|------------|---------|----------------------------------------------|
| `status`   | string  | `ready` or `uploaded`                        |
| `fileId`   | string  | 21-char nanoid, URL-safe, unique per row     |
| `url`      | string  | Public URL (computed, not stored)             |
| `fileName` | string  | Original filename from upload                |
| `hash`     | string  | Content hash of file binary                  |
| `extension`| string  | File extension (from filename)               |
| `mimeType` | string  | MIME type (from upload metadata)             |
| `size`     | number  | File size in bytes                           |
| `width`    | number  | Image width in pixels (0 for non-images)     |
| `height`   | number  | Image height in pixels (0 for non-images)    |

File fields can appear as single values or array elements. The `forEachFile()` utility traverses row data and schema to find all file fields.

### File State Machine

```text
CREATE ROW          → status=ready, fileId=nanoid(21), all other fields empty
     │
     ▼
UPLOAD FILE         → status=uploaded, hash, size, extension, mimeType, width, height filled
     │
     ▼
COMPUTE ROWS (read) → url computed from hash via storageService.getPublicUrl()
```

After upload, file fields become immutable — only `fileName` and `url` can change. Any attempt to modify `hash`, `size`, `mimeType`, `extension`, `width`, or `height` is rejected.

### Image Processing

For image files, `sharp` extracts dimensions:

```text
sharp(buffer).metadata() → { width, height }
```

Non-image files get `width=0, height=0`.

## Upload Workflow

### REST Endpoint

```text
POST /revision/{revisionId}/tables/{tableId}/rows/{rowId}/upload/{fileId}
Content-Type: multipart/form-data
Authorization: Bearer {token}

Form field: "file" (binary)
```

- **Max file size:** 50 MB (`MaxFileSizeValidator`)
- **Auth:** JWT + project permission check (`update:row`)
- **Guard:** revision must be a draft

### End-to-End Flow

```text
1. REST Controller (RowByIdController.uploadFile)
   │  FileInterceptor('file') extracts multipart upload
   ▼
2. DraftApiService.apiUploadFile()
   │  Creates ApiUploadFileCommand → CommandBus
   ▼
3. ApiUploadFileHandler
   │  Wraps in serializable transaction
   │  Dispatches UploadFileCommand
   ▼
4. UploadFileHandler (handler phase — inside transaction)
   │  a. Validates: draft revision exists, table is not system table
   │  b. Fetches current row data + schema
   │  c. FilePlugin.uploadFile():
   │     - Finds FileValueStore by fileId
   │     - Computes content hash via `object-hash` library (deterministic within same Node.js version)
   │     - Extracts extension, mimeType
   │     - sharp(buffer).metadata() for images → width, height
   │     - Sets status = uploaded
   │  d. Validates updated row data
   │  e. InternalUpdateRowCommand → updates row in DB
   │  f. FilePlugin.computeRows() → generates url from hash
   │  Returns: { path: hash, rowVersionId, previousRowVersionId }
   ▼
5. UploadFileHandler (post-action phase — after transaction commit)
   │  storageService.uploadFile(file, hash)
   │  - S3: PutObjectCommand to bucket
   │  - Local: write to disk + .meta sidecar
   ▼
6. ApiUploadFileHandler
   │  Notifies endpoints (table change event)
   │  Queries final table + row state
   ▼
7. REST Response
   {
     table: { ... },
     row: { ... },            // includes computed url
     previousVersionTableId,
     previousVersionRowId
   }
```

> **Important:** Database update happens BEFORE file storage (post-action). This means the row references a hash that may not yet exist in storage. The design relies on the fact that file URLs are only meaningful after the full request completes.

## File Serving

### Local Storage Endpoint

```text
GET /files/{hash}
```

Only active when `LocalStorageService` is the provider (`canServeFiles=true`).

**Security:**
- Path traversal protection: rejects keys containing `..`, `/`, or `\`
- Returns 404 if file not found

**Response headers:**
```text
Content-Type:   {from .meta file or application/octet-stream}
Content-Length:  {file size}
Cache-Control:  public, max-age=31536000, immutable
```

The 1-year immutable cache is safe because files are addressed by content hash — the URL changes when file content changes.

### S3 File Access

Files stored in S3 are accessed directly via the S3 public URL. The `url` field in file data points to `{FILE_PLUGIN_PUBLIC_ENDPOINT}/{hash}`.

## Configuration Reference

### Environment Variables

| Variable                     | Required      | Default      | Description                                              |
|------------------------------|---------------|--------------|----------------------------------------------------------|
| `STORAGE_PROVIDER`           | No            | (auto-detect)| Storage backend: `s3`, `local`, or empty                 |
| `FILE_PLUGIN_PUBLIC_ENDPOINT`| For S3        | Auto (local) | Public URL prefix for file access                        |
| `STORAGE_LOCAL_PATH`         | No            | `./uploads`  | Filesystem path for local storage                        |
| `S3_ENDPOINT`                | For S3        | —            | S3 endpoint URL                                          |
| `S3_REGION`                  | For S3        | —            | S3 region                                                |
| `S3_BUCKET`                  | For S3        | —            | S3 bucket name                                           |
| `S3_ACCESS_KEY_ID`           | For S3        | —            | S3 access key                                            |
| `S3_SECRET_ACCESS_KEY`       | For S3        | —            | S3 secret key                                            |

### Configuration Examples

**Local development:**
```bash
STORAGE_PROVIDER=local
# STORAGE_LOCAL_PATH=./uploads  (default)
# FILE_PLUGIN_PUBLIC_ENDPOINT auto-generates to http://localhost:{PORT}/files
```

**S3 production:**
```bash
STORAGE_PROVIDER=s3
S3_ENDPOINT=https://s3.storage.selcloud.ru
S3_REGION=ru-1
S3_BUCKET=revisium-files
S3_ACCESS_KEY_ID=xxx
S3_SECRET_ACCESS_KEY=xxx
FILE_PLUGIN_PUBLIC_ENDPOINT=https://cdn.example.com/files
```

**Files disabled:**
```bash
# Leave STORAGE_PROVIDER empty and unset all S3_* vars
```

## Data Validation

### Upload Validation

- File size: max 50 MB
- Row must exist in a draft revision
- Table must not be a system table
- `fileId` must match an existing file field in the row with `status=ready`

### Restore Validation

When restoring row data (backup/rollback), `validate-file-data-for-restore` enforces:

| Field      | Rules                                                              |
|------------|--------------------------------------------------------------------|
| `fileId`   | Required, exactly 21 URL-safe chars (nanoid format)                |
| `status`   | Must be valid FileStatus enum value                                |
| `hash`     | If present, must match hash format                                 |
| `size`     | Non-negative integer                                               |
| `width`    | Non-negative, max 50000                                            |
| `height`   | Non-negative, max 50000                                            |
| `mimeType` | RFC 2046 compliant, max 100 chars                                  |
| `fileName` | Max 255 chars, no control chars, no filesystem-unsafe chars        |
| `url`      | Max 2048 chars, valid URL format (or empty)                        |
| `extension`| 1-10 alphanumeric chars                                            |

**Consistency checks:**
- If `status=uploaded`: `hash`, `size`, `mimeType` are required
- If image MIME type + `status=uploaded`: `width` and `height` must be > 0
- Non-images: `width=height=0`
- All `fileId` values must be unique across the row

### Immutability After Upload

Once a file has `status=uploaded`, only `fileName` can be meaningfully modified by the user. The `url` field is computed (overwritten by `computeRows` on every read), so it is excluded from the immutability check but not user-editable in practice. All other fields (`hash`, `size`, `mimeType`, `extension`, `width`, `height`, `status`, `fileId`) are locked — any attempt to change them is rejected.

## Module Registration

```text
CoreModule
  └── PluginModule
  │     └── imports StorageModule
  │     └── provides FilePlugin (uses STORAGE_SERVICE token)
  └── DraftModule
        └── imports StorageModule
        └── provides UploadFileHandler (uses STORAGE_SERVICE token)
```

`StorageModule` is a global NestJS module — imported once, available everywhere via the `STORAGE_SERVICE` injection token.

## Key Source Files

| File                                                          | Purpose                           |
|---------------------------------------------------------------|-----------------------------------|
| `src/infrastructure/storage/storage.interface.ts`             | IStorageService interface          |
| `src/infrastructure/storage/storage.module.ts`                | Provider factory and DI setup      |
| `src/infrastructure/storage/storage.controller.ts`            | GET /files/:key endpoint           |
| `src/infrastructure/storage/s3-storage.service.ts`            | S3 provider implementation         |
| `src/infrastructure/storage/local-storage.service.ts`         | Local filesystem provider          |
| `src/infrastructure/storage/null-storage.service.ts`          | No-op provider                     |
| `src/features/plugin/file/file.plugin.ts`                     | File lifecycle plugin              |
| `src/features/plugin/file/file-value.store.ts`                | Typed access to file fields        |
| `src/features/plugin/file/utils/fore-each-file.ts`            | File field traversal utility       |
| `src/features/plugin/file/utils/validate-file-data-for-restore.ts` | Restore validation rules     |
| `src/features/draft/commands/handlers/upload-file.handler.ts` | Upload command handler             |
