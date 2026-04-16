import { nanoid } from 'nanoid';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

export interface DraftRevisionScenario {
  organizationId: string;
  projectId: string;
  branchId: string;
  headRevisionId: string;
  draftRevisionId: string;
}

export async function givenDraftRevision(
  prismaService: PrismaService,
): Promise<DraftRevisionScenario> {
  const organizationId = `org-${nanoid()}`;
  const projectId = `project-${nanoid()}`;
  const branchId = `branch-${nanoid()}`;
  const headRevisionId = nanoid();
  const draftRevisionId = nanoid();

  await prismaService.branch.create({
    data: {
      id: branchId,
      name: `branch-${branchId}`,
      isRoot: true,
      project: {
        create: {
          id: projectId,
          name: `project-${projectId}`,
          organization: {
            create: {
              id: organizationId,
              createdId: nanoid(),
            },
          },
        },
      },
      revisions: {
        create: {
          id: headRevisionId,
          isStart: true,
          isHead: true,
          hasChanges: false,
        },
      },
    },
  });

  await prismaService.revision.create({
    data: {
      id: draftRevisionId,
      branchId,
      parentId: headRevisionId,
      hasChanges: false,
      isDraft: true,
    },
  });

  return {
    organizationId,
    projectId,
    branchId,
    headRevisionId,
    draftRevisionId,
  };
}
