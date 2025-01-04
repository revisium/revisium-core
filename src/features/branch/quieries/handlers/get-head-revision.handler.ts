import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetHeadRevisionQuery } from 'src/features/branch/quieries/impl';
import { GetHeadRevisionReturnType } from 'src/features/branch/quieries/types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@QueryHandler(GetHeadRevisionQuery)
export class GetHeadRevisionHandler
  implements IQueryHandler<GetHeadRevisionQuery>
{
  constructor(private prisma: PrismaService) {}

  async execute({
    branchId,
  }: GetHeadRevisionQuery): Promise<GetHeadRevisionReturnType> {
    return this.prisma.revision.findFirstOrThrow({
      where: { isHead: true, branchId },
    });
  }
}
