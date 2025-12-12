import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  UpdateTableViewsCommand,
  UpdateTableViewsCommandData,
  UpdateTableViewsCommandReturnType,
} from 'src/features/views/commands/impl';
import {
  GetTableViewsQuery,
  GetTableViewsQueryData,
  GetTableViewsQueryReturnType,
} from 'src/features/views/queries/impl';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

@Injectable()
export class ViewsApiService {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
    private readonly transactionService: TransactionPrismaService,
  ) {}

  public getTableViews(
    data: GetTableViewsQueryData,
  ): Promise<GetTableViewsQueryReturnType> {
    return this.queryBus.execute<
      GetTableViewsQuery,
      GetTableViewsQueryReturnType
    >(new GetTableViewsQuery(data));
  }

  public updateTableViews(
    data: UpdateTableViewsCommandData,
  ): Promise<UpdateTableViewsCommandReturnType> {
    return this.transactionService.run(() =>
      this.commandBus.execute<
        UpdateTableViewsCommand,
        UpdateTableViewsCommandReturnType
      >(new UpdateTableViewsCommand(data)),
    );
  }
}
