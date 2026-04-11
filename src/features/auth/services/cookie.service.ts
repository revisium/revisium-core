import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Response } from 'express';

export const ACCESS_COOKIE_NAME = 'rev_at';
export const REFRESH_COOKIE_NAME = 'rev_rt';
export const SESSION_COOKIE_NAME = 'rev_session';
export const ACCESS_COOKIE_PATH = '/';
export const REFRESH_COOKIE_PATH = '/api/auth/';
export const SESSION_COOKIE_PATH = '/';

const ACCESS_MAX_AGE_MS = 30 * 60 * 1000;
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_COOKIE_VALUE = '1';

type SameSiteValue = 'lax' | 'strict' | 'none';
const DEFAULT_SAMESITE: SameSiteValue = 'lax';
const VALID_SAMESITE: readonly SameSiteValue[] = ['lax', 'strict', 'none'];

@Injectable()
export class CookieService {
  private readonly logger = new Logger(CookieService.name);
  private readonly isSecure: boolean;
  private readonly sameSite: SameSiteValue;

  constructor(private readonly configService: ConfigService) {
    const cookieSecure = this.configService.get<string>('COOKIE_SECURE');
    this.isSecure =
      cookieSecure === undefined
        ? this.configService.get<string>('NODE_ENV') === 'production'
        : cookieSecure === 'true';

    this.sameSite = this.resolveSameSite();
  }

  public setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    res.cookie(
      ACCESS_COOKIE_NAME,
      accessToken,
      this.buildOptions(ACCESS_COOKIE_PATH, ACCESS_MAX_AGE_MS),
    );

    res.cookie(
      REFRESH_COOKIE_NAME,
      refreshToken,
      this.buildOptions(REFRESH_COOKIE_PATH, REFRESH_MAX_AGE_MS),
    );

    // Non-httpOnly presence cookie so revisium-admin can detect "session
    // likely alive" without a speculative getMe. Carries no credential —
    // only the literal "1". Max-Age matches the refresh token so browser
    // expiry stays in lockstep with the real session. See ADR-0045.
    res.cookie(
      SESSION_COOKIE_NAME,
      SESSION_COOKIE_VALUE,
      this.buildOptions(SESSION_COOKIE_PATH, REFRESH_MAX_AGE_MS, {
        httpOnly: false,
      }),
    );
  }

  public clearAuthCookies(res: Response): void {
    // Browsers require the same name/path AND the same security flags to
    // reliably delete a cookie — especially SameSite=None which must
    // also carry Secure on the clear. Forward httpOnly/secure/sameSite
    // from the same builder used for set-cookie.
    res.clearCookie(
      ACCESS_COOKIE_NAME,
      this.buildClearOptions(ACCESS_COOKIE_PATH),
    );
    res.clearCookie(
      REFRESH_COOKIE_NAME,
      this.buildClearOptions(REFRESH_COOKIE_PATH),
    );
    res.clearCookie(
      SESSION_COOKIE_NAME,
      this.buildClearOptions(SESSION_COOKIE_PATH, { httpOnly: false }),
    );
  }

  private buildClearOptions(
    path: string,
    overrides?: Partial<CookieOptions>,
  ): CookieOptions {
    return {
      httpOnly: true,
      secure: this.isSecure,
      sameSite: this.sameSite,
      path,
      ...overrides,
    };
  }

  private buildOptions(
    path: string,
    maxAge: number,
    overrides?: Partial<CookieOptions>,
  ): CookieOptions {
    return {
      httpOnly: true,
      secure: this.isSecure,
      sameSite: this.sameSite,
      path,
      maxAge,
      ...overrides,
    };
  }

  private resolveSameSite(): SameSiteValue {
    const raw = this.configService
      .get<string>('COOKIE_SAMESITE')
      ?.toLowerCase();

    if (raw === undefined || raw === '') {
      return DEFAULT_SAMESITE;
    }

    if (!VALID_SAMESITE.includes(raw as SameSiteValue)) {
      this.logger.warn(
        `Invalid COOKIE_SAMESITE='${raw}', falling back to '${DEFAULT_SAMESITE}'. Allowed: ${VALID_SAMESITE.join(', ')}.`,
      );
      return DEFAULT_SAMESITE;
    }

    const value = raw as SameSiteValue;

    if (value === 'none' && !this.isSecure) {
      throw new Error(
        `Invalid cookie configuration: COOKIE_SAMESITE='none' requires COOKIE_SECURE=true. ` +
          `Browsers reject SameSite=None cookies that are not Secure. ` +
          `Either set COOKIE_SECURE=true (requires HTTPS) or use COOKIE_SAMESITE='lax' / 'strict'.`,
      );
    }

    return value;
  }
}
