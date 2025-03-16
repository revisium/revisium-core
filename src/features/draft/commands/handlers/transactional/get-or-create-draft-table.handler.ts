import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IdService } from 'src/infrastructure/database/id.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { GetOrCreateDraftTableCommand } from 'src/features/draft/commands/impl/transactional/get-or-create-draft-table.command';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';
import { DraftTableRequestDto } from 'src/features/draft/draft-request-dto/table-request.dto';
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
    this.tableRequestDto.createdId = previousTable.createdId;

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
    previousTableVersionId: string,
    system: boolean,
  ) {
    await this.createDraftTable(
      await this.getPreviousRowsInTable(previousTableVersionId),
      system,
    );
    await this.disconnectPreviousTable(previousTableVersionId);
  }

  private getPreviousRowsInTable(tableVersionId: string) {
    return this.transaction.table
      .findUniqueOrThrow({
        where: {
          versionId: tableVersionId,
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
        createdId: this.tableRequestDto.createdId,
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

  private disconnectPreviousTable(previousTableVersionId: string) {
    return this.transaction.revision.update({
      where: {
        id: this.revisionRequestDto.id,
      },
      data: {
        tables: {
          disconnect: {
            versionId: previousTableVersionId,
          },
        },
      },
    });
  }
}
