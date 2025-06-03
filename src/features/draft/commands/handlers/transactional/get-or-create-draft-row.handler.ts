import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { IdService } from 'src/infrastructure/database/id.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { GetOrCreateDraftRowCommand } from 'src/features/draft/commands/impl/transactional/get-or-create-draft-row.command';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';
import { DraftRowRequestDto } from 'src/features/draft/draft-request-dto/row-request.dto';
import { DraftTableRequestDto } from 'src/features/draft/draft-request-dto/table-request.dto';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';

@CommandHandler(GetOrCreateDraftRowCommand)
export class GetOrCreateDraftRowHandler
  implements ICommandHandler<GetOrCreateDraftRowCommand>
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly idService: IdService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
    private readonly revisionRequestDto: DraftRevisionRequestDto,
    private readonly tableRequestDto: DraftTableRequestDto,
    private readonly rowRequestDto: DraftRowRequestDto,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({ rowId }: GetOrCreateDraftRowCommand): Promise<string> {
    this.rowRequestDto.id = rowId;

    const previousRow =
      await this.shareTransactionalQueries.findRowInTableOrThrow(
        this.tableRequestDto.versionId,
        rowId,
      );

    this.rowRequestDto.previousVersionId = previousRow.versionId;
    this.rowRequestDto.createdId = previousRow.createdId;

    if (!previousRow.readonly) {
      this.rowRequestDto.versionId = previousRow.versionId;
      return this.rowRequestDto.versionId;
    }

    await this.createDraftRow(previousRow.versionId);

    return this.rowRequestDto.versionId;
  }

  private async getRowData(rowId: string) {
    return this.transaction.row.findUniqueOrThrow({
      where: { versionId: rowId },
    });
  }

  private async createRow(previousRowId: string) {
    const previousRow = await this.getRowData(previousRowId);

    this.rowRequestDto.versionId = this.idService.generate();

    return this.transaction.row.create({
      data: {
        versionId: this.rowRequestDto.versionId,
        createdId: this.rowRequestDto.createdId,
        id: this.rowRequestDto.id,
        createdAt: previousRow.createdAt,
        publishedAt: previousRow.publishedAt,
        data: previousRow.data as Prisma.InputJsonValue,
        meta: previousRow.meta as Prisma.InputJsonValue,
        hash: previousRow.hash,
        schemaHash: previousRow.schemaHash,
        readonly: false,
        tables: {
          connect: {
            versionId: this.tableRequestDto.versionId,
          },
        },
      },
    });
  }

  private disconnectPreviousRow(previousRowId: string) {
    return this.transaction.table.update({
      where: {
        versionId: this.tableRequestDto.versionId,
      },
      data: {
        rows: {
          disconnect: {
            versionId: previousRowId,
          },
        },
      },
    });
  }

  private async createDraftRow(previousRowId: string) {
    await this.disconnectPreviousRow(previousRowId);
    await this.createRow(previousRowId);
  }
}
