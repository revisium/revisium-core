import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, CqrsModule } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import { AppOptionsModule } from 'src/core/app-options.module';
import { BranchModule } from 'src/features/branch/branch.module';
import { DRAFT_REVISION_COMMANDS_HANDLERS } from 'src/features/draft-revision/commands/handlers';
import { DraftRevisionApiService } from 'src/features/draft-revision/draft-revision-api.service';
import {
  DraftRevisionInternalService,
  DraftRevisionValidationService,
} from 'src/features/draft-revision/services';
import { RevisionModule } from 'src/features/revision/revision.module';
import { DiffService } from 'src/features/share/diff.service';
import { RevisiumCacheModule } from 'src/infrastructure/cache';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

export interface PrepareDraftRevisionTestResult {
  organizationId: string;
  projectId: string;
  branchId: string;
  headRevisionId: string;
  draftRevisionId: string;
}

export async function prepareDraftRevisionTest(
  prismaService: PrismaService,
): Promise<PrepareDraftRevisionTestResult> {
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
        create: [
          {
            id: headRevisionId,
            isStart: true,
            isHead: true,
            hasChanges: false,
          },
          {
            id: draftRevisionId,
            parentId: headRevisionId,
            hasChanges: false,
            isDraft: true,
          },
        ],
      },
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

export const createDraftRevisionTestingModule = async () => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [
      DatabaseModule,
      CqrsModule,
      RevisiumCacheModule.forRootAsync(),
      AppOptionsModule.forRoot({ mode: 'monolith' }),
      RevisionModule,
      BranchModule,
    ],
    providers: [
      DraftRevisionApiService,
      DraftRevisionInternalService,
      DraftRevisionValidationService,
      DiffService,
      ...DRAFT_REVISION_COMMANDS_HANDLERS,
    ],
  }).compile();

  await module.init();

  return {
    module,
    prismaService: module.get(PrismaService),
    commandBus: module.get(CommandBus),
    transactionService: module.get(TransactionPrismaService),
    draftRevisionApiService: module.get(DraftRevisionApiService),
  };
};
