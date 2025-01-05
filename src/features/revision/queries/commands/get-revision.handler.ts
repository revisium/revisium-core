import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  GetRevisionQuery,
  GetRevisionQueryReturnType,
} from 'src/features/revision/queries/impl/get-revision.query';

@QueryHandler(GetRevisionQuery)
export class GetRevisionHandler
  implements IQueryHandler<GetRevisionQuery, GetRevisionQueryReturnType>
{
  constructor(private readonly prisma: PrismaService) {}

  execute({ data }: GetRevisionQuery) {
    return this.prisma.revision.findUniqueOrThrow({
      where: { id: data.revisionId },
    });
  }
}
