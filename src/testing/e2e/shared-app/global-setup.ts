import * as path from 'node:path';
import { AddressInfo } from 'node:net';
import * as dotenv from 'dotenv';
import { nanoid } from 'nanoid';
import { register as registerTsconfigPaths } from 'tsconfig-paths';
import { writeSharedAppInfo } from './shared-app-info';
import { enableTimings, recordTiming, resetTimingsFile } from './timings';

// Resolve tsconfig `src/*` alias so the dynamic `src/...` imports inside
// globalSetup resolve the same way they do in test files. Jest runs
// globalSetup outside its transform pipeline so we must register
// aliases ourselves.
registerTsconfigPaths({
  baseUrl: path.resolve(__dirname, '../../../..'),
  paths: {
    'src/*': ['src/*'],
    'ee/*': ['ee/*'],
  },
});

export default async function globalSetup(): Promise<void> {
  dotenv.config({ path: '.env.test' });

  if (process.env.TEST_TIMINGS === '1') {
    enableTimings();
    resetTimingsFile();
  }

  const tSetupStart = Date.now();

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
  writeSharedAppInfo({ port, jwtSecret });

  // Keep a reference on globalThis for teardown (Jest runs globalSetup and
  // globalTeardown in the same main process).
  (globalThis as Record<string, unknown>).__revisiumSharedApp = app;

  recordTiming('globalSetup:TOTAL', Date.now() - tSetupStart);

  console.log(`[sharedApp] listening on port ${port}`);
}
