import { NotFoundException } from '@nestjs/common';
import { CqrsModule, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { testCreateUser } from 'src/__tests__/create-models';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { GetUserQuery } from 'src/features/user/queries/impl';
import { GetUserHandler } from 'src/features/user/queries/handlers/get-user.handler';

describe('GetUserHandler', () => {
  it('should return user data with hasPassword false when password is empty', async () => {
    const userId = nanoid();
    await testCreateUser(prismaService, { id: userId, password: '' });

    const query = createQuery({ userId });
    const result = await queryBus.execute(query);

    expect(result.id).toBe(userId);
    expect(result.hasPassword).toBe(false);
  });

  it('should return hasPassword true when password is set', async () => {
    const userId = nanoid();
    await testCreateUser(prismaService, {
      id: userId,
      password: 'hashed-password',
    });

    const query = createQuery({ userId });
    const result = await queryBus.execute(query);

    expect(result.id).toBe(userId);
    expect(result.hasPassword).toBe(true);
  });

  it('should return all user fields', async () => {
    const userId = nanoid();
    await testCreateUser(prismaService, {
      id: userId,
      username: `user-${userId}`,
      email: `${userId}@test.com`,
      password: 'test-password',
    });

    const query = createQuery({ userId });
    const result = await queryBus.execute(query);

    expect(result).toEqual({
      id: userId,
      username: `user-${userId}`,
      email: `${userId}@test.com`,
      roleId: expect.any(String),
      hasPassword: true,
    });
  });

  it('should throw an error if the user is not found', async () => {
    const query = createQuery({ userId: nanoid() });

    await expect(queryBus.execute(query)).rejects.toThrow(NotFoundException);
    await expect(queryBus.execute(query)).rejects.toThrow('Not found user');
  });

  const createQuery = (data: Partial<GetUserQuery['data']> = {}) => {
    return new GetUserQuery({
      userId: 'userId',
      ...data,
    });
  };

  let queryBus: QueryBus;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [PrismaService, GetUserHandler],
    }).compile();

    await module.init();

    prismaService = module.get(PrismaService);
    queryBus = module.get(QueryBus);
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
