import { Injectable, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CleanRowsCommand } from 'src/infrastructure/clean/commands/impl/clean-rows.command';
import { CleanTablesCommand } from 'src/infrastructure/clean/commands/impl/clean-tables.command';

@Injectable()
export class CleanService {
  private readonly logger = new Logger(CleanService.name);

  constructor(private commandBus: CommandBus) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async cleanTablesAndRows() {
    const resultTables: { count: number } = await this.commandBus.execute(
      new CleanTablesCommand(),
    );
    if (resultTables.count) {
      this.logger.log(`deleted ${resultTables.count} empty [Table]s`);
    }

    const resultRow: { count: number } = await this.commandBus.execute(
      new CleanRowsCommand(),
    );
    if (resultRow.count) {
      this.logger.log(`deleted ${resultRow.count} empty [Row]s`);
    }

    // TODO logic depends on resultTables.count, resultRow.count
    // maybe @Interval
    // + waiting for https://github.com/prisma/prisma/issues/6957
  }
}
