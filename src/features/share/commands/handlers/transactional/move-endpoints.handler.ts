import { InternalServerErrorException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { MoveEndpointsCommand } from 'src/features/share/commands/impl';

@CommandHandler(MoveEndpointsCommand)
export class MoveEndpointsHandler implements ICommandHandler<MoveEndpointsCommand> {
  constructor(private readonly transactionService: TransactionPrismaService) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({ data }: MoveEndpointsCommand): Promise<string[]> {
    const { fromRevisionId, toRevisionId } = data;

    const toRevisionEndpoints = await this.getEndpoints(toRevisionId);

    if (toRevisionEndpoints.length) {
      throw new InternalServerErrorException(
        `toRevisionId=${toRevisionId} should not have endpoints`,
      );
    }

    await this.removeDeletedEndpoints(toRevisionId);

    const fromRevisionEndpoints = await this.getEndpoints(fromRevisionId);

    for (const endpoint of fromRevisionEndpoints) {
      await this.updateEndpoint(endpoint.id, toRevisionId);
    }

    return fromRevisionEndpoints.map(({ id }) => id);
  }

  private getEndpoints(revisionId: string) {
    return this.transaction.revision
      .findUniqueOrThrow({
        where: { id: revisionId },
      })
      .endpoints({ where: { isDeleted: false }, select: { id: true } });
  }

  private updateEndpoint(endpointId: string, revisionId: string) {
    return this.transaction.endpoint.update({
      where: { id: endpointId },
      data: {
        revisionId,
        createdAt: new Date(),
      },
    });
  }

  private removeDeletedEndpoints(revisionId: string) {
    return this.transaction.endpoint.deleteMany({
      where: { revisionId, isDeleted: true },
    });
  }
}
