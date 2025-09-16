import { CqrsModule, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, UserOrganization, UserProject } from '@prisma/client';
import { nanoid } from 'nanoid';
import { testCreateUser } from 'src/__tests__/create-models';
import {
  UserOrganizationRoles,
  UserProjectRoles,
} from 'src/features/auth/consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { GetUserOrganizationHandler } from 'src/features/user/queries/handlers/get-user-organization.handler';
import {
  GetProjectsByUserIdQuery,
  GetProjectsByUserIdQueryReturnType,
} from 'src/features/user/queries/impl';
import { GetProjectsByUserIdHandler } from 'src/features/user/queries/handlers/get-projects-by-user-id.handler';

describe('GetProjectsByUserIdHandler', () => {
  it('should handle no projects found', async () => {
    const userId = nanoid();

    const query = createQuery({ first: 1, userId });
    const result = await queryBus.execute(query);

    expect(result.totalCount).toEqual(0);
  });

  it('should handle userOrganization', async () => {
    const userId = nanoid();
    const organizationId = nanoid();
    const projectId = nanoid();
    await testCreateUser(prismaService, { id: userId });
    await createOrganization(organizationId);
    await addUserToOrganization(
      organizationId,
      userId,
      UserOrganizationRoles.organizationOwner,
    );
    await createProject(organizationId, projectId);

    const query = createQuery({ first: 1, userId });
    const result = await queryBus.execute<
      GetProjectsByUserIdQuery,
      GetProjectsByUserIdQueryReturnType
    >(query);

    expect(result.totalCount).toEqual(1);
    expect(result.edges[0].node.id).toEqual(projectId);
    expect(result.pageInfo.startCursor).toEqual('1');
  });

  it('should handle userProjects', async () => {
    const userId = nanoid();
    const organizationId = nanoid();
    const projectId = nanoid();
    await testCreateUser(prismaService, { id: userId });
    await createOrganization(organizationId);
    await createProject(organizationId, projectId);
    await addUserToProject(projectId, userId, UserProjectRoles.reader);

    const query = createQuery({ first: 1, userId });
    const result = await queryBus.execute<
      GetProjectsByUserIdQuery,
      GetProjectsByUserIdQueryReturnType
    >(query);

    expect(result.totalCount).toEqual(1);
    expect(result.edges[0].node.id).toEqual(projectId);
    expect(result.pageInfo.startCursor).toEqual('1');
  });

  it('should not get project', async () => {
    const userId = nanoid();
    const organizationId = nanoid();
    const projectId = nanoid();
    await testCreateUser(prismaService, { id: userId });
    await createOrganization(organizationId);
    await createProject(organizationId, projectId);
    await addUserToProject(projectId, userId, UserProjectRoles.reader);

    await prismaService.project.update({
      where: { id: projectId },
      data: {
        isDeleted: true,
      },
    });

    const query = createQuery({ first: 1, userId });
    const result = await queryBus.execute<
      GetProjectsByUserIdQuery,
      GetProjectsByUserIdQueryReturnType
    >(query);

    expect(result.totalCount).toEqual(0);
  });

  const createProject = async (organizationId: string, projectId: string) => {
    return prismaService.project.create({
      data: {
        id: projectId,
        organizationId,
        name: `name=${projectId}`,
      },
    });
  };

  let prismaService: PrismaService;
  let queryBus: QueryBus;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        PrismaService,
        GetProjectsByUserIdHandler,
        GetUserOrganizationHandler,
      ],
    }).compile();

    await module.init();

    prismaService = module.get<PrismaService>(PrismaService);
    queryBus = module.get<QueryBus>(QueryBus);
  });

  const createQuery = (
    data: Partial<GetProjectsByUserIdQuery['data']> = {},
  ) => {
    return new GetProjectsByUserIdQuery({
      userId: 'userId',
      first: 10,
      ...data,
    });
  };

  const createOrganization = (organizationId: string) => {
    return prismaService.organization.create({
      data: {
        id: organizationId,
        createdId: nanoid(),
      },
    });
  };

  const addUserToOrganization = async (
    organizationId: string,
    userId: string,
    roleId: UserOrganizationRoles,
  ): Promise<UserOrganization> => {
    const data: Prisma.UserOrganizationCreateInput = {
      id: nanoid(),
      role: {
        connect: {
          id: roleId,
        },
      },
      organization: {
        connect: {
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

  const addUserToProject = async (
    projectId: string,
    userId: string,
    roleId: UserProjectRoles,
  ): Promise<UserProject> => {
    const data: Prisma.UserProjectCreateInput = {
      id: nanoid(),
      role: {
        connect: {
          id: roleId,
        },
      },
      project: {
        connect: {
          id: projectId,
        },
      },
      user: {
        connect: {
          id: userId,
        },
      },
    };

    return prismaService.userProject.create({
      data,
    });
  };

  afterEach(async () => {
    await prismaService.$disconnect();
  });
});
