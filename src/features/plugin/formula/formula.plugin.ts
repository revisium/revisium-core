import { Injectable } from '@nestjs/common';
import {
  getJsonValueStoreByPath,
  prepareFormulas,
  evaluateFormulas,
  type PreparedFormula,
} from '@revisium/schema-toolkit/lib';
import {
  JsonValueStore,
  JsonSchemaStore,
  JsonArrayValueStore,
} from '@revisium/schema-toolkit/model';
import { JsonValue, JsonSchemaTypeName } from '@revisium/schema-toolkit/types';
import {
  ComputeRowsResult,
  FormulaFieldError,
  InternalAfterCreateRowOptions,
  InternalAfterMigrateRowsOptions,
  InternalAfterUpdateRowOptions,
  InternalComputeRowsOptions,
  IPluginService,
} from 'src/features/plugin/types';

@Injectable()
export class FormulaPlugin implements IPluginService {
  public readonly isAvailable = true;

  public afterCreateRow(options: InternalAfterCreateRowOptions): void {
    this.evaluateValueStore(options.schemaStore, options.valueStore);
  }

  public afterUpdateRow(options: InternalAfterUpdateRowOptions): void {
    this.evaluateValueStore(options.schemaStore, options.valueStore);
  }

  public computeRows(options: InternalComputeRowsOptions): ComputeRowsResult {
    const schema = options.schemaStore.getPlainSchema();
    const formulas = prepareFormulas(schema);

    if (formulas.length === 0) {
      return {};
    }

    const allErrors = new Map<string, FormulaFieldError[]>();

    for (const row of options.rows) {
      const data = row.data as Record<string, unknown>;
      const { errors } = evaluateFormulas(formulas, data, {
        useDefaults: true,
      });

      if (errors.length > 0) {
        allErrors.set(row.id, errors);
      }

      row.data = data as JsonValue;
    }

    return allErrors.size > 0 ? { formulaErrors: allErrors } : {};
  }

  public afterMigrateRows(options: InternalAfterMigrateRowsOptions): void {
    const schema = options.schemaStore.getPlainSchema();
    const formulas = prepareFormulas(schema);

    if (formulas.length === 0) {
      return;
    }

    for (const row of options.rows) {
      const data = row.data as Record<string, unknown>;
      evaluateFormulas(formulas, data, { useDefaults: true });
      row.data = data as JsonValue;
    }
  }

  private evaluateValueStore(
    schemaStore: JsonSchemaStore,
    valueStore: JsonValueStore,
  ): void {
    const schema = schemaStore.getPlainSchema();
    const formulas = prepareFormulas(schema);

    if (formulas.length === 0) {
      return;
    }

    const data = valueStore.getPlainValue() as Record<string, unknown>;
    const { values } = evaluateFormulas(formulas, data, { useDefaults: true });

    this.applyValuesToStore(valueStore, formulas, values);
  }

  private applyValuesToStore(
    valueStore: JsonValueStore,
    formulas: PreparedFormula[],
    values: Record<string, unknown>,
  ): void {
    for (const formula of formulas) {
      if (formula.isArrayItem && formula.arrayPath) {
        this.applyArrayValues(valueStore, formula, values);
      } else {
        const value = this.getNestedValue(values, formula.fieldName);
        if (value !== undefined) {
          const store = getJsonValueStoreByPath(valueStore, formula.fieldName);
          store.value = value as string | number | boolean;
        }
      }
    }
  }

  private applyArrayValues(
    valueStore: JsonValueStore,
    formula: PreparedFormula,
    values: Record<string, unknown>,
  ): void {
    const arrayStore = getJsonValueStoreByPath(valueStore, formula.arrayPath!);

    if (arrayStore.type !== JsonSchemaTypeName.Array) {
      return;
    }

    const items = (arrayStore as JsonArrayValueStore).value;

    for (let i = 0; i < items.length; i++) {
      const itemStore = items[i];
      if (!itemStore || itemStore.type !== JsonSchemaTypeName.Object) {
        continue;
      }

      const arrayItemValues = values[`${formula.arrayPath}[${i}]`] as
        | Record<string, unknown>
        | undefined;
      if (!arrayItemValues) {
        continue;
      }

      const value = arrayItemValues[formula.localFieldPath];
      if (value !== undefined) {
        const fieldStore = getJsonValueStoreByPath(
          itemStore,
          formula.localFieldPath,
        );
        fieldStore.value = value as string | number | boolean;
      }
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const segments = path.split('.');
    let current: unknown = obj;

    for (const segment of segments) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }

    return current;
  }
}
