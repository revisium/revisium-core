import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/database/prisma.service';
import { GetTableByIdQuery } from 'src/table/queries/impl/get-table-by-id.query';
import { GetTableByIdReturnType } from 'src/table/queries/types';

@QueryHandler(GetTableByIdQuery)
export class GetTableByIdHandler
  implements IQueryHandler<GetTableByIdQuery, GetTableByIdReturnType>
{
  constructor(private prisma: PrismaService) {}
  public async execute({ data }: GetTableByIdQuery) {
    const table = await this.prisma.table.findUnique({
      where: { versionId: data.tableVersionId },
    });

    if (table) {
      return {
        ...table,
        context: {
          revisionId: data.revisionId,
        },
      };
    } else {
      return null;
    }
  }
}
