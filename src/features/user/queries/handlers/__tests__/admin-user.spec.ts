import { NotFoundException } from '@nestjs/common';
import { CqrsModule, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { testCreateUser } from 'src/__tests__/create-models';
import { UserSystemRoles } from 'src/features/auth/consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  AdminUserQuery,
  AdminUserQueryReturnType,
} from 'src/features/user/queries/impl';
import { AdminUserHandler } from 'src/features/user/queries/handlers/admin-user.handler';

describe('AdminUserHandler', () => {
  describe('get user by id', () => {
    it('should return user when user exists', async () => {
      const userId = nanoid();
      await testCreateUser(prismaService, {
        id: userId,
        email: `admin-get-user-${userId}@example.com`,
        username: `admin-get-user-${userId}`,
      });

      const query = createQuery({ userId });
      const result = await queryBus.execute<
        AdminUserQuery,
        AdminUserQueryReturnType
      >(query);

      expect(result).toBeDefined();
      expect(result.id).toBe(userId);
      expect(result.email).toBe(`admin-get-user-${userId}@example.com`);
      expect(result.username).toBe(`admin-get-user-${userId}`);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const nonExistentUserId = nanoid();

      const query = createQuery({ userId: nonExistentUserId });

      await expect(
        queryBus.execute<AdminUserQuery, AdminUserQueryReturnType>(query),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('roleId field', () => {
    it('should include roleId for user with systemAdmin role', async () => {
      const userId = nanoid();
      await testCreateUser(prismaService, {
        id: userId,
        email: `admin-user-admin-role-${userId}@example.com`,
        username: `admin-user-admin-role-${userId}`,
        role: { connect: { id: UserSystemRoles.systemAdmin } },
      });

      const query = createQuery({ userId });
      const result = await queryBus.execute<
        AdminUserQuery,
        AdminUserQueryReturnType
      >(query);

      expect(result).toBeDefined();
      expect(result.roleId).toBe(UserSystemRoles.systemAdmin);
    });

    it('should include roleId for user with systemUser role', async () => {
      const userId = nanoid();
      await testCreateUser(prismaService, {
        id: userId,
        email: `admin-user-user-role-${userId}@example.com`,
        username: `admin-user-user-role-${userId}`,
      });

      const query = createQuery({ userId });
      const result = await queryBus.execute<
        AdminUserQuery,
        AdminUserQueryReturnType
      >(query);

      expect(result).toBeDefined();
      expect(result.roleId).toBe(UserSystemRoles.systemUser);
    });

    it('should include roleId for user with systemFullApiRead role', async () => {
      const userId = nanoid();
      await testCreateUser(prismaService, {
        id: userId,
        email: `admin-user-api-role-${userId}@example.com`,
        username: `admin-user-api-role-${userId}`,
        role: { connect: { id: UserSystemRoles.systemFullApiRead } },
      });

      const query = createQuery({ userId });
      const result = await queryBus.execute<
        AdminUserQuery,
        AdminUserQueryReturnType
      >(query);

      expect(result).toBeDefined();
      expect(result.roleId).toBe(UserSystemRoles.systemFullApiRead);
    });
  });

  describe('returned fields', () => {
    it('should return id, username, email, and roleId', async () => {
      const userId = nanoid();
      const email = `admin-fields-${userId}@example.com`;
      const username = `admin-fields-${userId}`;

      await testCreateUser(prismaService, {
        id: userId,
        email,
        username,
      });

      const query = createQuery({ userId });
      const result = await queryBus.execute<
        AdminUserQuery,
        AdminUserQueryReturnType
      >(query);

      expect(result).toEqual({
        id: userId,
        email,
        username,
        roleId: UserSystemRoles.systemUser,
      });
    });
  });

  let queryBus: QueryBus;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [PrismaService, AdminUserHandler],
    }).compile();

    await module.init();

    prismaService = module.get(PrismaService);
    queryBus = module.get(QueryBus);
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });

  const createQuery = (data: AdminUserQuery['data']): AdminUserQuery => {
    return new AdminUserQuery(data);
  };
});
