import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/database/prisma.service';
import { GetRevisionQuery } from 'src/revision/queries/impl/get-revision.query';

@QueryHandler(GetRevisionQuery)
export class GetRevisionHandler implements IQueryHandler<GetRevisionQuery> {
  constructor(private prisma: PrismaService) {}

  execute({ data }: GetRevisionQuery) {
    return this.prisma.revision.findUniqueOrThrow({
      where: { id: data.revisionId },
    });
  }
}
