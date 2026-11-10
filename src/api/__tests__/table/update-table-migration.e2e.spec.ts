import { INestApplication } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { authGet, authPatch, authPost, getTestApp } from 'src/testing/e2e';
import {
  prepareData,
  type PrepareDataReturnType,
} from 'src/testing/utils/prepareProject';
import { testSchema } from 'src/testing/utils/test-schemas';

const ENGINE_ASYNC_MIGRATION_ROW_THRESHOLD = 1000;

describe('update table migration', () => {
  let app: INestApplication;
  let fixture: PrepareDataReturnType;

  beforeAll(async () => {
    app = await getTestApp();
    fixture = await prepareData(app);
  });

  it('records the update migration synchronously for a table with 1,000 rows', async () => {
    const tableId = await givenTableWithRows(
      ENGINE_ASYNC_MIGRATION_ROW_THRESHOLD,
    );

    await addTitleField(tableId).expect(200);

    expect(await getDraftMigrations()).toContainEqual(
      expect.objectContaining({ changeType: 'update', tableId }),
    );
    expect(await countTableMigrations(tableId)).toBe(0);
  });

  const draftRevisionUrl = () =>
    `/api/revision/${fixture.project.draftRevisionId}`;
  const tableUrl = (tableId: string) =>
    `${draftRevisionUrl()}/tables/${tableId}`;

  async function givenTableWithRows(rowCount: number): Promise<string> {
    const tableId = `table-${nanoid()}`;

    await authPost(app, `${draftRevisionUrl()}/tables`, fixture.owner.token, {
      tableId,
      schema: testSchema,
    }).expect(201);

    await authPost(
      app,
      `${tableUrl(tableId)}/create-rows`,
      fixture.owner.token,
      {
        rows: Array.from({ length: rowCount }, (_, index) => ({
          rowId: `row-${index}`,
          data: { ver: index },
        })),
      },
    ).expect(201);

    return tableId;
  }

  function addTitleField(tableId: string) {
    return authPatch(app, tableUrl(tableId), fixture.owner.token, {
      patches: [
        {
          op: 'add',
          path: '/properties/title',
          value: { type: 'string', default: '' },
        },
      ],
    });
  }

  async function getDraftMigrations(): Promise<unknown[]> {
    const response = await authGet(
      app,
      `${draftRevisionUrl()}/migrations`,
      fixture.owner.token,
    ).expect(200);

    return response.body;
  }

  function countTableMigrations(tableId: string): Promise<number> {
    return app.get(PrismaService).tableMigration.count({
      where: { revisionId: fixture.project.draftRevisionId, tableId },
    });
  }
});
