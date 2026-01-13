import { Test, TestingModule } from '@nestjs/testing';
import { CacheModule } from '@nestjs/cache-manager';
import { CqrsModule, QueryBus } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import { AppOptionsModule } from 'src/core/app-options.module';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { RevisiumCacheModule } from 'src/infrastructure/cache';
import { ShareModule } from 'src/features/share/share.module';
import { PluginModule } from 'src/features/plugin/plugin.module';
import { DraftModule } from 'src/features/draft/draft.module';
import { DraftApiService } from 'src/features/draft/draft-api.service';
import { SUB_SCHEMA_QUERIES_HANDLERS } from 'src/features/sub-schema/queries/handlers';
import { SubSchemaApiService } from 'src/features/sub-schema/sub-schema-api.service';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { NotificationModule } from 'src/infrastructure/notification/notification.module';
import { S3Service } from 'src/infrastructure/database/s3.service';
import { TABLE_QUERIES_HANDLERS } from 'src/features/table/queries/handlers';
import { BRANCH_QUERIES_HANDLERS } from 'src/features/branch/quieries/handlers';
import { ViewsModule } from 'src/features/views/views.module';

export interface PrepareSubSchemaTestResult {
  organizationId: string;
  projectId: string;
  branchId: string;
  headRevisionId: string;
  draftRevisionId: string;
}

export async function prepareSubSchemaTest(
  prismaService: PrismaService,
): Promise<PrepareSubSchemaTestResult> {
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

  const schemaTableVersionId = nanoid();
  const migrationTableVersionId = nanoid();

  await prismaService.table.create({
    data: {
      id: SystemTables.Schema,
      versionId: schemaTableVersionId,
      createdId: nanoid(),
      readonly: true,
      system: true,
      revisions: {
        connect: [{ id: headRevisionId }, { id: draftRevisionId }],
      },
    },
  });

  await prismaService.table.create({
    data: {
      id: SystemTables.Migration,
      versionId: migrationTableVersionId,
      createdId: nanoid(),
      readonly: true,
      system: true,
      revisions: {
        connect: [{ id: headRevisionId }, { id: draftRevisionId }],
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

export const createSubSchemaTestingModule = async () => {
  const mockS3 = {
    isAvailable: true,
    uploadFile: jest.fn().mockResolvedValue({
      bucket: 'test-bucket',
      key: 'uploads/fake.png',
    }),
  };

  const module: TestingModule = await Test.createTestingModule({
    imports: [
      DatabaseModule,
      CqrsModule,
      CacheModule.register(),
      RevisiumCacheModule.forRootAsync(),
      AppOptionsModule.forRoot({ mode: 'monolith' }),
      ShareModule,
      PluginModule,
      NotificationModule,
      ViewsModule,
      DraftModule,
    ],
    providers: [
      SubSchemaApiService,
      ...SUB_SCHEMA_QUERIES_HANDLERS,
      ...TABLE_QUERIES_HANDLERS,
      ...BRANCH_QUERIES_HANDLERS,
    ],
  })
    .overrideProvider(S3Service)
    .useValue(mockS3)
    .compile();

  await module.init();

  return {
    module,
    prismaService: module.get(PrismaService),
    queryBus: module.get(QueryBus),
    transactionService: module.get(TransactionPrismaService),
    subSchemaApiService: module.get(SubSchemaApiService),
    draftApiService: module.get(DraftApiService),
  };
};
