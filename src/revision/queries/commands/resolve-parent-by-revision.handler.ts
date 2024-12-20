import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/database/prisma.service';
import { ResolveParentByRevisionQuery } from 'src/revision/queries/impl/resolve-parent-by-revision.query';

@QueryHandler(ResolveParentByRevisionQuery)
export class ResolveParentByRevisionHandler
  implements IQueryHandler<ResolveParentByRevisionQuery>
{
  constructor(private prisma: PrismaService) {}

  execute({ revisionId }: ResolveParentByRevisionQuery) {
    return this.prisma.revision
      .findUniqueOrThrow({ where: { id: revisionId } })
      .parent();
  }
}
