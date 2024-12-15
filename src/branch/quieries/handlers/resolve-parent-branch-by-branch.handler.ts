import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ResolveParentBranchByBranchQuery } from 'src/branch/quieries/impl';
import { PrismaService } from 'src/database/prisma.service';

@QueryHandler(ResolveParentBranchByBranchQuery)
export class ResolveParentBranchByBranchHandler
  implements IQueryHandler<ResolveParentBranchByBranchQuery>
{
  constructor(private prisma: PrismaService) {}

  public async execute({ data }: ResolveParentBranchByBranchQuery): Promise<
    | {
        branch: { id: string };
        revision: { id: string };
      }
    | undefined
  > {
    const startRevision = await this.getStartRevision(data.branchId);

    if (startRevision.parent) {
      return {
        branch: {
          id: startRevision.parent.branchId,
        },
        revision: {
          id: startRevision.parent.id,
        },
      };
    }
  }

  private getStartRevision(branchId: string) {
    return this.prisma.revision.findFirstOrThrow({
      where: { branchId, isStart: true },
      select: {
        id: true,
        parent: {
          select: {
            id: true,
            branchId: true,
          },
        },
      },
    });
  }
}
