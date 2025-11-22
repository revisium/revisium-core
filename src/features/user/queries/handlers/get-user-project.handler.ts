import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  GetUserProjectQuery,
  GetUserProjectQueryReturnType,
} from 'src/features/user/queries/impl/get-user-project.query';

@QueryHandler(GetUserProjectQuery)
export class GetUserProjectHandler
  implements IQueryHandler<GetUserProjectQuery, GetUserProjectQueryReturnType>
{
  constructor(private readonly prisma: PrismaService) {}

  public async execute({ data }: GetUserProjectQuery) {
    return this.prisma.userProject.findUnique({
      where: {
        projectId_userId: {
          projectId: data.projectId,
          userId: data.userId,
        },
      },
    });
  }
}
