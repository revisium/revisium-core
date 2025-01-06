import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  GetProjectByIdQuery,
  GetProjectByIdQueryReturnType,
} from 'src/features/project/queries/impl';

@QueryHandler(GetProjectByIdQuery)
export class GetProjectByIdHandler
  implements IQueryHandler<GetProjectByIdQuery, GetProjectByIdQueryReturnType>
{
  constructor(private readonly prisma: PrismaService) {}

  execute({ data }: GetProjectByIdQuery) {
    return this.prisma.project.findUniqueOrThrow({
      where: { id: data.projectId },
    });
  }
}
