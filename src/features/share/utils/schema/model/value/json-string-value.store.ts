import { JsonStringStore } from 'src/features/share/utils/schema/model/schema/json-string.store';
import { JsonValueStoreParent } from 'src/features/share/utils/schema/model/value/json-value.store';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';

export class JsonStringValueStore {
  public readonly type = JsonSchemaTypeName.String;

  public readonly index: number;

  public parent: JsonValueStoreParent | null = null;

  constructor(
    public readonly schema: JsonStringStore,
    public readonly rowId: string,
    public value: string | null = null,
  ) {
    this.index = this.schema.registerValue(this);
  }

  public get foreignKey() {
    return this.schema.foreignKey;
  }

  public getPlainValue() {
    return this.value ?? this.schema.default;
  }
}
