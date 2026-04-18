import { INestApplication } from '@nestjs/common';
import { gql } from 'src/testing/utils/gql';
import { getTestApp } from 'src/testing/e2e';
import {
  operation,
  runAuthMatrix,
  PROJECT_VISIBILITY_MATRIX,
} from 'src/testing/kit/auth-permission';
import {
  givenProjectPair,
  type ProjectPairScenario,
} from 'src/testing/scenarios/given-project-pair';

const getRevision = operation<{ revisionId: string }>({
  id: 'revision.get',
  rest: {
    method: 'get',
    url: ({ revisionId }) => `/api/revision/${revisionId}`,
  },
  gql: {
    query: gql`
      query revision($data: GetRevisionInput!) {
        revision(data: $data) {
          id
        }
      }
    `,
    variables: (params) => ({ data: params }),
  },
});

describe('get revision auth', () => {
  let app: INestApplication;
  let projects: ProjectPairScenario;

  beforeAll(async () => {
    app = await getTestApp();
    projects = await givenProjectPair(app);
  });

  runAuthMatrix({
    op: getRevision,
    cases: PROJECT_VISIBILITY_MATRIX,
    build: (c) => {
      const fixture = projects[c.project];
      return {
        fixture,
        params: { revisionId: fixture.project.draftRevisionId },
      };
    },
  });
});
