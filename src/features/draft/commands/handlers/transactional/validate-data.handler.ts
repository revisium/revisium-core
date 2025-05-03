import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  ValidateDataCommand,
  ValidateDataCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/validate-data.command';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';
import { JsonSchemaValidatorService } from 'src/features/share/json-schema-validator.service';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { createJsonValueStore } from 'src/features/share/utils/schema/lib/createJsonValueStore';
import {
  getForeignKeysFromValue,
  GetForeignKeysFromValueType,
} from 'src/features/share/utils/schema/lib/getForeignKeysFromValue';
import { JsonValue } from 'src/features/share/utils/schema/types/json.types';

@CommandHandler(ValidateDataCommand)
export class ValidateDataHandler
  implements ICommandHandler<ValidateDataCommand, ValidateDataCommandReturnType>
{
  constructor(
    protected readonly revisionRequestDto: DraftRevisionRequestDto,
    protected readonly shareTransactionalQueries: ShareTransactionalQueries,
    protected readonly jsonSchemaValidator: JsonSchemaValidatorService,
    protected readonly jsonSchemaStore: JsonSchemaStoreService,
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
        console.log({ errors });
        throw new BadRequestException('data is not valid', {
          cause: errors,
        });
      }
    }

    for (const itemData of data.rows) {
      // TODO merge getForeignKeysFromValue
      await this.validateForeignKeys(
        getForeignKeysFromValue(
          createJsonValueStore(
            this.jsonSchemaStore.create(schema),
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

  private async validateForeignKeys(
    foreignKeys: GetForeignKeysFromValueType[],
  ) {
    return Promise.all(
      foreignKeys.map(async (tableForeignKey) => {
        const table =
          await this.shareTransactionalQueries.findTableInRevisionOrThrow(
            this.revisionRequestDto.id,
            tableForeignKey.tableId,
          );

        return this.shareTransactionalQueries.findRowsInTableOrThrow(
          table.versionId,
          tableForeignKey.rowIds,
        );
      }),
    );
  }
}
