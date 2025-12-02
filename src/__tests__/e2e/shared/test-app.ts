import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CoreModule } from 'src/core/core.module';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

let cachedApp: INestApplication | null = null;
let cachedPrismaService: PrismaService | null = null;

export async function getTestApp(): Promise<INestApplication> {
  if (cachedApp) {
    return cachedApp;
  }

  registerGraphqlEnums();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [CoreModule.forRoot({ mode: 'monolith' })],
  }).compile();

  cachedApp = moduleFixture.createNestApplication();
  cachedApp.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  cachedPrismaService = cachedApp.get(PrismaService);
  await cachedApp.init();

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
  registerGraphqlEnums();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [CoreModule.forRoot({ mode: 'monolith' })],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  await app.init();

  return app;
}
