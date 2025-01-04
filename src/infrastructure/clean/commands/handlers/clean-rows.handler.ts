import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CleanRowsCommand } from 'src/infrastructure/clean/commands/impl/clean-rows.command';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@CommandHandler(CleanRowsCommand)
export class CleanRowsHandler implements ICommandHandler<CleanRowsCommand> {
  constructor(private readonly prisma: PrismaService) {}

  execute() {
    return this.prisma.row.deleteMany({
      where: {
        tables: {
          none: {},
        },
      },
    });
  }
}
