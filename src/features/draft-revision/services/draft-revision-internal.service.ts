import { BadRequestException, Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  DraftRevisionGetOrCreateDraftRowCommand,
  DraftRevisionGetOrCreateDraftTableCommand,
} from 'src/features/draft-revision/commands/impl';
import {
  DraftRevisionGetOrCreateDraftRowCommandData,
  DraftRevisionGetOrCreateDraftRowCommandReturnType,
  DraftRevisionGetOrCreateDraftTableCommandData,
  DraftRevisionGetOrCreateDraftTableCommandReturnType,
} from 'src/features/draft-revision/commands/impl';
import { DiffService } from 'src/features/share/diff.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@Injectable()
export class DraftRevisionInternalService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly transactionService: TransactionPrismaService,
    private readonly diffService: DiffService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  public getOrCreateDraftTable(
    data: DraftRevisionGetOrCreateDraftTableCommandData,
  ): Promise<DraftRevisionGetOrCreateDraftTableCommandReturnType> {
    return this.commandBus.execute(
      new DraftRevisionGetOrCreateDraftTableCommand(data),
    );
  }

  public getOrCreateDraftRow(
    data: DraftRevisionGetOrCreateDraftRowCommandData,
  ): Promise<DraftRevisionGetOrCreateDraftRowCommandReturnType> {
    return this.commandBus.execute(
      new DraftRevisionGetOrCreateDraftRowCommand(data),
    );
  }

  public async markRevisionAsChanged(revisionId: string): Promise<void> {
    await this.transaction.revision.updateMany({
      where: { id: revisionId, hasChanges: false },
      data: { hasChanges: true },
    });
  }

  public async recomputeHasChanges(
    revisionId: string,
    parentRevisionId: string,
  ): Promise<void> {
    const hasChanges = await this.diffService.hasTableDiffs({
      fromRevisionId: parentRevisionId,
      toRevisionId: revisionId,
    });

    await this.transaction.revision.update({
      where: { id: revisionId },
      data: { hasChanges },
    });
  }

  public async findRevisionOrThrow(
    revisionId: string,
  ): Promise<{ id: string; isDraft: boolean; parentId: string | null }> {
    const revision = await this.transaction.revision.findUnique({
      where: { id: revisionId },
      select: { id: true, isDraft: true, parentId: true },
    });

    if (!revision) {
      throw new BadRequestException('Revision not found');
    }

    return revision;
  }

  public async findHeadRevisionOrThrow(
    branchId: string,
  ): Promise<{ id: string }> {
    const revision = await this.transaction.revision.findFirst({
      where: { branchId, isHead: true },
      select: { id: true },
    });

    if (!revision) {
      throw new BadRequestException('Head revision not found');
    }

    return revision;
  }

  public async findDraftRevisionOrThrow(
    branchId: string,
  ): Promise<{ id: string; hasChanges: boolean }> {
    const revision = await this.transaction.revision.findFirst({
      where: { branchId, isDraft: true },
      select: { id: true, hasChanges: true },
    });

    if (!revision) {
      throw new BadRequestException('Draft revision not found');
    }

    return revision;
  }

  public async getRevisionTableVersionIds(
    revisionId: string,
  ): Promise<{ versionId: string }[]> {
    return this.transaction.revision
      .findUniqueOrThrow({ where: { id: revisionId } })
      .tables({ select: { versionId: true } });
  }

  public async findParentRevisionIdOrThrow(
    revisionId: string,
  ): Promise<string> {
    const revision = await this.transaction.revision.findUniqueOrThrow({
      where: { id: revisionId },
      select: { parentId: true },
    });

    if (!revision.parentId) {
      throw new BadRequestException('Parent revision not found');
    }

    return revision.parentId;
  }
}
