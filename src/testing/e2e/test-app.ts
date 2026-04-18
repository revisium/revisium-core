import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import * as promClient from 'prom-client';
import { CoreModule } from 'src/core/core.module';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { readSharedAppInfo } from './shared-app/shared-app-info';
import { getSharedTestApp } from './shared-app/shared-app-client';

let cachedApp: INestApplication | null = null;
let cachedPrismaService: PrismaService | null = null;
let cachedAppIsShared = false;

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

  // Prefer the shared app started by jest globalSetup. Falls back to a full
  // per-file Nest bootstrap if the info file is not present (e.g., when
  // running a single spec via an IDE without globalSetup wiring).
  const sharedInfo = readSharedAppInfo();
  if (sharedInfo) {
    if (process.env.DEBUG_TEST_APP) {
      console.log(
        `[testApp] using SHARED app (port ${sharedInfo.port}) pid=${process.pid} wid=${process.env.JEST_WORKER_ID ?? '-'}`,
      );
    }
    cachedApp = getSharedTestApp();
    cachedPrismaService = cachedApp.get(PrismaService);
    cachedAppIsShared = true;
    return cachedApp;
  }

  if (process.env.DEBUG_TEST_APP) {
    console.log(
      `[testApp] building FULL app pid=${process.pid} wid=${process.env.JEST_WORKER_ID ?? '-'}`,
    );
  }
  cachedApp = await buildApp();
  cachedPrismaService = cachedApp.get(PrismaService);
  cachedAppIsShared = false;

  return cachedApp;
}

/**
 * Forces a full in-process Nest app build for the current file. Use this in
 * specs that resolve providers beyond PrismaService/AuthService via app.get()
 * or override providers via Test.createTestingModule.
 *
 * If a shared-app stub has already been cached for this file (e.g., because
 * `usingFreshProject` ran its `beforeEach` first), it is discarded.
 */
export async function getFullTestApp(): Promise<INestApplication> {
  if (cachedApp && !cachedAppIsShared) {
    return cachedApp;
  }
  if (cachedApp && cachedAppIsShared) {
    try {
      await cachedApp.close();
    } catch {
      // best effort
    }
    cachedApp = null;
    cachedPrismaService = null;
    cachedAppIsShared = false;
  }
  if (process.env.DEBUG_TEST_APP) {
    console.log(
      `[testApp] building FULL app (getFullTestApp) pid=${process.pid} wid=${process.env.JEST_WORKER_ID ?? '-'}`,
    );
  }
  cachedApp = await buildApp();
  cachedPrismaService = cachedApp.get(PrismaService);
  cachedAppIsShared = false;
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
