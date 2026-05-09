import * as fs from 'fs';
import * as path from 'path';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { initSwagger } from 'src/api/rest-api/init-swagger';
import { CoreModule } from 'src/core/core.module';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';

async function main() {
  registerGraphqlEnums();

  const moduleFixture = await Test.createTestingModule({
    imports: [CoreModule.forRoot({ mode: 'monolith' })],
  }).compile();

  const app = moduleFixture.createNestApplication();
  initSwagger(app);
  await app.init();

  const res = await request(app.getHttpServer()).get('/api-json').expect(200);

  const out = path.resolve(__dirname, '../src/api/rest-api/openapi.json');
  fs.writeFileSync(out, JSON.stringify(res.body, null, 2) + '\n');

  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
