import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { nanoid } from 'nanoid';
import { PrismaClient } from 'src/__generated__/client';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

const TOKEN_PREFIX = 'ref_';
const TOKEN_BYTE_LENGTH = 36;
const DEFAULT_REFRESH_TTL_DAYS = 7;
const DEFAULT_GRACE_PERIOD_MS = 30_000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const MAX_IP_LENGTH = 64;
const MAX_USER_AGENT_LENGTH = 512;

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export type RefreshTokenMeta = {
  ip?: string;
  userAgent?: string;
};

export type RotateResult = {
  userId: string;
  newToken: string;
};

type RotateTxOutcome =
  | { kind: 'ok'; result: RotateResult }
  | { kind: 'reuse'; familyId: string; userId: string };

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
    const token = this.generateRawToken();
    const family = familyId ?? nanoid();

    await this.insertToken(this.prisma, {
      tokenHash: this.hashToken(token),
      userId,
      familyId: family,
      meta,
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

    if (storedToken.expiresAt < new Date() && !storedToken.revokedAt) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Run the whole rotate-or-detect-reuse flow inside one transaction so
    // the revoke+create pair (happy path) and the family-revoke (reuse
    // path) are atomic. We NEVER throw from inside the transaction — a
    // throw would roll back the family-revoke that reuse detection needs
    // to persist. Instead we return a discriminated union and throw
    // outside the transaction boundary once it has committed.
    const outcome = await this.prisma.$transaction(async (tx) => {
      if (storedToken.revokedAt) {
        return this.rotateOrDetectReuse(tx, storedToken, meta);
      }

      // Atomic revoke: `updateMany` with `revokedAt: null` in the WHERE
      // clause wins the race against concurrent rotations. If `count` is
      // 0 another caller already revoked this row between the read
      // above and this write, so we fall into the revoked handler with
      // the fresh DB state instead of minting a second sibling in the
      // family.
      const { count } = await tx.refreshToken.updateMany({
        where: { id: storedToken.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      if (count === 0) {
        const fresh = await tx.refreshToken.findUnique({
          where: { id: storedToken.id },
        });
        if (!fresh) {
          return null;
        }
        return this.rotateOrDetectReuse(tx, fresh, meta);
      }

      const newTokenValue = this.generateRawToken();
      await this.insertToken(tx, {
        tokenHash: this.hashToken(newTokenValue),
        userId: storedToken.userId,
        familyId: storedToken.familyId,
        meta,
      });
      return {
        kind: 'ok' as const,
        result: { userId: storedToken.userId, newToken: newTokenValue },
      };
    });

    if (outcome === null) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (outcome.kind === 'reuse') {
      this.logger.warn(
        `Refresh token reuse detected — revoking family ${outcome.familyId} for user ${this.redactUserId(outcome.userId)}. ip=${this.redactIp(meta?.ip)}`,
      );
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    return outcome.result;
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

  private generateRawToken(): string {
    return `${TOKEN_PREFIX}${randomBytes(TOKEN_BYTE_LENGTH).toString('hex')}`;
  }

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private sanitizeMeta(meta?: RefreshTokenMeta): {
    ip: string | null;
    userAgent: string | null;
  } {
    return {
      ip: meta?.ip ? meta.ip.slice(0, MAX_IP_LENGTH) : null,
      userAgent: meta?.userAgent
        ? meta.userAgent.slice(0, MAX_USER_AGENT_LENGTH)
        : null,
    };
  }

  private async insertToken(
    client: PrismaService | TransactionClient,
    args: {
      tokenHash: string;
      userId: string;
      familyId: string;
      meta?: RefreshTokenMeta;
    },
  ): Promise<void> {
    const sanitized = this.sanitizeMeta(args.meta);
    await client.refreshToken.create({
      data: {
        tokenHash: args.tokenHash,
        userId: args.userId,
        familyId: args.familyId,
        expiresAt: new Date(Date.now() + this.refreshTtlMs),
        ip: sanitized.ip,
        userAgent: sanitized.userAgent,
      },
    });
  }

  private redactUserId(userId: string): string {
    return createHash('sha256').update(userId).digest('hex').slice(0, 12);
  }

  private redactIp(ip: string | null | undefined): string {
    if (!ip) {
      return 'unknown';
    }
    const dotCount = (ip.match(/\./g) ?? []).length;
    if (dotCount === 3) {
      const lastDot = ip.lastIndexOf('.');
      return `${ip.slice(0, lastDot)}.*`;
    }
    return ip.slice(0, 24);
  }

  private async rotateOrDetectReuse(
    tx: TransactionClient,
    storedToken: {
      id: string;
      familyId: string;
      userId: string;
      revokedAt: Date | null;
    },
    meta?: RefreshTokenMeta,
  ): Promise<RotateTxOutcome> {
    if (storedToken.revokedAt) {
      const elapsed = Date.now() - storedToken.revokedAt.getTime();
      if (elapsed <= this.gracePeriodMs) {
        const latestToken = await tx.refreshToken.findFirst({
          where: { familyId: storedToken.familyId, revokedAt: null },
          orderBy: { createdAt: 'desc' },
        });

        if (latestToken) {
          const { count } = await tx.refreshToken.updateMany({
            where: { id: latestToken.id, revokedAt: null },
            data: { revokedAt: new Date() },
          });

          if (count > 0) {
            const newTokenValue = this.generateRawToken();
            await this.insertToken(tx, {
              tokenHash: this.hashToken(newTokenValue),
              userId: latestToken.userId,
              familyId: latestToken.familyId,
              meta,
            });
            return {
              kind: 'ok',
              result: {
                userId: latestToken.userId,
                newToken: newTokenValue,
              },
            };
          }
        }
      }
    }

    await tx.refreshToken.updateMany({
      where: { familyId: storedToken.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return {
      kind: 'reuse',
      familyId: storedToken.familyId,
      userId: storedToken.userId,
    };
  }
}
