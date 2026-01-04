import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  GetUserQuery,
  GetUserQueryReturnType,
} from 'src/features/user/queries/impl';

@QueryHandler(GetUserQuery)
export class GetUserHandler
  implements IQueryHandler<GetUserQuery, GetUserQueryReturnType>
{
  constructor(private readonly prisma: PrismaService) {}

  public async execute({
    data,
  }: GetUserQuery): Promise<GetUserQueryReturnType> {
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
      select: {
        id: true,
        username: true,
        email: true,
        roleId: true,
        password: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Not found user');
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      roleId: user.roleId,
      hasPassword: Boolean(user.password),
    };
  }
}
