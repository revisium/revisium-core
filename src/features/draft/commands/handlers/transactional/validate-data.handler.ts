import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  ValidateDataCommand,
  ValidateDataCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/validate-data.command';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';
import { JsonSchemaValidatorService } from 'src/features/draft/json-schema-validator.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { createJsonSchemaStore } from 'src/features/share/utils/schema/lib/createJsonSchemaStore';
import { createJsonValueStore } from 'src/features/share/utils/schema/lib/createJsonValueStore';
import {
  getReferencesFromValue,
  GetReferencesFromValueType,
} from 'src/features/share/utils/schema/lib/getReferencesFromValue';
import { JsonValue } from 'src/features/share/utils/schema/types/json.types';

@CommandHandler(ValidateDataCommand)
export class ValidateDataHandler
  implements
    ICommandHandler<ValidateDataCommand, ValidateDataCommandReturnType>
{
  constructor(
    protected readonly revisionRequestDto: DraftRevisionRequestDto,
    protected readonly shareTransactionalQueries: ShareTransactionalQueries,
    protected readonly jsonSchemaValidator: JsonSchemaValidatorService,
  ) {}

  async execute({ data }: ValidateDataCommand) {
    const schema = data.tableSchema || (await this.getSchema(data));
    const schemaHash = this.jsonSchemaValidator.getSchemaHash(schema);

    for (const itemData of data.rows) {
      const { result, errors } = await this.jsonSchemaValidator.validate(
        itemData.data,
        schema,
        schemaHash,
      );

      if (!result) {
        throw new BadRequestException('data is not valid', {
          cause: errors,
        });
      }
    }

    for (const itemData of data.rows) {
      // TODO merge getReferencesFromValue
      await this.validateReferences(
        getReferencesFromValue(
          createJsonValueStore(
            createJsonSchemaStore(schema),
            itemData.rowId,
            itemData.data as JsonValue,
          ),
        ),
      );
    }

    return {
      schemaHash,
    };
  }

  private async getSchema(data: ValidateDataCommand['data']) {
    const result = await this.shareTransactionalQueries.getTableSchema(
      data.revisionId,
      data.tableId,
    );

    return result.schema;
  }

  private async validateReferences(references: GetReferencesFromValueType[]) {
    return Promise.all(
      references.map(async (tableReference) => {
        const table =
          await this.shareTransactionalQueries.findTableInRevisionOrThrow(
            this.revisionRequestDto.id,
            tableReference.tableId,
          );

        return this.shareTransactionalQueries.findRowsInTableOrThrow(
          table.versionId,
          tableReference.rowIds,
        );
      }),
    );
  }
}
