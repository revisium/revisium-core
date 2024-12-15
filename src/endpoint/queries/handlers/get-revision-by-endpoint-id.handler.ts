import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRevisionByEndpointIdQuery } from 'src/endpoint/queries/impl';
import { PrismaService } from 'src/database/prisma.service';

@QueryHandler(GetRevisionByEndpointIdQuery)
export class GetRevisionByEndpointIdHandler
  implements IQueryHandler<GetRevisionByEndpointIdQuery>
{
  constructor(private prisma: PrismaService) {}

  execute({ endpointId }: GetRevisionByEndpointIdQuery) {
    return this.prisma.endpoint
      .findUniqueOrThrow({
        where: { id: endpointId },
      })
      .revision();
  }
}
