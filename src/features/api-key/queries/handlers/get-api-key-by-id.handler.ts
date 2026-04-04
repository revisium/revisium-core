import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetApiKeyByIdQuery,
  GetApiKeyByIdQueryReturnType,
} from 'src/features/api-key/queries/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@QueryHandler(GetApiKeyByIdQuery)
export class GetApiKeyByIdHandler implements IQueryHandler<
  GetApiKeyByIdQuery,
  GetApiKeyByIdQueryReturnType
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({
    data,
  }: GetApiKeyByIdQuery): Promise<GetApiKeyByIdQueryReturnType> {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id: data.keyId },
      omit: { keyHash: true },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return apiKey;
  }
}
