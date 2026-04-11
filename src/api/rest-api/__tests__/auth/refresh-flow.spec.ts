import { INestApplication } from '@nestjs/common';
import { createHash } from 'node:crypto';
import request from 'supertest';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import { createFreshTestApp, anonPost } from 'src/__tests__/e2e/shared';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

type SetCookieHeader = string[] | string | undefined;

function getCookieValue(
  setCookie: SetCookieHeader,
  name: string,
): string | undefined {
  const headers = Array.isArray(setCookie)
    ? setCookie
    : setCookie
      ? [setCookie]
      : [];
  for (const entry of headers) {
    const [pair] = entry.split(';');
    const [cookieName, ...rest] = pair.split('=');
    if (cookieName === name) {
      return rest.join('=');
    }
  }
  return undefined;
}

function getCookieAttribute(
  setCookie: SetCookieHeader,
  name: string,
  attribute: string,
): string | undefined {
  const headers = Array.isArray(setCookie)
    ? setCookie
    : setCookie
      ? [setCookie]
      : [];
  for (const entry of headers) {
    const parts = entry.split(';').map((p) => p.trim());
    const [pair] = parts;
    if (pair.startsWith(`${name}=`)) {
      const attr = parts.find((p) =>
        p.toLowerCase().startsWith(attribute.toLowerCase()),
      );
      if (!attr) {
        return undefined;
      }
      const idx = attr.indexOf('=');
      return idx === -1 ? '' : attr.slice(idx + 1);
    }
  }
  return undefined;
}

function wasCleared(setCookie: SetCookieHeader, name: string): boolean {
  const headers = Array.isArray(setCookie)
    ? setCookie
    : setCookie
      ? [setCookie]
      : [];
  return headers.some(
    (entry) =>
      entry.startsWith(`${name}=;`) ||
      /Expires=Thu, 01 Jan 1970/i.test(entry) ||
      /Max-Age=0/i.test(entry),
  );
}

describe('restapi - auth cookie flow', () => {
  let app: INestApplication;
  let fixture: PrepareDataReturnType;

  beforeAll(async () => {
    app = await createFreshTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    fixture = await prepareData(app);
  });

  it('sets rev_at, rev_rt, and rev_session cookies on successful login', async () => {
    const res = await anonPost(app, '/api/auth/login', {
      emailOrUsername: fixture.owner.user.username,
      password: 'password',
    }).expect(201);

    const setCookie = res.headers['set-cookie'] as SetCookieHeader;
    expect(getCookieValue(setCookie, 'rev_at')).toBeTruthy();
    expect(getCookieValue(setCookie, 'rev_rt')).toMatch(/^ref_[0-9a-f]+$/);
    expect(getCookieValue(setCookie, 'rev_session')).toBe('1');

    expect(getCookieAttribute(setCookie, 'rev_at', 'Path')).toBe('/');
    // rev_rt path must cover BOTH /api/auth/refresh (rotation) AND
    // /api/auth/logout (server-side family revocation). Narrower scopes
    // like '/api/auth/refresh' break logout because RFC 6265 cookie-path
    // matching is prefix-based and the browser would not send the cookie.
    expect(getCookieAttribute(setCookie, 'rev_rt', 'Path')).toBe('/api/auth/');
    expect(getCookieAttribute(setCookie, 'rev_session', 'Path')).toBe('/');

    // rev_session must NOT be HttpOnly — the admin SPA reads it via
    // document.cookie to decide whether to attempt getMe on page load.
    const sessionSetCookie = (Array.isArray(setCookie) ? setCookie : []).find(
      (c) => c.startsWith('rev_session='),
    );
    expect(sessionSetCookie).toBeDefined();
    expect(sessionSetCookie!.toLowerCase()).not.toContain('httponly');
    // The real credentials must still be HttpOnly.
    const atSetCookie = (Array.isArray(setCookie) ? setCookie : []).find((c) =>
      c.startsWith('rev_at='),
    );
    expect(atSetCookie!.toLowerCase()).toContain('httponly');

    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.expiresIn).toBeGreaterThan(0);
  });

  it('grants access to /api/user/me via the rev_at cookie alone', async () => {
    const login = await anonPost(app, '/api/auth/login', {
      emailOrUsername: fixture.owner.user.username,
      password: 'password',
    }).expect(201);

    const accessCookie = getCookieValue(
      login.headers['set-cookie'] as SetCookieHeader,
      'rev_at',
    )!;

    await request(app.getHttpServer())
      .get('/api/user/me')
      .set('Cookie', `rev_at=${accessCookie}`)
      .expect(200);
  });

  it('rotates both cookies on /api/auth/refresh', async () => {
    const login = await anonPost(app, '/api/auth/login', {
      emailOrUsername: fixture.owner.user.username,
      password: 'password',
    }).expect(201);

    const loginCookies = login.headers['set-cookie'] as SetCookieHeader;
    const originalRt = getCookieValue(loginCookies, 'rev_rt')!;

    const refreshRes = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', `rev_rt=${originalRt}`)
      .expect(200);

    const refreshCookies = refreshRes.headers['set-cookie'] as SetCookieHeader;
    const newAt = getCookieValue(refreshCookies, 'rev_at')!;
    const newRt = getCookieValue(refreshCookies, 'rev_rt')!;

    expect(newAt).toBeTruthy();
    expect(newRt).toBeTruthy();
    // Refresh token is opaque random — always rotates.
    expect(newRt).not.toBe(originalRt);

    // New access cookie can be used for a protected call.
    await request(app.getHttpServer())
      .get('/api/user/me')
      .set('Cookie', `rev_at=${newAt}`)
      .expect(200);
  });

  it('clears cookies and returns 401 when /api/auth/refresh has no cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .expect(401);

    const setCookie = res.headers['set-cookie'] as SetCookieHeader;
    expect(wasCleared(setCookie, 'rev_at')).toBe(true);
    expect(wasCleared(setCookie, 'rev_rt')).toBe(true);
  });

  it('rejects a replayed refresh token and revokes the family after the grace window', async () => {
    const login = await anonPost(app, '/api/auth/login', {
      emailOrUsername: fixture.owner.user.username,
      password: 'password',
    }).expect(201);

    const originalRt = getCookieValue(
      login.headers['set-cookie'] as SetCookieHeader,
      'rev_rt',
    )!;

    // First rotation succeeds.
    const refreshOk = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', `rev_rt=${originalRt}`)
      .expect(200);

    const newRt = getCookieValue(
      refreshOk.headers['set-cookie'] as SetCookieHeader,
      'rev_rt',
    )!;

    // Force the original token's revokedAt beyond the grace window so reuse is treated as theft.
    const prisma = app.get(PrismaService);
    const originalHash = createHash('sha256').update(originalRt).digest('hex');
    await prisma.refreshToken.updateMany({
      where: { tokenHash: originalHash },
      data: { revokedAt: new Date(Date.now() - 60_000) },
    });

    // Replaying the original after the grace window is detected as theft.
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', `rev_rt=${originalRt}`)
      .expect(401);

    // The previously-valid new token is also revoked now.
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', `rev_rt=${newRt}`)
      .expect(401);
  });

  it('/api/auth/logout revokes the refresh family and clears cookies', async () => {
    const login = await anonPost(app, '/api/auth/login', {
      emailOrUsername: fixture.owner.user.username,
      password: 'password',
    }).expect(201);

    const rt = getCookieValue(
      login.headers['set-cookie'] as SetCookieHeader,
      'rev_rt',
    )!;

    const logoutRes = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', `rev_rt=${rt}`)
      .expect(204);

    const cleared = logoutRes.headers['set-cookie'] as SetCookieHeader;
    expect(wasCleared(cleared, 'rev_at')).toBe(true);
    expect(wasCleared(cleared, 'rev_rt')).toBe(true);
    expect(wasCleared(cleared, 'rev_session')).toBe(true);

    // The revoked refresh token can no longer rotate.
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', `rev_rt=${rt}`)
      .expect(401);
  });

  it('Bearer header flow is unchanged by the cookie flow', async () => {
    const res = await anonPost(app, '/api/auth/login', {
      emailOrUsername: fixture.owner.user.username,
      password: 'password',
    }).expect(201);

    const bearer = res.body.accessToken as string;

    await request(app.getHttpServer())
      .get('/api/user/me')
      .set('Authorization', `Bearer ${bearer}`)
      .expect(200);
  });
});
