import { nanoid } from 'nanoid';
import { EventEmitter } from 'node:events';
import { JsonSchemaStore } from 'src/share/utils/schema/model/schema/json-schema.store';
import { JsonBooleanValueStore } from 'src/share/utils/schema/model/value/json-boolean-value.store';
import {
  JsonBooleanSchema,
  JsonSchemaTypeName,
} from 'src/share/utils/schema/types/schema.types';

export class JsonBooleanStore
  extends EventEmitter
  implements JsonBooleanSchema
{
  public readonly type = JsonSchemaTypeName.Boolean;

  public name: string = '';
  public parent: JsonSchemaStore | null = null;

  public default: boolean = false;

  private valuesMap: Map<string, JsonBooleanValueStore[]> = new Map<
    string,
    JsonBooleanValueStore[]
  >();

  constructor(public readonly nodeId: string = nanoid()) {
    super();
  }

  public registerValue(value: JsonBooleanValueStore): number {
    const length = this.getOrCreateValues(value.rowId).push(value);
    return length - 1;
  }

  public getValue(
    rowId: string,
    index: number = 0,
  ): JsonBooleanValueStore | undefined {
    return this.getOrCreateValues(rowId)[index];
  }

  public getPlainSchema(): JsonBooleanSchema {
    return {
      type: this.type,
      default: this.default,
    };
  }

  private getOrCreateValues(rowId: string): JsonBooleanValueStore[] {
    let values = this.valuesMap.get(rowId);

    if (!values) {
      values = [];
      this.valuesMap.set(rowId, values);
    }

    return values;
  }
}
