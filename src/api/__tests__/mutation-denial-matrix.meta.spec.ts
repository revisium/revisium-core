/**
 * Meta-test for mutation auth: for every write endpoint, verify that an
 * unrelated org's user gets 403 and an anonymous request gets 401.
 *
 * The owner-allowed case is intentionally NOT in this file:
 * - Role-based happy paths for most ops live in
 *   src/__tests__/e2e/graphql/mutations/draft-roles.spec.ts,
 *   branch-roles.spec.ts, etc.
 * - Ops without role-spec coverage (createRows, patchRows, updateRows,
 *   updateTable, updateTableViews) keep a dedicated owner-allowed test
 *   in their original per-op file for now.
 *
 * Every test below is a read-only denial check (no DB mutation on the
 * shared project), so they can all run against one fixture seeded in
 * beforeAll — one prepareData call instead of 108.
 */

import type { INestApplication } from '@nestjs/common';
import { gql } from 'src/testing/utils/gql';
import { getTestApp } from 'src/testing/e2e';
import {
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import {
  prepareData,
  type PrepareDataReturnType,
} from 'src/testing/utils/prepareProject';

// ──────────────────────────────────────────────────────────────────────
// denial cases only — owner-allowed is covered elsewhere (see header)
// ──────────────────────────────────────────────────────────────────────
const DENIAL_CASES: AuthMatrixCaseBase[] = [
  { name: 'cross-owner', role: 'crossOwner', expected: 'forbidden' },
  { name: 'anonymous', role: 'anonymous', expected: 'unauthorized' },
];

// Variant for endpoint.delete where an unknown endpoint id yields
// not_found (auth guard runs after the resource lookup). Using the
// real headEndpointId keeps the path at 403/401 for the wrong-user
// paths.

describe('mutation endpoints — auth denial matrix', () => {
  let app: INestApplication;
  let fixture: PrepareDataReturnType;

  beforeAll(async () => {
    app = await getTestApp();
    fixture = await prepareData(app);
  });

  // ────────────────────────────────────────────────────────────────────
  // branch.createRevision
  // ────────────────────────────────────────────────────────────────────
  describe('branch.createRevision', () => {
    const op = operation<{
      organizationId: string;
      projectName: string;
      branchName: string;
    }>({
      id: 'branch.createRevision',
      rest: {
        method: 'post',
        url: ({ organizationId, projectName, branchName }) =>
          `/api/organization/${organizationId}/projects/${projectName}/branches/${branchName}/create-revision`,
      },
    });

    runAuthMatrix({
      op,
      cases: DENIAL_CASES,
      build: () => ({
        fixture,
        params: {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
          branchName: fixture.project.branchName,
        },
      }),
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // branch.revertChanges
  // ────────────────────────────────────────────────────────────────────
  describe('branch.revertChanges', () => {
    const op = operation<{
      organizationId: string;
      projectName: string;
      branchName: string;
    }>({
      id: 'branch.revertChanges',
      rest: {
        method: 'post',
        url: ({ organizationId, projectName, branchName }) =>
          `/api/organization/${organizationId}/projects/${projectName}/branches/${branchName}/revert-changes`,
      },
      gql: {
        query: gql`
          mutation revertChanges($data: RevertChangesInput!) {
            revertChanges(data: $data) {
              id
            }
          }
        `,
        variables: (params) => ({ data: params }),
      },
    });

    runAuthMatrix({
      op,
      cases: DENIAL_CASES,
      build: () => ({
        fixture,
        params: {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
          branchName: fixture.project.branchName,
        },
      }),
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // endpoint.delete
  // ────────────────────────────────────────────────────────────────────
  describe('endpoint.delete', () => {
    const op = operation<{ endpointId: string }>({
      id: 'endpoint.delete',
      rest: {
        method: 'delete',
        url: ({ endpointId }) => `/api/endpoints/${endpointId}`,
      },
      gql: {
        query: gql`
          mutation deleteEndpoint($data: DeleteEndpointInput!) {
            deleteEndpoint(data: $data)
          }
        `,
        variables: ({ endpointId }) => ({ data: { endpointId } }),
      },
    });

    runAuthMatrix({
      op,
      cases: DENIAL_CASES,
      build: () => ({
        fixture,
        params: { endpointId: fixture.project.headEndpointId },
      }),
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // revision.createBranch
  // ────────────────────────────────────────────────────────────────────
  describe('revision.createBranch', () => {
    const op = operation<{ revisionId: string; branchName: string }>({
      id: 'revision.createBranch',
      rest: {
        method: 'post',
        url: ({ revisionId }) => `/api/revision/${revisionId}/child-branches`,
        body: ({ branchName }) => ({ branchName }),
      },
      gql: {
        query: gql`
          mutation createBranch($data: CreateBranchInput!) {
            createBranch(data: $data) {
              id
            }
          }
        `,
        variables: ({ revisionId, branchName }) => ({
          data: { revisionId, branchName },
        }),
      },
    });

    runAuthMatrix({
      op,
      cases: DENIAL_CASES,
      build: () => ({
        fixture,
        params: {
          revisionId: fixture.project.draftRevisionId,
          branchName: `new-${Date.now()}`,
        },
      }),
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // revision.createTable
  // ────────────────────────────────────────────────────────────────────
  describe('revision.createTable', () => {
    const op = operation<{
      revisionId: string;
      tableId: string;
      schema: object;
    }>({
      id: 'revision.createTable',
      rest: {
        method: 'post',
        url: ({ revisionId }) => `/api/revision/${revisionId}/tables`,
        body: ({ tableId, schema }) => ({ tableId, schema }),
      },
      gql: {
        query: gql`
          mutation createTable($data: CreateTableInput!) {
            createTable(data: $data) {
              table {
                id
              }
            }
          }
        `,
        variables: (params) => ({ data: params }),
      },
    });

    runAuthMatrix({
      op,
      cases: DENIAL_CASES,
      build: () => ({
        fixture,
        params: {
          revisionId: fixture.project.draftRevisionId,
          tableId: `scratch-${Date.now()}`,
          schema: { type: 'object', additionalProperties: false },
        },
      }),
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // row.delete / row.patch / row.rename / row.update
  // ────────────────────────────────────────────────────────────────────
  const rowBase = {
    revisionId: () => fixture.project.draftRevisionId,
    tableId: () => fixture.project.tableId,
    rowId: () => fixture.project.rowId,
  };

  describe('row.delete', () => {
    const op = operation<{
      revisionId: string;
      tableId: string;
      rowId: string;
    }>({
      id: 'row.delete',
      rest: {
        method: 'delete',
        url: ({ revisionId, tableId, rowId }) =>
          `/api/revision/${revisionId}/tables/${tableId}/rows/${rowId}`,
      },
      gql: {
        query: gql`
          mutation deleteRow($data: DeleteRowInput!) {
            deleteRow(data: $data) {
              table {
                id
              }
            }
          }
        `,
        variables: (params) => ({ data: params }),
      },
    });

    runAuthMatrix({
      op,
      cases: DENIAL_CASES,
      build: () => ({
        fixture,
        params: {
          revisionId: rowBase.revisionId(),
          tableId: rowBase.tableId(),
          rowId: rowBase.rowId(),
        },
      }),
    });
  });

  describe('row.patch', () => {
    const op = operation<{
      revisionId: string;
      tableId: string;
      rowId: string;
      patches: unknown[];
    }>({
      id: 'row.patch',
      rest: {
        method: 'patch',
        url: ({ revisionId, tableId, rowId }) =>
          `/api/revision/${revisionId}/tables/${tableId}/rows/${rowId}`,
        body: ({ patches }) => ({ patches }),
      },
      gql: {
        query: gql`
          mutation patchRow($data: PatchRowInput!) {
            patchRow(data: $data) {
              row {
                id
              }
            }
          }
        `,
        variables: (params) => ({ data: params }),
      },
    });

    runAuthMatrix({
      op,
      cases: DENIAL_CASES,
      build: () => ({
        fixture,
        params: {
          revisionId: rowBase.revisionId(),
          tableId: rowBase.tableId(),
          rowId: rowBase.rowId(),
          patches: [{ op: 'replace', path: '/ver', value: 99 }],
        },
      }),
    });
  });

  describe('row.rename', () => {
    const op = operation<{
      revisionId: string;
      tableId: string;
      rowId: string;
      nextRowId: string;
    }>({
      id: 'row.rename',
      rest: {
        method: 'patch',
        url: ({ revisionId, tableId, rowId }) =>
          `/api/revision/${revisionId}/tables/${tableId}/rows/${rowId}/rename`,
        body: ({ nextRowId }) => ({ nextRowId }),
      },
      gql: {
        query: gql`
          mutation renameRow($data: RenameRowInput!) {
            renameRow(data: $data) {
              row {
                id
              }
            }
          }
        `,
        variables: (params) => ({ data: params }),
      },
    });

    runAuthMatrix({
      op,
      cases: DENIAL_CASES,
      build: () => ({
        fixture,
        params: {
          revisionId: rowBase.revisionId(),
          tableId: rowBase.tableId(),
          rowId: rowBase.rowId(),
          nextRowId: `renamed-${Date.now()}`,
        },
      }),
    });
  });

  describe('row.update', () => {
    const op = operation<{
      revisionId: string;
      tableId: string;
      rowId: string;
      data: object;
    }>({
      id: 'row.update',
      rest: {
        method: 'put',
        url: ({ revisionId, tableId, rowId }) =>
          `/api/revision/${revisionId}/tables/${tableId}/rows/${rowId}`,
        body: ({ data }) => ({ data }),
      },
      gql: {
        query: gql`
          mutation updateRow($data: UpdateRowInput!) {
            updateRow(data: $data) {
              row {
                id
              }
            }
          }
        `,
        variables: (params) => ({ data: params }),
      },
    });

    runAuthMatrix({
      op,
      cases: DENIAL_CASES,
      build: () => ({
        fixture,
        params: {
          revisionId: rowBase.revisionId(),
          tableId: rowBase.tableId(),
          rowId: rowBase.rowId(),
          data: { ver: 42 },
        },
      }),
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // table.* ops
  // ────────────────────────────────────────────────────────────────────
  const tableBase = {
    revisionId: () => fixture.project.draftRevisionId,
    tableId: () => fixture.project.tableId,
  };

  describe('table.createRow', () => {
    const op = operation<{
      revisionId: string;
      tableId: string;
      rowId: string;
      data: object;
    }>({
      id: 'table.createRow',
      rest: {
        method: 'post',
        url: ({ revisionId, tableId }) =>
          `/api/revision/${revisionId}/tables/${tableId}/create-row`,
        body: ({ rowId, data }) => ({ rowId, data }),
      },
      gql: {
        query: gql`
          mutation createRow($data: CreateRowInput!) {
            createRow(data: $data) {
              row {
                id
              }
            }
          }
        `,
        variables: (params) => ({ data: params }),
      },
    });

    runAuthMatrix({
      op,
      cases: DENIAL_CASES,
      build: () => ({
        fixture,
        params: {
          revisionId: tableBase.revisionId(),
          tableId: tableBase.tableId(),
          rowId: `scratch-row-${Date.now()}`,
          data: { ver: 1 },
        },
      }),
    });
  });

  describe('table.createRows', () => {
    const op = operation<{
      revisionId: string;
      tableId: string;
      rows: Array<{ rowId: string; data: object }>;
    }>({
      id: 'table.createRows',
      rest: {
        method: 'post',
        url: ({ revisionId, tableId }) =>
          `/api/revision/${revisionId}/tables/${tableId}/create-rows`,
        body: ({ rows }) => ({ rows }),
      },
      gql: {
        query: gql`
          mutation createRows($data: CreateRowsInput!) {
            createRows(data: $data) {
              previousVersionTableId
              table {
                id
              }
            }
          }
        `,
        variables: (params) => ({ data: params }),
      },
    });

    runAuthMatrix({
      op,
      cases: DENIAL_CASES,
      build: () => ({
        fixture,
        params: {
          revisionId: tableBase.revisionId(),
          tableId: tableBase.tableId(),
          rows: [{ rowId: `scratch-${Date.now()}`, data: { ver: 1 } }],
        },
      }),
    });
  });

  describe('table.delete', () => {
    const op = operation<{ revisionId: string; tableId: string }>({
      id: 'table.delete',
      rest: {
        method: 'delete',
        url: ({ revisionId, tableId }) =>
          `/api/revision/${revisionId}/tables/${tableId}`,
      },
      gql: {
        query: gql`
          mutation deleteTable($data: DeleteTableInput!) {
            deleteTable(data: $data) {
              branch {
                id
              }
            }
          }
        `,
        variables: (params) => ({ data: params }),
      },
    });

    runAuthMatrix({
      op,
      cases: DENIAL_CASES,
      build: () => ({
        fixture,
        params: {
          revisionId: tableBase.revisionId(),
          tableId: tableBase.tableId(),
        },
      }),
    });
  });

  describe('table.deleteRows', () => {
    const op = operation<{
      revisionId: string;
      tableId: string;
      rowIds: string[];
    }>({
      id: 'table.deleteRows',
      rest: {
        method: 'delete',
        url: ({ revisionId, tableId }) =>
          `/api/revision/${revisionId}/tables/${tableId}/rows`,
        body: ({ rowIds }) => ({ rowIds }),
      },
      gql: {
        query: gql`
          mutation deleteRows($data: DeleteRowsInput!) {
            deleteRows(data: $data) {
              previousVersionTableId
              table {
                id
              }
            }
          }
        `,
        variables: (params) => ({ data: params }),
      },
    });

    runAuthMatrix({
      op,
      cases: DENIAL_CASES,
      build: () => ({
        fixture,
        params: {
          revisionId: tableBase.revisionId(),
          tableId: tableBase.tableId(),
          rowIds: [fixture.project.rowId],
        },
      }),
    });
  });

  describe('table.patchRows', () => {
    const op = operation<{
      revisionId: string;
      tableId: string;
      rows: Array<{ rowId: string; patches: unknown[] }>;
    }>({
      id: 'table.patchRows',
      rest: {
        method: 'patch',
        url: ({ revisionId, tableId }) =>
          `/api/revision/${revisionId}/tables/${tableId}/patch-rows`,
        body: ({ rows }) => ({ rows }),
      },
      gql: {
        query: gql`
          mutation patchRows($data: PatchRowsInput!) {
            patchRows(data: $data) {
              rows {
                id
              }
            }
          }
        `,
        variables: (params) => ({ data: params }),
      },
    });

    runAuthMatrix({
      op,
      cases: DENIAL_CASES,
      build: () => ({
        fixture,
        params: {
          revisionId: tableBase.revisionId(),
          tableId: tableBase.tableId(),
          rows: [
            {
              rowId: fixture.project.rowId,
              patches: [{ op: 'replace', path: '/ver', value: 99 }],
            },
          ],
        },
      }),
    });
  });

  describe('table.rename', () => {
    const op = operation<{
      revisionId: string;
      tableId: string;
      nextTableId: string;
    }>({
      id: 'table.rename',
      rest: {
        method: 'patch',
        url: ({ revisionId, tableId }) =>
          `/api/revision/${revisionId}/tables/${tableId}/rename`,
        body: ({ nextTableId }) => ({ nextTableId }),
      },
      gql: {
        query: gql`
          mutation renameTable($data: RenameTableInput!) {
            renameTable(data: $data) {
              table {
                id
              }
            }
          }
        `,
        variables: (params) => ({ data: params }),
      },
    });

    runAuthMatrix({
      op,
      cases: DENIAL_CASES,
      build: () => ({
        fixture,
        params: {
          revisionId: tableBase.revisionId(),
          tableId: tableBase.tableId(),
          nextTableId: `renamed-${Date.now()}`,
        },
      }),
    });
  });

  describe('table.update', () => {
    const op = operation<{
      revisionId: string;
      tableId: string;
      patches: unknown[];
    }>({
      id: 'table.update',
      rest: {
        method: 'patch',
        url: ({ revisionId, tableId }) =>
          `/api/revision/${revisionId}/tables/${tableId}`,
        body: ({ patches }) => ({ patches }),
      },
      gql: {
        query: gql`
          mutation updateTable($data: UpdateTableInput!) {
            updateTable(data: $data) {
              table {
                id
              }
            }
          }
        `,
        variables: (params) => ({ data: params }),
      },
    });

    runAuthMatrix({
      op,
      cases: DENIAL_CASES,
      build: () => ({
        fixture,
        params: {
          revisionId: tableBase.revisionId(),
          tableId: tableBase.tableId(),
          patches: [
            {
              op: 'add',
              path: '/properties/extra',
              value: { type: 'string' },
            },
          ],
        },
      }),
    });
  });

  describe('table.updateRows', () => {
    const op = operation<{
      revisionId: string;
      tableId: string;
      rows: Array<{ rowId: string; data: object }>;
    }>({
      id: 'table.updateRows',
      rest: {
        method: 'put',
        url: ({ revisionId, tableId }) =>
          `/api/revision/${revisionId}/tables/${tableId}/update-rows`,
        body: ({ rows }) => ({ rows }),
      },
      gql: {
        query: gql`
          mutation updateRows($data: UpdateRowsInput!) {
            updateRows(data: $data) {
              previousVersionTableId
              table {
                id
              }
            }
          }
        `,
        variables: (params) => ({ data: params }),
      },
    });

    runAuthMatrix({
      op,
      cases: DENIAL_CASES,
      build: () => ({
        fixture,
        params: {
          revisionId: tableBase.revisionId(),
          tableId: tableBase.tableId(),
          rows: [{ rowId: fixture.project.rowId, data: { ver: 42 } }],
        },
      }),
    });
  });

  describe('views.updateTableViews', () => {
    const op = operation<{
      revisionId: string;
      tableId: string;
      viewsData: object;
    }>({
      id: 'views.updateTableViews',
      gql: {
        query: gql`
          mutation updateTableViews($data: UpdateTableViewsInput!) {
            updateTableViews(data: $data) {
              version
              defaultViewId
            }
          }
        `,
        variables: (params) => ({ data: params }),
      },
    });

    runAuthMatrix({
      op,
      cases: DENIAL_CASES,
      build: () => ({
        fixture,
        params: {
          revisionId: tableBase.revisionId(),
          tableId: tableBase.tableId(),
          viewsData: {
            version: 1,
            defaultViewId: 'default',
            views: [{ id: 'default', name: 'Default', columns: [], sorts: [] }],
          },
        },
      }),
    });
  });
});
