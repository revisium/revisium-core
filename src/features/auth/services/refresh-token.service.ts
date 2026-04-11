import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { nanoid } from 'nanoid';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

const TOKEN_PREFIX = 'ref_';
const TOKEN_BYTE_LENGTH = 36;
const DEFAULT_REFRESH_TTL_DAYS = 7;
const DEFAULT_GRACE_PERIOD_MS = 30_000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type RefreshTokenMeta = {
  ip?: string;
  userAgent?: string;
};

export type RotateResult = {
  userId: string;
  newToken: string;
};

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);
  private readonly refreshTtlMs: number;
  private readonly gracePeriodMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const ttlDays =
      Number(this.configService.get<string>('JWT_REFRESH_TOKEN_TTL_DAYS')) ||
      DEFAULT_REFRESH_TTL_DAYS;
    this.refreshTtlMs = ttlDays * MS_PER_DAY;
    this.gracePeriodMs =
      Number(this.configService.get<string>('JWT_REFRESH_GRACE_PERIOD_MS')) ||
      DEFAULT_GRACE_PERIOD_MS;
  }

  public async createToken(
    userId: string,
    familyId?: string,
    meta?: RefreshTokenMeta,
  ): Promise<string> {
    const token = `${TOKEN_PREFIX}${randomBytes(TOKEN_BYTE_LENGTH).toString('hex')}`;
    const tokenHash = this.hashToken(token);
    const family = familyId ?? nanoid();

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        familyId: family,
        expiresAt: new Date(Date.now() + this.refreshTtlMs),
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      },
    });

    return token;
  }

  public async rotateToken(
    rawToken: string,
    meta?: RefreshTokenMeta,
  ): Promise<RotateResult> {
    const tokenHash = this.hashToken(rawToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.revokedAt) {
      return this.handleRevokedToken(storedToken, meta);
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const newToken = await this.createToken(
      storedToken.userId,
      storedToken.familyId,
      meta,
    );
    return { userId: storedToken.userId, newToken };
  }

  public async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  public async revokeFamilyByRawToken(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (stored) {
      await this.revokeFamily(stored.familyId);
    }
  }

  public async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private async handleRevokedToken(
    storedToken: {
      id: string;
      familyId: string;
      userId: string;
      revokedAt: Date | null;
    },
    meta?: RefreshTokenMeta,
  ): Promise<RotateResult> {
    if (storedToken.revokedAt) {
      const elapsed = Date.now() - storedToken.revokedAt.getTime();
      if (elapsed <= this.gracePeriodMs) {
        const latestToken = await this.prisma.refreshToken.findFirst({
          where: { familyId: storedToken.familyId, revokedAt: null },
          orderBy: { createdAt: 'desc' },
        });

        if (latestToken) {
          await this.prisma.refreshToken.update({
            where: { id: latestToken.id },
            data: { revokedAt: new Date() },
          });

          const newToken = await this.createToken(
            latestToken.userId,
            latestToken.familyId,
            meta,
          );
          return { userId: latestToken.userId, newToken };
        }
      }
    }

    this.logger.warn(
      `Refresh token reuse detected — revoking family ${storedToken.familyId} for user ${storedToken.userId}. ip=${meta?.ip ?? 'unknown'} userAgent=${meta?.userAgent ?? 'unknown'}`,
    );

    await this.revokeFamily(storedToken.familyId);
    throw new UnauthorizedException('Refresh token reuse detected');
  }
}
