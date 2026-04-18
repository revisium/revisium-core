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

const adminResetAllCache = operation<Record<string, never>>({
  id: 'admin.resetAllCache',
  gql: {
    query: gql`
      mutation adminResetAllCache {
        adminResetAllCache
      }
    `,
    variables: () => ({}),
  },
});

describe('admin reset all cache auth', () => {
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
        op: adminResetAllCache,
        params: {},
        expected: 'allowed',
      });
    });

    it('regular user forbidden', async () => {
      await expectAccess({
        app,
        transport: 'gql',
        actor: actors.owner(fresh.fixture),
        op: adminResetAllCache,
        params: {},
        expected: 'forbidden',
      });
    });

    it('anonymous unauthorized', async () => {
      await expectAccess({
        app,
        transport: 'gql',
        actor: actors.anonymous(),
        op: adminResetAllCache,
        params: {},
        expected: 'unauthorized',
      });
    });
  });
});
