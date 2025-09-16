import { CqrsModule, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, UserOrganization } from '@prisma/client';
import { nanoid } from 'nanoid';
import { testCreateUser } from 'src/__tests__/create-models';
import { UserOrganizationRoles } from 'src/features/auth/consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { GetUserOrganizationQuery } from 'src/features/user/queries/impl';
import { GetUserOrganizationHandler } from 'src/features/user/queries/handlers/get-user-organization.handler';

describe('GetUserOrganizationHandler', () => {
  it('should return organizationId if user is an owner', async () => {
    const organizationId = nanoid();
    const userId = nanoid();
    await setupTestEntities(organizationId, userId);

    const query = createQuery({ userId });
    const result = await queryBus.execute(query);

    expect(result).toEqual(organizationId);
  });

  it('should return undefined if user is not an owner', async () => {
    const userId = nanoid();

    const query = createQuery({ userId });
    const result = await queryBus.execute(query);

    expect(result).toBeUndefined();
  });

  const createQuery = (
    data: Partial<GetUserOrganizationQuery['data']> = {},
  ) => {
    return new GetUserOrganizationQuery({
      userId: 'userId',
      ...data,
    });
  };

  const setupTestEntities = async (
    organizationId: string,
    userId: string,
  ): Promise<UserOrganization> => {
    await testCreateUser(prismaService, { id: userId });

    const data: Prisma.UserOrganizationCreateInput = {
      id: nanoid(),
      role: {
        connect: {
          id: UserOrganizationRoles.organizationOwner,
        },
      },
      organization: {
        create: {
          id: organizationId,
          createdId: nanoid(),
        },
      },
      user: {
        connect: {
          id: userId,
        },
      },
    };

    return prismaService.userOrganization.create({
      data,
    });
  };

  let queryBus: QueryBus;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        GetUserOrganizationHandler,
        PrismaService,
        GetUserOrganizationHandler,
      ],
    }).compile();

    await module.init();

    prismaService = module.get(PrismaService);
    queryBus = module.get(QueryBus);
  });

  afterEach(async () => {
    await prismaService.$disconnect();
  });
});
