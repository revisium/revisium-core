import { Injectable, NotFoundException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiKeyType } from 'src/__generated__/client';
import {
  CreateApiKeyCommand,
  CreateApiKeyCommandReturnType,
  RevokeApiKeyCommand,
  RevokeApiKeyCommandReturnType,
  RotateApiKeyCommand,
  RotateApiKeyCommandReturnType,
} from 'src/features/api-key/commands/impl';
import {
  GetApiKeyByIdQuery,
  GetApiKeyByIdQueryReturnType,
  GetApiKeysQuery,
  GetApiKeysQueryReturnType,
} from 'src/features/api-key/queries/impl';

@Injectable()
export class ApiKeyApiService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async createPersonalApiKey(data: {
    name: string;
    userId: string;
    organizationId?: string;
    projectIds?: string[];
    branchNames?: string[];
    tableIds?: string[];
    readOnly?: boolean;
    allowedIps?: string[];
    expiresAt?: Date;
  }): Promise<CreateApiKeyCommandReturnType> {
    return this.commandBus.execute(
      new CreateApiKeyCommand({
        type: ApiKeyType.PERSONAL,
        name: data.name,
        userId: data.userId,
        organizationId: data.organizationId,
        projectIds: data.projectIds,
        branchNames: data.branchNames,
        tableIds: data.tableIds,
        readOnly: data.readOnly,
        allowedIps: data.allowedIps,
        expiresAt: data.expiresAt,
      }),
    );
  }

  async revokeApiKey(
    keyId: string,
    userId: string,
  ): Promise<RevokeApiKeyCommandReturnType> {
    await this.assertOwnership(keyId, userId);
    return this.commandBus.execute(new RevokeApiKeyCommand({ keyId }));
  }

  async rotateApiKey(
    keyId: string,
    userId: string,
  ): Promise<RotateApiKeyCommandReturnType> {
    await this.assertOwnership(keyId, userId);
    return this.commandBus.execute(new RotateApiKeyCommand({ keyId }));
  }

  async getMyApiKeys(userId: string): Promise<GetApiKeysQueryReturnType> {
    return this.queryBus.execute(new GetApiKeysQuery({ userId }));
  }

  async getApiKeyById(
    keyId: string,
    userId: string,
  ): Promise<GetApiKeyByIdQueryReturnType> {
    return this.assertOwnership(keyId, userId);
  }

  private async assertOwnership(
    keyId: string,
    userId: string,
  ): Promise<GetApiKeyByIdQueryReturnType> {
    const apiKey: GetApiKeyByIdQueryReturnType = await this.queryBus.execute(
      new GetApiKeyByIdQuery({ keyId }),
    );

    if (apiKey.userId !== userId) {
      throw new NotFoundException('API key not found');
    }

    return apiKey;
  }
}
