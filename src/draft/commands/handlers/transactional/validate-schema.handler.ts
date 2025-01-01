import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ValidateSchemaCommand } from 'src/draft/commands/impl/transactional/validate-schema.command';
import { DraftRevisionRequestDto } from 'src/draft/draft-request-dto/draft-revision-request.dto';
import { JsonSchemaValidatorService } from 'src/draft/json-schema-validator.service';
import { ShareTransactionalQueries } from 'src/share/share.transactional.queries';
import { createJsonSchemaStore } from 'src/share/utils/schema/lib/createJsonSchemaStore';
import { getReferencesFromSchema } from 'src/share/utils/schema/lib/getReferencesFromSchema';
import { JsonSchema } from 'src/share/utils/schema/types/schema.types';

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
    await this.validateReferences(getReferencesFromSchema(store));

    if (!result) {
      throw new BadRequestException('schema is not valid', {
        cause: errors,
      });
    }
  }

  private validateSchema(schema: JsonSchema) {
    return createJsonSchemaStore(schema);
  }

  private async validateReferences(tableReferences: string[]) {
    return Promise.all(
      tableReferences.map((tableReference) =>
        this.shareTransactionalQueries.findTableInRevisionOrThrow(
          this.revisionRequestDto.id,
          tableReference,
        ),
      ),
    );
  }
}
