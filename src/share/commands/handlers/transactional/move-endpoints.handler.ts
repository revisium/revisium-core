import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TransactionPrismaService } from 'src/database/transaction-prisma.service';
import { MoveEndpointsCommand } from 'src/share/commands/impl';

@CommandHandler(MoveEndpointsCommand)
export class MoveEndpointsHandler
  implements ICommandHandler<MoveEndpointsCommand>
{
  constructor(private transactionService: TransactionPrismaService) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  async execute({ data }: MoveEndpointsCommand): Promise<string[]> {
    const { fromRevisionId, toRevisionId } = data;

    const toRevisionEndpoints = await this.getEndpoints(toRevisionId);

    if (toRevisionEndpoints.length) {
      throw new Error(`toRevisionId=${toRevisionId} should have endpoints`);
    }

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
      },
    });
  }
}
