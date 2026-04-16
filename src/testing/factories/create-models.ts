import { Prisma, User } from 'src/__generated__/client';
import { UserSystemRoles } from 'src/features/auth/consts';
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
