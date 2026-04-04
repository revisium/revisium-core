import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ApiKey } from 'src/__generated__/client';
import { ApiKeyService } from 'src/features/api-key/api-key.service';
import {
  RotateApiKeyCommand,
  RotateApiKeyCommandReturnType,
} from 'src/features/api-key/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@CommandHandler(RotateApiKeyCommand)
export class RotateApiKeyHandler implements ICommandHandler<
  RotateApiKeyCommand,
  RotateApiKeyCommandReturnType
> {
  private readonly logger = new Logger(RotateApiKeyHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  async execute({
    data,
  }: RotateApiKeyCommand): Promise<RotateApiKeyCommandReturnType> {
    const oldKey = await this.prisma.apiKey.findUnique({
      where: { id: data.keyId },
    });

    if (!oldKey) {
      throw new NotFoundException('API key not found');
    }

    this.validateState(oldKey);

    const { key, hash, prefix } = this.apiKeyService.generateKey();

    const [, newApiKey] = await this.prisma.$transaction([
      this.prisma.apiKey.update({
        where: { id: data.keyId },
        data: {
          revokedAt: new Date(),
          serviceId: oldKey.serviceId
            ? `${oldKey.serviceId}:revoked:${Date.now()}`
            : null,
        },
      }),
      this.prisma.apiKey.create({
        data: {
          prefix,
          keyHash: hash,
          type: oldKey.type,
          name: oldKey.name,
          userId: oldKey.userId,
          serviceId: oldKey.serviceId,
          internalServiceName: oldKey.internalServiceName,
          organizationId: oldKey.organizationId,
          projectIds: oldKey.projectIds,
          branchNames: oldKey.branchNames,
          tableIds: oldKey.tableIds,
          permissions: oldKey.permissions ?? undefined,
          readOnly: oldKey.readOnly,
          allowedIps: oldKey.allowedIps,
          expiresAt: oldKey.expiresAt,
        },
      }),
    ]);

    try {
      await this.prisma.apiKey.update({
        where: { id: data.keyId },
        data: { replacedById: newApiKey.id },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to set replacedById on key ${data.keyId}: ${error}`,
      );
    }

    return { id: newApiKey.id, key };
  }

  private validateState(oldKey: ApiKey): void {
    if (oldKey.revokedAt) {
      throw new BadRequestException('Cannot rotate a revoked key');
    }

    if (oldKey.expiresAt && oldKey.expiresAt <= new Date()) {
      throw new BadRequestException('Cannot rotate an expired key');
    }
  }
}
