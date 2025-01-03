import { Test, TestingModule } from '@nestjs/testing';
import { Organization, Prisma } from '@prisma/client';
import { nanoid } from 'nanoid';
import { testCreateUser } from 'src/__tests__/create-models';
import { UserOrganizationRoles } from 'src/auth/consts';
import { PrismaService } from 'src/database/prisma.service';
import { GetUserOrganizationHandler } from '../get-user-organization.handler';
import { GetUserOrganizationQuery } from 'src/user/queries/impl';

describe('GetUserOrganizationHandler', () => {
  it('should return organizationId if user is an owner', async () => {
    const organizationId = nanoid();
    const userId = nanoid();
    await setupTestEntities(organizationId, userId);
    const query = createQuery({ userId });

    const result = await handler.execute(query);

    expect(result).toEqual(organizationId);
  });

  xit('should return undefined if user is not an owner', async () => {
    const organizationId = nanoid();
    const userId = nanoid();
    const query = createQuery({ userId });

    const result = await handler.execute(query);

    expect(result).toEqual(organizationId);
  });

  let handler: GetUserOrganizationHandler;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetUserOrganizationHandler, PrismaService],
    }).compile();

    handler = module.get<GetUserOrganizationHandler>(
      GetUserOrganizationHandler,
    );
    prismaService = module.get<PrismaService>(PrismaService);
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
});
