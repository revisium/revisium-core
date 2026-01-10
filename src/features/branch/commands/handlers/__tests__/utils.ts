import { CommandBus, CqrsModule } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { AsyncLocalStorage } from 'node:async_hooks';
import { nanoid } from 'nanoid';
import { AppOptionsModule } from 'src/core/app-options.module';
import { BRANCH_COMMANDS_HANDLERS } from 'src/features/branch/commands/handlers';
import { ShareModule } from 'src/features/share/share.module';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';
import { NotificationModule } from 'src/infrastructure/notification/notification.module';

export const createTestingModule = async () => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [
      DatabaseModule,
      CqrsModule,
      ShareModule,
      AppOptionsModule.forRoot({ mode: 'monolith' }),
      NotificationModule,
    ],
    providers: [
      {
        provide: AsyncLocalStorage,
        useValue: new AsyncLocalStorage(),
      },
      ...BRANCH_COMMANDS_HANDLERS,
    ],
  }).compile();

  await module.init();

  const prismaService = module.get(PrismaService);
  const commandBus = module.get(CommandBus);
  const endpointNotificationService = module.get(EndpointNotificationService);

  return {
    module,
    prismaService,
    commandBus,
    endpointNotificationService,
  };
};

export type PrepareProjectWithBranchesReturnType = {
  organizationId: string;
  projectId: string;
  projectName: string;
  rootBranchId: string;
  rootBranchName: string;
  rootHeadRevisionId: string;
  rootDraftRevisionId: string;
  childBranchId: string;
  childBranchName: string;
  childHeadRevisionId: string;
  childDraftRevisionId: string;
  childHeadEndpointId: string;
  childDraftEndpointId: string;
};

export const prepareProjectWithBranches = async (
  prismaService: PrismaService,
): Promise<PrepareProjectWithBranchesReturnType> => {
  const organizationId = nanoid();
  const projectId = nanoid();
  const projectName = `name-${projectId}`;

  const rootBranchId = nanoid();
  const rootBranchName = 'master';
  const rootHeadRevisionId = nanoid();
  const rootDraftRevisionId = nanoid();

  const childBranchId = nanoid();
  const childBranchName = `child-${nanoid()}`;
  const childHeadRevisionId = nanoid();
  const childDraftRevisionId = nanoid();

  const childHeadEndpointId = nanoid();
  const childDraftEndpointId = nanoid();

  const schemaTableVersionId = nanoid();
  const schemaTableCreatedId = nanoid();
  const sharedSchemasTableVersionId = nanoid();
  const sharedSchemasTableCreatedId = nanoid();
  const migrationTableVersionId = nanoid();
  const migrationTableCreatedId = nanoid();

  const endpointVersion = await prismaService.endpointVersion.upsert({
    where: { type_version: { type: 'GRAPHQL', version: 1 } },
    update: {},
    create: {
      id: nanoid(),
      type: 'GRAPHQL',
      version: 1,
    },
  });

  const endpointVersionId = endpointVersion.id;

  await prismaService.branch.create({
    data: {
      id: rootBranchId,
      name: rootBranchName,
      isRoot: true,
      project: {
        create: {
          id: projectId,
          name: projectName,
          organization: {
            create: {
              id: organizationId,
              createdId: nanoid(),
            },
          },
        },
      },
      revisions: {
        createMany: {
          data: [
            {
              id: rootHeadRevisionId,
              isHead: true,
              isStart: true,
            },
            {
              id: rootDraftRevisionId,
              parentId: rootHeadRevisionId,
              isDraft: true,
            },
          ],
        },
      },
    },
  });

  await prismaService.branch.create({
    data: {
      id: childBranchId,
      name: childBranchName,
      isRoot: false,
      projectId,
      revisions: {
        createMany: {
          data: [
            {
              id: childHeadRevisionId,
              isHead: true,
              isStart: true,
            },
            {
              id: childDraftRevisionId,
              parentId: childHeadRevisionId,
              isDraft: true,
            },
          ],
        },
      },
    },
  });

  await prismaService.endpoint.create({
    data: {
      id: childHeadEndpointId,
      type: 'GRAPHQL',
      revisionId: childHeadRevisionId,
      versionId: endpointVersionId,
    },
  });

  await prismaService.endpoint.create({
    data: {
      id: childDraftEndpointId,
      type: 'REST_API',
      revisionId: childDraftRevisionId,
      versionId: endpointVersionId,
    },
  });

  await prismaService.table.create({
    data: {
      id: SystemTables.Schema,
      createdId: schemaTableCreatedId,
      versionId: schemaTableVersionId,
      readonly: true,
      system: true,
      revisions: {
        connect: [
          { id: rootHeadRevisionId },
          { id: rootDraftRevisionId },
          { id: childHeadRevisionId },
          { id: childDraftRevisionId },
        ],
      },
    },
  });

  await prismaService.table.create({
    data: {
      id: SystemTables.SharedSchemas,
      createdId: sharedSchemasTableCreatedId,
      versionId: sharedSchemasTableVersionId,
      readonly: true,
      system: true,
      revisions: {
        connect: [
          { id: rootHeadRevisionId },
          { id: rootDraftRevisionId },
          { id: childHeadRevisionId },
          { id: childDraftRevisionId },
        ],
      },
    },
  });

  await prismaService.table.create({
    data: {
      id: SystemTables.Migration,
      createdId: migrationTableCreatedId,
      versionId: migrationTableVersionId,
      readonly: true,
      system: true,
      revisions: {
        connect: [
          { id: rootHeadRevisionId },
          { id: rootDraftRevisionId },
          { id: childHeadRevisionId },
          { id: childDraftRevisionId },
        ],
      },
    },
  });

  return {
    organizationId,
    projectId,
    projectName,
    rootBranchId,
    rootBranchName,
    rootHeadRevisionId,
    rootDraftRevisionId,
    childBranchId,
    childBranchName,
    childHeadRevisionId,
    childDraftRevisionId,
    childHeadEndpointId,
    childDraftEndpointId,
  };
};
