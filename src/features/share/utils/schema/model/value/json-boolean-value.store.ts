import { JsonBooleanStore } from 'src/features/share/utils/schema/model/schema/json-boolean.store';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';

export class JsonBooleanValueStore {
  public readonly type = JsonSchemaTypeName.Boolean;

  public readonly index: number;

  constructor(
    public readonly schema: JsonBooleanStore,
    public readonly rowId: string,
    public value: boolean | null = null,
  ) {
    this.index = this.schema.registerValue(this);
  }

  public getPlainValue() {
    return this.value ?? this.schema.default;
  }
}
