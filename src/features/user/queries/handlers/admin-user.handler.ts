import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  AdminUserQuery,
  AdminUserQueryReturnType,
} from 'src/features/user/queries/impl/admin-user.query';

@QueryHandler(AdminUserQuery)
export class AdminUserHandler implements IQueryHandler<
  AdminUserQuery,
  AdminUserQueryReturnType
> {
  constructor(private readonly prisma: PrismaService) {}

  public async execute({
    data,
  }: AdminUserQuery): Promise<AdminUserQueryReturnType> {
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
      select: {
        id: true,
        username: true,
        email: true,
        roleId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Not found user');
    }

    return user;
  }
}
