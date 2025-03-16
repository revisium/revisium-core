import { BadRequestException } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import { IdService } from 'src/infrastructure/database/id.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { CreateRevisionHandlerReturnType } from 'src/features/draft/commands/types/create-revision.handler.types';
import { CreateRevisionCommand } from 'src/features/draft/commands/impl/create-revision.command';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DraftHandler } from 'src/features/draft/draft.handler';
import { ShareTransactionalCommands } from 'src/features/share/share.transactional.commands';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';

@CommandHandler(CreateRevisionCommand)
export class CreateRevisionHandler extends DraftHandler<
  CreateRevisionCommand,
  CreateRevisionHandlerReturnType
> {
  constructor(
    protected idService: IdService,
    protected draftContext: DraftContextService,
    protected transactionService: TransactionPrismaService,
    protected shareTransactionalCommands: ShareTransactionalCommands,
    protected shareTransactionalQueries: ShareTransactionalQueries,
  ) {
    super(transactionService, draftContext);
  }

  protected async handler({
    data,
  }: CreateRevisionCommand): Promise<CreateRevisionHandlerReturnType> {
    const { organizationId, projectName, branchName } = data;

    const { id: projectId } =
      await this.shareTransactionalQueries.findProjectInOrganizationOrThrow(
        organizationId,
        projectName,
      );

    const branchId = await this.getNotTouchedBranchId(projectId, branchName);

    const previousHeadRevision =
      await this.shareTransactionalQueries.findHeadRevisionInBranchOrThrow(
        branchId,
      );
    const previousDraftRevision =
      await this.shareTransactionalQueries.findDraftRevisionInBranchOrThrow(
        branchId,
      );

    const { hasChanges } = await this.getChangelog(previousDraftRevision.id);

    if (!hasChanges) {
      throw new BadRequestException('There are no changes');
    }

    const tableIds = await this.getTableIdsByRevisionId(
      previousDraftRevision.id,
    );

    await this.updatePreviousHeadRevision(previousHeadRevision.id);
    await this.updatePreviousDraftRevision(
      previousDraftRevision.id,
      data.comment,
    );
    const nextDraftRevision = await this.createNextDraftRevision(
      branchId,
      previousDraftRevision.id,
      tableIds,
    );
    await this.lockTablesAndRowsInRevision(tableIds);

    const draftEndpoints = await this.shareTransactionalCommands.moveEndpoints({
      fromRevisionId: previousDraftRevision.id,
      toRevisionId: nextDraftRevision.id,
    });
    const headEndpoints = await this.shareTransactionalCommands.moveEndpoints({
      fromRevisionId: previousHeadRevision.id,
      toRevisionId: previousDraftRevision.id,
    });

    return {
      nextDraftRevisionId: nextDraftRevision.id,
      draftEndpoints,
      headEndpoints,
    };
  }

  private getChangelog(revisionId: string) {
    return this.transaction.revision
      .findUniqueOrThrow({
        where: { id: revisionId },
      })
      .changelog({ select: { id: true, hasChanges: true } });
  }

  private async getNotTouchedBranchId(projectId: string, branchName: string) {
    const branch =
      await this.shareTransactionalQueries.findBranchInProjectOrThrow(
        projectId,
        branchName,
      );

    return branch.id;
  }

  private getTableIdsByRevisionId(revisionId: string) {
    return this.transaction.revision
      .findUniqueOrThrow({ where: { id: revisionId } })
      .tables({ select: { versionId: true } });
  }

  private async lockTablesAndRowsInRevision(ids: { versionId: string }[]) {
    await this.transaction.table.updateMany({
      where: { OR: ids, readonly: false },
      data: {
        readonly: true,
      },
    });

    await this.transaction.row.updateMany({
      where: { readonly: false, tables: { some: { OR: ids } } },
      data: {
        readonly: true,
      },
    });
  }

  private updatePreviousHeadRevision(revisionId: string) {
    return this.transaction.revision.update({
      where: { id: revisionId },
      data: { isHead: false, isDraft: false, hasChanges: false },
    });
  }

  private updatePreviousDraftRevision(revisionId: string, comment?: string) {
    return this.transaction.revision.update({
      where: { id: revisionId },
      data: { isHead: true, isDraft: false, hasChanges: false, comment },
    });
  }

  private createNextDraftRevision(
    branchId: string,
    parentRevisionId: string,
    tableIds: { versionId: string }[],
  ) {
    return this.transaction.revision.create({
      data: {
        id: this.idService.generate(),
        isDraft: true,
        parent: {
          connect: {
            id: parentRevisionId,
          },
        },
        tables: {
          connect: tableIds,
        },
        branch: {
          connect: {
            id: branchId,
          },
        },
        hasChanges: false,
        changelog: {
          create: {
            id: this.idService.generate(),
          },
        },
      },
      select: {
        id: true,
      },
    });
  }
}
