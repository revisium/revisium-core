import { CqrsModule, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { testCreateUser } from 'src/__tests__/create-models';
import { UserSystemRoles } from 'src/features/auth/consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  AdminUsersQuery,
  AdminUsersQueryReturnType,
} from 'src/features/user/queries/impl';
import { AdminUsersHandler } from 'src/features/user/queries/handlers/admin-users.handler';

describe('AdminUsersHandler', () => {
  describe('basic search functionality', () => {
    it('should return all users when no search query is provided', async () => {
      const userId1 = nanoid();
      const userId2 = nanoid();
      const userId3 = nanoid();

      await testCreateUser(prismaService, {
        id: userId1,
        email: `alice-${userId1}@example.com`,
        username: `alice-${userId1}`,
      });
      await testCreateUser(prismaService, {
        id: userId2,
        email: `bob-${userId2}@example.com`,
        username: `bob-${userId2}`,
      });
      await testCreateUser(prismaService, {
        id: userId3,
        email: `charlie-${userId3}@example.com`,
        username: `charlie-${userId3}`,
      });

      const query = createQuery({ first: 10 });
      const result = await queryBus.execute<
        AdminUsersQuery,
        AdminUsersQueryReturnType
      >(query);

      expect(result.totalCount).toBeGreaterThanOrEqual(3);
      expect(result.edges.length).toBeGreaterThanOrEqual(3);
      expect(result.pageInfo).toBeDefined();
      expect(result.pageInfo.hasNextPage).toBeDefined();
    });

    it('should search users by email', async () => {
      const uniqueId = nanoid();
      const userId = nanoid();
      await testCreateUser(prismaService, {
        id: userId,
        email: `admin-unique-email-${uniqueId}@example.com`,
        username: `testuser-${userId}`,
      });

      const query = createQuery({
        search: `admin-unique-email-${uniqueId}`,
        first: 10,
      });
      const result = await queryBus.execute<
        AdminUsersQuery,
        AdminUsersQueryReturnType
      >(query);

      expect(result.totalCount).toBe(1);
      const foundUser = result.edges.find(
        (edge) => edge.node.id === userId,
      )?.node;
      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe(
        `admin-unique-email-${uniqueId}@example.com`,
      );
    });

    it('should search users by username', async () => {
      const uniqueId = nanoid();
      const userId = nanoid();
      await testCreateUser(prismaService, {
        id: userId,
        email: `test-${userId}@example.com`,
        username: `admin-unique-username-${uniqueId}`,
      });

      const query = createQuery({
        search: `admin-unique-username-${uniqueId}`,
        first: 10,
      });
      const result = await queryBus.execute<
        AdminUsersQuery,
        AdminUsersQueryReturnType
      >(query);

      expect(result.totalCount).toBe(1);
      const foundUser = result.edges.find(
        (edge) => edge.node.id === userId,
      )?.node;
      expect(foundUser).toBeDefined();
      expect(foundUser?.username).toBe(`admin-unique-username-${uniqueId}`);
    });

    it('should perform case-insensitive search', async () => {
      const uniqueId = nanoid();
      const userId = nanoid();
      await testCreateUser(prismaService, {
        id: userId,
        email: `AdminCaseSensitive-${uniqueId}@Example.COM`,
        username: `AdminCaseSensitiveUser-${userId}`,
      });

      const query = createQuery({
        search: `admincasesensitive-${uniqueId}`,
        first: 10,
      });
      const result = await queryBus.execute<
        AdminUsersQuery,
        AdminUsersQueryReturnType
      >(query);

      expect(result.totalCount).toBe(1);
      const foundUser = result.edges.find(
        (edge) => edge.node.id === userId,
      )?.node;
      expect(foundUser).toBeDefined();
    });
  });

  describe('roleId field', () => {
    it('should include roleId in response for user with systemAdmin role', async () => {
      const uniqueId = nanoid();
      const userId = nanoid();

      await testCreateUser(prismaService, {
        id: userId,
        email: `admin-with-role-${uniqueId}@example.com`,
        username: `admin-with-role-${uniqueId}`,
        role: { connect: { id: UserSystemRoles.systemAdmin } },
      });

      const query = createQuery({
        search: `admin-with-role-${uniqueId}`,
        first: 10,
      });
      const result = await queryBus.execute<
        AdminUsersQuery,
        AdminUsersQueryReturnType
      >(query);

      expect(result.totalCount).toBe(1);
      const foundUser = result.edges.find(
        (edge) => edge.node.id === userId,
      )?.node;
      expect(foundUser).toBeDefined();
      expect(foundUser?.roleId).toBe(UserSystemRoles.systemAdmin);
    });

    it('should include roleId in response for user with systemUser role', async () => {
      const uniqueId = nanoid();
      const userId = nanoid();

      await testCreateUser(prismaService, {
        id: userId,
        email: `admin-user-role-${uniqueId}@example.com`,
        username: `admin-user-role-${uniqueId}`,
      });

      const query = createQuery({
        search: `admin-user-role-${uniqueId}`,
        first: 10,
      });
      const result = await queryBus.execute<
        AdminUsersQuery,
        AdminUsersQueryReturnType
      >(query);

      expect(result.totalCount).toBe(1);
      const foundUser = result.edges.find(
        (edge) => edge.node.id === userId,
      )?.node;
      expect(foundUser).toBeDefined();
      expect(foundUser?.roleId).toBe(UserSystemRoles.systemUser);
    });
  });

  describe('pagination', () => {
    it('should paginate results correctly', async () => {
      const uniquePrefix = nanoid();
      const userIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        const userId = nanoid();
        userIds.push(userId);
        await testCreateUser(prismaService, {
          id: userId,
          email: `admin-paginated-user-${uniquePrefix}-${i}@example.com`,
          username: `admin-paginated-user-${uniquePrefix}-${i}`,
        });
      }

      const firstPageQuery = createQuery({
        search: `admin-paginated-user-${uniquePrefix}`,
        first: 2,
      });
      const firstPage = await queryBus.execute<
        AdminUsersQuery,
        AdminUsersQueryReturnType
      >(firstPageQuery);

      expect(firstPage.edges).toHaveLength(2);
      expect(firstPage.pageInfo.hasNextPage).toBe(true);
      expect(firstPage.pageInfo.endCursor).toBeDefined();

      const secondPageQuery = createQuery({
        search: `admin-paginated-user-${uniquePrefix}`,
        first: 2,
        after: firstPage.pageInfo.endCursor,
      });
      const secondPage = await queryBus.execute<
        AdminUsersQuery,
        AdminUsersQueryReturnType
      >(secondPageQuery);

      expect(secondPage.edges).toHaveLength(2);
      expect(secondPage.pageInfo.startCursor).toBeDefined();
    });

    it('should handle empty results', async () => {
      const uniqueId = nanoid();
      const query = createQuery({
        search: `admin-non-existent-user-${uniqueId}`,
        first: 10,
      });
      const result = await queryBus.execute<
        AdminUsersQuery,
        AdminUsersQueryReturnType
      >(query);

      expect(result.totalCount).toBe(0);
      expect(result.edges).toHaveLength(0);
      expect(result.pageInfo.hasNextPage).toBe(false);
    });
  });

  let queryBus: QueryBus;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [PrismaService, AdminUsersHandler],
    }).compile();

    await module.init();

    prismaService = module.get(PrismaService);
    queryBus = module.get(QueryBus);
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });

  const createQuery = (
    data: Partial<AdminUsersQuery['data']> = {},
  ): AdminUsersQuery => {
    return new AdminUsersQuery({
      first: 10,
      ...data,
    });
  };
});
