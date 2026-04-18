import { nanoid } from 'nanoid';
import { gql } from 'src/testing/utils/gql';
import { UserProjectRoles, UserSystemRoles } from 'src/features/auth/consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { getTestApp } from 'src/testing/e2e';
import {
  booleanMutationAssert,
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

interface UpdateUserProjectRoleParams {
  organizationId: string;
  projectName: string;
  userId: string;
  roleId: UserProjectRoles;
}

// GraphQL-only — no REST endpoint exposes role changes today.
const updateUserProjectRole = operation<UpdateUserProjectRoleParams>({
  id: 'project.updateUserProjectRole',
  gql: {
    query: gql`
      mutation updateUserProjectRole($data: UpdateUserProjectRoleInput!) {
        updateUserProjectRole(data: $data)
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

describe('update user-project-role auth', () => {
  const fresh = usingFreshProject();
  let targetUserId: string;

  beforeEach(async () => {
    targetUserId = nanoid();
    const prisma = (await getTestApp()).get(PrismaService);
    await prisma.user.create({
      data: {
        id: targetUserId,
        roleId: UserSystemRoles.systemUser,
        password: '',
        userProjects: {
          create: {
            id: nanoid(),
            projectId: fresh.fixture.project.projectId,
            roleId: UserProjectRoles.developer,
          },
        },
      },
    });
  });

  runAuthMatrix({
    op: updateUserProjectRole,
    cases,
    build: () => ({
      fixture: fresh.fixture,
      params: {
        organizationId: fresh.fixture.project.organizationId,
        projectName: fresh.fixture.project.projectName,
        userId: targetUserId,
        roleId: UserProjectRoles.reader,
      },
      assert: booleanMutationAssert('updateUserProjectRole'),
    }),
  });
});
