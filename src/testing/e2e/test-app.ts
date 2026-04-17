import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import * as promClient from 'prom-client';
import { CoreModule } from 'src/core/core.module';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

let cachedApp: INestApplication | null = null;
let cachedPrismaService: PrismaService | null = null;

async function buildApp(): Promise<INestApplication> {
  // Per-worker, per-bootstrap: clear the prom-client default registry so
  // that rebuilding CoreModule inside the same Node process (e.g. after a
  // previous spec closed its app) does not hit "metric already registered"
  // when GraphqlMetricsService / RestMetricsService register their
  // histograms and counters.
  promClient.register.clear();

  registerGraphqlEnums();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [CoreModule.forRoot({ mode: 'monolith' })],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  await app.init();

  return app;
}

export async function getTestApp(): Promise<INestApplication> {
  if (cachedApp) {
    return cachedApp;
  }

  cachedApp = await buildApp();
  cachedPrismaService = cachedApp.get(PrismaService);

  return cachedApp;
}

export function getPrismaService(): PrismaService {
  if (!cachedPrismaService) {
    throw new Error('Test app not initialized. Call getTestApp() first.');
  }
  return cachedPrismaService;
}

export async function closeTestApp(): Promise<void> {
  if (cachedApp) {
    await cachedApp.close();
    cachedApp = null;
    cachedPrismaService = null;
  }
}

export async function createFreshTestApp(): Promise<INestApplication> {
  return buildApp();
}
