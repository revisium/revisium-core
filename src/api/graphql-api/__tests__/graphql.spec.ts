import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import {
  buildClientSchema,
  getIntrospectionQuery,
  IntrospectionQuery,
  printSchema,
} from 'graphql';

describe('GraphQL Schema Introspection (e2e)', () => {
  it('POST /graphql (introspection) should match the local schema.json', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: getIntrospectionQuery() })
      .expect('Content-Type', /json/)
      .expect(200);

    const introspection = (res.body as any).data as IntrospectionQuery;

    const clientSchema = buildClientSchema(introspection);

    const normalizeLineEndings = (str: string) =>
      str.replace(/\r\n|\r/g, '\n').trim();

    const sdlFromServer = normalizeLineEndings(printSchema(clientSchema));

    const localPath = path.resolve(__dirname, '../schema.graphql');
    const localSDL = normalizeLineEndings(fs.readFileSync(localPath, 'utf-8'));

    expect(sdlFromServer).toBe(localSDL);
  });

  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });
});
