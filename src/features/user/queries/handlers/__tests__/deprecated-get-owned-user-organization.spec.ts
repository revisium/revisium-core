import { CqrsModule, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, UserOrganization } from 'src/__generated__/client';
import { nanoid } from 'nanoid';
import { testCreateUser } from 'src/__tests__/create-models';
import { UserOrganizationRoles } from 'src/features/auth/consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { DeprecatedGetOwnedUserOrganizationQuery } from 'src/features/user/queries/impl';
import { DeprecatedGetOwnedUserOrganizationHandler } from 'src/features/user/queries/handlers/deprecated-get-owned-user-organization.handler';

describe('GetUserOrganizationHandler', () => {
  it('should return organizationId if user is an owner', async () => {
    const userOrganizationId = nanoid();
    const organizationId = nanoid();
    const userId = nanoid();
    await setupTestEntities(userOrganizationId, organizationId, userId);

    const query = createQuery({ userId });
    const result = await queryBus.execute(query);

    expect(result).toEqual(
      await prismaService.userOrganization.findUniqueOrThrow({
        where: { id: userOrganizationId },
      }),
    );
  });

  it('should return undefined if user is not an owner', async () => {
    const userId = nanoid();

    const query = createQuery({ userId });
    const result = await queryBus.execute(query);

    expect(result).toBeNull();
  });

  const createQuery = (
    data: Partial<DeprecatedGetOwnedUserOrganizationQuery['data']> = {},
  ) => {
    return new DeprecatedGetOwnedUserOrganizationQuery({
      userId: 'userId',
      ...data,
    });
  };

  const setupTestEntities = async (
    userOrganizationId: string,
    organizationId: string,
    userId: string,
  ): Promise<UserOrganization> => {
    await testCreateUser(prismaService, { id: userId });

    const data: Prisma.UserOrganizationCreateInput = {
      id: userOrganizationId,
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

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        DeprecatedGetOwnedUserOrganizationHandler,
        PrismaService,
        DeprecatedGetOwnedUserOrganizationHandler,
      ],
    }).compile();

    await module.init();

    prismaService = module.get(PrismaService);
    queryBus = module.get(QueryBus);
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
