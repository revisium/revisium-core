import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { IdService } from 'src/database/id.service';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { GetOrCreateDraftRowCommand } from 'src/draft/commands/impl/transactional/get-or-create-draft-row.command';
import { DraftRevisionRequestDto } from 'src/draft/draft-request-dto/draft-revision-request.dto';
import { DraftRowRequestDto } from 'src/draft/draft-request-dto/row-request.dto';
import { DraftTableRequestDto } from 'src/draft/draft-request-dto/table-request.dto';
import { SessionChangelogService } from 'src/draft/session-changelog.service';
import { ShareTransactionalQueries } from 'src/share/share.transactional.queries';

@CommandHandler(GetOrCreateDraftRowCommand)
export class GetOrCreateDraftRowHandler
  implements ICommandHandler<GetOrCreateDraftRowCommand>
{
  constructor(
    private transactionService: TransactionPrismaService,
    private idService: IdService,
    private shareTransactionalQueries: ShareTransactionalQueries,
    private revisionRequestDto: DraftRevisionRequestDto,
    private tableRequestDto: DraftTableRequestDto,
    private rowRequestDto: DraftRowRequestDto,
    private sessionChangelog: SessionChangelogService,
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

    if (!previousRow.readonly) {
      return (this.rowRequestDto.versionId = previousRow.versionId);
    }

    await this.createDraftRow(previousRow.versionId);

    return this.rowRequestDto.versionId;
  }

  private async getRowData(rowId: string) {
    const { data } = await this.transaction.row.findUniqueOrThrow({
      where: { versionId: rowId },
      select: { data: true },
    });
    return data;
  }

  private createRow(data: Prisma.InputJsonValue) {
    this.rowRequestDto.versionId = this.idService.generate();

    return this.transaction.row.create({
      data: {
        versionId: this.rowRequestDto.versionId,
        id: this.rowRequestDto.id,
        data,
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

  private async addRowToChangelog() {
    const countRows = await this.sessionChangelog.getCountRows('rowUpdates');

    if (!countRows) {
      await this.sessionChangelog.addTableForRow('rowUpdates');
    }

    await this.sessionChangelog.addRow('rowUpdates');

    return this.transaction.changelog.update({
      where: { id: this.revisionRequestDto.changelogId },
      data: {
        rowUpdatesCount: {
          increment: 1,
        },
        hasChanges: true,
      },
    });
  }

  private async createDraftRow(previousRowId: string) {
    await this.disconnectPreviousRow(previousRowId);
    await this.createRow(
      (await this.getRowData(previousRowId)) as Prisma.InputJsonValue,
    );
    await this.addRowToChangelog();
  }
}