# OAuth 2.1 & MCP Authentication

Revisium implements an OAuth 2.1 Authorization Code flow with PKCE to authenticate MCP clients (Claude Code, Cursor, etc.) and a stateless MCP transport that accepts Bearer tokens on every request.

## Architecture Overview

```text
  MCP Client             revisium-core           revisium-admin
  (Claude Code)           (API :8080)              (UI :5173)
       |                       |                        |
       |  1. POST /mcp         |                        |
       |    (no token)         |                        |
       |---------------------->|                        |
       |  401 + WWW-Authenticate                        |
       |<----------------------|                        |
       |                       |                        |
       |  2. GET /.well-known/oauth-protected-resource  |
       |---------------------->|                        |
       |  { authorization_servers }                     |
       |<----------------------|                        |
       |                       |                        |
       |  3. GET /.well-known/oauth-authorization-server|
       |---------------------->|                        |
       |  { endpoints, PKCE }  |                        |
       |<----------------------|                        |
       |                       |                        |
       |  4. POST /oauth/register                       |
       |---------------------->|                        |
       |  { client_id, secret }|                        |
       |<----------------------|                        |
       |                       |                        |
       |  5. Open browser -----|----------------------->|
       |     GET /oauth/authorize?client_id=...         |
       |                       |                        |
       |                       |  302 /authorize?...|
       |                       |----------------------->|
       |                       |                        |
       |                       |    6. User clicks      |
       |                       |       "Authorize"      |
       |                       |                        |
       |                       |  POST /oauth/authorize |
       |                       |  Bearer JWT            |
       |                       |<-----------------------|
       |                       |  { redirect_uri }      |
       |                       |----------------------->|
       |                       |                        |
       |  7. Callback with code|                        |
       |<-----------------------------------------------|
       |     ?code=auth_xxx&state=yyy                   |
       |                       |                        |
       |  8. POST /oauth/token |                        |
       |     grant_type=authorization_code              |
       |     code_verifier=... |                        |
       |---------------------->|                        |
       |  { access_token: oat_..., refresh_token: ort_...}
       |<----------------------|                        |
       |                       |                        |
       |  9. POST /mcp         |                        |
       |     Bearer oat_...    |                        |
       |---------------------->|                        |
       |  { tools/list result }|                        |
       |<----------------------|                        |
```

## Endpoints

### Discovery (RFC 8414)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/.well-known/oauth-authorization-server` | OAuth server metadata |
| GET | `/.well-known/oauth-protected-resource` | Resource server metadata |

**Authorization Server Metadata:**
```json
{
  "issuer": "https://revisium.example.com",
  "authorization_endpoint": "https://revisium.example.com/oauth/authorize",
  "token_endpoint": "https://revisium.example.com/oauth/token",
  "registration_endpoint": "https://revisium.example.com/oauth/register",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"],
  "token_endpoint_auth_methods_supported": ["client_secret_post"],
  "revocation_endpoint": "https://revisium.example.com/oauth/revoke",
  "revocation_endpoint_auth_methods_supported": ["client_secret_post"],
  "scopes_supported": ["mcp"]
}
```

**Protected Resource Metadata:**
```json
{
  "resource": "https://revisium.example.com",
  "authorization_servers": ["https://revisium.example.com"],
  "bearer_methods_supported": ["header"],
  "scopes_supported": ["mcp"]
}
```

### Client Registration

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/oauth/register` | None | Dynamic Client Registration (RFC 7591) |

**Request:**
```json
{
  "client_name": "Claude Code",
  "redirect_uris": ["http://127.0.0.1:3000/callback"],
  "grant_types": ["authorization_code", "refresh_token"]
}
```

**Response:**
```json
{
  "client_id": "abc123",
  "client_secret": "ocs_<72 hex chars>",
  "client_name": "Claude Code",
  "redirect_uris": ["http://127.0.0.1:3000/callback"],
  "grant_types": ["authorization_code", "refresh_token"]
}
```

The `client_secret` is returned **once** and stored as a SHA-256 hash in the database. It cannot be retrieved later.

All `redirect_uris` must use `http:` or `https:` scheme. Other schemes (`javascript:`, `data:`, etc.) are rejected. `http:` is only allowed for `localhost`, `127.0.0.1`, and `[::1]` (IPv6 loopback).

### Authorization

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/oauth/authorize` | None | Validate params and redirect to Admin UI |
| POST | `/oauth/authorize` | Bearer JWT | Create auth code (called by Admin UI) |

**GET /oauth/authorize** query parameters:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `client_id` | Yes | Registered client ID |
| `redirect_uri` | Yes | Must match registered URI |
| `code_challenge` | Yes | PKCE challenge (`base64url(sha256(verifier))`) |
| `state` | Yes | Opaque value for CSRF protection |
| `response_type` | Yes | Must be `code` |
| `code_challenge_method` | Yes | Must be `S256` |
| `scope` | No | Space-separated scopes (e.g. `mcp`) |

Validates all parameters, then redirects `302` to Admin UI:
```text
/authorize?client_id=...&client_name=...&redirect_uri=...&code_challenge=...&state=...&scope=mcp
```

**POST /oauth/authorize** (called by Admin UI after user clicks "Authorize"):

```http
POST /oauth/authorize
Authorization: Bearer <user-jwt>
Content-Type: application/json

{
  "client_id": "abc123",
  "redirect_uri": "http://127.0.0.1:3000/callback",
  "code_challenge": "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  "state": "xyz789",
  "scope": "mcp"
}
```

The `scope` field is optional. When present, it is stored with the authorization code and propagated to the access token on exchange.

Response:
```json
{
  "redirect_uri": "http://127.0.0.1:3000/callback?code=auth_<48 hex chars>&state=xyz789"
}
```

### Token Revocation (RFC 7009)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/oauth/revoke` | `client_secret_post` | Revoke an access or refresh token |

```http
POST /oauth/revoke
Content-Type: application/json

{
  "token": "oat_<72 hex chars>",
  "token_type_hint": "access_token",
  "client_id": "abc123",
  "client_secret": "ocs_<72 hex chars>"
}
```

**Behavior:**
- Always returns `200 OK`, even for invalid or already-revoked tokens (per RFC 7009)
- `token_type_hint` is optional; the server uses token prefix (`oat_`/`ort_`) as a fallback hint
- Revoking a **refresh token** cascades: all access tokens for the same client+user pair are also revoked
- Revoking an **access token** does not revoke the associated refresh token
- Client authentication (`client_id` + `client_secret`) is required

MCP clients discover this endpoint via `revocation_endpoint` in the authorization server metadata.

### Token Exchange

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/oauth/token` | None | Exchange code or refresh token for tokens |

**Authorization Code Grant:**
```http
POST /oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "auth_<48 hex chars>",
  "client_id": "abc123",
  "client_secret": "ocs_<72 hex chars>",
  "code_verifier": "<43-128 chars>",
  "redirect_uri": "http://127.0.0.1:3000/callback"
}
```

**Refresh Token Grant:**
```http
POST /oauth/token
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "refresh_token": "ort_<72 hex chars>",
  "client_id": "abc123",
  "client_secret": "ocs_<72 hex chars>"
}
```

**Token Response (both grants):**
```json
{
  "access_token": "oat_<72 hex chars>",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "ort_<72 hex chars>"
}
```

### MCP

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/mcp` | Bearer | Stateless MCP request |
| GET | `/mcp` | - | Returns 405 (SSE not supported) |
| DELETE | `/mcp` | - | Returns 405 (sessions not supported) |

```http
POST /mcp
Authorization: Bearer oat_xxx
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

On `401`, the response includes a `WWW-Authenticate` header pointing to the resource metadata with the `mcp` scope:
```text
WWW-Authenticate: Bearer resource_metadata="https://revisium.example.com/.well-known/oauth-protected-resource", scope="mcp"
```

The `scope="mcp"` parameter tells MCP clients to include this scope in the authorization request, resulting in long-lived tokens. This triggers the MCP SDK's automatic OAuth discovery flow.

## Token Types

| Type | Prefix | Length | TTL | Storage |
|------|--------|--------|-----|---------|
| Client Secret | `ocs_` | 72 hex chars | Permanent | SHA-256 hash |
| Authorization Code | `auth_` | 48 hex chars | 10 minutes | Plain text (single-use) |
| Access Token | `oat_` | 72 hex chars | 1 hour (default) / 30 days (`scope=mcp`) | SHA-256 hash |
| Refresh Token | `ort_` | 72 hex chars | 30 days (default) / 90 days (`scope=mcp`) | SHA-256 hash |

All tokens are generated with `crypto.randomBytes()`. Client secrets and tokens are stored as SHA-256 hashes; only the authorization code is stored in plain text (it's single-use and short-lived).

The MCP access token TTL can be overridden via `MCP_ACCESS_TOKEN_EXPIRY_DAYS` environment variable (default: 30).

## Scopes

Revisium supports the `mcp` OAuth scope. When an MCP client (Claude Code, Cursor, etc.) connects, the server includes `scope="mcp"` in the `WWW-Authenticate` header on `401` responses. MCP clients pass this scope through the authorization flow, which results in longer-lived tokens:

| Scope | Access Token TTL | Refresh Token TTL |
|-------|-----------------|-------------------|
| (none) | 1 hour | 30 days |
| `mcp` | 30 days (configurable via `MCP_ACCESS_TOKEN_EXPIRY_DAYS`) | 90 days |

The scope is stored on both the authorization code and the access token. On token refresh, the scope is inherited from the previous access token.

**Why longer TTL for MCP?** MCP clients (particularly Claude Code) do not currently implement refresh token rotation. With a 1-hour TTL, users would need to re-authorize via the browser every hour. Since Revisium uses opaque tokens (`oat_`) with instant revocation (DB lookup on every request), a longer TTL is safe — compromised tokens can be revoked immediately via `POST /oauth/revoke`.

## PKCE (S256)

All authorization requests require Proof Key for Code Exchange:

```text
Client generates:
  code_verifier  = random(43-128 URL-safe chars)
  code_challenge = base64url(sha256(code_verifier))

Authorization request:
  GET /oauth/authorize?code_challenge=<challenge>&...

Token exchange:
  POST /oauth/token { code_verifier: "<verifier>", ... }

Server verifies:
  base64url(sha256(code_verifier)) === stored_code_challenge
```

Only `S256` method is supported. Plain PKCE is rejected. Hash comparison uses `timingSafeEqual`.

## MCP Bearer Auth Detection

The `/mcp` endpoint accepts two types of Bearer tokens:

```text
Authorization: Bearer <token>
                        |
                        +-- 3 dots (xxx.yyy.zzz) --> JWT validation
                        |   Verify with JWT_SECRET
                        |   Extract: sub, username, email, roleId
                        |
                        +-- starts with "oat_"    --> OAuth token validation
                        |   SHA-256 hash lookup in oauth_access_tokens
                        |   Check: expiry, revocation
                        |   Join user table for: username, email, roleId
                        |
                        +-- otherwise --> 401 Unrecognized token format
```

**NO_AUTH mode** (`REVISIUM_NO_AUTH=true`): All requests are treated as the admin user. No Bearer header required.

## Database Schema

**Migration:** [`20260222064046_add_oauth_models`](../prisma/migrations/20260222064046_add_oauth_models/)

### Prisma Models

```prisma
model OAuthClient {
  id               String   @id @default(nanoid())
  clientSecretHash String
  clientName       String   @db.VarChar(255)
  redirectUris     String[]
  grantTypes       String[] @default(["authorization_code", "refresh_token"])
  createdAt        DateTime @default(now())

  authorizationCodes OAuthAuthorizationCode[]
  accessTokens       OAuthAccessToken[]
  refreshTokens      OAuthRefreshToken[]

  @@map("oauth_clients")
}

model OAuthAuthorizationCode {
  id            String    @id @default(nanoid())
  code          String    @unique
  clientId      String
  client        OAuthClient @relation(fields: [clientId], references: [id], onDelete: Cascade)
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  redirectUri   String
  codeChallenge String
  scope         String?
  expiresAt     DateTime
  usedAt        DateTime?
  createdAt     DateTime  @default(now())

  @@index([expiresAt])
  @@map("oauth_authorization_codes")
}

model OAuthAccessToken {
  id        String    @id @default(nanoid())
  tokenHash String    @unique
  clientId  String
  client    OAuthClient @relation(fields: [clientId], references: [id], onDelete: Cascade)
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  scope     String?
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())

  @@index([expiresAt])
  @@map("oauth_access_tokens")
}

model OAuthRefreshToken {
  id         String    @id @default(nanoid())
  tokenHash  String    @unique
  clientId   String
  client     OAuthClient @relation(fields: [clientId], references: [id], onDelete: Cascade)
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt  DateTime
  lastUsedAt DateTime  @default(now())
  revokedAt  DateTime?
  createdAt  DateTime  @default(now())

  @@index([expiresAt])
  @@map("oauth_refresh_tokens")
}
```

All models cascade on delete from both `OAuthClient` and `User`. The `User` model also has reverse relations: `oauthAuthorizationCodes`, `oauthAccessTokens`, `oauthRefreshTokens`.

### Entity Relationship Diagram

```text
+---------------------------+
| oauth_clients             |
+---------------------------+
| id (PK, nanoid)           |
| clientSecretHash           |---- SHA-256(ocs_xxx)
| clientName                |
| redirectUris[]            |
| grantTypes[]              |
| createdAt                 |
+-------------+-------------+
              |
              | 1:N
              |
+-------------v-------------+     +---------------------------+
| oauth_authorization_codes |     | users                     |
+---------------------------+     +---------------------------+
| id (PK)                   |     | id (PK)                   |
| code (UNIQUE)             |     | username                  |
| clientId (FK) ------------|     | email                     |
| userId (FK) --------------|---->| roleId                    |
| redirectUri               |     +---------------------------+
| codeChallenge             |                  ^
| scope (nullable)          |                  |
| expiresAt                 |                  |
| usedAt (nullable)         |                  |
| createdAt                 |                  |
+---------------------------+                  |
                                               |
+---------------------------+                  |
| oauth_access_tokens       |                  |
+---------------------------+                  |
| id (PK)                   |                  |
| tokenHash (UNIQUE)        |---- SHA-256(oat_xxx)
| clientId (FK)             |                  |
| userId (FK) --------------|------------------+
| scope (nullable)          |                  |
| expiresAt                 |                  |
| revokedAt (nullable)      |                  |
| createdAt                 |                  |
+---------------------------+                  |
                                               |
+---------------------------+                  |
| oauth_refresh_tokens      |                  |
+---------------------------+                  |
| id (PK)                   |                  |
| tokenHash (UNIQUE)        |---- SHA-256(ort_xxx)
| clientId (FK)             |                  |
| userId (FK) --------------|------------------+
| expiresAt                 |
| lastUsedAt                |
| revokedAt (nullable)      |
| createdAt                 |
+---------------------------+
```

**Indexes:** Each table has a unique index on the lookup column (`code` / `tokenHash`) provided by `@unique`, plus a non-unique index on `expiresAt` for cleanup queries.

## Refresh Token Rotation

When a refresh token is used, the old token is **revoked** and a new pair (access + refresh) is issued:

```text
Client:  POST /oauth/token { grant_type: refresh_token, refresh_token: ort_OLD }

Server:
  1. Atomic: UPDATE oauth_refresh_tokens SET revokedAt=now()
     WHERE tokenHash=hash(ort_OLD) AND clientId=... AND revokedAt IS NULL AND expiresAt > now()
  2. If count=0 -> 401 (invalid, expired, or already revoked)
  3. Create new oat_NEW + ort_NEW
  4. Return { access_token: oat_NEW, refresh_token: ort_NEW }
```

The atomic `updateMany` prevents TOCTOU race conditions -- concurrent refresh attempts with the same token will only succeed once. If a revoked refresh token is presented, the request fails with `401`.

## Stateless MCP Transport

Each `POST /mcp` request creates a fresh `McpServer` + `StreamableHTTPServerTransport` instance:

```text
POST /mcp
  |
  +-- Create transport (sessionIdGenerator: undefined)
  +-- Create McpServer
  +-- Extract user context from Bearer header
  +-- Register tools with user context
  +-- Register resources
  +-- server.connect(transport)
  +-- transport.handleRequest(req, res, body)
  |
  +-- finally: server.close() + transport.close()
```

No sessions, no in-memory state, no session IDs. Server restarts do not break MCP clients -- each request is fully independent.

## Admin UI Authorization Flow

Source: [`revisium-admin/src/pages/AuthorizePage/`](../revisium-admin/src/pages/AuthorizePage/)

The Admin UI reuses the existing `authorize` page for the OAuth authorization screen:

```text
Browser opens /authorize?client_id=...&client_name=...
  |
  +-- checkAuth loader: user not logged in?
  |   +-- Redirect to /login?redirect=/authorize?...
  |       +-- After login, back to /authorize?...
  |
  +-- AuthorizePageViewModel.init()
  |   +-- Parse query params -> _oauthParams
  |
  +-- isOAuthFlow = true -> render OAuthAuthorizeView
  |   +-- "Authorize Application"
  |       "[client_name] wants to access your Revisium account."
  |       [Authorize] button
  |
  +-- User clicks Authorize -> approve()
  |   +-- POST /oauth/authorize
  |       Authorization: Bearer <JWT from AuthService.token>
  |       Body: { client_id, redirect_uri, code_challenge, state }
  |
  +-- Response: { redirect_uri }
  |   +-- OAuthSuccessView
  |       "Authorization Successful"
  |       "Redirecting back to the application..."
  |       [Continue now]
  |
  +-- Auto-redirect after 3 seconds -> redirect_uri
      (or user clicks "Continue now")
```

Without OAuth params, the page falls back to the standard token-copy view for manual `login_with_token` usage.

## Proxy Configuration

### Development (Vite)

[`revisium-admin/vite.config.ts`](../revisium-admin/vite.config.ts) proxies API paths from the UI dev server (`:5173`) to the backend (`:8080`):

```text
/mcp                                   -> http://localhost:8080
/.well-known/oauth-authorization-server -> http://localhost:8080
/.well-known/oauth-protected-resource   -> http://localhost:8080
/oauth/*                                -> http://localhost:8080
```

`PUBLIC_URL=http://localhost:5173` -- all OAuth discovery URLs point to the UI origin in development.

### Production (nginx)

[`revisium/nginx.cloud.example.conf`](../revisium/nginx.cloud.example.conf):

```nginx
# OAuth discovery
location /.well-known/oauth-authorization-server { proxy_pass http://localhost:8080; }
location /.well-known/oauth-protected-resource   { proxy_pass http://localhost:8080; }

# OAuth endpoints (register, authorize, token, revoke)
location /oauth/ { proxy_pass http://localhost:8080; }

# MCP (stateless, Bearer auth)
location /mcp { proxy_pass http://localhost:8080; client_max_body_size 50m; }

# Everything else (API + Admin UI)
location / { proxy_pass http://localhost:8080; }
```

In production, `PUBLIC_URL` matches the external domain (e.g. `https://revisium.example.com`).

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PUBLIC_URL` | `http://localhost:8080` | External URL used in OAuth discovery metadata and redirects |
| `JWT_SECRET` | - | Secret for signing/verifying JWT tokens |
| `REVISIUM_NO_AUTH` | `false` | Skip auth, treat all requests as admin |
| `MCP_ACCESS_TOKEN_EXPIRY_DAYS` | `30` | Access token TTL (in days) for `scope=mcp` |

## Source Files

| File | Description |
|------|-------------|
| [`src/features/oauth/oauth.module.ts`](../src/features/oauth/oauth.module.ts) | OAuth NestJS module |
| [`src/features/oauth/oauth.controller.ts`](../src/features/oauth/oauth.controller.ts) | Discovery, registration, authorization, token endpoints |
| [`src/features/oauth/oauth-client.service.ts`](../src/features/oauth/oauth-client.service.ts) | Client registration and secret validation |
| [`src/features/oauth/oauth-authorization.service.ts`](../src/features/oauth/oauth-authorization.service.ts) | Authorization code creation and PKCE exchange |
| [`src/features/oauth/oauth-token.service.ts`](../src/features/oauth/oauth-token.service.ts) | Access/refresh token lifecycle |
| [`src/api/mcp-api/mcp.controller.ts`](../src/api/mcp-api/mcp.controller.ts) | Stateless MCP HTTP transport |
| [`src/api/mcp-api/mcp-auth.service.ts`](../src/api/mcp-api/mcp-auth.service.ts) | Bearer token detection (JWT vs OAuth) |
| [`prisma/schema.prisma`](../prisma/schema.prisma) | Database models (OAuthClient, OAuthAuthorizationCode, OAuthAccessToken, OAuthRefreshToken) |

## Not Implemented (Future)

- **Granular OAuth scopes** (`mcp:read`, `mcp:write`, `mcp:admin`) -- currently `mcp` scope controls TTL only, not permissions
- **Personal Access Tokens** (`rev_*` prefix)
- **Reuse detection** (token family tracking)
- **Token cleanup cron job** (expired tokens accumulate in DB)
