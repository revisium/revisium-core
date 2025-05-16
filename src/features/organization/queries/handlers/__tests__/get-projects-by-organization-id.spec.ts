import { QueryBus } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import {
  UserOrganizationRoles,
  UserProjectRoles,
  UserSystemRoles,
} from 'src/features/auth/consts';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import {
  GetProjectsByOrganizationIdQuery,
  GetProjectsByOrganizationIdQueryReturnType,
} from 'src/features/organization/queries/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('GetProjectsByOrganizationIdHandler', () => {
  it('should get projects', async () => {
    const { organizationId, projectId } = await prepareProject(prismaService);

    await prismaService.project.update({
      where: {
        id: projectId,
      },
      data: {
        isPublic: true,
      },
    });

    const result = await runTransaction(
      new GetProjectsByOrganizationIdQuery({
        organizationId,
        first: 100,
      }),
    );

    expect(result.edges.length).toBe(1);
  });

  it('should not get project if the project is not public', async () => {
    const { organizationId, projectId } = await prepareProject(prismaService);

    await prismaService.project.update({
      where: {
        id: projectId,
      },
      data: {
        isPublic: false,
      },
    });

    const result = await runTransaction(
      new GetProjectsByOrganizationIdQuery({
        organizationId,
        first: 100,
      }),
    );

    expect(result.totalCount).toBe(0);
  });

  it('should get project if the user is organization user', async () => {
    const { organizationId, projectId } = await prepareProject(prismaService);
    const userId = nanoid();

    await prismaService.project.update({
      where: {
        id: projectId,
      },
      data: {
        isPublic: false,
      },
    });
    await prismaService.organization.update({
      where: {
        id: organizationId,
      },
      data: {
        userOrganizations: {
          create: {
            id: nanoid(),
            role: {
              connect: {
                id: UserOrganizationRoles.organizationOwner,
              },
            },
            user: {
              create: {
                id: userId,
                password: '',
                role: {
                  connect: {
                    id: UserSystemRoles.systemUser,
                  },
                },
              },
            },
          },
        },
      },
    });

    const result = await runTransaction(
      new GetProjectsByOrganizationIdQuery({
        userId,
        organizationId,
        first: 100,
      }),
    );

    expect(result.totalCount).toBe(1);
  });

  it('should get project if the user is project user', async () => {
    const { organizationId, projectId } = await prepareProject(prismaService);
    const userId = nanoid();

    await prismaService.project.update({
      where: {
        id: projectId,
      },
      data: {
        isPublic: false,
      },
    });
    await prismaService.project.update({
      where: {
        id: projectId,
      },
      data: {
        userProjects: {
          create: {
            id: nanoid(),
            role: {
              connect: {
                id: UserProjectRoles.developer,
              },
            },
            user: {
              create: {
                id: userId,
                password: '',
                role: {
                  connect: {
                    id: UserSystemRoles.systemUser,
                  },
                },
              },
            },
          },
        },
      },
    });

    const result = await runTransaction(
      new GetProjectsByOrganizationIdQuery({
        userId,
        organizationId,
        first: 100,
      }),
    );

    expect(result.totalCount).toBe(1);
  });

  it('should not get project if the project is deleted', async () => {
    const { organizationId, projectId } = await prepareProject(prismaService);

    await prismaService.project.update({
      where: {
        id: projectId,
      },
      data: {
        isDeleted: true,
      },
    });

    const result = await runTransaction(
      new GetProjectsByOrganizationIdQuery({
        organizationId,
        first: 100,
      }),
    );

    expect(result.totalCount).toBe(0);
  });

  function runTransaction(
    query: GetProjectsByOrganizationIdQuery,
  ): Promise<GetProjectsByOrganizationIdQueryReturnType> {
    return transactionService.run(async () => queryBus.execute(query));
  }

  let prismaService: PrismaService;
  let transactionService: TransactionPrismaService;
  let queryBus: QueryBus;

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    transactionService = result.transactionService;
    queryBus = result.queryBus;
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
