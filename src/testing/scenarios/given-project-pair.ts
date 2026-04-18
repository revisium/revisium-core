import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  prepareData,
  type PrepareDataReturnType,
} from 'src/testing/utils/prepareProject';

export interface ProjectPairScenario {
  private: PrepareDataReturnType;
  public: PrepareDataReturnType;
}

/**
 * Seeds two projects via `prepareData`, flips one to `isPublic: true`.
 * Returns both, keyed by visibility, so auth matrices can reference
 * `pair.private` / `pair.public` directly.
 */
export async function givenProjectPair(
  app: INestApplication,
): Promise<ProjectPairScenario> {
  const [privateProject, publicProject] = await Promise.all([
    prepareData(app),
    prepareData(app),
  ]);
  await app.get(PrismaService).project.update({
    where: { id: publicProject.project.projectId },
    data: { isPublic: true },
  });
  return { private: privateProject, public: publicProject };
}
