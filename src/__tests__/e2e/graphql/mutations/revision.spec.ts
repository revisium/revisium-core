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

describe('graphql - revision mutations', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createFreshTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('createRevision (commit)', () => {
    let fixture: PrepareDataReturnType;

    beforeEach(async () => {
      fixture = await prepareData(app);
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
          'Test commit message',
        ),
      });

      expect(result.createRevision).toBeDefined();
      expect(result.createRevision.id).toBeDefined();
    });

    it('cross-owner cannot create revision', async () => {
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

    it('unauthenticated cannot create revision', async () => {
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
