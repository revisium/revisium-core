import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetStartRevisionQuery } from 'src/branch/quieries/impl';
import { GetStartRevisionReturnType } from 'src/branch/quieries/types';
import { PrismaService } from 'src/database/prisma.service';

@QueryHandler(GetStartRevisionQuery)
export class GetStartRevisionHandler
  implements IQueryHandler<GetStartRevisionQuery>
{
  constructor(private prisma: PrismaService) {}

  async execute({
    branchId,
  }: GetStartRevisionQuery): Promise<GetStartRevisionReturnType> {
    return this.prisma.revision.findFirstOrThrow({
      where: { isStart: true, branchId },
    });
  }
}
