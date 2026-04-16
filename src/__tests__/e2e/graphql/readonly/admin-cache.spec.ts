import { INestApplication } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { testCreateUser } from 'src/testing/factories/create-models';
import { gql } from 'src/testing/utils/gql';
import { UserSystemRoles } from 'src/features/auth/consts';
import { AuthService } from 'src/features/auth/auth.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  getTestApp,
  closeTestApp,
  getReadonlyFixture,
  gqlQuery,
  gqlQueryRaw,
  type PrepareDataReturnType,
} from 'src/testing/e2e';

describe('graphql - admin cache (readonly)', () => {
  let app: INestApplication;
  let fixture: PrepareDataReturnType;
  let prismaService: PrismaService;
  let authService: AuthService;

  beforeAll(async () => {
    app = await getTestApp();
    fixture = await getReadonlyFixture(app);
    prismaService = app.get(PrismaService);
    authService = app.get(AuthService);
  });

  afterAll(async () => {
    await closeTestApp();
  });

  const createAdminUser = async () => {
    const userId = nanoid();
    const user = await testCreateUser(prismaService, {
      id: userId,
      email: `admin-cache-${userId}@example.com`,
      username: `admin-cache-${userId}`,
      roleId: UserSystemRoles.systemAdmin,
    });
    const token = authService.login({
      username: user.username ?? '',
      sub: user.id,
    });
    return { user, token };
  };

  describe('adminCacheStats query', () => {
    const getQuery = () => ({
      query: gql`
        query adminCacheStats {
          adminCacheStats {
            totalHits
            totalMisses
            totalWrites
            totalDeletes
            totalClears
            overallHitRate
            byCategory {
              key
              hits
              misses
              writes
              deletes
              hitRate
            }
          }
        }
      `,
    });

    it('admin can get cache stats', async () => {
      const admin = await createAdminUser();

      const result = await gqlQuery({
        app,
        token: admin.token,
        ...getQuery(),
      });

      expect(result.adminCacheStats).toBeDefined();
      expect(typeof result.adminCacheStats.totalHits).toBe('number');
      expect(typeof result.adminCacheStats.totalMisses).toBe('number');
      expect(typeof result.adminCacheStats.totalWrites).toBe('number');
      expect(typeof result.adminCacheStats.totalDeletes).toBe('number');
      expect(typeof result.adminCacheStats.totalClears).toBe('number');
      expect(typeof result.adminCacheStats.overallHitRate).toBe('number');
      expect(Array.isArray(result.adminCacheStats.byCategory)).toBe(true);
    });

    it('returns consistent stats across calls', async () => {
      const admin = await createAdminUser();

      const first = await gqlQuery({
        app,
        token: admin.token,
        ...getQuery(),
      });

      const second = await gqlQuery({
        app,
        token: admin.token,
        ...getQuery(),
      });

      expect(second.adminCacheStats.totalHits).toBeGreaterThanOrEqual(
        first.adminCacheStats.totalHits,
      );
      expect(second.adminCacheStats.totalWrites).toBeGreaterThanOrEqual(
        first.adminCacheStats.totalWrites,
      );
    });

    it('regular user cannot access adminCacheStats', async () => {
      const result = await gqlQueryRaw({
        app,
        token: fixture.owner.token,
        ...getQuery(),
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toMatch(/not allowed/i);
    });

    it('unauthenticated cannot access adminCacheStats', async () => {
      const result = await gqlQueryRaw({
        app,
        ...getQuery(),
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toMatch(/Unauthorized/i);
    });
  });

  describe('adminResetAllCache mutation', () => {
    const getMutation = () => ({
      query: gql`
        mutation adminResetAllCache {
          adminResetAllCache
        }
      `,
    });

    it('admin can reset all cache', async () => {
      const admin = await createAdminUser();

      const result = await gqlQuery({
        app,
        token: admin.token,
        ...getMutation(),
      });

      expect(result.adminResetAllCache).toBe(true);
    });

    it('stats reset after clearing cache', async () => {
      const admin = await createAdminUser();

      const statsQuery = {
        query: gql`
          query adminCacheStats {
            adminCacheStats {
              totalHits
              totalMisses
            }
          }
        `,
      };

      await gqlQuery({ app, token: admin.token, ...statsQuery });
      await gqlQuery({ app, token: admin.token, ...statsQuery });

      await gqlQuery({ app, token: admin.token, ...getMutation() });

      const after = await gqlQuery({
        app,
        token: admin.token,
        ...statsQuery,
      });

      expect(after.adminCacheStats.totalHits).toBeLessThanOrEqual(2);
    });

    it('regular user cannot reset cache', async () => {
      const result = await gqlQueryRaw({
        app,
        token: fixture.owner.token,
        ...getMutation(),
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toMatch(/not allowed/i);
    });

    it('unauthenticated cannot reset cache', async () => {
      const result = await gqlQueryRaw({
        app,
        ...getMutation(),
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toMatch(/Unauthorized/i);
    });
  });
});
