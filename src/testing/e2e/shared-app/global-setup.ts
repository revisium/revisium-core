import * as os from 'node:os';
import * as path from 'node:path';
import { AddressInfo } from 'node:net';
import * as dotenv from 'dotenv';
import { nanoid } from 'nanoid';
import { register as registerTsconfigPaths } from 'tsconfig-paths';
import { writeSharedAppInfo } from './shared-app-info';

// Jest runs globalSetup outside its transform pipeline, so the
// `src/*` aliases used below have to be registered manually.
registerTsconfigPaths({
  baseUrl: path.resolve(__dirname, '../../../..'),
  paths: {
    'src/*': ['src/*'],
    'ee/*': ['ee/*'],
  },
});

export default async function globalSetup(): Promise<void> {
  dotenv.config({ path: '.env.test' });

  // Namespace the handoff file per run; workers read it via env.
  if (!process.env.REVISIUM_TEST_APP_INFO_FILE) {
    process.env.REVISIUM_TEST_APP_INFO_FILE = path.join(
      os.tmpdir(),
      `revisium-test-shared-app-${process.pid}-${nanoid(8)}.json`,
    );
  }

  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = nanoid();
  }

  const { configurePrisma } = await import('@revisium/prisma-pg-json');
  const { Prisma } = await import('src/__generated__/client');
  configurePrisma(Prisma);

  const { ValidationPipe } = await import('@nestjs/common');
  const { Test } = await import('@nestjs/testing');
  const cookieParserModule = await import('cookie-parser');
  const cookieParser = cookieParserModule.default || cookieParserModule;
  const { CoreModule } = await import('src/core/core.module');
  const { registerGraphqlEnums } =
    await import('src/api/graphql-api/registerGraphqlEnums');

  registerGraphqlEnums();

  const moduleFixture = await Test.createTestingModule({
    imports: [CoreModule.forRoot({ mode: 'monolith' })],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  await app.init();
  await app.listen(0);

  const server = app.getHttpServer() as { address: () => AddressInfo };
  const port = server.address().port;

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET missing after globalSetup initialization');
  }
  writeSharedAppInfo({ port, jwtSecret });

  (globalThis as Record<string, unknown>).__revisiumSharedApp = app;

  console.log(`[sharedApp] listening on port ${port}`);
}
