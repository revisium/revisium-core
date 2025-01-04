import { BadRequestException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { FindRowInTableOrThrowQuery } from 'src/features/share/queries/impl/transactional/find-row-in-table-or-throw.query';
import { FindRowInTableType } from 'src/features/share/queries/types';

@QueryHandler(FindRowInTableOrThrowQuery)
export class FindRowInTableOrThrowHandler
  implements IQueryHandler<FindRowInTableOrThrowQuery>
{
  constructor(private transactionService: TransactionPrismaService) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({
    data,
  }: FindRowInTableOrThrowQuery): Promise<FindRowInTableType> {
    const existingRow = await this.transaction.row.findFirst({
      where: {
        id: data.rowId,
        tables: { some: { versionId: data.tableVersionId } },
      },
      select: { versionId: true, readonly: true },
    });

    if (!existingRow) {
      throw new BadRequestException(
        'A row with this name does not exist in the revision',
      );
    }

    return existingRow;
  }
}
