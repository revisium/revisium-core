import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';
import { IdService } from 'src/database/id.service';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { CreateProjectCommand } from 'src/project/commands/impl';
import { SystemTables } from 'src/share/system-tables.consts';

export type CreateProjectHandlerContext = {
  organizationId: string;
  projectId: string;
  projectName: string;
  branchId: string;
  branchName?: string;
  fromRevisionId?: string;
  tableIds?: { versionId: string }[];
  headRevisionId: string;
  headChangelogId: string;
  draftRevisionId: string;
  draftChangelogId: string;
  schemaTableId: string;
};

@CommandHandler(CreateProjectCommand)
export class CreateProjectHandler
  implements ICommandHandler<CreateProjectCommand>
{
  constructor(
    private transactionService: TransactionPrismaService,
    private idService: IdService,
    private asyncLocalStorage: AsyncLocalStorage<CreateProjectHandlerContext>,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  private get context(): CreateProjectHandlerContext {
    const context = this.asyncLocalStorage.getStore();

    if (!context) {
      throw new Error(
        'CreateProjectHandlerContext not found. It appears that an attempt was made to access a context outside of AsyncLocalStorage.run.',
      );
    }

    return context;
  }

  execute(command: CreateProjectCommand): Promise<string> {
    return this.transactionService.run(() => this.transactionHandler(command), {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    });
  }

  private async transactionHandler(
    command: CreateProjectCommand,
  ): Promise<string> {
    const context: CreateProjectHandlerContext = {
      ...command.data,
      projectId: this.idService.generate(8),
      branchId: this.idService.generate(),
      headRevisionId: this.idService.generate(),
      headChangelogId: this.idService.generate(),
      draftRevisionId: this.idService.generate(),
      draftChangelogId: this.idService.generate(),
      schemaTableId: this.idService.generate(),
    };

    return this.asyncLocalStorage.run(context, async () => {
      await this.createProject();
      await this.resolveTableIds();
      await this.createHeadRevision();
      await this.createDraftRevision();

      return context.projectId;
    });
  }

  private async resolveTableIds() {
    const fromRevisionId = this.context.fromRevisionId;

    if (fromRevisionId) {
      const result = await this.transaction.revision.findUniqueOrThrow({
        where: { id: fromRevisionId, isDraft: false },
        select: {
          tables: { select: { versionId: true } },
        },
      });

      this.context.tableIds = result.tables;
    }
  }

  private async createProject() {
    const args = this.getCreateProjectArgs();
    await this.transaction.project.create(args);
  }

  private createHeadRevision() {
    const args = this.getCreateHeadRevisionArgs();
    return this.transaction.revision.create(args);
  }

  private createDraftRevision() {
    const args = this.getCreateDraftRevisionArgs();
    return this.transaction.revision.create(args);
  }

  private getCreateProjectArgs(): Prisma.ProjectCreateArgs {
    return {
      data: {
        id: this.context.projectId,
        name: this.context.projectName,
        organization: {
          connect: {
            id: this.context.organizationId,
          },
        },
        branches: {
          create: {
            id: this.context.branchId,
            name: this.context.branchName || DEFAULT_BRANCH_NAME,
            isRoot: true,
          },
        },
      },
    };
  }

  private getCreateHeadRevisionArgs(): Prisma.RevisionCreateArgs {
    return {
      data: {
        id: this.context.headRevisionId,
        isHead: true,
        isStart: true,
        branch: {
          connect: {
            id: this.context.branchId,
          },
        },
        changelog: {
          create: {
            id: this.context.headChangelogId,
          },
        },
        tables: {
          ...(this.context.tableIds
            ? { connect: this.context.tableIds }
            : {
                create: {
                  versionId: this.context.schemaTableId,
                  id: SystemTables.Schema,
                  readonly: true,
                  system: true,
                },
              }),
        },
      },
    };
  }

  private getCreateDraftRevisionArgs() {
    return {
      data: {
        id: this.context.draftRevisionId,
        isDraft: true,
        parent: {
          connect: {
            id: this.context.headRevisionId,
          },
        },
        branch: {
          connect: {
            id: this.context.branchId,
          },
        },
        changelog: {
          create: {
            id: this.context.draftChangelogId,
          },
        },
        tables: {
          ...(this.context.tableIds
            ? { connect: this.context.tableIds }
            : {
                connect: {
                  versionId: this.context.schemaTableId,
                },
              }),
        },
      },
    };
  }
}

const DEFAULT_BRANCH_NAME = 'master';