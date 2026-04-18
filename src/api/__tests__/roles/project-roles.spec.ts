import { nanoid } from 'nanoid';
import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  type ActorRole,
  type Outcome,
} from 'src/testing/kit/auth-permission';
import { usingProjectWithRoles } from 'src/testing/scenarios/using-project-with-roles';

type RoleCase = {
  name: string;
  role: ActorRole;
  expected: Outcome;
};

const OWNER_AND_DEVELOPER_WRITE: RoleCase[] = [
  { name: 'owner', role: 'owner', expected: 'allowed' },
  { name: 'developer', role: 'developer', expected: 'allowed' },
  { name: 'editor', role: 'editor', expected: 'forbidden' },
  { name: 'reader', role: 'reader', expected: 'forbidden' },
];

const OWNER_DEVELOPER_EDITOR_WRITE: RoleCase[] = [
  { name: 'owner', role: 'owner', expected: 'allowed' },
  { name: 'developer', role: 'developer', expected: 'allowed' },
  { name: 'editor', role: 'editor', expected: 'allowed' },
  { name: 'reader', role: 'reader', expected: 'forbidden' },
];

const OWNER_ONLY: RoleCase[] = [
  { name: 'owner', role: 'owner', expected: 'allowed' },
  { name: 'developer', role: 'developer', expected: 'forbidden' },
  { name: 'editor', role: 'editor', expected: 'forbidden' },
  { name: 'reader', role: 'reader', expected: 'forbidden' },
];

const ALL_ROLES_READ: RoleCase[] = [
  { name: 'owner', role: 'owner', expected: 'allowed' },
  { name: 'developer', role: 'developer', expected: 'allowed' },
  { name: 'editor', role: 'editor', expected: 'allowed' },
  { name: 'reader', role: 'reader', expected: 'allowed' },
];

describe('project roles — REST', () => {
  const roles = usingProjectWithRoles();

  describe('createTable (POST /revision/:r/tables)', () => {
    const createTable = operation<{
      revisionId: string;
      tableId: string;
      schema: object;
    }>({
      id: 'roles.createTable',
      rest: {
        method: 'post',
        url: ({ revisionId }) => `/api/revision/${revisionId}/tables`,
        body: ({ tableId, schema }) => ({ tableId, schema }),
      },
    });

    runAuthMatrix({
      op: createTable,
      cases: OWNER_AND_DEVELOPER_WRITE,
      build: () => ({
        fixture: roles.fixture,
        params: {
          revisionId: roles.fixture.project.draftRevisionId,
          tableId: `t-${nanoid()}`,
          schema: {
            type: 'object',
            properties: {},
            required: [],
            additionalProperties: false,
          },
        },
      }),
    });
  });

  describe('deleteTable (DELETE /revision/:r/tables/:t)', () => {
    const deleteTable = operation<{ revisionId: string; tableId: string }>({
      id: 'roles.deleteTable',
      rest: {
        method: 'delete',
        url: ({ revisionId, tableId }) =>
          `/api/revision/${revisionId}/tables/${tableId}`,
      },
    });

    runAuthMatrix({
      op: deleteTable,
      cases: OWNER_AND_DEVELOPER_WRITE,
      build: () => ({
        fixture: roles.fixture,
        params: {
          revisionId: roles.fixture.project.draftRevisionId,
          tableId: roles.fixture.project.tableId,
        },
      }),
    });
  });

  describe('createRow (POST /revision/:r/tables/:t/create-row)', () => {
    const createRow = operation<{
      revisionId: string;
      tableId: string;
      rowId: string;
      data: object;
    }>({
      id: 'roles.createRow',
      rest: {
        method: 'post',
        url: ({ revisionId, tableId }) =>
          `/api/revision/${revisionId}/tables/${tableId}/create-row`,
        body: ({ rowId, data }) => ({ rowId, data }),
      },
    });

    runAuthMatrix({
      op: createRow,
      cases: OWNER_DEVELOPER_EDITOR_WRITE,
      build: () => ({
        fixture: roles.fixture,
        params: {
          revisionId: roles.fixture.project.draftRevisionId,
          tableId: roles.fixture.project.tableId,
          rowId: `r-${nanoid()}`,
          data: { ver: 1 },
        },
      }),
    });
  });

  describe('createBranch (POST /revision/:r/child-branches)', () => {
    const createBranch = operation<{ revisionId: string; branchName: string }>({
      id: 'roles.createBranch',
      rest: {
        method: 'post',
        url: ({ revisionId }) => `/api/revision/${revisionId}/child-branches`,
        body: ({ branchName }) => ({ branchName }),
      },
    });

    runAuthMatrix({
      op: createBranch,
      cases: OWNER_AND_DEVELOPER_WRITE,
      build: () => ({
        fixture: roles.fixture,
        params: {
          revisionId: roles.fixture.project.headRevisionId,
          branchName: `br-${nanoid()}`,
        },
      }),
    });
  });

  describe('revertChanges (POST /branches/:b/revert-changes)', () => {
    const revertChanges = operation<{
      organizationId: string;
      projectName: string;
      branchName: string;
    }>({
      id: 'roles.revertChanges',
      rest: {
        method: 'post',
        url: ({ organizationId, projectName, branchName }) =>
          `/api/organization/${organizationId}/projects/${projectName}/branches/${branchName}/revert-changes`,
      },
    });

    runAuthMatrix({
      op: revertChanges,
      cases: OWNER_DEVELOPER_EDITOR_WRITE,
      build: () => ({
        fixture: roles.fixture,
        params: {
          organizationId: roles.fixture.project.organizationId,
          projectName: roles.fixture.project.projectName,
          branchName: roles.fixture.project.branchName,
        },
      }),
    });
  });

  describe('createRevision (POST /branches/:b/create-revision)', () => {
    const createRevision = operation<{
      organizationId: string;
      projectName: string;
      branchName: string;
    }>({
      id: 'roles.createRevision',
      rest: {
        method: 'post',
        url: ({ organizationId, projectName, branchName }) =>
          `/api/organization/${organizationId}/projects/${projectName}/branches/${branchName}/create-revision`,
      },
    });

    runAuthMatrix({
      op: createRevision,
      cases: OWNER_DEVELOPER_EDITOR_WRITE,
      build: () => ({
        fixture: roles.fixture,
        params: {
          organizationId: roles.fixture.project.organizationId,
          projectName: roles.fixture.project.projectName,
          branchName: roles.fixture.project.branchName,
        },
      }),
    });
  });

  describe('createEndpoint (POST /revision/:r/endpoints)', () => {
    const createEndpoint = operation<{ revisionId: string; type: string }>({
      id: 'roles.createEndpoint',
      rest: {
        method: 'post',
        url: ({ revisionId }) => `/api/revision/${revisionId}/endpoints`,
        body: ({ type }) => ({ type }),
      },
    });

    runAuthMatrix({
      op: createEndpoint,
      cases: OWNER_AND_DEVELOPER_WRITE,
      build: () => ({
        fixture: roles.fixture,
        // head revision already has GRAPHQL + REST_API endpoints seeded;
        // cover the authz outcome even if "allowed" path hits 409 on
        // duplicate — we only assert the transport gate here.
        params: {
          revisionId: roles.fixture.project.headRevisionId,
          type: 'GRAPHQL',
        },
      }),
    });
  });

  describe('updateProject (PUT /organization/:o/projects/:p)', () => {
    const updateProject = operation<{
      organizationId: string;
      projectName: string;
      isPublic: boolean;
    }>({
      id: 'roles.updateProject',
      rest: {
        method: 'put',
        url: ({ organizationId, projectName }) =>
          `/api/organization/${organizationId}/projects/${projectName}`,
        body: ({ isPublic }) => ({ isPublic }),
      },
    });

    runAuthMatrix({
      op: updateProject,
      cases: OWNER_ONLY,
      build: () => ({
        fixture: roles.fixture,
        params: {
          organizationId: roles.fixture.project.organizationId,
          projectName: roles.fixture.project.projectName,
          isPublic: true,
        },
      }),
    });
  });

  describe('deleteProject (DELETE /organization/:o/projects/:p)', () => {
    const deleteProject = operation<{
      organizationId: string;
      projectName: string;
    }>({
      id: 'roles.deleteProject',
      rest: {
        method: 'delete',
        url: ({ organizationId, projectName }) =>
          `/api/organization/${organizationId}/projects/${projectName}`,
      },
    });

    runAuthMatrix({
      op: deleteProject,
      cases: OWNER_ONLY,
      build: () => ({
        fixture: roles.fixture,
        params: {
          organizationId: roles.fixture.project.organizationId,
          projectName: roles.fixture.project.projectName,
        },
      }),
    });
  });

  describe('readProject (GET /organization/:o/projects/:p)', () => {
    const getProject = operation<{
      organizationId: string;
      projectName: string;
    }>({
      id: 'roles.readProject',
      rest: {
        method: 'get',
        url: ({ organizationId, projectName }) =>
          `/api/organization/${organizationId}/projects/${projectName}`,
      },
      gql: {
        query: gql`
          query project($data: GetProjectInput!) {
            project(data: $data) {
              id
            }
          }
        `,
        variables: (params) => ({ data: params }),
      },
    });

    runAuthMatrix({
      op: getProject,
      cases: ALL_ROLES_READ,
      build: () => ({
        fixture: roles.fixture,
        params: {
          organizationId: roles.fixture.project.organizationId,
          projectName: roles.fixture.project.projectName,
        },
      }),
    });
  });
});
