import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IdService } from 'src/infrastructure/database/id.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { GetOrCreateDraftTableCommand } from 'src/features/draft/commands/impl/transactional/get-or-create-draft-table.command';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';
import { DraftTableRequestDto } from 'src/features/draft/draft-request-dto/table-request.dto';
import { SessionChangelogService } from 'src/features/draft/session-changelog.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';

@CommandHandler(GetOrCreateDraftTableCommand)
export class GetOrCreateDraftTableHandler
  implements ICommandHandler<GetOrCreateDraftTableCommand>
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly revisionRequestDto: DraftRevisionRequestDto,
    private readonly tableRequestDto: DraftTableRequestDto,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
    private readonly idService: IdService,
    private readonly sessionChangelog: SessionChangelogService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({ tableId }: GetOrCreateDraftTableCommand): Promise<string> {
    this.tableRequestDto.id = tableId;

    const previousTable =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        this.revisionRequestDto.id,
        this.tableRequestDto.id,
      );

    this.tableRequestDto.previousVersionId = previousTable.versionId;

    if (!previousTable.readonly) {
      this.tableRequestDto.versionId = previousTable.versionId;
      return this.tableRequestDto.versionId;
    }

    await this.createNextVersionTable(
      previousTable.versionId,
      previousTable.system,
    );

    return this.tableRequestDto.versionId;
  }

  private async createNextVersionTable(
    previousTableId: string,
    system: boolean,
  ) {
    await this.createDraftTable(
      await this.getPreviousRowsInTable(previousTableId),
      system,
    );
    await this.disconnectPreviousTable(previousTableId);
    await this.addTableToChangelog();
  }

  private getPreviousRowsInTable(tableId: string) {
    return this.transaction.table
      .findUniqueOrThrow({
        where: {
          versionId: tableId,
          revisions: { some: { id: this.revisionRequestDto.id } },
        },
      })
      .rows({ select: { versionId: true } });
  }

  private createDraftTable(rowIds: { versionId: string }[], system: boolean) {
    this.tableRequestDto.versionId = this.idService.generate();

    return this.transaction.table.create({
      data: {
        versionId: this.tableRequestDto.versionId,
        system,
        id: this.tableRequestDto.id,
        revisions: {
          connect: {
            id: this.revisionRequestDto.id,
          },
        },
        rows: {
          connect: rowIds,
        },
      },
    });
  }

  private disconnectPreviousTable(previousTableId: string) {
    return this.transaction.revision.update({
      where: {
        id: this.revisionRequestDto.id,
      },
      data: {
        tables: {
          disconnect: {
            versionId: previousTableId,
          },
        },
      },
    });
  }

  private async addTableToChangelog() {
    await this.sessionChangelog.addTable('tableUpdates');

    return this.transaction.changelog.update({
      where: { id: this.revisionRequestDto.changelogId },
      data: {
        tableUpdatesCount: {
          increment: 1,
        },
        hasChanges: true,
      },
    });
  }
}
