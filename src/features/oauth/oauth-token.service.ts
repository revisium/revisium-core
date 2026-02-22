import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

const ACCESS_TOKEN_PREFIX = 'oat_';
const REFRESH_TOKEN_PREFIX = 'ort_';
const ACCESS_TOKEN_EXPIRY_HOURS = 1;
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

export interface OAuthTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface OAuthTokenUser {
  userId: string;
  username: string;
  email: string;
  roleId: string | null;
}

@Injectable()
export class OAuthTokenService {
  constructor(private readonly prisma: PrismaService) {}

  async createTokens(
    clientId: string,
    userId: string,
  ): Promise<OAuthTokenPair> {
    const accessToken = ACCESS_TOKEN_PREFIX + randomBytes(36).toString('hex');
    const refreshToken = REFRESH_TOKEN_PREFIX + randomBytes(36).toString('hex');

    const accessExpiresAt = new Date();
    accessExpiresAt.setHours(
      accessExpiresAt.getHours() + ACCESS_TOKEN_EXPIRY_HOURS,
    );

    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(
      refreshExpiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS,
    );

    await this.prisma.$transaction([
      this.prisma.oAuthAccessToken.create({
        data: {
          tokenHash: this.hashToken(accessToken),
          clientId,
          userId,
          expiresAt: accessExpiresAt,
        },
      }),
      this.prisma.oAuthRefreshToken.create({
        data: {
          tokenHash: this.hashToken(refreshToken),
          clientId,
          userId,
          expiresAt: refreshExpiresAt,
        },
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY_HOURS * 3600,
      tokenType: 'Bearer',
    };
  }

  async validateAccessToken(token: string): Promise<OAuthTokenUser> {
    const tokenHash = this.hashToken(token);

    const accessToken = await this.prisma.oAuthAccessToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            roleId: true,
          },
        },
      },
    });

    if (!accessToken) {
      throw new UnauthorizedException('Invalid access token');
    }

    if (accessToken.revokedAt) {
      throw new UnauthorizedException('Access token has been revoked');
    }

    if (accessToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Access token expired');
    }

    return {
      userId: accessToken.user.id,
      username: accessToken.user.username ?? '',
      email: accessToken.user.email ?? '',
      roleId: accessToken.user.roleId,
    };
  }

  async refreshTokens(
    refreshToken: string,
    clientId: string,
  ): Promise<OAuthTokenPair> {
    const tokenHash = this.hashToken(refreshToken);

    const result = await this.prisma.oAuthRefreshToken.updateMany({
      where: {
        tokenHash,
        clientId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { revokedAt: new Date() },
    });

    if (result.count === 0) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const existing = await this.prisma.oAuthRefreshToken.findUnique({
      where: { tokenHash },
    });

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.createTokens(clientId, existing.userId);
  }

  async revokeToken(
    token: string,
    tokenTypeHint: string | undefined,
    clientId: string,
  ): Promise<void> {
    const tokenHash = this.hashToken(token);

    if (
      tokenTypeHint === 'refresh_token' ||
      token.startsWith(REFRESH_TOKEN_PREFIX)
    ) {
      const revoked = await this.revokeRefreshTokenWithCascade(
        tokenHash,
        clientId,
      );
      if (revoked) {
        return;
      }
    }

    if (
      tokenTypeHint === 'access_token' ||
      token.startsWith(ACCESS_TOKEN_PREFIX)
    ) {
      await this.prisma.oAuthAccessToken.updateMany({
        where: { tokenHash, clientId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return;
    }

    const accessResult = await this.prisma.oAuthAccessToken.updateMany({
      where: { tokenHash, clientId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (accessResult.count === 0) {
      await this.revokeRefreshTokenWithCascade(tokenHash, clientId);
    }
  }

  private async revokeRefreshTokenWithCascade(
    tokenHash: string,
    clientId: string,
  ): Promise<boolean> {
    const result = await this.prisma.oAuthRefreshToken.updateMany({
      where: { tokenHash, clientId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (result.count === 0) {
      return false;
    }

    const refreshToken = await this.prisma.oAuthRefreshToken.findUnique({
      where: { tokenHash },
    });

    if (refreshToken) {
      await this.prisma.oAuthAccessToken.updateMany({
        where: {
          clientId: refreshToken.clientId,
          userId: refreshToken.userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }

    return true;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
