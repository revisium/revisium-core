import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetProjectByBranchQuery } from 'src/features/branch/quieries/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@QueryHandler(GetProjectByBranchQuery)
export class GetProjectByBranchHandler
  implements IQueryHandler<GetProjectByBranchQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  execute({ branchId }: GetProjectByBranchQuery) {
    return this.prisma.branch
      .findUniqueOrThrow({ where: { id: branchId } })
      .project();
  }
}
