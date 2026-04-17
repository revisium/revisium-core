import { nanoid } from 'nanoid';
import { ApiKeyType } from 'src/__generated__/client';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  givenProjectWithOwner,
  type ProjectWithOwnerScenario,
} from 'src/testing/scenarios/given-project-with-owner';

export interface ApiKeyForProjectScenario extends ProjectWithOwnerScenario {
  apiKeyId: string;
  apiKeyPrefix: string;
  apiKeyHash: string;
}

export async function givenApiKeyForProject(
  prisma: PrismaService,
  options: {
    type?: ApiKeyType;
    readOnly?: boolean;
  } = {},
): Promise<ApiKeyForProjectScenario> {
  const project = await givenProjectWithOwner(prisma);

  const apiKeyId = nanoid();
  const keyHash = nanoid();
  const prefix = `rev_${nanoid(4)}...${nanoid(4)}`;

  await prisma.apiKey.create({
    data: {
      id: apiKeyId,
      prefix,
      keyHash,
      name: `key-${apiKeyId}`,
      type: options.type ?? ApiKeyType.PERSONAL,
      userId: project.userId,
      projectIds: [project.projectId],
      readOnly: options.readOnly ?? false,
    },
  });

  return {
    ...project,
    apiKeyId,
    apiKeyPrefix: prefix,
    apiKeyHash: keyHash,
  };
}
