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

describe('graphql - project mutations (role-based)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createFreshTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('updateProject', () => {
    let fixture: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      fixture = await prepareDataWithRoles(app);
    });

    const getMutation = (
      organizationId: string,
      projectName: string,
      isPublic: boolean,
    ) => ({
      query: gql`
        mutation updateProject($data: UpdateProjectInput!) {
          updateProject(data: $data)
        }
      `,
      variables: {
        data: { organizationId, projectName, isPublic },
      },
    });

    it('owner can update project', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getMutation(
          fixture.project.organizationId,
          fixture.project.projectName,
          true,
        ),
      });
      expect(result.updateProject).toBe(true);
    });

    it('developer cannot update project', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.developer.token,
          ...getMutation(
            fixture.project.organizationId,
            fixture.project.projectName,
            true,
          ),
        },
        /You are not allowed to update on Project/,
      );
    });

    it('editor cannot update project', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.editor.token,
          ...getMutation(
            fixture.project.organizationId,
            fixture.project.projectName,
            true,
          ),
        },
        /You are not allowed to update on Project/,
      );
    });

    it('reader cannot update project', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.reader.token,
          ...getMutation(
            fixture.project.organizationId,
            fixture.project.projectName,
            true,
          ),
        },
        /You are not allowed to update on Project/,
      );
    });
  });

  describe('deleteProject', () => {
    let fixture: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      fixture = await prepareDataWithRoles(app);
    });

    const getMutation = (organizationId: string, projectName: string) => ({
      query: gql`
        mutation deleteProject($data: DeleteProjectInput!) {
          deleteProject(data: $data)
        }
      `,
      variables: {
        data: { organizationId, projectName },
      },
    });

    it('owner can delete project', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getMutation(
          fixture.project.organizationId,
          fixture.project.projectName,
        ),
      });
      expect(result.deleteProject).toBe(true);
    });

    it('developer cannot delete project', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.developer.token,
          ...getMutation(
            fixture.project.organizationId,
            fixture.project.projectName,
          ),
        },
        /You are not allowed to delete on Project/,
      );
    });

    it('editor cannot delete project', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.editor.token,
          ...getMutation(
            fixture.project.organizationId,
            fixture.project.projectName,
          ),
        },
        /You are not allowed to delete on Project/,
      );
    });

    it('reader cannot delete project', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.reader.token,
          ...getMutation(
            fixture.project.organizationId,
            fixture.project.projectName,
          ),
        },
        /You are not allowed to delete on Project/,
      );
    });
  });

  describe('addUserToProject', () => {
    let fixture: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      fixture = await prepareDataWithRoles(app);
    });

    const getMutation = (
      organizationId: string,
      projectName: string,
      userId: string,
      roleId: string,
    ) => ({
      query: gql`
        mutation addUserToProject($data: AddUserToProjectInput!) {
          addUserToProject(data: $data)
        }
      `,
      variables: {
        data: { organizationId, projectName, userId, roleId },
      },
    });

    it('owner can add user to project', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getMutation(
          fixture.project.organizationId,
          fixture.project.projectName,
          fixture.anotherOwner.user.id,
          'reader',
        ),
      });
      expect(result.addUserToProject).toBe(true);
    });

    it('developer cannot add user to project', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.developer.token,
          ...getMutation(
            fixture.project.organizationId,
            fixture.project.projectName,
            fixture.anotherOwner.user.id,
            'reader',
          ),
        },
        /You are not allowed to add on User/,
      );
    });

    it('editor cannot add user to project', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.editor.token,
          ...getMutation(
            fixture.project.organizationId,
            fixture.project.projectName,
            fixture.anotherOwner.user.id,
            'reader',
          ),
        },
        /You are not allowed to add on User/,
      );
    });

    it('reader cannot add user to project', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.reader.token,
          ...getMutation(
            fixture.project.organizationId,
            fixture.project.projectName,
            fixture.anotherOwner.user.id,
            'reader',
          ),
        },
        /You are not allowed to add on User/,
      );
    });
  });

  describe('removeUserFromProject', () => {
    let fixture: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      fixture = await prepareDataWithRoles(app);
    });

    const getMutation = (
      organizationId: string,
      projectName: string,
      userId: string,
    ) => ({
      query: gql`
        mutation removeUserFromProject($data: RemoveUserFromProjectInput!) {
          removeUserFromProject(data: $data)
        }
      `,
      variables: {
        data: { organizationId, projectName, userId },
      },
    });

    it('owner can remove user from project', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getMutation(
          fixture.project.organizationId,
          fixture.project.projectName,
          fixture.reader.user.id,
        ),
      });
      expect(result.removeUserFromProject).toBe(true);
    });

    it('developer cannot remove user from project', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.developer.token,
          ...getMutation(
            fixture.project.organizationId,
            fixture.project.projectName,
            fixture.reader.user.id,
          ),
        },
        /You are not allowed to delete on User/,
      );
    });

    it('editor cannot remove user from project', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.editor.token,
          ...getMutation(
            fixture.project.organizationId,
            fixture.project.projectName,
            fixture.reader.user.id,
          ),
        },
        /You are not allowed to delete on User/,
      );
    });

    it('reader cannot remove user from project', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.reader.token,
          ...getMutation(
            fixture.project.organizationId,
            fixture.project.projectName,
            fixture.developer.user.id,
          ),
        },
        /You are not allowed to delete on User/,
      );
    });
  });
});
