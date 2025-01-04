import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { CreateBranchByRevisionIdCommand } from 'src/features/branch/commands/impl';
import { IdService } from 'src/infrastructure/database/id.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@CommandHandler(CreateBranchByRevisionIdCommand)
export class CreateBranchByRevisionIdHandler
  implements ICommandHandler<CreateBranchByRevisionIdCommand>
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly idService: IdService,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({ data }: CreateBranchByRevisionIdCommand): Promise<string> {
    return this.transactionService.run(() => this.transactionHandler(data), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private async transactionHandler(
    data: CreateBranchByRevisionIdCommand['data'],
  ) {
    const { revisionId, branchName } = data;

    const { branch, tables, ...revision } =
      await this.getRevisionWithBranchAndTables(revisionId);

    if (revision.isDraft) {
      throw new BadRequestException('This revision is a draft revision');
    }

    const tableIds = tables.map(({ versionId }) => versionId);

    const { id: branchId } = await this.createBranch({
      projectId: branch.projectId,
      branchName,
    });
    const { id: headRevisionId } = await this.createHeadRevision({
      parentRevisionId: revisionId,
      branchId,
      tableIds,
    });
    await this.createDraftRevision({
      headRevisionId,
      branchId,
      tableIds,
    });

    return branchId;
  }

  private createBranch({
    projectId,
    branchName,
  }: {
    branchName: string;
    projectId: string;
  }) {
    return this.transaction.branch.create({
      data: {
        id: this.idService.generate(),
        name: branchName,
        projectId,
      },
      select: { id: true },
    });
  }

  private createHeadRevision({
    parentRevisionId,
    branchId,
    tableIds,
  }: {
    parentRevisionId: string;
    branchId: string;
    tableIds: string[];
  }) {
    return this.transaction.revision.create({
      data: {
        id: this.idService.generate(),
        isHead: true,
        isStart: true,
        branch: {
          connect: {
            id: branchId,
          },
        },
        parent: {
          connect: {
            id: parentRevisionId,
          },
        },
        tables: {
          connect: tableIds.map((versionId) => ({ versionId })),
        },
        changelog: {
          create: {
            id: this.idService.generate(),
          },
        },
      },
    });
  }

  createDraftRevision({
    headRevisionId,
    branchId,
    tableIds,
  }: {
    headRevisionId: string;
    branchId: string;
    tableIds: string[];
  }) {
    return this.transaction.revision.create({
      data: {
        id: this.idService.generate(),
        isDraft: true,
        branch: {
          connect: {
            id: branchId,
          },
        },
        parent: {
          connect: {
            id: headRevisionId,
          },
        },
        tables: {
          connect: tableIds.map((versionId) => ({ versionId })),
        },
        changelog: {
          create: {
            id: this.idService.generate(),
          },
        },
      },
    });
  }

  private getRevisionWithBranchAndTables(revisionId: string) {
    return this.transaction.revision.findUniqueOrThrow({
      where: { id: revisionId },
      select: {
        isDraft: true,
        branch: { select: { projectId: true } },
        tables: { select: { versionId: true } },
      },
    });
  }
}
