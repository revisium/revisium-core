import { nanoid } from 'nanoid';
import { UserProjectRoles } from 'src/features/auth/consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { testAddUserToProject } from 'src/testing/factories/create-models';
import { givenOrganizationWithOwner } from 'src/testing/scenarios/given-organization-with-owner';

export interface ProjectWithOwnerScenario {
  organizationId: string;
  projectId: string;
  userId: string;
}

export async function givenProjectWithOwner(
  prisma: PrismaService,
): Promise<ProjectWithOwnerScenario> {
  const { organizationId, userId } = await givenOrganizationWithOwner(prisma);
  const projectId = nanoid();

  await prisma.project.create({
    data: {
      id: projectId,
      organizationId,
      name: `name=${projectId}`,
    },
  });

  await testAddUserToProject(prisma, {
    projectId,
    userId,
    roleId: UserProjectRoles.developer,
  });

  return { organizationId, projectId, userId };
}
