import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetBranchByIdQuery } from 'src/features/branch/quieries/impl/get-branch-by-id.query';
import { GetBranchByIdReturnType } from 'src/features/branch/quieries/types/get-branch-by-id.types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@QueryHandler(GetBranchByIdQuery)
export class GetBranchByIdHandler
  implements IQueryHandler<GetBranchByIdQuery, GetBranchByIdReturnType>
{
  constructor(private prisma: PrismaService) {}

  execute({ branchId }: GetBranchByIdQuery) {
    return this.prisma.branch.findUniqueOrThrow({ where: { id: branchId } });
  }
}
