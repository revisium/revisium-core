import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  GetProjectsByOrganizationIdQuery,
  GetProjectsByOrganizationIdQueryData,
  GetProjectsByOrganizationIdQueryReturnType,
} from 'src/features/organization/queries/impl';
import { getOffsetPagination } from 'src/features/share/commands/utils/getOffsetPagination';
import { Prisma } from 'src/__generated__/client';

@QueryHandler(GetProjectsByOrganizationIdQuery)
export class GetProjectsByOrganizationIdHandler
  implements
    IQueryHandler<
      GetProjectsByOrganizationIdQuery,
      GetProjectsByOrganizationIdQueryReturnType
    >
{
  constructor(private readonly prisma: PrismaService) {}

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
    data: GetProjectsByOrganizationIdQueryData,
  ): Prisma.ProjectWhereInput {
    const OR: Prisma.ProjectWhereInput[] = [
      {
        organizationId: data.organizationId,
        isDeleted: false,
        isPublic: true,
      },
    ];

    if (data.userId) {
      OR.push(
        {
          organizationId: data.organizationId,
          isDeleted: false,
          organization: {
            userOrganizations: { some: { userId: data.userId } },
          },
        },
        {
          organizationId: data.organizationId,
          isDeleted: false,
          userProjects: {
            some: { userId: data.userId },
          },
        },
      );
    }

    return {
      OR,
    };
  }
}
