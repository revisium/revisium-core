import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/database/prisma.service';
import { GetRowByIdQuery } from 'src/row/queries/impl/get-row-by-id.query';
import { GetRowByIdReturnType } from 'src/row/queries/types';

@QueryHandler(GetRowByIdQuery)
export class GetRowByIdHandler
  implements IQueryHandler<GetRowByIdQuery, GetRowByIdReturnType>
{
  constructor(private prisma: PrismaService) {}

  public async execute({ data }: GetRowByIdQuery) {
    const row = await this.prisma.row.findUnique({
      where: { versionId: data.rowVersionId },
    });

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
