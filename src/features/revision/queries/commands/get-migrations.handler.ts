import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetMigrationsQuery,
  GetMigrationsQueryData,
} from 'src/features/revision/queries/impl';
import { HistoryPatches } from 'src/features/share/queries/impl';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { JsonPatch } from 'src/features/share/utils/schema/types/json-patch.types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@QueryHandler(GetMigrationsQuery)
export class GetMigrationsHandler implements IQueryHandler<GetMigrationsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  public async execute({ data }: GetMigrationsQuery) {
    const patches = await this.getTablePatches(data);

    return getMigrations(patches);
  }

  private async getTablePatches(data: GetMigrationsQueryData) {
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

    return rows.map((row) => ({
      tableId: row.id,
      patches: row.meta as HistoryPatches[],
    }));
  }
}

export type Migration = {
  tableId: string;
  patches: JsonPatch[];
  hash: string;
  date: string;
};

export function getMigrations(
  tablesPatches: { tableId: string; patches: HistoryPatches[] }[],
): Migration[] {
  return tablesPatches
    .flatMap(({ tableId, patches }) =>
      patches.map((patchGroup) => ({ tableId, patches: patchGroup })),
    )
    .map(({ tableId, patches }) => ({ tableId, ...patches }))
    .sort((a, b) => {
      const tA = Date.parse(a.date);
      const tB = Date.parse(b.date);
      return tA - tB;
    });
}
