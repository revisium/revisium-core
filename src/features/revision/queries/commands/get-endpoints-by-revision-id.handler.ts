import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { GetEndpointsByRevisionIdQuery } from 'src/features/revision/queries/impl';
import { GetEndpointsByRevisionId } from 'src/features/revision/queries/types';

@QueryHandler(GetEndpointsByRevisionIdQuery)
export class GetEndpointsByRevisionIdHandler
  implements IQueryHandler<GetEndpointsByRevisionIdQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  execute({
    revisionId,
  }: GetEndpointsByRevisionIdQuery): Promise<GetEndpointsByRevisionId> {
    return this.prisma.revision
      .findUniqueOrThrow({ where: { id: revisionId } })
      .endpoints({ where: { isDeleted: false } });
  }
}
