import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CleanOAuthExpiredAccessTokensCommand } from 'src/infrastructure/clean/commands/impl/clean-oauth-expired-access-tokens.command';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@CommandHandler(CleanOAuthExpiredAccessTokensCommand)
export class CleanOAuthExpiredAccessTokensHandler implements ICommandHandler<CleanOAuthExpiredAccessTokensCommand> {
  constructor(private readonly prisma: PrismaService) {}

  execute() {
    return this.prisma.oAuthAccessToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }
}
