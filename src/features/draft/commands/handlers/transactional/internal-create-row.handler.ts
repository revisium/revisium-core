import { BadRequestException } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import {
  InternalCreateRowCommand,
  InternalCreateRowCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/internal-create-row.command';
import { HashService } from 'src/infrastructure/database/hash.service';
import { IdService } from 'src/infrastructure/database/id.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';
import { DraftRowRequestDto } from 'src/features/draft/draft-request-dto/row-request.dto';
import { DraftTableRequestDto } from 'src/features/draft/draft-request-dto/table-request.dto';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';

@CommandHandler(InternalCreateRowCommand)
export class InternalCreateRowHandler extends DraftHandler<
  InternalCreateRowCommand,
  InternalCreateRowCommandReturnType
> {
  constructor(
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly revisionRequestDto: DraftRevisionRequestDto,
    protected readonly tableRequestDto: DraftTableRequestDto,
    protected readonly rowRequestDto: DraftRowRequestDto,
    protected readonly draftTransactionalCommands: DraftTransactionalCommands,
    protected readonly idService: IdService,
    protected readonly hashService: HashService,
  ) {
    super(transactionService, draftContext);
  }

  protected async handler({
    data: input,
  }: InternalCreateRowCommand): Promise<InternalCreateRowCommandReturnType> {
    const { revisionId, tableId, rowId } = input;

    this.validateRowId(rowId);
    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);
    await this.draftTransactionalCommands.getOrCreateDraftTable(tableId);

    await this.checkRowExistence(rowId);
    await this.createDraftRow(input);

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

  private async createDraftRow(input: InternalCreateRowCommand['data']) {
    this.rowRequestDto.versionId = this.idService.generate();
    this.rowRequestDto.id = input.rowId;
    this.rowRequestDto.createdId = this.idService.generate();

    await this.transaction.row.create({
      data: {
        versionId: this.rowRequestDto.versionId,
        createdId: this.rowRequestDto.createdId,
        id: this.rowRequestDto.id,
        readonly: false,
        tables: {
          connect: {
            versionId: this.tableRequestDto.versionId,
          },
        },
        data: input.data,
        meta: input.meta,
        hash: await this.hashService.hashObject(input.data),
        schemaHash: input.schemaHash,
        publishedAt: input.publishedAt,
      },
      select: {
        versionId: true,
      },
    });
  }
}
