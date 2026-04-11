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
  | {
      kind: 'ok';
      result: RotateResult;
      // The storedToken.id we just revoked on the happy path. Used to
      // populate the grace-window replay cache *after* the transaction
      // commits, so legitimate retries of the same raw token within
      // the grace window get back the SAME successor instead of
      // triggering a second rotation that invalidates the first 200.
      predecessorId: string;
    }
  | { kind: 'reuse'; familyId: string; userId: string };

type GraceCacheEntry = {
  rawToken: string;
  userId: string;
  expiresAt: number;
};

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);
  private readonly refreshTtlMs: number;
  private readonly gracePeriodMs: number;
  // In-memory map from the revoked token's DB id → the raw successor
  // token we just minted. Entries expire after `gracePeriodMs` so the
  // cache tracks the same window we allow legitimate replay in. Single-
  // pod best-effort: a multi-pod cluster with no sticky sessions falls
  // through to the fallback rotation path on cache miss (documented).
  private readonly gracePeriodReplayCache = new Map<string, GraceCacheEntry>();

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

    // Idempotent replay inside the grace window: if this exact raw token
    // was already rotated and the successor still lives in our in-memory
    // cache, hand back that same successor. This protects retry-on-network-
    // blip callers — the client re-sends the same rev_rt cookie and gets
    // back the SAME new token it should have gotten the first time,
    // instead of triggering a second rotation that invalidates the first
    // 200 response. Only the pod that minted the successor has the raw
    // value (raw tokens are never persisted); on a cache miss (multi-pod
    // routing, pod restart, eviction) we fall through to the regular
    // rotate-or-detect-reuse path. The cache hit is also gated on the
    // DB-side `revokedAt` still being inside the grace window, so a
    // fresh in-memory entry cannot override a token that the DB says
    // was revoked too long ago.
    if (storedToken.revokedAt) {
      const elapsedSinceRevoke = Date.now() - storedToken.revokedAt.getTime();
      if (elapsedSinceRevoke <= this.gracePeriodMs) {
        const cached = this.peekGraceCache(storedToken.id);
        if (cached) {
          return { userId: cached.userId, newToken: cached.rawToken };
        }
      }
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
        predecessorId: storedToken.id,
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
    this.writeGraceCache(outcome.predecessorId, {
      rawToken: outcome.result.newToken,
      userId: outcome.result.userId,
      expiresAt: Date.now() + this.gracePeriodMs,
    });
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
        // Fallback grace-window path (cache miss: multi-pod routing,
        // pod restart, or eviction). We cannot return the successor raw
        // value — it was only held by the pod that minted it and it is
        // gone now. The next-best thing is to rotate from the family's
        // current live descendant. This DOES invalidate the previous
        // 200 response; retry idempotence for multi-pod replay requires
        // either sticky sessions or an external cache (redis). Document
        // the trade-off in docs/jwt-refresh.md.
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
            // Cache keyed by the ORIGINALLY-PRESENTED token's id, not
            // the family's live descendant. A client replaying the same
            // raw refresh cookie will look up `storedToken.id` on the
            // next call, so the cache entry must live under that key or
            // the idempotent-replay behavior is defeated.
            return {
              kind: 'ok',
              result: {
                userId: latestToken.userId,
                newToken: newTokenValue,
              },
              predecessorId: storedToken.id,
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

  private peekGraceCache(predecessorId: string): GraceCacheEntry | null {
    const entry = this.gracePeriodReplayCache.get(predecessorId);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt <= Date.now()) {
      this.gracePeriodReplayCache.delete(predecessorId);
      return null;
    }
    return entry;
  }

  private writeGraceCache(predecessorId: string, entry: GraceCacheEntry): void {
    this.pruneGraceCache();
    this.gracePeriodReplayCache.set(predecessorId, entry);
  }

  private pruneGraceCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.gracePeriodReplayCache) {
      if (entry.expiresAt <= now) {
        this.gracePeriodReplayCache.delete(key);
      }
    }
  }
}
