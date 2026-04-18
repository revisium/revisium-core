import { INestApplication } from '@nestjs/common';
import { gql } from 'src/testing/utils/gql';
import { UserOrganizationRoles } from 'src/features/auth/consts';
import { getTestApp } from 'src/testing/e2e';
import { testAddUserToOrganization } from 'src/testing/factories/create-models';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  booleanMutationAssert,
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';
import { givenStandaloneUser } from 'src/testing/scenarios/given-standalone-user';

interface RemoveUserFromOrgParams {
  organizationId: string;
  userId: string;
}

const removeUserFromOrganization = operation<RemoveUserFromOrgParams>({
  id: 'organization.removeUser',
  rest: {
    method: 'delete',
    url: ({ organizationId }) => `/api/organization/${organizationId}/users`,
    body: ({ userId }) => ({ userId }),
  },
  gql: {
    query: gql`
      mutation removeUserFromOrganization(
        $data: RemoveUserFromOrganizationInput!
      ) {
        removeUserFromOrganization(data: $data)
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

describe('remove-user-from-organization auth', () => {
  const fresh = usingFreshProject();
  let targetUserId: string;

  beforeEach(async () => {
    const app: INestApplication = await getTestApp();
    const prisma = app.get(PrismaService);
    const user = await givenStandaloneUser(app);
    targetUserId = user.userId;
    // Put them in the org first so the removal has something to remove.
    await testAddUserToOrganization(prisma, {
      organizationId: fresh.fixture.project.organizationId,
      userId: targetUserId,
      roleId: UserOrganizationRoles.organizationAdmin,
    });
  });

  runAuthMatrix({
    op: removeUserFromOrganization,
    cases,
    build: () => ({
      fixture: fresh.fixture,
      params: {
        organizationId: fresh.fixture.project.organizationId,
        userId: targetUserId,
      },
      assert: booleanMutationAssert('removeUserFromOrganization'),
    }),
  });
});
