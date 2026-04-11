import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import {
  ACCESS_COOKIE_NAME,
  ACCESS_COOKIE_PATH,
  CookieService,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_PATH,
} from 'src/features/auth/services/cookie.service';

describe('CookieService', () => {
  const makeRes = () => {
    const cookie = jest.fn();
    const clearCookie = jest.fn();
    return {
      res: { cookie, clearCookie } as unknown as Response,
      cookie,
      clearCookie,
    };
  };

  const makeService = (env: Record<string, string | undefined>) => {
    const config = {
      get: (key: string) => env[key],
    } as unknown as ConfigService;
    return new CookieService(config);
  };

  describe('secure flag resolution', () => {
    it('honors COOKIE_SECURE=true regardless of NODE_ENV', () => {
      const service = makeService({
        COOKIE_SECURE: 'true',
        NODE_ENV: 'development',
      });
      const { res, cookie } = makeRes();
      service.setAuthCookies(res, 'at', 'rt');

      expect(cookie.mock.calls[0][2].secure).toBe(true);
      expect(cookie.mock.calls[1][2].secure).toBe(true);
    });

    it('honors COOKIE_SECURE=false even in production', () => {
      const service = makeService({
        COOKIE_SECURE: 'false',
        NODE_ENV: 'production',
      });
      const { res, cookie } = makeRes();
      service.setAuthCookies(res, 'at', 'rt');

      expect(cookie.mock.calls[0][2].secure).toBe(false);
      expect(cookie.mock.calls[1][2].secure).toBe(false);
    });

    it('falls back to NODE_ENV=production when COOKIE_SECURE is unset', () => {
      const service = makeService({ NODE_ENV: 'production' });
      const { res, cookie } = makeRes();
      service.setAuthCookies(res, 'at', 'rt');

      expect(cookie.mock.calls[0][2].secure).toBe(true);
    });

    it('defaults to insecure outside production', () => {
      const service = makeService({ NODE_ENV: 'development' });
      const { res, cookie } = makeRes();
      service.setAuthCookies(res, 'at', 'rt');

      expect(cookie.mock.calls[0][2].secure).toBe(false);
    });
  });

  describe('setAuthCookies', () => {
    it('sets rev_at on Path / with lax samesite and httpOnly', () => {
      const service = makeService({});
      const { res, cookie } = makeRes();
      service.setAuthCookies(res, 'access-jwt', 'ref_xyz');

      const [atName, atValue, atOptions] = cookie.mock.calls[0];
      expect(atName).toBe(ACCESS_COOKIE_NAME);
      expect(atValue).toBe('access-jwt');
      expect(atOptions).toMatchObject({
        httpOnly: true,
        sameSite: 'lax',
        path: ACCESS_COOKIE_PATH,
      });
      expect(atOptions.maxAge).toBe(30 * 60 * 1000);
    });

    it('sets rev_rt scoped to the refresh path', () => {
      const service = makeService({});
      const { res, cookie } = makeRes();
      service.setAuthCookies(res, 'access-jwt', 'ref_xyz');

      const [rtName, rtValue, rtOptions] = cookie.mock.calls[1];
      expect(rtName).toBe(REFRESH_COOKIE_NAME);
      expect(rtValue).toBe('ref_xyz');
      expect(rtOptions).toMatchObject({
        httpOnly: true,
        sameSite: 'lax',
        path: REFRESH_COOKIE_PATH,
      });
      expect(rtOptions.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('sets the non-httpOnly rev_session presence cookie', () => {
      const service = makeService({});
      const { res, cookie } = makeRes();
      service.setAuthCookies(res, 'access-jwt', 'ref_xyz');

      expect(cookie).toHaveBeenCalledTimes(3);
      const [sessionName, sessionValue, sessionOptions] = cookie.mock.calls[2];
      expect(sessionName).toBe(SESSION_COOKIE_NAME);
      expect(sessionValue).toBe('1');
      expect(sessionOptions).toMatchObject({
        httpOnly: false,
        sameSite: 'lax',
        path: SESSION_COOKIE_PATH,
      });
      // Matches refresh lifetime so browser expiry stays in lockstep.
      expect(sessionOptions.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('rev_session inherits the Secure flag from the other cookies', () => {
      const service = makeService({ COOKIE_SECURE: 'true' });
      const { res, cookie } = makeRes();
      service.setAuthCookies(res, 'access-jwt', 'ref_xyz');

      expect(cookie.mock.calls[2][2].secure).toBe(true);
    });

    it('rev_session inherits COOKIE_SAMESITE', () => {
      const service = makeService({
        COOKIE_SECURE: 'true',
        COOKIE_SAMESITE: 'strict',
      });
      const { res, cookie } = makeRes();
      service.setAuthCookies(res, 'access-jwt', 'ref_xyz');

      expect(cookie.mock.calls[2][2].sameSite).toBe('strict');
    });
  });

  describe('clearAuthCookies', () => {
    it('clears all three cookies forwarding secure/sameSite/httpOnly', () => {
      const service = makeService({ COOKIE_SECURE: 'true' });
      const { res, clearCookie } = makeRes();
      service.clearAuthCookies(res);

      expect(clearCookie).toHaveBeenCalledWith(ACCESS_COOKIE_NAME, {
        path: ACCESS_COOKIE_PATH,
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
      });
      expect(clearCookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, {
        path: REFRESH_COOKIE_PATH,
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
      });
      expect(clearCookie).toHaveBeenCalledWith(SESSION_COOKIE_NAME, {
        path: SESSION_COOKIE_PATH,
        httpOnly: false,
        secure: true,
        sameSite: 'lax',
      });
    });
  });

  describe('COOKIE_SAMESITE resolution', () => {
    it("defaults to 'lax' when COOKIE_SAMESITE is unset", () => {
      const service = makeService({});
      const { res, cookie } = makeRes();
      service.setAuthCookies(res, 'at', 'rt');

      expect(cookie.mock.calls[0][2].sameSite).toBe('lax');
      expect(cookie.mock.calls[1][2].sameSite).toBe('lax');
    });

    it("accepts 'strict' and applies it to both cookies", () => {
      const service = makeService({ COOKIE_SAMESITE: 'strict' });
      const { res, cookie } = makeRes();
      service.setAuthCookies(res, 'at', 'rt');

      expect(cookie.mock.calls[0][2].sameSite).toBe('strict');
      expect(cookie.mock.calls[1][2].sameSite).toBe('strict');
    });

    it("accepts 'none' when cookies are Secure", () => {
      const service = makeService({
        COOKIE_SAMESITE: 'none',
        COOKIE_SECURE: 'true',
      });
      const { res, cookie } = makeRes();
      service.setAuthCookies(res, 'at', 'rt');

      expect(cookie.mock.calls[0][2].sameSite).toBe('none');
      expect(cookie.mock.calls[0][2].secure).toBe(true);
      expect(cookie.mock.calls[1][2].sameSite).toBe('none');
      expect(cookie.mock.calls[1][2].secure).toBe(true);
    });

    it("throws when COOKIE_SAMESITE='none' but cookies are not Secure", () => {
      expect(() =>
        makeService({
          COOKIE_SAMESITE: 'none',
          COOKIE_SECURE: 'false',
        }),
      ).toThrow(/SameSite=.*none.*requires COOKIE_SECURE/i);
    });

    it("throws when COOKIE_SAMESITE='none' in non-production without explicit Secure", () => {
      expect(() =>
        makeService({
          COOKIE_SAMESITE: 'none',
          NODE_ENV: 'development',
        }),
      ).toThrow(/SameSite=.*none.*requires COOKIE_SECURE/i);
    });

    it('is case-insensitive for COOKIE_SAMESITE value', () => {
      const service = makeService({ COOKIE_SAMESITE: 'STRICT' });
      const { res, cookie } = makeRes();
      service.setAuthCookies(res, 'at', 'rt');

      expect(cookie.mock.calls[0][2].sameSite).toBe('strict');
    });

    it('falls back to lax on invalid COOKIE_SAMESITE value', () => {
      const service = makeService({ COOKIE_SAMESITE: 'relaxed' });
      const { res, cookie } = makeRes();
      service.setAuthCookies(res, 'at', 'rt');

      expect(cookie.mock.calls[0][2].sameSite).toBe('lax');
    });
  });
});
