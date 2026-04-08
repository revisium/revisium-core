import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from 'src/__generated__/client';
import {
  GetApiKeysQuery,
  GetApiKeysQueryReturnType,
} from 'src/features/api-key/queries/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@QueryHandler(GetApiKeysQuery)
export class GetApiKeysHandler implements IQueryHandler<
  GetApiKeysQuery,
  GetApiKeysQueryReturnType
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ data }: GetApiKeysQuery): Promise<GetApiKeysQueryReturnType> {
    const where: Prisma.ApiKeyWhereInput = { revokedAt: null };

    if (data.userId) {
      where.userId = data.userId;
    }

    if (data.type) {
      where.type = data.type;
    }

    if (data.organizationId) {
      where.organizationId = data.organizationId;
    }

    return this.prisma.apiKey.findMany({
      where,
      omit: { keyHash: true, userId: true, lastUsedIp: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
