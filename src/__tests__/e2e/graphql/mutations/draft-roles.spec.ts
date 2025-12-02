import { INestApplication } from '@nestjs/common';
import { gql } from 'src/__tests__/utils/gql';
import {
  prepareDataWithRoles,
  PrepareDataWithRolesReturnType,
} from 'src/__tests__/utils/prepareProject';
import {
  createFreshTestApp,
  gqlQuery,
  gqlQueryExpectError,
} from 'src/__tests__/e2e/shared';

describe('graphql - draft mutations (role-based)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createFreshTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Table Operations', () => {
    let fixture: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      fixture = await prepareDataWithRoles(app);
    });

    describe('createTable', () => {
      const getCreateTableMutation = (revisionId: string, tableId: string) => ({
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
        const result = await gqlQuery({
          app,
          token: fixture.owner.token,
          ...getCreateTableMutation(
            fixture.project.draftRevisionId,
            'owner-table',
          ),
        });
        expect(result.createTable.table.id).toBe('owner-table');
      });

      it('developer can create table', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.developer.token,
          ...getCreateTableMutation(
            fixture.project.draftRevisionId,
            'dev-table',
          ),
        });
        expect(result.createTable.table.id).toBe('dev-table');
      });

      it('editor cannot create table', async () => {
        await gqlQueryExpectError(
          {
            app,
            token: fixture.editor.token,
            ...getCreateTableMutation(
              fixture.project.draftRevisionId,
              'editor-table',
            ),
          },
          /You are not allowed to create on Table/,
        );
      });

      it('reader cannot create table', async () => {
        await gqlQueryExpectError(
          {
            app,
            token: fixture.reader.token,
            ...getCreateTableMutation(
              fixture.project.draftRevisionId,
              'reader-table',
            ),
          },
          /You are not allowed to create on Table/,
        );
      });
    });

    describe('removeTable', () => {
      const getRemoveTableMutation = (revisionId: string, tableId: string) => ({
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
          ...getRemoveTableMutation(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
          ),
        });
        expect(result.removeTable.branch).toBeDefined();
      });

      it('developer can remove table', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.developer.token,
          ...getRemoveTableMutation(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
          ),
        });
        expect(result.removeTable.branch).toBeDefined();
      });

      it('editor cannot remove table', async () => {
        await gqlQueryExpectError(
          {
            app,
            token: fixture.editor.token,
            ...getRemoveTableMutation(
              fixture.project.draftRevisionId,
              fixture.project.tableId,
            ),
          },
          /You are not allowed to delete on Table/,
        );
      });

      it('reader cannot remove table', async () => {
        await gqlQueryExpectError(
          {
            app,
            token: fixture.reader.token,
            ...getRemoveTableMutation(
              fixture.project.draftRevisionId,
              fixture.project.tableId,
            ),
          },
          /You are not allowed to delete on Table/,
        );
      });
    });

    describe('renameTable', () => {
      const getRenameTableMutation = (
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
        const result = await gqlQuery({
          app,
          token: fixture.owner.token,
          ...getRenameTableMutation(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            'owner-renamed',
          ),
        });
        expect(result.renameTable.table.id).toBe('owner-renamed');
      });

      it('developer can rename table', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.developer.token,
          ...getRenameTableMutation(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            'dev-renamed',
          ),
        });
        expect(result.renameTable.table.id).toBe('dev-renamed');
      });

      it('editor cannot rename table', async () => {
        await gqlQueryExpectError(
          {
            app,
            token: fixture.editor.token,
            ...getRenameTableMutation(
              fixture.project.draftRevisionId,
              fixture.project.tableId,
              'editor-renamed',
            ),
          },
          /You are not allowed to update on Table/,
        );
      });

      it('reader cannot rename table', async () => {
        await gqlQueryExpectError(
          {
            app,
            token: fixture.reader.token,
            ...getRenameTableMutation(
              fixture.project.draftRevisionId,
              fixture.project.tableId,
              'reader-renamed',
            ),
          },
          /You are not allowed to update on Table/,
        );
      });
    });
  });

  describe('Row Operations', () => {
    let fixture: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      fixture = await prepareDataWithRoles(app);
    });

    describe('createRow', () => {
      const getCreateRowMutation = (
        revisionId: string,
        tableId: string,
        rowId: string,
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
          data: { revisionId, tableId, rowId, data: { ver: 100 } },
        },
      });

      it('owner can create row', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.owner.token,
          ...getCreateRowMutation(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            'owner-row',
          ),
        });
        expect(result.createRow.row.id).toBe('owner-row');
      });

      it('developer can create row', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.developer.token,
          ...getCreateRowMutation(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            'dev-row',
          ),
        });
        expect(result.createRow.row.id).toBe('dev-row');
      });

      it('editor can create row', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.editor.token,
          ...getCreateRowMutation(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            'editor-row',
          ),
        });
        expect(result.createRow.row.id).toBe('editor-row');
      });

      it('reader cannot create row', async () => {
        await gqlQueryExpectError(
          {
            app,
            token: fixture.reader.token,
            ...getCreateRowMutation(
              fixture.project.draftRevisionId,
              fixture.project.tableId,
              'reader-row',
            ),
          },
          /You are not allowed to create on Row/,
        );
      });
    });

    describe('updateRow', () => {
      const getUpdateRowMutation = (
        revisionId: string,
        tableId: string,
        rowId: string,
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
          data: { revisionId, tableId, rowId, data: { ver: 999 } },
        },
      });

      it('owner can update row', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.owner.token,
          ...getUpdateRowMutation(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            fixture.project.rowId,
          ),
        });
        expect(result.updateRow.row.id).toBe(fixture.project.rowId);
      });

      it('developer can update row', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.developer.token,
          ...getUpdateRowMutation(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            fixture.project.rowId,
          ),
        });
        expect(result.updateRow.row.id).toBe(fixture.project.rowId);
      });

      it('editor can update row', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.editor.token,
          ...getUpdateRowMutation(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            fixture.project.rowId,
          ),
        });
        expect(result.updateRow.row.id).toBe(fixture.project.rowId);
      });

      it('reader cannot update row', async () => {
        await gqlQueryExpectError(
          {
            app,
            token: fixture.reader.token,
            ...getUpdateRowMutation(
              fixture.project.draftRevisionId,
              fixture.project.tableId,
              fixture.project.rowId,
            ),
          },
          /You are not allowed to update on Row/,
        );
      });
    });

    describe('removeRow', () => {
      const getRemoveRowMutation = (
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
          ...getRemoveRowMutation(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            fixture.project.rowId,
          ),
        });
        expect(result.removeRow.branch).toBeDefined();
      });

      it('developer can remove row', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.developer.token,
          ...getRemoveRowMutation(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            fixture.project.rowId,
          ),
        });
        expect(result.removeRow.branch).toBeDefined();
      });

      it('editor can remove row', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.editor.token,
          ...getRemoveRowMutation(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            fixture.project.rowId,
          ),
        });
        expect(result.removeRow.branch).toBeDefined();
      });

      it('reader cannot remove row', async () => {
        await gqlQueryExpectError(
          {
            app,
            token: fixture.reader.token,
            ...getRemoveRowMutation(
              fixture.project.draftRevisionId,
              fixture.project.tableId,
              fixture.project.rowId,
            ),
          },
          /You are not allowed to delete on Row/,
        );
      });
    });

    describe('renameRow', () => {
      const getRenameRowMutation = (
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
        const result = await gqlQuery({
          app,
          token: fixture.owner.token,
          ...getRenameRowMutation(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            fixture.project.rowId,
            'owner-renamed-row',
          ),
        });
        expect(result.renameRow.row.id).toBe('owner-renamed-row');
      });

      it('developer can rename row', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.developer.token,
          ...getRenameRowMutation(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            fixture.project.rowId,
            'dev-renamed-row',
          ),
        });
        expect(result.renameRow.row.id).toBe('dev-renamed-row');
      });

      it('editor can rename row', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.editor.token,
          ...getRenameRowMutation(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
            fixture.project.rowId,
            'editor-renamed-row',
          ),
        });
        expect(result.renameRow.row.id).toBe('editor-renamed-row');
      });

      it('reader cannot rename row', async () => {
        await gqlQueryExpectError(
          {
            app,
            token: fixture.reader.token,
            ...getRenameRowMutation(
              fixture.project.draftRevisionId,
              fixture.project.tableId,
              fixture.project.rowId,
              'reader-renamed-row',
            ),
          },
          /You are not allowed to update on Row/,
        );
      });
    });
  });
});
