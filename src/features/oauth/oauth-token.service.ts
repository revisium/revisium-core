import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

const ACCESS_TOKEN_PREFIX = 'oat_';
const REFRESH_TOKEN_PREFIX = 'ort_';
const ACCESS_TOKEN_EXPIRY_HOURS = 1;
const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const DEFAULT_MCP_ACCESS_TOKEN_EXPIRY_DAYS = 30;
const MCP_REFRESH_TOKEN_EXPIRY_DAYS = 90;

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
  private readonly mcpAccessTokenExpiryDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const parsed = Number.parseInt(
      this.configService.get<string>('MCP_ACCESS_TOKEN_EXPIRY_DAYS') ?? '',
      10,
    );
    this.mcpAccessTokenExpiryDays =
      parsed > 0 ? parsed : DEFAULT_MCP_ACCESS_TOKEN_EXPIRY_DAYS;
  }

  async createTokens(
    clientId: string,
    userId: string,
    scope?: string,
  ): Promise<OAuthTokenPair> {
    const accessToken = ACCESS_TOKEN_PREFIX + randomBytes(36).toString('hex');
    const refreshToken = REFRESH_TOKEN_PREFIX + randomBytes(36).toString('hex');

    const isMcpScope = scope?.split(' ').includes('mcp') ?? false;
    const accessExpiresAt = new Date();

    if (isMcpScope) {
      accessExpiresAt.setDate(
        accessExpiresAt.getDate() + this.mcpAccessTokenExpiryDays,
      );
    } else {
      accessExpiresAt.setHours(
        accessExpiresAt.getHours() + ACCESS_TOKEN_EXPIRY_HOURS,
      );
    }

    const refreshExpiryDays = isMcpScope
      ? MCP_REFRESH_TOKEN_EXPIRY_DAYS
      : REFRESH_TOKEN_EXPIRY_DAYS;
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + refreshExpiryDays);

    const expiresIn = isMcpScope
      ? this.mcpAccessTokenExpiryDays * 86400
      : ACCESS_TOKEN_EXPIRY_HOURS * 3600;

    await this.prisma.$transaction([
      this.prisma.oAuthAccessToken.create({
        data: {
          tokenHash: this.hashToken(accessToken),
          clientId,
          userId,
          scope: scope ?? null,
          expiresAt: accessExpiresAt,
        },
      }),
      this.prisma.oAuthRefreshToken.create({
        data: {
          tokenHash: this.hashToken(refreshToken),
          clientId,
          userId,
          scope: scope ?? null,
          expiresAt: refreshExpiresAt,
        },
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn,
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

    return this.createTokens(
      clientId,
      existing.userId,
      existing.scope ?? undefined,
    );
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
      await this.revokeAccessToken(tokenHash, clientId);
      return;
    }

    const accessResult = await this.revokeAccessToken(tokenHash, clientId);

    if (accessResult.count === 0) {
      await this.revokeRefreshTokenWithCascade(tokenHash, clientId);
    }
  }

  private async revokeAccessToken(tokenHash: string, clientId: string) {
    return this.prisma.oAuthAccessToken.updateMany({
      where: { tokenHash, clientId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeRefreshTokenWithCascade(
    tokenHash: string,
    clientId: string,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.oAuthRefreshToken.updateMany({
        where: { tokenHash, clientId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      if (result.count === 0) {
        return false;
      }

      const refreshToken = await tx.oAuthRefreshToken.findUnique({
        where: { tokenHash },
      });

      if (refreshToken) {
        await tx.oAuthAccessToken.updateMany({
          where: {
            clientId: refreshToken.clientId,
            userId: refreshToken.userId,
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });
      }

      return true;
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
