import { CommandBus } from '@nestjs/cqrs';
import { AuthApiService } from 'src/features/auth/commands/auth-api.service';
import { AuthService } from 'src/features/auth/auth.service';
import { AuthCacheService } from 'src/infrastructure/cache/services/auth-cache.service';

describe('AuthApiService - checkProjectPermission resolution', () => {
  let service: AuthApiService;
  let commandBus: jest.Mocked<CommandBus>;
  let authCache: jest.Mocked<AuthCacheService>;
  let authService: jest.Mocked<AuthService>;
  let prisma: any;

  beforeEach(() => {
    commandBus = { execute: jest.fn().mockResolvedValue(true) } as any;

    authCache = {
      projectPermissionCheck: jest
        .fn()
        .mockImplementation(async (_query, _resolved, factory) => factory()),
      projectIdentity: jest
        .fn()
        .mockImplementation(async (_query, factory) => factory()),
    } as any;

    authService = {} as any;

    prisma = {
      revision: {
        findUnique: jest.fn(),
      },
      endpoint: {
        findUnique: jest.fn(),
      },
      project: {
        findUnique: jest.fn(),
      },
    };

    service = new AuthApiService(commandBus, authCache, authService, prisma);
  });

  it('passes the resolved project tag straight through when query already has organizationId and projectName', async () => {
    await service.checkProjectPermission({
      permissions: [{ action: 'read', subject: 'Project' }] as any,
      organizationId: 'org-1',
      projectName: 'project-1',
      userId: 'user-1',
    });

    expect(authCache.projectPermissionCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        projectName: 'project-1',
      }),
      { organizationId: 'org-1', projectName: 'project-1' },
      expect.any(Function),
    );
    expect(prisma.revision.findUnique).not.toHaveBeenCalled();
    expect(prisma.endpoint.findUnique).not.toHaveBeenCalled();
  });

  it('resolves project identity from revisionId before calling the cache', async () => {
    prisma.revision.findUnique.mockResolvedValue({
      branch: {
        project: {
          organizationId: 'org-1',
          name: 'project-1',
        },
      },
    });

    await service.checkProjectPermission({
      permissions: [{ action: 'read', subject: 'Project' }] as any,
      revisionId: 'rev-1',
    });

    expect(prisma.revision.findUnique).toHaveBeenCalledWith({
      where: { id: 'rev-1' },
      select: {
        branch: {
          select: {
            project: {
              select: { organizationId: true, name: true },
            },
          },
        },
      },
    });

    expect(authCache.projectPermissionCheck).toHaveBeenCalledWith(
      expect.objectContaining({ revisionId: 'rev-1' }),
      { organizationId: 'org-1', projectName: 'project-1' },
      expect.any(Function),
    );
  });

  it('resolves project identity from endpointId before calling the cache', async () => {
    prisma.endpoint.findUnique.mockResolvedValue({
      revision: {
        branch: {
          project: {
            organizationId: 'org-1',
            name: 'project-1',
          },
        },
      },
    });

    await service.checkProjectPermission({
      permissions: [{ action: 'read', subject: 'Project' }] as any,
      endpointId: 'ep-1',
    });

    expect(authCache.projectPermissionCheck).toHaveBeenCalledWith(
      expect.objectContaining({ endpointId: 'ep-1' }),
      { organizationId: 'org-1', projectName: 'project-1' },
      expect.any(Function),
    );
  });

  it('resolves project identity from projectId before calling the cache', async () => {
    prisma.project.findUnique.mockResolvedValue({
      organizationId: 'org-1',
      name: 'project-1',
    });

    await service.checkProjectPermission({
      permissions: [{ action: 'read', subject: 'Project' }] as any,
      projectId: 'proj-1',
    });

    expect(authCache.projectPermissionCheck).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'proj-1' }),
      { organizationId: 'org-1', projectName: 'project-1' },
      expect.any(Function),
    );
  });

  it('passes undefined resolved project when revisionId does not resolve to any project', async () => {
    prisma.revision.findUnique.mockResolvedValue(null);

    await service.checkProjectPermission({
      permissions: [{ action: 'read', subject: 'Project' }] as any,
      revisionId: 'rev-missing',
    });

    expect(authCache.projectPermissionCheck).toHaveBeenCalledWith(
      expect.objectContaining({ revisionId: 'rev-missing' }),
      undefined,
      expect.any(Function),
    );
  });
});
