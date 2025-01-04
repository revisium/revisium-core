import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetStartRevisionQuery } from 'src/features/branch/quieries/impl';
import { GetStartRevisionReturnType } from 'src/features/branch/quieries/types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

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
