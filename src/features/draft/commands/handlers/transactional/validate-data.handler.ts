import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  ValidateDataCommand,
  ValidateDataCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/validate-data.command';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';
import { JsonSchemaValidatorService } from 'src/features/share/json-schema-validator.service';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import {
  DataValidationException,
  ForeignKeyTableNotFoundException,
  ForeignKeyRowsNotFoundException,
  ForeignKeyErrorDetail,
  ValidationErrorDetail,
  ValidationErrorContext,
} from 'src/features/share/exceptions';
import {
  createJsonValueStore,
  traverseValue,
} from '@revisium/schema-toolkit/lib';
import {
  JsonValueStore,
  JsonStringValueStore,
  JsonValueStoreParent,
  JsonObjectValueStore,
  JsonArrayValueStore,
} from '@revisium/schema-toolkit/model';
import {
  JsonValue,
  JsonSchemaTypeName,
  JsonSchema,
} from '@revisium/schema-toolkit/types';
import { ErrorObject } from 'ajv/dist/2020';

interface ForeignKeyReference {
  tableId: string;
  rowId: string;
  path: string;
}

interface RowData {
  rowId: string;
  data: unknown;
}

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

    await this.validateRowsAgainstSchema(
      data.rows,
      schema,
      schemaHash,
      data.tableId,
    );
    await this.validateForeignKeyReferences(data.rows, schema, data.tableId);

    return { schemaHash };
  }

  private async validateRowsAgainstSchema(
    rows: RowData[],
    schema: JsonSchema,
    schemaHash: string,
    tableId: string,
  ): Promise<void> {
    for (const row of rows) {
      const { result, errors } = await this.jsonSchemaValidator.validate(
        row.data,
        schema,
        schemaHash,
      );

      if (!result) {
        throw new DataValidationException(
          this.formatValidationErrors(errors || []),
          { tableId, rowId: row.rowId },
        );
      }
    }
  }

  private async validateForeignKeyReferences(
    rows: RowData[],
    schema: JsonSchema,
    tableId: string,
  ): Promise<void> {
    const allErrors: ForeignKeyErrorDetail[] = [];
    let lastContext: ValidationErrorContext | undefined;

    for (const row of rows) {
      const context: ValidationErrorContext = { tableId, rowId: row.rowId };
      lastContext = context;

      const foreignKeys = this.extractForeignKeyReferences(row, schema);
      const errors = await this.checkForeignKeyReferences(foreignKeys, context);
      allErrors.push(...errors);
    }

    if (allErrors.length > 0) {
      throw new ForeignKeyRowsNotFoundException(allErrors, lastContext);
    }
  }

  private extractForeignKeyReferences(
    row: RowData,
    schema: JsonSchema,
  ): ForeignKeyReference[] {
    const schemaStore = this.jsonSchemaStore.create(schema);
    const valueStore = createJsonValueStore(
      schemaStore,
      row.rowId,
      row.data as JsonValue,
    );
    return this.collectForeignKeysWithPaths(valueStore);
  }

  private async checkForeignKeyReferences(
    foreignKeys: ForeignKeyReference[],
    context: ValidationErrorContext,
  ): Promise<ForeignKeyErrorDetail[]> {
    if (foreignKeys.length === 0) {
      return [];
    }

    const groupedByTable = this.groupForeignKeysByTable(foreignKeys);
    return this.validateGroupedForeignKeys(groupedByTable, context);
  }

  private formatValidationErrors(
    errors: ErrorObject[],
  ): ValidationErrorDetail[] {
    return errors.map((error) => ({
      path: error.instancePath || '/',
      message: this.formatValidationMessage(error),
    }));
  }

  private formatValidationMessage(error: ErrorObject): string {
    const { keyword, params, message } = error;

    const messageFormatters: Record<string, () => string> = {
      type: () => `must be ${params?.type}`,
      required: () => `missing required property "${params?.missingProperty}"`,
      additionalProperties: () =>
        `has unknown property "${params?.additionalProperty}"`,
      enum: () => `must be one of: ${params?.allowedValues?.join(', ')}`,
      minimum: () => `must be >= ${params?.limit}`,
      maximum: () => `must be <= ${params?.limit}`,
      minLength: () => `must have at least ${params?.limit} characters`,
      maxLength: () => `must have at most ${params?.limit} characters`,
      pattern: () => `must match pattern "${params?.pattern}"`,
      format: () => `must be a valid ${params?.format}`,
    };

    return messageFormatters[keyword]?.() || message || 'validation failed';
  }

  private async getSchema(
    data: ValidateDataCommand['data'],
  ): Promise<JsonSchema> {
    const result = await this.shareTransactionalQueries.getTableSchema(
      data.revisionId,
      data.tableId,
    );
    return result.schema as JsonSchema;
  }

  private collectForeignKeysWithPaths(
    valueStore: JsonValueStore,
  ): ForeignKeyReference[] {
    const references: ForeignKeyReference[] = [];

    traverseValue(valueStore, (node) => {
      const reference = this.extractForeignKeyFromNode(node);
      if (reference) {
        references.push(reference);
      }
    });

    return references;
  }

  private extractForeignKeyFromNode(
    node: JsonValueStore,
  ): ForeignKeyReference | null {
    if (node.type !== JsonSchemaTypeName.String) {
      return null;
    }

    const stringNode = node as JsonStringValueStore;
    const foreignKey = stringNode.foreignKey;

    if (
      !foreignKey ||
      typeof stringNode.value !== 'string' ||
      stringNode.value === ''
    ) {
      return null;
    }

    return {
      tableId: foreignKey,
      rowId: stringNode.value,
      path: this.buildInstancePath(stringNode),
    };
  }

  private buildInstancePath(node: JsonValueStore): string {
    const pathParts: string[] = [];
    let current: JsonValueStore | JsonValueStoreParent | null = node;

    while (current?.parent) {
      const parentKey = this.getKeyInParent(current, current.parent);
      if (parentKey !== null) {
        pathParts.unshift(parentKey);
      }
      current = current.parent;
    }

    return pathParts.length > 0 ? '/' + pathParts.join('/') : '/';
  }

  private getKeyInParent(
    node: JsonValueStore | JsonValueStoreParent,
    parent: JsonValueStoreParent,
  ): string | null {
    if (parent.type === JsonSchemaTypeName.Object) {
      const objectParent = parent as JsonObjectValueStore;
      for (const [key, value] of Object.entries(objectParent.value)) {
        if (value === node) {
          return key;
        }
      }
    } else if (parent.type === JsonSchemaTypeName.Array) {
      const arrayParent = parent as JsonArrayValueStore;
      const index = arrayParent.value.indexOf(node as JsonValueStore);
      if (index >= 0) {
        return String(index);
      }
    }
    return null;
  }

  private groupForeignKeysByTable(
    foreignKeys: ForeignKeyReference[],
  ): Map<string, Array<{ rowId: string; path: string }>> {
    const grouped = new Map<string, Array<{ rowId: string; path: string }>>();

    for (const fk of foreignKeys) {
      const existing = grouped.get(fk.tableId) || [];
      existing.push({ rowId: fk.rowId, path: fk.path });
      grouped.set(fk.tableId, existing);
    }

    return grouped;
  }

  private async validateGroupedForeignKeys(
    groupedByTable: Map<string, Array<{ rowId: string; path: string }>>,
    context: ValidationErrorContext,
  ): Promise<ForeignKeyErrorDetail[]> {
    const results = await Promise.all(
      Array.from(groupedByTable.entries()).map(([tableId, items]) =>
        this.validateTableReferences(tableId, items, context),
      ),
    );

    return results.flat();
  }

  private async validateTableReferences(
    tableId: string,
    references: Array<{ rowId: string; path: string }>,
    context: ValidationErrorContext,
  ): Promise<ForeignKeyErrorDetail[]> {
    const table = await this.shareTransactionalQueries.findTableInRevision(
      this.revisionRequestDto.id,
      tableId,
    );

    if (!table) {
      throw new ForeignKeyTableNotFoundException(
        tableId,
        context,
        references[0].path,
      );
    }

    return this.findMissingRows(table.versionId, tableId, references);
  }

  private async findMissingRows(
    tableVersionId: string,
    tableId: string,
    references: Array<{ rowId: string; path: string }>,
  ): Promise<ForeignKeyErrorDetail[]> {
    const rowIds = references.map((ref) => ref.rowId);
    const existingRows = await this.shareTransactionalQueries.findRowsInTable(
      tableVersionId,
      rowIds,
    );

    const existingRowIds = new Set(existingRows.map((row) => row.id));

    return references
      .filter((ref) => !existingRowIds.has(ref.rowId))
      .map((ref) => ({
        path: ref.path,
        tableId,
        missingRowIds: [ref.rowId],
      }));
  }
}
