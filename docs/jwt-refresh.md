# JWT Token Lifecycle (Admin UI Cookies)

Short-lived JWT access token + rotating refresh token, both in httpOnly cookies, for the browser admin UI. Bearer-header auth (PAT, OAuth, service keys, internal keys) is **unchanged**.

See also:
- [ADR-0045](../../architecture/adr/ADR-0045-jwt-token-lifecycle.md) — why
- [jwt-refresh-v1.spec.md](../../architecture/specs/jwt-refresh-v1.spec.md) — what exactly

## When to use which transport

| Consumer | Transport | Why |
|---|---|---|
| `revisium-admin` (browser) | `rev_at` + `rev_rt` cookies | XSS can't read httpOnly cookies; no `localStorage` exposure |
| `@revisium/cli`, scripts | Bearer header with a Personal API Key (`rev_`) | Server-side, can't manage cookies, no refresh needed |
| MCP clients (Claude Code, Cursor) | Bearer header with OAuth access token (`oat_`) | OAuth 2.1 flow, not session-based |
| `revisium-endpoint` → core | Bearer header with internal service JWT | Service-to-service, multi-pod |
| Integrations / CI | Bearer header with a Service Key (`rev_`) | Per-project scoped, CASL permissions |

The server's `UniversalAuthGuard` tries matches in order: `x-internal-api-key` → `x-api-key` → `Authorization: Bearer` → query `api_key` → `rev_at` cookie. **Bearer always wins over the cookie.**

## Cookies

| Cookie | Contents | Path | SameSite | httpOnly | Max-Age |
|---|---|---|---|---|---|
| `rev_at` | 30 min JWT access token | `/` | Lax | true | 1800 s |
| `rev_rt` | 7 day opaque refresh token (`ref_…`) | `/api/auth/` | Lax | true | 604800 s |
| `rev_session` | Presence indicator (`"1"`) — carries no credential | `/` | Lax | **false** | 604800 s |

`secure` is set from `COOKIE_SECURE` env var (explicit `true`/`false`) or falls back to `NODE_ENV === 'production'`. All three cookies share the same `Secure` and `SameSite` flags — only `HttpOnly` differs for `rev_session`.

### Why a third `rev_session` cookie?

`rev_at` and `rev_rt` are `HttpOnly`, which means the admin SPA cannot see whether they exist. Without a separate signal, the SPA has to fire a speculative `getMe` on every page load to find out — anonymous visitors get a guaranteed 401 → refresh 401 dance on the Network tab just for landing on the site.

`rev_session` is a server-set, non-`HttpOnly` flag with the literal value `"1"` that the SPA reads from `document.cookie`. Its presence is the hint "there *may* be a live session — try to resume it." Its absence means "definitely not logged in — skip `getMe` entirely."

**Why this is safe:**
- It carries no credential. An XSS attacker who can read `document.cookie` learns only that the page was recently logged in — which they already know because they are running inside the authenticated page.
- Its `Max-Age` matches the refresh token, so the browser expires both in lockstep. No client-side bookkeeping to drift.
- It is set and cleared by the server in the same `CookieService.setAuthCookies` / `clearAuthCookies` calls as the real credentials, so the state cannot diverge.
- It never travels on sensitive paths outside what `rev_at` already covers (Path `/`).

### Why `rev_at` Path `/`

The admin UI hits both `/graphql` (Yoga) and `/api/…` (REST). The access cookie must reach both. Narrower paths would break one transport.

### Why `rev_rt` Path `/api/auth/`

The refresh token is only needed by the two auth endpoints that operate on it — `/api/auth/refresh` (rotation) and `/api/auth/logout` (server-side revocation). Scoping its Path to `/api/auth/` keeps the cookie off `/graphql`, `/api/organization/*`, `/api/revision/*`, and every other hot path, reducing the exposure surface (logs, proxy caches, incidental copies).

**Why not narrower, like `/api/auth/refresh`?** RFC 6265 cookie-path matching is prefix-based. A cookie with `Path=/api/auth/refresh` would only be sent on refresh requests — the logout endpoint at `/api/auth/logout` would never see it, and `revokeFamilyByRawToken` would silently no-op. Widening to `/api/auth/` is the narrowest path that still lets logout revoke the family server-side.

## Access token (JWT)

```json
{
  "sub": "user-id",
  "email": "alice@example.com",
  "username": "alice",
  "ver": 0,
  "iat": 1775000000,
  "exp": 1775001800
}
```

- Signed with `HS256` using `JWT_SECRET` (nanoid at boot if unset — **must** be explicit in multi-pod).
- TTL from `JWT_ACCESS_TOKEN_TTL` env var (default `30m`), accepted as `ms` duration string.
- `ver` claim matches `User.tokenVersion` at issue time. Incrementing `User.tokenVersion` revokes every outstanding access token for that user within the tokenVersion cache TTL (currently 30 s) across all pods.
- `ver` is checked by `JwtStrategy.validate()` against a cached `tokenVersion` served by `AuthCacheService` (BentoCache, 30 s TTL). The strategy falls back to `User.findUnique({ select: { tokenVersion } })` on cache miss, so a cold cache costs one DB read and a warm cache costs zero. The revocation window is therefore "near-instant" rather than strictly instant — the cache entry may still report the stale version for up to 30 s after a bump. This is the explicit trade-off: paying one DB read per authenticated request across every pod was too high a cost for a feature whose SLA is "logout every session for this user", which is measured in seconds at worst.
- **Backward compat:** tokens issued before this feature (no `ver` claim) skip the check and remain valid until natural expiry.

## Refresh token

```text
ref_<72 hex chars>      // 76 chars total
```

- Opaque, generated via `crypto.randomBytes(36).toString('hex')`.
- Server stores `SHA-256(rawToken)` in `RefreshToken.tokenHash`. The raw token is **never** persisted.
- Each token belongs to a `familyId` (one family per login chain).
- TTL from `JWT_REFRESH_TOKEN_TTL_DAYS` env var (default `7`).

### Rotation

Every `POST /api/auth/refresh`:

1. Hash the presented `rev_rt` cookie value.
2. Find the matching `RefreshToken` row.
3. Validate: not expired, not revoked.
4. Mark the old row `revokedAt = now`.
5. Create a new `RefreshToken` row with the same `familyId`.
6. Issue a fresh access JWT (re-reads `User.tokenVersion` at rotation time — catches revocations immediately).
7. Set both new cookies on the response.

### Reuse detection

If a client presents an already-revoked token:

- **Within `JWT_REFRESH_GRACE_PERIOD_MS` (default 30 s), cache hit** — treated as a legitimate retry (e.g. network glitch swallowed the previous 200 response). The service keeps a process-local `Map<predecessorId, rawSuccessor>` with the same TTL as the grace window; a replay that hits this cache gets back the **same** successor the previous call minted, so the client's first valid token stays live. This preserves retry idempotence inside a single pod.
- **Within the grace window, cache miss** — fallback for multi-pod deployments without sticky sessions or for cache evictions. The service re-rotates from the family's current live descendant and returns a fresh token. This does invalidate the previous 200 response, so a client that DID receive it will lose that successor on the next rotation. Sticky sessions or an external replay cache (redis) would eliminate this window; v1 accepts the trade-off.
- **Outside the grace window** — treated as theft. Every token in the family is revoked (`UPDATE RefreshToken SET revokedAt = now WHERE familyId = ? AND revokedAt IS NULL`) and the client gets a 401.

This detects the "stolen refresh token replayed after the victim already rotated" scenario without punishing legitimate client retries.

## REST API

### `POST /api/auth/login`

Request:
```json
{ "emailOrUsername": "alice@example.com", "password": "…" }
```

Response `200` — sets `rev_at` + `rev_rt` cookies. Body (kept for CLI/PAT/e2e back-compat):
```json
{ "accessToken": "<jwt>", "expiresIn": 1800 }
```

Error `401` — invalid credentials. No cookies set.

### `POST /api/auth/refresh`

No body. Reads `rev_rt` from cookies.

Response `200` — sets rotated cookies:
```json
{ "expiresIn": 1800 }
```

Response `401` — missing / expired / revoked / reuse detected. All three cookies (`rev_at`, `rev_rt`, `rev_session`) are cleared via `Set-Cookie`.

### `POST /api/auth/logout`

No body. Reads `rev_rt` from cookies, revokes the entire family, clears both cookies. Returns `204`.

Single-device logout only. Does **not** bump `User.tokenVersion` (other sessions on other devices keep working).

### Nuking every session

There is no `logout-all` endpoint in v1. The server-side primitive exists — `RefreshTokenService.revokeAllUserTokens(userId)` — and so does the stronger hammer of incrementing `User.tokenVersion`. Wire either of them to an admin action when needed.

## GraphQL API

The four login mutations — `login`, `loginGoogle`, `loginGithub`, `confirmEmailCode` — **set cookies** on the response via `@Context()`. The `LoginModel` still returns `{ accessToken, expiresIn }` in the body for Bearer consumers.

There is **no** `refreshToken` / `logout` GraphQL mutation. The `rev_rt` cookie is Path-scoped to `/api/auth/`, so a `/graphql` resolver would never receive it. Clients call REST `POST /api/auth/refresh` and `POST /api/auth/logout` via `fetch` instead.

## Configuration

| Env var | Default | Description |
|---|---|---|
| `JWT_SECRET` | nanoid at boot | **Required in multi-pod.** All pods must share the same value, or some will reject tokens signed by others. |
| `JWT_ACCESS_TOKEN_TTL` | `30m` | Access-token lifetime (`ms` duration string: `30m`, `1h`, etc.). |
| `JWT_REFRESH_TOKEN_TTL_DAYS` | `7` | Refresh-token lifetime in days. |
| `JWT_REFRESH_GRACE_PERIOD_MS` | `30000` | Window for legitimate rotation retries before reuse is treated as theft. |
| `COOKIE_SECURE` | `NODE_ENV === 'production'` | Explicit `true`/`false` override for the cookie `Secure` flag. |
| `COOKIE_SAMESITE` | `lax` | `lax` / `strict` / `none`. `none` requires `COOKIE_SECURE=true` and will fail-fast at boot otherwise. |
| `CORS_ORIGIN` | *unset (fail-closed in production)* | Comma-separated allowlist of trusted origins. **Required in production** — if unset, cross-origin requests are refused and a boot-time warning is logged. Outside production (dev) an unset value reflects the request origin for developer convenience. Cloud deployments MUST set this explicitly; there is no longer a permissive `origin: true` default because `origin: true` combined with `credentials: true` would let any origin make credentialed requests, which is not something production should ever silently fall into. |
| `TRUST_PROXY` | *unset* | Pass-through to Express `app.set('trust proxy', …)`. Accepts `true`, `false`, integer hop count (`1`, `2`), or IP/CIDR list. Required whenever revisium-core runs behind one or more reverse proxies so `req.ip` and `req.protocol` resolve to the real client. |

### Deployment topology

Revisium is always deployed monolithically from the browser's perspective — a single origin handles the admin SPA, `/graphql`, `/api/*`, `/oauth/*`, `/mcp`, and `/.well-known/*`. There is no "split host" mode where the admin runs on one origin and the API on another. This keeps cookie handling simple: `SameSite=Lax` + `Path=/` + `Path=/api/auth/` work everywhere.

Three deployment shapes exist:

#### 1. Local dev — Vite + revisium-core

```text
Browser  ──►  Vite dev server (:5173)  ─proxies /graphql, /api/*, /oauth/*──►  revisium-core (:8080)
```

Vite's proxy preserves the browser origin (`http://localhost:5173`), so the browser sees one origin. No env overrides needed.

| Env var | Value |
|---|---|
| `COOKIE_SECURE` | unset (resolves to `false`, because `NODE_ENV !== 'production'`) |
| `COOKIE_SAMESITE` | unset (defaults to `lax`) |
| `CORS_ORIGIN` | unset (reflects request origin) |
| `TRUST_PROXY` | unset |

#### 2. Self-hosted monolith

Core serves the admin SPA (static files) + GraphQL + REST + OAuth + MCP on one origin, either via its own HTTP server or behind a single nginx/Caddy reverse proxy that terminates TLS.

```text
Browser  ──HTTPS──►  nginx (cert, rate limit, etc.)  ──HTTP──►  revisium-core
```

| Env var | Value |
|---|---|
| `COOKIE_SECURE` | `true` (set explicitly, or rely on `NODE_ENV=production`) |
| `COOKIE_SAMESITE` | leave `lax`, or tighten to `strict` if you don't need external top-level navigations to carry the session |
| `CORS_ORIGIN` | the public URL, e.g. `https://revisium.example.com` |
| `TRUST_PROXY` | `true` (1 hop) or `1` |

#### 3. Cloud — k8s with ingress-nginx + admin-pod nginx

This is how `cloud.revisium.io` runs today:

```text
Browser
  │ HTTPS
  ▼
ingress-nginx            (TLS termination, LetsEncrypt, /endpoint/* → endpoint pod, /* → admin pod)
  │ HTTP
  ▼
revisium-admin pod       (nginx + SPA; proxies /graphql, /api/*, /oauth/*, /mcp, /.well-known/* → core)
  │ HTTP
  ▼
revisium-core pod        (NestJS, no public exposure)
```

Core sits behind **two** reverse proxies (ingress + admin pod nginx). For `req.ip` to return the real browser IP instead of the admin pod's cluster IP, two things must be true:

1. `revisium-admin/nginx.conf` forwards `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, and `Host` on every `proxy_pass` block. The current config sets these at the `server` level so every location inherits them.
2. `revisium-core` has `TRUST_PROXY` set so Express will read those headers. Use `TRUST_PROXY=2` (two hops) or `TRUST_PROXY=true` if the cluster network is trusted end-to-end.

| Env var | Value |
|---|---|
| `COOKIE_SECURE` | `true` |
| `COOKIE_SAMESITE` | `lax` (default), or `strict` for tighter cross-site posture |
| `CORS_ORIGIN` | `https://cloud.revisium.io` (or a comma-separated list for multi-domain) |
| `TRUST_PROXY` | `2` (ingress + admin nginx = 2 hops) |

### Scenarios we intentionally do NOT support

- **Split host** — admin on `admin.example.com`, API on `api.example.com`. This would need cross-origin CORS, explicit `COOKIE_DOMAIN`, and an absolute API base URL in the admin SPA. We don't ship it. If you need it, run your own reverse proxy that collapses both under a single origin.
- **Plain HTTP cross-site with `SameSite=None`** — browsers reject `SameSite=None` without `Secure`, and `Secure` requires TLS. There's no way to make this work on plain HTTP across origins.
- **`SameSite=None` on a subpath without TLS** — fails boot-time validation in `CookieService`.

### `SameSite` cheat sheet

| Value | Cross-site XHR | Top-level navigation from external site | Use when |
|---|---|---|---|
| `lax` (default) | blocked | **allowed** (GET) | Normal web apps. Users follow external links and expect to land already-logged-in. |
| `strict` | blocked | blocked | Banking-grade. User following a link from an email or another site lands **logged out** on the first request. |
| `none` | allowed | allowed | Cross-site embed / iframe scenarios. Requires `Secure=true`. Not a default for Revisium. |

## NoAuth mode (`REVISIUM_NO_AUTH=true`)

In NoAuth mode the server short-circuits at the guard with a synthetic `admin` user. Login handlers still return a JWT (no `ver` claim, so it's not revokable-by-version), but **no refresh token is created** — the synthetic `admin` user has no DB row and the FK constraint would fail. The admin UI falls back to the Bearer path for NoAuth: `checkAuth.ts` / `checkAuthOrPublic.ts` call the JSON login, set the Bearer header via `AuthService.setBearerToken`, then call `fetchMe`.

NoAuth is intended for dev/embedded-edition use only. For production always run with `REVISIUM_NO_AUTH` unset.

## Admin UI flow

```text
┌─ page load ────────────────────────────────────────────┐
│ AuthService.initialize()                                │
│  ├─ rev_session present in document.cookie?             │
│  │    ├─ NO  → skip fetchMe entirely, show login.       │
│  │    │         The SPA never fires a speculative /me   │
│  │    │         for anonymous visitors — avoids the     │
│  │    │         guaranteed 401 → refresh 401 dance on   │
│  │    │         first page load.                        │
│  │    └─ YES → fetchMe() via GraphQL                    │
│  │              ├─ 200 → user loaded, isLoaded=true     │
│  │              └─ 401 → tryRefresh()                   │
│  │                       ├─ POST /api/auth/refresh      │
│  │                       │   (sends rev_rt cookie)      │
│  │                       ├─ 200 → new cookies,          │
│  │                       │          retry fetchMe()     │
│  │                       └─ 401 → anonymous, show login │
└─────────────────────────────────────────────────────────┘

┌─ mid-session 401 ──────────────────────────────────────┐
│ Any GraphQL / REST request → 401                        │
│  ApiService.wrapRequestWithRefreshRetry() intercepts:   │
│   ├─ await onUnauthorized() (→ AuthService.tryRefresh)  │
│   │    (mutex: concurrent 401s share one refresh call)  │
│   └─ retry original request once                        │
│        ├─ 200 → caller never sees the blip              │
│        └─ 401 again → throws, caller error-handles      │
└─────────────────────────────────────────────────────────┘

┌─ logout ───────────────────────────────────────────────┐
│ AuthService.logout()                                    │
│  ├─ POST /api/auth/logout (family revoke + clear)       │
│  │   → server clears rev_at / rev_rt / rev_session      │
│  └─ clear local user + in-memory token                  │
└─────────────────────────────────────────────────────────┘
```

## Database

`User` gained one column:
```prisma
tokenVersion  Int  @default(0)
```

One new model:
```prisma
model RefreshToken {
  id        String    @id @default(nanoid())
  tokenHash String    @unique
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyId  String
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())
  userAgent String?
  ip        String?

  @@index([userId])
  @@index([familyId])
  @@index([expiresAt])
}
```

Migration: `20260411120000_add_jwt_refresh`.

## Services

| File | Purpose |
|---|---|
| `features/auth/services/cookie.service.ts` | Sets / clears the three cookies (`rev_at`, `rev_rt`, `rev_session`) with correct flags and paths |
| `features/auth/services/refresh-token.service.ts` | `createToken`, `rotateToken`, `revokeFamily{,ByRawToken}`, `revokeAllUserTokens`, reuse detection |
| `features/auth/strategy/jwt.strategy.ts` | Extracts from Bearer then `rev_at` cookie, validates `ver` claim |
| `features/auth/auth.service.ts` | `signAccessToken`, `issueTokens`, `issueAccessTokenForUserId` |
| `features/auth/guards/universal-auth.service.ts` | Adds the cookie path to `UniversalAuthGuard`'s fallthrough |

## Testing

- **Unit** — `features/auth/__tests__/refresh-token.service.spec.ts` (12 tests, real DB: rotate, reuse-in-grace, reuse-out-of-grace, family revoke, cross-user isolation); `cookie.service.spec.ts` (secure flag matrix, paths); `jwt.strategy.spec.ts` (`ver` match/mismatch, backward compat, missing sub, unknown user); added cookie-path cases to `universal-auth.service.spec.ts`.
- **E2E** — `api/rest-api/__tests__/auth/refresh-flow.spec.ts` (7 tests): login sets cookies with correct attributes → `/api/user/me` via cookie only → refresh rotates → 401 clears cookies → replay detection revokes family → logout clears + revokes → Bearer flow unchanged.

Run the full suite locally with:
```bash
npm run docker:test-container-up
npm test
```

## Operational notes

- **Rotate `JWT_SECRET`** to invalidate every outstanding JWT at once — nuclear option, logs everyone out.
- **Revoke a single user** — bump `User.tokenVersion` (SQL: `UPDATE "User" SET "tokenVersion" = "tokenVersion" + 1 WHERE id = …`). Every access JWT for that user dies on the next request. Their refresh token is still alive in the DB and will issue a new access JWT; combine with `RefreshTokenService.revokeAllUserTokens(userId)` for full logout-everywhere.
- **Monitor reuse detection** — `UnauthorizedException('Refresh token reuse detected')` indicates either a stolen token replayed after rotation or a buggy client. Log aggregation should flag these.
- **Refresh-token cleanup** — v1 does not run a background job to delete expired rows. Expected volume is low (1 row per active session per 7 days). If it becomes an issue, add a scheduled `DELETE FROM "RefreshToken" WHERE "expiresAt" < NOW() - INTERVAL '30 days'` job.
