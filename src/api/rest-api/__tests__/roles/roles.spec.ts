import { INestApplication } from '@nestjs/common';
import {
  prepareDataWithRoles,
  PrepareDataWithRolesReturnType,
} from 'src/__tests__/utils/prepareProject';
import {
  createFreshTestApp,
  authGet,
  authPost,
  authDelete,
  authPut,
} from 'src/__tests__/e2e/shared';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { EndpointType } from 'src/api/graphql-api/endpoint/model/endpoint.model';

describe('restapi - role-based permissions', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    app = await createFreshTestApp();
    prismaService = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Table Operations', () => {
    let fixture: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      fixture = await prepareDataWithRoles(app);
    });

    describe('POST /revision/:revisionId/tables (createTable)', () => {
      const getCreateTableUrl = (revisionId: string) =>
        `/api/revision/${revisionId}/tables`;

      const createTableBody = (tableId: string) => ({
        tableId,
        schema: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', default: '' },
          },
          additionalProperties: false,
        },
      });

      it('owner can create table', async () => {
        const result = await authPost(
          app,
          getCreateTableUrl(fixture.project.draftRevisionId),
          fixture.owner.token,
          createTableBody('owner-table'),
        )
          .expect(201)
          .then((res) => res.body);

        expect(result.table.id).toBe('owner-table');
      });

      it('developer can create table', async () => {
        const result = await authPost(
          app,
          getCreateTableUrl(fixture.project.draftRevisionId),
          fixture.developer.token,
          createTableBody('dev-table'),
        )
          .expect(201)
          .then((res) => res.body);

        expect(result.table.id).toBe('dev-table');
      });

      it('editor cannot create table', async () => {
        await authPost(
          app,
          getCreateTableUrl(fixture.project.draftRevisionId),
          fixture.editor.token,
          createTableBody('editor-table'),
        ).expect(/You are not allowed to create on Table/);
      });

      it('reader cannot create table', async () => {
        await authPost(
          app,
          getCreateTableUrl(fixture.project.draftRevisionId),
          fixture.reader.token,
          createTableBody('reader-table'),
        ).expect(/You are not allowed to create on Table/);
      });
    });

    describe('DELETE /revision/:revisionId/tables/:tableId (removeTable)', () => {
      it('owner can remove table', async () => {
        const result = await authDelete(
          app,
          `/api/revision/${fixture.project.draftRevisionId}/tables/${fixture.project.tableId}`,
          fixture.owner.token,
        )
          .expect(200)
          .then((res) => res.body);

        expect(result).toHaveProperty('id');
      });

      it('developer can remove table', async () => {
        const result = await authDelete(
          app,
          `/api/revision/${fixture.project.draftRevisionId}/tables/${fixture.project.tableId}`,
          fixture.developer.token,
        )
          .expect(200)
          .then((res) => res.body);

        expect(result).toHaveProperty('id');
      });

      it('editor cannot remove table', async () => {
        await authDelete(
          app,
          `/api/revision/${fixture.project.draftRevisionId}/tables/${fixture.project.tableId}`,
          fixture.editor.token,
        ).expect(/You are not allowed to delete on Table/);
      });

      it('reader cannot remove table', async () => {
        await authDelete(
          app,
          `/api/revision/${fixture.project.draftRevisionId}/tables/${fixture.project.tableId}`,
          fixture.reader.token,
        ).expect(/You are not allowed to delete on Table/);
      });
    });
  });

  describe('Row Operations', () => {
    let fixture: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      fixture = await prepareDataWithRoles(app);
    });

    describe('POST /revision/:revisionId/tables/:tableId/create-row', () => {
      const getCreateRowUrl = (revisionId: string, tableId: string) =>
        `/api/revision/${revisionId}/tables/${tableId}/create-row`;

      it('owner can create row', async () => {
        const result = await authPost(
          app,
          getCreateRowUrl(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
          ),
          fixture.owner.token,
          { rowId: 'owner-row', data: { ver: 100 } },
        )
          .expect(201)
          .then((res) => res.body);

        expect(result.row.id).toBe('owner-row');
      });

      it('developer can create row', async () => {
        const result = await authPost(
          app,
          getCreateRowUrl(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
          ),
          fixture.developer.token,
          { rowId: 'dev-row', data: { ver: 100 } },
        )
          .expect(201)
          .then((res) => res.body);

        expect(result.row.id).toBe('dev-row');
      });

      it('editor can create row', async () => {
        const result = await authPost(
          app,
          getCreateRowUrl(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
          ),
          fixture.editor.token,
          { rowId: 'editor-row', data: { ver: 100 } },
        )
          .expect(201)
          .then((res) => res.body);

        expect(result.row.id).toBe('editor-row');
      });

      it('reader cannot create row', async () => {
        await authPost(
          app,
          getCreateRowUrl(
            fixture.project.draftRevisionId,
            fixture.project.tableId,
          ),
          fixture.reader.token,
          { rowId: 'reader-row', data: { ver: 100 } },
        ).expect(/You are not allowed to create on Row/);
      });
    });
  });

  describe('Branch Operations', () => {
    let fixture: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      fixture = await prepareDataWithRoles(app);
    });

    describe('POST /revision/:revisionId/child-branches (createBranch)', () => {
      const getCreateBranchUrl = (revisionId: string) =>
        `/api/revision/${revisionId}/child-branches`;

      it('owner can create branch', async () => {
        const result = await authPost(
          app,
          getCreateBranchUrl(fixture.project.headRevisionId),
          fixture.owner.token,
          { branchName: 'owner-branch' },
        )
          .expect(201)
          .then((res) => res.body);

        expect(result.name).toBe('owner-branch');
      });

      it('developer can create branch', async () => {
        const result = await authPost(
          app,
          getCreateBranchUrl(fixture.project.headRevisionId),
          fixture.developer.token,
          { branchName: 'dev-branch' },
        )
          .expect(201)
          .then((res) => res.body);

        expect(result.name).toBe('dev-branch');
      });

      it('editor cannot create branch', async () => {
        await authPost(
          app,
          getCreateBranchUrl(fixture.project.headRevisionId),
          fixture.editor.token,
          { branchName: 'editor-branch' },
        ).expect(/You are not allowed to create on Branch/);
      });

      it('reader cannot create branch', async () => {
        await authPost(
          app,
          getCreateBranchUrl(fixture.project.headRevisionId),
          fixture.reader.token,
          { branchName: 'reader-branch' },
        ).expect(/You are not allowed to create on Branch/);
      });
    });

    describe('POST /organization/:orgId/projects/:projectName/branches/:branchName/revert-changes', () => {
      const getRevertChangesUrl = (
        organizationId: string,
        projectName: string,
        branchName: string,
      ) =>
        `/api/organization/${organizationId}/projects/${projectName}/branches/${branchName}/revert-changes`;

      it('owner can revert changes', async () => {
        const result = await authPost(
          app,
          getRevertChangesUrl(
            fixture.project.organizationId,
            fixture.project.projectName,
            fixture.project.branchName,
          ),
          fixture.owner.token,
        )
          .expect(201)
          .then((res) => res.body);

        expect(result.id).toBe(fixture.project.branchId);
      });

      it('developer can revert changes', async () => {
        const result = await authPost(
          app,
          getRevertChangesUrl(
            fixture.project.organizationId,
            fixture.project.projectName,
            fixture.project.branchName,
          ),
          fixture.developer.token,
        )
          .expect(201)
          .then((res) => res.body);

        expect(result.id).toBe(fixture.project.branchId);
      });

      it('editor can revert changes', async () => {
        const result = await authPost(
          app,
          getRevertChangesUrl(
            fixture.project.organizationId,
            fixture.project.projectName,
            fixture.project.branchName,
          ),
          fixture.editor.token,
        )
          .expect(201)
          .then((res) => res.body);

        expect(result.id).toBe(fixture.project.branchId);
      });

      it('reader cannot revert changes', async () => {
        await authPost(
          app,
          getRevertChangesUrl(
            fixture.project.organizationId,
            fixture.project.projectName,
            fixture.project.branchName,
          ),
          fixture.reader.token,
        ).expect(/You are not allowed to revert on Revision/);
      });
    });
  });

  describe('Revision Operations', () => {
    let fixture: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      fixture = await prepareDataWithRoles(app);
    });

    describe('POST /organization/:orgId/projects/:projectName/branches/:branchName/create-revision', () => {
      const getCreateRevisionUrl = (
        organizationId: string,
        projectName: string,
        branchName: string,
      ) =>
        `/api/organization/${organizationId}/projects/${projectName}/branches/${branchName}/create-revision`;

      it('owner can create revision', async () => {
        const result = await authPost(
          app,
          getCreateRevisionUrl(
            fixture.project.organizationId,
            fixture.project.projectName,
            fixture.project.branchName,
          ),
          fixture.owner.token,
          { comment: 'Owner commit' },
        )
          .expect(201)
          .then((res) => res.body);

        expect(result).toHaveProperty('id');
      });

      it('developer can create revision', async () => {
        const result = await authPost(
          app,
          getCreateRevisionUrl(
            fixture.project.organizationId,
            fixture.project.projectName,
            fixture.project.branchName,
          ),
          fixture.developer.token,
          { comment: 'Developer commit' },
        )
          .expect(201)
          .then((res) => res.body);

        expect(result).toHaveProperty('id');
      });

      it('editor can create revision', async () => {
        const result = await authPost(
          app,
          getCreateRevisionUrl(
            fixture.project.organizationId,
            fixture.project.projectName,
            fixture.project.branchName,
          ),
          fixture.editor.token,
          { comment: 'Editor commit' },
        )
          .expect(201)
          .then((res) => res.body);

        expect(result).toHaveProperty('id');
      });

      it('reader cannot create revision', async () => {
        await authPost(
          app,
          getCreateRevisionUrl(
            fixture.project.organizationId,
            fixture.project.projectName,
            fixture.project.branchName,
          ),
          fixture.reader.token,
          { comment: 'Reader commit' },
        ).expect(/You are not allowed to create on Revision/);
      });
    });
  });

  describe('Endpoint Operations', () => {
    let fixture: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      fixture = await prepareDataWithRoles(app);
      // Remove existing endpoints for create tests
      await prismaService.endpoint.deleteMany({
        where: {
          revisionId: fixture.project.draftRevisionId,
        },
      });
    });

    describe('POST /revision/:revisionId/endpoints (createEndpoint)', () => {
      it('owner can create endpoint', async () => {
        const result = await authPost(
          app,
          `/api/revision/${fixture.project.draftRevisionId}/endpoints`,
          fixture.owner.token,
          { type: EndpointType.GRAPHQL },
        )
          .expect(201)
          .then((res) => res.body);

        expect(result.type).toBe(EndpointType.GRAPHQL);
      });

      it('developer can create endpoint', async () => {
        const result = await authPost(
          app,
          `/api/revision/${fixture.project.draftRevisionId}/endpoints`,
          fixture.developer.token,
          { type: EndpointType.GRAPHQL },
        )
          .expect(201)
          .then((res) => res.body);

        expect(result.type).toBe(EndpointType.GRAPHQL);
      });

      it('editor cannot create endpoint', async () => {
        await authPost(
          app,
          `/api/revision/${fixture.project.draftRevisionId}/endpoints`,
          fixture.editor.token,
          { type: EndpointType.GRAPHQL },
        ).expect(/You are not allowed to create on Endpoint/);
      });

      it('reader cannot create endpoint', async () => {
        await authPost(
          app,
          `/api/revision/${fixture.project.draftRevisionId}/endpoints`,
          fixture.reader.token,
          { type: EndpointType.GRAPHQL },
        ).expect(/You are not allowed to create on Endpoint/);
      });
    });
  });

  describe('Project Operations', () => {
    let fixture: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      fixture = await prepareDataWithRoles(app);
    });

    describe('PUT /organization/:orgId/projects/:projectName (updateProject)', () => {
      const getUpdateProjectUrl = (
        organizationId: string,
        projectName: string,
      ) => `/api/organization/${organizationId}/projects/${projectName}`;

      it('owner can update project', async () => {
        const result = await authPut(
          app,
          getUpdateProjectUrl(
            fixture.project.organizationId,
            fixture.project.projectName,
          ),
          fixture.owner.token,
          { isPublic: true },
        )
          .expect(200)
          .then((res) => res.body);

        expect(result).toStrictEqual({ success: true });
      });

      it('developer cannot update project', async () => {
        await authPut(
          app,
          getUpdateProjectUrl(
            fixture.project.organizationId,
            fixture.project.projectName,
          ),
          fixture.developer.token,
          { isPublic: true },
        ).expect(/You are not allowed to update on Project/);
      });

      it('editor cannot update project', async () => {
        await authPut(
          app,
          getUpdateProjectUrl(
            fixture.project.organizationId,
            fixture.project.projectName,
          ),
          fixture.editor.token,
          { isPublic: true },
        ).expect(/You are not allowed to update on Project/);
      });

      it('reader cannot update project', async () => {
        await authPut(
          app,
          getUpdateProjectUrl(
            fixture.project.organizationId,
            fixture.project.projectName,
          ),
          fixture.reader.token,
          { isPublic: true },
        ).expect(/You are not allowed to update on Project/);
      });
    });

    describe('DELETE /organization/:orgId/projects/:projectName (deleteProject)', () => {
      const getDeleteProjectUrl = (
        organizationId: string,
        projectName: string,
      ) => `/api/organization/${organizationId}/projects/${projectName}`;

      it('owner can delete project', async () => {
        const result = await authDelete(
          app,
          getDeleteProjectUrl(
            fixture.project.organizationId,
            fixture.project.projectName,
          ),
          fixture.owner.token,
        )
          .expect(200)
          .then((res) => res.body);

        expect(result).toStrictEqual({ success: true });
      });

      it('developer cannot delete project', async () => {
        await authDelete(
          app,
          getDeleteProjectUrl(
            fixture.project.organizationId,
            fixture.project.projectName,
          ),
          fixture.developer.token,
        ).expect(/You are not allowed to delete on Project/);
      });

      it('editor cannot delete project', async () => {
        await authDelete(
          app,
          getDeleteProjectUrl(
            fixture.project.organizationId,
            fixture.project.projectName,
          ),
          fixture.editor.token,
        ).expect(/You are not allowed to delete on Project/);
      });

      it('reader cannot delete project', async () => {
        await authDelete(
          app,
          getDeleteProjectUrl(
            fixture.project.organizationId,
            fixture.project.projectName,
          ),
          fixture.reader.token,
        ).expect(/You are not allowed to delete on Project/);
      });
    });
  });

  describe('Read Access (all roles should have read access)', () => {
    let fixture: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      fixture = await prepareDataWithRoles(app);
    });

    it('owner can read project', async () => {
      await authGet(
        app,
        `/api/organization/${fixture.project.organizationId}/projects/${fixture.project.projectName}`,
        fixture.owner.token,
      ).expect(200);
    });

    it('developer can read project', async () => {
      await authGet(
        app,
        `/api/organization/${fixture.project.organizationId}/projects/${fixture.project.projectName}`,
        fixture.developer.token,
      ).expect(200);
    });

    it('editor can read project', async () => {
      await authGet(
        app,
        `/api/organization/${fixture.project.organizationId}/projects/${fixture.project.projectName}`,
        fixture.editor.token,
      ).expect(200);
    });

    it('reader can read project', async () => {
      await authGet(
        app,
        `/api/organization/${fixture.project.organizationId}/projects/${fixture.project.projectName}`,
        fixture.reader.token,
      ).expect(200);
    });
  });
});
