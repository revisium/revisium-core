import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetMigrationsQuery,
  GetMigrationsQueryData,
} from 'src/features/revision/queries/impl';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { TableMigrations } from 'src/features/share/utils/schema/types/migration';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@QueryHandler(GetMigrationsQuery)
export class GetMigrationsHandler implements IQueryHandler<GetMigrationsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  public async execute({ data }: GetMigrationsQuery) {
    return this.getTableMigrations(data);
  }

  private async getTableMigrations(data: GetMigrationsQueryData) {
    const rows = await this.prisma.row.findMany({
      where: {
        tables: {
          some: {
            revisions: {
              some: {
                id: data.revisionId,
              },
            },
            id: SystemTables.Schema,
          },
        },
      },
    });

    return rows.map((row) => row.meta as TableMigrations);
  }
}
