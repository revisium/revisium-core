import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CleanTablesCommand } from 'src/clean/commands/impl/clean-tables.command';
import { PrismaService } from 'src/database/prisma.service';

@CommandHandler(CleanTablesCommand)
export class CleanTablesHandler implements ICommandHandler<CleanTablesCommand> {
  constructor(private prisma: PrismaService) {}

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
