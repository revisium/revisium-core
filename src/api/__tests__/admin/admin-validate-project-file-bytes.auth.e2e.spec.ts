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
}

const adminValidateProjectFileBytes = operation<Params>({
  id: 'admin.validateProjectFileBytes',
  gql: {
    query: gql`
      query adminValidateProjectFileBytes(
        $data: ValidateProjectFileBytesInput!
      ) {
        adminValidateProjectFileBytes(data: $data) {
          projectId
          currentFileBytes
          expectedFileBytes
          drift
          fileBlobCount
          referenceCount
        }
      }
    `,
    variables: ({ projectId }) => ({ data: { projectId } }),
  },
});

describe('admin validate project file bytes auth', () => {
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
        op: adminValidateProjectFileBytes,
        params: { projectId: fresh.fixture.project.projectId },
        expected: 'allowed',
        assert: {
          gql: (data) => {
            const r = data as {
              adminValidateProjectFileBytes: {
                projectId: string;
                drift: string;
              };
            };
            expect(r.adminValidateProjectFileBytes.projectId).toBe(
              fresh.fixture.project.projectId,
            );
            expect(r.adminValidateProjectFileBytes.drift).toBe('0');
          },
        },
      });
    });

    it('organization owner allowed', async () => {
      await expectAccess({
        app,
        transport: 'gql',
        actor: actors.owner(fresh.fixture),
        op: adminValidateProjectFileBytes,
        params: { projectId: fresh.fixture.project.projectId },
        expected: 'allowed',
      });
    });

    it('cross-organization owner forbidden', async () => {
      await expectAccess({
        app,
        transport: 'gql',
        actor: actors.crossOwner(fresh.fixture),
        op: adminValidateProjectFileBytes,
        params: { projectId: fresh.fixture.project.projectId },
        expected: 'forbidden',
      });
    });

    it('anonymous unauthorized', async () => {
      await expectAccess({
        app,
        transport: 'gql',
        actor: actors.anonymous(),
        op: adminValidateProjectFileBytes,
        params: { projectId: fresh.fixture.project.projectId },
        expected: 'unauthorized',
      });
    });
  });
});
