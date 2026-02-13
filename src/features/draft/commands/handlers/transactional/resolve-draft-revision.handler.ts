import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CacheService } from 'src/infrastructure/cache';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { ResolveDraftRevisionCommand } from 'src/features/draft/commands/impl/transactional/resolve-draft-revision.command';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';

@CommandHandler(ResolveDraftRevisionCommand)
export class ResolveDraftRevisionHandler implements ICommandHandler<ResolveDraftRevisionCommand> {
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly revisionRequestDto: DraftRevisionRequestDto,
    private readonly cache: CacheService,
  ) {}

  public get isAlreadyResolved() {
    return (
      this.revisionRequestDto.hasOrganizationId &&
      this.revisionRequestDto.hasProjectId &&
      this.revisionRequestDto.hasBranchId &&
      this.revisionRequestDto.hasId &&
      this.revisionRequestDto.hasParentId
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
    const revision = await this.cachedGetRevision(revisionId);

    if (!revision) {
      throw new BadRequestException('Revision not found');
    }

    if (!revision.isDraft) {
      throw new BadRequestException('The revision is not a draft');
    }

    this.revisionRequestDto.organizationId =
      revision.branch.project.organizationId;
    this.revisionRequestDto.projectId = revision.branch.project.id;
    this.revisionRequestDto.branchId = revision.branchId;
    this.revisionRequestDto.id = revision.id;

    if (!revision.parentId) {
      throw new InternalServerErrorException('Invalid  parentId');
    }
    this.revisionRequestDto.parentId = revision.parentId;
  }

  private getRevision(revisionId: string) {
    return this.transaction.revision.findUnique({
      where: { id: revisionId },
      select: {
        id: true,
        isDraft: true,
        branchId: true,
        parentId: true,
        branch: {
          select: {
            project: {
              select: {
                id: true,
                organizationId: true,
              },
            },
          },
        },
      },
    });
  }

  private cachedGetRevision(revisionId: string) {
    return this.cache.getOrSet({
      key: `draft:get-revision-with-relative:${revisionId}`,
      tags: [`revision-${revisionId}`],
      ttl: '1d',
      factory: () => this.getRevision(revisionId),
    });
  }
}
