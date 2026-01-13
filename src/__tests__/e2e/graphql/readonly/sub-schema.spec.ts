import { INestApplication } from '@nestjs/common';
import { nanoid } from 'nanoid';
import hash from 'object-hash';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import { getObjectSchema, getRefSchema } from '@revisium/schema-toolkit/mocks';
import { FileStatus } from 'src/features/plugin/file/consts';
import { metaSchema } from 'src/features/share/schema/meta-schema';
import { tableMigrationsSchema } from 'src/features/share/schema/table-migrations-schema';
import { gql } from 'src/__tests__/utils/gql';
import {
  getTestApp,
  closeTestApp,
  gqlQuery,
  gqlQueryExpectError,
  getPrismaService,
} from 'src/__tests__/e2e/shared';
import { prepareData, prepareRow } from 'src/__tests__/utils/prepareProject';
import { JsonPatchAdd, InitMigration } from '@revisium/schema-toolkit/types';

const FILE_SCHEMA_ID = SystemSchemaIds.File;

const createFileData = (
  overrides: Partial<{
    fileId: string;
    fileName: string;
    mimeType: string;
    size: number;
    status: string;
  }> = {},
) => ({
  fileId: overrides.fileId ?? nanoid(),
  fileName: overrides.fileName ?? 'test.png',
  mimeType: overrides.mimeType ?? 'image/png',
  size: overrides.size ?? 1024,
  status: overrides.status ?? FileStatus.uploaded,
  url: '',
  hash: '',
  extension: 'png',
  width: 100,
  height: 100,
});

describe('graphql - subSchemaItems (readonly)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await getTestApp();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  const getSubSchemaItemsQuery = (revisionId: string, schemaId: string) => ({
    query: gql`
      query subSchemaItems($data: GetSubSchemaItemsInput!) {
        subSchemaItems(data: $data) {
          totalCount
          pageInfo {
            hasNextPage
            hasPreviousPage
          }
          edges {
            node {
              fieldPath
              data
              row {
                id
              }
              table {
                id
              }
            }
          }
        }
      }
    `,
    variables: {
      data: { revisionId, schemaId, first: 100 },
    },
  });

  describe('private project access', () => {
    let fixture: Awaited<ReturnType<typeof prepareFixtureWithFiles>>;

    beforeAll(async () => {
      fixture = await prepareFixtureWithFiles(app);
    });

    it('owner can query subSchemaItems', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getSubSchemaItemsQuery(
          fixture.project.draftRevisionId,
          FILE_SCHEMA_ID,
        ),
      });

      expect(result.subSchemaItems.totalCount).toBe(1);
      expect(result.subSchemaItems.edges[0].node.fieldPath).toBe('file');
      expect(result.subSchemaItems.edges[0].node.table.id).toBe(
        fixture.project.tableId,
      );
      expect(result.subSchemaItems.edges[0].node.row.id).toBe(
        fixture.project.rowId,
      );
    });

    it('cross-owner cannot query subSchemaItems from private project', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.anotherOwner.token,
          ...getSubSchemaItemsQuery(
            fixture.project.draftRevisionId,
            FILE_SCHEMA_ID,
          ),
        },
        /You are not allowed to read on Project/,
      );
    });

    it('unauthenticated cannot query subSchemaItems from private project', async () => {
      await gqlQueryExpectError(
        {
          app,
          ...getSubSchemaItemsQuery(
            fixture.project.draftRevisionId,
            FILE_SCHEMA_ID,
          ),
        },
        /You are not allowed to read on Project/,
      );
    });
  });

  describe('public project access', () => {
    let fixture: Awaited<ReturnType<typeof prepareFixtureWithFiles>>;

    beforeAll(async () => {
      fixture = await prepareFixtureWithFiles(app);
      const prisma = getPrismaService();
      await prisma.project.update({
        where: { id: fixture.project.projectId },
        data: { isPublic: true },
      });
    });

    it('unauthenticated can query subSchemaItems from public project', async () => {
      const result = await gqlQuery({
        app,
        ...getSubSchemaItemsQuery(
          fixture.project.draftRevisionId,
          FILE_SCHEMA_ID,
        ),
      });

      expect(result.subSchemaItems.totalCount).toBe(1);
    });

    it('cross-owner can query subSchemaItems from public project', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.anotherOwner.token,
        ...getSubSchemaItemsQuery(
          fixture.project.draftRevisionId,
          FILE_SCHEMA_ID,
        ),
      });

      expect(result.subSchemaItems.totalCount).toBe(1);
    });
  });
});

async function prepareFixtureWithFiles(app: INestApplication) {
  const prismaService = getPrismaService();

  const baseFixture = await prepareData(app);

  const fileSchema = getObjectSchema({
    file: getRefSchema(SystemSchemaIds.File),
  });

  const fileTableResult = await prepareTableWithFileSchema({
    prismaService,
    headRevisionId: baseFixture.project.headRevisionId,
    draftRevisionId: baseFixture.project.draftRevisionId,
    schemaTableVersionId: baseFixture.project.schemaTableVersionId,
    migrationTableVersionId: baseFixture.project.migrationTableVersionId,
    schema: fileSchema,
  });

  const fileData = createFileData();

  const rowResult = await prepareRow({
    prismaService,
    headTableVersionId: fileTableResult.headTableVersionId,
    draftTableVersionId: fileTableResult.draftTableVersionId,
    data: { file: fileData },
    dataDraft: { file: fileData },
    schema: fileSchema,
  });

  return {
    ...baseFixture,
    project: {
      ...baseFixture.project,
      tableId: fileTableResult.tableId,
      rowId: rowResult.rowId,
    },
  };
}

async function prepareTableWithFileSchema({
  prismaService,
  headRevisionId,
  draftRevisionId,
  schemaTableVersionId,
  migrationTableVersionId,
  schema,
}: {
  prismaService: ReturnType<typeof getPrismaService>;
  headRevisionId: string;
  draftRevisionId: string;
  schemaTableVersionId: string;
  migrationTableVersionId: string;
  schema: object;
}) {
  const schemaRowVersionId = nanoid();
  const migrationRowVersionId = nanoid();
  const tableId = `file-table-${nanoid()}`;
  const createdIdForTableInSchemaTable = `table-${nanoid()}`;
  const tableCreatedId = nanoid();
  const headTableVersionId = nanoid();
  const draftTableVersionId = nanoid();

  await prismaService.table.create({
    data: {
      id: tableId,
      createdId: tableCreatedId,
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
      createdId: tableCreatedId,
      versionId: draftTableVersionId,
      readonly: false,
      revisions: {
        connect: { id: draftRevisionId },
      },
    },
  });

  await prismaService.row.create({
    data: {
      id: tableId,
      versionId: schemaRowVersionId,
      createdId: createdIdForTableInSchemaTable,
      readonly: true,
      tables: {
        connect: {
          versionId: schemaTableVersionId,
        },
      },
      data: schema,
      meta: [
        {
          patches: [
            {
              op: 'add',
              path: '',
              value: schema,
            } as JsonPatchAdd,
          ],
          hash: hash(schema),
          date: new Date(),
        },
      ],
      hash: hash(schema),
      schemaHash: hash(metaSchema),
    },
  });

  const migration: InitMigration = {
    changeType: 'init',
    id: new Date().toISOString(),
    tableId,
    hash: hash(schema),
    schema: schema as InitMigration['schema'],
  };

  await prismaService.row.create({
    data: {
      id: migration.id,
      versionId: migrationRowVersionId,
      createdId: nanoid(),
      readonly: true,
      tables: {
        connect: {
          versionId: migrationTableVersionId,
        },
      },
      data: migration,
      hash: hash(migration),
      schemaHash: hash(tableMigrationsSchema),
      publishedAt: migration.id,
    },
  });

  return {
    schemaRowVersionId,
    tableId,
    createdIdForTableInSchemaTable,
    tableCreatedId,
    headTableVersionId,
    draftTableVersionId,
    schema,
  };
}
