import { createJsonValueStore } from 'src/features/share/utils/schema/lib/createJsonValueStore';
import {
  JsonArrayStore,
  MigrateItemsEvent,
  ReplaceItemsEvent,
} from 'src/features/share/utils/schema/model/schema/json-array.store';
import { JsonValueStore } from 'src/features/share/utils/schema/model/value/json-value.store';
import { getTransformation } from 'src/features/share/utils/schema/model/value/value-transformation';
import { JsonArray, JsonValue } from 'src/features/share/utils/schema/types/json.types';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';

export class JsonArrayValueStore {
  public readonly type = JsonSchemaTypeName.Array;

  public index: number;

  constructor(
    private schema: JsonArrayStore,
    public readonly rowId: string,
    public value: JsonValueStore[],
  ) {
    this.index = this.schema.registerValue(this);
  }

  public getPlainValue(): JsonArray {
    return this.value.map((item) => item.getPlainValue());
  }

  public migrateItems(event: MigrateItemsEvent) {
    const transformation = getTransformation(event.previousItems, event.items);

    this.value = this.value.map((valueItem) => {
      const rawValue = transformation
        ? (transformation(
            valueItem.getPlainValue(),
            event.items.default,
          ) as JsonValue)
        : event.items.default;

      return createJsonValueStore(event.items, this.rowId, rawValue);
    });
  }

  public replaceItems(event: ReplaceItemsEvent) {
    this.value = this.value.map(() => {
      const rawValue = this.getReplacedValue(event);

      return createJsonValueStore(event.items, this.rowId, rawValue);
    });
  }

  private getReplacedValue(event: ReplaceItemsEvent): JsonValue {
    const previousValue = event.items.getValue(this.rowId);

    if (previousValue) {
      return previousValue.getPlainValue();
    }

    return event.items.default;
  }
}
