import { BadRequestException } from '@nestjs/common';
import { CommandBus, CommandHandler } from '@nestjs/cqrs';
import {
  RenameTableCommand,
  RenameTableCommandReturnType,
} from 'src/features/draft/commands/impl/rename-table.command';
import {
  RenameSchemaCommand,
  RenameSchemaCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/rename-schema.command';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftTableRequestDto } from 'src/features/draft/draft-request-dto/table-request.dto';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { validateUrlLikeId } from 'src/features/share/utils/validateUrlLikeId/validateUrlLikeId';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(RenameTableCommand)
export class RenameTableHandler extends DraftHandler<
  RenameTableCommand,
  RenameTableCommandReturnType
> {
  constructor(
    protected readonly transactionService: TransactionPrismaService,
    protected readonly draftContext: DraftContextService,
    protected readonly tableRequestDto: DraftTableRequestDto,
    protected readonly commandBus: CommandBus,
    protected readonly shareTransactionalQueries: ShareTransactionalQueries,
    protected readonly draftTransactionalCommands: DraftTransactionalCommands,
  ) {
    super(transactionService, draftContext);
  }

  protected async handler({
    data,
  }: RenameTableCommand): Promise<RenameTableCommandReturnType> {
    const { revisionId, tableId, nextTableId } = data;

    validateUrlLikeId(nextTableId);
    await this.checkTableExistence(revisionId, nextTableId);

    await this.draftTransactionalCommands.resolveDraftRevision(revisionId);

    const table =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        revisionId,
        tableId,
      );

    if (table.system) {
      throw new BadRequestException('Table is a system table');
    }

    await this.draftTransactionalCommands.getOrCreateDraftTable(tableId);
    await this.renameSchema(data);
    await this.renameTable(data.nextTableId);
    await this.updateRevision(data.revisionId);

    return {
      tableVersionId: this.tableRequestDto.versionId,
      previousTableVersionId: this.tableRequestDto.previousVersionId,
    };
  }

  private async updateRevision(revisionId: string) {
    return this.transaction.revision.updateMany({
      where: { id: revisionId, hasChanges: false },
      data: {
        hasChanges: true,
      },
    });
  }

  private async checkTableExistence(revisionId: string, nextTableId: string) {
    const existingTable = await this.transaction.table.findFirst({
      where: { id: nextTableId, revisions: { some: { id: revisionId } } },
      select: { versionId: true },
    });

    if (existingTable) {
      throw new BadRequestException(
        'A table with this name already exists in the revision',
      );
    }
  }

  private renameSchema(data: RenameTableCommand['data']) {
    return this.commandBus.execute<
      RenameSchemaCommand,
      RenameSchemaCommandReturnType
    >(new RenameSchemaCommand(data));
  }

  private renameTable(nextTableId: string) {
    return this.transaction.table.update({
      where: {
        versionId: this.tableRequestDto.versionId,
      },
      data: {
        id: nextTableId,
      },
    });
  }
}
