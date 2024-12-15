import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/database/prisma.service';
import { GetEndpointsByRevisionIdQuery } from 'src/revision/queries/impl';
import { GetEndpointsByRevisionId } from 'src/revision/queries/types';

@QueryHandler(GetEndpointsByRevisionIdQuery)
export class GetEndpointsByRevisionIdHandler
  implements IQueryHandler<GetEndpointsByRevisionIdQuery>
{
  constructor(private prisma: PrismaService) {}

  execute({
    revisionId,
  }: GetEndpointsByRevisionIdQuery): Promise<GetEndpointsByRevisionId> {
    return this.prisma.revision
      .findUniqueOrThrow({ where: { id: revisionId } })
      .endpoints({ where: { isDeleted: false } });
  }
}
