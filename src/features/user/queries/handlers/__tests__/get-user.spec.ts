import { NotFoundException } from '@nestjs/common';
import { CqrsModule, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { testCreateUser } from 'src/__tests__/create-models';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { GetUserQuery } from 'src/features/user/queries/impl';
import { GetUserHandler } from 'src/features/user/queries/handlers/get-user.handler';

describe('GetUserHandler', () => {
  it('should return user data', async () => {
    const userId = nanoid();
    await testCreateUser(prismaService, { id: userId });

    const query = createQuery({ userId });
    const result = await queryBus.execute(query);

    const user = await prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        roleId: true,
      },
    });
    expect(result).toEqual(user);
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
