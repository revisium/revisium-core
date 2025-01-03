import { Prisma, User } from '@prisma/client';
import { UserSystemRoles } from 'src/auth/consts';
import { PrismaService } from 'src/database/prisma.service';

export const testCreateUser = (
  prisma: PrismaService,
  { id, ...overrideData }: { id: string } & Partial<User>,
) => {
  const data: Prisma.UserCreateInput = {
    id,
    username: `username-${id}`,
    email: `${id}@example.com`,
    password: '',
    role: {
      connect: {
        id: UserSystemRoles.systemUser,
      },
    },
    ...overrideData,
  };

  return prisma.user.create({
    data,
  });
};
