import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetEndpointsByRevisionIdQuery } from 'src/features/revision/queries/impl/get-endpoints-by-revision-id.query';
import { GetEndpointsByRevisionId } from 'src/features/revision/queries/types/get-endpoints-by-revision-id';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@QueryHandler(GetEndpointsByRevisionIdQuery)
export class GetEndpointsByRevisionIdHandler implements IQueryHandler<GetEndpointsByRevisionIdQuery> {
  constructor(private readonly prismaService: TransactionPrismaService) {}

  private get prisma() {
    return this.prismaService.getTransactionOrPrisma();
  }

  execute({
    revisionId,
  }: GetEndpointsByRevisionIdQuery): Promise<GetEndpointsByRevisionId> {
    return this.prisma.revision
      .findUniqueOrThrow({ where: { id: revisionId } })
      .endpoints({ where: { isDeleted: false } });
  }
}
