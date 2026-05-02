import { AuthCacheService } from 'src/infrastructure/cache/services/auth-cache.service';
import { CacheService } from 'src/infrastructure/cache/services/cache.service';
import { AUTH_CACHE_TAGS } from 'src/infrastructure/cache/constants/auth-cache.constants';

describe('AuthCacheService - projectPermissionCheck', () => {
  let authCache: AuthCacheService;
  let cacheService: jest.Mocked<CacheService>;

  beforeEach(() => {
    cacheService = {
      getOrSet: jest
        .fn()
        .mockImplementation(async (opts: any) => opts.factory()),
      deleteByTag: jest.fn(),
      delete: jest.fn(),
    } as any;

    authCache = new AuthCacheService(cacheService);
  });

  describe('tagging with org+name input', () => {
    it('attaches PROJECT_PERMISSIONS tag when query has organizationId and projectName', async () => {
      await authCache.projectPermissionCheck(
        { organizationId: 'org-1', projectName: 'project-1', userId: 'user-1' },
        { organizationId: 'org-1', projectName: 'project-1' },
        jest.fn().mockResolvedValue(true),
      );

      const opts = cacheService.getOrSet.mock.calls[0][0];
      expect(opts.tags).toEqual(
        expect.arrayContaining([
          AUTH_CACHE_TAGS.AUTH_RELATIVES,
          AUTH_CACHE_TAGS.USER_PERMISSIONS('user-1'),
          AUTH_CACHE_TAGS.ORGANIZATION_PERMISSIONS('org-1'),
          AUTH_CACHE_TAGS.PROJECT_PERMISSIONS('org-1', 'project-1'),
        ]),
      );
    });
  });

  describe('tagging with revisionId input (regression: github.com/revisium/qa#21)', () => {
    it('attaches PROJECT_PERMISSIONS tag when revisionId is the only project identifier in the query but the resolved project is provided', async () => {
      await authCache.projectPermissionCheck(
        { revisionId: 'rev-abc', userId: 'user-1' },
        { organizationId: 'org-1', projectName: 'project-1' },
        jest.fn().mockResolvedValue(true),
      );

      const opts = cacheService.getOrSet.mock.calls[0][0];
      expect(opts.tags).toEqual(
        expect.arrayContaining([
          AUTH_CACHE_TAGS.PROJECT_PERMISSIONS('org-1', 'project-1'),
        ]),
      );
    });

    it('attaches ORGANIZATION_PERMISSIONS tag when revisionId is the only project identifier but the resolved project is provided', async () => {
      await authCache.projectPermissionCheck(
        { revisionId: 'rev-abc' },
        { organizationId: 'org-1', projectName: 'project-1' },
        jest.fn().mockResolvedValue(true),
      );

      const opts = cacheService.getOrSet.mock.calls[0][0];
      expect(opts.tags).toEqual(
        expect.arrayContaining([
          AUTH_CACHE_TAGS.ORGANIZATION_PERMISSIONS('org-1'),
          AUTH_CACHE_TAGS.PROJECT_PERMISSIONS('org-1', 'project-1'),
        ]),
      );
    });

    it('uses revisionId in cache key (so different revisions of the same project produce different cache entries)', async () => {
      const factory = jest.fn().mockResolvedValue(true);

      await authCache.projectPermissionCheck(
        { revisionId: 'rev-1', userId: 'user-1' },
        { organizationId: 'org-1', projectName: 'project-1' },
        factory,
      );
      await authCache.projectPermissionCheck(
        { revisionId: 'rev-2', userId: 'user-1' },
        { organizationId: 'org-1', projectName: 'project-1' },
        factory,
      );

      const key1 = cacheService.getOrSet.mock.calls[0][0].key;
      const key2 = cacheService.getOrSet.mock.calls[1][0].key;
      expect(key1).not.toBe(key2);
    });
  });

  describe('tagging with endpointId input', () => {
    it('attaches PROJECT_PERMISSIONS tag when endpointId is the only project identifier and the resolved project is provided', async () => {
      await authCache.projectPermissionCheck(
        { endpointId: 'ep-1', userId: 'user-1' },
        { organizationId: 'org-1', projectName: 'project-1' },
        jest.fn().mockResolvedValue(true),
      );

      const opts = cacheService.getOrSet.mock.calls[0][0];
      expect(opts.tags).toEqual(
        expect.arrayContaining([
          AUTH_CACHE_TAGS.PROJECT_PERMISSIONS('org-1', 'project-1'),
        ]),
      );
    });
  });

  describe('tagging with projectId input', () => {
    it('attaches PROJECT_PERMISSIONS tag when projectId is the only project identifier and the resolved project is provided', async () => {
      await authCache.projectPermissionCheck(
        { projectId: 'proj-1', userId: 'user-1' },
        { organizationId: 'org-1', projectName: 'project-1' },
        jest.fn().mockResolvedValue(true),
      );

      const opts = cacheService.getOrSet.mock.calls[0][0];
      expect(opts.tags).toEqual(
        expect.arrayContaining([
          AUTH_CACHE_TAGS.PROJECT_PERMISSIONS('org-1', 'project-1'),
        ]),
      );
    });
  });

  describe('tagging without resolved project (project not found)', () => {
    it('falls back to query-only tagging when resolvedProject is undefined', async () => {
      await authCache.projectPermissionCheck(
        { organizationId: 'org-1', projectName: 'project-1', userId: 'user-1' },
        undefined,
        jest.fn().mockResolvedValue(true),
      );

      const opts = cacheService.getOrSet.mock.calls[0][0];
      expect(opts.tags).toEqual(
        expect.arrayContaining([
          AUTH_CACHE_TAGS.PROJECT_PERMISSIONS('org-1', 'project-1'),
        ]),
      );
    });
  });
});
