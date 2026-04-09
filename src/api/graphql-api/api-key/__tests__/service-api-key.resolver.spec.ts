import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { testCreateUser } from 'src/__tests__/create-models';
import { ApiKeyApiService } from 'src/features/api-key/api-key-api.service';
import { ApiKeyService } from 'src/features/api-key/api-key.service';
import { CreateApiKeyHandler } from 'src/features/api-key/commands/handlers';
import { RevokeApiKeyHandler } from 'src/features/api-key/commands/handlers';
import { RotateApiKeyHandler } from 'src/features/api-key/commands/handlers';
import { GetApiKeyByIdHandler } from 'src/features/api-key/queries/handlers';
import { GetApiKeysHandler } from 'src/features/api-key/queries/handlers';
import { CaslAbilityFactory } from 'src/features/auth/casl-ability.factory';
import {
  CheckOrganizationPermissionHandler,
  CheckProjectPermissionHandler,
} from 'src/features/auth/commands/handlers';
import {
  UserOrganizationRoles,
  UserProjectRoles,
  UserSystemRoles,
} from 'src/features/auth/consts';
import { RevisiumCacheModule } from 'src/infrastructure/cache';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('ApiKeyApiService - Service Keys', () => {
  let service: ApiKeyApiService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule, RevisiumCacheModule.forRootAsync()],
      providers: [
        ApiKeyApiService,
        ApiKeyService,
        CreateApiKeyHandler,
        RevokeApiKeyHandler,
        RotateApiKeyHandler,
        GetApiKeyByIdHandler,
        GetApiKeysHandler,
        CheckOrganizationPermissionHandler,
        CheckProjectPermissionHandler,
        CaslAbilityFactory,
        PrismaService,
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();

    await module.init();

    service = module.get(ApiKeyApiService);
    prisma = module.get(PrismaService);

    await seedManageApiKeyPermission(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const createOrg = async () => {
    const orgId = nanoid();
    await prisma.organization.create({
      data: { id: orgId, createdId: nanoid() },
    });
    return orgId;
  };

  const createOrgUser = async (
    orgId: string,
    roleId: string,
    systemRoleId = UserSystemRoles.systemUser,
  ) => {
    const userId = nanoid();
    await testCreateUser(prisma, { id: userId, roleId: systemRoleId });
    await prisma.userOrganization.create({
      data: {
        id: nanoid(),
        organizationId: orgId,
        userId,
        roleId,
      },
    });
    return userId;
  };

  const createProject = async (orgId: string, name?: string) => {
    const projectName = name ?? `project-${nanoid(6)}`;
    const project = await prisma.project.create({
      data: {
        id: nanoid(),
        name: projectName,
        organizationId: orgId,
      },
    });
    return project;
  };

  const assignProjectRole = async (
    projectId: string,
    userId: string,
    roleId: string,
  ) => {
    await prisma.userProject.create({
      data: {
        id: nanoid(),
        projectId,
        userId,
        roleId,
      },
    });
  };

  const validPermissions = {
    rules: [{ action: ['read'], subject: ['Row'] }],
  };

  describe('createServiceApiKey', () => {
    it('should create a service key when user is org owner', async () => {
      const orgId = await createOrg();
      const ownerId = await createOrgUser(
        orgId,
        UserOrganizationRoles.organizationOwner,
      );

      const result = await service.createServiceApiKey({
        name: 'Service Key',
        userId: ownerId,
        organizationId: orgId,
        permissions: validPermissions,
      });

      expect(result.key).toMatch(/^rev_[A-Za-z0-9_-]{22}$/);
      expect(result.id).toBeDefined();

      const stored = await prisma.apiKey.findUnique({
        where: { id: result.id },
      });
      expect(stored!.type).toBe('SERVICE');
      expect(stored!.organizationId).toBe(orgId);
      expect(stored!.permissions).toEqual(validPermissions);
      expect(stored!.serviceId).toBeDefined();
    });

    it('should create a service key when user is org admin', async () => {
      const orgId = await createOrg();
      const adminId = await createOrgUser(
        orgId,
        UserOrganizationRoles.organizationAdmin,
      );

      const result = await service.createServiceApiKey({
        name: 'Admin Service Key',
        userId: adminId,
        organizationId: orgId,
        permissions: validPermissions,
      });

      expect(result.id).toBeDefined();
    });

    it('should create a service key when user is system admin', async () => {
      const orgId = await createOrg();
      const sysAdminId = nanoid();
      await testCreateUser(prisma, {
        id: sysAdminId,
        roleId: UserSystemRoles.systemAdmin,
      });

      const result = await service.createServiceApiKey({
        name: 'SysAdmin Service Key',
        userId: sysAdminId,
        organizationId: orgId,
        permissions: validPermissions,
      });

      expect(result.id).toBeDefined();
    });

    it('should allow developer with org membership to create org-wide service key', async () => {
      const orgId = await createOrg();
      const devId = await createOrgUser(orgId, UserOrganizationRoles.developer);

      const result = await service.createServiceApiKey({
        name: 'Developer Org Key',
        userId: devId,
        organizationId: orgId,
        permissions: validPermissions,
      });

      expect(result.id).toBeDefined();
    });

    it('should reject when user is not a member of the org', async () => {
      const orgId = await createOrg();
      const otherOrgId = await createOrg();
      const ownerId = await createOrgUser(
        otherOrgId,
        UserOrganizationRoles.organizationOwner,
      );

      await expect(
        service.createServiceApiKey({
          name: 'Cross-Org Key',
          userId: ownerId,
          organizationId: orgId,
          permissions: validPermissions,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow developer to create project-scoped service key', async () => {
      const orgId = await createOrg();
      const devId = await createOrgUser(orgId, UserOrganizationRoles.developer);
      const project = await createProject(orgId);
      await assignProjectRole(project.id, devId, UserProjectRoles.developer);

      const result = await service.createServiceApiKey({
        name: 'Project Scoped Key',
        userId: devId,
        organizationId: orgId,
        projectIds: [project.id],
        permissions: validPermissions,
      });

      expect(result.id).toBeDefined();

      const stored = await prisma.apiKey.findUnique({
        where: { id: result.id },
      });
      expect(stored!.projectIds).toEqual([project.id]);
    });

    it('should reject editor creating project-scoped key (no manage-api-key)', async () => {
      const orgId = await createOrg();
      const editorId = await createOrgUser(orgId, UserOrganizationRoles.editor);
      const project = await createProject(orgId);
      await assignProjectRole(project.id, editorId, UserProjectRoles.editor);

      await expect(
        service.createServiceApiKey({
          name: 'Unauthorized Project Key',
          userId: editorId,
          organizationId: orgId,
          projectIds: [project.id],
          permissions: validPermissions,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject editor creating project-scoped service key', async () => {
      const orgId = await createOrg();
      const editorId = await createOrgUser(orgId, UserOrganizationRoles.editor);
      const project = await createProject(orgId);
      await assignProjectRole(project.id, editorId, UserProjectRoles.editor);

      await expect(
        service.createServiceApiKey({
          name: 'Editor Key',
          userId: editorId,
          organizationId: orgId,
          projectIds: [project.id],
          permissions: validPermissions,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject reader creating project-scoped service key', async () => {
      const orgId = await createOrg();
      const readerId = await createOrgUser(orgId, UserOrganizationRoles.reader);
      const project = await createProject(orgId);
      await assignProjectRole(project.id, readerId, UserProjectRoles.reader);

      await expect(
        service.createServiceApiKey({
          name: 'Reader Key',
          userId: readerId,
          organizationId: orgId,
          projectIds: [project.id],
          permissions: validPermissions,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow org admin to create project-scoped service key', async () => {
      const orgId = await createOrg();
      const adminId = await createOrgUser(
        orgId,
        UserOrganizationRoles.organizationAdmin,
      );
      const project = await createProject(orgId);

      const result = await service.createServiceApiKey({
        name: 'Admin Project Key',
        userId: adminId,
        organizationId: orgId,
        projectIds: [project.id],
        permissions: validPermissions,
      });

      expect(result.id).toBeDefined();
    });
  });

  describe('getServiceApiKeys', () => {
    it('should list service keys for org admin', async () => {
      const orgId = await createOrg();
      const ownerId = await createOrgUser(
        orgId,
        UserOrganizationRoles.organizationOwner,
      );

      await service.createServiceApiKey({
        name: 'Key Alpha',
        userId: ownerId,
        organizationId: orgId,
        permissions: validPermissions,
      });

      await service.createServiceApiKey({
        name: 'Key Beta',
        userId: ownerId,
        organizationId: orgId,
        permissions: validPermissions,
      });

      const keys = await service.getServiceApiKeys(orgId, ownerId);
      expect(keys.length).toBeGreaterThanOrEqual(2);
      const names = keys.map((k) => k.name);
      expect(names).toContain('Key Alpha');
      expect(names).toContain('Key Beta');
    });

    it('should reject listing for non-admin', async () => {
      const orgId = await createOrg();
      const readerId = await createOrgUser(orgId, UserOrganizationRoles.reader);

      await expect(service.getServiceApiKeys(orgId, readerId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow listing for developer with org membership', async () => {
      const orgId = await createOrg();
      const devId = await createOrgUser(orgId, UserOrganizationRoles.developer);

      const keys = await service.getServiceApiKeys(orgId, devId);
      expect(keys).toBeDefined();
    });
  });

  describe('revokeApiKey - service keys', () => {
    it('should allow org admin to revoke a service key', async () => {
      const orgId = await createOrg();
      const ownerId = await createOrgUser(
        orgId,
        UserOrganizationRoles.organizationOwner,
      );

      const created = await service.createServiceApiKey({
        name: 'To Revoke',
        userId: ownerId,
        organizationId: orgId,
        permissions: validPermissions,
      });

      await service.revokeApiKey(created.id, ownerId);

      const stored = await prisma.apiKey.findUnique({
        where: { id: created.id },
      });
      expect(stored!.revokedAt).not.toBeNull();
    });

    it('should reject revoke by reader (no manage-api-key)', async () => {
      const orgId = await createOrg();
      const ownerId = await createOrgUser(
        orgId,
        UserOrganizationRoles.organizationOwner,
      );
      const readerId = await createOrgUser(orgId, UserOrganizationRoles.reader);

      const created = await service.createServiceApiKey({
        name: 'Not Yours',
        userId: ownerId,
        organizationId: orgId,
        permissions: validPermissions,
      });

      await expect(service.revokeApiKey(created.id, readerId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject revoke by admin of another org', async () => {
      const orgA = await createOrg();
      const orgB = await createOrg();
      const ownerA = await createOrgUser(
        orgA,
        UserOrganizationRoles.organizationOwner,
      );
      const ownerB = await createOrgUser(
        orgB,
        UserOrganizationRoles.organizationOwner,
      );

      const created = await service.createServiceApiKey({
        name: 'Org A Key',
        userId: ownerA,
        organizationId: orgA,
        permissions: validPermissions,
      });

      await expect(service.revokeApiKey(created.id, ownerB)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow developer to revoke project-scoped key they created', async () => {
      const orgId = await createOrg();
      const devId = await createOrgUser(orgId, UserOrganizationRoles.developer);
      const project = await createProject(orgId);
      await assignProjectRole(project.id, devId, UserProjectRoles.developer);

      const created = await service.createServiceApiKey({
        name: 'Dev Project Key',
        userId: devId,
        organizationId: orgId,
        projectIds: [project.id],
        permissions: validPermissions,
      });

      await service.revokeApiKey(created.id, devId);

      const stored = await prisma.apiKey.findUnique({
        where: { id: created.id },
      });
      expect(stored!.revokedAt).not.toBeNull();
    });
  });

  describe('rotateApiKey - service keys', () => {
    it('should allow org admin to rotate a service key', async () => {
      const orgId = await createOrg();
      const ownerId = await createOrgUser(
        orgId,
        UserOrganizationRoles.organizationOwner,
      );

      const original = await service.createServiceApiKey({
        name: 'To Rotate',
        userId: ownerId,
        organizationId: orgId,
        permissions: validPermissions,
      });

      const rotated = await service.rotateApiKey(original.id, ownerId);

      expect(rotated.id).not.toBe(original.id);
      expect(rotated.key).toMatch(/^rev_[A-Za-z0-9_-]{22}$/);
    });

    it('should reject rotate by non-admin', async () => {
      const orgId = await createOrg();
      const ownerId = await createOrgUser(
        orgId,
        UserOrganizationRoles.organizationOwner,
      );
      const readerId = await createOrgUser(orgId, UserOrganizationRoles.reader);

      const created = await service.createServiceApiKey({
        name: 'Not Yours',
        userId: ownerId,
        organizationId: orgId,
        permissions: validPermissions,
      });

      await expect(service.rotateApiKey(created.id, readerId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getApiKeyById - service keys', () => {
    it('should allow org admin to get service key by id', async () => {
      const orgId = await createOrg();
      const ownerId = await createOrgUser(
        orgId,
        UserOrganizationRoles.organizationOwner,
      );

      const created = await service.createServiceApiKey({
        name: 'Get Me',
        userId: ownerId,
        organizationId: orgId,
        permissions: validPermissions,
      });

      const key = await service.getApiKeyById(created.id, ownerId);
      expect(key.id).toBe(created.id);
      expect(key.name).toBe('Get Me');
    });

    it('should reject access by reader (no manage-api-key)', async () => {
      const orgId = await createOrg();
      const ownerId = await createOrgUser(
        orgId,
        UserOrganizationRoles.organizationOwner,
      );
      const readerId = await createOrgUser(orgId, UserOrganizationRoles.reader);

      const created = await service.createServiceApiKey({
        name: 'Not Yours',
        userId: ownerId,
        organizationId: orgId,
        permissions: validPermissions,
      });

      await expect(service.getApiKeyById(created.id, readerId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow developer to access project-scoped key', async () => {
      const orgId = await createOrg();
      const devId = await createOrgUser(orgId, UserOrganizationRoles.developer);
      const project = await createProject(orgId);
      await assignProjectRole(project.id, devId, UserProjectRoles.developer);

      const created = await service.createServiceApiKey({
        name: 'Dev Accessible Key',
        userId: devId,
        organizationId: orgId,
        projectIds: [project.id],
        permissions: validPermissions,
      });

      const key = await service.getApiKeyById(created.id, devId);
      expect(key.id).toBe(created.id);
    });
  });
});

async function seedManageApiKeyPermission(prisma: PrismaService) {
  await prisma.permission.upsert({
    where: { id: 'manage-api-key' },
    create: {
      id: 'manage-api-key',
      action: 'manage',
      subject: 'ApiKey',
      condition: {},
    },
    update: { action: 'manage', subject: 'ApiKey' },
  });

  const rolesWithPermission = [
    'organizationOwner',
    'organizationAdmin',
    'developer',
    'systemAdmin',
  ];

  const rolesWithoutPermission = ['editor', 'reader'];

  for (const roleId of rolesWithPermission) {
    await prisma.role
      .update({
        where: { id: roleId },
        data: {
          permissions: { connect: { id: 'manage-api-key' } },
        },
      })
      .catch(() => {
        // Role may not exist in test DB — skip
      });
  }

  for (const roleId of rolesWithoutPermission) {
    await prisma.role
      .update({
        where: { id: roleId },
        data: {
          permissions: { disconnect: { id: 'manage-api-key' } },
        },
      })
      .catch(() => {
        // Role may not exist in test DB — skip
      });
  }
}
