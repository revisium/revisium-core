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
  // Clear the prom-client default registry before rebuilding CoreModule in
  // the same Node process so GraphqlMetricsService / RestMetricsService can
  // re-register their histograms and counters without hitting "metric
  // already registered". Scoped to createFreshTestApp so a cached getTestApp
  // (called in the same worker) does not get its metrics wiped by a later
  // fresh app build.
  promClient.register.clear();
  return buildApp();
}
