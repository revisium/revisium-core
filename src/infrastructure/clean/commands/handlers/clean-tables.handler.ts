import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CleanTablesCommand } from 'src/infrastructure/clean/commands/impl/clean-tables.command';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@CommandHandler(CleanTablesCommand)
export class CleanTablesHandler implements ICommandHandler<CleanTablesCommand> {
  constructor(private readonly prisma: PrismaService) {}

  execute() {
    return this.prisma.table.deleteMany({
      where: {
        revisions: {
          none: {},
        },
      },
    });
  }
}
