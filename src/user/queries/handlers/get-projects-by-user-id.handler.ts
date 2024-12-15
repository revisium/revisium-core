import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/database/prisma.service';
import { getOffsetPagination } from 'src/share/commands/utils/getOffsetPagination';
import { Prisma } from '@prisma/client';
import {
  GetProjectsByUserIdQuery,
  GetProjectsByUserIdQueryReturnType,
  GetUserOrganizationQuery,
  GetUserOrganizationQueryReturnType,
} from 'src/user/queries/impl';

type WhereData = { userId: string; organizationId?: string };

@QueryHandler(GetProjectsByUserIdQuery)
export class GetProjectsByUserIdHandler
  implements
    IQueryHandler<GetProjectsByUserIdQuery, GetProjectsByUserIdQueryReturnType>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  public async execute({ data }: GetProjectsByUserIdQuery) {
    const whereData: WhereData = {
      userId: data.userId,
      organizationId: await this.getUserOrganizationId(data.userId),
    };

    return getOffsetPagination({
      pageData: data,
      findMany: (args) => this.getProjects(this.getWhereInput(whereData), args),
      count: () => this.getProjectsCount(this.getWhereInput(data)),
    });
  }

  private getProjects(
    where: Prisma.ProjectWhereInput,
    args: { take: number; skip: number },
  ) {
    return this.prisma.project.findMany({
      where,
      ...args,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private getProjectsCount(where: Prisma.ProjectWhereInput) {
    return this.prisma.project.count({
      where,
    });
  }

  private getWhereInput(data: WhereData): Prisma.ProjectWhereInput {
    const OR: Prisma.ProjectWhereInput[] = [];

    if (data.organizationId) {
      OR.push({
        organizationId: data.organizationId,
      });
    }

    OR.push({
      organization: {
        userOrganizations: { some: { userId: data.userId } },
      },
    });

    OR.push({
      userProjects: {
        some: { userId: data.userId },
      },
    });

    return {
      OR,
    };
  }

  private getUserOrganizationId(userId: string) {
    return this.queryBus.execute<
      GetUserOrganizationQuery,
      GetUserOrganizationQueryReturnType
    >(new GetUserOrganizationQuery({ userId }));
  }
}
