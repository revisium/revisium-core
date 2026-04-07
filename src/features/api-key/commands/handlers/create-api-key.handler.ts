import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApiKeyType } from 'src/__generated__/client';
import { ApiKeyService } from 'src/features/api-key/api-key.service';
import {
  CreateApiKeyCommand,
  CreateApiKeyCommandReturnType,
} from 'src/features/api-key/commands/impl';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { validateUrlLikeId } from 'src/features/share/utils/validateUrlLikeId/validateUrlLikeId';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

const MAX_NAME_LENGTH = 255;
const MAX_INTERNAL_SERVICE_NAME_LENGTH = 50;

const VALID_ACTIONS = new Set<string>([
  ...Object.values(PermissionAction),
  'manage',
]);
const VALID_SUBJECTS = new Set<string>([
  ...Object.values(PermissionSubject),
  'all',
]);

@CommandHandler(CreateApiKeyCommand)
export class CreateApiKeyHandler implements ICommandHandler<
  CreateApiKeyCommand,
  CreateApiKeyCommandReturnType
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  async execute({
    data,
  }: CreateApiKeyCommand): Promise<CreateApiKeyCommandReturnType> {
    this.validateFields(data);
    this.validateIdentity(data);
    this.validateCrossFields(data);
    this.validatePermissions(data);
    await this.validateReferences(data);

    const { key, hash, prefix } = this.apiKeyService.generateKey();

    const apiKey = await this.prisma.apiKey.create({
      data: {
        prefix,
        keyHash: hash,
        type: data.type,
        name: data.name,
        userId: data.userId,
        serviceId: data.serviceId,
        internalServiceName: data.internalServiceName,
        organizationId: data.organizationId,
        projectIds: data.projectIds ?? [],
        branchNames: data.branchNames ?? [],
        tableIds: data.tableIds ?? [],
        permissions: data.permissions ?? undefined,
        readOnly: data.readOnly ?? false,
        allowedIps: data.allowedIps ?? [],
        expiresAt: data.expiresAt,
      },
    });

    return { id: apiKey.id, key };
  }

  private validateFields(data: CreateApiKeyCommand['data']): void {
    if (!data.name || data.name.length > MAX_NAME_LENGTH) {
      throw new BadRequestException(
        `name is required and must be at most ${MAX_NAME_LENGTH} characters`,
      );
    }

    if (data.expiresAt && data.expiresAt <= new Date()) {
      throw new BadRequestException('expiresAt must be in the future');
    }
  }

  private validateIdentity(data: CreateApiKeyCommand['data']): void {
    switch (data.type) {
      case ApiKeyType.PERSONAL:
        if (!data.userId) {
          throw new BadRequestException('userId is required for PERSONAL keys');
        }
        break;
      case ApiKeyType.SERVICE:
        if (!data.serviceId) {
          throw new BadRequestException(
            'serviceId is required for SERVICE keys',
          );
        }
        validateUrlLikeId(data.serviceId);
        break;
      case ApiKeyType.INTERNAL:
        if (!data.internalServiceName) {
          throw new BadRequestException(
            'internalServiceName is required for INTERNAL keys',
          );
        }
        if (
          data.internalServiceName.length > MAX_INTERNAL_SERVICE_NAME_LENGTH
        ) {
          throw new BadRequestException(
            `internalServiceName must be at most ${MAX_INTERNAL_SERVICE_NAME_LENGTH} characters`,
          );
        }
        break;
    }
  }

  private validateCrossFields(data: CreateApiKeyCommand['data']): void {
    if (data.type === ApiKeyType.PERSONAL) {
      if (data.serviceId || data.internalServiceName) {
        throw new BadRequestException(
          'PERSONAL keys must not have serviceId or internalServiceName',
        );
      }
    }

    if (data.type === ApiKeyType.SERVICE) {
      if (data.userId || data.internalServiceName) {
        throw new BadRequestException(
          'SERVICE keys must not have userId or internalServiceName',
        );
      }
    }

    if (data.type === ApiKeyType.INTERNAL) {
      if (data.userId || data.serviceId) {
        throw new BadRequestException(
          'INTERNAL keys must not have userId or serviceId',
        );
      }
    }
  }

  private validatePermissions(data: CreateApiKeyCommand['data']): void {
    if (data.type !== ApiKeyType.SERVICE) {
      return;
    }

    const permissions = data.permissions as
      | { rules?: unknown }
      | null
      | undefined;

    if (
      !permissions ||
      !Array.isArray(permissions.rules) ||
      permissions.rules.length === 0
    ) {
      throw new BadRequestException(
        'permissions with at least one rule is required for SERVICE keys',
      );
    }

    for (const rule of permissions.rules as Array<{
      action?: unknown;
      subject?: unknown;
    }>) {
      if (!Array.isArray(rule.action) || rule.action.length === 0) {
        throw new BadRequestException(
          'Each permission rule must have at least one action',
        );
      }

      for (const action of rule.action) {
        if (typeof action !== 'string' || !VALID_ACTIONS.has(action)) {
          throw new BadRequestException(
            `Invalid action "${action}". Valid actions: ${[...VALID_ACTIONS].join(', ')}`,
          );
        }
      }

      if (!Array.isArray(rule.subject) || rule.subject.length === 0) {
        throw new BadRequestException(
          'Each permission rule must have at least one subject',
        );
      }

      for (const subject of rule.subject) {
        if (typeof subject !== 'string' || !VALID_SUBJECTS.has(subject)) {
          throw new BadRequestException(
            `Invalid subject "${subject}". Valid subjects: ${[...VALID_SUBJECTS].join(', ')}`,
          );
        }
      }
    }
  }

  private async validateReferences(
    data: CreateApiKeyCommand['data'],
  ): Promise<void> {
    if (data.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: data.userId },
        select: { id: true },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
    }

    if (data.serviceId) {
      const existing = await this.prisma.apiKey.findUnique({
        where: { serviceId: data.serviceId },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException(
          `API key with serviceId "${data.serviceId}" already exists`,
        );
      }
    }

    if (data.type === ApiKeyType.SERVICE && data.organizationId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: data.organizationId },
        select: { id: true },
      });
      if (!org) {
        throw new NotFoundException(
          `Organization "${data.organizationId}" not found`,
        );
      }
    }
  }
}
