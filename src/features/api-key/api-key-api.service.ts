import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  UserOrganizationRoles,
  UserSystemRoles,
} from 'src/features/auth/consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@Injectable()
export class ApiKeyApiService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly prisma: PrismaService,
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
    await this.assertOrgAdmin(data.userId, data.organizationId);

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
    await this.assertOrgAdmin(userId, organizationId);

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
      await this.assertOrgAdmin(userId, apiKey.organizationId);
      return apiKey;
    }

    if (apiKey.userId !== userId) {
      throw new NotFoundException('API key not found');
    }

    return apiKey;
  }

  private async assertOrgAdmin(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roleId: true },
    });

    if (user?.roleId === UserSystemRoles.systemAdmin) {
      return;
    }

    const membership = await this.prisma.userOrganization.findFirst({
      where: { userId, organizationId },
      select: { roleId: true },
    });

    if (
      !membership ||
      (membership.roleId !== UserOrganizationRoles.organizationOwner &&
        membership.roleId !== UserOrganizationRoles.organizationAdmin)
    ) {
      throw new ForbiddenException(
        'Only organization admins can manage service API keys',
      );
    }
  }
}
