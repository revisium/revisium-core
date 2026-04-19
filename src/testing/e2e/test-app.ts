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
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  await app.init();

  return app;
}

export async function getTestApp(): Promise<INestApplication> {
  if (cachedApp) return cachedApp;

  const sharedInfo = readSharedAppInfo();
  if (sharedInfo) {
    cachedApp = getSharedTestApp();
    cachedPrismaService = cachedApp.get(PrismaService);
    cachedAppIsShared = true;
    return cachedApp;
  }

  cachedApp = await buildApp();
  cachedPrismaService = cachedApp.get(PrismaService);
  cachedAppIsShared = false;
  return cachedApp;
}

/**
 * Builds a full in-process Nest app. Use for specs that resolve
 * non-stub services via `app.get()` or override providers.
 */
export async function getFullTestApp(): Promise<INestApplication> {
  if (cachedApp && !cachedAppIsShared) return cachedApp;
  if (cachedApp && cachedAppIsShared) {
    try {
      await cachedApp.close();
    } catch {
      // best effort
    }
    cachedApp = null;
    cachedPrismaService = null;
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
  // Prom-client's default registry is process-global; without clearing,
  // rebuilding CoreModule throws "metric already registered".
  promClient.register.clear();
  return buildApp();
}
