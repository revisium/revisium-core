import { INestApplication } from '@nestjs/common';
import { gql } from 'src/__tests__/utils/gql';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import {
  createFreshTestApp,
  gqlQuery,
  gqlQueryExpectError,
} from 'src/__tests__/e2e/shared';

describe('graphql - draft mutations', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createFreshTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('createTable', () => {
    let fixture: PrepareDataReturnType;

    beforeEach(async () => {
      fixture = await prepareData(app);
    });

    const getMutation = (revisionId: string, tableId: string) => ({
      query: gql`
        mutation createTable($data: CreateTableInput!) {
          createTable(data: $data) {
            table {
              id
              versionId
            }
          }
        }
      `,
      variables: {
        data: {
          revisionId,
          tableId,
          schema: {
            type: 'object',
            required: [],
            properties: {
              name: { type: 'string', default: '' },
            },
            additionalProperties: false,
          },
        },
      },
    });

    it('owner can create table', async () => {
      const newTableId = 'new-test-table';
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getMutation(fixture.project.draftRevisionId, newTableId),
      });

      expect(result.createTable.table).toBeDefined();
      expect(result.createTable.table.id).toBe(newTableId);
    });

    it('cross-owner cannot create table', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.anotherOwner.token,
          ...getMutation(fixture.project.draftRevisionId, 'another-table'),
        },
        /You are not allowed to read on Project/,
      );
    });

    it('unauthenticated cannot create table', async () => {
      await gqlQueryExpectError(
        {
          app,
          ...getMutation(fixture.project.draftRevisionId, 'unauth-table'),
        },
        /Unauthorized/,
      );
    });

    it('should fail for duplicate table id', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.owner.token,
          ...getMutation(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
          ),
        },
        /A table with this name already exists in the revision/,
      );
    });
  });

  describe('removeTable', () => {
    let fixture: PrepareDataReturnType;

    beforeEach(async () => {
      fixture = await prepareData(app);
    });

    const getMutation = (revisionId: string, tableId: string) => ({
      query: gql`
        mutation removeTable($data: RemoveTableInput!) {
          removeTable(data: $data) {
            branch {
              id
            }
          }
        }
      `,
      variables: {
        data: { revisionId, tableId },
      },
    });

    it('owner can remove table', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getMutation(
          fixture.project.draftRevisionId,
          fixture.project.tableId,
        ),
      });

      expect(result.removeTable.branch).toBeDefined();
      expect(result.removeTable.branch.id).toBe(fixture.project.branchId);
    });

    it('cross-owner cannot remove table', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.anotherOwner.token,
          ...getMutation(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
          ),
        },
        /You are not allowed to read on Project/,
      );
    });

    it('unauthenticated cannot remove table', async () => {
      await gqlQueryExpectError(
        {
          app,
          ...getMutation(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
          ),
        },
        /Unauthorized/,
      );
    });
  });

  describe('renameTable', () => {
    let fixture: PrepareDataReturnType;

    beforeEach(async () => {
      fixture = await prepareData(app);
    });

    const getMutation = (
      revisionId: string,
      tableId: string,
      nextTableId: string,
    ) => ({
      query: gql`
        mutation renameTable($data: RenameTableInput!) {
          renameTable(data: $data) {
            previousVersionTableId
            table {
              id
            }
          }
        }
      `,
      variables: {
        data: { revisionId, tableId, nextTableId },
      },
    });

    it('owner can rename table', async () => {
      const nextTableId = 'renamed-table';
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getMutation(
          fixture.project.draftRevisionId,
          fixture.project.tableId,
          nextTableId,
        ),
      });

      expect(result.renameTable.table.id).toBe(nextTableId);
    });

    it('cross-owner cannot rename table', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.anotherOwner.token,
          ...getMutation(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            'cross-rename',
          ),
        },
        /You are not allowed to read on Project/,
      );
    });

    it('should fail if target name exists', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.owner.token,
          ...getMutation(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            fixture.project.tableId, // same name
          ),
        },
        /A table with this name already exists in the revision/,
      );
    });
  });

  describe('createRow', () => {
    let fixture: PrepareDataReturnType;

    beforeEach(async () => {
      fixture = await prepareData(app);
    });

    const getMutation = (
      revisionId: string,
      tableId: string,
      rowId: string,
      data: object,
    ) => ({
      query: gql`
        mutation createRow($data: CreateRowInput!) {
          createRow(data: $data) {
            row {
              id
              versionId
            }
          }
        }
      `,
      variables: {
        data: { revisionId, tableId, rowId, data },
      },
    });

    it('owner can create row', async () => {
      const newRowId = 'new-test-row';
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getMutation(
          fixture.project.draftRevisionId,
          fixture.project.tableId,
          newRowId,
          { ver: 100 },
        ),
      });

      expect(result.createRow.row).toBeDefined();
      expect(result.createRow.row.id).toBe(newRowId);
    });

    it('cross-owner cannot create row', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.anotherOwner.token,
          ...getMutation(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            'cross-row',
            { ver: 1 },
          ),
        },
        /You are not allowed to read on Project/,
      );
    });

    it('unauthenticated cannot create row', async () => {
      await gqlQueryExpectError(
        {
          app,
          ...getMutation(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            'unauth-row',
            { ver: 1 },
          ),
        },
        /Unauthorized/,
      );
    });
  });

  describe('updateRow', () => {
    let fixture: PrepareDataReturnType;

    beforeEach(async () => {
      fixture = await prepareData(app);
    });

    const getMutation = (
      revisionId: string,
      tableId: string,
      rowId: string,
      data: object,
    ) => ({
      query: gql`
        mutation updateRow($data: UpdateRowInput!) {
          updateRow(data: $data) {
            previousVersionRowId
            row {
              id
            }
          }
        }
      `,
      variables: {
        data: { revisionId, tableId, rowId, data },
      },
    });

    it('owner can update row', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getMutation(
          fixture.project.draftRevisionId,
          fixture.project.tableId,
          fixture.project.rowId,
          { ver: 999 },
        ),
      });

      expect(result.updateRow.row.id).toBe(fixture.project.rowId);
    });

    it('cross-owner cannot update row', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.anotherOwner.token,
          ...getMutation(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            fixture.project.rowId,
            { ver: 1 },
          ),
        },
        /You are not allowed to read on Project/,
      );
    });
  });

  describe('removeRow', () => {
    let fixture: PrepareDataReturnType;

    beforeEach(async () => {
      fixture = await prepareData(app);
    });

    const getMutation = (
      revisionId: string,
      tableId: string,
      rowId: string,
    ) => ({
      query: gql`
        mutation removeRow($data: RemoveRowInput!) {
          removeRow(data: $data) {
            branch {
              id
            }
            table {
              id
            }
          }
        }
      `,
      variables: {
        data: { revisionId, tableId, rowId },
      },
    });

    it('owner can remove row', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getMutation(
          fixture.project.draftRevisionId,
          fixture.project.tableId,
          fixture.project.rowId,
        ),
      });

      expect(result.removeRow.branch).toBeDefined();
      expect(result.removeRow.table).toBeDefined();
    });

    it('cross-owner cannot remove row', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.anotherOwner.token,
          ...getMutation(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            fixture.project.rowId,
          ),
        },
        /You are not allowed to read on Project/,
      );
    });
  });

  describe('renameRow', () => {
    let fixture: PrepareDataReturnType;

    beforeEach(async () => {
      fixture = await prepareData(app);
    });

    const getMutation = (
      revisionId: string,
      tableId: string,
      rowId: string,
      nextRowId: string,
    ) => ({
      query: gql`
        mutation renameRow($data: RenameRowInput!) {
          renameRow(data: $data) {
            previousVersionRowId
            row {
              id
            }
          }
        }
      `,
      variables: {
        data: { revisionId, tableId, rowId, nextRowId },
      },
    });

    it('owner can rename row', async () => {
      const nextRowId = 'renamed-row';
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getMutation(
          fixture.project.draftRevisionId,
          fixture.project.tableId,
          fixture.project.rowId,
          nextRowId,
        ),
      });

      expect(result.renameRow.row.id).toBe(nextRowId);
    });

    it('cross-owner cannot rename row', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.anotherOwner.token,
          ...getMutation(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            fixture.project.rowId,
            'cross-rename',
          ),
        },
        /You are not allowed to read on Project/,
      );
    });
  });
});
