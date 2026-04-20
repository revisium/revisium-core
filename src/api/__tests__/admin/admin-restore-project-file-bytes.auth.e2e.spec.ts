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

interface Params {
  projectId: string;
  dryRun: boolean;
}

const adminRestoreProjectFileBytes = operation<Params>({
  id: 'admin.restoreProjectFileBytes',
  gql: {
    query: gql`
      mutation adminRestoreProjectFileBytes(
        $data: RestoreProjectFileBytesInput!
      ) {
        adminRestoreProjectFileBytes(data: $data) {
          projectId
          previousFileBytes
          nextFileBytes
          drift
          dryRun
        }
      }
    `,
    variables: ({ projectId, dryRun }) => ({ data: { projectId, dryRun } }),
  },
});

describe('admin restore project file bytes auth', () => {
  const fresh = usingFreshProject();
  let app: INestApplication;
  let adminActor: ActorDescriptor;

  beforeEach(async () => {
    app = await getTestApp();
    adminActor = await actors.admin(app);
  });

  describe('via gql', () => {
    it('admin allowed in dry-run and reports no write', async () => {
      await expectAccess({
        app,
        transport: 'gql',
        actor: adminActor,
        op: adminRestoreProjectFileBytes,
        params: { projectId: fresh.fixture.project.projectId, dryRun: true },
        expected: 'allowed',
        assert: {
          gql: (data) => {
            const r = data as {
              adminRestoreProjectFileBytes: {
                projectId: string;
                previousFileBytes: string;
                nextFileBytes: string;
                drift: string;
                dryRun: boolean;
              };
            };
            expect(r.adminRestoreProjectFileBytes.projectId).toBe(
              fresh.fixture.project.projectId,
            );
            expect(r.adminRestoreProjectFileBytes.dryRun).toBe(true);
            expect(r.adminRestoreProjectFileBytes.previousFileBytes).toBe('0');
            expect(r.adminRestoreProjectFileBytes.nextFileBytes).toBe('0');
            expect(r.adminRestoreProjectFileBytes.drift).toBe('0');
          },
        },
      });
    });

    it('admin allowed in apply mode', async () => {
      await expectAccess({
        app,
        transport: 'gql',
        actor: adminActor,
        op: adminRestoreProjectFileBytes,
        params: { projectId: fresh.fixture.project.projectId, dryRun: false },
        expected: 'allowed',
        assert: {
          gql: (data) => {
            const r = data as {
              adminRestoreProjectFileBytes: { dryRun: boolean };
            };
            expect(r.adminRestoreProjectFileBytes.dryRun).toBe(false);
          },
        },
      });
    });

    it('organization owner allowed', async () => {
      await expectAccess({
        app,
        transport: 'gql',
        actor: actors.owner(fresh.fixture),
        op: adminRestoreProjectFileBytes,
        params: { projectId: fresh.fixture.project.projectId, dryRun: true },
        expected: 'allowed',
      });
    });

    it('cross-organization owner forbidden', async () => {
      await expectAccess({
        app,
        transport: 'gql',
        actor: actors.crossOwner(fresh.fixture),
        op: adminRestoreProjectFileBytes,
        params: { projectId: fresh.fixture.project.projectId, dryRun: true },
        expected: 'forbidden',
      });
    });

    it('anonymous unauthorized', async () => {
      await expectAccess({
        app,
        transport: 'gql',
        actor: actors.anonymous(),
        op: adminRestoreProjectFileBytes,
        params: { projectId: fresh.fixture.project.projectId, dryRun: true },
        expected: 'unauthorized',
      });
    });
  });
});
