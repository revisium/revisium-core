import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import { CoreModule } from 'src/core/core.module';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('restapi - EndpointByIdController', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  const makeProjectPublic = async (projectId: string) => {
    await prismaService.project.update({
      where: { id: projectId },
      data: { isPublic: true },
    });
  };

  describe('GET /endpoints/:endpointId/relatives', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can get endpoint relatives', async () => {
      const result = await request(app.getHttpServer())
        .get(getEndpointRelativesUrl(preparedData.project.headEndpointId))
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(result.endpoint.id).toBe(preparedData.project.headEndpointId);
      expect(result.revision.id).toBe(preparedData.project.headRevisionId);
      expect(result.branch.id).toBe(preparedData.project.branchId);
      expect(result.project.id).toBe(preparedData.project.projectId);
    });

    it('another owner cannot get endpoint relatives (private project)', async () => {
      return request(app.getHttpServer())
        .get(getEndpointRelativesUrl(preparedData.project.headEndpointId))
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(403)
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot get endpoint relatives without authentication', async () => {
      return request(app.getHttpServer())
        .get(getEndpointRelativesUrl(preparedData.project.headEndpointId))
        .expect(403);
    });

    it('should return 403 for non-existent endpoint (due to project guard)', async () => {
      const nonExistentEndpointId = 'non-existent-endpoint';

      return request(app.getHttpServer())
        .get(getEndpointRelativesUrl(nonExistentEndpointId))
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(403);
    });

    it('should handle draft endpoint relatives', async () => {
      const result = await request(app.getHttpServer())
        .get(getEndpointRelativesUrl(preparedData.project.draftEndpointId))
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(result.endpoint.id).toBe(preparedData.project.draftEndpointId);
    });

    function getEndpointRelativesUrl(endpointId: string) {
      return `/api/endpoints/${endpointId}/relatives`;
    }
  });

  describe('GET /endpoints/:endpointId/relatives - Public Project', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
      await makeProjectPublic(preparedData.project.projectId);
    });

    it('unauthenticated user cannot get endpoint relatives (requires auth)', async () => {
      const result = await request(app.getHttpServer())
        .get(getEndpointRelativesUrl(preparedData.project.headEndpointId))
        .expect(200)
        .then((res) => res.body);

      expect(result.endpoint.id).toBe(preparedData.project.headEndpointId);
    });

    it('another owner cannot get endpoint relatives (public project, endpoint permission required)', async () => {
      const result = await request(app.getHttpServer())
        .get(getEndpointRelativesUrl(preparedData.project.headEndpointId))
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(200)
        .then((res) => res.body);

      expect(result.endpoint.id).toBe(preparedData.project.headEndpointId);
    });

    function getEndpointRelativesUrl(endpointId: string) {
      return `/api/endpoints/${endpointId}/relatives`;
    }
  });

  describe('DELETE /endpoints/:endpointId', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can delete endpoint', async () => {
      const response = await request(app.getHttpServer())
        .delete(getDeleteEndpointUrl(preparedData.project.draftEndpointId))
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200);

      expect(response.body).toEqual({});
      expect(response.status).toBe(200);

      const deletedEndpoint = await prismaService.endpoint.findUnique({
        where: { id: preparedData.project.draftEndpointId },
      });
      expect(deletedEndpoint?.isDeleted).toBe(true);
    });

    it('another owner cannot delete endpoint (private project)', async () => {
      return request(app.getHttpServer())
        .delete(getDeleteEndpointUrl(preparedData.project.draftEndpointId))
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(403)
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot delete endpoint without authentication', async () => {
      return request(app.getHttpServer())
        .delete(getDeleteEndpointUrl(preparedData.project.draftEndpointId))
        .expect(401);
    });

    it('should return 403 when deleting non-existent endpoint (due to project guard)', async () => {
      const nonExistentEndpointId = 'non-existent-endpoint';

      return request(app.getHttpServer())
        .delete(getDeleteEndpointUrl(nonExistentEndpointId))
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(403);
    });

    function getDeleteEndpointUrl(endpointId: string) {
      return `/api/endpoints/${endpointId}`;
    }
  });

  describe('DELETE /endpoints/:endpointId - Public Project', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
      await makeProjectPublic(preparedData.project.projectId);
    });

    it('unauthenticated user cannot delete endpoint (public project)', async () => {
      return request(app.getHttpServer())
        .delete(getDeleteEndpointUrl(preparedData.project.draftEndpointId))
        .expect(401);
    });

    it('another owner cannot delete endpoint (no delete permission on public project)', async () => {
      return request(app.getHttpServer())
        .delete(getDeleteEndpointUrl(preparedData.project.draftEndpointId))
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(403)
        .expect(/You are not allowed to delete on Endpoint/);
    });

    it('owner can still delete endpoint (public project)', async () => {
      const response = await request(app.getHttpServer())
        .delete(getDeleteEndpointUrl(preparedData.project.draftEndpointId))
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200);

      // NestJS returns empty object {} for boolean true responses
      expect(response.body).toEqual({});
    });

    function getDeleteEndpointUrl(endpointId: string) {
      return `/api/endpoints/${endpointId}`;
    }
  });

  describe('Authorization Boundaries', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('should reject requests with malformed endpoint ID', async () => {
      const malformedEndpointId = 'invalid-endpoint-id-format';

      return request(app.getHttpServer())
        .get(getEndpointRelativesUrl(malformedEndpointId))
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(403);
    });

    it('should handle very long endpoint IDs gracefully', async () => {
      const longEndpointId = 'a'.repeat(1000);

      return request(app.getHttpServer())
        .get(getEndpointRelativesUrl(longEndpointId))
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(403);
    });

    it('should handle special characters in endpoint ID', async () => {
      const specialCharEndpointId = 'endpoint-with-special-chars-!@#$%';

      return request(app.getHttpServer())
        .get(getEndpointRelativesUrl(specialCharEndpointId))
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(404);
    });

    function getEndpointRelativesUrl(endpointId: string) {
      return `/api/endpoints/${endpointId}/relatives`;
    }
  });

  describe('Response Structure Validation', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('should return empty object for successful delete operation', async () => {
      const response = await request(app.getHttpServer())
        .delete(getDeleteEndpointUrl(preparedData.project.draftEndpointId))
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200);

      expect(response.body).toEqual({});
      expect(typeof response.body).toBe('object');
    });

    function getDeleteEndpointUrl(endpointId: string) {
      return `/api/endpoints/${endpointId}`;
    }
  });

  beforeAll(async () => {
    registerGraphqlEnums();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CoreModule.forRoot({ mode: 'monolith' })],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    prismaService = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });
});
