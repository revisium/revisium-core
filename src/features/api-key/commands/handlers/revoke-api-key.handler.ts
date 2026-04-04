import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  RevokeApiKeyCommand,
  RevokeApiKeyCommandReturnType,
} from 'src/features/api-key/commands/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@CommandHandler(RevokeApiKeyCommand)
export class RevokeApiKeyHandler implements ICommandHandler<
  RevokeApiKeyCommand,
  RevokeApiKeyCommandReturnType
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({
    data,
  }: RevokeApiKeyCommand): Promise<RevokeApiKeyCommandReturnType> {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id: data.keyId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    if (apiKey.revokedAt) {
      throw new BadRequestException('API key is already revoked');
    }

    await this.prisma.apiKey.update({
      where: { id: data.keyId },
      data: { revokedAt: new Date() },
    });
  }
}
