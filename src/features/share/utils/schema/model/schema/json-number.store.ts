import { nanoid } from 'nanoid';
import { EventEmitter } from 'node:events';
import { JsonSchemaStore } from 'src/features/share/utils/schema/model/schema/json-schema.store';
import { JsonNumberValueStore } from 'src/features/share/utils/schema/model/value/json-number-value.store';
import {
  JsonNumberSchema,
  JsonRefSchema,
  JsonSchemaTypeName,
} from 'src/features/share/utils/schema/types/schema.types';

export class JsonNumberStore extends EventEmitter implements JsonNumberSchema {
  public readonly type = JsonSchemaTypeName.Number;

  public $ref: string = '';
  public name: string = '';
  public parent: JsonSchemaStore | null = null;

  public default: number = 0;
  public readOnly?: boolean;
  public title?: string;
  public description?: string;
  public deprecated?: boolean;

  private readonly valuesMap: Map<string, JsonNumberValueStore[]> = new Map<
    string,
    JsonNumberValueStore[]
  >();

  constructor(public readonly nodeId: string = nanoid()) {
    super();
  }

  public registerValue(value: JsonNumberValueStore): number {
    const length = this.getOrCreateValues(value.rowId).push(value);
    return length - 1;
  }

  public getValue(
    rowId: string,
    index: number = 0,
  ): JsonNumberValueStore | undefined {
    return this.getOrCreateValues(rowId)[index];
  }

  public getPlainSchema(): JsonNumberSchema | JsonRefSchema {
    if (this.$ref) {
      return { $ref: this.$ref };
    }

    return {
      type: this.type,
      default: this.default,
      ...(this.readOnly ? { readOnly: this.readOnly } : {}),
      ...(this.title ? { title: this.title } : {}),
      ...(this.description ? { description: this.description } : {}),
      ...(this.deprecated ? { deprecated: this.deprecated } : {}),
    };
  }

  private getOrCreateValues(rowId: string): JsonNumberValueStore[] {
    let values = this.valuesMap.get(rowId);

    if (!values) {
      values = [];
      this.valuesMap.set(rowId, values);
    }

    return values;
  }
}
