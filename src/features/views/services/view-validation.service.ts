import { BadRequestException, Injectable } from '@nestjs/common';
import {
  getDBJsonPathByJsonSchemaStore,
  traverseStore,
} from '@revisium/schema-toolkit/lib';
import { JsonSchema } from '@revisium/schema-toolkit/types';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import {
  TableViewsData,
  View,
  ViewFilterGroup,
} from 'src/features/views/types';

const SYSTEM_FIELDS = new Set(['id', 'createdAt', 'updatedAt']);

@Injectable()
export class ViewValidationService {
  constructor(
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
    private readonly jsonSchemaStoreService: JsonSchemaStoreService,
  ) {}

  public async validateViewsFields(
    revisionId: string,
    tableId: string,
    viewsData: TableViewsData,
  ): Promise<void> {
    const { schema } = await this.shareTransactionalQueries.getTableSchema(
      revisionId,
      tableId,
    );

    const validFields = this.extractValidFieldsFromSchema(schema);
    const invalidFields: string[] = [];

    for (const view of viewsData.views) {
      const viewInvalidFields = this.validateViewFields(view, validFields);
      invalidFields.push(...viewInvalidFields);
    }

    if (invalidFields.length > 0) {
      const uniqueInvalidFields = [...new Set(invalidFields)];
      throw new BadRequestException(
        `Invalid fields in views: ${uniqueInvalidFields.join(', ')}. These fields do not exist in table "${tableId}".`,
      );
    }
  }

  private validateViewFields(view: View, validFields: Set<string>): string[] {
    const invalidFields: string[] = [];

    if (view.columns) {
      for (const column of view.columns) {
        if (!this.isValidField(column.field, validFields)) {
          invalidFields.push(column.field);
        }
      }
    }

    if (view.sorts) {
      for (const sort of view.sorts) {
        if (!this.isValidField(sort.field, validFields)) {
          invalidFields.push(sort.field);
        }
      }
    }

    if (view.filters) {
      invalidFields.push(
        ...this.validateFilterGroupFields(view.filters, validFields),
      );
    }

    return invalidFields;
  }

  private validateFilterGroupFields(
    filterGroup: ViewFilterGroup,
    validFields: Set<string>,
  ): string[] {
    const invalidFields: string[] = [];

    if (filterGroup.conditions) {
      for (const condition of filterGroup.conditions) {
        if (!this.isValidField(condition.field, validFields)) {
          invalidFields.push(condition.field);
        }
      }
    }

    if (filterGroup.groups) {
      for (const nestedGroup of filterGroup.groups) {
        invalidFields.push(
          ...this.validateFilterGroupFields(nestedGroup, validFields),
        );
      }
    }

    return invalidFields;
  }

  private isValidField(field: string, validFields: Set<string>): boolean {
    if (SYSTEM_FIELDS.has(field)) {
      return true;
    }

    if (field.startsWith('data.')) {
      const fieldName = field.slice(5);
      return validFields.has(fieldName);
    }

    return false;
  }

  private extractValidFieldsFromSchema(schema: unknown): Set<string> {
    const validFields = new Set<string>();

    if (!schema || typeof schema !== 'object') {
      return validFields;
    }

    const schemaStore = this.jsonSchemaStoreService.create(
      schema as JsonSchema,
    );

    traverseStore(schemaStore, (item) => {
      if (!item.name) {
        return;
      }

      const dbPath = getDBJsonPathByJsonSchemaStore(item);
      const fieldPath = dbPath.startsWith('$.') ? dbPath.slice(2) : dbPath;

      validFields.add(fieldPath);
    });

    return validFields;
  }
}
