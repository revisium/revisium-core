import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { ApiKey, ApiKeyType } from 'src/__generated__/client';
import { ApiKeyScopeService } from 'src/features/api-key/api-key-scope.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

function createApiKey(overrides: Partial<ApiKey> = {}): ApiKey {
  return {
    id: 'key-1',
    prefix: 'rev_',
    keyHash: 'hash',
    type: ApiKeyType.SERVICE,
    name: 'Test Key',
    userId: null,
    serviceId: 'test-service',
    internalServiceName: null,
    organizationId: null,
    projectIds: [],
    branchNames: [],
    tableIds: [],
    permissions: null,
    readOnly: false,
    allowedIps: [],
    expiresAt: null,
    revokedAt: null,
    replacedById: null,
    lastUsedAt: null,
    lastUsedIp: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('ApiKeyScopeService', () => {
  let service: ApiKeyScopeService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApiKeyScopeService, PrismaService],
    }).compile();

    service = module.get<ApiKeyScopeService>(ApiKeyScopeService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('organization scope', () => {
    it('should allow when no org restriction', () => {
      const key = createApiKey({ organizationId: null });
      expect(service.validateScope(key, { organizationId: 'org-1' })).toBe(
        true,
      );
    });

    it('should allow matching org', () => {
      const key = createApiKey({ organizationId: 'org-1' });
      expect(service.validateScope(key, { organizationId: 'org-1' })).toBe(
        true,
      );
    });

    it('should deny non-matching org', () => {
      const key = createApiKey({ organizationId: 'org-1' });
      expect(service.validateScope(key, { organizationId: 'org-2' })).toBe(
        false,
      );
    });
  });

  describe('project scope', () => {
    it('should allow when no project restriction (empty array)', () => {
      const key = createApiKey({ projectIds: [] });
      expect(service.validateScope(key, { projectId: 'proj-1' })).toBe(true);
    });

    it('should allow matching project', () => {
      const key = createApiKey({ projectIds: ['proj-1', 'proj-2'] });
      expect(service.validateScope(key, { projectId: 'proj-1' })).toBe(true);
    });

    it('should deny non-matching project', () => {
      const key = createApiKey({ projectIds: ['proj-1'] });
      expect(service.validateScope(key, { projectId: 'proj-2' })).toBe(false);
    });
  });

  describe('branch scope', () => {
    it('should allow when no branch restriction', () => {
      const key = createApiKey({ branchNames: [] });
      expect(service.validateScope(key, { branchName: 'feature-x' })).toBe(
        true,
      );
    });

    it('should allow matching branch', () => {
      const key = createApiKey({ branchNames: ['master', 'staging'] });
      expect(service.validateScope(key, { branchName: 'master' })).toBe(true);
    });

    it('should deny non-matching branch', () => {
      const key = createApiKey({ branchNames: ['master'] });
      expect(service.validateScope(key, { branchName: 'develop' })).toBe(false);
    });

    it('should match with pre-resolved branch names', () => {
      const key = createApiKey({ branchNames: ['$default'] });
      const resolved = ['master'];

      expect(
        service.validateScope(key, { branchName: 'master' }, resolved),
      ).toBe(true);
      expect(
        service.validateScope(key, { branchName: 'develop' }, resolved),
      ).toBe(false);
    });
  });

  describe('table scope', () => {
    it('should allow when no table restriction', () => {
      const key = createApiKey({ tableIds: [] });
      expect(service.validateScope(key, { tableId: 'posts' })).toBe(true);
    });

    it('should allow matching table', () => {
      const key = createApiKey({ tableIds: ['posts', 'comments'] });
      expect(service.validateScope(key, { tableId: 'posts' })).toBe(true);
    });

    it('should deny non-matching table', () => {
      const key = createApiKey({ tableIds: ['posts'] });
      expect(service.validateScope(key, { tableId: 'users' })).toBe(false);
    });
  });

  describe('combined scopes', () => {
    it('should require all scopes to match', () => {
      const key = createApiKey({
        organizationId: 'org-1',
        projectIds: ['proj-1'],
        branchNames: ['master'],
        tableIds: ['posts'],
      });

      expect(
        service.validateScope(key, {
          organizationId: 'org-1',
          projectId: 'proj-1',
          branchName: 'master',
          tableId: 'posts',
        }),
      ).toBe(true);

      expect(
        service.validateScope(key, {
          organizationId: 'org-2',
          projectId: 'proj-1',
          branchName: 'master',
          tableId: 'posts',
        }),
      ).toBe(false);
    });

    it('should allow when request has no specific scope fields', () => {
      const key = createApiKey({
        organizationId: 'org-1',
        projectIds: ['proj-1'],
      });
      expect(service.validateScope(key, {})).toBe(true);
    });
  });

  describe('resolveBranchNames', () => {
    it('should resolve $default to root branch name', async () => {
      const orgId = nanoid();
      const projectId = nanoid();
      const branchId = nanoid();

      await prisma.organization.create({
        data: { id: orgId, createdId: orgId },
      });
      await prisma.project.create({
        data: { id: projectId, name: 'test', organizationId: orgId },
      });
      await prisma.branch.create({
        data: { id: branchId, name: 'master', projectId, isRoot: true },
      });

      const resolved = await service.resolveBranchNames(
        ['$default', 'staging'],
        projectId,
      );
      expect(resolved).toEqual(['master', 'staging']);
    });

    it('should return as-is when no $default token', async () => {
      const resolved = await service.resolveBranchNames(
        ['master', 'staging'],
        'any-project',
      );
      expect(resolved).toEqual(['master', 'staging']);
    });

    it('should filter out $default when root branch not found', async () => {
      const resolved = await service.resolveBranchNames(
        ['$default', 'staging'],
        'nonexistent-project',
      );
      expect(resolved).toEqual(['staging']);
    });
  });
});
