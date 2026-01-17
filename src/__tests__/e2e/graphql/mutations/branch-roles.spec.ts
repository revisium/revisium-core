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

describe('graphql - branch mutations (role-based)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createFreshTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('createBranch', () => {
    let fixture: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      fixture = await prepareDataWithRoles(app);
    });

    const getMutation = (revisionId: string, branchName: string) => ({
      query: gql`
        mutation createBranch(
          $data: CreateBranchInput!
        ) {
          createBranch(data: $data) {
            id
            name
            isRoot
          }
        }
      `,
      variables: {
        data: { revisionId, branchName },
      },
    });

    it('owner can create branch', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getMutation(fixture.project.headRevisionId, 'owner-branch'),
      });
      expect(result.createBranch.name).toBe('owner-branch');
      expect(result.createBranch.isRoot).toBe(false);
    });

    it('developer can create branch', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.developer.token,
        ...getMutation(fixture.project.headRevisionId, 'dev-branch'),
      });
      expect(result.createBranch.name).toBe('dev-branch');
    });

    it('editor cannot create branch', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.editor.token,
          ...getMutation(fixture.project.headRevisionId, 'editor-branch'),
        },
        /You are not allowed to create on Branch/,
      );
    });

    it('reader cannot create branch', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.reader.token,
          ...getMutation(fixture.project.headRevisionId, 'reader-branch'),
        },
        /You are not allowed to create on Branch/,
      );
    });
  });

  describe('revertChanges', () => {
    let fixture: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      fixture = await prepareDataWithRoles(app);
    });

    const getMutation = (
      organizationId: string,
      projectName: string,
      branchName: string,
    ) => ({
      query: gql`
        mutation revertChanges($data: RevertChangesInput!) {
          revertChanges(data: $data) {
            id
            name
          }
        }
      `,
      variables: {
        data: { organizationId, projectName, branchName },
      },
    });

    it('owner can revert changes', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getMutation(
          fixture.project.organizationId,
          fixture.project.projectName,
          fixture.project.branchName,
        ),
      });
      expect(result.revertChanges.name).toBe(fixture.project.branchName);
    });

    it('developer can revert changes', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.developer.token,
        ...getMutation(
          fixture.project.organizationId,
          fixture.project.projectName,
          fixture.project.branchName,
        ),
      });
      expect(result.revertChanges.name).toBe(fixture.project.branchName);
    });

    it('editor can revert changes', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.editor.token,
        ...getMutation(
          fixture.project.organizationId,
          fixture.project.projectName,
          fixture.project.branchName,
        ),
      });
      expect(result.revertChanges.name).toBe(fixture.project.branchName);
    });

    it('reader cannot revert changes', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.reader.token,
          ...getMutation(
            fixture.project.organizationId,
            fixture.project.projectName,
            fixture.project.branchName,
          ),
        },
        /You are not allowed to revert on Revision/,
      );
    });
  });
});
