import { nanoid } from 'nanoid';
import {
  Organization,
  Prisma,
  User,
  UserOrganization,
  UserProject,
} from 'src/__generated__/client';
import {
  UserOrganizationRoles,
  UserProjectRoles,
  UserSystemRoles,
} from 'src/features/auth/consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

type TestCreateUserInput = { id: string } & Partial<
  Omit<User, 'roleId'> & {
    roleId?: string;
    role?: Prisma.RoleCreateNestedOneWithoutUsersInput;
  }
>;

export const testCreateUser = (
  prisma: PrismaService,
  { id, role, roleId, ...overrideData }: TestCreateUserInput,
) => {
  const roleConnect = role ?? {
    connect: {
      id: roleId ?? UserSystemRoles.systemUser,
    },
  };

  const data: Prisma.UserCreateInput = {
    id,
    username: `username-${id}`,
    email: `${id}@example.com`,
    password: '',
    role: roleConnect,
    ...overrideData,
  };

  return prisma.user.create({
    data,
  });
};

export const testCreateOrganization = (
  prisma: PrismaService,
  organizationId: string = nanoid(),
): Promise<Organization> => {
  return prisma.organization.create({
    data: {
      id: organizationId,
      createdId: nanoid(),
    },
  });
};

export const testAddUserToOrganization = (
  prisma: PrismaService,
  args: {
    organizationId: string;
    userId: string;
    roleId: UserOrganizationRoles;
  },
): Promise<UserOrganization> => {
  return prisma.userOrganization.create({
    data: {
      id: nanoid(),
      role: { connect: { id: args.roleId } },
      organization: { connect: { id: args.organizationId } },
      user: { connect: { id: args.userId } },
    },
  });
};

export const testAddUserToProject = (
  prisma: PrismaService,
  args: {
    projectId: string;
    userId: string;
    roleId: UserProjectRoles;
  },
): Promise<UserProject> => {
  return prisma.userProject.create({
    data: {
      id: nanoid(),
      role: { connect: { id: args.roleId } },
      project: { connect: { id: args.projectId } },
      user: { connect: { id: args.userId } },
    },
  });
};
