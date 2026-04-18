import { INestApplication } from '@nestjs/common';
import { gql } from 'src/testing/utils/gql';
import { getTestApp } from 'src/testing/e2e';
import {
  actors,
  expectAccess,
  operation,
  type ActorDescriptor,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

const adminUser = operation<{ userId: string }>({
  id: 'user.adminUser',
  gql: {
    query: gql`
      query adminUser($data: AdminUserInput!) {
        adminUser(data: $data) {
          id
        }
      }
    `,
    variables: ({ userId }) => ({ data: { userId } }),
  },
});

describe('admin user query auth', () => {
  const fresh = usingFreshProject();
  let app: INestApplication;
  let adminActor: ActorDescriptor;

  beforeEach(async () => {
    app = await getTestApp();
    adminActor = await actors.admin(app);
  });

  describe('via gql', () => {
    it('admin allowed', async () => {
      await expectAccess({
        app,
        transport: 'gql',
        actor: adminActor,
        op: adminUser,
        params: { userId: fresh.fixture.owner.user.id },
        expected: 'allowed',
      });
    });

    it('regular user forbidden', async () => {
      await expectAccess({
        app,
        transport: 'gql',
        actor: actors.owner(fresh.fixture),
        op: adminUser,
        params: { userId: fresh.fixture.owner.user.id },
        expected: 'forbidden',
      });
    });

    it('anonymous unauthorized', async () => {
      await expectAccess({
        app,
        transport: 'gql',
        actor: actors.anonymous(),
        op: adminUser,
        params: { userId: fresh.fixture.owner.user.id },
        expected: 'unauthorized',
      });
    });
  });
});
