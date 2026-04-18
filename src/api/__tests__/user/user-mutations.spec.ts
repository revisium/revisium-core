import { INestApplication } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { AuthService } from 'src/features/auth/auth.service';
import { UserSystemRoles } from 'src/features/auth/consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { gql } from 'src/testing/utils/gql';
import { getTestApp } from 'src/testing/e2e';
import {
  actors,
  expectAccess,
  operation,
  type ActorDescriptor,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

const updatePassword = operation<{
  oldPassword: string;
  newPassword: string;
}>({
  id: 'user.updatePassword',
  gql: {
    query: gql`
      mutation updatePassword($data: UpdatePasswordInput!) {
        updatePassword(data: $data)
      }
    `,
    variables: (params) => ({ data: params }),
  },
});

const setUsername = operation<{ username: string }>({
  id: 'user.setUsername',
  gql: {
    query: gql`
      mutation setUsername($data: SetUsernameInput!) {
        setUsername(data: $data)
      }
    `,
    variables: (params) => ({ data: params }),
  },
});

const resetPassword = operation<{ userId: string; newPassword: string }>({
  id: 'user.resetPassword',
  gql: {
    query: gql`
      mutation resetPassword($data: ResetPasswordInput!) {
        resetPassword(data: $data)
      }
    `,
    variables: (params) => ({ data: params }),
  },
});

describe('user mutations resolver coverage', () => {
  const fresh = usingFreshProject();
  let app: INestApplication;
  let admin: ActorDescriptor;

  beforeEach(async () => {
    app = await getTestApp();
    admin = await actors.admin(app);
  });

  it('updatePassword: authenticated user rotates own password', async () => {
    await expectAccess({
      app,
      transport: 'gql',
      actor: actors.owner(fresh.fixture),
      op: updatePassword,
      params: { oldPassword: 'password', newPassword: `pwd-${nanoid()}` },
      expected: 'allowed',
    });
  });

  it('setUsername: user without a username claims a fresh one', async () => {
    const prisma = app.get(PrismaService);
    const auth = app.get(AuthService);
    const unnamedId = nanoid();
    await prisma.user.create({
      data: {
        id: unnamedId,
        username: null,
        email: `${unnamedId}@example.com`,
        password: '',
        role: { connect: { id: UserSystemRoles.systemUser } },
      },
    });
    const token = auth.login({ username: '', sub: unnamedId });

    await expectAccess({
      app,
      transport: 'gql',
      actor: { token, label: 'unnamed' },
      op: setUsername,
      params: {
        username: `u${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`,
      },
      expected: 'allowed',
    });
  });

  it('resetPassword: admin resets an arbitrary user', async () => {
    await expectAccess({
      app,
      transport: 'gql',
      actor: admin,
      op: resetPassword,
      params: {
        userId: fresh.fixture.owner.user.id,
        newPassword: `reset-${nanoid()}`,
      },
      expected: 'allowed',
    });
  });
});
