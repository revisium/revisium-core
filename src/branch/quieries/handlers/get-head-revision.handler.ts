import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetHeadRevisionQuery } from 'src/branch/quieries/impl';
import { GetHeadRevisionReturnType } from 'src/branch/quieries/types';
import { PrismaService } from 'src/database/prisma.service';

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
