import { nanoid } from 'nanoid';
import { EventEmitter } from 'node:events';
import { JsonSchemaStore } from 'src/features/share/utils/schema/model/schema/json-schema.store';
import { JsonStringValueStore } from 'src/features/share/utils/schema/model/value/json-string-value.store';
import {
  JsonSchemaTypeName,
  JsonStringSchema,
} from 'src/features/share/utils/schema/types/schema.types';

export class JsonStringStore extends EventEmitter implements JsonStringSchema {
  public readonly type = JsonSchemaTypeName.String;

  public name: string = '';
  public parent: JsonSchemaStore | null = null;

  public default: string = '';
  public reference?: string;
  private valuesMap: Map<string, JsonStringValueStore[]> = new Map<
    string,
    JsonStringValueStore[]
  >();

  constructor(public readonly nodeId: string = nanoid()) {
    super();
  }

  public registerValue(value: JsonStringValueStore): number {
    const length = this.getOrCreateValues(value.rowId).push(value);
    return length - 1;
  }

  public getValue(
    rowId: string,
    index: number = 0,
  ): JsonStringValueStore | undefined {
    return this.getOrCreateValues(rowId)[index];
  }

  public getPlainSchema(): JsonStringSchema {
    const schema: JsonStringSchema = {
      type: this.type,
      default: this.default,
    };

    if (this.reference) {
      schema.reference = this.reference;
    }

    return schema;
  }

  private getOrCreateValues(rowId: string): JsonStringValueStore[] {
    let values = this.valuesMap.get(rowId);

    if (!values) {
      values = [];
      this.valuesMap.set(rowId, values);
    }

    return values;
  }
}
