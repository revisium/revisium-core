import { BadRequestException } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { IdService } from 'src/infrastructure/database/id.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { CreateRowCommand } from 'src/features/draft/commands/impl/create-row.command';
import { CreateRowHandlerReturnType } from 'src/features/draft/commands/types/create-row.handler.types';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';
import { DraftRowRequestDto } from 'src/features/draft/draft-request-dto/row-request.dto';
import { DraftTableRequestDto } from 'src/features/draft/draft-request-dto/table-request.dto';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { SessionChangelogService } from 'src/features/draft/session-changelog.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';

@CommandHandler(CreateRowCommand)
export class CreateRowHandler extends DraftHandler<
  CreateRowCommand,
  CreateRowHandlerReturnType
> {
  constructor(
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly revisionRequestDto: DraftRevisionRequestDto,
    protected readonly tableRequestDto: DraftTableRequestDto,
    protected readonly rowRequestDto: DraftRowRequestDto,
    protected readonly draftTransactionalCommands: DraftTransactionalCommands,
    protected readonly shareTransactionalQueries: ShareTransactionalQueries,
    protected readonly sessionChangelog: SessionChangelogService,
    protected readonly idService: IdService,
  ) {
    super(transactionService, draftContext);
  }

  protected async handler({
    data: input,
  }: CreateRowCommand): Promise<CreateRowHandlerReturnType> {
    const { revisionId, tableId, rowId, data, skipCheckingNotSystemTable } =
      input;

    this.validateRowId(rowId);
    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);

    await this.draftTransactionalCommands.validateData({
      revisionId,
      tableId,
      rows: [{ rowId, data }],
      skipReferenceValidation: skipCheckingNotSystemTable,
    });

    if (!skipCheckingNotSystemTable) {
      await this.draftTransactionalCommands.validateNotSystemTable(tableId);
    }
    await this.draftTransactionalCommands.getOrCreateDraftTable(tableId);

    await this.checkRowExistence(rowId);
    await this.createDraftRow(rowId, data);

    return {
      tableVersionId: this.tableRequestDto.versionId,
      previousTableVersionId: this.tableRequestDto.previousVersionId,
      rowVersionId: this.rowRequestDto.versionId,
    };
  }

  private validateRowId(rowId: string) {
    if (rowId.length < 1) {
      throw new BadRequestException(
        'The length of the row name must be greater than or equal to 1',
      );
    }
  }

  private async checkRowExistence(rowId: string) {
    const existingRow = await this.transaction.row.findFirst({
      where: {
        id: rowId,
        tables: {
          some: {
            versionId: this.tableRequestDto.versionId,
          },
        },
      },
      select: { versionId: true },
    });

    if (existingRow) {
      throw new BadRequestException(
        'A row with this name already exists in the table',
      );
    }
  }

  private async createDraftRow(rowId: string, data: Prisma.InputJsonValue) {
    this.rowRequestDto.versionId = this.idService.generate();
    this.rowRequestDto.id = rowId;

    await this.transaction.row.create({
      data: {
        versionId: this.rowRequestDto.versionId,
        id: this.rowRequestDto.id,
        readonly: false,
        tables: {
          connect: {
            versionId: this.tableRequestDto.versionId,
          },
        },
        data: data,
      },
      select: {
        versionId: true,
      },
    });

    await this.addRowToChangelog();
  }

  private async addRowToChangelog() {
    const countRows = await this.sessionChangelog.getCountRows('rowInserts');

    if (!countRows) {
      await this.sessionChangelog.addTableForRow('rowInserts');
    }

    await this.sessionChangelog.addRow('rowInserts');

    return this.transaction.changelog.update({
      where: { id: this.revisionRequestDto.changelogId },
      data: {
        rowInsertsCount: {
          increment: 1,
        },
        hasChanges: true,
      },
    });
  }
}
