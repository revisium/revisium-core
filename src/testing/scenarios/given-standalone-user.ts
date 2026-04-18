import { nanoid } from 'nanoid';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { testCreateUser } from 'src/testing/factories/create-models';

export interface StandaloneUserScenario {
  userId: string;
}

/**
 * Creates a user with `systemUser` system role and no organization /
 * project memberships. Used as a *target* for add-to-org / add-to-project
 * auth matrices, where the operation's caller is the actor and the
 * standalone user is who gets added.
 */
export async function givenStandaloneUser(
  app: INestApplication,
): Promise<StandaloneUserScenario> {
  const prisma = app.get(PrismaService);
  const userId = nanoid();
  await testCreateUser(prisma, { id: userId });
  return { userId };
}
