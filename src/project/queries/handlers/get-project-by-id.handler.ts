import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/database/prisma.service';
import { GetProjectByIdQuery } from 'src/project/queries/impl';

@QueryHandler(GetProjectByIdQuery)
export class GetProjectByIdHandler
  implements IQueryHandler<GetProjectByIdQuery>
{
  constructor(private prisma: PrismaService) {}

  execute({ data }: GetProjectByIdQuery) {
    return this.prisma.project.findUniqueOrThrow({
      where: { id: data.projectId },
    });
  }
}
