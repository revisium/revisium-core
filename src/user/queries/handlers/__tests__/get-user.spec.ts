import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { testCreateUser } from 'src/__tests__/create-models';
import { PrismaService } from 'src/database/prisma.service';
import { GetUserQuery } from 'src/user/queries/impl';
import { GetUserHandler } from '../get-user.handler';

describe('GetUserHandler', () => {
  it('should return user data', async () => {
    const userId = nanoid();
    await testCreateUser(prismaService, { id: userId });

    const query = createQuery({ userId });
    const result = await handler.execute(query);

    const user = await prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });
    expect(result).toEqual(user);
  });

  it('should throw an error if the user is not found', async () => {
    const query = createQuery({ userId: nanoid() });

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    await expect(handler.execute(query)).rejects.toThrow('Not found user');
  });

  let handler: GetUserHandler;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetUserHandler, PrismaService],
    }).compile();

    handler = module.get<GetUserHandler>(GetUserHandler);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  const createQuery = (data: Partial<GetUserQuery['data']> = {}) => {
    return new GetUserQuery({
      userId: 'userId',
      ...data,
    });
  };
});
