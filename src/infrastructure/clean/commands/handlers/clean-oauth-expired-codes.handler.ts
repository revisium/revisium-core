import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CleanOAuthExpiredCodesCommand } from 'src/infrastructure/clean/commands/impl/clean-oauth-expired-codes.command';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@CommandHandler(CleanOAuthExpiredCodesCommand)
export class CleanOAuthExpiredCodesHandler implements ICommandHandler<CleanOAuthExpiredCodesCommand> {
  constructor(private readonly prisma: PrismaService) {}

  execute() {
    return this.prisma.oAuthAuthorizationCode.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }
}
