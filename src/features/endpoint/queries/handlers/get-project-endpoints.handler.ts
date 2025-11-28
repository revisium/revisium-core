import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { EndpointType, Prisma } from 'src/__generated__/client';
import {
  GetProjectEndpointsData,
  GetProjectEndpointsQuery,
  GetProjectEndpointsReturnType,
} from 'src/features/endpoint/queries/impl';
import {
  getOffsetPagination,
  OffsetPaginationFindManyArgs,
} from 'src/features/share/commands/utils/getOffsetPagination';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

type EndpointResult = {
  id: string;
  createdAt: Date;
  type: EndpointType;
  revisionId: string;
};

@QueryHandler(GetProjectEndpointsQuery)
export class GetProjectEndpointsHandler
  implements IQueryHandler<GetProjectEndpointsQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute({
    data,
  }: GetProjectEndpointsQuery): Promise<GetProjectEndpointsReturnType> {
    const { first, after } = data;

    return getOffsetPagination<EndpointResult>({
      pageData: { first, after },
      findMany: (args) => this.findMany(data, args),
      count: () => this.count(data),
    });
  }

  private getWhereClause(
    data: GetProjectEndpointsData,
  ): Prisma.EndpointWhereInput {
    const { organizationId, projectName, branchId, type } = data;

    return {
      isDeleted: false,
      revision: {
        branch: {
          project: {
            name: projectName,
            organizationId,
          },
          ...(branchId ? { id: branchId } : {}),
        },
      },
      ...(type ? { type } : {}),
    };
  }

  private getOrderByClause(): Prisma.EndpointOrderByWithRelationInput {
    return {
      revision: {
        createdAt: 'desc',
      },
    };
  }

  private findMany(
    data: GetProjectEndpointsData,
    { take, skip }: OffsetPaginationFindManyArgs,
  ) {
    return this.prisma.endpoint.findMany({
      where: this.getWhereClause(data),
      orderBy: this.getOrderByClause(),
      take,
      skip,
      select: {
        id: true,
        createdAt: true,
        type: true,
        revisionId: true,
      },
    });
  }

  private count(data: GetProjectEndpointsData) {
    return this.prisma.endpoint.count({
      where: this.getWhereClause(data),
    });
  }
}
