import { JsonStringStore } from 'src/features/share/utils/schema/model/schema/json-string.store';
import { JsonSchemaTypeName } from 'src/features/share/utils/schema/types/schema.types';

export class JsonStringValueStore {
  public readonly type = JsonSchemaTypeName.String;

  public readonly index: number;

  constructor(
    private readonly schema: JsonStringStore,
    public readonly rowId: string,
    public value: string | null = null,
  ) {
    this.index = this.schema.registerValue(this);
  }

  public get reference() {
    return this.schema.reference;
  }

  public getPlainValue() {
    return this.value ?? this.schema.default;
  }
}
