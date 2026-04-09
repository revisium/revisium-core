import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ForbiddenError } from '@casl/ability';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import { ApiKeyType, Prisma } from 'src/__generated__/client';
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
import {
  CheckOrganizationPermissionCommand,
  CheckProjectPermissionCommand,
} from 'src/features/auth/commands/impl';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';

const MANAGE_API_KEY_PERMISSION = {
  action: PermissionAction.manage,
  subject: PermissionSubject.ApiKey,
};

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

  async createServiceApiKey(data: {
    name: string;
    userId: string;
    organizationId: string;
    projectIds?: string[];
    branchNames?: string[];
    tableIds?: string[];
    readOnly?: boolean;
    allowedIps?: string[];
    expiresAt?: Date;
    permissions: Prisma.InputJsonValue;
  }): Promise<CreateApiKeyCommandReturnType> {
    await this.assertManageApiKeyPermission(
      data.userId,
      data.organizationId,
      data.projectIds,
    );

    const serviceId = `svc_${nanoid(12)}`;

    return this.commandBus.execute(
      new CreateApiKeyCommand({
        type: ApiKeyType.SERVICE,
        name: data.name,
        serviceId,
        organizationId: data.organizationId,
        projectIds: data.projectIds,
        branchNames: data.branchNames,
        tableIds: data.tableIds,
        readOnly: data.readOnly,
        allowedIps: data.allowedIps,
        expiresAt: data.expiresAt,
        permissions: data.permissions,
      }),
    );
  }

  async revokeApiKey(
    keyId: string,
    userId: string,
  ): Promise<RevokeApiKeyCommandReturnType> {
    await this.assertKeyAccess(keyId, userId);
    return this.commandBus.execute(new RevokeApiKeyCommand({ keyId }));
  }

  async rotateApiKey(
    keyId: string,
    userId: string,
  ): Promise<RotateApiKeyCommandReturnType> {
    await this.assertKeyAccess(keyId, userId);
    return this.commandBus.execute(new RotateApiKeyCommand({ keyId }));
  }

  async getMyApiKeys(userId: string): Promise<GetApiKeysQueryReturnType> {
    return this.queryBus.execute(new GetApiKeysQuery({ userId }));
  }

  async getServiceApiKeys(
    organizationId: string,
    userId: string,
  ): Promise<GetApiKeysQueryReturnType> {
    await this.assertManageApiKeyPermission(userId, organizationId);

    return this.queryBus.execute(
      new GetApiKeysQuery({
        type: ApiKeyType.SERVICE,
        organizationId,
      }),
    );
  }

  async getApiKeyById(
    keyId: string,
    userId: string,
  ): Promise<GetApiKeyByIdQueryReturnType> {
    return this.assertKeyAccess(keyId, userId);
  }

  private async assertKeyAccess(
    keyId: string,
    userId: string,
  ): Promise<GetApiKeyByIdQueryReturnType> {
    const apiKey: GetApiKeyByIdQueryReturnType = await this.queryBus.execute(
      new GetApiKeyByIdQuery({ keyId }),
    );

    if (apiKey.type === ApiKeyType.SERVICE) {
      if (!apiKey.organizationId) {
        throw new NotFoundException('API key not found');
      }
      try {
        await this.assertManageApiKeyPermission(
          userId,
          apiKey.organizationId,
          apiKey.projectIds.length > 0 ? apiKey.projectIds : undefined,
        );
      } catch (error) {
        if (error instanceof ForbiddenException) {
          throw new NotFoundException('API key not found');
        }
        throw error;
      }
      return apiKey;
    }

    if (apiKey.userId !== userId) {
      throw new NotFoundException('API key not found');
    }

    return apiKey;
  }

  private async assertManageApiKeyPermission(
    userId: string,
    organizationId: string,
    projectIds?: string[],
  ): Promise<void> {
    try {
      if (projectIds && projectIds.length > 0) {
        for (const projectId of projectIds) {
          await this.commandBus.execute(
            new CheckProjectPermissionCommand({
              permissions: [MANAGE_API_KEY_PERMISSION],
              projectId,
              userId,
            }),
          );
        }
      } else {
        await this.commandBus.execute(
          new CheckOrganizationPermissionCommand({
            permissions: [MANAGE_API_KEY_PERMISSION],
            organizationId,
            userId,
          }),
        );
      }
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw new ForbiddenException(
          'You do not have permission to manage API keys',
        );
      }
      throw error;
    }
  }
}
