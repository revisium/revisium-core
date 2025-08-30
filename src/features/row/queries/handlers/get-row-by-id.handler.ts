import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PluginService } from 'src/features/plugin/plugin.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  GetRowByIdQuery,
  GetRowByIdQueryReturnType,
} from 'src/features/row/queries/impl/get-row-by-id.query';

@QueryHandler(GetRowByIdQuery)
export class GetRowByIdHandler
  implements IQueryHandler<GetRowByIdQuery, GetRowByIdQueryReturnType>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly pluginService: PluginService,
  ) {}

  public async execute({ data }: GetRowByIdQuery) {
    const row = await this.prisma.row.findUnique({
      where: { versionId: data.rowVersionId },
    });

    if (row) {
      await this.pluginService.computeRows({
        revisionId: data.revisionId,
        tableId: data.tableId,
        rows: [row],
      });
    }

    if (row) {
      return {
        ...row,
        context: {
          revisionId: data.revisionId,
          tableId: data.tableId,
        },
      };
    } else {
      return null;
    }
  }
}
