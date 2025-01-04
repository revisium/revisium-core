import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetDraftRevisionQuery } from 'src/features/branch/quieries/impl';
import { GetDraftRevisionTypes } from 'src/features/branch/quieries/types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@QueryHandler(GetDraftRevisionQuery)
export class GetDraftRevisionHandler
  implements IQueryHandler<GetDraftRevisionQuery>
{
  constructor(private prisma: PrismaService) {}

  async execute({
    branchId,
  }: GetDraftRevisionQuery): Promise<GetDraftRevisionTypes> {
    return this.prisma.revision.findFirstOrThrow({
      where: { isDraft: true, branchId },
    });
  }
}
