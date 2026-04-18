import * as path from 'node:path';
import { register as registerTsconfigPaths } from 'tsconfig-paths';

// Resolve tsconfig `src/*` alias so dynamic imports below work the same way
// as in-test imports. Jest's globalSetup runs outside the test transform
// pipeline so we must register aliases manually.
registerTsconfigPaths({
  baseUrl: path.resolve(__dirname, '../../../..'),
  paths: {
    'src/*': ['src/*'],
    'ee/*': ['ee/*'],
  },
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const dotenv = require('dotenv');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { nanoid } = require('nanoid');
import { AddressInfo } from 'node:net';
import { writeSharedAppInfo } from './shared-app-info';

export default async function globalSetup(): Promise<void> {
  dotenv.config({ path: '.env.test' });

  // Ensure a deterministic JWT secret so worker-side token signing matches
  // the shared app's verification.
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = nanoid();
  }

  // Dynamic imports AFTER env is loaded so modules read the right config.
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
  const addr = server.address();
  const port = addr.port;

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET missing after globalSetup initialization');
  }
  writeSharedAppInfo({
    port,
    pid: process.pid,
    jwtSecret,
  });

  // Keep a reference on globalThis for teardown (Jest runs globalSetup and
  // globalTeardown in the same main process).
  (globalThis as Record<string, unknown>).__revisiumSharedApp = app;

  console.log(`[sharedApp] listening on port ${port}`);
}
