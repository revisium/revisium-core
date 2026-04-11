import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash } from 'node:crypto';
import { nanoid } from 'nanoid';
import { testCreateUser } from 'src/__tests__/create-models';
import { RefreshTokenService } from 'src/features/auth/services/refresh-token.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('RefreshTokenService', () => {
  let module: TestingModule;
  let service: RefreshTokenService;
  let prisma: PrismaService;
  let userId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        PrismaService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'JWT_REFRESH_TOKEN_TTL_DAYS') {
                return '7';
              }
              if (key === 'JWT_REFRESH_GRACE_PERIOD_MS') {
                return '30000';
              }
              return undefined;
            },
          },
        },
      ],
    }).compile();

    service = module.get<RefreshTokenService>(RefreshTokenService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    userId = nanoid();
    await testCreateUser(prisma, { id: userId });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const hash = (raw: string) => createHash('sha256').update(raw).digest('hex');

  describe('createToken', () => {
    it('returns a ref_-prefixed token and stores the sha256 hash', async () => {
      const raw = await service.createToken(userId);

      expect(raw).toMatch(/^ref_[0-9a-f]{72}$/);

      const stored = await prisma.refreshToken.findUnique({
        where: { tokenHash: hash(raw) },
      });
      expect(stored).not.toBeNull();
      expect(stored!.userId).toBe(userId);
      expect(stored!.revokedAt).toBeNull();
      expect(stored!.familyId).toBeTruthy();
      expect(stored!.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('captures ip and user-agent metadata when provided', async () => {
      const raw = await service.createToken(userId, undefined, {
        ip: '10.0.0.1',
        userAgent: 'jest',
      });

      const stored = await prisma.refreshToken.findUnique({
        where: { tokenHash: hash(raw) },
      });
      expect(stored!.ip).toBe('10.0.0.1');
      expect(stored!.userAgent).toBe('jest');
    });

    it('reuses the familyId when one is provided', async () => {
      const familyId = nanoid();
      const raw = await service.createToken(userId, familyId);

      const stored = await prisma.refreshToken.findUnique({
        where: { tokenHash: hash(raw) },
      });
      expect(stored!.familyId).toBe(familyId);
    });
  });

  describe('rotateToken', () => {
    it('revokes the old token and issues a new one in the same family', async () => {
      const original = await service.createToken(userId);
      const familyBefore = await prisma.refreshToken.findUnique({
        where: { tokenHash: hash(original) },
      });

      const result = await service.rotateToken(original);

      expect(result.userId).toBe(userId);
      expect(result.newToken).not.toBe(original);
      expect(result.newToken).toMatch(/^ref_[0-9a-f]{72}$/);

      const oldAfter = await prisma.refreshToken.findUnique({
        where: { tokenHash: hash(original) },
      });
      expect(oldAfter!.revokedAt).not.toBeNull();

      const newStored = await prisma.refreshToken.findUnique({
        where: { tokenHash: hash(result.newToken) },
      });
      expect(newStored!.familyId).toBe(familyBefore!.familyId);
      expect(newStored!.revokedAt).toBeNull();
    });

    it('throws UnauthorizedException when the token is unknown', async () => {
      await expect(service.rotateToken('ref_unknown')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws when the refresh token has expired', async () => {
      const raw = await service.createToken(userId);
      await prisma.refreshToken.update({
        where: { tokenHash: hash(raw) },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await expect(service.rotateToken(raw)).rejects.toThrow(
        'Refresh token expired',
      );
    });
  });

  describe('reuse detection', () => {
    it('returns the same successor on grace-window replay (idempotent retry)', async () => {
      const original = await service.createToken(userId);
      const first = await service.rotateToken(original);

      // Replay the original — cache hit, should return the SAME successor
      // as the first rotation instead of rotating again. This protects
      // retry-on-network-blip callers: whichever 200 they read, it is
      // still the live token.
      const retry = await service.rotateToken(original);

      expect(retry.userId).toBe(userId);
      expect(retry.newToken).toBe(first.newToken);

      // The successor issued on the first rotation is still live.
      const stillLive = await prisma.refreshToken.findUnique({
        where: { tokenHash: hash(first.newToken) },
      });
      expect(stillLive!.revokedAt).toBeNull();
    });

    it('falls back to re-rotation when the grace cache is empty (multi-pod path)', async () => {
      const original = await service.createToken(userId);
      const first = await service.rotateToken(original);

      // Simulate a cache miss — the pod serving the replay is not the
      // one that minted the successor (or the cache entry was evicted).
      // The fallback path re-rotates from the family's latest live token.
      // This DOES invalidate the previous 200 response, which is a known
      // trade-off documented in docs/jwt-refresh.md for multi-pod
      // deployments without sticky sessions.
      (
        service as unknown as { gracePeriodReplayCache: Map<string, unknown> }
      ).gracePeriodReplayCache.clear();

      const retry = await service.rotateToken(original);
      expect(retry.newToken).not.toBe(first.newToken);

      const previousLive = await prisma.refreshToken.findUnique({
        where: { tokenHash: hash(first.newToken) },
      });
      expect(previousLive!.revokedAt).not.toBeNull();
    });

    it('fallback path caches the successor under the original token id (idempotent on second replay)', async () => {
      // Regression: cubic P1. The fallback path used to cache under
      // `latestToken.id` (the family's live descendant we were rotating
      // away from) instead of `storedToken.id` (the originally-presented
      // token). A second replay of the same raw cookie would therefore
      // always miss the cache and trigger yet another rotation,
      // defeating the idempotent-replay guarantee this cache provides.
      const original = await service.createToken(userId);
      const first = await service.rotateToken(original);

      // Force the fallback path once (cache miss).
      (
        service as unknown as { gracePeriodReplayCache: Map<string, unknown> }
      ).gracePeriodReplayCache.clear();
      const retryA = await service.rotateToken(original);
      expect(retryA.newToken).not.toBe(first.newToken);

      // Second replay of the same original — MUST now hit the cache
      // populated by retryA and return the SAME successor instead of
      // rotating a third time.
      const retryB = await service.rotateToken(original);
      expect(retryB.newToken).toBe(retryA.newToken);

      // retryA's successor is still live (not revoked by a third rotation).
      const stillLive = await prisma.refreshToken.findUnique({
        where: { tokenHash: hash(retryA.newToken) },
      });
      expect(stillLive!.revokedAt).toBeNull();
    });

    it('revokes the entire family when reuse happens outside the grace window', async () => {
      const original = await service.createToken(userId);
      const { newToken } = await service.rotateToken(original);

      // Backdate the original's revokedAt beyond the grace window. The
      // cache gate checks `now - storedToken.revokedAt <= gracePeriodMs`
      // against the DB value, so a fresh in-memory entry cannot shield
      // a long-dead token from reuse detection.
      await prisma.refreshToken.update({
        where: { tokenHash: hash(original) },
        data: { revokedAt: new Date(Date.now() - 60_000) },
      });

      await expect(service.rotateToken(original)).rejects.toThrow(
        'Refresh token reuse detected',
      );

      const afterLive = await prisma.refreshToken.findUnique({
        where: { tokenHash: hash(newToken) },
      });
      expect(afterLive!.revokedAt).not.toBeNull();
    });
  });

  describe('revocation', () => {
    it('revokeFamilyByRawToken revokes every live token in the family', async () => {
      const first = await service.createToken(userId);
      const firstRow = await prisma.refreshToken.findUnique({
        where: { tokenHash: hash(first) },
      });
      const second = await service.createToken(userId, firstRow!.familyId);

      await service.revokeFamilyByRawToken(first);

      const firstAfter = await prisma.refreshToken.findUnique({
        where: { tokenHash: hash(first) },
      });
      const secondAfter = await prisma.refreshToken.findUnique({
        where: { tokenHash: hash(second) },
      });
      expect(firstAfter!.revokedAt).not.toBeNull();
      expect(secondAfter!.revokedAt).not.toBeNull();
    });

    it('revokeFamilyByRawToken is a no-op for unknown tokens', async () => {
      await expect(
        service.revokeFamilyByRawToken('ref_unknown'),
      ).resolves.toBeUndefined();
    });

    it('revokeAllUserTokens revokes every live token for the user', async () => {
      const a = await service.createToken(userId);
      const b = await service.createToken(userId);

      await service.revokeAllUserTokens(userId);

      const aAfter = await prisma.refreshToken.findUnique({
        where: { tokenHash: hash(a) },
      });
      const bAfter = await prisma.refreshToken.findUnique({
        where: { tokenHash: hash(b) },
      });
      expect(aAfter!.revokedAt).not.toBeNull();
      expect(bAfter!.revokedAt).not.toBeNull();
    });

    it('revokeAllUserTokens does not touch other users', async () => {
      const otherUserId = nanoid();
      await testCreateUser(prisma, { id: otherUserId });
      const otherRaw = await service.createToken(otherUserId);

      await service.revokeAllUserTokens(userId);

      const otherAfter = await prisma.refreshToken.findUnique({
        where: { tokenHash: hash(otherRaw) },
      });
      expect(otherAfter!.revokedAt).toBeNull();
    });
  });
});
