import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRevisionByEndpointIdQuery } from 'src/features/endpoint/queries/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@QueryHandler(GetRevisionByEndpointIdQuery)
export class GetRevisionByEndpointIdHandler
  implements IQueryHandler<GetRevisionByEndpointIdQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  execute({ endpointId }: GetRevisionByEndpointIdQuery) {
    return this.prisma.endpoint
      .findUniqueOrThrow({
        where: { id: endpointId },
      })
      .revision();
  }
}
