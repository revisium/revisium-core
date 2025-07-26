import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetMigrationsQuery } from 'src/features/revision/queries/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@QueryHandler(GetMigrationsQuery)
export class GetMigrationsHandler implements IQueryHandler<GetMigrationsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  public async execute({ data }: GetMigrationsQuery) {
    return [];
  }
}
