import { INestApplication } from '@nestjs/common';
import { nanoid } from 'nanoid';
import hash from 'object-hash';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import { getObjectSchema, getRefSchema } from '@revisium/schema-toolkit/mocks';
import { metaSchema } from 'src/features/share/schema/meta-schema';
import { tableMigrationsSchema } from 'src/features/share/schema/table-migrations-schema';
import { gql } from 'src/testing/utils/gql';
import {
  getTestApp,
  closeTestApp,
  gqlQuery,
  gqlQueryExpectError,
  getPrismaService,
} from 'src/testing/e2e';
import {
  createEmptyFile,
  prepareData,
  prepareRow,
  prepareTableWithSchema,
} from 'src/testing/utils/prepareProject';
import { InitMigration } from '@revisium/schema-toolkit/types';

const FILE_SCHEMA_ID = SystemSchemaIds.File;

const createFileData = (
  overrides: Partial<{
    fileId: string;
    fileName: string;
    mimeType: string;
    size: number;
    status: string;
    hash: string;
    extension: string;
    width: number;
    height: number;
    url: string;
  }> = {},
) => ({
  ...createEmptyFile(),
  ...overrides,
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

  describe('duplicate row prevention', () => {
    it('should not return duplicates when row is connected to multiple table versions', async () => {
      const prisma = getPrismaService();
      const baseFixture = await prepareData(app);

      const fileSchema = getObjectSchema({
        file: getRefSchema(SystemSchemaIds.File),
      });

      const tableId = `file-table-${nanoid()}`;
      const tableCreatedId = nanoid();
      const headTableVersionId = nanoid();
      const draftTableVersionId = nanoid();

      await prisma.table.create({
        data: {
          id: tableId,
          createdId: tableCreatedId,
          versionId: headTableVersionId,
          readonly: true,
          revisions: {
            connect: { id: baseFixture.project.headRevisionId },
          },
        },
      });

      await prisma.table.create({
        data: {
          id: tableId,
          createdId: tableCreatedId,
          versionId: draftTableVersionId,
          readonly: false,
          revisions: {
            connect: { id: baseFixture.project.draftRevisionId },
          },
        },
      });

      const schemaRowVersionId = nanoid();
      await prisma.row.create({
        data: {
          id: tableId,
          versionId: schemaRowVersionId,
          createdId: nanoid(),
          readonly: true,
          tables: {
            connect: {
              versionId: baseFixture.project.schemaTableVersionId,
            },
          },
          data: fileSchema,
          meta: [
            {
              patches: [{ op: 'add', path: '', value: fileSchema }],
              hash: hash(fileSchema),
              date: new Date(),
            },
          ],
          hash: hash(fileSchema),
          schemaHash: hash(metaSchema),
        },
      });

      const migration: InitMigration = {
        changeType: 'init',
        id: new Date().toISOString(),
        tableId,
        hash: hash(fileSchema),
        schema: fileSchema as InitMigration['schema'],
      };

      await prisma.row.create({
        data: {
          id: migration.id,
          versionId: nanoid(),
          createdId: nanoid(),
          readonly: true,
          tables: {
            connect: {
              versionId: baseFixture.project.migrationTableVersionId,
            },
          },
          data: migration,
          hash: hash(migration),
          schemaHash: hash(tableMigrationsSchema),
          publishedAt: migration.id,
        },
      });

      const fileData = createFileData();
      const rowId = `row-${nanoid()}`;
      const rowVersionId = nanoid();

      await prisma.row.create({
        data: {
          id: rowId,
          versionId: rowVersionId,
          createdId: nanoid(),
          readonly: false,
          tables: {
            connect: [
              { versionId: headTableVersionId },
              { versionId: draftTableVersionId },
            ],
          },
          data: { file: fileData },
          hash: hash({ file: fileData }),
          schemaHash: hash(fileSchema),
        },
      });

      const result = await gqlQuery({
        app,
        token: baseFixture.owner.token,
        ...getSubSchemaItemsQuery(
          baseFixture.project.draftRevisionId,
          FILE_SCHEMA_ID,
        ),
      });

      expect(result.subSchemaItems.totalCount).toBe(1);
      expect(result.subSchemaItems.edges.length).toBe(1);
      expect(result.subSchemaItems.edges[0].node.row.id).toBe(rowId);
      expect(result.subSchemaItems.edges[0].node.table.id).toBe(tableId);
    });
  });
});

async function prepareFixtureWithFiles(app: INestApplication) {
  const baseFixture = await prepareData(app);

  const fileSchema = getObjectSchema({
    file: getRefSchema(SystemSchemaIds.File),
  });

  const fileTableResult = await prepareTableWithSchema(app, {
    projectId: baseFixture.project.projectId,
    branchName: baseFixture.project.branchName,
    draftRevisionId: baseFixture.project.draftRevisionId,
    schema: fileSchema,
  });

  const fileData = createEmptyFile();

  const rowResult = await prepareRow(app, {
    projectId: baseFixture.project.projectId,
    branchName: baseFixture.project.branchName,
    draftRevisionId: fileTableResult.draftRevisionId,
    tableId: fileTableResult.tableId,
    data: { file: fileData },
    dataDraft: { file: fileData },
  });

  return {
    ...baseFixture,
    project: {
      ...baseFixture.project,
      headRevisionId: rowResult.headRevisionId,
      draftRevisionId: rowResult.draftRevisionId,
      tableId: fileTableResult.tableId,
      rowId: rowResult.rowId,
    },
  };
}
