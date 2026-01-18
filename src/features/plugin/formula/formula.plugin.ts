import { Injectable } from '@nestjs/common';
import {
  evaluateFormulas,
  collectFormulaNodes,
} from '@revisium/schema-toolkit/formula';
import { getJsonValueStoreByPath } from '@revisium/schema-toolkit/lib';
import {
  JsonValueStore,
  JsonSchemaStore,
} from '@revisium/schema-toolkit/model';
import { JsonValue } from '@revisium/schema-toolkit/types';
import {
  ComputeRowsResult,
  FormulaFieldError,
  InternalAfterCreateRowOptions,
  InternalAfterMigrateRowsOptions,
  InternalAfterUpdateRowOptions,
  InternalComputeRowsOptions,
  IPluginService,
} from 'src/features/plugin/types';

function evaluateFormulasInStore(
  schemaStore: JsonSchemaStore,
  valueStore: JsonValueStore,
): void {
  const schema = schemaStore.getPlainSchema();
  const data = valueStore.getPlainValue() as Record<string, unknown>;
  const nodes = collectFormulaNodes(schema, data);

  if (nodes.length === 0) {
    return;
  }

  const { values } = evaluateFormulas(schema, data, { useDefaults: true });

  for (const node of nodes) {
    const value = values[node.path];
    if (value !== undefined) {
      const store = getJsonValueStoreByPath(valueStore, node.path);
      if (store) {
        store.value = value as string | number | boolean;
      }
    }
  }
}

@Injectable()
export class FormulaPlugin implements IPluginService {
  public readonly isAvailable = true;

  public afterCreateRow(options: InternalAfterCreateRowOptions): void {
    evaluateFormulasInStore(options.schemaStore, options.valueStore);
  }

  public afterUpdateRow(options: InternalAfterUpdateRowOptions): void {
    evaluateFormulasInStore(options.schemaStore, options.valueStore);
  }

  public computeRows(options: InternalComputeRowsOptions): ComputeRowsResult {
    const schema = options.schemaStore.getPlainSchema();
    const allErrors = new Map<string, FormulaFieldError[]>();

    for (const row of options.rows) {
      const data = row.data as Record<string, unknown>;
      const { errors } = evaluateFormulas(schema, data, { useDefaults: true });

      if (errors.length > 0) {
        allErrors.set(row.id, errors);
      }

      row.data = data as JsonValue;
    }

    return allErrors.size > 0 ? { formulaErrors: allErrors } : {};
  }

  public afterMigrateRows(options: InternalAfterMigrateRowsOptions): void {
    const schema = options.schemaStore.getPlainSchema();

    for (const row of options.rows) {
      const data = row.data as Record<string, unknown>;
      evaluateFormulas(schema, data, { useDefaults: true });
      row.data = data as JsonValue;
    }
  }
}
