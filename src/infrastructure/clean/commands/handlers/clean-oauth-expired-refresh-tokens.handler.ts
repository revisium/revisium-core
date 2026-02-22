import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CleanOAuthExpiredRefreshTokensCommand } from 'src/infrastructure/clean/commands/impl/clean-oauth-expired-refresh-tokens.command';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@CommandHandler(CleanOAuthExpiredRefreshTokensCommand)
export class CleanOAuthExpiredRefreshTokensHandler implements ICommandHandler<CleanOAuthExpiredRefreshTokensCommand> {
  constructor(private readonly prisma: PrismaService) {}

  execute() {
    return this.prisma.oAuthRefreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }
}
