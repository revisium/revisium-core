import { INestApplication } from '@nestjs/common';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

let cachedFixture: PrepareDataReturnType | null = null;
let publicProjectFixture: PrepareDataReturnType | null = null;

export async function getReadonlyFixture(
  app: INestApplication,
): Promise<PrepareDataReturnType> {
  if (cachedFixture) {
    return cachedFixture;
  }

  cachedFixture = await prepareData(app, { createLinkedTable: true });

  return cachedFixture;
}

export async function getPublicProjectFixture(
  app: INestApplication,
): Promise<PrepareDataReturnType> {
  if (publicProjectFixture) {
    return publicProjectFixture;
  }

  const prismaService = app.get(PrismaService);
  publicProjectFixture = await prepareData(app, { createLinkedTable: true });

  await prismaService.project.update({
    where: { id: publicProjectFixture.project.projectId },
    data: { isPublic: true },
  });

  return publicProjectFixture;
}

export function resetFixtures(): void {
  cachedFixture = null;
  publicProjectFixture = null;
}

export type { PrepareDataReturnType };
