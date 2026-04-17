import { INestApplication } from '@nestjs/common';
import { nanoid } from 'nanoid';
import hash from 'object-hash';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import { getObjectSchema, getRefSchema } from '@revisium/schema-toolkit/mocks';
import { FileStatus } from 'src/features/plugin/file/consts';
import { metaSchema, tableMigrationsSchema } from '@revisium/engine';
import { gql } from 'src/testing/utils/gql';
import {
  describeAuthMatrix,
  getTestApp,
  gqlKit,
  PRIVATE_RESOURCE_MATRIX,
  type GqlKit,
} from 'src/testing/e2e';
import { prepareData, prepareRow } from 'src/testing/utils/prepareProject';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
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

const subSchemaItemsQuery = gql`
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
`;

const subSchemaVars = (revisionId: string, schemaId: string) => ({
  data: { revisionId, schemaId, first: 100 },
});

describe('graphql - subSchemaItems (readonly)', () => {
  let app: INestApplication;
  let kit: GqlKit;

  beforeAll(async () => {
    app = await getTestApp();
    kit = gqlKit(app);
  });

  describe('private project access', () => {
    let fixture: Awaited<ReturnType<typeof prepareFixtureWithFiles>>;

    beforeAll(async () => {
      fixture = await prepareFixtureWithFiles(app);
    });

    describeAuthMatrix(
      'private project',
      PRIVATE_RESOURCE_MATRIX,
      async ({ role, outcome }) => {
        const actor = kit.roleFor(fixture, role);
        const vars = subSchemaVars(
          fixture.project.draftRevisionId,
          FILE_SCHEMA_ID,
        );
        if (outcome === 'ok') {
          const result = await actor.expectOk<{
            subSchemaItems: {
              totalCount: number;
              edges: Array<{
                node: {
                  fieldPath: string;
                  row: { id: string };
                  table: { id: string };
                };
              }>;
            };
          }>(subSchemaItemsQuery, vars);
          expect(result.subSchemaItems.totalCount).toBe(1);
          expect(result.subSchemaItems.edges[0].node.fieldPath).toBe('file');
          expect(result.subSchemaItems.edges[0].node.table.id).toBe(
            fixture.project.tableId,
          );
          expect(result.subSchemaItems.edges[0].node.row.id).toBe(
            fixture.project.rowId,
          );
        } else {
          await actor.expectForbidden(subSchemaItemsQuery, vars);
        }
      },
    );
  });

  describe('public project access', () => {
    let fixture: Awaited<ReturnType<typeof prepareFixtureWithFiles>>;

    beforeAll(async () => {
      fixture = await prepareFixtureWithFiles(app);
      const prisma = app.get(PrismaService);
      await prisma.project.update({
        where: { id: fixture.project.projectId },
        data: { isPublic: true },
      });
    });

    it('anon can query subSchemaItems', async () => {
      const result = await kit.anon().expectOk<{
        subSchemaItems: { totalCount: number };
      }>(subSchemaItemsQuery, subSchemaVars(fixture.project.draftRevisionId, FILE_SCHEMA_ID));
      expect(result.subSchemaItems.totalCount).toBe(1);
    });

    it('cross-owner can query subSchemaItems', async () => {
      const result = await kit.crossOwner(fixture).expectOk<{
        subSchemaItems: { totalCount: number };
      }>(subSchemaItemsQuery, subSchemaVars(fixture.project.draftRevisionId, FILE_SCHEMA_ID));
      expect(result.subSchemaItems.totalCount).toBe(1);
    });
  });

  describe('duplicate row prevention', () => {
    it('should not return duplicates when row is connected to multiple table versions', async () => {
      const prisma = app.get(PrismaService);
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

      const result = await kit.actor(baseFixture.owner.token).expectOk<{
        subSchemaItems: {
          totalCount: number;
          edges: Array<{
            node: { row: { id: string }; table: { id: string } };
          }>;
        };
      }>(subSchemaItemsQuery, subSchemaVars(baseFixture.project.draftRevisionId, FILE_SCHEMA_ID));

      expect(result.subSchemaItems.totalCount).toBe(1);
      expect(result.subSchemaItems.edges.length).toBe(1);
      expect(result.subSchemaItems.edges[0].node.row.id).toBe(rowId);
      expect(result.subSchemaItems.edges[0].node.table.id).toBe(tableId);
    });
  });
});

async function prepareFixtureWithFiles(app: INestApplication) {
  const prismaService = app.get(PrismaService);

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
  prismaService: PrismaService;
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
