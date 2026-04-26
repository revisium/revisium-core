# Environment Variables

This document describes all environment variables for **revisium-core**.

## Quick Start

```bash
cp .env.example .env
# Edit .env with your configuration
```

---

## Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (e.g., `postgresql://user:pass@host:5432/db?schema=public`) |

---

## Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP server port |
| `BODY_LIMIT` | `10mb` | Maximum request body size |
| `PUBLIC_URL` | `http://localhost:8080` | Public base URL (used for OAuth discovery endpoints and MCP `WWW-Authenticate` header) |

---

## Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | nanoid at boot (dev only) | JWT signing key. **Required** and must be shared across all pods in multi-pod / multi-replica deployments, otherwise pods reject tokens signed by their peers |
| `JWT_ACCESS_TOKEN_TTL` | `30m` | Access-token lifetime (`ms` duration string, e.g. `30m`, `1h`). The `rev_at` JWT cookie inherits this expiry |
| `JWT_REFRESH_TOKEN_TTL_DAYS` | `7` | Refresh-token lifetime in days. The `rev_rt` and `rev_session` cookies inherit this expiry |
| `JWT_REFRESH_GRACE_PERIOD_MS` | `30000` | Window for legitimate rotation retries before refresh-token reuse is treated as theft and the entire family is revoked |
| `ADMIN_PASSWORD` | `admin` | Default admin user password (used during seeding) |
| `ENDPOINT_PASSWORD` | `endpoint` | Default endpoint user password (used during seeding) |
| `REVISIUM_NO_AUTH` | `false` | Disable authentication; all requests authorized as admin (standalone only). Login handlers return JSON `accessToken` only — no cookies, no refresh token |

### Cookie & CORS (JWT 2.0 session model)

Revisium-admin talks to core over httpOnly cookies (`rev_at`, `rev_rt`) plus a non-httpOnly presence cookie (`rev_session`) that lets the SPA detect "session likely alive" without a speculative `/me` call. See [`docs/jwt-refresh.md`](./docs/jwt-refresh.md) for the full deployment matrix. ADR-0045 in the architecture repo (not co-located with `revisium-core`) has the design rationale.

| Variable | Default | Description |
|----------|---------|-------------|
| `COOKIE_SECURE` | `NODE_ENV === 'production'` | `true` / `false` override for the cookie `Secure` flag. Set to `true` on any HTTPS deployment. Required to be `true` when `COOKIE_SAMESITE=none` |
| `COOKIE_SAMESITE` | `lax` | `lax` / `strict` / `none`. `none` is rejected at boot unless `COOKIE_SECURE=true` (browsers drop `SameSite=None` cookies without `Secure`). Use `strict` on cloud for slightly tighter cross-site posture; `none` is only for cross-site embeds Revisium does not ship by default |
| `CORS_ORIGIN` | *(reflect request origin)* | Comma-separated allowlist of origins that may call core with credentials. Set explicitly on cloud (e.g. `https://cloud.revisium.io,https://cloud.revisium.ru`). Leaving unset reflects the request `Origin` header, which is permissive but functional in dev |
| `TRUST_PROXY` | *(unset → off)* | Pass-through to Express `app.set('trust proxy', …)`. Accepts `true`, `false`, integer hop count (`1`, `2`), or an IP/CIDR list. **Required** whenever revisium-core runs behind one or more reverse proxies, so `req.ip` and `req.protocol` resolve to the real client instead of the nearest proxy. Reference values: `1` for selfhost monolith (single nginx in front), `2` for cloud k8s (ingress-nginx → admin-pod nginx → core). Without this, `RefreshToken.ip` audit metadata stores the proxy IP, not the browser's |

---

## OAuth

| Variable | Default | Description |
|----------|---------|-------------|
| `OAUTH_GOOGLE_CLIENT_ID` | - | Google OAuth client ID |
| `OAUTH_GOOGLE_CLIENT_SECRET` | - | Google OAuth client secret |
| `OAUTH_GITHUB_CLIENT_ID` | - | GitHub OAuth client ID |
| `OAUTH_GITHUB_CLIENT_SECRET` | - | GitHub OAuth client secret |
| `MCP_ACCESS_TOKEN_EXPIRY_DAYS` | `30` | Access token TTL (in days) when `scope=mcp` is used |

---

## File Storage

| Variable | Default | Description |
|----------|---------|-------------|
| `STORAGE_PROVIDER` | - | Storage backend: `s3`, `local`, or empty (disabled). If not set, auto-detects S3 from `S3_*` vars for backwards compatibility |
| `FILE_PLUGIN_PUBLIC_ENDPOINT` | - | Public URL prefix for file access. Required for `s3`. Auto-generated for `local` (`http://localhost:{PORT}/files`) |

### S3 (`STORAGE_PROVIDER=s3`)

| Variable | Default | Description |
|----------|---------|-------------|
| `S3_ENDPOINT` | - | S3-compatible storage endpoint URL |
| `S3_REGION` | - | S3 region |
| `S3_BUCKET` | - | S3 bucket name |
| `S3_ACCESS_KEY_ID` | - | S3 access key |
| `S3_SECRET_ACCESS_KEY` | - | S3 secret key |

### Local filesystem (`STORAGE_PROVIDER=local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `STORAGE_LOCAL_PATH` | `./uploads` | Directory for file storage |

---

## Email

| Variable | Default | Description |
|----------|---------|-------------|
| `EMAIL_TRANSPORT` | - | SMTP transport string (nodemailer format) |
| `EMAIL_PUBLIC_URL` | - | Public URL for email confirmation links |
| `EMAIL_FROM` | - | Sender email address |
| `REVISIUM_TEMPLATES_DIR` | `__dirname/templates` | Override path to email templates directory (used in standalone/bundled builds) |

---

## Cache

| Variable | Default | Description |
|----------|---------|-------------|
| `CACHE_ENABLED` | `false` | Enable BentoCache caching system |
| `CACHE_L1_MAX_SIZE` | - | L1 memory cache max size (e.g., `128mb`) |
| `CACHE_L2_REDIS_URL` | - | Redis URL for L2 cache layer |
| `CACHE_BUS_HOST` | - | Redis host for cache bus (required if L2 enabled) |
| `CACHE_BUS_PORT` | - | Redis port for cache bus (required if L2 enabled) |
| `CACHE_DEBUG` | `false` | Enable cache debug logging |

---

## Transaction Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `TRANSACTION_MAX_WAIT` | `10000` | Connection pool wait time (ms) |
| `TRANSACTION_TIMEOUT` | `15000` | Transaction timeout (ms) |
| `TRANSACTION_MAX_RETRIES` | `20` | Max retry attempts for serialization conflicts |
| `TRANSACTION_BASE_DELAY_MS` | `30` | Initial retry delay (ms) |
| `TRANSACTION_MAX_DELAY_MS` | `1500` | Max retry delay with exponential backoff (ms) |

---

## API Key Limits

| Variable | Default | Description |
|----------|---------|-------------|
| `API_KEY_MAX_PER_USER` | `10` | Maximum number of personal API keys per user |
| `API_KEY_MAX_SERVICE_PER_ORG` | `100` | Maximum number of service API keys per organization |

---

## Internal API Keys (Microservice Mode Only)

In monolith/standalone mode, internal keys are derived automatically from `JWT_SECRET`. These env vars are ignored (a warning is logged if set). For multi-replica monolith deployments, ensure `JWT_SECRET` is explicitly set.

| Variable | Default | Description |
|----------|---------|-------------|
| `INTERNAL_API_KEY_ENDPOINT` | - | Internal API key for `endpoint` service. Must match the value set in revisium-endpoint |
| `INTERNAL_API_KEY_{SERVICE}` | - | Internal API key for additional services (e.g., `INTERNAL_API_KEY_WORKER`). Service name derived from suffix (lowercased) |

---

## Endpoint Service

| Variable | Default | Description |
|----------|---------|-------------|
| `ENDPOINT_HOST` | `localhost` | Redis host for endpoint microservice communication |
| `ENDPOINT_PORT` | `6380` | Redis port for endpoint microservice communication |

---

## Metrics & Monitoring

| Variable | Default | Description |
|----------|---------|-------------|
| `METRICS_ENABLED` | `false` | Enable Prometheus metrics endpoint |
| `GRACEFUL_SHUTDOWN_TIMEOUT` | `10000` | Delay before shutdown (ms) for graceful termination |

---

## Enterprise / Licensing

| Variable | Default | Description |
|----------|---------|-------------|
| `REVISIUM_LICENSE_KEY` | - | License key for `/ee/` features. If not set, licensed enterprise features are disabled. Validated against `https://licensing.revisium.io` |
| `REVISIUM_STANDALONE` | `false` | Self-hosted mode. Disables `.env` file loading (for Docker deployments where env vars come from the container runtime) |

---

## Payment Service (Billing)

Billing is enabled automatically when `PAYMENT_SERVICE_URL` is set. When not set, billing GraphQL queries return disabled/empty defaults and mutations return "Billing is not enabled".

| Variable | Default | Description |
|----------|---------|-------------|
| `PAYMENT_SERVICE_URL` | - | Payment service base URL (e.g. `http://payment:8082`). Core sends HMAC-signed requests to this URL for limits, plans, subscriptions, checkout, and usage reporting |
| `PAYMENT_SERVICE_SECRET` | - | Shared HMAC secret for service-to-service auth. Must match `CORE_CALLBACK_SECRET` on the payment service side. Used for both outgoing requests (core → payment) and incoming callbacks (payment → core). In practice this should be set whenever billing is enabled. |

---

## Deprecated Variables

The following variables are deprecated and will be removed in **v3.0.0**:

| Deprecated | Replacement | Notes |
|------------|-------------|-------|
| `EXPERIMENTAL_CACHE` | `CACHE_ENABLED` | |
| `EXPERIMENTAL_CACHE_L1_MAX_SIZE` | `CACHE_L1_MAX_SIZE` | |
| `EXPERIMENTAL_CACHE_L2_REDIS_URL` | `CACHE_L2_REDIS_URL` | |
| `EXPERIMENTAL_CACHE_REDIS_BUS_HOST` | `CACHE_BUS_HOST` | |
| `EXPERIMENTAL_CACHE_REDIS_BUS_PORT` | `CACHE_BUS_PORT` | |
| `EXPERIMENTAL_CACHE_DEBUG` | `CACHE_DEBUG` | |
| `OAUTH_GOOGLE_SECRET_ID` | `OAUTH_GOOGLE_CLIENT_SECRET` | Renamed for consistency |
| `OAUTH_GITHUB_SECRET_ID` | `OAUTH_GITHUB_CLIENT_SECRET` | Renamed for consistency |

Using deprecated variables will log a warning:
```
DEPRECATED: EXPERIMENTAL_CACHE is deprecated and will be removed in v3.0.0. Please use CACHE_ENABLED instead.
```
