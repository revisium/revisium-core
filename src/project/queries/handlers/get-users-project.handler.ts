import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/database/prisma.service';
import {
  GetUsersProjectQuery,
  GetUsersProjectQueryReturnType,
} from 'src/project/queries/impl';
import { getOffsetPagination } from 'src/share/commands/utils/getOffsetPagination';
import { Prisma } from '@prisma/client';

@QueryHandler(GetUsersProjectQuery)
export class GetUsersProjectHandler
  implements
    IQueryHandler<GetUsersProjectQuery, GetUsersProjectQueryReturnType>
{
  constructor(private prisma: PrismaService) {}

  public async execute({ data }: GetUsersProjectQuery) {
    return getOffsetPagination({
      pageData: data,
      findMany: (args) => this.getUsersProject(this.getWhereInput(data), args),
      count: () => this.getUsersProjectCount(this.getWhereInput(data)),
    });
  }

  private getUsersProject(
    where: Prisma.UserProjectWhereInput,
    args: { take: number; skip: number },
  ) {
    return this.prisma.userProject.findMany({
      where,
      ...args,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        user: true,
        role: true,
      },
    });
  }

  private getUsersProjectCount(where: Prisma.UserProjectWhereInput) {
    return this.prisma.userProject.count({
      where,
    });
  }

  private getWhereInput(
    data: GetUsersProjectQuery['data'],
  ): Prisma.UserProjectWhereInput {
    return {
      project: {
        organizationId: data.organizationId,
        name: data.projectName,
      },
    };
  }
}
