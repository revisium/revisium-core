import { INestApplication } from '@nestjs/common';
import { gql } from 'src/testing/utils/gql';
import { UserOrganizationRoles } from 'src/features/auth/consts';
import { getTestApp } from 'src/testing/e2e';
import {
  booleanMutationAssert,
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';
import { givenStandaloneUser } from 'src/testing/scenarios/given-standalone-user';

interface AddUserToOrgParams {
  organizationId: string;
  userId: string;
  roleId: UserOrganizationRoles;
}

const addUserToOrganization = operation<AddUserToOrgParams>({
  id: 'organization.addUser',
  rest: {
    method: 'post',
    url: ({ organizationId }) => `/api/organization/${organizationId}/users`,
    body: ({ userId, roleId }) => ({ userId, roleId }),
  },
  gql: {
    query: gql`
      mutation addUserToOrganization($data: AddUserToOrganizationInput!) {
        addUserToOrganization(data: $data)
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

describe('add-user-to-organization auth', () => {
  const fresh = usingFreshProject();
  let targetUserId: string;

  beforeEach(async () => {
    const app: INestApplication = await getTestApp();
    ({ userId: targetUserId } = await givenStandaloneUser(app));
  });

  runAuthMatrix({
    op: addUserToOrganization,
    cases,
    build: () => ({
      fixture: fresh.fixture,
      params: {
        organizationId: fresh.fixture.project.organizationId,
        userId: targetUserId,
        roleId: UserOrganizationRoles.organizationAdmin,
      },
      assert: booleanMutationAssert('addUserToOrganization'),
    }),
  });
});
