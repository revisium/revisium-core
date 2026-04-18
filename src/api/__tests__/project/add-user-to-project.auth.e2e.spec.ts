import { INestApplication } from '@nestjs/common';
import { gql } from 'src/testing/utils/gql';
import { UserProjectRoles } from 'src/features/auth/consts';
import { getTestApp } from 'src/testing/e2e';
import {
  booleanMutationAssert,
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';
import { givenStandaloneUser } from 'src/testing/scenarios/given-standalone-user';

interface AddUserToProjectParams {
  organizationId: string;
  projectName: string;
  userId: string;
  roleId: UserProjectRoles;
}

const addUserToProject = operation<AddUserToProjectParams>({
  id: 'project.addUser',
  rest: {
    method: 'post',
    url: ({ organizationId, projectName }) =>
      `/api/organization/${organizationId}/projects/${projectName}/users`,
    body: ({ userId, roleId }) => ({ userId, roleId }),
  },
  gql: {
    query: gql`
      mutation addUserToProject($data: AddUserToProjectInput!) {
        addUserToProject(data: $data)
      }
    `,
    variables: (params) => ({ data: params }),
  },
});

const cases: AuthMatrixCaseBase[] = [
  { name: 'owner', role: 'owner', expected: 'allowed' },
  { name: 'cross-owner', role: 'crossOwner', expected: 'forbidden' },
  { name: 'anonymous', role: 'anonymous', expected: 'unauthorized' },
];

describe('add-user-to-project auth', () => {
  const fresh = usingFreshProject();
  let targetUserId: string;

  beforeEach(async () => {
    const app: INestApplication = await getTestApp();
    ({ userId: targetUserId } = await givenStandaloneUser(app));
  });

  runAuthMatrix({
    op: addUserToProject,
    cases,
    build: () => ({
      fixture: fresh.fixture,
      params: {
        organizationId: fresh.fixture.project.organizationId,
        projectName: fresh.fixture.project.projectName,
        userId: targetUserId,
        roleId: UserProjectRoles.developer,
      },
      assert: booleanMutationAssert('addUserToProject'),
    }),
  });
});
