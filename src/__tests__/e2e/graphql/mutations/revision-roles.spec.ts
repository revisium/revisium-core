import { INestApplication } from '@nestjs/common';
import { gql } from 'src/testing/utils/gql';
import {
  prepareDataWithRoles,
  PrepareDataWithRolesReturnType,
} from 'src/testing/utils/prepareProject';
import {
  getTestApp,
  gqlQuery,
  gqlQueryExpectError,
} from 'src/testing/e2e';

describe('graphql - revision mutations (role-based)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await getTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('createRevision (commit)', () => {
    let fixture: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      fixture = await prepareDataWithRoles(app);
    });

    const getMutation = (
      organizationId: string,
      projectName: string,
      branchName: string,
      comment?: string,
    ) => ({
      query: gql`
        mutation createRevision($data: CreateRevisionInput!) {
          createRevision(data: $data) {
            id
            isHead
            isDraft
            comment
          }
        }
      `,
      variables: {
        data: { organizationId, projectName, branchName, comment },
      },
    });

    it('owner can create revision (commit)', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getMutation(
          fixture.project.organizationId,
          fixture.project.projectName,
          fixture.project.branchName,
          'Owner commit',
        ),
      });
      expect(result.createRevision).toBeDefined();
      expect(result.createRevision.id).toBeDefined();
    });

    it('developer can create revision (commit)', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.developer.token,
        ...getMutation(
          fixture.project.organizationId,
          fixture.project.projectName,
          fixture.project.branchName,
          'Developer commit',
        ),
      });
      expect(result.createRevision).toBeDefined();
      expect(result.createRevision.id).toBeDefined();
    });

    it('editor can create revision (commit)', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.editor.token,
        ...getMutation(
          fixture.project.organizationId,
          fixture.project.projectName,
          fixture.project.branchName,
          'Editor commit',
        ),
      });
      expect(result.createRevision).toBeDefined();
      expect(result.createRevision.id).toBeDefined();
    });

    it('reader cannot create revision (commit)', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.reader.token,
          ...getMutation(
            fixture.project.organizationId,
            fixture.project.projectName,
            fixture.project.branchName,
            'Reader commit',
          ),
        },
        /You are not allowed to create on Revision/,
      );
    });
  });
});
