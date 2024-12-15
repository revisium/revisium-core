import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCreatedEndpointQuery } from 'src/endpoint/queries/impl';
import { PrismaService } from 'src/database/prisma.service';

@QueryHandler(GetCreatedEndpointQuery)
export class GetCreatedEndpointHandler
  implements IQueryHandler<GetCreatedEndpointQuery>
{
  constructor(private prisma: PrismaService) {}

  execute({ data }: GetCreatedEndpointQuery) {
    return this.prisma.endpoint.findUniqueOrThrow({ where: { id: data.id } });
  }
}
