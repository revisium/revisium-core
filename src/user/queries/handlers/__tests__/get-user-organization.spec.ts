import { CqrsModule, QueryBus } from '@nestjs/cqrs';
import { QueryHandlerType } from '@nestjs/cqrs/dist/query-bus';
import { Test, TestingModule } from '@nestjs/testing';
import { Organization, Prisma } from '@prisma/client';
import { nanoid } from 'nanoid';
import { testCreateUser } from 'src/__tests__/create-models';
import { UserOrganizationRoles } from 'src/auth/consts';
import { PrismaService } from 'src/database/prisma.service';
import { GetUserOrganizationQuery } from 'src/user/queries/impl';
import { GetUserOrganizationHandler } from '../get-user-organization.handler';

describe('GetUserOrganizationHandler', () => {
  it('should return organizationId if user is an owner', async () => {
    const organizationId = nanoid();
    const userId = nanoid();
    await setupTestEntities(organizationId, userId);

    const query = createQuery({ userId });
    const result = await queryBus.execute(query);

    expect(result).toEqual(organizationId);
  });

  xit('should return undefined if user is not an owner', async () => {
    const organizationId = nanoid();
    const userId = nanoid();

    const query = createQuery({ userId });
    const result = await queryBus.execute(query);

    expect(result).toEqual(organizationId);
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
  ): Promise<Organization> => {
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
      providers: [GetUserOrganizationHandler, PrismaService],
    }).compile();

    prismaService = module.get(PrismaService);
    queryBus = module.get(QueryBus);

    queryBus.register([GetUserOrganizationHandler as QueryHandlerType]);
  });

  afterEach(async () => {
    prismaService.$disconnect();
  });
});
