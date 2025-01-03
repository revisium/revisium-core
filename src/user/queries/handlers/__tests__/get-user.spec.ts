import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/database/prisma.service';
import { GetUserHandler } from '../get-user.handler';
import { GetUserQuery } from 'src/user/queries/impl';

describe('GetUserHandler', () => {
  it('should return user data', async () => {
    const user = {
      id: 'userId',
      username: 'username',
      email: 'email@example.com',
    };
    prismaService.user.findUniqueOrThrow = createMock(user);
    const query = createQuery();

    const result = await handler.execute(query);

    expect(result).toEqual(user);
    expect(prismaService.user.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'userId' },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });
  });

  let handler: GetUserHandler;
  let prismaService: PrismaService;

  const createMock = <T>(mockResolvedValue: T) =>
    jest.fn().mockResolvedValue(mockResolvedValue);

  beforeEach(async () => {
    const prismaServiceMock = {
      user: {
        findUniqueOrThrow: createMock(null),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUserHandler,
        { provide: PrismaService, useValue: prismaServiceMock },
      ],
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
