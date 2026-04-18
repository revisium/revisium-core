import { INestApplication } from '@nestjs/common';
import { gql } from 'src/testing/utils/gql';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/testing/utils/prepareProject';
import { getTestApp, gqlQuery, gqlQueryExpectError } from 'src/testing/e2e';

describe('graphql - branch mutations', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await getTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('createBranch', () => {
    let fixture: PrepareDataReturnType;

    beforeEach(async () => {
      fixture = await prepareData(app);
    });

    const getMutation = (revisionId: string, branchName: string) => ({
      query: gql`
        mutation createBranch($data: CreateBranchInput!) {
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
      const newBranchName = 'new-test-branch';
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getMutation(fixture.project.headRevisionId, newBranchName),
      });

      expect(result.createBranch).toBeDefined();
      expect(result.createBranch.name).toBe(newBranchName);
      expect(result.createBranch.isRoot).toBe(false);
    });

    it('cross-owner cannot create branch', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.anotherOwner.token,
          ...getMutation(fixture.project.headRevisionId, 'cross-branch'),
        },
        /You are not allowed to read on Project/,
      );
    });

    it('unauthenticated cannot create branch', async () => {
      await gqlQueryExpectError(
        {
          app,
          ...getMutation(fixture.project.headRevisionId, 'unauth-branch'),
        },
        /Unauthorized/,
      );
    });

    it('should fail for duplicate branch name', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.owner.token,
          ...getMutation(
            fixture.project.headRevisionId,
            fixture.project.branchName,
          ),
        },
        /Unique constraint failed|already exists/,
      );
    });
  });

  describe('deleteBranch', () => {
    let fixture: PrepareDataReturnType;

    beforeEach(async () => {
      fixture = await prepareData(app);
    });

    const getDeleteMutation = (
      organizationId: string,
      projectName: string,
      branchName: string,
    ) => ({
      query: gql`
        mutation deleteBranch($data: DeleteBranchInput!) {
          deleteBranch(data: $data)
        }
      `,
      variables: {
        data: { organizationId, projectName, branchName },
      },
    });

    it('owner can delete non-root branch', async () => {
      // First create a branch to delete
      const newBranchName = 'branch-to-delete';
      await gqlQuery({
        app,
        token: fixture.owner.token,
        ...{
          query: gql`
            mutation createBranch($data: CreateBranchInput!) {
              createBranch(data: $data) {
                id
              }
            }
          `,
          variables: {
            data: {
              revisionId: fixture.project.headRevisionId,
              branchName: newBranchName,
            },
          },
        },
      });

      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getDeleteMutation(
          fixture.project.organizationId,
          fixture.project.projectName,
          newBranchName,
        ),
      });

      expect(result.deleteBranch).toBe(true);
    });
  });

  describe('revertChanges', () => {
    let fixture: PrepareDataReturnType;

    beforeEach(async () => {
      fixture = await prepareData(app);
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

      expect(result.revertChanges).toBeDefined();
      expect(result.revertChanges.name).toBe(fixture.project.branchName);
    });

    it('cross-owner cannot revert changes', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.anotherOwner.token,
          ...getMutation(
            fixture.project.organizationId,
            fixture.project.projectName,
            fixture.project.branchName,
          ),
        },
        /You are not allowed to read on Project/,
      );
    });

    it('unauthenticated cannot revert changes', async () => {
      await gqlQueryExpectError(
        {
          app,
          ...getMutation(
            fixture.project.organizationId,
            fixture.project.projectName,
            fixture.project.branchName,
          ),
        },
        /Unauthorized/,
      );
    });
  });
});
