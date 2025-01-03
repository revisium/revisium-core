import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/database/prisma.service';
import { GetUserQuery, GetUserQueryReturnType } from 'src/user/queries/impl';

@QueryHandler(GetUserQuery)
export class GetUserHandler
  implements IQueryHandler<GetUserQuery, GetUserQueryReturnType>
{
  constructor(private readonly prisma: PrismaService) {}

  public async execute({ data }: GetUserQuery) {
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Not found user');
    }

    return user;
  }
}
