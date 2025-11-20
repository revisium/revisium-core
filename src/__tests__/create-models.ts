import { Prisma, User } from 'src/__generated__/client';
import { UserSystemRoles } from 'src/features/auth/consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

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
