import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { ResolveDraftRevisionCommand } from 'src/draft/commands/impl/transactional/resolve-draft-revision.command';
import { DraftRevisionRequestDto } from 'src/draft/draft-request-dto/draft-revision-request.dto';

@CommandHandler(ResolveDraftRevisionCommand)
export class ResolveDraftRevisionHandler
  implements ICommandHandler<ResolveDraftRevisionCommand>
{
  constructor(
    private transactionService: TransactionPrismaService,
    private revisionRequestDto: DraftRevisionRequestDto,
  ) {}

  public get isAlreadyResolved() {
    return (
      this.revisionRequestDto.hasBranchId &&
      this.revisionRequestDto.hasId &&
      this.revisionRequestDto.hasChangelogId
    );
  }

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({ revisionId }: ResolveDraftRevisionCommand) {
    if (!this.isAlreadyResolved) {
      await this.resolve(revisionId);
    }
  }

  public async resolve(revisionId: string) {
    const revision = await this.transaction.revision.findUnique({
      where: { id: revisionId },
      select: {
        id: true,
        isDraft: true,
        changelogId: true,
        branchId: true,
      },
    });

    if (!revision) {
      throw new Error('Revision not found');
    }

    if (!revision.isDraft) {
      throw new Error('The revision is not a draft');
    }

    this.revisionRequestDto.branchId = revision.branchId;
    this.revisionRequestDto.id = revision.id;
    this.revisionRequestDto.changelogId = revision.changelogId;
  }
}