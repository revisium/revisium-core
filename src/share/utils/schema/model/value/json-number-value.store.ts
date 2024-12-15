import { JsonNumberStore } from 'src/share/utils/schema/model/schema/json-number.store';
import { JsonSchemaTypeName } from 'src/share/utils/schema/types/schema.types';

export class JsonNumberValueStore {
  public readonly type = JsonSchemaTypeName.Number;

  public readonly index: number;

  constructor(
    private schema: JsonNumberStore,
    public readonly rowId: string,
    public value: number | null = null,
  ) {
    this.index = this.schema.registerValue(this);
  }

  public getPlainValue() {
    return this.value ?? this.schema.default;
  }
}
