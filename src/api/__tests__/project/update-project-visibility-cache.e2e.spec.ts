import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { getTestApp } from 'src/testing/e2e';
import { prepareData } from 'src/testing/utils/prepareProject';

describe('revision-id permission cache invalidation (regression: revisium/qa#21)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await getTestApp();
    prisma = app.get(PrismaService);
  });

  it('denies anonymous access to a revisionId-keyed endpoint immediately after isPublic flips back to false', async () => {
    const fixture = await prepareData(app);
    const { organizationId, projectName, projectId, draftRevisionId } =
      fixture.project;
    const ownerToken = fixture.owner.token;

    const updateUrl = `/api/organization/${organizationId}/projects/${projectName}`;
    const revisionUrl = `/api/revision/${draftRevisionId}`;

    await request(app.getHttpServer())
      .put(updateUrl)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isPublic: true })
      .expect(200);

    expect(
      (await prisma.project.findUniqueOrThrow({ where: { id: projectId } }))
        .isPublic,
    ).toBe(true);

    await request(app.getHttpServer()).get(revisionUrl).expect(200);

    await request(app.getHttpServer())
      .put(updateUrl)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isPublic: false })
      .expect(200);

    expect(
      (await prisma.project.findUniqueOrThrow({ where: { id: projectId } }))
        .isPublic,
    ).toBe(false);

    await request(app.getHttpServer()).get(revisionUrl).expect(403);
  });

  it('denies anonymous access to a revisionId-keyed endpoint immediately after the project is deleted', async () => {
    const fixture = await prepareData(app);
    const { organizationId, projectName, projectId, draftRevisionId } =
      fixture.project;
    const ownerToken = fixture.owner.token;

    const projectUrl = `/api/organization/${organizationId}/projects/${projectName}`;
    const revisionUrl = `/api/revision/${draftRevisionId}`;

    await request(app.getHttpServer())
      .put(projectUrl)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isPublic: true })
      .expect(200);

    await request(app.getHttpServer()).get(revisionUrl).expect(200);

    await request(app.getHttpServer())
      .delete(projectUrl)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(
      (await prisma.project.findUniqueOrThrow({ where: { id: projectId } }))
        .isDeleted,
    ).toBe(true);

    const response = await request(app.getHttpServer()).get(revisionUrl);
    expect([403, 404]).toContain(response.status);
  });
});
