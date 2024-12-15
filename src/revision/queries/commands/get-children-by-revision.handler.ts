import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/database/prisma.service';
import { GetChildrenByRevisionQuery } from 'src/revision/queries/impl/get-children-by-revision.query';

@QueryHandler(GetChildrenByRevisionQuery)
export class GetChildrenByRevisionHandler
  implements IQueryHandler<GetChildrenByRevisionQuery>
{
  constructor(private prisma: PrismaService) {}

  execute({ revisionId }: GetChildrenByRevisionQuery) {
    return this.prisma.revision
      .findUniqueOrThrow({ where: { id: revisionId } })
      .children();
  }
}
