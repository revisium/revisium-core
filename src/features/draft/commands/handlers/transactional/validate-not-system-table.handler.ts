import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ValidateNotSystemTableCommand } from 'src/features/draft/commands/impl/transactional/validate-not-system-table.command';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';

@CommandHandler(ValidateNotSystemTableCommand)
export class ValidateNotSystemTableHandler
  implements ICommandHandler<ValidateNotSystemTableCommand>
{
  constructor(
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
    private readonly revisionRequestDto: DraftRevisionRequestDto,
  ) {}

  async execute({ tableId }: ValidateNotSystemTableCommand) {
    const table =
      await this.shareTransactionalQueries.findTableInRevisionOrThrow(
        this.revisionRequestDto.id,
        tableId,
      );

    if (table.system) {
      throw new BadRequestException('Table is a system table');
    }
  }
}
