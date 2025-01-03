import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { PrismaService } from 'src/database/prisma.service';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import {
  createTestingModule,
  prepareBranch,
} from 'src/draft/commands/handlers/__tests__/utils';
import { CreateRevisionCommand } from 'src/draft/commands/impl/create-revision.command';
import { CreateRevisionHandlerReturnType } from 'src/draft/commands/types/create-revision.handler.types';
import { CreateRevisionHandler } from '../create-revision.handler';

describe('CreateRevisionHandler', () => {
  it('should throw an error if there are no changes', async () => {
    const { organizationId, projectName, branchName } =
      await prepareBranch(prismaService);

    const command = new CreateRevisionCommand({
      organizationId,
      projectName,
      branchName,
      comment: 'comment',
    });

    await expect(runTransaction(command)).rejects.toThrow(BadRequestException);
    await expect(runTransaction(command)).rejects.toThrow(
      'There are no changes',
    );
  });

  it('should create a new draft revision if there are changes', async () => {
    const {
      organizationId,
      projectName,
      branchName,
      headRevisionId,
      draftChangelogId,
      draftRevisionId,
    } = await prepareBranch(prismaService);
    await prismaService.changelog.update({
      where: {
        id: draftChangelogId,
      },
      data: {
        hasChanges: true,
      },
    });

    const command = new CreateRevisionCommand({
      organizationId,
      projectName,
      branchName,
      comment: 'comment',
    });
    const result = await runTransaction(command);

    // previous head
    const headRevision = await prismaService.revision.findUniqueOrThrow({
      where: { id: headRevisionId },
    });
    expect(headRevision.isHead).toBeFalsy();
    expect(headRevision.isDraft).toBeFalsy();

    // previous draft
    const draftRevision = await prismaService.revision.findUniqueOrThrow({
      where: { id: draftRevisionId },
    });
    expect(draftRevision.isDraft).toBeFalsy();
    expect(draftRevision.isHead).toBeTruthy();

    // next draft
    const nextDraftRevision = await prismaService.revision.findFirstOrThrow({
      where: { parentId: draftRevisionId },
    });
    expect(result.nextDraftRevisionId).toEqual(nextDraftRevision.id);
    expect(nextDraftRevision.isHead).toBeFalsy();
    expect(nextDraftRevision.isDraft).toBeTruthy();
    expect(nextDraftRevision.parentId).toEqual(draftRevisionId);
  });

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;

  function runTransaction(
    command: CreateRevisionCommand,
  ): Promise<CreateRevisionHandlerReturnType> {
    return transactionService.run(async () => commandBus.execute(command));
  }

  beforeEach(async () => {
    const result = await createTestingModule(CreateRevisionHandler);
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
  });
});
