import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/database/prisma.service';
import { GetUserQuery, GetUserQueryReturnType } from 'src/user/queries/impl';

@QueryHandler(GetUserQuery)
export class GetUserHandler
  implements IQueryHandler<GetUserQuery, GetUserQueryReturnType>
{
  constructor(private readonly prisma: PrismaService) {}

  public execute({ data }: GetUserQuery) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: data.userId },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });
  }
}
