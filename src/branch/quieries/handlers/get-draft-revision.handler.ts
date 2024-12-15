import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetDraftRevisionQuery } from 'src/branch/quieries/impl';
import { GetDraftRevisionTypes } from 'src/branch/quieries/types';
import { PrismaService } from 'src/database/prisma.service';

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
