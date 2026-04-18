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

const adminUsers = operation<Record<string, never>>({
  id: 'user.adminUsers',
  gql: {
    query: gql`
      query adminUsers($data: SearchUsersInput!) {
        adminUsers(data: $data) {
          totalCount
        }
      }
    `,
    variables: () => ({ data: { first: 10 } }),
  },
});

describe('admin users query auth', () => {
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
        op: adminUsers,
        params: {},
        expected: 'allowed',
      });
    });

    it('regular user forbidden', async () => {
      await expectAccess({
        app,
        transport: 'gql',
        actor: actors.owner(fresh.fixture),
        op: adminUsers,
        params: {},
        expected: 'forbidden',
      });
    });

    it('anonymous unauthorized', async () => {
      await expectAccess({
        app,
        transport: 'gql',
        actor: actors.anonymous(),
        op: adminUsers,
        params: {},
        expected: 'unauthorized',
      });
    });
  });
});
