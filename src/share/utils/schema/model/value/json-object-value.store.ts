import { createJsonValueStore } from 'src/share/utils/schema/lib/createJsonValueStore';
import {
  AddedPropertyEvent,
  ChangeNameEvent,
  JsonObjectStore,
  MigratePropertyEvent,
  RemovedPropertyEvent,
} from 'src/share/utils/schema/model/schema/json-object.store';
import { JsonValueStore } from 'src/share/utils/schema/model/value/json-value.store';
import { getTransformation } from 'src/share/utils/schema/model/value/value-transformation';
import { JsonObject, JsonValue } from 'src/share/utils/schema/types/json.types';
import { JsonSchemaTypeName } from 'src/share/utils/schema/types/schema.types';

export class JsonObjectValueStore {
  public readonly type = JsonSchemaTypeName.Object;

  public index: number;

  constructor(
    private schema: JsonObjectStore,
    public readonly rowId: string,
    public value: Record<string, JsonValueStore>,
  ) {
    this.index = this.schema.registerValue(this);
  }

  public getPlainValue(): JsonObject {
    return Object.entries(this.value).reduce<Record<string, JsonValue>>(
      (result, [name, store]) => {
        result[name] = store.getPlainValue() as JsonValue;
        return result;
      },
      {},
    );
  }

  public migrateProperty(event: MigratePropertyEvent) {
    const rawValue = this.getMigratedValue(event);

    this.value[event.name] = createJsonValueStore(
      event.property,
      this.rowId,
      rawValue,
    );
  }

  public addProperty(event: AddedPropertyEvent) {
    const rawValue = this.getAddedValue(event);

    this.value[event.name] = createJsonValueStore(
      event.property,
      this.rowId,
      rawValue,
    );
  }

  public removeProperty(event: RemovedPropertyEvent) {
    delete this.value[event.name];
  }

  public changeName(event: ChangeNameEvent) {
    const itemValue = this.value[event.fromName];

    if (itemValue !== undefined) {
      delete this.value[event.fromName];
      this.value[event.toName] = itemValue;
    }
  }

  private getAddedValue(event: AddedPropertyEvent): JsonValue {
    const previousValue = event.property.getValue(this.rowId, this.index);

    if (previousValue) {
      return previousValue.getPlainValue();
    }

    return event.property.default;
  }

  private getMigratedValue(event: MigratePropertyEvent): JsonValue {
    const transformation = getTransformation(
      event.previousProperty,
      event.property,
    );

    if (transformation) {
      return transformation(
        this.value[event.name].getPlainValue(),
        event.property.default,
      ) as JsonValue;
    }

    return event.property.default;
  }
}
