import { nanoid } from 'nanoid';
import { addSharedFieldsFromState } from 'src/features/share/utils/schema/lib/addSharedFieldsFromStore';
import { JsonSchemaStore } from 'src/features/share/utils/schema/model/schema/json-schema.store';
import { JsonArrayValueStore } from 'src/features/share/utils/schema/model/value/json-array-value.store';
import { JsonArray } from 'src/features/share/utils/schema/types/json.types';
import {
  JsonArraySchema,
  JsonRefSchema,
  JsonSchemaTypeName,
} from 'src/features/share/utils/schema/types/schema.types';

export type MigrateItemsEvent = {
  items: JsonSchemaStore;
  previousItems: JsonSchemaStore;
};

export type ReplaceItemsEvent = {
  items: JsonSchemaStore;
  previousItems: JsonSchemaStore;
};

export class JsonArrayStore implements JsonArraySchema {
  public readonly type = JsonSchemaTypeName.Array;

  public $ref: string = '';
  public name: string = '';
  public parent: JsonSchemaStore | null = null;
  public default: JsonArray[] = [];

  public title?: string;
  public description?: string;
  public deprecated?: boolean;

  private readonly valuesMap: Map<string, JsonArrayValueStore[]> = new Map<
    string,
    JsonArrayValueStore[]
  >();

  constructor(
    private _items: JsonSchemaStore,
    public readonly nodeId: string = nanoid(),
  ) {
    this.items.parent = this;
  }

  public get items() {
    return this._items;
  }

  public registerValue(value: JsonArrayValueStore): number {
    const length = this.getOrCreateValues(value.rowId).push(value);
    return length - 1;
  }

  public getValue(
    rowId: string,
    index: number = 0,
  ): JsonArrayValueStore | undefined {
    return this.getOrCreateValues(rowId)[index];
  }

  public migrateItems(items: JsonSchemaStore) {
    const previousItems = this._items;
    previousItems.parent = null;
    this._items = items;
    this._items.parent = this;

    const event: MigrateItemsEvent = { items, previousItems };

    for (const value of this.iterValues()) {
      value.migrateItems(event);
    }
  }

  public replaceItems(items: JsonSchemaStore) {
    const previousItems = this._items;
    previousItems.parent = null;
    this._items = items;
    this._items.parent = this;

    const event: ReplaceItemsEvent = { items, previousItems };

    for (const value of this.iterValues()) {
      value.replaceItems(event);
    }
  }

  public getPlainSchema(): JsonArraySchema | JsonRefSchema {
    if (this.$ref) {
      return addSharedFieldsFromState({ $ref: this.$ref }, this);
    }

    return addSharedFieldsFromState(
      {
        type: this.type,
        items: this.items.getPlainSchema(),
      },
      this,
    );
  }

  private getOrCreateValues(rowId: string): JsonArrayValueStore[] {
    let values = this.valuesMap.get(rowId);

    if (!values) {
      values = [];
      this.valuesMap.set(rowId, values);
    }

    return values;
  }

  private *iterValues(): Generator<JsonArrayValueStore> {
    for (const values of this.valuesMap.values()) {
      for (const value of values) {
        yield value;
      }
    }
  }
}
