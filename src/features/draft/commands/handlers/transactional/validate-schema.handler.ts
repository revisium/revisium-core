import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ValidateSchemaCommand } from 'src/features/draft/commands/impl/transactional/validate-schema.command';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';
import { JsonSchemaValidatorService } from 'src/features/draft/json-schema-validator.service';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
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
    protected readonly jsonSchemaStore: JsonSchemaStoreService,
  ) {}

  async execute({ schema }: ValidateSchemaCommand) {
    const { result, errors } =
      this.jsonSchemaValidator.validateMetaSchema(schema);

    const store = this.tryToCreateJsonSchemaStore(schema as JsonSchema);
    await this.validateForeignKeys(getForeignKeysFromSchema(store));

    if (!result) {
      throw new BadRequestException('schema is not valid', {
        cause: errors,
      });
    }
  }

  private tryToCreateJsonSchemaStore(schema: JsonSchema) {
    return this.jsonSchemaStore.create(schema);
  }

  private async validateForeignKeys(tableForeignKeys: string[]) {
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
