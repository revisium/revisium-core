import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { IdService } from 'src/infrastructure/database/id.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { GetOrCreateDraftRowsCommand } from 'src/features/draft/commands/impl/transactional/get-or-create-draft-rows.command';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';
import { DraftRowsRequestDto } from 'src/features/draft/draft-request-dto/rows-request.dto';
import { DraftTableRequestDto } from 'src/features/draft/draft-request-dto/table-request.dto';
import { SessionChangelogService } from 'src/features/draft/session-changelog.service';
import { FindRowsInTableType } from 'src/features/share/queries/types';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';

@CommandHandler(GetOrCreateDraftRowsCommand)
export class GetOrCreateDraftRowsHandler
  implements ICommandHandler<GetOrCreateDraftRowsCommand>
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly idService: IdService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
    private readonly revisionRequestDto: DraftRevisionRequestDto,
    private readonly tableRequestDto: DraftTableRequestDto,
    private readonly rowsRequestDto: DraftRowsRequestDto,
    private readonly sessionChangelog: SessionChangelogService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({ rowIds }: GetOrCreateDraftRowsCommand) {
    this.rowsRequestDto.rows = [];

    const previousRows =
      await this.shareTransactionalQueries.findRowsInTableOrThrow(
        this.tableRequestDto.versionId,
        rowIds,
      );

    const notReadonlyRows = previousRows.filter((row) => !row.readonly);
    const readonlyRows = previousRows.filter((row) => row.readonly);

    if (notReadonlyRows.length) {
      for (const notReadonlyRow of notReadonlyRows) {
        this.rowsRequestDto.rows.push({
          id: notReadonlyRow.id,
          previousVersionId: notReadonlyRow.versionId,
          versionId: notReadonlyRow.versionId,
        });
      }
    }

    if (readonlyRows.length) {
      await this.createDraftRows(readonlyRows);
    }
  }

  private async cloneRows(readonlyRows: FindRowsInTableType) {
    const rows = await this.transaction.row.findMany({
      where: { OR: readonlyRows.map((row) => ({ versionId: row.versionId })) },
      select: { data: true, id: true, versionId: true },
    });

    if (rows.length !== readonlyRows.length) {
      throw new BadRequestException('Invalid cloning rows');
    }

    const generatedRows = rows.map((row) => ({
      data: row.data,
      id: row.id,
      versionId: this.idService.generate(),
      previousVersionId: row.versionId,
    }));

    const inputs: Prisma.RowCreateManyInput[] =
      generatedRows.map<Prisma.RowCreateManyInput>((row) => ({
        versionId: row.versionId,
        id: row.id,
        data: row.data as Prisma.InputJsonValue,
        readonly: false,
      }));

    await this.transaction.row.createMany({ data: inputs });
    await this.connectDraftRows(inputs.map((input) => input.versionId));

    for (const generatedRow of generatedRows) {
      this.rowsRequestDto.rows.push({
        id: generatedRow.id,
        previousVersionId: generatedRow.previousVersionId,
        versionId: generatedRow.versionId,
      });
    }
  }

  private connectDraftRows(rowsVersionIds: string[]) {
    return this.transaction.table.update({
      where: {
        versionId: this.tableRequestDto.versionId,
      },
      data: {
        rows: {
          connect: rowsVersionIds.map((versionId) => ({
            versionId,
          })),
        },
      },
    });
  }

  private disconnectReadonlyRows(readonlyRows: FindRowsInTableType) {
    return this.transaction.table.update({
      where: {
        versionId: this.tableRequestDto.versionId,
      },
      data: {
        rows: {
          disconnect: readonlyRows.map((item) => ({
            versionId: item.versionId,
          })),
        },
      },
    });
  }

  private async addRowsToChangelog(readonlyRows: FindRowsInTableType) {
    const countRows = await this.sessionChangelog.getCountRows('rowUpdates');

    if (!countRows) {
      await this.sessionChangelog.addTableForRow('rowUpdates');
    }

    const ids = readonlyRows.map((row) => row.id);
    await this.sessionChangelog.addRows('rowUpdates', ids);

    return this.transaction.changelog.update({
      where: { id: this.revisionRequestDto.changelogId },
      data: {
        rowUpdatesCount: {
          increment: readonlyRows.length,
        },
        hasChanges: true,
      },
    });
  }

  private async createDraftRows(readonlyRows: FindRowsInTableType) {
    await this.disconnectReadonlyRows(readonlyRows);
    await this.cloneRows(readonlyRows);
    await this.addRowsToChangelog(readonlyRows);
  }
}
