import { NotFoundException } from '@nestjs/common';
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

  public async execute({ data }: GetProjectByIdQuery) {
    const project = await this.prisma.project.findUnique({
      where: { id: data.projectId, isDeleted: false },
    });

    if (!project) {
      throw new NotFoundException(
        `A project with this name does not exist in the organization`,
      );
    }

    return project;
  }
}
