import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  GetProjectsByIdsQuery,
  GetProjectsByIdsQueryReturnType,
} from 'src/features/project/queries/impl';

@QueryHandler(GetProjectsByIdsQuery)
export class GetProjectsByIdsHandler implements IQueryHandler<
  GetProjectsByIdsQuery,
  GetProjectsByIdsQueryReturnType
> {
  constructor(private readonly prisma: PrismaService) {}

  public async execute({ data }: GetProjectsByIdsQuery) {
    return this.prisma.project.findMany({
      where: { id: { in: data.projectIds }, isDeleted: false },
    });
  }
}
