import { Injectable, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CleanOAuthExpiredAccessTokensCommand } from 'src/infrastructure/clean/commands/impl/clean-oauth-expired-access-tokens.command';
import { CleanOAuthExpiredCodesCommand } from 'src/infrastructure/clean/commands/impl/clean-oauth-expired-codes.command';
import { CleanOAuthExpiredRefreshTokensCommand } from 'src/infrastructure/clean/commands/impl/clean-oauth-expired-refresh-tokens.command';
import { CleanRowsCommand } from 'src/infrastructure/clean/commands/impl/clean-rows.command';
import { CleanTablesCommand } from 'src/infrastructure/clean/commands/impl/clean-tables.command';

@Injectable()
export class CleanService {
  private readonly logger = new Logger(CleanService.name);

  constructor(private readonly commandBus: CommandBus) {}

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
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanOAuthTokens() {
    const resultCodes: { count: number } = await this.commandBus.execute(
      new CleanOAuthExpiredCodesCommand(),
    );
    if (resultCodes.count) {
      this.logger.log(
        `deleted ${resultCodes.count} expired [OAuthAuthorizationCode]s`,
      );
    }

    const resultAccessTokens: { count: number } = await this.commandBus.execute(
      new CleanOAuthExpiredAccessTokensCommand(),
    );
    if (resultAccessTokens.count) {
      this.logger.log(
        `deleted ${resultAccessTokens.count} expired [OAuthAccessToken]s`,
      );
    }

    const resultRefreshTokens: { count: number } =
      await this.commandBus.execute(
        new CleanOAuthExpiredRefreshTokensCommand(),
      );
    if (resultRefreshTokens.count) {
      this.logger.log(
        `deleted ${resultRefreshTokens.count} expired [OAuthRefreshToken]s`,
      );
    }
  }
}
