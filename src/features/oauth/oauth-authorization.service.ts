import { Injectable, BadRequestException } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

const AUTH_CODE_PREFIX = 'auth_';
const CODE_EXPIRY_MINUTES = 10;

@Injectable()
export class OAuthAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async createAuthorizationCode(data: {
    clientId: string;
    userId: string;
    redirectUri: string;
    codeChallenge: string;
    scope?: string;
  }): Promise<string> {
    const code = AUTH_CODE_PREFIX + randomBytes(24).toString('hex');

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + CODE_EXPIRY_MINUTES);

    await this.prisma.oAuthAuthorizationCode.create({
      data: {
        code,
        clientId: data.clientId,
        userId: data.userId,
        redirectUri: data.redirectUri,
        codeChallenge: data.codeChallenge,
        scope: data.scope ?? null,
        expiresAt,
      },
    });

    return code;
  }

  async exchangeCode(data: {
    code: string;
    clientId: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<{ userId: string; scope: string | null }> {
    const result = await this.prisma.oAuthAuthorizationCode.updateMany({
      where: {
        code: data.code,
        clientId: data.clientId,
        redirectUri: data.redirectUri,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });

    if (result.count === 0) {
      throw new BadRequestException(
        'Invalid, expired, or already used authorization code',
      );
    }

    const authCode = await this.prisma.oAuthAuthorizationCode.findUnique({
      where: { code: data.code },
    });

    if (!authCode) {
      throw new BadRequestException('Invalid authorization code');
    }

    if (!this.verifyPkce(data.codeVerifier, authCode.codeChallenge)) {
      throw new BadRequestException('PKCE verification failed');
    }

    return { userId: authCode.userId, scope: authCode.scope };
  }

  private verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
    const computed = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    const a = Buffer.from(computed);
    const b = Buffer.from(codeChallenge);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
