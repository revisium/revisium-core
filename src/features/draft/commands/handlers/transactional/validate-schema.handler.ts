import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ValidateSchemaCommand } from 'src/features/draft/commands/impl/transactional/validate-schema.command';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';
import { JsonSchemaValidatorService } from 'src/features/draft/json-schema-validator.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { createJsonSchemaStore } from 'src/features/share/utils/schema/lib/createJsonSchemaStore';
import { getForeignKeysFromSchema } from 'src/features/share/utils/schema/lib/getForeignKeysFromSchema';
import { JsonSchema } from 'src/features/share/utils/schema/types/schema.types';

@CommandHandler(ValidateSchemaCommand)
export class ValidateSchemaHandler
  implements ICommandHandler<ValidateSchemaCommand>
{
  constructor(
    protected readonly revisionRequestDto: DraftRevisionRequestDto,
    protected readonly shareTransactionalQueries: ShareTransactionalQueries,
    protected readonly jsonSchemaValidator: JsonSchemaValidatorService,
  ) {}

  async execute({ schema }: ValidateSchemaCommand) {
    const { result, errors } =
      this.jsonSchemaValidator.validateMetaSchema(schema);

    const store = this.validateSchema(schema as JsonSchema);
    await this.validateForeignKey(getForeignKeysFromSchema(store));

    if (!result) {
      throw new BadRequestException('schema is not valid', {
        cause: errors,
      });
    }
  }

  private validateSchema(schema: JsonSchema) {
    return createJsonSchemaStore(schema);
  }

  private async validateForeignKey(tableForeignKeys: string[]) {
    return Promise.all(
      tableForeignKeys.map((tableForeignKey) =>
        this.shareTransactionalQueries.findTableInRevisionOrThrow(
          this.revisionRequestDto.id,
          tableForeignKey,
        ),
      ),
    );
  }
}
