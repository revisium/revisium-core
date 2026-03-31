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
| `JWT_SECRET` | - | JWT signing key (required for production) |
| `ADMIN_PASSWORD` | `admin` | Default admin user password (used during seeding) |
| `ENDPOINT_PASSWORD` | `endpoint` | Default endpoint user password (used during seeding) |
| `REVISIUM_NO_AUTH` | `false` | Disable authentication; all requests authorized as admin (standalone only) |

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
| `REVISIUM_LICENSE_KEY` | - | License key for `/ee/` features. If not set, all limits are disabled (unlimited). Validated against `https://licensing.revisium.io` |
| `REVISIUM_BILLING_ENABLED` | `false` | Enable billing/tariffs module (requires valid license with `billing` feature) |
| `REVISIUM_SSO_ENABLED` | `false` | Enable SSO module (requires valid license with `sso` feature) |
| `REVISIUM_AUDIT_ENABLED` | `false` | Enable audit log module (requires valid license with `audit` feature) |
| `REVISIUM_STANDALONE` | `false` | Self-hosted mode. Bypasses all plan limits even if billing module is loaded. Set to `true` for on-premises deployments |
| `EARLY_ACCESS_ENABLED` | `false` | Enable early access program. When `true`, users can activate Pro features for free via "Get Early Access" |
| `EARLY_ACCESS_TRANSITION_DATE` | - | Date (YYYY-MM-DD) when early access ends. On this date, early adopters without payment are downgraded to free |

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
