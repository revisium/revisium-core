import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  GetUsersOrganizationQuery,
  GetUsersOrganizationQueryReturnType,
} from 'src/features/organization/queries/impl';
import { getOffsetPagination } from 'src/features/share/commands/utils/getOffsetPagination';
import { Prisma } from 'src/__generated__/client';

@QueryHandler(GetUsersOrganizationQuery)
export class GetUsersOrganizationHandler
  implements
    IQueryHandler<
      GetUsersOrganizationQuery,
      GetUsersOrganizationQueryReturnType
    >
{
  constructor(private readonly prisma: PrismaService) {}

  public async execute({ data }: GetUsersOrganizationQuery) {
    return getOffsetPagination({
      pageData: data,
      findMany: (args) =>
        this.getUsersOrganization(this.getWhereInput(data), args),
      count: () => this.getUsersOrganizationCount(this.getWhereInput(data)),
    });
  }

  private getUsersOrganization(
    where: Prisma.UserOrganizationWhereInput,
    args: { take: number; skip: number },
  ) {
    return this.prisma.userOrganization.findMany({
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

  private getUsersOrganizationCount(where: Prisma.UserOrganizationWhereInput) {
    return this.prisma.userOrganization.count({
      where,
    });
  }

  private getWhereInput(
    data: GetUsersOrganizationQuery['data'],
  ): Prisma.UserOrganizationWhereInput {
    return {
      organizationId: data.organizationId,
    };
  }
}
