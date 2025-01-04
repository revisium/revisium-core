import { CommandBus, CqrsModule, QueryBus } from '@nestjs/cqrs';
import { CommandHandlerType } from '@nestjs/cqrs/dist/command-bus';
import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { DatabaseModule } from 'src/database/database.module';
import { PrismaService } from 'src/database/prisma.service';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { DraftContextService } from 'src/draft/draft-context.service';
import { MoveEndpointsHandler } from 'src/share/commands/handlers/transactional/move-endpoints.handler';
import { FindBranchInProjectOrThrowHandler } from 'src/share/queries/handlers/transactional/find-branch-in-project-or-throw.handler';
import { FindDraftRevisionInBranchOrThrowHandler } from 'src/share/queries/handlers/transactional/find-draft-revision-in-branch-or-throw.handler';
import { FindHeadRevisionInBranchOrThrowHandler } from 'src/share/queries/handlers/transactional/find-head-revision-in-branch-or-throw.handler';
import { FindProjectInOrganizationOrThrowHandler } from 'src/share/queries/handlers/transactional/find-project-in-organization-or-throw.handler';
import { ShareModule } from 'src/share/share.module';
import { ShareTransactionalCommands } from 'src/share/share.transactional.commands';
import { ShareTransactionalQueries } from 'src/share/share.transactional.queries';

export const createTestingModule = async (
  ...commands: CommandHandlerType[]
) => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [CqrsModule, ShareModule, DatabaseModule],
    providers: [
      ShareTransactionalCommands,
      ShareTransactionalQueries,
      DraftContextService,
      ...commands,
    ],
  }).compile();

  const prismaService = module.get(PrismaService);

  const commandBus = module.get(CommandBus);
  commandBus.register([...commands, MoveEndpointsHandler]);

  const queryBus = module.get(QueryBus);
  queryBus.register([
    FindProjectInOrganizationOrThrowHandler,
    FindBranchInProjectOrThrowHandler,
    FindHeadRevisionInBranchOrThrowHandler,
    FindDraftRevisionInBranchOrThrowHandler,
  ]);

  const transactionService = module.get(TransactionPrismaService);

  return {
    prismaService,
    commandBus,
    transactionService,
  };
};

export type PrepareBranchReturnType = {
  organizationId: string;
  projectId: string;
  projectName: string;
  branchId: string;
  branchName: string;
  headRevisionId: string;
  draftRevisionId: string;
  headChangelogId: string;
  draftChangelogId: string;
  tableId: string;
  headTableVersionId: string;
  draftTableVersionId: string;
  rowId: string;
  headRowVersionId: string;
  draftRowVersionId: string;
  headEndpointId: string;
  draftEndpointId: string;
};

export const prepareBranch = async (
  prismaService: PrismaService,
): Promise<PrepareBranchReturnType> => {
  const organizationId = nanoid();
  const projectId = nanoid();
  const projectName = `name-${projectId}`;
  const branchId = nanoid();
  const branchName = `name-${branchId}`;
  const headRevisionId = nanoid();
  const draftRevisionId = nanoid();
  const headChangelogId = nanoid();
  const draftChangelogId = nanoid();
  const tableId = nanoid();
  const headTableVersionId = nanoid();
  const draftTableVersionId = nanoid();
  const rowId = nanoid();
  const headRowVersionId = nanoid();
  const draftRowVersionId = nanoid();
  const headEndpointId = nanoid();
  const draftEndpointId = nanoid();

  await prismaService.changelog.create({
    data: {
      id: headChangelogId,
    },
  });

  await prismaService.changelog.create({
    data: {
      id: draftChangelogId,
    },
  });

  await prismaService.branch.create({
    data: {
      id: branchId,
      name: branchName,
      project: {
        create: {
          id: projectId,
          name: projectName,
          organization: {
            create: {
              id: organizationId,
            },
          },
        },
      },
      revisions: {
        createMany: {
          data: [
            {
              id: headRevisionId,
              isHead: true,
              changelogId: headChangelogId,
            },
            {
              id: draftRevisionId,
              parentId: headRevisionId,
              isDraft: true,
              changelogId: draftChangelogId,
            },
          ],
        },
      },
    },
  });

  await prismaService.table.create({
    data: {
      id: tableId,
      versionId: headTableVersionId,
      readonly: true,
      revisions: {
        connect: { id: headRevisionId },
      },
    },
  });
  await prismaService.table.create({
    data: {
      id: tableId,
      versionId: draftTableVersionId,
      readonly: false,
      revisions: {
        connect: { id: draftRevisionId },
      },
    },
  });

  await prismaService.row.create({
    data: {
      id: rowId,
      versionId: headRowVersionId,
      readonly: true,
      tables: {
        connect: {
          versionId: headTableVersionId,
        },
      },
      data: { ver: 1 },
    },
  });
  await prismaService.row.create({
    data: {
      id: rowId,
      versionId: draftRowVersionId,
      readonly: false,
      tables: {
        connect: {
          versionId: draftTableVersionId,
        },
      },
      data: { ver: 2 },
    },
  });

  await prismaService.endpoint.create({
    data: {
      id: headEndpointId,
      revisionId: headRevisionId,
      type: 'REST_API',
    },
  });
  await prismaService.endpoint.create({
    data: {
      id: draftEndpointId,
      revisionId: draftRevisionId,
      type: 'GRAPHQL',
    },
  });

  return {
    organizationId,
    projectId,
    projectName,
    branchId,
    branchName,
    headRevisionId,
    draftRevisionId,
    headChangelogId,
    draftChangelogId,
    tableId,
    headTableVersionId,
    draftTableVersionId,
    rowId,
    headRowVersionId,
    draftRowVersionId,
    headEndpointId,
    draftEndpointId,
  };
};
