import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/database/prisma.service';
import {
  GetProjectsByOrganizationIdQuery,
  GetProjectsByOrganizationIdQueryReturnType,
} from 'src/organization/queries/impl';
import { getOffsetPagination } from 'src/share/commands/utils/getOffsetPagination';
import { Prisma } from '@prisma/client';

@QueryHandler(GetProjectsByOrganizationIdQuery)
export class GetProjectsByOrganizationIdHandler
  implements
    IQueryHandler<
      GetProjectsByOrganizationIdQuery,
      GetProjectsByOrganizationIdQueryReturnType
    >
{
  constructor(private prisma: PrismaService) {}

  public async execute({ data }: GetProjectsByOrganizationIdQuery) {
    return getOffsetPagination({
      pageData: data,
      findMany: (args) => this.getProjects(this.getWhereInput(data), args),
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

  private getWhereInput(
    data: GetProjectsByOrganizationIdQuery['data'],
  ): Prisma.ProjectWhereInput {
    const OR: Prisma.ProjectWhereInput[] = [{ isPublic: true }];

    if (data.userId) {
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
    }

    const AND: Prisma.ProjectWhereInput[] = [
      { organizationId: data.organizationId },
      { OR },
    ];

    return {
      AND,
    };
  }
}
