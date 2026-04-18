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

type Params = { organizationId: string; projectName: string };

const deepProject = operation<Params>({
  id: 'project.deep',
  gql: {
    query: gql`
      query deepProject($data: GetProjectInput!) {
        project(data: $data) {
          id
          name
          organization {
            id
            createdId
          }
          rootBranch {
            id
            name
            parent {
              branch {
                id
              }
            }
            project {
              id
            }
            start {
              id
            }
            head {
              id
            }
            draft {
              id
            }
            touched
            revisions(data: { first: 5 }) {
              totalCount
              edges {
                node {
                  id
                  parent {
                    id
                  }
                  child {
                    id
                  }
                  children {
                    id
                  }
                  childBranches {
                    branch {
                      id
                    }
                  }
                  branch {
                    id
                  }
                  endpoints {
                    id
                    type
                  }
                  migrations
                  tables(data: { first: 5 }) {
                    totalCount
                  }
                  changes {
                    totalChanges
                  }
                }
              }
            }
          }
          allBranches(data: { first: 5 }) {
            totalCount
            edges {
              node {
                id
              }
            }
          }
        }
      }
    `,
    variables: (params) => ({ data: params }),
  },
});

describe('project deep-query GraphQL resolvers', () => {
  let app: INestApplication;
  let projects: ProjectPairScenario;

  beforeAll(async () => {
    app = await getTestApp();
    projects = await givenProjectPair(app);
  });

  runAuthMatrix({
    op: deepProject,
    cases: PROJECT_VISIBILITY_MATRIX,
    build: (c) => {
      const fixture = projects[c.project];
      return {
        fixture,
        params: {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
        },
      };
    },
  });
});
