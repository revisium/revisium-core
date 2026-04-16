import { QueryBus } from '@nestjs/cqrs';
import {
  Prisma,
  UserOrganization,
  UserProject,
} from 'src/__generated__/client';
import { nanoid } from 'nanoid';
import { testCreateUser } from 'src/testing/factories/create-models';
import {
  createUserQueryTestKit,
  type UserQueryTestKit,
} from 'src/testing/kit/create-user-query-test-kit';
import {
  UserOrganizationRoles,
  UserProjectRoles,
} from 'src/features/auth/consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  GetProjectsByUserIdQuery,
  GetProjectsByUserIdQueryReturnType,
} from 'src/features/user/queries/impl';

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

  let kit: UserQueryTestKit;
  let prismaService: PrismaService;
  let queryBus: QueryBus;

  beforeAll(async () => {
    kit = await createUserQueryTestKit();
    prismaService = kit.prismaService;
    queryBus = kit.queryBus;
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

  afterAll(async () => {
    await kit.close();
  });
});
