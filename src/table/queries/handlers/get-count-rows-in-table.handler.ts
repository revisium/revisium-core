import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/database/prisma.service';
import { GetCountRowsInTableQuery } from 'src/table/queries/impl';

@QueryHandler(GetCountRowsInTableQuery)
export class GetCountRowsInTableHandler
  implements IQueryHandler<GetCountRowsInTableQuery>
{
  constructor(private prisma: PrismaService) {}

  async execute({ data }: GetCountRowsInTableQuery): Promise<number> {
    const result = await this.prisma.table.findUniqueOrThrow({
      where: { versionId: data.tableVersionId },
      include: { _count: { select: { rows: true } } },
    });

    return result._count.rows;
  }
}
