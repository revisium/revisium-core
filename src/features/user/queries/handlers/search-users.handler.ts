import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from 'src/__generated__/client';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  SearchUsersQuery,
  SearchUsersQueryReturnType,
} from 'src/features/user/queries/impl';
import { getOffsetPagination } from 'src/features/share/commands/utils/getOffsetPagination';

@QueryHandler(SearchUsersQuery)
export class SearchUsersHandler implements IQueryHandler<
  SearchUsersQuery,
  SearchUsersQueryReturnType
> {
  constructor(private readonly prisma: PrismaService) {}

  public async execute({ data }: SearchUsersQuery) {
    return getOffsetPagination({
      pageData: data,
      findMany: (args) => this.getUsers(this.getWhereInput(data), args),
      count: () => this.getUsersCount(this.getWhereInput(data)),
    });
  }

  private getUsers(
    where: Prisma.UserWhereInput,
    args: { take: number; skip: number },
  ) {
    return this.prisma.user.findMany({
      where,
      ...args,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        roleId: true,
      },
    });
  }

  private getUsersCount(where: Prisma.UserWhereInput) {
    return this.prisma.user.count({
      where,
    });
  }

  private getWhereInput(data: SearchUsersQuery['data']): Prisma.UserWhereInput {
    return data.search
      ? {
          OR: [
            { email: { contains: data.search, mode: 'insensitive' } },
            { username: { contains: data.search, mode: 'insensitive' } },
          ],
        }
      : {};
  }
}
