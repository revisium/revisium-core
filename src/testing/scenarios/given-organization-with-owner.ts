import { nanoid } from 'nanoid';
import { UserOrganizationRoles } from 'src/features/auth/consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  testAddUserToOrganization,
  testCreateOrganization,
  testCreateUser,
} from 'src/testing/factories/create-models';

export interface OrganizationWithOwnerScenario {
  organizationId: string;
  userId: string;
}

export async function givenOrganizationWithOwner(
  prisma: PrismaService,
): Promise<OrganizationWithOwnerScenario> {
  const organizationId = nanoid();
  const userId = nanoid();

  await testCreateUser(prisma, { id: userId });
  await testCreateOrganization(prisma, organizationId);
  await testAddUserToOrganization(prisma, {
    organizationId,
    userId,
    roleId: UserOrganizationRoles.organizationOwner,
  });

  return { organizationId, userId };
}
