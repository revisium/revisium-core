import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { initSwagger } from 'src/api/rest-api/init-swagger';
import { CoreModule } from 'src/core/core.module';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';

describe('Swagger OpenAPI JSON (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CoreModule.forRoot({ mode: 'monolith' })],
    }).compile();

    app = moduleFixture.createNestApplication();
    initSwagger(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api-json should match the local openapi.json', async () => {
    const specPath = path.resolve(__dirname, '../openapi.json');
    const expectedSpec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));

    const res = await request(app.getHttpServer())
      .get('/api-json')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toEqual(expectedSpec);
  });
});
