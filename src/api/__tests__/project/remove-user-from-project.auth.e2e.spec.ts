import { INestApplication } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { gql } from 'src/testing/utils/gql';
import { UserProjectRoles } from 'src/features/auth/consts';
import { getTestApp } from 'src/testing/e2e';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  booleanMutationAssert,
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';
import { givenStandaloneUser } from 'src/testing/scenarios/given-standalone-user';

interface RemoveUserFromProjectParams {
  organizationId: string;
  projectName: string;
  userId: string;
}

const removeUserFromProject = operation<RemoveUserFromProjectParams>({
  id: 'project.removeUser',
  rest: {
    method: 'delete',
    url: ({ organizationId, projectName, userId }) =>
      `/api/organization/${organizationId}/projects/${projectName}/users/${userId}`,
  },
  gql: {
    query: gql`
      mutation removeUserFromProject($data: RemoveUserFromProjectInput!) {
        removeUserFromProject(data: $data)
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

describe('remove-user-from-project auth', () => {
  const fresh = usingFreshProject();
  let targetUserId: string;

  beforeEach(async () => {
    const app: INestApplication = await getTestApp();
    const prisma = app.get(PrismaService);
    const user = await givenStandaloneUser(app);
    targetUserId = user.userId;
    // Put the target into the project first so removal has something to do.
    await prisma.userProject.create({
      data: {
        id: nanoid(),
        projectId: fresh.fixture.project.projectId,
        userId: targetUserId,
        roleId: UserProjectRoles.developer,
      },
    });
  });

  runAuthMatrix({
    op: removeUserFromProject,
    cases,
    build: () => ({
      fixture: fresh.fixture,
      params: {
        organizationId: fresh.fixture.project.organizationId,
        projectName: fresh.fixture.project.projectName,
        userId: targetUserId,
      },
      assert: booleanMutationAssert('removeUserFromProject'),
    }),
  });
});
