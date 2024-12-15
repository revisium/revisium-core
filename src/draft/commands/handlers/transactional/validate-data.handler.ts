import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { GraphQLError } from 'graphql/error';
import { ValidateDataCommand } from 'src/draft/commands/impl/transactional/validate-data.command';
import { DraftRevisionRequestDto } from 'src/draft/draft-request-dto/draft-revision-request.dto';
import { JsonSchemaValidatorService } from 'src/draft/json-schema-validator.service';
import { ShareTransactionalQueries } from 'src/share/share.transactional.queries';
import { findSchemaForSystemTables } from 'src/share/system-tables.consts';
import { createJsonSchemaStore } from 'src/share/utils/schema/lib/createJsonSchemaStore';
import { createJsonValueStore } from 'src/share/utils/schema/lib/createJsonValueStore';
import {
  getReferencesFromValue,
  GetReferencesFromValueType,
} from 'src/share/utils/schema/lib/getReferencesFromValue';
import { JsonValue } from 'src/share/utils/schema/types/json.types';
import { JsonSchema } from 'src/share/utils/schema/types/schema.types';

@CommandHandler(ValidateDataCommand)
export class ValidateDataHandler
  implements ICommandHandler<ValidateDataCommand>
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
        throw new GraphQLError('data is not valid', {
          extensions: { errors, code: 'data is not valid' },
        });
      }
    }

    if (!data.skipReferenceValidation) {
      for (const itemData of data.rows) {
        // TODO merge getReferencesFromValue
        await this.validateReferences(
          getReferencesFromValue(
            createJsonValueStore(
              createJsonSchemaStore(schema as JsonSchema),
              itemData.rowId,
              itemData.data as JsonValue,
            ),
          ),
        );
      }
    }
  }

  private async getSchema(data: ValidateDataCommand['data']) {
    const foundSystemMetaSchema = findSchemaForSystemTables(data.tableId);

    if (foundSystemMetaSchema) {
      return foundSystemMetaSchema;
    }

    return this.shareTransactionalQueries.getTableSchema(
      data.revisionId,
      data.tableId,
    );
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
