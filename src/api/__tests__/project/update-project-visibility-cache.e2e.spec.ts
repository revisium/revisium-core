import { INestApplication } from '@nestjs/common';
import { anonGet, authDelete, authPut, getTestApp } from 'src/testing/e2e';
import { prepareData } from 'src/testing/utils/prepareProject';

describe('revision-id permission cache invalidation (regression: revisium/qa#21)', () => {
  it('denies anonymous access immediately after isPublic flips public → private', async () => {
    const fixture = await prepareData(app);
    const { organizationId, projectName, draftRevisionId } = fixture.project;
    const ownerToken = fixture.owner.token;

    await authPut(app, projectUrl(organizationId, projectName), ownerToken, {
      isPublic: true,
    }).expect(200);

    await anonGet(app, revisionUrl(draftRevisionId)).expect(200);

    await authPut(app, projectUrl(organizationId, projectName), ownerToken, {
      isPublic: false,
    }).expect(200);

    await anonGet(app, revisionUrl(draftRevisionId)).expect(403);
  });

  it('denies anonymous access immediately after the project is deleted', async () => {
    const fixture = await prepareData(app);
    const { organizationId, projectName, draftRevisionId } = fixture.project;
    const ownerToken = fixture.owner.token;

    await authPut(app, projectUrl(organizationId, projectName), ownerToken, {
      isPublic: true,
    }).expect(200);

    await anonGet(app, revisionUrl(draftRevisionId)).expect(200);

    await authDelete(
      app,
      projectUrl(organizationId, projectName),
      ownerToken,
    ).expect(200);

    await anonGet(app, revisionUrl(draftRevisionId)).expect(404);
  });

  const projectUrl = (organizationId: string, projectName: string) =>
    `/api/organization/${organizationId}/projects/${projectName}`;
  const revisionUrl = (revisionId: string) => `/api/revision/${revisionId}`;

  let app: INestApplication;

  beforeAll(async () => {
    app = await getTestApp();
  });
});
