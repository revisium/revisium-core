import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ACCESS_COOKIE_NAME } from 'src/features/auth/services/cookie.service';
import { JwtSecretService } from 'src/features/auth/jwt-secret.service';
import { IAuthUser } from 'src/features/auth/types';
import { AuthCacheService } from 'src/infrastructure/cache/services/auth-cache.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

type RequestWithCookies = Request & { cookies?: Record<string, string> };

type AccessTokenPayload = {
  sub: string;
  email?: string;
  username?: string;
  roleId?: string;
  ver?: number;
};

// RFC 7235 §2.1: the auth-scheme token is case-insensitive ("Bearer",
// "bearer", "BEARER" are all valid). The previous startsWith('Bearer ')
// would silently fall through to the cookie extractor for lowercase
// variants, which is a subtle interop bug for HTTP clients that
// lowercase header values (e.g. http.client in certain Python versions).
export function extractTokenFromCookieOrHeader(
  req: RequestWithCookies,
): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const [scheme, token] = authHeader.split(/\s+/, 2);
    if (scheme?.toLowerCase() === 'bearer' && token) {
      return token;
    }
  }
  return req.cookies?.[ACCESS_COOKIE_NAME] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    jwtSecret: JwtSecretService,
    private readonly prisma: PrismaService,
    private readonly authCache: AuthCacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractTokenFromCookieOrHeader,
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret.secret,
    });
  }

  async validate(payload: AccessTokenPayload): Promise<IAuthUser> {
    if (!payload.sub) {
      throw new UnauthorizedException();
    }

    if (payload.ver !== undefined) {
      // Cached behind AuthCacheService (30s TTL) so normal request
      // authentication does not hit the DB on every call. A tokenVersion
      // bump propagates within the TTL across all pods, which is fine
      // for the "kill every session for this user" workflow — the alert
      // is typically on the order of seconds anyway.
      const currentVersion = await this.authCache.userTokenVersion(
        payload.sub,
        () =>
          this.prisma.user
            .findUnique({
              where: { id: payload.sub },
              select: { tokenVersion: true },
            })
            .then((user) => user?.tokenVersion ?? null),
      );

      if (currentVersion !== payload.ver) {
        throw new UnauthorizedException('Token revoked');
      }
    }

    return {
      userId: payload.sub,
      email: payload.email ?? '',
      authMethod: 'jwt',
    };
  }
}
