import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { getOffsetPagination } from 'src/features/share/commands/utils/getOffsetPagination';
import {
  GetProjectsByUserIdQuery,
  GetProjectsByUserIdQueryReturnType,
} from 'src/features/user/queries/impl';

type WhereData = { userId: string };

@QueryHandler(GetProjectsByUserIdQuery)
export class GetProjectsByUserIdHandler
  implements
    IQueryHandler<GetProjectsByUserIdQuery, GetProjectsByUserIdQueryReturnType>
{
  constructor(private readonly prisma: PrismaService) {}

  public async execute({ data }: GetProjectsByUserIdQuery) {
    const whereData: WhereData = {
      userId: data.userId,
    };

    return getOffsetPagination({
      pageData: data,
      findMany: (args) => this.getProjects(this.getWhereInput(whereData), args),
      count: () => this.getProjectsCount(this.getWhereInput(whereData)),
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
}
