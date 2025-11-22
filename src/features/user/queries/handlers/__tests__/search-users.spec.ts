import { CqrsModule, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { testCreateUser } from 'src/__tests__/create-models';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  SearchUsersQuery,
  SearchUsersQueryReturnType,
} from 'src/features/user/queries/impl';
import { SearchUsersHandler } from 'src/features/user/queries/handlers/search-users.handler';

describe('SearchUsersHandler', () => {
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
        SearchUsersQuery,
        SearchUsersQueryReturnType
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
        email: `unique-email-${uniqueId}@example.com`,
        username: `testuser-${userId}`,
      });

      const query = createQuery({
        search: `unique-email-${uniqueId}`,
        first: 10,
      });
      const result = await queryBus.execute<
        SearchUsersQuery,
        SearchUsersQueryReturnType
      >(query);

      expect(result.totalCount).toBe(1);
      const foundUser = result.edges.find(
        (edge) => edge.node.id === userId,
      )?.node;
      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe(`unique-email-${uniqueId}@example.com`);
    });

    it('should search users by username', async () => {
      const uniqueId = nanoid();
      const userId = nanoid();
      await testCreateUser(prismaService, {
        id: userId,
        email: `test-${userId}@example.com`,
        username: `unique-username-${uniqueId}`,
      });

      const query = createQuery({
        search: `unique-username-${uniqueId}`,
        first: 10,
      });
      const result = await queryBus.execute<
        SearchUsersQuery,
        SearchUsersQueryReturnType
      >(query);

      expect(result.totalCount).toBe(1);
      const foundUser = result.edges.find(
        (edge) => edge.node.id === userId,
      )?.node;
      expect(foundUser).toBeDefined();
      expect(foundUser?.username).toBe(`unique-username-${uniqueId}`);
    });

    it('should perform case-insensitive search', async () => {
      const uniqueId = nanoid();
      const userId = nanoid();
      await testCreateUser(prismaService, {
        id: userId,
        email: `CaseSensitive-${uniqueId}@Example.COM`,
        username: `CaseSensitiveUser-${userId}`,
      });

      const query = createQuery({
        search: `casesensitive-${uniqueId}`,
        first: 10,
      });
      const result = await queryBus.execute<
        SearchUsersQuery,
        SearchUsersQueryReturnType
      >(query);

      expect(result.totalCount).toBe(1);
      const foundUser = result.edges.find(
        (edge) => edge.node.id === userId,
      )?.node;
      expect(foundUser).toBeDefined();
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
          email: `paginated-user-${uniquePrefix}-${i}@example.com`,
          username: `paginated-user-${uniquePrefix}-${i}`,
        });
      }

      const firstPageQuery = createQuery({
        search: `paginated-user-${uniquePrefix}`,
        first: 2,
      });
      const firstPage = await queryBus.execute<
        SearchUsersQuery,
        SearchUsersQueryReturnType
      >(firstPageQuery);

      expect(firstPage.edges).toHaveLength(2);
      expect(firstPage.pageInfo.hasNextPage).toBe(true);
      expect(firstPage.pageInfo.endCursor).toBeDefined();

      const secondPageQuery = createQuery({
        search: `paginated-user-${uniquePrefix}`,
        first: 2,
        after: firstPage.pageInfo.endCursor,
      });
      const secondPage = await queryBus.execute<
        SearchUsersQuery,
        SearchUsersQueryReturnType
      >(secondPageQuery);

      expect(secondPage.edges).toHaveLength(2);
      expect(secondPage.pageInfo.startCursor).toBeDefined();
    });

    it('should handle empty results', async () => {
      const uniqueId = nanoid();
      const query = createQuery({
        search: `non-existent-user-${uniqueId}`,
        first: 10,
      });
      const result = await queryBus.execute<
        SearchUsersQuery,
        SearchUsersQueryReturnType
      >(query);

      expect(result.totalCount).toBe(0);
      expect(result.edges).toHaveLength(0);
      expect(result.pageInfo.hasNextPage).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should search by partial email match', async () => {
      const uniqueId = nanoid();
      const userId = nanoid();
      await testCreateUser(prismaService, {
        id: userId,
        email: `email-partial-${uniqueId}@example.com`,
        username: `user-${userId}`,
      });

      const query = createQuery({
        search: `email-partial-${uniqueId}`,
        first: 10,
      });
      const result = await queryBus.execute<
        SearchUsersQuery,
        SearchUsersQueryReturnType
      >(query);

      expect(result.totalCount).toBe(1);
      const foundUser = result.edges.find(
        (edge) => edge.node.id === userId,
      )?.node;
      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toContain(`email-partial-${uniqueId}`);
    });

    it('should search by partial username match', async () => {
      const uniqueId = nanoid();
      const userId = nanoid();
      await testCreateUser(prismaService, {
        id: userId,
        email: `${userId}@example.com`,
        username: `username-partial-${uniqueId}`,
      });

      const query = createQuery({
        search: `partial-${uniqueId}`,
        first: 10,
      });
      const result = await queryBus.execute<
        SearchUsersQuery,
        SearchUsersQueryReturnType
      >(query);

      expect(result.totalCount).toBe(1);
      const foundUser = result.edges.find(
        (edge) => edge.node.id === userId,
      )?.node;
      expect(foundUser).toBeDefined();
      expect(foundUser?.username).toContain(`partial-${uniqueId}`);
    });
  });

  let queryBus: QueryBus;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [PrismaService, SearchUsersHandler],
    }).compile();

    await module.init();

    prismaService = module.get(PrismaService);
    queryBus = module.get(QueryBus);
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });

  const createQuery = (
    data: Partial<SearchUsersQuery['data']> = {},
  ): SearchUsersQuery => {
    return new SearchUsersQuery({
      first: 10,
      ...data,
    });
  };
});
