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

const adminCacheStats = operation<Record<string, never>>({
  id: 'admin.cacheStats',
  gql: {
    query: gql`
      query adminCacheStats {
        adminCacheStats {
          totalHits
        }
      }
    `,
    variables: () => ({}),
  },
});

describe('admin cache stats auth', () => {
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
        op: adminCacheStats,
        params: {},
        expected: 'allowed',
      });
    });

    it('regular user forbidden', async () => {
      await expectAccess({
        app,
        transport: 'gql',
        actor: actors.owner(fresh.fixture),
        op: adminCacheStats,
        params: {},
        expected: 'forbidden',
      });
    });

    it('anonymous unauthorized', async () => {
      await expectAccess({
        app,
        transport: 'gql',
        actor: actors.anonymous(),
        op: adminCacheStats,
        params: {},
        expected: 'unauthorized',
      });
    });
  });
});
