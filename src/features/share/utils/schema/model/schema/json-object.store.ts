import { nanoid } from 'nanoid';
import { addSharedFieldsFromState } from 'src/features/share/utils/schema/lib/addSharedFieldsFromStore';
import { JsonSchemaStore } from 'src/features/share/utils/schema/model/schema/json-schema.store';
import { JsonObjectValueStore } from 'src/features/share/utils/schema/model/value/json-object-value.store';
import { JsonObject } from 'src/features/share/utils/schema/types/json.types';
import {
  JsonObjectSchema,
  JsonRefSchema,
  JsonSchema,
  JsonSchemaTypeName,
} from 'src/features/share/utils/schema/types/schema.types';

export type AddedPropertyEvent = { name: string; property: JsonSchemaStore };
export type MigratePropertyEvent = {
  name: string;
  property: JsonSchemaStore;
  previousProperty: JsonSchemaStore;
};
export type RemovedPropertyEvent = { name: string; property: JsonSchemaStore };
export type ChangeNameEvent = {
  fromName: string;
  toName: string;
  property: JsonSchemaStore;
};

export class JsonObjectStore implements JsonObjectSchema {
  public readonly type = JsonSchemaTypeName.Object;

  public $ref: string = '';
  public name: string = '';
  public parent: JsonSchemaStore | null = null;
  public default: JsonObject = {};

  public title?: string;
  public description?: string;
  public deprecated?: boolean;

  public readonly additionalProperties = false;
  public readonly required: string[] = [];
  public readonly properties: Record<string, JsonSchemaStore> = {};

  private readonly valuesMap: Map<string, JsonObjectValueStore[]> = new Map<
    string,
    JsonObjectValueStore[]
  >();

  constructor(public readonly nodeId: string = nanoid()) {}

  public get empty(): boolean {
    return Object.keys(this.properties).length === 0;
  }

  public registerValue(value: JsonObjectValueStore): number {
    const length = this.getOrCreateValues(value.rowId).push(value);
    return length - 1;
  }

  public getValue(
    rowId: string,
    index: number = 0,
  ): JsonObjectValueStore | undefined {
    return this.getOrCreateValues(rowId)[index];
  }

  public addPropertyWithStore(name: string, store: JsonSchemaStore) {
    if (this.properties[name] || this.required.includes(name)) {
      throw new Error('this name already exists');
    }

    store.parent = this;
    store.name = name;

    this.required.push(name);
    this.required.sort((a, b) => a.localeCompare(b));

    this.properties[name] = store;
    this.default[name] = store.default;

    const event: AddedPropertyEvent = { name, property: store };

    for (const value of this.iterValues()) {
      value.addProperty(event);
    }

    return store;
  }

  public migratePropertyWithStore(name: string, store: JsonSchemaStore) {
    const item = this.properties[name];

    if (!item) {
      throw new Error('this name does not exist');
    }

    item.parent = null;

    store.parent = this;
    store.name = name;

    this.properties[name] = store;
    this.default[name] = store.default;

    const event: MigratePropertyEvent = {
      name,
      property: store,
      previousProperty: item,
    };

    for (const value of this.iterValues()) {
      value.migrateProperty(event);
    }

    return store;
  }

  public changeName(fromName: string, toName: string) {
    const item = this.properties[fromName];

    if (!item) {
      throw new Error('this fromName does not exist');
    }

    // remove
    delete this.properties[fromName];
    delete this.default[fromName];

    const foundRequiredIndex = this.required.findIndex(
      (required) => required === fromName,
    );

    if (foundRequiredIndex !== -1) {
      this.required.splice(foundRequiredIndex, 1);
    }

    // add
    if (!this.required.includes(toName)) {
      this.required.push(toName);
      this.required.sort((a, b) => a.localeCompare(b));
    }

    this.properties[toName] = item;
    this.default[toName] = item.default;

    const event: ChangeNameEvent = {
      fromName,
      toName,
      property: item,
    };

    for (const value of this.iterValues()) {
      value.changeName(event);
    }
  }

  public removeProperty(name: string) {
    const item = this.properties[name];

    if (!item) {
      throw new Error('this name does not exist');
    }

    item.parent = null;
    item.name = '';

    delete this.properties[name];
    delete this.default[name];

    const foundRequiredIndex = this.required.findIndex(
      (required) => required === name,
    );

    if (foundRequiredIndex !== -1) {
      this.required.splice(foundRequiredIndex, 1);
    }

    const event: RemovedPropertyEvent = {
      name,
      property: item,
    };

    for (const value of this.iterValues()) {
      value.removeProperty(event);
    }
  }

  public getProperty(name: string): JsonSchemaStore | undefined {
    return this.properties[name];
  }

  public getPlainSchema(): JsonObjectSchema | JsonRefSchema {
    if (this.$ref) {
      return addSharedFieldsFromState({ $ref: this.$ref }, this);
    }

    return addSharedFieldsFromState(
      {
        type: this.type,
        additionalProperties: this.additionalProperties,
        required: this.required,
        properties: Object.entries<JsonSchemaStore>(this.properties).reduce<
          Record<string, JsonSchema>
        >((result, [name, store]) => {
          result[name] = store.getPlainSchema();
          return result;
        }, {}),
      },
      this,
    );
  }

  private getOrCreateValues(rowId: string): JsonObjectValueStore[] {
    let values = this.valuesMap.get(rowId);

    if (!values) {
      values = [];
      this.valuesMap.set(rowId, values);
    }

    return values;
  }

  private *iterValues(): Generator<JsonObjectValueStore> {
    for (const values of this.valuesMap.values()) {
      for (const value of values) {
        yield value;
      }
    }
  }
}
