import {
  applyAddPatch,
  applyMovePatch,
  applyRemovePatch,
  applyReplacePatch,
} from 'src/features/share/utils/schema/lib/applyPatches';
import { createJsonSchemaStore } from 'src/features/share/utils/schema/lib/createJsonSchemaStore';
import { createJsonValueStore } from 'src/features/share/utils/schema/lib/createJsonValueStore';
import { JsonSchemaStore } from 'src/features/share/utils/schema/model/schema/json-schema.store';
import { JsonValueStore } from 'src/features/share/utils/schema/model/value/json-value.store';
import { getTransformation } from 'src/features/share/utils/schema/model/value/value-transformation';
import { JsonPatch } from 'src/features/share/utils/schema/types/json-patch.types';
import { JsonValue } from 'src/features/share/utils/schema/types/json.types';
import { JsonSchema } from 'src/features/share/utils/schema/types/schema.types';

export class SchemaTable {
  private readonly rows = new Map<string, JsonValueStore>();
  private store: JsonSchemaStore;

  constructor(
    schema: JsonSchema,
    private readonly refs: Record<string, JsonSchema> = {},
  ) {
    this.store = createJsonSchemaStore(schema, refs);
  }

  public applyPatches(patches: JsonPatch[]): void {
    patches.forEach((patch) => {
      switch (patch.op) {
        case 'replace': {
          const nextStore = applyReplacePatch(this.store, patch, this.refs);
          if (nextStore !== this.store) {
            this.migrateRows(nextStore);
          }
          break;
        }
        case 'remove': {
          applyRemovePatch(this.store, patch);
          break;
        }
        case 'add': {
          applyAddPatch(this.store, patch);
          break;
        }
        case 'move': {
          applyMovePatch(this.store, patch);
          break;
        }
        default:
          throw new Error(`Unsupported patch operation`);
      }
    });
  }

  public getSchema(): JsonSchema {
    return this.store.getPlainSchema();
  }

  public addRow(rowId: string, data: JsonValue) {
    const row = createJsonValueStore(this.store, rowId, data);

    this.rows.set(rowId, row);
  }

  public getRow(id: string): JsonValue {
    const row = this.rows.get(id);

    if (!row) {
      throw new Error('Invalid id');
    }

    return row.getPlainValue();
  }

  public getRows(): { id: string; data: JsonValue }[] {
    return [...this.rows].map(([id, data]) => ({
      id,
      data: data.getPlainValue(),
    }));
  }

  private migrateRows(nextStore: JsonSchemaStore): void {
    const transformation = getTransformation(this.store, nextStore);

    if (transformation) {
      for (const [rowId, row] of this.rows) {
        const rawNextValue = transformation(
          row.getPlainValue(),
          nextStore.default,
        ) as JsonValue;

        const nextRow = createJsonValueStore(nextStore, rowId, rawNextValue);
        this.rows.set(rowId, nextRow);
      }
    }

    this.store = nextStore;
  }
}
