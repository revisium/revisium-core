import { InternalServerErrorException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';
import { validateUrlLikeId } from 'src/features/share/utils/validateUrlLikeId/validateUrlLikeId';
import { IdService } from 'src/infrastructure/database/id.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  CreateProjectCommand,
  CreateProjectCommandReturnType,
} from 'src/features/project/commands/impl';
import { SystemTables } from 'src/features/share/system-tables.consts';

export type CreateProjectHandlerContext = {
  organizationId: string;
  projectId: string;
  projectName: string;
  branchId: string;
  branchName: string;
  fromRevisionId?: string;
  tableIds?: { versionId: string }[];
  headRevisionId: string;
  draftRevisionId: string;
  schemaTableId: string;
  schemaTableCreatedId: string;
};

@CommandHandler(CreateProjectCommand)
export class CreateProjectHandler
  implements
    ICommandHandler<CreateProjectCommand, CreateProjectCommandReturnType>
{
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly idService: IdService,
    private readonly asyncLocalStorage: AsyncLocalStorage<CreateProjectHandlerContext>,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  private get context(): CreateProjectHandlerContext {
    const context = this.asyncLocalStorage.getStore();

    if (!context) {
      throw new InternalServerErrorException(
        'CreateProjectHandlerContext not found. It appears that an attempt was made to access a context outside of AsyncLocalStorage.run.',
      );
    }

    return context;
  }

  execute(
    command: CreateProjectCommand,
  ): Promise<CreateProjectCommandReturnType> {
    validateUrlLikeId(command.data.projectName);

    if (command.data.branchName) {
      validateUrlLikeId(command.data.branchName);
    }

    return this.transactionService.run(() => this.transactionHandler(command), {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    });
  }

  private async transactionHandler(
    command: CreateProjectCommand,
  ): Promise<string> {
    const context: CreateProjectHandlerContext = {
      ...command.data,
      branchName: command.data.branchName
        ? command.data.branchName
        : DEFAULT_BRANCH_NAME,
      projectId: this.idService.generate(8),
      branchId: this.idService.generate(),
      headRevisionId: this.idService.generate(),
      draftRevisionId: this.idService.generate(),
      schemaTableId: this.idService.generate(),
      schemaTableCreatedId: this.idService.generate(),
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
            name: this.context.branchName,
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
        hasChanges: false,
        tables: {
          ...(this.context.tableIds
            ? { connect: this.context.tableIds }
            : {
                create: {
                  createdId: this.context.schemaTableCreatedId,
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
        hasChanges: false,
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

export const DEFAULT_BRANCH_NAME = 'master';
